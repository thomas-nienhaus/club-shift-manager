# Handmatige acties in Supabase

Dit bestand bijhoudt welke SQL-migraties en instellingen nog handmatig uitgevoerd
moeten worden via de Supabase SQL Editor of het Supabase dashboard.

---

## Openstaand

### Migration 008 — Thuis/uit tijden per dienst

**Status:** Nog niet uitgevoerd  
**Bestand:** `supabase/migrations/008_home_times.sql`

Voer onderstaande SQL uit via **Supabase → SQL Editor**:

```sql
ALTER TABLE availability_slots
  ADD COLUMN home_start_time TIME,
  ADD COLUMN home_end_time TIME;
```

**Waarom:** Maakt het mogelijk om per dienst aparte tijden in te stellen voor
thuis- en uitwedstrijden. Zonder deze migratie kunnen de nieuwe tijdvelden in
het diensten-formulier niet worden opgeslagen.

---

## Afgerond

| Migratie | Beschrijving | Uitgevoerd |
|---|---|---|
| 001_schema.sql | Initieel schema (tabellen, RLS, auth) | ✅ |
| 002_shift_offers.sql | Shift offer/swap workflow | ✅ |
| 003_season_published.sql | is_published kolom + shifts RLS | ✅ |
| 004_offer_expiry.sql | Verlooptijd shift offers | ✅ |
| 005_home_game_dates.sql | Thuiswedstrijddatums per seizoen | ✅ |
| 006_home_game_slot.sql | is_home_game_slot kolom | ✅ |
| 007_security_fixes.sql | Auth checks execute_takeover/swap + RLS policies | ✅ |
