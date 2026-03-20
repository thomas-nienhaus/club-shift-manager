import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, seasonsTable, shiftsTable, availabilitySlotsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateSeasonBody,
  GetSeasonParams,
  DeleteSeasonParams,
  ImportSeasonScheduleParams,
} from "@workspace/api-zod";
import { format, getDay, parseISO, isValid } from "date-fns";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

type ShiftSlot = "wednesday_evening" | "thursday_evening" | "saturday_morning" | "saturday_afternoon" | "sunday_morning" | "sunday_afternoon";

function dayOfWeekToSlots(dayIndex: number): ShiftSlot[] {
  switch (dayIndex) {
    case 3: return ["wednesday_evening"];
    case 4: return ["thursday_evening"];
    case 6: return ["saturday_morning", "saturday_afternoon"];
    case 0: return ["sunday_morning", "sunday_afternoon"];
    default: return [];
  }
}

function parseExcelDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }

  if (value instanceof Date && isValid(value)) return value;

  if (typeof value === "string") {
    const cleaned = value.trim().replace(/\//g, "-");
    const formats = [
      cleaned,
      cleaned.split("-").reverse().join("-"),
    ];
    for (const fmt of formats) {
      const d = new Date(fmt);
      if (isValid(d) && !isNaN(d.getTime())) return d;
    }
  }

  return null;
}

router.get("/", async (_req, res) => {
  const seasons = await db.select().from(seasonsTable).orderBy(seasonsTable.startDate);
  const result = await Promise.all(
    seasons.map(async (s) => {
      const [{ count: shiftCount }] = await db
        .select({ count: count() })
        .from(shiftsTable)
        .where(eq(shiftsTable.seasonId, s.id));
      return {
        ...s,
        shiftCount: Number(shiftCount),
        createdAt: s.createdAt.toISOString(),
      };
    })
  );
  res.json(result);
});

router.post("/", async (req, res) => {
  const body = CreateSeasonBody.parse(req.body);
  const [season] = await db.insert(seasonsTable).values(body).returning();
  res.status(201).json({ ...season, shiftCount: 0, createdAt: season.createdAt.toISOString() });
});

router.get("/:id", async (req, res) => {
  const { id } = GetSeasonParams.parse(req.params);
  const [season] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id));
  if (!season) { res.status(404).json({ error: "Seizoen niet gevonden" }); return; }
  const [{ count: shiftCount }] = await db
    .select({ count: count() })
    .from(shiftsTable)
    .where(eq(shiftsTable.seasonId, id));
  res.json({ ...season, shiftCount: Number(shiftCount), createdAt: season.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteSeasonParams.parse(req.params);
  const [deleted] = await db.delete(seasonsTable).where(eq(seasonsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Seizoen niet gevonden" }); return; }
  res.json({ success: true, message: "Seizoen verwijderd" });
});

// ── Auto-generate shifts for a season based on active slots ──────────────────
router.post("/:id/generate", async (req, res) => {
  const { id } = GetSeasonParams.parse(req.params);

  const [season] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id));
  if (!season) { res.status(404).json({ error: "Seizoen niet gevonden" }); return; }

  const slots = await db
    .select()
    .from(availabilitySlotsTable)
    .where(eq(availabilitySlotsTable.isActive, true))
    .orderBy(availabilitySlotsTable.sortOrder);

  if (slots.length === 0) {
    res.json({ shiftsCreated: 0, message: "Geen actieve dagdelen gevonden om diensten voor te genereren." });
    return;
  }

  // Map slot key prefix → day-of-week index (0=Sunday, 1=Monday ... 6=Saturday)
  const DAY_PREFIXES: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  // Build: dayIndex → [slotKeys]
  const slotsByDay: Record<number, string[]> = {};
  for (const slot of slots) {
    const prefix = slot.key.split("_")[0].toLowerCase();
    const day = DAY_PREFIXES[prefix];
    if (day !== undefined) {
      (slotsByDay[day] ??= []).push(slot.key);
    }
  }

  const shiftsToInsert: { seasonId: number; date: string; slot: string; capacity: number }[] = [];
  const start = new Date(season.startDate + "T00:00:00");
  const end   = new Date(season.endDate   + "T00:00:00");
  const cur   = new Date(start);

  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    for (const slotKey of slotsByDay[dayOfWeek] ?? []) {
      shiftsToInsert.push({ seasonId: id, date: format(cur, "yyyy-MM-dd"), slot: slotKey, capacity: 99 });
    }
    cur.setDate(cur.getDate() + 1);
  }

  let shiftsCreated = 0;
  if (shiftsToInsert.length > 0) {
    const inserted = await db.insert(shiftsTable).values(shiftsToInsert).onConflictDoNothing().returning();
    shiftsCreated = inserted.length;
  }

  res.json({
    shiftsCreated,
    message: `${shiftsCreated} diensten aangemaakt voor "${season.name}".`,
  });
});

router.post("/:id/import", upload.single("file"), async (req, res) => {
  const { id } = ImportSeasonScheduleParams.parse(req.params);

  const [season] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id));
  if (!season) { res.status(404).json({ error: "Seizoen niet gevonden" }); return; }

  if (!req.file) { res.status(400).json({ error: "Geen bestand geüpload" }); return; }

  const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) {
    res.status(400).json({ error: "Het bestand is leeg of heeft geen geldig formaat" });
    return;
  }

  const datumKey = Object.keys(rows[0]).find(k =>
    k.toLowerCase().includes("datum") || k.toLowerCase().includes("date") || k === "A"
  ) ?? Object.keys(rows[0])[0];

  const dagdeelKey = Object.keys(rows[0]).find(k =>
    k.toLowerCase().includes("dagdeel") || k.toLowerCase().includes("slot") || k.toLowerCase().includes("tijdslot")
  );

  const SLOT_NAME_MAP: Record<string, ShiftSlot> = {
    "woensdagavond": "wednesday_evening",
    "donderdagavond": "thursday_evening",
    "zaterdagochtend": "saturday_morning",
    "zaterdagmiddag": "saturday_afternoon",
    "zondagochtend": "sunday_morning",
    "zondagmiddag": "sunday_afternoon",
    "wednesday_evening": "wednesday_evening",
    "thursday_evening": "thursday_evening",
    "saturday_morning": "saturday_morning",
    "saturday_afternoon": "saturday_afternoon",
    "sunday_morning": "sunday_morning",
    "sunday_afternoon": "sunday_afternoon",
  };

  const PLACEHOLDER_NOTE = "Om beurten een elftal";

  const thuiswedstrijdKey = Object.keys(rows[0]).find(k => {
    const lower = k.toLowerCase().replace(/\s+/g, "");
    return lower.includes("thuiswedstrijd") || lower.includes("elftalthuis") || lower.includes("1eelftal") || lower.includes("eersteelftal");
  });

  function isThuiswedstrijd(row: Record<string, unknown>): boolean {
    if (!thuiswedstrijdKey) return false;
    const val = String(row[thuiswedstrijdKey] ?? "").trim().toLowerCase();
    return val === "ja" || val === "j" || val === "yes" || val === "y" || val === "1" || val === "x";
  }

  let shiftsCreated = 0;
  let skipped = 0;
  let datesProcessed = 0;

  const shiftsToInsert: { seasonId: number; date: string; slot: ShiftSlot; capacity: number; notes?: string }[] = [];

  for (const row of rows) {
    const rawDate = row[datumKey];
    const parsedDate = parseExcelDate(rawDate);
    if (!parsedDate) { skipped++; continue; }

    const dateStr = format(parsedDate, "yyyy-MM-dd");
    datesProcessed++;

    if (dagdeelKey && row[dagdeelKey]) {
      const slotRaw = String(row[dagdeelKey]).trim().toLowerCase().replace(/\s+/g, "");
      const slot = SLOT_NAME_MAP[slotRaw];
      if (slot) {
        shiftsToInsert.push({ seasonId: id, date: dateStr, slot, capacity: 99 });
      } else {
        skipped++;
      }
    } else {
      const dayIdx = getDay(parsedDate);
      const slots = dayOfWeekToSlots(dayIdx);
      if (slots.length === 0) { skipped++; continue; }
      for (const slot of slots) {
        if (slot === "sunday_afternoon" && !isThuiswedstrijd(row)) {
          shiftsToInsert.push({ seasonId: id, date: dateStr, slot, capacity: 99, notes: PLACEHOLDER_NOTE });
        } else {
          shiftsToInsert.push({ seasonId: id, date: dateStr, slot, capacity: 99 });
        }
      }
    }
  }

  if (shiftsToInsert.length > 0) {
    const inserted = await db.insert(shiftsTable).values(shiftsToInsert).onConflictDoNothing().returning();
    shiftsCreated = inserted.length;
  }

  res.json({
    shiftsCreated,
    datesProcessed,
    skipped,
    message: `${datesProcessed} datums verwerkt, ${shiftsCreated} diensten aangemaakt${skipped > 0 ? `, ${skipped} overgeslagen` : ""}.`,
  });
});

export default router;
