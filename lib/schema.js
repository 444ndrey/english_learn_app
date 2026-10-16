import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const words = sqliteTable("words", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  word: text("word").notNull().unique(),
  translation: text("translation").notNull().default(""),
  definition: text("definition").notNull().default(""),
  type: text("type").notNull().default(""),
  example: text("example").notNull().default(""),
  forms: text("forms").notNull().default("[]"),
  level: integer("level").notNull().default(1),
  lastCheckedAt: text("last_checked_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});

export const lessons = sqliteTable("lessons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  studyDate: text("study_date").notNull(),
  status: text("status").notNull().default("generated"),
  category: text("category").notNull().default("regular"),
  sourceLessonId: integer("source_lesson_id"),
  wordsJson: text("words_json").notNull().default("[]"),
  exercisesJson: text("exercises_json"),
  resultJson: text("result_json"),
  completedAt: text("completed_at"),
  passedAt: text("passed_at"),
});
