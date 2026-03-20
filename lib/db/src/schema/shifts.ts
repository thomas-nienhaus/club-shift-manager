import { pgTable, serial, text, integer, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { seasonsTable } from "./seasons";

export const shiftsTable = pgTable("shifts", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  slot: text("slot").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  capacity: integer("capacity").notNull().default(99),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("shifts_date_slot_no_season_idx").on(t.date, t.slot).where(sql`${t.seasonId} is null`),
  uniqueIndex("shifts_season_date_slot_idx").on(t.seasonId, t.date, t.slot).where(sql`${t.seasonId} is not null`),
]);

export const insertShiftSchema = createInsertSchema(shiftsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shiftsTable.$inferSelect;
