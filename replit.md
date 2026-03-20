# Kantine Planner

## Overview

Voetbalclub Kantine Planner — een full-stack webapp voor het beheren van vrijwilligers voor de kantine van een voetbalclub.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080, path /api)
│   └── kantine-planner/    # React + Vite frontend (port 24294, path /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
└── package.json            # Root package with hoisted devDeps
```

## Features

1. **Dashboard** — Week/maand kalenderweergave + lijstweergave van diensten
2. **Shift Beheer** — Diensten aanmaken voor dynamisch geconfigureerde dagdelen
3. **Vrijwilliger Toewijzing** — Meerdere vrijwilligers per dienst
4. **Groepssysteem** — Vrijwilligers kunnen worden gegroepeerd (max 5); groepen worden altijd samen ingedeeld
5. **Print** — Print-vriendelijke weergave met filters op dag en vrijwilliger
6. **Auto-indelen** — Automatisch round-robin toewijzing per seizoen
7. **Seizoenbeheer** — Seizoenen aanmaken met xlsx-import van het schema
8. **Dynamische Dagdelen** — Admin kan dagdelen beheren (toevoegen, bewerken, activeren/deactiveren) via `/availability-slots`. Dagdelen zijn opgeslagen in de `availability_slots` tabel.
9. **Rollen** — Admin (vol beheer) en Vrijwilliger (alleen weergave)

## Gebruikersaccounts

- **Admin**: `admin` / `admin123`
- **Vrijwilliger**: `vrijwilliger` / `vrijwilliger123`

## Database Schema

- `volunteers` — Vrijwilligers (naam, email, telefoon)
- `shifts` — Diensten (datum, dagdeel, capaciteit, notities)
- `assignments` — Koppeltabel vrijwilligers ↔ diensten

## API Routes

All routes under `/api`:
- `GET /healthz` — Health check
- `GET/POST /volunteers` — List/create volunteers
- `GET/PUT/DELETE /volunteers/:id` — Single volunteer CRUD
- `GET/POST /shifts` — List/create shifts (optional ?startDate=&endDate= filters)
- `GET/PUT/DELETE /shifts/:id` — Single shift CRUD
- `POST /shifts/:id/assign` — Assign volunteer to shift
- `DELETE /shifts/:id/unassign/:volunteerId` — Remove volunteer from shift
- `POST /auth/login` — Login
- `GET /auth/me` — Current user
- `POST /auth/logout` — Logout

## Development

```bash
# Run codegen after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen

# Push database schema changes
pnpm --filter @workspace/db run push

# TypeCheck all packages
pnpm run typecheck
```
