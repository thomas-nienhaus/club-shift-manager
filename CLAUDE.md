# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Club Shift Manager ("Kantine Planner") is a full-stack monorepo for managing volunteer shifts at a Dutch football club. It features session-based auth, volunteer management, shift scheduling (including auto round-robin assignment), availability tracking, and Excel import/export. UI text and domain language are in Dutch.

## Monorepo Structure

```
artifacts/
  api-server/        # Express 5 API server (port 8080)
  kantine-planner/   # React 19 SPA (Vite, port 5000 in dev)

lib/
  db/                # Drizzle ORM schema + PostgreSQL connection
  api-spec/          # OpenAPI YAML spec (source of truth for the API contract)
  api-client-react/  # Generated React Query hooks (do not edit directly)
  api-zod/           # Generated Zod schemas (do not edit directly)
```

`pnpm` workspaces are enforced — npm and yarn are blocked by a preinstall script.

## Common Commands

Run from the repo root unless noted.

```bash
# Install dependencies
pnpm install

# Type-check all workspaces
pnpm typecheck

# Start API server in dev mode (hot reload via tsx)
pnpm --filter @workspace/api-server dev

# Start frontend dev server
pnpm --filter @workspace/kantine-planner dev

# Build everything (typecheck + esbuild + Vite)
pnpm build

# Push DB schema changes (Drizzle Kit)
pnpm --filter @workspace/db push

# Regenerate API client and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec codegen
```

There are no automated tests — TypeScript strict mode serves as the primary correctness check.

## API Contract Workflow

The OpenAPI spec at `lib/api-spec/openapi.yaml` is the source of truth. When adding or changing endpoints:
1. Update `openapi.yaml`
2. Run `pnpm --filter @workspace/api-spec codegen` to regenerate `lib/api-client-react` and `lib/api-zod`
3. Implement the route in `artifacts/api-server/src/routes/`
4. The frontend consumes the generated React Query hooks from `@workspace/api-client-react`

Never manually edit files in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/`.

## Architecture

**Data flow:** PostgreSQL → Drizzle ORM (`lib/db`) → Express routes (`artifacts/api-server/src/routes/`) → OpenAPI spec → generated Zod validators + React Query hooks → React pages/components.

**Auth:** Session-based using signed HTTP-only cookies (`SESSION_SECRET` env var). The `useAuth()` context hook exposes the current user. Wrap protected pages with `<AuthGuard>` (pass `requireAdmin` for admin-only routes).

**State management:** TanStack React Query for all server state. No Redux or Zustand. Local `useState` for UI-only state (modals, filters).

**Routing:** Wouter (client-side). Routes are defined in `artifacts/kantine-planner/src/App.tsx`.

**DB schema:** `lib/db/src/schema/` — tables include `volunteers`, `shifts`, `assignments`, `availability_slots`, `seasons`, `volunteer_groups`, `volunteer_availability`, `volunteer_pairs`. Drizzle-zod generates insert/select types from the schema.

**Production build:** esbuild bundles the API server to `artifacts/api-server/dist/index.cjs`; Vite outputs the frontend to `artifacts/kantine-planner/dist/`. In production, the API server serves the frontend as static files.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for signing session cookies |
| `PORT` | Yes | API server port (8080 in prod, 5000 for frontend dev) |
| `BASE_PATH` | Yes (frontend) | Vite base path (usually `/`) |
| `NODE_ENV` | No | `production` enables static file serving from API |

Vite throws an error if `PORT` or `BASE_PATH` are not set. Copy `.env.example` for local dev.

## Key Conventions

- **Password hashing:** Node.js `crypto.scrypt` with a random salt, stored as `salt:hash` in the DB.
- **Excel import:** XLSX library used for bulk-importing volunteers and seasons. Import endpoints are `POST /volunteers/import-excel` and `POST /seasons/:id/import`.
- **Auto-scheduling:** `POST /shifts/auto-schedule` implements a round-robin assignment algorithm.
- **TypeScript:** Strict mode (`noImplicitAny`, `strictNullChecks`). Workspaces use `references` for incremental builds.
- **UI:** shadcn/ui components (Radix UI + Tailwind CSS v4). Components live in `artifacts/kantine-planner/src/components/ui/`. Forms use React Hook Form + Zod resolvers.
