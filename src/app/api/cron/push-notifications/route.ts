export const runtime = "nodejs";

import { normalizeAppData } from "@/lib/normalize-app-data";
import { generateMotivationalSentence } from "@/lib/notifications/motivational";
import { DEFAULT_NOTIFICATION_PREFS, hourInAppTimezone, normalizeNotificationPrefs } from "@/lib/notifications/prefs";
import { sendWebPush, vapidConfigured } from "@/lib/notifications/web-push";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/timezone";

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!vapidConfigured()) {
    return Response.json({ error: "VAPID keys not configured.", sent: 0 }, { status: 503 });
  }

  const dateKey = todayKey();
  const hour = hourInAppTimezone();
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    include: {
      appData: true,
      pushSubscriptions: true,
    },
  });

  for (const user of users) {
    if (!user.appData?.payload) {
      skipped += 1;
      continue;
    }

    const data = normalizeAppData(user.appData.payload);
    const prefs = normalizeNotificationPrefs(data.notificationPrefs) ?? {
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: false,
    };

    if (!prefs.enabled) {
      skipped += 1;
      continue;
    }

    const jobs: Array<{
      type: string;
      enabled: boolean;
      hour: number;
      title: string;
      body: string;
      url: string;
    }> = [];

    if (prefs.habitReminders && prefs.habitReminderHour === hour) {
      const activeHabits = data.habits.filter((h) => h.active);
      if (activeHabits.length) {
        const done = data.habitLogs.filter((l) => l.date === dateKey && l.completed).length;
        if (done < activeHabits.length) {
          jobs.push({
            type: "habit",
            enabled: true,
            hour: prefs.habitReminderHour,
            title: "Habit check-in",
            body: "Don't forget to track your habits today.",
            url: "/habits",
          });
        }
      }
    }

    if (prefs.motivationalAi && prefs.motivationalHour === hour) {
      const body =
        (await generateMotivationalSentence(data, dateKey)) ??
        "Small steps today still count — keep showing up for yourself.";
      jobs.push({
        type: "motivational",
        enabled: true,
        hour: prefs.motivationalHour,
        title: "Keep going",
        body,
        url: "/",
      });
    }

    if (prefs.journalReminders && prefs.journalReminderHour === hour) {
      const journaled = data.journalEntries.some((e) => e.date === dateKey);
      if (!journaled) {
        jobs.push({
          type: "journal",
          enabled: true,
          hour: prefs.journalReminderHour,
          title: "Journal reminder",
          body: "Take a minute to capture how today went.",
          url: "/journal",
        });
      }
    }

    for (const job of jobs) {
      if (!job.enabled) continue;

      try {
        await prisma.pushDeliveryLog.create({
          data: { userId: user.id, type: job.type, dateKey },
        });
      } catch {
        // Unique constraint — already sent today
        skipped += 1;
        continue;
      }

      for (const sub of user.pushSubscriptions) {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          { title: job.title, body: job.body, url: job.url, tag: `pd-${job.type}-${dateKey}` },
        );
        if (result.ok) {
          sent += 1;
        } else {
          errors += 1;
          if (result.gone) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          }
        }
      }
    }
  }

  return Response.json({ ok: true, dateKey, hour, sent, skipped, errors, users: users.length });
}
