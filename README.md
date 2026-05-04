# Kantine Planner — v.v. KCVO

Een webapplicatie voor het beheren van kantinediensten bij voetbalclub v.v. KCVO in Vaassen. Vrijwilligers kunnen hun rooster bekijken en beheerders kunnen het volledige planningsproces afhandelen — van vrijwilligersbeheer tot automatische indeling.

---

## Gebruikersrollen

| Rol | Toegang |
|---|---|
| **Beheerder** | Volledige toegang: vrijwilligers beheren, seizoenen plannen, automatische indeling uitvoeren, uitnodigingen versturen |
| **Vrijwilliger** | Eigen rooster bekijken, agenda exporteren, persoonlijke gegevens aanpassen |

---

## Toegang & Accounts

- **Inloggen** via e-mailadres en wachtwoord
- **Wachtwoord vergeten** — stuurt een reset-link per e-mail
- **Uitnodigingen** — beheerder nodigt vrijwilliger uit via e-mail; vrijwilliger stelt zelf een wachtwoord in
- **Beheerdersrechten** zijn alleen toe te kennen aan vrijwilligers met een actief account
- Uitnodigingslinks zijn **24 uur geldig** (instelbaar in Supabase)

---

## Functies voor Beheerders

### Vrijwilligers

- Vrijwilligers toevoegen, bewerken en verwijderen
- Per vrijwilliger: naam, e-mailadres, telefoonnummer, beschikbaarheid per dienst en groepsindeling
- **Uitnodiging versturen** per vrijwilliger (knop zichtbaar als vrijwilliger nog geen account heeft)
- **Account-badge** toont direct of een vrijwilliger al een actief account heeft
- **Beheerdersrechten** toekennen (alleen mogelijk als de vrijwilliger een account heeft)
- **Bulkimport via Excel** (.xlsx) — naam, e-mail, telefoon en beschikbaarheid in één keer importeren
- **iCal downloaden** per vrijwilliger — agenda met alle geplande diensten

### Seizoenen

- Seizoenen aanmaken met start- en einddatum
- Automatisch diensten genereren voor een heel seizoen op basis van de geconfigureerde diensten
- **Publicatiebeheer** — nieuw aangemaakt seizoen staat standaard op *Concept*; de beheerder publiceert het expliciet zodat vrijwilligers het kunnen zien
- **Thuiswedstrijden** — per seizoen een lijst van thuiswedstrijddatums invoeren via een wizard; op die datums wordt automatisch een extra dienst aangemaakt en worden reguliere diensten op thuistijden gezet

### Diensten

- Beschikbare diensten (tijdslots) aanmaken en beheren met drag-and-drop volgorde
- Per dienst: naam, dag van de week, uit- en thuiswedstrijdtijden (optioneel)
- **Extra dienst bij thuiswedstrijden** — markeer één dienst als thuiswedstrijd-only; deze dienst verschijnt alleen op thuiswedstrijddatums
- Diensten activeren/deactiveren zonder ze te verwijderen

### Planning beheren

- Volledig roosteroverzicht per week of alle weken tegelijk
- Diensten handmatig aanmaken, bewerken en verwijderen
- Vrijwilligers handmatig aan diensten koppelen
- **Automatische indeling** — round-robin algoritme deelt vrijwilligers eerlijk in op basis van beschikbaarheid en groepslidmaatschap
- **Filters** — op seizoen, dienst en vrijwilliger; combineerbaar met de week/alles-weergave
- **Afdrukken** — rooster afdrukken; seizoensnaam verschijnt automatisch in de afdruk-header

---

## Functies voor Vrijwilligers

- Eigen rooster bekijken op het dashboard
- **Filter op eigen diensten** — één klik toont alleen de eigen ingeplande diensten
- **iCal exporteren** — diensten downloaden als .ics-bestand voor Google Agenda, Outlook of Apple Agenda
- **iCal-abonnement** — live agenda-URL die automatisch gesynchroniseerd blijft; kopieer de URL of open direct met de webcal-link
- **Dienst aanbieden** — toekomstige eigen dienst aanbieden aan andere vrijwilligers
- **Instellingen** — naam, e-mailadres en wachtwoord wijzigen

---

## Groepen

Vrijwilligers kunnen worden gekoppeld in een groep (max. 5 personen). Groepsleden worden altijd samen ingepland — handig voor koppels of vrienden die samen een dienst willen draaien.

---

## Thema's

De app heeft twee stylingopties, te wisselen via de knop in de sidebar:

| Thema | Beschrijving |
|---|---|
| **Standaard** | Donkere sidebar, grasgroene primaire kleur |
| **Sport** | Lichte sidebar, teal/lavendel gradient achtergrond |

De keuze wordt opgeslagen in de browser (localStorage).

---

## Technische Informatie

| Onderdeel | Technologie |
|---|---|
| Frontend | React 19 SPA (Vite), TypeScript, Tailwind CSS v4 |
| Hosting | GitHub Pages (automatisch gedeployd via GitHub Actions bij push naar `main`) |
| Database | Supabase (PostgreSQL met Row Level Security) |
| Authenticatie | Supabase Auth (e-mail + wachtwoord) |
| Uitnodigingsmails | Supabase Edge Function + SMTP |
| Agenda-export | iCal-formaat (.ics) — download of live abonnement |
| iCal-abonnement | Supabase Edge Function (`supabase/functions/ical/`) |
| Excel-import | .xlsx via XLSX bibliotheek (vrijwilligers bulkimport) |
| Zoekmachines | Geblokkeerd via `robots.txt` + `noindex` |

---

## Lokale ontwikkeling

```bash
# Installeer dependencies
pnpm install

# Start de dev server (vereist .env met Supabase keys)
pnpm --filter @workspace/kantine-planner dev

# Type-check
pnpm typecheck

# Tests uitvoeren
pnpm --filter @workspace/kantine-planner test:run

# Productiebuild
pnpm build
```

Kopieer `.env.example` naar `.env` en vul de Supabase keys in:

```
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
BASE_PATH=/
```

---

## Supabase Setup

Voer alle migraties in volgorde uit via de **Supabase SQL Editor**, gevolgd door het seed-bestand:

| Bestand | Beschrijving |
|---|---|
| `supabase/migrations/001_schema.sql` | Initieel schema — tabellen, RLS-policies, auth-koppeling |
| `supabase/migrations/002_shift_offers.sql` | Shift offer/swap workflow |
| `supabase/migrations/003_season_published.sql` | Publicatiestatus seizoenen |
| `supabase/migrations/004_offer_expiry.sql` | Verlooptijd shift offers |
| `supabase/migrations/005_home_game_dates.sql` | Thuiswedstrijddatums per seizoen |
| `supabase/migrations/006_home_game_slot.sql` | Extra dienst bij thuiswedstrijden |
| `supabase/migrations/007_security_fixes.sql` | Beveiligingsfixes execute_takeover/swap + RLS |
| `supabase/migrations/008_home_times.sql` | Thuis- en uitwedstrijdtijden per dienst |
| `supabase/seed.sql` | Standaard diensten (ochtend, middag, avond) |

Na de migraties:

```sql
-- Koppel een Supabase auth-gebruiker aan een vrijwilliger
UPDATE volunteers SET auth_id = '<uuid-from-auth.users>' WHERE email = 'gebruiker@voorbeeld.nl';

-- Geef beheerderstoegang
UPDATE volunteers SET is_admin = true WHERE email = 'beheerder@voorbeeld.nl';
```

Deploy de iCal Edge Function:

```bash
supabase functions deploy ical
```

Zie `TODO.md` voor handmatige acties die nog openstaan.
