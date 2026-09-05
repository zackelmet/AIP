import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const clientCredentials = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

function ensureFirebase(): FirebaseApp {
  if (firebaseApp) return firebaseApp;
  if (typeof window === "undefined") throw new Error("Firebase client SDK can only be initialized in browser");
  firebaseApp = getApps().length ? getApps()[0] : initializeApp(clientCredentials);
  return firebaseApp;
}

export function getDb(): Firestore {
  if (firestoreDb) return firestoreDb;
  firestoreDb = getFirestore(ensureFirebase());
  return firestoreDb;
}

export function getFirebaseAuth(): Auth {
  if (firebaseAuth) return firebaseAuth;
  firebaseAuth = getAuth(ensureFirebase());
  return firebaseAuth;
}

export default function getFirebaseApp(): FirebaseApp {
  return ensureFirebase();
}