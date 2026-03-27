import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settingsTable = sqliteTable("settings", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
});

export type Setting = typeof settingsTable.$inferSelect;
