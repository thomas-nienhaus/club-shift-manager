import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { volunteersTable } from "./volunteers";

export const volunteerGroupsTable = pgTable("volunteer_groups", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const volunteerGroupMembersTable = pgTable(
  "volunteer_group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => volunteerGroupsTable.id, { onDelete: "cascade" }),
    volunteerId: integer("volunteer_id")
      .notNull()
      .references(() => volunteersTable.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.volunteerId)]
);

export type VolunteerGroup = typeof volunteerGroupsTable.$inferSelect;
export type VolunteerGroupMember = typeof volunteerGroupMembersTable.$inferSelect;
