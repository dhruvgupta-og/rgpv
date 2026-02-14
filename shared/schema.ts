import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const branches = pgTable("branches", {
  id: varchar("id", { length: 20 }).primaryKey(),
  name: text("name").notNull(),
  shortName: varchar("short_name", { length: 10 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull().default("book"),
  color: varchar("color", { length: 10 }).notNull().default("#0EA5E9"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  branchId: varchar("branch_id", { length: 20 }).notNull(),
  semester: integer("semester").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const syllabusUnits = pgTable("syllabus_units", {
  id: serial("id").primaryKey(),
  subjectId: varchar("subject_id", { length: 100 }).notNull(),
  unitNumber: integer("unit_number").notNull(),
  title: text("title").notNull(),
  topics: jsonb("topics").notNull().$type<string[]>(),
});

export const papers = pgTable("papers", {
  id: serial("id").primaryKey(),
  subjectId: varchar("subject_id", { length: 100 }).notNull(),
  year: varchar("year", { length: 10 }).notNull(),
  month: varchar("month", { length: 20 }).notNull(),
  examType: varchar("exam_type", { length: 20 }).notNull().default("Main"),
  pdfPath: text("pdf_path"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBranchSchema = createInsertSchema(branches).omit({ createdAt: true });
export const insertSubjectSchema = createInsertSchema(subjects).omit({ createdAt: true, updatedAt: true });
export const insertSyllabusUnitSchema = createInsertSchema(syllabusUnits).omit({ id: true });
export const insertPaperSchema = createInsertSchema(papers).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type SyllabusUnit = typeof syllabusUnits.$inferSelect;
export type InsertSyllabusUnit = z.infer<typeof insertSyllabusUnitSchema>;
export type Paper = typeof papers.$inferSelect;
export type InsertPaper = z.infer<typeof insertPaperSchema>;
