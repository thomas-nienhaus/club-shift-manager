import { Router, type IRouter } from "express";
import { db, availabilitySlotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const slots = await db
    .select()
    .from(availabilitySlotsTable)
    .orderBy(availabilitySlotsTable.sortOrder, availabilitySlotsTable.id);
  res.json(slots);
});

router.post("/", async (req, res) => {
  const { key, label, sortOrder, isActive, startTime, endTime } = req.body ?? {};

  if (!key || typeof key !== "string" || !/^[a-z0-9_]+$/.test(key)) {
    res.status(400).json({ error: "Sleutel is verplicht (alleen kleine letters, cijfers, underscores)." });
    return;
  }
  if (!label || typeof label !== "string" || label.trim().length === 0) {
    res.status(400).json({ error: "Label is verplicht." });
    return;
  }

  const existing = await db
    .select()
    .from(availabilitySlotsTable)
    .where(eq(availabilitySlotsTable.key, key));

  if (existing.length > 0) {
    res.status(409).json({ error: "Een dagdeel met deze sleutel bestaat al." });
    return;
  }

  const allSlots = await db
    .select({ sortOrder: availabilitySlotsTable.sortOrder })
    .from(availabilitySlotsTable)
    .orderBy(availabilitySlotsTable.sortOrder);

  const nextOrder = typeof sortOrder === "number"
    ? sortOrder
    : allSlots.length > 0
      ? (allSlots[allSlots.length - 1].sortOrder ?? 0) + 1
      : 1;

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  const parsedStart = typeof startTime === "string" && timeRegex.test(startTime) ? startTime : null;
  const parsedEnd = typeof endTime === "string" && timeRegex.test(endTime) ? endTime : null;

  const [slot] = await db
    .insert(availabilitySlotsTable)
    .values({ key, label: label.trim(), sortOrder: nextOrder, isActive: isActive !== false, startTime: parsedStart, endTime: parsedEnd })
    .returning();

  res.status(201).json(slot);
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Ongeldig id" }); return; }

  const { label, sortOrder, isActive, startTime, endTime } = req.body ?? {};
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  const updates: Record<string, unknown> = {};
  if (typeof label === "string" && label.trim().length > 0) updates.label = label.trim();
  if (typeof sortOrder === "number") updates.sortOrder = sortOrder;
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (startTime === null || (typeof startTime === "string" && timeRegex.test(startTime))) updates.startTime = startTime || null;
  if (endTime === null || (typeof endTime === "string" && timeRegex.test(endTime))) updates.endTime = endTime || null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Geen velden om bij te werken." });
    return;
  }

  const [updated] = await db
    .update(availabilitySlotsTable)
    .set(updates)
    .where(eq(availabilitySlotsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Niet gevonden" }); return; }
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Ongeldig id" }); return; }

  await db.delete(availabilitySlotsTable).where(eq(availabilitySlotsTable.id, id));
  res.json({ success: true });
});

export default router;
