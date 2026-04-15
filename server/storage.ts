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
    const snap = await db.collection("subjects").get();
    return snap.docs.map((d) => d.data()).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  },

  async getSubjectsByBranch(branchId: string) {
    const snap = await db.collection("subjects").where("branchId", "==", branchId).get();
    return snap.docs.map((d) => d.data()).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  },

  async getSubjectsByBranchAndSemester(branchId: string, semester: number) {
    const snap = await db
      .collection("subjects")
      .where("branchId", "==", branchId)
      .where("semester", "==", semester)
      .get();
    return snap.docs.map((d) => d.data()).sort((a, b) => String(a.code).localeCompare(String(b.code)));
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
    const videos = await db.collection("videos").where("subjectId", "==", id).get();
    const batch = db.batch();
    units.docs.forEach((d) => batch.delete(d.ref));
    papers.docs.forEach((d) => batch.delete(d.ref));
    videos.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  // ---- SYLLABUS ----
  async getSyllabusUnits(subjectId: string) {
    const snap = await db.collection("syllabusUnits").where("subjectId", "==", subjectId).get();
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => Number(a.unitNumber || 0) - Number(b.unitNumber || 0));
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

  async replaceSyllabusUnits(subjectId: string, units: any[]) {
    const existing = await db.collection("syllabusUnits").where("subjectId", "==", subjectId).get();
    const batch = db.batch();

    existing.docs.forEach((doc) => batch.delete(doc.ref));

    units.forEach((unit, index) => {
      const id = makeId() + index;
      const payload = {
        id,
        subjectId,
        unitNumber: unit.unitNumber,
        title: unit.title,
        topics: Array.isArray(unit.topics) ? unit.topics : [],
      };

      batch.set(db.collection("syllabusUnits").doc(String(id)), payload);
    });

    await batch.commit();
    return this.getSyllabusUnits(subjectId);
  },

  // ---- PAPERS ----
  async getPapers(subjectId: string) {
    const snap = await db.collection("papers").where("subjectId", "==", subjectId).get();
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => String(a.year || "").localeCompare(String(b.year || "")));
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

  async reassignPapers(fromSubjectId: string, toSubjectId: string) {
    const snap = await db.collection("papers").where("subjectId", "==", fromSubjectId).get();
    if (snap.empty) return 0;
    const docs = snap.docs;
    const batches = [];
    for (let i = 0; i < docs.length; i += 450) {
      const batch = db.batch();
      docs.slice(i, i + 450).forEach((d) => batch.update(d.ref, { subjectId: toSubjectId }));
      batches.push(batch.commit());
    }
    await Promise.all(batches);
    return docs.length;
  },

  // ---- VIDEOS ----
  async getVideos(subjectId: string) {
    const snap = await db.collection("videos").where("subjectId", "==", subjectId).get();
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  },

  async createVideo(data: any) {
    const id = makeId();
    const payload = { ...data, id, createdAt: now() };
    await db.collection("videos").doc(String(id)).set(payload);
    return payload;
  },

  async updateVideo(id: number, data: any) {
    const ref = db.collection("videos").doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    await ref.set({ ...data, id }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  },

  async deleteVideo(id: number) {
    await db.collection("videos").doc(String(id)).delete();
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

  async updateUser(id: string, data: any) {
    const ref = db.collection("users").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    await ref.set({ ...data, id }, { merge: true });
    const updated = await ref.get();
    return updated.data();
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

  async deleteNotification(id: string) {
    await db.collection("notifications").doc(id).delete();
  },

  // ---- PYQ ANALYTICS ----
  async getAnalytics(subjectId: string) {
    const doc = await db.collection("pyqAnalytics").doc(subjectId).get();
    return toDoc(doc);
  },

  async upsertAnalytics(subjectId: string, data: any) {
    const ref = db.collection("pyqAnalytics").doc(subjectId);
    const snap = await ref.get();
    const payload = {
      ...data,
      subjectId,
      updatedAt: now(),
      createdAt: snap.exists ? snap.data()?.createdAt : now(),
    };
    await ref.set(payload, { merge: true });
    const updated = await ref.get();
    return updated.data();
  },

  // ---- PROFILES ----
  async upsertProfile(data: any) {
    const firebaseUid = String(data.firebaseUid || "").trim();
    const deviceId = String(data.deviceId || "").trim();

    let ref: FirebaseFirestore.DocumentReference | null = null;
    let createdAt = now();

    if (firebaseUid) {
      ref = db.collection("profiles").doc(firebaseUid);
      const existing = await ref.get();
      if (existing.exists) {
        createdAt = String(existing.data()?.createdAt || createdAt);
      }
    } else if (deviceId) {
      const snap = await db.collection("profiles").where("deviceId", "==", deviceId).limit(1).get();
      if (!snap.empty) {
        ref = snap.docs[0].ref;
        createdAt = String(snap.docs[0].data()?.createdAt || createdAt);
      }
    }

    if (!ref) {
      const id = firebaseUid || makeId().toString();
      ref = db.collection("profiles").doc(id);
    }

    const payload = {
      ...data,
      id: ref.id,
      deviceId: deviceId || ref.id,
      createdAt,
      updatedAt: now(),
    };
    await ref.set(payload, { merge: true });
    const updated = await ref.get();
    return updated.data();
  },

  async getProfiles() {
    const snap = await db.collection("profiles").get();
    const profiles = snap.docs.map((d) => d.data());
    const deduped = new Map<string, any>();

    for (const profile of profiles) {
      const key =
        String(profile.firebaseUid || "").trim() ||
        String(profile.deviceId || "").trim() ||
        `${String(profile.name || "").trim().toLowerCase()}|${String(profile.branchId || "").trim()}|${String(profile.year || "").trim()}`;

      const current = deduped.get(key);
      if (!current) {
        deduped.set(key, profile);
        continue;
      }

      const currentHasEmail = !!String(current.email || "").trim();
      const nextHasEmail = !!String(profile.email || "").trim();
      const currentTime = String(current.updatedAt || current.createdAt || "");
      const nextTime = String(profile.updatedAt || profile.createdAt || "");

      if ((!currentHasEmail && nextHasEmail) || nextTime > currentTime) {
        deduped.set(key, profile);
      }
    }

    return Array.from(deduped.values()).sort((a, b) =>
      String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")),
    );
  },

  async getProfileByDeviceId(deviceId: string) {
    const snap = await db.collection("profiles").where("deviceId", "==", deviceId).limit(1).get();
    return snap.docs[0]?.data();
  },

  async deleteProfile(data: { deviceId?: string; firebaseUid?: string }) {
    const deviceId = String(data.deviceId || "").trim();
    const firebaseUid = String(data.firebaseUid || "").trim();
    const refs = new Map<string, FirebaseFirestore.DocumentReference>();

    if (firebaseUid) {
      const ref = db.collection("profiles").doc(firebaseUid);
      const snap = await ref.get();
      if (snap.exists) {
        refs.set(ref.id, ref);
      }

      const byFirebaseUid = await db.collection("profiles").where("firebaseUid", "==", firebaseUid).get();
      byFirebaseUid.docs.forEach((doc) => refs.set(doc.id, doc.ref));
    }

    if (deviceId) {
      const snap = await db.collection("profiles").where("deviceId", "==", deviceId).get();
      snap.docs.forEach((doc) => refs.set(doc.id, doc.ref));
    }

    if (!refs.size) {
      return 0;
    }

    const batch = db.batch();
    refs.forEach((ref) => batch.delete(ref));
    await batch.commit();
    return refs.size;
  },

  // ---- USER ANALYTICS ----
  async trackSessionStart(data: any) {
    const id = makeId().toString();
    const payload = { ...data, id, startedAt: now() };
    await db.collection("userSessions").doc(id).set(payload);
    return payload;
  },

  async trackSessionEnd(sessionId: string, totalDurationMs: number) {
    const snap = await db.collection("userSessions").where("sessionId", "==", sessionId).limit(1).get();
    if (snap.empty) return null;
    const ref = snap.docs[0].ref;
    const payload = { endedAt: now(), totalDurationMs };
    await ref.set(payload, { merge: true });
    const updated = await ref.get();
    return updated.data();
  },

  async trackPageView(data: any) {
    const id = makeId().toString();
    const payload = { ...data, id, viewedAt: now() };
    await db.collection("pageViews").doc(id).set(payload);
    return payload;
  },

  async trackInteraction(data: any) {
    const id = makeId().toString();
    const payload = { ...data, id, interactedAt: now() };
    await db.collection("userInteractions").doc(id).set(payload);
    return payload;
  },

  async trackContentView(data: any) {
    const id = makeId().toString();
    const payload = { ...data, id, viewedAt: now() };
    await db.collection("contentViews").doc(id).set(payload);
    return payload;
  },

  async getAnalyticsOverview() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active users last 24 hours
    const sessionsLast24 = await db
      .collection("userSessions")
      .where("startedAt", ">=", oneDayAgo.toISOString())
      .get();

    // Active users last 7 days
    const sessionsLast7 = await db
      .collection("userSessions")
      .where("startedAt", ">=", sevenDaysAgo.toISOString())
      .get();

    // Total sessions
    const allSessions = await db.collection("userSessions").get();

    // Page views
    const pageViewsSnap = await db.collection("pageViews").get();

    // Top pages
    const pageViewsData = pageViewsSnap.docs.map((d) => d.data());
    const pageViewsMap = new Map<string, number>();
    pageViewsData.forEach((pv) => {
      const screen = pv.screen || "unknown";
      pageViewsMap.set(screen, (pageViewsMap.get(screen) || 0) + 1);
    });
    const topPages = Array.from(pageViewsMap.entries())
      .map(([screen, count]) => ({ screen, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average session duration
    const sessionDurations = allSessions.docs.map((d) => d.data().totalDurationMs || 0).filter((d) => d > 0);
    const avgSessionDuration = sessionDurations.length > 0 ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length) : 0;

    // Content views
    const contentViewsSnap = await db.collection("contentViews").get();
    const contentViewsData = contentViewsSnap.docs.map((d) => d.data());
    const contentViewsMap = new Map<string, number>();
    contentViewsData.forEach((cv) => {
      const contentType = cv.contentType || "unknown";
      contentViewsMap.set(contentType, (contentViewsMap.get(contentType) || 0) + 1);
    });

    // Interactions
    const interactionsSnap = await db.collection("userInteractions").get();
    const interactionsData = interactionsSnap.docs.map((d) => d.data());
    const interactionsMap = new Map<string, number>();
    interactionsData.forEach((i) => {
      const type = i.interactionType || "unknown";
      interactionsMap.set(type, (interactionsMap.get(type) || 0) + 1);
    });

    return {
      activeUsers24h: new Set(sessionsLast24.docs.map((d) => d.data().deviceId)).size,
      activeUsers7d: new Set(sessionsLast7.docs.map((d) => d.data().deviceId)).size,
      totalSessions: allSessions.size,
      totalPageViews: pageViewsSnap.size,
      totalContentViews: contentViewsSnap.size,
      totalInteractions: interactionsSnap.size,
      topPages,
      avgSessionDurationMs: avgSessionDuration,
      contentViewsByType: Object.fromEntries(contentViewsMap),
      interactionsByType: Object.fromEntries(interactionsMap),
    };
  },

  async getUserAnalytics(deviceId: string) {
    const sessionsSnap = await db.collection("userSessions").where("deviceId", "==", deviceId).get();
    const pageViewsSnap = await db.collection("pageViews").where("deviceId", "==", deviceId).get();
    const contentViewsSnap = await db.collection("contentViews").where("deviceId", "==", deviceId).get();
    const interactionsSnap = await db.collection("userInteractions").where("deviceId", "==", deviceId).get();

    const sessions = sessionsSnap.docs.map((d) => d.data());
    const pageViews = pageViewsSnap.docs.map((d) => d.data());
    const contentViews = contentViewsSnap.docs.map((d) => d.data());
    const interactions = interactionsSnap.docs.map((d) => d.data());

    // Total time spent
    const totalTimeMs = sessions.reduce((sum, s) => sum + (s.totalDurationMs || 0), 0);

    // Page views by screen
    const pageViewsByScreen = new Map<string, number>();
    pageViews.forEach((pv) => {
      const screen = pv.screen || "unknown";
      pageViewsByScreen.set(screen, (pageViewsByScreen.get(screen) || 0) + 1);
    });

    // Content views
    const contentViewsByType = new Map<string, number>();
    contentViews.forEach((cv) => {
      const type = cv.contentType || "unknown";
      contentViewsByType.set(type, (contentViewsByType.get(type) || 0) + 1);
    });

    // Interactions
    const interactionsByType = new Map<string, number>();
    interactions.forEach((i) => {
      const type = i.interactionType || "unknown";
      interactionsByType.set(type, (interactionsByType.get(type) || 0) + 1);
    });

    return {
      deviceId,
      totalSessions: sessions.length,
      totalTimeSpentMs: totalTimeMs,
      avgSessionDurationMs: sessions.length > 0 ? Math.round(totalTimeMs / sessions.length) : 0,
      totalPageViews: pageViews.length,
      totalContentViews: contentViews.length,
      totalInteractions: interactions.length,
      pageViewsByScreen: Object.fromEntries(pageViewsByScreen),
      contentViewsByType: Object.fromEntries(contentViewsByType),
      interactionsByType: Object.fromEntries(interactionsByType),
      sessions,
      recentPageViews: pageViews.slice(-20).reverse(),
      recentContentViews: contentViews.slice(-20).reverse(),
    };
  },

  async getAllUserAnalytics(limit: number = 100) {
    const sessionsSnap = await db.collection("userSessions").limit(limit * 10).get();
    const uniqueDevices = new Set<string>();
    sessionsSnap.docs.forEach((d) => uniqueDevices.add(d.data().deviceId));

    const users = await Promise.all(
      Array.from(uniqueDevices).map((deviceId) => this.getUserAnalytics(deviceId)),
    );

    return users.slice(0, limit).sort((a, b) => b.totalTimeSpentMs - a.totalTimeSpentMs);
  },

  async getScreenTimeAnalytics() {
    const sessionsSnap = await db.collection("userSessions").get();
    const pageViewsSnap = await db.collection("pageViews").get();

    const sessions = sessionsSnap.docs.map((d) => d.data());
    const pageViews = pageViewsSnap.docs.map((d) => d.data());

    // Screen time distribution by screen
    const screenTimeMap = new Map<string, number>();
    pageViews.forEach((pv) => {
      const screen = pv.screen || "unknown";
      const duration = pv.durationMs || 0;
      screenTimeMap.set(screen, (screenTimeMap.get(screen) || 0) + duration);
    });

    // Total time spent
    const totalTime = sessions.reduce((sum, s) => sum + (s.totalDurationMs || 0), 0);

    // Calculate percentages
    const screenTimeByScreen: Record<string, any> = {};
    screenTimeMap.forEach((duration, screen) => {
      screenTimeByScreen[screen] = {
        timeMs: duration,
        timeMinutes: Math.round(duration / 60000),
        percentage: totalTime > 0 ? Math.round((duration / totalTime) * 100) : 0,
      };
    });

    return {
      totalTimeMs: totalTime,
      totalTimeMinutes: Math.round(totalTime / 60000),
      totalTimeHours: Math.round(totalTime / 3600000),
      screenTimeByScreen: Object.fromEntries(
        Object.entries(screenTimeByScreen).sort((a, b) => (b[1] as any).timeMs - (a[1] as any).timeMs),
      ),
      uniqueDevicesCount: new Set(sessions.map((s) => s.deviceId)).size,
    };
  },

  // ---- EVENTS ----
  async getAllEvents() {
    const snap = await db.collection("events").orderBy("date", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getEvent(id: string) {
    const doc = await db.collection("events").doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() };
  },

  async createEvent(data: any) {
    const ref = db.collection("events").doc();
    const payload = {
      ...data,
      id: ref.id,
      registrationCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    await ref.set(payload);
    return payload;
  },

  async updateEvent(id: string, data: any) {
    const ref = db.collection("events").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    const updated = { ...data, id, updatedAt: now() };
    await ref.set(updated, { merge: true });
    return { id, ...snap.data(), ...updated };
  },

  async deleteEvent(id: string) {
    // delete all registrations too
    const regs = await db.collection("eventRegistrations").where("eventId", "==", id).get();
    const batch = db.batch();
    regs.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(db.collection("events").doc(id));
    await batch.commit();
  },

  // ---- EVENT REGISTRATIONS ----
  async getEventRegistrations(eventId: string) {
    const snap = await db.collection("eventRegistrations").where("eventId", "==", eventId).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  },

  async createEventRegistration(eventId: string, data: any) {
    const ref = db.collection("eventRegistrations").doc();
    const payload = { ...data, id: ref.id, eventId, createdAt: now() };
    await ref.set(payload);
    // increment count
    await db.collection("events").doc(eventId).set(
      { registrationCount: FieldValue.increment(1) },
      { merge: true }
    );
    return payload;
  },

  async deleteEventRegistration(id: string) {
    const doc = await db.collection("eventRegistrations").doc(id).get();
    if (!doc.exists) return;
    const eventId = doc.data()?.eventId;
    await db.collection("eventRegistrations").doc(id).delete();
    if (eventId) {
      await db.collection("events").doc(eventId).set(
        { registrationCount: FieldValue.increment(-1) },
        { merge: true }
      );
    }
  },

  async checkEventRegistration(eventId: string, identifier: string) {
    // identifier is usually phone or email
    const snap = await db.collection("eventRegistrations")
      .where("eventId", "==", eventId)
      .where("identifier", "==", identifier)
      .limit(1)
      .get();
    return !snap.empty;
  },
};
