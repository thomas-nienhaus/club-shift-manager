import { Router, type IRouter } from "express";
import { db, shiftsTable, assignmentsTable, volunteersTable, volunteerAvailabilityTable, volunteerGroupMembersTable, availabilitySlotsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

const PLACEHOLDER_NOTE = "Om beurten een elftal";

interface VolunteerUnit {
  ids: number[];
  availability: string[];
}

async function buildVolunteerUnits(allSlotKeys: string[]): Promise<VolunteerUnit[]> {
  const volunteers = await db.select().from(volunteersTable).orderBy(volunteersTable.name);
  const allAvailability = await db.select().from(volunteerAvailabilityTable);
  const allMemberships = await db.select().from(volunteerGroupMembersTable);

  const availMap = new Map<number, string[]>();
  for (const vol of volunteers) availMap.set(vol.id, []);
  for (const a of allAvailability) {
    const slots = availMap.get(a.volunteerId) ?? [];
    slots.push(a.slot);
    availMap.set(a.volunteerId, slots);
  }

  const groupMap = new Map<number, number[]>();
  for (const m of allMemberships) {
    const members = groupMap.get(m.groupId) ?? [];
    members.push(m.volunteerId);
    groupMap.set(m.groupId, members);
  }

  const volunteerGroupId = new Map<number, number>();
  for (const m of allMemberships) volunteerGroupId.set(m.volunteerId, m.groupId);

  const processedIds = new Set<number>();
  const units: VolunteerUnit[] = [];

  for (const vol of volunteers) {
    if (processedIds.has(vol.id)) continue;

    const groupId = volunteerGroupId.get(vol.id);
    if (groupId !== undefined) {
      const memberIds = groupMap.get(groupId) ?? [vol.id];
      memberIds.forEach(id => processedIds.add(id));

      const slotSets = memberIds.map(id => {
        const slots = availMap.get(id) ?? [];
        return slots.length === 0 ? new Set(allSlotKeys) : new Set(slots);
      });

      const intersection = [...slotSets[0]].filter(slot =>
        slotSets.every(s => s.has(slot))
      );

      units.push({ ids: memberIds, availability: intersection });
    } else {
      processedIds.add(vol.id);
      const slots = availMap.get(vol.id) ?? [];
      units.push({
        ids: [vol.id],
        availability: slots.length === 0 ? [...allSlotKeys] : slots,
      });
    }
  }

  return units;
}

router.post("/", async (req, res) => {
  const seasonId: number | null = req.body?.seasonId ?? null;

  const activeSlots = await db
    .select()
    .from(availabilitySlotsTable)
    .where(eq(availabilitySlotsTable.isActive, true))
    .orderBy(availabilitySlotsTable.sortOrder);
  const allSlotKeys = activeSlots.map(s => s.key);

  const allShifts = await db.select().from(shiftsTable).orderBy(shiftsTable.date);

  const eligibleShifts = seasonId
    ? allShifts.filter(s => s.seasonId === seasonId && s.notes !== PLACEHOLDER_NOTE)
    : allShifts.filter(s => s.notes !== PLACEHOLDER_NOTE);

  if (eligibleShifts.length === 0) {
    res.json({ shiftsScheduled: 0, assignmentsMade: 0, message: "Geen diensten gevonden om in te plannen." });
    return;
  }

  const shiftIds = eligibleShifts.map(s => s.id);
  const existingAssignments = await db
    .select({ shiftId: assignmentsTable.shiftId })
    .from(assignmentsTable)
    .where(inArray(assignmentsTable.shiftId, shiftIds));

  const assignedShiftIds = new Set(existingAssignments.map(a => a.shiftId));
  const unassignedShifts = eligibleShifts.filter(s => !assignedShiftIds.has(s.id));

  if (unassignedShifts.length === 0) {
    res.json({ shiftsScheduled: 0, assignmentsMade: 0, message: "Alle diensten zijn al ingedeeld." });
    return;
  }

  const units = await buildVolunteerUnits(allSlotKeys);
  if (units.length === 0) {
    res.json({ shiftsScheduled: 0, assignmentsMade: 0, message: "Geen vrijwilligers gevonden." });
    return;
  }

  const shiftsBySlot = new Map<string, typeof unassignedShifts>();
  for (const shift of unassignedShifts) {
    if (!shiftsBySlot.has(shift.slot)) shiftsBySlot.set(shift.slot, []);
    shiftsBySlot.get(shift.slot)!.push(shift);
  }

  const toInsert: { shiftId: number; volunteerId: number }[] = [];
  const unitShiftCount = new Map<number, number>();
  for (const unit of units) unitShiftCount.set(unit.ids[0], 0);

  for (const [slot, shifts] of shiftsBySlot) {
    const eligible = units.filter(u => u.availability.includes(slot));
    if (eligible.length === 0) continue;

    for (const shift of shifts) {
      eligible.sort((a, b) =>
        (unitShiftCount.get(a.ids[0]) ?? 0) - (unitShiftCount.get(b.ids[0]) ?? 0)
      );

      const unit = eligible[0];
      for (const volId of unit.ids) {
        toInsert.push({ shiftId: shift.id, volunteerId: volId });
      }
      unitShiftCount.set(unit.ids[0], (unitShiftCount.get(unit.ids[0]) ?? 0) + 1);
    }
  }

  let assignmentsMade = 0;
  if (toInsert.length > 0) {
    const inserted = await db
      .insert(assignmentsTable)
      .values(toInsert)
      .onConflictDoNothing()
      .returning();
    assignmentsMade = inserted.length;
  }

  const shiftsScheduled = new Set(toInsert.map(a => a.shiftId)).size;
  const message = `${shiftsScheduled} dienst${shiftsScheduled !== 1 ? "en" : ""} ingedeeld, ${assignmentsMade} koppeling${assignmentsMade !== 1 ? "en" : ""} aangemaakt.`;

  res.json({ shiftsScheduled, assignmentsMade, message });
});

export default router;
