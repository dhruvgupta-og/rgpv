import { getFirestore, FieldValue } from "./firebase";

const db = getFirestore();

function toDoc<T extends Record<string, any>>(doc: FirebaseFirestore.DocumentSnapshot): T | undefined {
  if (!doc.exists) return undefined;
  return doc.data() as T;
}

function now() {
  return new Date().toISOString();
}

function makeId() {
  return Date.now();
}

export const storage = {
  // ---- BRANCHES ----
  async getAllBranches() {
    const snap = await db.collection("branches").orderBy("name").get();
    return snap.docs.map((d) => d.data());
  },

  async getBranch(id: string) {
    const doc = await db.collection("branches").doc(id).get();
    return toDoc(doc);
  },

  async createBranch(data: any) {
    const payload = { ...data, id: data.id, createdAt: now() };
    await db.collection("branches").doc(data.id).set(payload);
    return payload;
  },

  async updateBranch(id: string, data: any) {
    const ref = db.collection("branches").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    await ref.set({ ...data, id }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  },

  async deleteBranch(id: string) {
    await db.collection("branches").doc(id).delete();
  },

  // ---- SUBJECTS ----
  async getAllSubjects() {
    const snap = await db.collection("subjects").orderBy("semester").orderBy("name").get();
    return snap.docs.map((d) => d.data());
  },

  async getSubjectsByBranch(branchId: string) {
    const snap = await db.collection("subjects").where("branchId", "==", branchId).orderBy("semester").orderBy("name").get();
    return snap.docs.map((d) => d.data());
  },

  async getSubjectsByBranchAndSemester(branchId: string, semester: number) {
    const snap = await db
      .collection("subjects")
      .where("branchId", "==", branchId)
      .where("semester", "==", semester)
      .orderBy("name")
      .get();
    return snap.docs.map((d) => d.data());
  },

  async getSubject(id: string) {
    const doc = await db.collection("subjects").doc(id).get();
    return toDoc(doc);
  },

  async createSubject(data: any) {
    const payload = { ...data, id: data.id, createdAt: now(), updatedAt: now() };
    await db.collection("subjects").doc(data.id).set(payload);
    return payload;
  },

  async updateSubject(id: string, data: any) {
    const ref = db.collection("subjects").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    await ref.set({ ...data, id, updatedAt: now() }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  },

  async deleteSubject(id: string) {
    await db.collection("subjects").doc(id).delete();
    const units = await db.collection("syllabusUnits").where("subjectId", "==", id).get();
    const papers = await db.collection("papers").where("subjectId", "==", id).get();
    const batch = db.batch();
    units.docs.forEach((d) => batch.delete(d.ref));
    papers.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  // ---- SYLLABUS ----
  async getSyllabusUnits(subjectId: string) {
    const snap = await db.collection("syllabusUnits").where("subjectId", "==", subjectId).orderBy("unitNumber").get();
    return snap.docs.map((d) => d.data());
  },

  async createSyllabusUnit(data: any) {
    const id = makeId();
    const payload = { ...data, id };
    await db.collection("syllabusUnits").doc(String(id)).set(payload);
    return payload;
  },

  async updateSyllabusUnit(id: number, data: any) {
    const ref = db.collection("syllabusUnits").doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    await ref.set({ ...data, id }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  },

  async deleteSyllabusUnit(id: number) {
    await db.collection("syllabusUnits").doc(String(id)).delete();
  },

  // ---- PAPERS ----
  async getPapers(subjectId: string) {
    const snap = await db.collection("papers").where("subjectId", "==", subjectId).orderBy("year").get();
    return snap.docs.map((d) => d.data());
  },

  async getAllPapers() {
    const snap = await db.collection("papers").orderBy("year").get();
    return snap.docs.map((d) => d.data());
  },

  async createPaper(data: any) {
    const id = makeId();
    const payload = { ...data, id, views: 0, createdAt: now() };
    await db.collection("papers").doc(String(id)).set(payload);
    return payload;
  },

  async updatePaper(id: number, data: any) {
    const ref = db.collection("papers").doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    await ref.set({ ...data, id }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  },

  async deletePaper(id: number) {
    await db.collection("papers").doc(String(id)).delete();
  },

  async getPaper(id: number) {
    const doc = await db.collection("papers").doc(String(id)).get();
    return toDoc(doc);
  },

  async incrementPaperViews(id: number) {
    const ref = db.collection("papers").doc(String(id));
    await ref.set({ views: FieldValue.increment(1) }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  },

  async getMostViewedPapers(limit: number) {
    const snap = await db.collection("papers").orderBy("views", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data());
  },

  // ---- USERS / SESSIONS ----
  async getUserByUsername(username: string) {
    const snap = await db.collection("users").where("username", "==", username).limit(1).get();
    return snap.docs[0]?.data();
  },

  async getUserById(id: string) {
    const doc = await db.collection("users").doc(id).get();
    return toDoc(doc);
  },

  async createUser(data: any) {
    const id = data.id || makeId().toString();
    const payload = { ...data, id, createdAt: now() };
    await db.collection("users").doc(id).set(payload);
    return payload;
  },

  async updateUserLastLogin(id: string) {
    await db.collection("users").doc(id).set({ lastLoginAt: now() }, { merge: true });
  },

  async countUsers() {
    const snap = await db.collection("users").get();
    return snap.size;
  },

  async createSession(userId: string, tokenHash: string, expiresAt: Date) {
    const id = makeId().toString();
    await db.collection("adminSessions").doc(id).set({ userId, tokenHash, expiresAt: expiresAt.toISOString(), createdAt: now() });
  },

  async getSessionByTokenHash(tokenHash: string) {
    const snap = await db.collection("adminSessions").where("tokenHash", "==", tokenHash).limit(1).get();
    return snap.docs[0]?.data();
  },

  async deleteSessionByTokenHash(tokenHash: string) {
    const snap = await db.collection("adminSessions").where("tokenHash", "==", tokenHash).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  async deleteUserSessions(userId: string) {
    const snap = await db.collection("adminSessions").where("userId", "==", userId).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  // ---- AUDIT LOGS ----
  async createAuditLog(data: any) {
    const id = makeId().toString();
    const payload = { ...data, id, createdAt: now() };
    await db.collection("auditLogs").doc(id).set(payload);
    return payload;
  },

  async getAuditLogs(limit: number) {
    const snap = await db.collection("auditLogs").orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data());
  },

  // ---- PUSH TOKENS ----
  async upsertPushToken(data: any) {
    const snap = await db.collection("pushTokens").where("token", "==", data.token).limit(1).get();
    if (!snap.empty) {
      const ref = snap.docs[0].ref;
      await ref.set({ ...data, lastSeenAt: now() }, { merge: true });
      const updated = await ref.get();
      return updated.data();
    }
    const id = makeId().toString();
    const payload = { ...data, id, createdAt: now(), lastSeenAt: now() };
    await db.collection("pushTokens").doc(id).set(payload);
    return payload;
  },

  async getAllPushTokens() {
    const snap = await db.collection("pushTokens").get();
    return snap.docs.map((d) => d.data());
  },

  async deletePushToken(token: string) {
    const snap = await db.collection("pushTokens").where("token", "==", token).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  // ---- NOTIFICATIONS ----
  async createNotification(data: any) {
    const id = makeId().toString();
    const payload = { ...data, id, createdAt: now() };
    await db.collection("notifications").doc(id).set(payload);
    return payload;
  },

  async getNotifications(limit: number) {
    const snap = await db.collection("notifications").orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data());
  },

  // ---- PROFILES ----
  async upsertProfile(data: any) {
    const snap = await db.collection("profiles").where("deviceId", "==", data.deviceId).limit(1).get();
    if (!snap.empty) {
      const ref = snap.docs[0].ref;
      await ref.set({ ...data, updatedAt: now() }, { merge: true });
      const updated = await ref.get();
      return updated.data();
    }
    const id = makeId().toString();
    const payload = { ...data, id, createdAt: now(), updatedAt: now() };
    await db.collection("profiles").doc(id).set(payload);
    return payload;
  },

  async getProfiles() {
    const snap = await db.collection("profiles").orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => d.data());
  },
};
