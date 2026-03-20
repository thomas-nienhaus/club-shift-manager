import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import {
  db,
  volunteersTable,
  volunteerAvailabilityTable,
  volunteerGroupsTable,
  volunteerGroupMembersTable,
  shiftsTable,
  assignmentsTable,
  availabilitySlotsTable,
} from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import {
  CreateVolunteerBody,
  UpdateVolunteerBody,
  GetVolunteerParams,
  UpdateVolunteerParams,
  DeleteVolunteerParams,
} from "@workspace/api-zod";
import { scryptSync, randomBytes } from "crypto";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const MAX_GROUP_SIZE = 5;
const router: IRouter = Router();

async function setGroupMembers(volunteerId: number, memberIds: number[]) {
  const allIds = [...new Set([volunteerId, ...memberIds])];

  if (allIds.length > MAX_GROUP_SIZE) {
    throw new Error(`Een groep mag maximaal ${MAX_GROUP_SIZE} vrijwilligers bevatten.`);
  }

  const existingMemberships = await db
    .select()
    .from(volunteerGroupMembersTable)
    .where(inArray(volunteerGroupMembersTable.volunteerId, allIds));

  const groupIds = [...new Set(existingMemberships.map((m) => m.groupId))];

  if (groupIds.length > 0) {
    await db
      .delete(volunteerGroupsTable)
      .where(inArray(volunteerGroupsTable.id, groupIds));
  }

  if (memberIds.length === 0) return;

  const [group] = await db.insert(volunteerGroupsTable).values({}).returning();

  await db.insert(volunteerGroupMembersTable).values(
    allIds.map((id) => ({ groupId: group.id, volunteerId: id }))
  );
}

async function enrichVolunteer(vol: typeof volunteersTable.$inferSelect) {
  const availability = await db
    .select({ slot: volunteerAvailabilityTable.slot })
    .from(volunteerAvailabilityTable)
    .where(eq(volunteerAvailabilityTable.volunteerId, vol.id));

  const membership = await db
    .select()
    .from(volunteerGroupMembersTable)
    .where(eq(volunteerGroupMembersTable.volunteerId, vol.id))
    .limit(1);

  let groupId: number | null = null;
  let groupMembers: { id: number; name: string }[] = [];

  if (membership.length > 0) {
    groupId = membership[0].groupId;
    const members = await db
      .select({ volunteerId: volunteerGroupMembersTable.volunteerId })
      .from(volunteerGroupMembersTable)
      .where(eq(volunteerGroupMembersTable.groupId, groupId));

    const memberIds = members.map((m) => m.volunteerId).filter((id) => id !== vol.id);
    if (memberIds.length > 0) {
      const memberVols = await db
        .select({ id: volunteersTable.id, name: volunteersTable.name })
        .from(volunteersTable)
        .where(inArray(volunteersTable.id, memberIds));
      groupMembers = memberVols;
    }
  }

  const { passwordHash: _omit, ...volSafe } = vol;
  return {
    ...volSafe,
    hasPassword: !!vol.passwordHash,
    createdAt: vol.createdAt.toISOString(),
    availability: availability.map((a) => a.slot),
    groupId,
    groupMembers,
  };
}

router.get("/", async (_req, res) => {
  const volunteers = await db
    .select()
    .from(volunteersTable)
    .orderBy(volunteersTable.name);
  const enriched = await Promise.all(volunteers.map(enrichVolunteer));
  res.json(enriched);
});

router.post("/", async (req, res) => {
  const { availability, groupMemberIds, password, ...rest } = CreateVolunteerBody.parse(req.body);
  const passwordHash = password ? hashPassword(password) : undefined;
  const [volunteer] = await db.insert(volunteersTable).values({ ...rest, passwordHash }).returning();

  if (availability && availability.length > 0) {
    await db.insert(volunteerAvailabilityTable).values(
      availability.map((slot) => ({ volunteerId: volunteer.id, slot }))
    );
  }

  if (groupMemberIds && groupMemberIds.length > 0) {
    await setGroupMembers(volunteer.id, groupMemberIds);
  }

  const enriched = await enrichVolunteer(volunteer);
  res.status(201).json(enriched);
});

// ── iCal export ───────────────────────────────────────────────────────────────
router.get("/:id/ical", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [volunteer] = await db.select().from(volunteersTable).where(eq(volunteersTable.id, id));
  if (!volunteer) { res.status(404).json({ error: "Volunteer not found" }); return; }

  const slots = await db.select().from(availabilitySlotsTable);
  const slotLabels: Record<string, string> = Object.fromEntries(slots.map(s => [s.key, s.label]));
  const slotTimes: Record<string, { startTime: string | null; endTime: string | null }> = Object.fromEntries(
    slots.map(s => [s.key, { startTime: s.startTime ?? null, endTime: s.endTime ?? null }])
  );

  const rows = await db
    .select({ shift: shiftsTable })
    .from(assignmentsTable)
    .innerJoin(shiftsTable, eq(assignmentsTable.shiftId, shiftsTable.id))
    .where(eq(assignmentsTable.volunteerId, id))
    .orderBy(shiftsTable.date);

  const nowStamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const esc = (s: string) => s.replace(/[,;\\]/g, c => `\\${c}`).replace(/\n/g, '\\n');

  const events = rows.map(({ shift }) => {
    const dateStr = shift.date.replace(/-/g, '');
    const label = slotLabels[shift.slot] ?? shift.slot;
    const uid = `kantine-shift-${shift.id}-vol-${id}@kantineplanner`;
    const summary = esc(`Kantinedienst – ${label}`);
    const desc = shift.notes ? `\r\nDESCRIPTION:${esc(shift.notes)}` : '';

    // Use shift-level times first, then fall back to slot-level times
    const resolvedStart = shift.startTime ?? slotTimes[shift.slot]?.startTime ?? null;
    const resolvedEnd   = shift.endTime   ?? slotTimes[shift.slot]?.endTime   ?? null;

    if (resolvedStart && resolvedEnd) {
      const dtStart = `${dateStr}T${resolvedStart.replace(':', '')}00`;
      const dtEnd   = `${dateStr}T${resolvedEnd.replace(':', '')}00`;
      return `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${nowStamp}\r\nDTSTART;TZID=Europe/Amsterdam:${dtStart}\r\nDTEND;TZID=Europe/Amsterdam:${dtEnd}\r\nSUMMARY:${summary}${desc}\r\nEND:VEVENT`;
    }

    const next = new Date(shift.date + 'T00:00:00');
    next.setDate(next.getDate() + 1);
    const nextStr = next.toISOString().slice(0, 10).replace(/-/g, '');
    return `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${nowStamp}\r\nDTSTART;VALUE=DATE:${dateStr}\r\nDTEND;VALUE=DATE:${nextStr}\r\nSUMMARY:${summary}${desc}\r\nEND:VEVENT`;
  });

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kantine Planner//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Kantinediensten – ${volunteer.name}`,
    'X-WR-TIMEZONE:Europe/Amsterdam',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Amsterdam',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const filename = `kantinediensten-${volunteer.name.replace(/\s+/g, '-').toLowerCase()}.ics`;
  res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` });
  res.send(ical);
});

router.get("/:id", async (req, res) => {
  const { id } = GetVolunteerParams.parse(req.params);
  const [volunteer] = await db
    .select()
    .from(volunteersTable)
    .where(eq(volunteersTable.id, id));
  if (!volunteer) {
    res.status(404).json({ error: "Volunteer not found" });
    return;
  }
  const enriched = await enrichVolunteer(volunteer);
  res.json(enriched);
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateVolunteerParams.parse(req.params);
  const { availability, groupMemberIds, password, ...rest } = UpdateVolunteerBody.parse(req.body);

  const updates: Record<string, unknown> = { ...rest };
  if (password !== undefined) {
    updates.passwordHash = password ? hashPassword(password) : null;
  }

  const [volunteer] = await db
    .update(volunteersTable)
    .set(updates)
    .where(eq(volunteersTable.id, id))
    .returning();
  if (!volunteer) {
    res.status(404).json({ error: "Volunteer not found" });
    return;
  }

  if (availability !== undefined) {
    await db
      .delete(volunteerAvailabilityTable)
      .where(eq(volunteerAvailabilityTable.volunteerId, id));
    if (availability.length > 0) {
      await db.insert(volunteerAvailabilityTable).values(
        availability.map((slot) => ({ volunteerId: id, slot }))
      );
    }
  }

  if (groupMemberIds !== undefined) {
    await setGroupMembers(id, groupMemberIds ?? []);
  }

  const enriched = await enrichVolunteer(volunteer);
  res.json(enriched);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteVolunteerParams.parse(req.params);
  const [deleted] = await db
    .delete(volunteersTable)
    .where(eq(volunteersTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Volunteer not found" });
    return;
  }
  res.json({ success: true, message: "Volunteer deleted" });
});

// ── Excel import ───────────────────────────────────────────────────────────────
router.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Geen bestand ontvangen." });
    return;
  }

  // Load available slot keys + label → key mapping
  const allSlots = await db.select().from(availabilitySlotsTable);
  const labelToKey: Record<string, string> = {};
  const validKeys = new Set<string>();
  for (const s of allSlots) {
    validKeys.add(s.key);
    labelToKey[s.label.toLowerCase()] = s.key;
    labelToKey[s.key.toLowerCase()] = s.key;
  }

  function parseAvailability(raw: unknown): string[] {
    if (!raw) return [];
    const parts = String(raw).split(/[,;|]+/).map(p => p.trim()).filter(Boolean);
    const result: string[] = [];
    for (const p of parts) {
      const key = labelToKey[p.toLowerCase()];
      if (key) result.push(key);
    }
    return [...new Set(result)];
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  } catch {
    res.status(400).json({ error: "Ongeldig Excel bestand." });
    return;
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) {
    res.status(400).json({ error: "Het bestand is leeg of bevat geen rijen." });
    return;
  }

  // Fetch existing volunteers to detect duplicates
  const existingVols = await db.select({ name: volunteersTable.name, email: volunteersTable.email }).from(volunteersTable);
  const existingNames = new Set(existingVols.map(v => v.name.toLowerCase().trim()));
  const existingEmails = new Set(existingVols.filter(v => v.email).map(v => v.email!.toLowerCase().trim()));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    // Flexible column name matching (case-insensitive, Dutch + English)
    const findCol = (...keys: string[]) => {
      for (const k of Object.keys(row)) {
        if (keys.some(key => k.toLowerCase().includes(key.toLowerCase()))) return String(row[k] ?? "").trim();
      }
      return "";
    };

    const name = findCol("naam", "name", "voornaam");
    const email = findCol("email", "e-mail");
    const phone = findCol("telefoon", "tel", "phone", "mobiel");
    const availabilityRaw = findCol("beschikbaarheid", "availability", "dagdeel");

    if (!name) {
      if (Object.values(row).some(v => String(v ?? "").trim())) {
        errors.push(`Rij ${rowNum}: naam ontbreekt, overgeslagen.`);
      }
      skipped++;
      continue;
    }

    // Skip duplicates
    if (existingNames.has(name.toLowerCase())) {
      skipped++;
      continue;
    }
    if (email && existingEmails.has(email.toLowerCase())) {
      skipped++;
      continue;
    }

    const availability = parseAvailability(availabilityRaw);

    try {
      const [volunteer] = await db.insert(volunteersTable).values({
        name,
        email: email || null,
        phone: phone || null,
      }).returning();

      if (availability.length > 0) {
        await db.insert(volunteerAvailabilityTable).values(
          availability.map(slot => ({ volunteerId: volunteer.id, slot }))
        );
      }

      existingNames.add(name.toLowerCase());
      if (email) existingEmails.add(email.toLowerCase());
      imported++;
    } catch (err: any) {
      errors.push(`Rij ${rowNum} (${name}): ${err.message ?? "onbekende fout"}`);
      skipped++;
    }
  }

  res.json({ imported, skipped, errors });
});

export default router;
