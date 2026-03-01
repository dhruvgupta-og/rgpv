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
  role: varchar("role", { length: 20 }).notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
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
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  action: varchar("action", { length: 50 }).notNull(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  details: jsonb("details"),
  ip: varchar("ip", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pushTokens = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  platform: varchar("platform", { length: 20 }),
  deviceId: varchar("device_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  audience: varchar("audience", { length: 50 }).notNull().default("all"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 100 }).notNull().unique(),
  name: text("name").notNull(),
  branchId: varchar("branch_id", { length: 20 }).notNull(),
  year: varchar("year", { length: 10 }).notNull(),
  collegeName: text("college_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertBranchSchema = createInsertSchema(branches).omit({ createdAt: true });
export const insertSubjectSchema = createInsertSchema(subjects).omit({ createdAt: true, updatedAt: true });
export const insertSyllabusUnitSchema = createInsertSchema(syllabusUnits).omit({ id: true });
export const insertPaperSchema = createInsertSchema(papers).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({ id: true, createdAt: true, lastSeenAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });

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
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
