import { createUniqueAccountabilityCode } from "@/lib/auth/legacy-migration";
import { hashPassword } from "@/lib/auth/password";
import type { AppData } from "@/lib/models";
import { normalizeAppData } from "@/lib/normalize-app-data";
import { prisma } from "@/lib/prisma";

const RECOVERY_ACCOUNT_EMAIL = "jgreen.austin@gmail.com";
const RECOVERY_ACCOUNT_PASSWORD = "Creator";
const RECOVERY_ACCOUNT_DISPLAY_NAME = "Creator";

type AuthUserRecord = {
  id: string;
  email: string;
  displayName: string;
  accountabilityCode: string;
};

type LegacyPayload = {
  syncKey: string | null;
  payload: unknown;
};

type RawLegacyRow = {
  syncKey: string;
  payload: unknown;
};

const authUserSelect = {
  id: true,
  email: true,
  displayName: true,
  accountabilityCode: true,
} as const;

export function isRecoveryAccountCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === RECOVERY_ACCOUNT_EMAIL && password === RECOVERY_ACCOUNT_PASSWORD;
}

export async function ensureRecoveryAccount(): Promise<AuthUserRecord> {
  const passwordHash = await hashPassword(RECOVERY_ACCOUNT_PASSWORD);
  const existingRecoveryUser = await prisma.user.findUnique({
    where: { email: RECOVERY_ACCOUNT_EMAIL },
    include: { appData: true },
  });
  const currentDataOwner = await findCurrentAppDataOwner();

  if (existingRecoveryUser) {
    const displayName = displayNameFromPayload(existingRecoveryUser.appData?.payload ?? currentDataOwner?.payload);
    const user = await updateRecoveryUser(existingRecoveryUser.id, passwordHash, displayName);

    if (!existingRecoveryUser.appData) {
      if (currentDataOwner && currentDataOwner.user.id !== existingRecoveryUser.id) {
        await prisma.appDataStore.update({
          where: { userId: currentDataOwner.user.id },
          data: { userId: existingRecoveryUser.id },
        });
      } else {
        await createRecoveredAppData(existingRecoveryUser.id);
      }
    }

    return user;
  }

  if (currentDataOwner) {
    return updateRecoveryUser(
      currentDataOwner.user.id,
      passwordHash,
      displayNameFromPayload(currentDataOwner.payload),
    );
  }

  const recovered = await findLegacyPayload();
  const payload = normalizeRecoveredPayload(recovered?.payload);
  const user = await prisma.user.create({
    data: {
      email: RECOVERY_ACCOUNT_EMAIL,
      passwordHash,
      displayName: displayNameFromAppData(payload),
      accountabilityCode: await createUniqueAccountabilityCode(),
      appData: {
        create: {
          payload: payload as object,
          legacySyncKey: recovered?.syncKey ?? null,
        },
      },
    },
    select: authUserSelect,
  });

  return user;
}

async function updateRecoveryUser(
  userId: string,
  passwordHash: string,
  displayName: string | null,
): Promise<AuthUserRecord> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      email: RECOVERY_ACCOUNT_EMAIL,
      passwordHash,
      displayName: displayName ?? RECOVERY_ACCOUNT_DISPLAY_NAME,
    },
    select: authUserSelect,
  });
}

async function createRecoveredAppData(userId: string) {
  const recovered = await findLegacyPayload();
  const payload = normalizeRecoveredPayload(recovered?.payload);

  await prisma.appDataStore.create({
    data: {
      userId,
      payload: payload as object,
      legacySyncKey: recovered?.syncKey ?? null,
    },
  });
}

async function findCurrentAppDataOwner() {
  const legacySyncKey = process.env.APP_SYNC_KEY?.trim();
  if (legacySyncKey) {
    const row = await prisma.appDataStore.findUnique({
      where: { legacySyncKey },
      include: { user: true },
    });
    if (row) return { user: row.user, payload: row.payload };
  }

  const rows = await prisma.appDataStore.findMany({
    orderBy: { createdAt: "asc" },
    take: 2,
    include: { user: true },
  });

  if (rows.length === 1) {
    return { user: rows[0].user, payload: rows[0].payload };
  }
  return null;
}

async function findLegacyPayload(): Promise<LegacyPayload | null> {
  const legacySyncKey = process.env.APP_SYNC_KEY?.trim();

  if (legacySyncKey) {
    const row = await prisma.legacyAppDataStore.findUnique({ where: { syncKey: legacySyncKey } });
    if (row) return { syncKey: row.syncKey, payload: row.payload };

    const rawRow = await findRawLegacyPayloadBySyncKey(legacySyncKey);
    if (rawRow) return { syncKey: rawRow.syncKey, payload: rawRow.payload };
  }

  const rows = await prisma.legacyAppDataStore.findMany({
    orderBy: { updatedAt: "desc" },
    take: 2,
  });
  if (rows.length === 1) {
    return { syncKey: rows[0].syncKey, payload: rows[0].payload };
  }

  const rawRows = await findRawLegacyPayloads();
  if (rawRows.length === 1) {
    return { syncKey: rawRows[0].syncKey, payload: rawRows[0].payload };
  }

  return null;
}

async function findRawLegacyPayloadBySyncKey(syncKey: string): Promise<RawLegacyRow | null> {
  try {
    const rows = await prisma.$queryRaw<RawLegacyRow[]>`
      SELECT "syncKey", payload
      FROM "AppDataStore"
      WHERE "syncKey" = ${syncKey}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function findRawLegacyPayloads(): Promise<RawLegacyRow[]> {
  try {
    return await prisma.$queryRaw<RawLegacyRow[]>`
      SELECT "syncKey", payload
      FROM "AppDataStore"
      WHERE "syncKey" IS NOT NULL
      ORDER BY "updatedAt" DESC
      LIMIT 2
    `;
  } catch {
    return [];
  }
}

function normalizeRecoveredPayload(payload: unknown): AppData {
  return normalizeAppData(payload);
}

function displayNameFromPayload(payload: unknown): string | null {
  if (!payload) return null;
  return displayNameFromAppData(normalizeRecoveredPayload(payload));
}

function displayNameFromAppData(data: AppData): string {
  const profileName = data.userProfile.name.trim();
  return profileName || RECOVERY_ACCOUNT_DISPLAY_NAME;
}

