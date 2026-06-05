## Personal Development Hub

A Next.js app scaffold for personal growth workflows:

- journaling
- habit tracking
- workout tracking
- to-do lists
- goal setting
- language practice

## Getting Started

Run the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Project Structure

Core folders in `src/`:

- `app/` - App Router pages and route segments
- `components/` - shared UI and layout components
- `features/` - domain modules by feature
- `lib/` - constants, navigation, and starter data

Routes included:

- `/` dashboard
- `/journal`
- `/habits`
- `/workouts`
- `/todos`
- `/goals`
- `/language`

## Cloud storage

By default data lives in this browser only (`localStorage`). You can enable **cloud storage** so the full app snapshot is saved to PostgreSQL and syncs across devices.

1. Create a Postgres database (Neon, Supabase, Vercel Postgres, etc.).
2. Copy `.env.example` to `.env.local` and set:
   - `DATABASE_URL` — Postgres connection string
   - `APP_SYNC_KEY` — a long secret you choose (same on server and in the app)
3. Apply the schema:
   ```bash
   npm run db:push
   ```
4. In the app: **Workouts → settings (gear) → Cloud storage**, enter your sync key, and choose **Enable cloud and upload this device**.

Changes auto-save to the cloud when cloud mode is on. Local storage remains as a backup cache.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
```
