import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { getAdminSession, createAdminSession, clearAdminSession, ensureBootstrapAdmin } from "./auth";
import { getStorageBucket } from "./firebase";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

async function uploadPdfToFirebase(file: Express.Multer.File) {
  const bucket = getStorageBucket();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const fileName = `papers/${Date.now()}-${safeName}`;
  const fileRef = bucket.file(fileName);
  await fileRef.save(file.buffer, {
    contentType: file.mimetype,
    resumable: false,
  });
  const [url] = await fileRef.getSignedUrl({
    action: "read",
    expires: "2036-01-01",
  });
  return url;
}

function normalizePdfLink(raw?: string) {
  if (!raw) return raw;
  const url = raw.trim();
  if (!url) return url;
  if (!url.includes("drive.google.com")) return url;

  const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
  if (fileIdMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
  }
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  }
  return url;
}

function parseTopics(raw?: string) {
  if (!raw) return [];
  return raw
    .split(/\r?\n|\||;/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function htmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatProfileTime(profile: Record<string, any>) {
  return profile.updatedAt || profile.createdAt || "";
}

function formatProfileDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("en-IN");
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries: Array<{ name: string; content: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const contentBuffer = Buffer.from(entry.content, "utf8");
    const entryCrc = crc32(contentBuffer);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(entryCrc, 14);
    localHeader.writeUInt32LE(contentBuffer.length, 18);
    localHeader.writeUInt32LE(contentBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, contentBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(entryCrc, 16);
    centralHeader.writeUInt32LE(contentBuffer.length, 20);
    centralHeader.writeUInt32LE(contentBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + contentBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localDirectory.length, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([localDirectory, centralDirectory, endRecord]);
}

function excelColumnName(index: number) {
  let value = "";
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
}

function createProfilesWorkbook(header: string[], rows: string[][]) {
  const allRows = [header, ...rows];
  const sheetRows = allRows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => {
          const ref = `${excelColumnName(cellIndex + 1)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${htmlEscape(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  const sheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${sheetRows}</sheetData>` +
    `</worksheet>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="Profiles" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="1"><fill><patternFill patternType="none"/></fill></fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  return createZip([
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: rootRelsXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml },
    { name: "xl/styles.xml", content: stylesXml },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml },
  ]);
}

function normalizeBranchId(raw?: string) {
  return (raw || "").trim().toLowerCase();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalizeSubjectId(rawId: string, branchId: string, semester: number, code: string, name: string) {
  const trimmed = (rawId || "").trim().toLowerCase();
  if (trimmed && !/^\d+$/.test(trimmed)) return trimmed;
  const base = slugify(code || name || "subject");
  return `${branchId}-${semester}-${base}`.replace(/--+/g, "-");
}

function buildSubjectLookup(subjects: any[]) {
  const byId = new Map<string, any>();
  const byCode = new Map<string, any>();
  const byName = new Map<string, any>();
  subjects.forEach((s) => {
    const id = String(s.id || "").trim();
    if (id) byId.set(id, s);
    const code = String(s.code || "").trim().toLowerCase();
    if (code) byCode.set(code, s);
    const name = String(s.name || "").trim().toLowerCase();
    if (name) byName.set(name, s);
  });
  return { byId, byCode, byName };
}

function resolveSubjectId(raw: any, lookup: ReturnType<typeof buildSubjectLookup>) {
  const rawStr = String(raw || "").trim();
  if (!rawStr) return "";
  if (lookup.byId.has(rawStr)) return rawStr;
  const lower = rawStr.toLowerCase();
  if (lookup.byCode.has(lower)) return lookup.byCode.get(lower).id;
  if (lookup.byName.has(lower)) return lookup.byName.get(lower).id;
  return "";
}

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

  app.delete("/api/notifications/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteNotification(req.params.id);
      await storage.createAuditLog({
        userId: req.user?.id,
        action: "delete",
        entity: "notification",
        entityId: req.params.id,
        ip: req.ip,
      });
      res.json({ ok: true });
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
      const { deviceId, name, branchId, year, collegeName, email, firebaseUid } = req.body || {};
      if (!deviceId || !name || !branchId || !year || !collegeName || !email) {
        return res.status(400).json({ error: "All fields are required" });
      }
      const profile = await storage.upsertProfile({
        deviceId,
        name,
        branchId,
        year,
        collegeName,
        email: email || null,
        firebaseUid: firebaseUid || null,
      });
      res.json(profile);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const handleProfileDelete = async (req: Request, res: Response) => {
    try {
      const deviceId = String(req.body?.deviceId || req.query?.deviceId || "").trim();
      const firebaseUid = String(req.body?.firebaseUid || req.query?.firebaseUid || "").trim();
      if (!deviceId && !firebaseUid) {
        return res.status(400).json({ error: "deviceId or firebaseUid is required" });
      }
      const deleted = await storage.deleteProfile({ deviceId, firebaseUid });
      res.json({ success: true, deleted });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  app.delete("/api/profile", handleProfileDelete);
  app.post("/api/profile/delete", handleProfileDelete);

  app.get("/api/admin/profiles", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const data = await storage.getProfiles();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/profiles/export.csv", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const data = await storage.getProfiles();
      const branches = await storage.getAllBranches();
      const branchMap = new Map(branches.map((branch: any) => [branch.id, `${branch.shortName} - ${branch.name}`]));
      const header = [
        "Name",
        "Email",
        "Branch",
        "Year",
        "College",
        "Device ID",
        "Firebase UID",
        "Saved At",
        "Created At",
      ];
      const rows = data.map((profile: any) => [
        profile.name,
        profile.email,
        branchMap.get(profile.branchId) || profile.branchId,
        profile.year,
        profile.collegeName,
        profile.deviceId,
        profile.firebaseUid,
        formatProfileTime(profile),
        profile.createdAt,
      ]);
      const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="profiles-export.csv"');
      res.send(csv);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/profiles/export.xlsx", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const data = await storage.getProfiles();
      const branches = await storage.getAllBranches();
      const branchMap = new Map(branches.map((branch: any) => [branch.id, `${branch.shortName} - ${branch.name}`]));
      const header = [
        "Name",
        "Email",
        "Branch",
        "Year",
        "College",
        "Device ID",
        "Firebase UID",
        "Saved At",
        "Created At",
      ];

      const rows = data.map((profile: any) => [
        profile.name,
        profile.email,
        branchMap.get(profile.branchId) || profile.branchId,
        profile.year,
        profile.collegeName,
        profile.deviceId,
        profile.firebaseUid,
        formatProfileDateTime(formatProfileTime(profile)),
        formatProfileDateTime(profile.createdAt),
      ]);

      const workbook = createProfilesWorkbook(
        header,
        rows.map((row) => row.map((cell) => String(cell ?? ""))),
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", 'attachment; filename="profiles-export.xlsx"');
      res.send(workbook);
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
      const videos = await storage.getVideos(req.params.id);
      res.json({ ...subject, syllabus, papers, videos });
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

  app.get("/api/subjects/:subjectId/videos", async (req: Request, res: Response) => {
    try {
      const data = await storage.getVideos(req.params.subjectId);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/subjects/:subjectId/analytics", async (req: Request, res: Response) => {
    try {
      const data = await storage.getAnalytics(req.params.subjectId);
      res.json(data || null);
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
      const pdfLink = normalizePdfLink(req.body.pdfUrl);
      const pdfPath = req.file ? await uploadPdfToFirebase(req.file) : (pdfLink || null);
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
        updateData.pdfPath = await uploadPdfToFirebase(req.file);
      } else if (req.body.pdfUrl) {
        updateData.pdfPath = normalizePdfLink(req.body.pdfUrl);
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

  // ---- VIDEOS ----
  app.post("/api/videos", requireAdmin, async (req: Request, res: Response) => {
    try {
      const video = await storage.createVideo(req.body);
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "create",
        entity: "video",
        entityId: String(video.id),
        details: video,
        ip: req.ip,
      });
      res.status(201).json(video);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/videos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const video = await storage.updateVideo(Number(req.params.id), req.body);
      if (!video) return res.status(404).json({ error: "Not found" });
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "update",
        entity: "video",
        entityId: req.params.id,
        details: req.body,
        ip: req.ip,
      });
      res.json(video);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/videos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteVideo(Number(req.params.id));
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "delete",
        entity: "video",
        entityId: req.params.id,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- PYQ ANALYTICS ----
  app.post("/api/analytics/:subjectId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const analytics = await storage.upsertAnalytics(req.params.subjectId, req.body);
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "update",
        entity: "pyq_analytics",
        entityId: req.params.subjectId,
        details: req.body,
        ip: req.ip,
      });
      res.json(analytics);
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
      const unitTitleIdx: Record<number, number> = {};
      const unitTopicsIdx: Record<number, number> = {};
      for (let i = 1; i <= 8; i++) {
        unitTitleIdx[i] = header.indexOf(`unit${i}_title`);
        unitTopicsIdx[i] = header.indexOf(`unit${i}_topics`);
      }
      const results = { created: 0, skipped: 0, errors: 0 };
      for (const row of rows.slice(1)) {
        try {
          const name = (row[idx.name] || "").trim();
          const code = (row[idx.code] || "").trim();
          const branchId = normalizeBranchId(row[idx.branchId]);
          const semester = Number(row[idx.semester]);
          const id = normalizeSubjectId(row[idx.id], branchId, semester, code, name);
          const data = {
            id,
            name,
            code,
            branchId,
            semester,
          };
          if (!data.id || !data.name || !data.code || !data.branchId || !data.semester) {
            results.skipped++;
            continue;
          }
          await storage.createSubject(data);
          for (let i = 1; i <= 8; i++) {
            const titleIdx = unitTitleIdx[i];
            const topicsIdx = unitTopicsIdx[i];
            if (titleIdx < 0) continue;
            const title = row[titleIdx];
            if (!title) continue;
            const topics = topicsIdx >= 0 ? parseTopics(row[topicsIdx]) : [];
            await storage.createSyllabusUnit({
              subjectId: data.id,
              unitNumber: i,
              title,
              topics,
            });
          }
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
        subjectCode: header.indexOf("subjectcode"),
        subjectName: header.indexOf("subjectname"),
        year: header.indexOf("year"),
        month: header.indexOf("month"),
        examType: header.indexOf("examtype"),
        pdfPath: header.indexOf("pdfpath"),
      };
      const subjects = await storage.getAllSubjects();
      const lookup = buildSubjectLookup(subjects as any[]);
      const results = { created: 0, skipped: 0, errors: 0 };
      for (const row of rows.slice(1)) {
        try {
          const rawPath = idx.pdfPath >= 0 ? row[idx.pdfPath] : undefined;
          const data = {
            subjectId: resolveSubjectId(
              idx.subjectId >= 0 ? row[idx.subjectId] : (idx.subjectCode >= 0 ? row[idx.subjectCode] : row[idx.subjectName]),
              lookup
            ),
            year: row[idx.year],
            month: row[idx.month],
            examType: row[idx.examType] || "Main",
            pdfPath: rawPath ? normalizePdfLink(rawPath) : undefined,
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

  app.post("/api/admin/papers/bulk", requireAdmin, async (req: Request, res: Response) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const results = { created: 0, skipped: 0, errors: 0 };
      const subjects = await storage.getAllSubjects();
      const lookup = buildSubjectLookup(subjects as any[]);
      for (const item of items) {
        try {
          const subjectId = resolveSubjectId(item.subjectId || item.subjectCode || item.subjectName, lookup);
          const year = String(item.year || "").trim();
          const month = String(item.month || "").trim();
          const examType = String(item.examType || "Main").trim() || "Main";
          const pdfPath = normalizePdfLink(String(item.pdfPath || "").trim());
          if (!subjectId || !year || !month || !pdfPath) {
            results.skipped++;
            continue;
          }
          await storage.createPaper({ subjectId, year, month, examType, pdfPath });
          results.created++;
        } catch {
          results.errors++;
        }
      }
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "import",
        entity: "papers_bulk",
        entityId: "manual",
        details: results,
        ip: req.ip,
      });
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/papers/reassign", requireAdmin, async (req: Request, res: Response) => {
    try {
      const fromSubjectId = String(req.body?.fromSubjectId || "").trim();
      const toSubjectId = String(req.body?.toSubjectId || "").trim();
      if (!fromSubjectId || !toSubjectId) {
        return res.status(400).json({ error: "fromSubjectId and toSubjectId are required" });
      }
      const updated = await storage.reassignPapers(fromSubjectId, toSubjectId);
      await storage.createAuditLog({
        userId: (req as any).adminUser?.id,
        action: "update",
        entity: "papers_reassign",
        entityId: `${fromSubjectId}=>${toSubjectId}`,
        ip: req.ip,
      });
      res.json({ updated });
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
