import {
  initializeApp,
  getApp,
  getApps,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import type { Storage } from "firebase-admin/storage";

/**
 * Initializes the Firebase Admin SDK. (SHOULD ONLY BE USED IN SERVER SIDE)
 *
 * Uses the modular firebase-admin v14 API internally, and returns a small
 * namespace-compatible object so existing `admin.firestore()` / `admin.auth()`
 * call sites keep working.
 */
type FirestoreNamespace = (() => Firestore) & {
  FieldValue: typeof FieldValue;
  Timestamp: typeof Timestamp;
};

interface AdminShim {
  initializeApp: typeof initializeApp;
  app: () => App;
  credential: {
    cert: typeof cert;
    applicationDefault: typeof applicationDefault;
  };
  firestore: FirestoreNamespace;
  auth: () => Auth;
  storage: () => Storage;
  readonly apps: App[];
}

export const initializeAdmin = (): AdminShim => {
  if (!getApps().length) {
    try {
      const projectId =
        process.env.FIREBASE_ADMIN_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail =
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
        process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = (
        process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
        process.env.FIREBASE_PRIVATE_KEY
      )?.replace(/\\n/g, "\n");

      const cleanBucket = (
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ""
      )
        .trim()
        .replace(/^["']|["']$/g, "");

      if (projectId && clientEmail && privateKey) {
        initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          storageBucket: cleanBucket || undefined,
        });
        console.log(
          "Firebase Admin initialized using explicit service account",
        );
      } else {
        try {
          initializeApp({
            credential: applicationDefault(),
            storageBucket: cleanBucket || undefined,
          });
          console.log(
            "Firebase Admin initialized using application default credentials",
          );
        } catch (adcErr) {
          console.error(
            "Firebase admin applicationDefault init failed:",
            adcErr,
          );
          console.warn(
            "Firebase Admin not initialized: no service account env vars and application default credentials unavailable.",
          );
        }
      }
    } catch (error) {
      console.error("Firebase admin initialization unexpected error", error);
    }
  }
  return adminShim;
};

const firestoreFn: FirestoreNamespace = Object.assign(() => getFirestore(), {
  FieldValue,
  Timestamp,
});
const authFn = () => getAuth();
const storageFn = () => getStorage();

const adminShim = {
  initializeApp,
  app: () => getApp(),
  credential: { cert, applicationDefault },
  firestore: firestoreFn,
  auth: authFn,
  storage: storageFn,
} as unknown as AdminShim;
Object.defineProperty(adminShim, "apps", {
  get: () => getApps(),
  enumerable: true,
});

initializeAdmin();
export { FieldValue, Timestamp };
export const adminDb = getFirestore();
adminDb.settings({ ignoreUndefinedProperties: true });
export const adminAuth = getAuth();
export const adminStorage = getStorage();

/**
 * Verifies the Bearer token in the Authorization header and returns the UID,
 * or null if invalid / missing.
 */
export async function verifyAuthToken(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
