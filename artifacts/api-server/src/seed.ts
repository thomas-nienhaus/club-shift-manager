import { db, volunteersTable, availabilitySlotsTable, volunteerAvailabilityTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function seedIfEmpty() {
  const existing = await db.select().from(volunteersTable).limit(1);
  if (existing.length > 0) return;

  console.log("[seed] Lege database gedetecteerd — basisdata aanmaken...");

  // ── Availability slots ─────────────────────────────────────────────────────
  await db.insert(availabilitySlotsTable).values([
    { key: "wednesday_evening", label: "Woensdagavond", sortOrder: 1, startTime: null, endTime: null },
    { key: "thursday_evening",  label: "Donderdagavond", sortOrder: 2, startTime: null, endTime: null },
    { key: "saturday_morning",  label: "Zaterdagochtend", sortOrder: 3, startTime: "09:00", endTime: "13:00" },
    { key: "saturday_afternoon",label: "Zaterdagmiddag", sortOrder: 4, startTime: "13:00", endTime: "17:00" },
    { key: "sunday_morning",    label: "Zondagochtend", sortOrder: 5, startTime: null, endTime: null },
    { key: "sunday_afternoon",  label: "Zondagmiddag", sortOrder: 6, startTime: null, endTime: null },
    { key: "vrijdag_avond",     label: "Vrijdagavond", sortOrder: 7, startTime: null, endTime: null },
  ]).onConflictDoNothing();

  // ── Volunteers (with original IDs) ─────────────────────────────────────────
  await db.execute(sql`
    INSERT INTO volunteers (id, name, email, phone, password_hash, is_admin) VALUES
    (6,  'Jeffrey Hennekes',    NULL, NULL, NULL, false),
    (7,  'Giel van Norel',      NULL, NULL, NULL, false),
    (8,  'Wim van Bussel',      'wim@kantineplanner.nl', '06-99887766',
         '4bca3a3d4ebb03e3ca4f9eeed1380034:a6c469003996b24985ab38e064f2b18351877bdbfcd0ebecccf1cbf46746947c0d921a338ede450f1dcdf788e8d4917437ee901c66d4b5d1614610b89a5c9858',
         false),
    (9,  'Leonie van Mourik',   NULL, NULL, NULL, false),
    (10, 'Joran Betting',       NULL, NULL, NULL, false),
    (11, 'Mike Hendriks',       NULL, NULL, NULL, false),
    (12, 'Wies Schaaf',         NULL, NULL, NULL, false),
    (13, 'Esther Hulleman',     NULL, NULL, NULL, false),
    (14, 'Alfons Pelgrom',      NULL, NULL, NULL, false),
    (15, 'Leo Berends',         NULL, NULL, NULL, false),
    (16, 'Gert-Jan Pannekoek',  NULL, NULL, NULL, false),
    (17, 'Jan Klomp',           NULL, NULL, NULL, false),
    (18, 'Marcel Bouwmeester',  NULL, NULL, NULL, false),
    (19, 'Thomas Nienhaus',     'thomasnienhaus@hotmail.com', '0636068909', NULL, true),
    (20, 'Thijs Prins',         NULL, NULL, NULL, false),
    (21, 'Eric Steneker',       NULL, NULL, NULL, false),
    (22, 'Arnold ten Hove',     NULL, NULL, NULL, false),
    (23, 'Jasper Hendriks',     NULL, NULL, NULL, false),
    (24, 'Ruben Schumacher',    NULL, NULL, NULL, false),
    (25, 'Lisette Schumacher',  NULL, NULL, NULL, false),
    (26, 'Wendy Bosgoed',       NULL, NULL, NULL, false),
    (27, 'Marlies de Weerd',    NULL, NULL, NULL, false),
    (28, 'Wijnand van Eek',     NULL, NULL, NULL, false),
    (29, 'Wesley Oortwijn',     NULL, NULL, NULL, false),
    (30, 'Henk Bouwmeester',    NULL, NULL, NULL, false),
    (31, 'Jan van Bussel',      NULL, NULL, NULL, false),
    (32, 'Koen Wegerif',        NULL, NULL, NULL, false),
    (33, 'Sam van Dongen',      NULL, NULL, NULL, false),
    (34, 'Gerrit-Jan de Wilde', NULL, NULL, NULL, false),
    (35, 'Erma de Wilde',       NULL, NULL, NULL, false),
    (36, 'Reinder de Wilde',    NULL, NULL, NULL, false),
    (37, 'Jeroen Bourgonje',    NULL, NULL, NULL, false),
    (38, 'Wim Bourgonje',       NULL, NULL, NULL, false),
    (39, 'Steven Scholten',     NULL, NULL, NULL, false),
    (40, 'Dion Weultjes',       NULL, NULL, NULL, false),
    (41, 'Jort Poppe',          NULL, NULL, NULL, false),
    (42, 'Jasper Kooijer',      NULL, NULL, NULL, false),
    (43, 'Toon Reusken',        NULL, NULL, NULL, false),
    (44, 'Hermen van de Kwast', NULL, NULL, NULL, false),
    (45, 'Wiebe Schaafsma',     NULL, NULL, NULL, false),
    (46, 'Piet Schumacher',     NULL, NULL, NULL, false),
    (47, 'Albert Weultjes',     NULL, NULL, NULL, false),
    (48, 'Petra Leerkes',       NULL, NULL, NULL, false),
    (49, 'Gerjanne Bibo',       NULL, NULL, NULL, false)
    ON CONFLICT (id) DO NOTHING
  `);

  // Reset sequence
  await db.execute(sql`SELECT setval('volunteers_id_seq', 50, false)`);

  // ── Volunteer availability ─────────────────────────────────────────────────
  await db.execute(sql`
    INSERT INTO volunteer_availability (volunteer_id, slot) VALUES
    (6,  'wednesday_evening'),
    (7,  'wednesday_evening'),
    (8,  'thursday_evening'),
    (9,  'thursday_evening'),
    (10, 'saturday_afternoon'),
    (11, 'saturday_afternoon'),
    (12, 'sunday_morning'),
    (13, 'sunday_morning'),
    (14, 'sunday_morning'),
    (15, 'wednesday_evening'),
    (16, 'wednesday_evening'),
    (17, 'thursday_evening'),
    (18, 'thursday_evening'),
    (19, 'saturday_afternoon'),
    (20, 'saturday_afternoon'),
    (21, 'sunday_morning'),
    (22, 'sunday_morning'),
    (23, 'sunday_morning'),
    (24, 'sunday_afternoon'),
    (25, 'sunday_afternoon'),
    (26, 'sunday_afternoon'),
    (27, 'sunday_afternoon'),
    (28, 'wednesday_evening'),
    (29, 'wednesday_evening'),
    (30, 'thursday_evening'),
    (31, 'thursday_evening'),
    (32, 'saturday_afternoon'),
    (33, 'saturday_afternoon'),
    (34, 'sunday_morning'),
    (35, 'sunday_morning'),
    (36, 'sunday_morning'),
    (37, 'wednesday_evening'),
    (38, 'wednesday_evening'),
    (39, 'thursday_evening'),
    (40, 'thursday_evening'),
    (41, 'saturday_afternoon'),
    (42, 'saturday_afternoon'),
    (43, 'sunday_morning'),
    (44, 'sunday_morning'),
    (45, 'sunday_morning'),
    (46, 'sunday_afternoon'),
    (47, 'sunday_afternoon'),
    (48, 'sunday_afternoon'),
    (49, 'sunday_afternoon')
    ON CONFLICT DO NOTHING
  `);

  console.log("[seed] Klaar — 44 vrijwilligers en 7 dagdelen aangemaakt.");
}
