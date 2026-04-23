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
- Per vrijwilliger: naam, e-mailadres, telefoonnummer, beschikbaarheid per dagdeel en groepsindeling
- **Uitnodiging versturen** per vrijwilliger (knop zichtbaar als vrijwilliger nog geen account heeft)
- **Account-badge** toont direct of een vrijwilliger al een actief account heeft
- **Beheerdersrechten** toekennen (alleen mogelijk als de vrijwilliger een account heeft)
- **Bulkimport via Excel** (.xlsx) — naam, e-mail, telefoon en beschikbaarheid in één keer importeren
- **iCal downloaden** per vrijwilliger — agenda met alle geplande diensten

### Seizoenen

- Seizoenen aanmaken met start- en einddatum
- Automatisch diensten genereren voor een heel seizoen op basis van de beschikbare dagdelen
- Seizoensrooster importeren via Excel

### Dagdelen

- Beschikbare dagdelen (tijdslots) aanmaken en beheren
- Worden gebruikt bij vrijwilligersbeschikbaarheid en dienstindeling

### Planning (dashboard)

- Volledig roosteroverzicht per week en seizoen
- Diensten handmatig aanmaken, bewerken en verwijderen
- Vrijwilligers handmatig aan diensten koppelen
- **Automatische indeling** — round-robin algoritme deelt vrijwilligers eerlijk in op basis van beschikbaarheid en groepslidmaatschap
- Rooster afdrukken (geoptimaliseerde printweergave)

---

## Functies voor Vrijwilligers

- Eigen rooster bekijken op het dashboard
- **iCal exporteren** — diensten importeren in Google Agenda, Outlook of Apple Agenda
- **Instellingen** — naam, e-mailadres en wachtwoord wijzigen

---

## Groepen

Vrijwilligers kunnen worden gekoppeld in een groep (max. 5 personen). Groepsleden worden altijd samen ingepland — handig voor koppels of vrienden die samen een dienst willen draaien.

---

## Technische Informatie

| Onderdeel | Technologie |
|---|---|
| Hosting | GitHub Pages (statische website) |
| Database | Supabase (PostgreSQL met Row Level Security) |
| Authenticatie | Supabase Auth (e-mail + wachtwoord) |
| Uitnodigingsmails | Supabase Edge Function + SMTP |
| Agenda-export | iCal-formaat (.ics) |
| Excel-import | .xlsx via XLSX bibliotheek |
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

1. Voer `supabase/migrations/001_schema.sql` uit om alle tabellen met RLS aan te maken
2. Voer `supabase/seed.sql` uit voor de standaard dagdelen
3. Maak een auth-gebruiker aan via het Supabase dashboard en koppel deze:
   ```sql
   UPDATE volunteers SET auth_id = '<uuid>' WHERE email = 'gebruiker@voorbeeld.nl';
   ```
4. Zet `is_admin = true` voor beheerderstoegang
