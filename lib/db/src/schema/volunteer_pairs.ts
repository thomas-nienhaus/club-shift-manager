import { pgTable, serial, integer, unique, check } from "drizzle-orm/pg-core";
import { volunteersTable } from "./volunteers";
import { sql } from "drizzle-orm";

export const volunteerPairsTable = pgTable(
  "volunteer_pairs",
  {
    id: serial("id").primaryKey(),
    volunteerId1: integer("volunteer_id_1")
      .notNull()
      .references(() => volunteersTable.id, { onDelete: "cascade" }),
    volunteerId2: integer("volunteer_id_2")
      .notNull()
      .references(() => volunteersTable.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique().on(t.volunteerId1, t.volunteerId2),
    check("no_self_pair", sql`${t.volunteerId1} <> ${t.volunteerId2}`),
  ]
);

export type VolunteerPair = typeof volunteerPairsTable.$inferSelect;
