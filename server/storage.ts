import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";
import {
  branches, subjects, syllabusUnits, papers,
  type Branch, type InsertBranch,
  type Subject, type InsertSubject,
  type SyllabusUnit, type InsertSyllabusUnit,
  type Paper, type InsertPaper,
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
};
