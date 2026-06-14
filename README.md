# Personal Development Hub

A Next.js app for personal growth: journaling, habits, workouts, to-dos, goals, and accountability partners.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Accounts and cloud storage

Every user **registers and signs in** with email and password. Data syncs automatically to PostgreSQL while signed in. A local cache is kept on each device.

1. Copy `.env.example` to `.env.local` and set:
   - `DATABASE_URL` — Postgres connection string
   - `SESSION_SECRET` — long random string for session cookies
   - `OPENAI_API_KEY` — for AI features (optional locally)
2. Apply the schema:
   ```bash
   npm run db:push
   ```
3. **Existing user migration:** Register with your email. Data in this browser's local storage is imported automatically. If you previously used cloud sync with a sync key, that key is sent on register to merge any legacy cloud snapshot.

### Legacy cloud sync migration

If you had data under the old sync-key system before upgrading:

```bash
npm run db:legacy-import
```

Then register in the app — your local data and legacy cloud row (if any) are merged into your new account.

## Accountability partners

Each user has a unique **accountability code** (Settings → Accountability). Add partners by code and choose unilateral or bilateral sharing. Partners can view goals, habits, workouts, and daily AI summaries — not journal entries or individual tasks.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
npm run db:push
```
