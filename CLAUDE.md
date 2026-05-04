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

# Build for production (outputs to artifacts/kantine-planner/dist/public/)
pnpm build

# Run tests (watch mode)
pnpm --filter @workspace/kantine-planner test

# Single test run
pnpm --filter @workspace/kantine-planner test:run

# Generate coverage
pnpm --filter @workspace/kantine-planner coverage
```

## Architecture

**Data flow:** Supabase PostgreSQL → `@supabase/supabase-js` client → React Query hooks (`src/hooks/`) → React pages/components.

**Path alias:** `@/` resolves to `src/` throughout the app (configured in both `vite.config.ts` and `tsconfig.json`).

**Auth:** Supabase Auth (email + password). The `useAuth()` context hook exposes the current user. Wrap protected pages with `<AuthGuard>` (pass `requireAdmin` for admin-only routes). Volunteers are linked to auth users via `auth_id UUID` column in the `volunteers` table.

**State management:** TanStack React Query for all server state. No Redux or Zustand. Local `useState` for UI-only state (modals, filters).

**Routing:** Wouter (client-side). Routes defined in `artifacts/kantine-planner/src/App.tsx`:
- `/` → Dashboard (shift calendar with `@dnd-kit` drag-drop assignment)
- `/login` → Login
- `/seasons` → Season management
- `/volunteers` → Volunteer list/CRUD
- `/availability-slots` → Slot configuration
- `/settings` → User settings
- `/set-password` → Password reset flow
- `/beheer` → Admin panel (import, auto-schedule)

**Types:** Centralized in `src/lib/types.ts` — `Volunteer`, `ShiftWithAssignments`, `Season`, `AvailabilitySlot`, `Assignment`, `ShiftOffer`, `ShiftOfferResponse`, `HomeGameDate`, `VolunteerGroup`, `VolunteerGroupMember`, `CurrentUser`.

**Constants:** `src/lib/constants.ts` — `SLOT_LABELS` (display names) and `SLOT_ORDER` (sort order) for shift slot keys. Use these instead of hardcoding slot strings.

**Hooks:** `src/hooks/` — one file per resource (`use-volunteers.ts`, `use-shifts.ts`, `use-seasons.ts`, `use-availability-slots.ts`, `use-shift-offers.ts`, `use-home-game-dates.ts`). Query keys use semantic arrays: `['volunteers']`, `['shifts', params]`, etc. Mutations call `queryClient.invalidateQueries()` on success.

**Client-side utilities:**
- `src/utils/auto-schedule.ts` — `runAutoSchedule({ seasonId? })` round-robin assignment
- `src/utils/season-generator.ts` — `generateSeasonShifts(seasonId)` shift generation
- `src/utils/ical.ts` — `generateIcal(volunteerId)` + `downloadIcal(content, filename)`
- `src/utils/volunteer-importer.ts` — `importVolunteersFromExcel(file, slotLabels)`
- `src/utils/season-importer.ts` — `importSeasonSchedule(seasonId, file)`
- `src/utils/slot-utils.ts` — helpers for slot key/label conversions

**Volunteer groups:** Volunteers can be paired into groups via `volunteer_groups` / `volunteer_group_members` tables. The auto-scheduler uses groups to keep paired volunteers on the same shifts.

**Shift offer/swap workflow:** Volunteers can offer shifts via `shift_offers`. Others respond via `shift_offer_responses` (type: `takeover` or `swap`). Accepting calls Supabase database functions `execute_takeover(response_id)` or `execute_swap_offer(response_id)` which atomically update assignments.

**Date handling:** `date-fns` v3 with Dutch locale (`nl`) for all date formatting and parsing.

**Production build:** Vite outputs to `artifacts/kantine-planner/dist/public/`. Deployed automatically to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`) on push to `main`. `BASE_PATH` is set to `/club-shift-manager/` in the workflow.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `BASE_PATH` | Yes | Vite base path (usually `/`) |

Copy `.env.example` for local dev. The `VITE_` prefix exposes vars to the browser bundle.

## Supabase Setup

1. Run migrations in order: `supabase/migrations/001_schema.sql` through `008_*.sql`
2. Run `supabase/seed.sql` to insert default availability slots
3. Create auth users via Supabase dashboard, then link them:
   ```sql
   UPDATE volunteers SET auth_id = '<uuid-from-auth.users>' WHERE email = 'user@example.com';
   ```
4. Admin access: set `is_admin = true` on the volunteer record

## Key Conventions

- **TypeScript:** Strict mode (`noImplicitAny`, `strictNullChecks`). Prettier for formatting (no ESLint).
- **UI:** shadcn/ui components (Radix UI + Tailwind CSS v4). Components live in `artifacts/kantine-planner/src/components/ui/`. Forms use React Hook Form + Zod resolvers.
- **Admin passwords:** Admins cannot set passwords for other users (Supabase Admin API requires service_role key). Users authenticate themselves or are invited via Supabase dashboard.
- **Season visibility:** Non-admin users only see shifts from published seasons. Admins see all.
- **Excel import:** XLSX library for bulk-importing volunteers and season schedules.
