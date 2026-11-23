// Compatibility shim for scripts: firebase-admin v14 is modular and no longer
// exposes a default namespace. This preserves `admin.firestore()` etc.
const { initializeApp, getApp, getApps, cert, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");

const firestoreFn = Object.assign(() => getFirestore(), { FieldValue, Timestamp });
const admin = {
  initializeApp,
  app: () => getApp(),
  credential: { cert, applicationDefault },
  firestore: firestoreFn,
  auth: () => getAuth(),
  storage: () => getStorage(),
};
Object.defineProperty(admin, "apps", { get: () => getApps(), enumerable: true });
module.exports = admin;
