# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Club Shift Manager ("Kantine Planner") is a static React SPA for managing volunteer shifts at a Dutch football club. It uses Supabase as the backend (PostgreSQL + Row Level Security + Auth). Features: volunteer management, shift scheduling (including auto round-robin assignment), availability tracking, iCal export, and Excel import/export. UI text and domain language are in Dutch.

## Structure

```
artifacts/
  kantine-planner/   # React 19 SPA (Vite)

supabase/
  migrations/        # PostgreSQL schema with RLS policies
  seed.sql           # Initial availability slots
```

`pnpm` workspaces are enforced — npm and yarn are blocked by a preinstall script.

## Common Commands

Run from the repo root unless noted.

```bash
# Install dependencies
pnpm install

# Type-check frontend
pnpm typecheck

# Start frontend dev server (requires .env with Supabase keys)
pnpm --filter @workspace/kantine-planner dev

# Build for production
pnpm build
```

There are no automated tests — TypeScript strict mode serves as the primary correctness check.

## Architecture

**Data flow:** Supabase PostgreSQL → `@supabase/supabase-js` client → local React Query hooks (`src/hooks/`) → React pages/components.

**Auth:** Supabase Auth (email + password). The `useAuth()` context hook exposes the current user. Wrap protected pages with `<AuthGuard>` (pass `requireAdmin` for admin-only routes). Volunteers are linked to auth users via `auth_id UUID` column in the `volunteers` table.

**State management:** TanStack React Query for all server state. No Redux or Zustand. Local `useState` for UI-only state (modals, filters).

**Routing:** Wouter (client-side). Routes are defined in `artifacts/kantine-planner/src/App.tsx`.

**Types:** Centralized in `src/lib/types.ts` — `Volunteer`, `ShiftWithAssignments`, `Season`, `AvailabilitySlot`, `CurrentUser`, etc.

**Hooks:** `src/hooks/` — one file per resource (`use-volunteers.ts`, `use-shifts.ts`, `use-seasons.ts`, `use-availability-slots.ts`). Query keys use semantic arrays: `['volunteers']`, `['shifts', params]`, `['seasons']`, `['availability-slots']`.

**Client-side utilities:**
- `src/utils/auto-schedule.ts` — `runAutoSchedule({ seasonId? })` round-robin assignment
- `src/utils/season-generator.ts` — `generateSeasonShifts(seasonId)` shift generation
- `src/utils/ical.ts` — `generateIcal(volunteerId)` + `downloadIcal(content, filename)`
- `src/utils/volunteer-importer.ts` — `importVolunteersFromExcel(file, slotLabels)`
- `src/utils/season-importer.ts` — `importSeasonSchedule(seasonId, file)`

**Production build:** Vite outputs the frontend to `artifacts/kantine-planner/dist/`. The Railway deployment serves this via `vite preview`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `BASE_PATH` | Yes | Vite base path (usually `/`) |

Copy `.env.example` for local dev. The `VITE_` prefix exposes vars to the browser bundle.

## Supabase Setup

1. Run `supabase/migrations/001_schema.sql` to create all tables with RLS
2. Run `supabase/seed.sql` to insert default availability slots
3. Create auth users via Supabase dashboard, then link them:
   ```sql
   UPDATE volunteers SET auth_id = '<uuid-from-auth.users>' WHERE email = 'user@example.com';
   ```
4. Admin access: set `is_admin = true` on the volunteer record

## Key Conventions

- **Admin passwords:** Admins cannot set passwords for other users (Supabase Admin API requires service_role key). Users authenticate themselves or are invited via Supabase dashboard.
- **Excel import:** XLSX library used for bulk-importing volunteers and season schedules.
- **Auto-scheduling:** `runAutoSchedule()` in `src/utils/auto-schedule.ts` implements round-robin assignment.
- **TypeScript:** Strict mode (`noImplicitAny`, `strictNullChecks`).
- **UI:** shadcn/ui components (Radix UI + Tailwind CSS v4). Components live in `artifacts/kantine-planner/src/components/ui/`. Forms use React Hook Form + Zod resolvers.
