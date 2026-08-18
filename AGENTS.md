<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Overview

Single Next.js 16 app (Personal Development Hub). All domain data is stored in the browser via `localStorage` (`AppDataProvider` in `src/lib/app-data.tsx`). No database, Docker, or external services are required for core UI flows.

### Running the app

```bash
npm run dev    # http://localhost:3000
npm run build  # production build
npm run start  # serve production build (run build first)
npm run lint   # ESLint (see note below)
```

Use a tmux session for long-running dev servers (e.g. session name `next-dev-server`).

### Lint

`npm run lint` currently reports pre-existing `react-hooks/set-state-in-effect` errors in dashboard, todos, and workouts pages. The app still builds and runs (`npm run build` succeeds).

### Optional environment variables

Create `.env.local` only when testing AI features:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Powers `POST /api/ai` (dashboard coach, journal analysis) and `POST /api/cron/daily-summary` |
| `CRON_SECRET` | Optional auth header for the cron route |

Without `OPENAI_API_KEY`, AI endpoints return a clear configuration error; all other routes work normally.

### Testing

No automated test runner is configured. Verify changes by running the dev server and exercising routes: `/`, `/habits`, `/journal`, `/workouts`, `/todos`, `/goals`.
