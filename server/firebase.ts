import { initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue as AdminFieldValue } from "firebase-admin/firestore";
import { getStorage as getAdminStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";

let app: App | null = null;

function initFirebase() {
  if (app) return app;
  let serviceAccount: any;
  if (process.env.FIREBASE_ADMIN_CREDENTIALS_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS_JSON);
  } else {
    const credPath = process.env.FIREBASE_ADMIN_CREDENTIALS;
    if (!credPath) {
      throw new Error("FIREBASE_ADMIN_CREDENTIALS is not set");
    }
    const fullPath = path.resolve(process.cwd(), credPath);
    const raw = fs.readFileSync(fullPath, "utf-8");
    serviceAccount = JSON.parse(raw);
  }

  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  return app;
}

export function getFirestore() {
  initFirebase();
  const db = getAdminFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

export function getStorageBucket() {
  initFirebase();
  if (!process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error("FIREBASE_STORAGE_BUCKET is not set");
  }
  return getAdminStorage().bucket();
}

export const FieldValue = AdminFieldValue;
