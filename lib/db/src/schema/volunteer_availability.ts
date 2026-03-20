import { pgTable, serial, integer, text, unique } from "drizzle-orm/pg-core";
import { volunteersTable } from "./volunteers";

export const volunteerAvailabilityTable = pgTable(
  "volunteer_availability",
  {
    id: serial("id").primaryKey(),
    volunteerId: integer("volunteer_id")
      .notNull()
      .references(() => volunteersTable.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
  },
  (t) => [unique().on(t.volunteerId, t.slot)]
);

export type VolunteerAvailability = typeof volunteerAvailabilityTable.$inferSelect;
