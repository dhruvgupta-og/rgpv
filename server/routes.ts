import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { getAdminSession, createAdminSession, clearAdminSession, ensureBootstrapAdmin } from "./auth";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

export async function registerRoutes(app: Express): Promise<Server> {
  await ensureBootstrapAdmin();

  const requireAdmin = (req: Request, res: Response, next: () => void) => {
    getAdminSession(req)
      .then((session) => {
        if (!session) return res.status(401).json({ error: "Unauthorized" });
        (req as any).adminUser = session.user;
        next();
      })
      .catch(() => res.status(401).json({ error: "Unauthorized" }));
  };

  // ---- ADMIN AUTH ----
  app.get("/api/admin/session", (req: Request, res: Response) => {
    getAdminSession(req)
      .then((session) => {
        if (!session) return res.json({ authenticated: false });
        res.json({ authenticated: true, username: session.user.username, role: session.user.role });
      })
      .catch(() => res.json({ authenticated: false }));
  });

  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    createAdminSession(res, String(username || ""), String(password || ""))
      .then(async (user) => {
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        await storage.createAuditLog({
          userId: user.id,
          action: "login",
          entity: "admin",
          entityId: user.username,
          ip: req.ip,
        });
        res.json({ success: true });
      })
      .catch(() => res.status(500).json({ error: "Login failed" }));
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    getAdminSession(req)
      .then(async (session) => {
        await clearAdminSession(req, res);
        if (session?.user) {
          await storage.createAuditLog({
            userId: session.user.id,
            action: "logout",
            entity: "admin",
            entityId: session.user.username,
            ip: req.ip,
          });
        }
        res.json({ success: true });
      })
      .catch(() => res.json({ success: true }));
  });

  app.get("/api/admin/audit", requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit || 100);
      const logs = await storage.getAuditLogs(Math.min(limit, 500));
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- PUSH TOKENS ----
  app.post("/api/push/register", async (req: Request, res: Response) => {
    try {
      const { token, platform, deviceId } = req.body || {};
      if (!token) return res.status(400).json({ error: "Token required" });
      const saved = await storage.upsertPushToken({ token, platform, deviceId });
      res.json({ success: true, id: saved.id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit || 50);
      const data = await storage.getNotifications(Math.min(limit, 200));
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/notify", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { title, body, data } = req.body || {};
      if (!title || !body) return res.status(400).json({ error: "Title and body required" });

      const notification = await storage.createNotification({
        title,
        body,
        data: data || {},
        audience: "all",
      });

      const tokens = await storage.getAllPushTokens();
      const messages = tokens.map((t) => ({
        to: t.token,
        sound: "default",
        title,
        body,
        data: { ...(data || {}), notificationId: notification.id },
      }));

      const chunks: any[] = [];
      while (messages.length) {
        chunks.push(messages.splice(0, 100));
      }

      const results: any[] = [];
      for (const chunk of chunks) {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(chunk),
        });
        const json = await response.json();
        results.push(json);
      }

      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "notify",
        entity: "push",
        entityId: String(notification.id),
        details: { count: tokens.length },
        ip: req.ip,
      });

      res.json({ success: true, sent: tokens.length, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- PROFILES ----
  app.post("/api/profile", async (req: Request, res: Response) => {
    try {
      const { deviceId, name, branchId, year, collegeName } = req.body || {};
      if (!deviceId || !name || !branchId || !year || !collegeName) {
        return res.status(400).json({ error: "All fields are required" });
      }
      const profile = await storage.upsertProfile({ deviceId, name, branchId, year, collegeName });
      res.json(profile);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/profiles", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const data = await storage.getProfiles();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use("/uploads", (req, res, next) => {
    res.setHeader("Content-Type", "application/pdf");
    next();
  }, require("express").static(uploadsDir));

  // ---- BRANCHES ----
  app.get("/api/branches", async (_req: Request, res: Response) => {
    try {
      const data = await storage.getAllBranches();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/branches/:id", async (req: Request, res: Response) => {
    try {
      const branch = await storage.getBranch(req.params.id);
      if (!branch) return res.status(404).json({ error: "Not found" });
      res.json(branch);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/branches", requireAdmin, async (req: Request, res: Response) => {
    try {
      const branch = await storage.createBranch(req.body);
      await storage.createAuditLog({
        userId: (_req as any).adminUser?.id,
        action: "create",
        entity: "branch",
        entityId: branch.id,
        details: branch,
        ip: req.ip,
      });
      res.status(201).json(branch);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/branches/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const branch = await storage.updateBranch(req.params.id, req.body);
      if (!branch) return res.status(404).json({ error: "Not found" });
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "update",
        entity: "branch",
        entityId: branch.id,
        details: req.body,
        ip: req.ip,
      });
      res.json(branch);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/branches/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteBranch(req.params.id);
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "delete",
        entity: "branch",
        entityId: req.params.id,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- SUBJECTS ----
  app.get("/api/subjects", async (req: Request, res: Response) => {
    try {
      const { branch, semester } = req.query;
      if (branch && semester) {
        const data = await storage.getSubjectsByBranchAndSemester(branch as string, Number(semester));
        return res.json(data);
      }
      if (branch) {
        const data = await storage.getSubjectsByBranch(branch as string);
        return res.json(data);
      }
      const data = await storage.getAllSubjects();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/subjects/:id", async (req: Request, res: Response) => {
    try {
      const subject = await storage.getSubject(req.params.id);
      if (!subject) return res.status(404).json({ error: "Not found" });
      const syllabus = await storage.getSyllabusUnits(req.params.id);
      const papers = await storage.getPapers(req.params.id);
      res.json({ ...subject, syllabus, papers });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/subjects", requireAdmin, async (req: Request, res: Response) => {
    try {
      const subject = await storage.createSubject(req.body);
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "create",
        entity: "subject",
        entityId: subject.id,
        details: subject,
        ip: req.ip,
      });
      res.status(201).json(subject);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/subjects/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const subject = await storage.updateSubject(req.params.id, req.body);
      if (!subject) return res.status(404).json({ error: "Not found" });
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "update",
        entity: "subject",
        entityId: subject.id,
        details: req.body,
        ip: req.ip,
      });
      res.json(subject);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/subjects/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteSubject(req.params.id);
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "delete",
        entity: "subject",
        entityId: req.params.id,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- SYLLABUS UNITS ----
  app.get("/api/subjects/:subjectId/syllabus", async (req: Request, res: Response) => {
    try {
      const data = await storage.getSyllabusUnits(req.params.subjectId);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/syllabus", requireAdmin, async (req: Request, res: Response) => {
    try {
      const unit = await storage.createSyllabusUnit(req.body);
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "create",
        entity: "syllabus",
        entityId: String(unit.id),
        details: unit,
        ip: req.ip,
      });
      res.status(201).json(unit);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/syllabus/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const unit = await storage.updateSyllabusUnit(Number(req.params.id), req.body);
      if (!unit) return res.status(404).json({ error: "Not found" });
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "update",
        entity: "syllabus",
        entityId: String(unit.id),
        details: req.body,
        ip: req.ip,
      });
      res.json(unit);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/syllabus/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteSyllabusUnit(Number(req.params.id));
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "delete",
        entity: "syllabus",
        entityId: req.params.id,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- PAPERS ----
  app.get("/api/subjects/:subjectId/papers", async (req: Request, res: Response) => {
    try {
      const data = await storage.getPapers(req.params.subjectId);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/papers", async (req: Request, res: Response) => {
    try {
      if (req.query.sort === "views") {
        const data = await storage.getMostViewedPapers(Number(req.query.limit || 20));
        return res.json(data);
      }
      const data = await storage.getAllPapers();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/papers", requireAdmin, upload.single("pdf"), async (req: Request, res: Response) => {
    try {
      const pdfPath = req.file ? `/uploads/${req.file.filename}` : null;
      const paper = await storage.createPaper({
        subjectId: req.body.subjectId,
        year: req.body.year,
        month: req.body.month,
        examType: req.body.examType || "Main",
        pdfPath,
      });
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "create",
        entity: "paper",
        entityId: String(paper.id),
        details: paper,
        ip: req.ip,
      });
      res.status(201).json(paper);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/papers/:id", requireAdmin, upload.single("pdf"), async (req: Request, res: Response) => {
    try {
      const updateData: any = {};
      if (req.body.year) updateData.year = req.body.year;
      if (req.body.month) updateData.month = req.body.month;
      if (req.body.examType) updateData.examType = req.body.examType;
      if (req.body.subjectId) updateData.subjectId = req.body.subjectId;
      if (req.file) {
        const existingPaper = await storage.getPaper(Number(req.params.id));
        if (existingPaper?.pdfPath) {
          const oldPath = path.resolve(process.cwd(), existingPaper.pdfPath.replace(/^\//, ""));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        updateData.pdfPath = `/uploads/${req.file.filename}`;
      }
      const paper = await storage.updatePaper(Number(req.params.id), updateData);
      if (!paper) return res.status(404).json({ error: "Not found" });
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "update",
        entity: "paper",
        entityId: String(paper.id),
        details: updateData,
        ip: req.ip,
      });
      res.json(paper);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/papers/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const paper = await storage.getPaper(Number(req.params.id));
      if (paper?.pdfPath) {
        const filePath = path.resolve(process.cwd(), paper.pdfPath.replace(/^\//, ""));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await storage.deletePaper(Number(req.params.id));
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "delete",
        entity: "paper",
        entityId: req.params.id,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/papers/:id/view", async (req: Request, res: Response) => {
    try {
      const paper = await storage.incrementPaperViews(Number(req.params.id));
      if (!paper) return res.status(404).json({ error: "Not found" });
      res.json({ success: true, views: paper.views });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- SEED DATA ----
  app.post("/api/seed", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const existingBranches = await storage.getAllBranches();
      if (existingBranches.length > 0) {
        return res.json({ message: "Data already seeded", count: existingBranches.length });
      }
      await seedDatabase();
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "seed",
        entity: "database",
        entityId: "seed",
        ip: _req.ip,
      });
      res.json({ success: true, message: "Database seeded successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- CSV IMPORT ----
  app.post("/api/admin/import/subjects", requireAdmin, csvUpload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "CSV file required" });
      const content = req.file.buffer.toString("utf-8");
      const rows = parseCsv(content);
      if (rows.length < 2) return res.status(400).json({ error: "CSV must include header + data" });
      const header = rows[0].map(h => h.toLowerCase());
      const idx = {
        id: header.indexOf("id"),
        name: header.indexOf("name"),
        code: header.indexOf("code"),
        branchId: header.indexOf("branchid"),
        semester: header.indexOf("semester"),
      };
      const results = { created: 0, skipped: 0, errors: 0 };
      for (const row of rows.slice(1)) {
        try {
          const data = {
            id: row[idx.id],
            name: row[idx.name],
            code: row[idx.code],
            branchId: row[idx.branchId],
            semester: Number(row[idx.semester]),
          };
          if (!data.id || !data.name || !data.code || !data.branchId || !data.semester) {
            results.skipped++;
            continue;
          }
          await storage.createSubject(data);
          results.created++;
        } catch {
          results.errors++;
        }
      }
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "import",
        entity: "subjects",
        entityId: "csv",
        details: results,
        ip: req.ip,
      });
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/import/papers", requireAdmin, csvUpload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "CSV file required" });
      const content = req.file.buffer.toString("utf-8");
      const rows = parseCsv(content);
      if (rows.length < 2) return res.status(400).json({ error: "CSV must include header + data" });
      const header = rows[0].map(h => h.toLowerCase());
      const idx = {
        subjectId: header.indexOf("subjectid"),
        year: header.indexOf("year"),
        month: header.indexOf("month"),
        examType: header.indexOf("examtype"),
        pdfPath: header.indexOf("pdfpath"),
      };
      const results = { created: 0, skipped: 0, errors: 0 };
      for (const row of rows.slice(1)) {
        try {
          const data = {
            subjectId: row[idx.subjectId],
            year: row[idx.year],
            month: row[idx.month],
            examType: row[idx.examType] || "Main",
            pdfPath: idx.pdfPath >= 0 ? row[idx.pdfPath] : undefined,
          };
          if (!data.subjectId || !data.year || !data.month) {
            results.skipped++;
            continue;
          }
          await storage.createPaper(data);
          results.created++;
        } catch {
          results.errors++;
        }
      }
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "import",
        entity: "papers",
        entityId: "csv",
        details: results,
        ip: req.ip,
      });
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- ADMIN PAGE ----
  app.get("/admin", (_req: Request, res: Response) => {
    const templatePath = path.resolve(process.cwd(), "server", "templates", "admin.html");
    if (fs.existsSync(templatePath)) {
      res.sendFile(templatePath);
    } else {
      res.status(404).send("Admin page not found");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const row: string[] = [];
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (current.length || row.length) {
        row.push(current.trim());
        rows.push([...row]);
        row.length = 0;
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current.length || row.length) {
    row.push(current.trim());
    rows.push([...row]);
  }
  return rows.filter(r => r.some(c => c.length));
}

async function seedDatabase() {
  const branchData = [
    { id: "cse", name: "Computer Science & Engineering", shortName: "CSE", icon: "monitor", color: "#0EA5E9" },
    { id: "ece", name: "Electronics & Communication", shortName: "ECE", icon: "cpu", color: "#8B5CF6" },
    { id: "me", name: "Mechanical Engineering", shortName: "ME", icon: "settings", color: "#F59E0B" },
    { id: "ee", name: "Electrical Engineering", shortName: "EE", icon: "zap", color: "#EF4444" },
    { id: "ce", name: "Civil Engineering", shortName: "CE", icon: "home", color: "#10B981" },
    { id: "it", name: "Information Technology", shortName: "IT", icon: "globe", color: "#06B6D4" },
    { id: "ei", name: "Electronics & Instrumentation", shortName: "EI", icon: "activity", color: "#EC4899" },
    { id: "ch", name: "Chemical Engineering", shortName: "CH", icon: "droplet", color: "#14B8A6" },
  ];
  for (const b of branchData) {
    await storage.createBranch(b);
  }

  const subjectsData = [
    { id: "cse-3-ds", name: "Data Structures", code: "CS-304", branchId: "cse", semester: 3 },
    { id: "cse-3-dm", name: "Discrete Mathematics", code: "CS-303", branchId: "cse", semester: 3 },
    { id: "cse-3-oop", name: "Object Oriented Programming", code: "CS-305", branchId: "cse", semester: 3 },
    { id: "cse-4-daa", name: "Design & Analysis of Algorithms", code: "CS-404", branchId: "cse", semester: 4 },
    { id: "cse-4-os", name: "Operating Systems", code: "CS-405", branchId: "cse", semester: 4 },
    { id: "cse-4-dbms", name: "Database Management Systems", code: "CS-403", branchId: "cse", semester: 4 },
    { id: "cse-5-cn", name: "Computer Networks", code: "CS-501", branchId: "cse", semester: 5 },
    { id: "cse-5-se", name: "Software Engineering", code: "CS-504", branchId: "cse", semester: 5 },
    { id: "cse-6-cd", name: "Compiler Design", code: "CS-602", branchId: "cse", semester: 6 },
    { id: "cse-6-ai", name: "Artificial Intelligence", code: "CS-601", branchId: "cse", semester: 6 },
    { id: "cse-7-ml", name: "Machine Learning", code: "CS-701", branchId: "cse", semester: 7 },
    { id: "ece-3-ss", name: "Signals & Systems", code: "EC-301", branchId: "ece", semester: 3 },
    { id: "ece-3-an", name: "Analog Electronics", code: "EC-302", branchId: "ece", semester: 3 },
    { id: "ece-4-dc", name: "Digital Communication", code: "EC-401", branchId: "ece", semester: 4 },
    { id: "ece-5-dsp", name: "Digital Signal Processing", code: "EC-501", branchId: "ece", semester: 5 },
    { id: "me-3-tom", name: "Theory of Machines", code: "ME-301", branchId: "me", semester: 3 },
    { id: "me-3-td", name: "Thermodynamics", code: "ME-302", branchId: "me", semester: 3 },
    { id: "me-4-fm", name: "Fluid Mechanics", code: "ME-401", branchId: "me", semester: 4 },
    { id: "ee-3-em", name: "Electrical Machines - I", code: "EE-301", branchId: "ee", semester: 3 },
    { id: "ee-4-pe", name: "Power Electronics", code: "EE-401", branchId: "ee", semester: 4 },
    { id: "ce-3-sm", name: "Strength of Materials", code: "CE-301", branchId: "ce", semester: 3 },
    { id: "it-3-ds", name: "Data Structures", code: "IT-303", branchId: "it", semester: 3 },
    { id: "it-4-wt", name: "Web Technology", code: "IT-402", branchId: "it", semester: 4 },
  ];
  for (const s of subjectsData) {
    await storage.createSubject(s);
  }

  const syllabusData: { subjectId: string; unitNumber: number; title: string; topics: string[] }[] = [
    { subjectId: "cse-3-ds", unitNumber: 1, title: "Introduction & Arrays", topics: ["Algorithms", "Time & Space Complexity", "Arrays", "Sparse Matrix", "Polynomials"] },
    { subjectId: "cse-3-ds", unitNumber: 2, title: "Stacks & Queues", topics: ["Stack Operations", "Polish Notation", "Infix to Postfix", "Queue", "Circular Queue", "Deque", "Priority Queue"] },
    { subjectId: "cse-3-ds", unitNumber: 3, title: "Linked Lists", topics: ["Singly Linked List", "Doubly Linked List", "Circular Linked List", "Polynomial Addition", "Garbage Collection"] },
    { subjectId: "cse-3-ds", unitNumber: 4, title: "Trees", topics: ["Binary Trees", "Tree Traversals", "BST", "AVL Trees", "B-Trees", "Heap", "Huffman Coding"] },
    { subjectId: "cse-3-ds", unitNumber: 5, title: "Graphs & Sorting", topics: ["Graph Representations", "BFS", "DFS", "Minimum Spanning Tree", "Shortest Path", "Bubble Sort", "Quick Sort", "Merge Sort", "Hashing"] },
    { subjectId: "cse-4-os", unitNumber: 1, title: "Introduction to OS", topics: ["OS Types", "System Calls", "OS Structure", "Virtual Machines"] },
    { subjectId: "cse-4-os", unitNumber: 2, title: "Process Management", topics: ["Process States", "Threads", "CPU Scheduling", "FCFS", "SJF", "Round Robin", "Priority Scheduling"] },
    { subjectId: "cse-4-os", unitNumber: 3, title: "Synchronization & Deadlock", topics: ["Critical Section", "Semaphores", "Monitors", "Deadlock Prevention", "Detection", "Recovery", "Banker's Algorithm"] },
    { subjectId: "cse-4-os", unitNumber: 4, title: "Memory Management", topics: ["Paging", "Segmentation", "Virtual Memory", "Page Replacement", "Thrashing"] },
    { subjectId: "cse-4-os", unitNumber: 5, title: "File & I/O Systems", topics: ["File System", "Directory Structure", "Allocation Methods", "Disk Scheduling", "RAID"] },
    { subjectId: "cse-4-dbms", unitNumber: 1, title: "Introduction & ER Model", topics: ["DBMS Architecture", "Data Models", "ER Model", "Keys", "Generalization", "Specialization"] },
    { subjectId: "cse-4-dbms", unitNumber: 2, title: "Relational Model & SQL", topics: ["Relational Algebra", "Tuple Calculus", "SQL Queries", "Joins", "Subqueries", "Views"] },
    { subjectId: "cse-4-dbms", unitNumber: 3, title: "Normalization", topics: ["Functional Dependencies", "1NF", "2NF", "3NF", "BCNF", "Multivalued Dependencies", "4NF", "5NF"] },
    { subjectId: "cse-4-dbms", unitNumber: 4, title: "Transaction Management", topics: ["ACID Properties", "Serializability", "Concurrency Control", "Two Phase Locking", "Timestamp Ordering"] },
    { subjectId: "cse-4-dbms", unitNumber: 5, title: "File Organization & Indexing", topics: ["File Organization", "B-Tree", "B+ Tree", "Hashing", "Recovery Techniques"] },
    { subjectId: "cse-5-cn", unitNumber: 1, title: "Introduction & Physical Layer", topics: ["Network Types", "OSI Model", "TCP/IP Model", "Transmission Media", "Multiplexing"] },
    { subjectId: "cse-5-cn", unitNumber: 2, title: "Data Link Layer", topics: ["Framing", "Error Detection", "CRC", "Flow Control", "Sliding Window", "MAC Protocols", "Ethernet"] },
    { subjectId: "cse-5-cn", unitNumber: 3, title: "Network Layer", topics: ["IP Addressing", "Subnetting", "Routing Algorithms", "OSPF", "BGP", "IPv6"] },
    { subjectId: "cse-5-cn", unitNumber: 4, title: "Transport Layer", topics: ["TCP", "UDP", "Congestion Control", "Flow Control", "Connection Management"] },
    { subjectId: "cse-5-cn", unitNumber: 5, title: "Application Layer", topics: ["DNS", "HTTP", "FTP", "SMTP", "Network Security", "Firewalls", "Cryptography"] },
  ];
  for (const u of syllabusData) {
    await storage.createSyllabusUnit(u);
  }

  const papersData = [
    { subjectId: "cse-3-ds", year: "2024", month: "Dec", examType: "Main" },
    { subjectId: "cse-3-ds", year: "2024", month: "Jun", examType: "Supply" },
    { subjectId: "cse-3-ds", year: "2023", month: "Dec", examType: "Main" },
    { subjectId: "cse-4-os", year: "2024", month: "Dec", examType: "Main" },
    { subjectId: "cse-4-os", year: "2023", month: "Dec", examType: "Main" },
    { subjectId: "cse-4-dbms", year: "2024", month: "Dec", examType: "Main" },
    { subjectId: "cse-4-dbms", year: "2023", month: "Dec", examType: "Main" },
    { subjectId: "cse-5-cn", year: "2024", month: "Dec", examType: "Main" },
    { subjectId: "cse-5-cn", year: "2023", month: "Dec", examType: "Main" },
  ];
  for (const p of papersData) {
    await storage.createPaper(p);
  }
}
