import { db } from "./db";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import {
  branches, subjects, syllabusUnits, papers, users, adminSessions, auditLogs, pushTokens, notifications, profiles,
  type Branch, type InsertBranch,
  type Subject, type InsertSubject,
  type SyllabusUnit, type InsertSyllabusUnit,
  type Paper, type InsertPaper,
  type User, type InsertUser,
  type AuditLog, type InsertAuditLog,
  type PushToken, type InsertPushToken,
  type Notification, type InsertNotification,
  type Profile, type InsertProfile,
} from "@shared/schema";

export const storage = {
  async getAllBranches(): Promise<Branch[]> {
    return db.select().from(branches).orderBy(asc(branches.name));
  },

  async getBranch(id: string): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  },

  async createBranch(data: InsertBranch): Promise<Branch> {
    const [branch] = await db.insert(branches).values(data).returning();
    return branch;
  },

  async updateBranch(id: string, data: Partial<InsertBranch>): Promise<Branch | undefined> {
    const [branch] = await db.update(branches).set(data).where(eq(branches.id, id)).returning();
    return branch;
  },

  async deleteBranch(id: string): Promise<void> {
    await db.delete(branches).where(eq(branches.id, id));
  },

  async getAllSubjects(): Promise<Subject[]> {
    return db.select().from(subjects).orderBy(asc(subjects.semester), asc(subjects.name));
  },

  async getSubjectsByBranch(branchId: string): Promise<Subject[]> {
    return db.select().from(subjects).where(eq(subjects.branchId, branchId)).orderBy(asc(subjects.semester), asc(subjects.name));
  },

  async getSubjectsByBranchAndSemester(branchId: string, semester: number): Promise<Subject[]> {
    return db.select().from(subjects)
      .where(and(eq(subjects.branchId, branchId), eq(subjects.semester, semester)))
      .orderBy(asc(subjects.name));
  },

  async getSubject(id: string): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  },

  async createSubject(data: InsertSubject): Promise<Subject> {
    const [subject] = await db.insert(subjects).values(data).returning();
    return subject;
  },

  async updateSubject(id: string, data: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [subject] = await db.update(subjects).set({ ...data, updatedAt: new Date() }).where(eq(subjects.id, id)).returning();
    return subject;
  },

  async deleteSubject(id: string): Promise<void> {
    await db.delete(syllabusUnits).where(eq(syllabusUnits.subjectId, id));
    await db.delete(papers).where(eq(papers.subjectId, id));
    await db.delete(subjects).where(eq(subjects.id, id));
  },

  async getSyllabusUnits(subjectId: string): Promise<SyllabusUnit[]> {
    return db.select().from(syllabusUnits)
      .where(eq(syllabusUnits.subjectId, subjectId))
      .orderBy(asc(syllabusUnits.unitNumber));
  },

  async createSyllabusUnit(data: InsertSyllabusUnit): Promise<SyllabusUnit> {
    const [unit] = await db.insert(syllabusUnits).values(data).returning();
    return unit;
  },

  async updateSyllabusUnit(id: number, data: Partial<InsertSyllabusUnit>): Promise<SyllabusUnit | undefined> {
    const [unit] = await db.update(syllabusUnits).set(data).where(eq(syllabusUnits.id, id)).returning();
    return unit;
  },

  async deleteSyllabusUnit(id: number): Promise<void> {
    await db.delete(syllabusUnits).where(eq(syllabusUnits.id, id));
  },

  async getPapers(subjectId: string): Promise<Paper[]> {
    return db.select().from(papers)
      .where(eq(papers.subjectId, subjectId))
      .orderBy(asc(papers.year));
  },

  async getAllPapers(): Promise<Paper[]> {
    return db.select().from(papers).orderBy(asc(papers.year));
  },

  async createPaper(data: InsertPaper): Promise<Paper> {
    const [paper] = await db.insert(papers).values(data).returning();
    return paper;
  },

  async updatePaper(id: number, data: Partial<InsertPaper>): Promise<Paper | undefined> {
    const [paper] = await db.update(papers).set(data).where(eq(papers.id, id)).returning();
    return paper;
  },

  async deletePaper(id: number): Promise<void> {
    await db.delete(papers).where(eq(papers.id, id));
  },

  async getPaper(id: number): Promise<Paper | undefined> {
    const [paper] = await db.select().from(papers).where(eq(papers.id, id));
    return paper;
  },

  async incrementPaperViews(id: number): Promise<Paper | undefined> {
    const [paper] = await db
      .update(papers)
      .set({ views: sql`${papers.views} + 1` })
      .where(eq(papers.id, id))
      .returning();
    return paper;
  },

  async getMostViewedPapers(limit: number): Promise<Paper[]> {
    return db.select().from(papers).orderBy(desc(papers.views)).limit(limit);
  },

  // ---- USERS / SESSIONS ----
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  },

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  },

  async countUsers(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result[0]?.count || 0);
  },

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await db.insert(adminSessions).values({ userId, tokenHash, expiresAt });
  },

  async getSessionByTokenHash(tokenHash: string) {
    const [session] = await db.select().from(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
    return session;
  },

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
  },

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(adminSessions).where(eq(adminSessions.userId, userId));
  },

  // ---- AUDIT LOGS ----
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  },

  async getAuditLogs(limit: number): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(sql`${auditLogs.createdAt} DESC`).limit(limit);
  },

  // ---- PUSH TOKENS ----
  async upsertPushToken(data: InsertPushToken): Promise<PushToken> {
    const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, data.token));
    if (existing.length > 0) {
      const [updated] = await db
        .update(pushTokens)
        .set({ platform: data.platform, deviceId: data.deviceId, lastSeenAt: new Date() })
        .where(eq(pushTokens.token, data.token))
        .returning();
      return updated;
    }
    const [created] = await db.insert(pushTokens).values(data).returning();
    return created;
  },

  async getAllPushTokens(): Promise<PushToken[]> {
    return db.select().from(pushTokens).orderBy(asc(pushTokens.createdAt));
  },

  async deletePushToken(token: string): Promise<void> {
    await db.delete(pushTokens).where(eq(pushTokens.token, token));
  },

  // ---- NOTIFICATIONS ----
  async createNotification(data: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(data).returning();
    return created;
  },

  async getNotifications(limit: number): Promise<Notification[]> {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit);
  },

  // ---- PROFILES ----
  async upsertProfile(data: InsertProfile): Promise<Profile> {
    const existing = await db.select().from(profiles).where(eq(profiles.deviceId, data.deviceId));
    if (existing.length > 0) {
      const [updated] = await db
        .update(profiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(profiles.deviceId, data.deviceId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(profiles).values(data).returning();
    return created;
  },

  async getProfiles(): Promise<Profile[]> {
    return db.select().from(profiles).orderBy(desc(profiles.createdAt));
  },
};
