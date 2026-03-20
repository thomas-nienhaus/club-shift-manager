import { Router, type IRouter } from "express";
import { db, shiftsTable, assignmentsTable, volunteersTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

import {
  CreateShiftBody,
  UpdateShiftBody,
  GetShiftParams,
  UpdateShiftParams,
  DeleteShiftParams,
  AssignVolunteerBody,
  AssignVolunteerParams,
  UnassignVolunteerParams,
  ListShiftsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Validate that a slot key's day-prefix matches the date's weekday ──────────
const DAY_PREFIXES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function slotMatchesDate(date: string, slot: string): boolean {
  const prefix = slot.split("_")[0].toLowerCase();
  const expectedDay = DAY_PREFIXES[prefix];
  if (expectedDay === undefined) return true; // unknown prefix → don't block
  const actualDay = new Date(date + "T12:00:00").getDay(); // noon avoids DST edge cases
  return expectedDay === actualDay;
}

async function getShiftWithAssignments(shiftId: number) {
  const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, shiftId));
  if (!shift) return null;

  const assignments = await db
    .select({
      id: assignmentsTable.id,
      shiftId: assignmentsTable.shiftId,
      volunteerId: assignmentsTable.volunteerId,
      createdAt: assignmentsTable.createdAt,
      volunteer: {
        id: volunteersTable.id,
        name: volunteersTable.name,
        email: volunteersTable.email,
        phone: volunteersTable.phone,
        createdAt: volunteersTable.createdAt,
      },
    })
    .from(assignmentsTable)
    .innerJoin(volunteersTable, eq(assignmentsTable.volunteerId, volunteersTable.id))
    .where(eq(assignmentsTable.shiftId, shiftId));

  return {
    ...shift,
    createdAt: shift.createdAt.toISOString(),
    assignments: assignments.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      volunteer: {
        ...a.volunteer,
        createdAt: a.volunteer.createdAt.toISOString(),
      },
    })),
  };
}

router.get("/", async (req, res) => {
  const query = ListShiftsQueryParams.parse(req.query);

  let conditions = [];
  if (query.startDate) {
    conditions.push(gte(shiftsTable.date, query.startDate));
  }
  if (query.endDate) {
    conditions.push(lte(shiftsTable.date, query.endDate));
  }
  if (query.seasonId) {
    conditions.push(eq(shiftsTable.seasonId, query.seasonId));
  }

  const shifts = await db
    .select()
    .from(shiftsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(shiftsTable.date, shiftsTable.slot);

  const result = await Promise.all(shifts.map((s) => getShiftWithAssignments(s.id)));
  res.json(result.filter(Boolean));
});

router.post("/", async (req, res) => {
  const body = CreateShiftBody.parse(req.body);
  if (!slotMatchesDate(body.date, body.slot)) {
    res.status(400).json({ error: `Dagdeel "${body.slot}" past niet bij de dag van ${body.date}.` });
    return;
  }
  const [shift] = await db.insert(shiftsTable).values(body).returning();
  const result = await getShiftWithAssignments(shift.id);
  res.status(201).json(result);
});

router.get("/:id", async (req, res) => {
  const { id } = GetShiftParams.parse(req.params);
  const shift = await getShiftWithAssignments(id);
  if (!shift) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }
  res.json(shift);
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateShiftParams.parse(req.params);
  const body = UpdateShiftBody.parse(req.body);
  if (body.date && body.slot && !slotMatchesDate(body.date, body.slot)) {
    res.status(400).json({ error: `Dagdeel "${body.slot}" past niet bij de dag van ${body.date}.` });
    return;
  }
  const [shift] = await db.update(shiftsTable).set(body).where(eq(shiftsTable.id, id)).returning();
  if (!shift) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }
  const result = await getShiftWithAssignments(shift.id);
  res.json(result);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteShiftParams.parse(req.params);
  const [deleted] = await db.delete(shiftsTable).where(eq(shiftsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }
  res.json({ success: true, message: "Shift deleted" });
});

router.post("/:id/assign", async (req, res) => {
  const { id } = AssignVolunteerParams.parse(req.params);
  const { volunteerId } = AssignVolunteerBody.parse(req.body);

  const shift = await getShiftWithAssignments(id);
  if (!shift) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }

  try {
    await db.insert(assignmentsTable).values({ shiftId: id, volunteerId }).returning();
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({ error: "Volunteer already assigned to this shift" });
      return;
    }
    throw err;
  }

  const result = await getShiftWithAssignments(id);
  res.status(201).json(result);
});

router.delete("/:id/unassign/:volunteerId", async (req, res) => {
  const { id, volunteerId } = UnassignVolunteerParams.parse(req.params);

  await db
    .delete(assignmentsTable)
    .where(and(eq(assignmentsTable.shiftId, id), eq(assignmentsTable.volunteerId, volunteerId)));

  const result = await getShiftWithAssignments(id);
  if (!result) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }
  res.json(result);
});

export default router;
