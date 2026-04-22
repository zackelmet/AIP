/**
 * Smoke test for the report engine pipeline.
 * Tests: template render → Firebase Storage upload → signed URL
 * Run: node scripts/smoke-test-report.mjs
 */

import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── 1. Check env vars ────────────────────────────────────────────
console.log("\n=== 1. Environment Variables ===");
const required = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
];
let envOk = true;
for (const key of required) {
  const val = process.env[key];
  if (!val) {
    console.error(`  ✗ MISSING: ${key}`);
    envOk = false;
  } else {
    console.log(`  ✓ ${key} = ${val.slice(0, 40).replace(/\n/g, "\\n")}...`);
  }
}
if (!envOk) {
  console.error("\nAborting: missing required env vars.");
  process.exit(1);
}

// ── 2. Check template file ───────────────────────────────────────
console.log("\n=== 2. Template File ===");
const templatePath = join(root, "public", "templates", "external-report-template.docx");
if (!existsSync(templatePath)) {
  console.error(`  ✗ Template not found: ${templatePath}`);
  process.exit(1);
}
const templateBytes = readFileSync(templatePath);
console.log(`  ✓ Template found (${(templateBytes.length / 1024).toFixed(1)} KB)`);

// ── 3. Render DOCX ───────────────────────────────────────────────
console.log("\n=== 3. DOCX Render ===");
let docxBuffer;
try {
  const { default: Docxtemplater } = await import("docxtemplater");
  const { default: PizZip } = await import("pizzip");

  const zip = new PizZip(templateBytes);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    REPORT_TITLE: "Smoke Test Report",
    TARGET: "10.0.0.1",
    COMPLETION_DATE: new Date().toLocaleDateString("en-US"),
    REPORT_VERSION: "1.0",
    REPORT_DATE: new Date().toLocaleDateString("en-US"),
    TESTER_NAME: "Smoke Test Bot",
    REPORT_NOTES: "Automated smoke test",
    EXECUTIVE_SUMMARY_PARAGRAPH_1: "This is a smoke test.",
    EXECUTIVE_SUMMARY_PARAGRAPH_2: "Generated automatically.",
    PURPOSE_STATEMENT: "To verify the report engine pipeline.",
    ASSESSMENT_INTEGRITY_STATEMENT: "",
    SCOPE_TARGET: "10.0.0.1",
    findings: [
      {
        index: "01",
        title: "Test Finding",
        severity: "High",
        cvss_vector: "7.5",
        description: "A test finding for smoke testing.",
        poc: "curl -X GET http://target/vuln",
        impact: "Data exposure.",
        remediation: "Apply patch.",
      },
    ],
    toc_findings: [{ toc_index: "01", toc_title: "Test Finding" }],
  });

  docxBuffer = doc.getZip().generate({ type: "nodebuffer" });
  console.log(`  ✓ DOCX rendered successfully (${(docxBuffer.length / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error("  ✗ DOCX render failed:", err.message);
  if (err.properties?.errors) {
    console.error("  Template errors:", JSON.stringify(err.properties.errors, null, 2));
  }
  process.exit(1);
}

// ── 4. Firebase Admin init ───────────────────────────────────────
console.log("\n=== 4. Firebase Admin Init ===");
let adminStorage, adminDb;
try {
  const { default: admin } = await import("firebase-admin");

  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  adminStorage = admin.storage();
  adminDb = admin.firestore();
  console.log("  ✓ Firebase Admin initialized");
} catch (err) {
  console.error("  ✗ Firebase Admin init failed:", err.message);
  process.exit(1);
}

// ── 5. Upload to Firebase Storage ───────────────────────────────
console.log("\n=== 5. Firebase Storage Upload ===");
let storagePath, fileName;
try {
  const bucket = adminStorage.bucket();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  fileName = `smoke-test-${timestamp}.docx`;
  storagePath = `reports/smoke-test/${fileName}`;

  const file = bucket.file(storagePath);
  await file.save(docxBuffer, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    resumable: false,
  });
  console.log(`  ✓ Uploaded to gs://${bucket.name}/${storagePath}`);
} catch (err) {
  console.error("  ✗ Storage upload failed:", err.message);
  process.exit(1);
}

// ── 6. Generate signed URL ───────────────────────────────────────
console.log("\n=== 6. Signed URL ===");
try {
  const bucket = adminStorage.bucket();
  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
    responseDisposition: `attachment; filename="${fileName}"`,
  });
  console.log(`  ✓ Signed URL generated (expires in 15 min):`);
  console.log(`    ${url.slice(0, 100)}...`);
} catch (err) {
  console.error("  ✗ Signed URL failed:", err.message);
  process.exit(1);
}

// ── 7. Firestore write ───────────────────────────────────────────
console.log("\n=== 7. Firestore Write ===");
try {
  const ref = adminDb.collection("reports").doc();
  await ref.set({
    id: ref.id,
    ownerUid: "smoke-test",
    storagePath,
    fileName,
    clientName: "Smoke Test Client",
    projectTitle: "Smoke Test Report",
    createdAt: new Date(),
  });
  console.log(`  ✓ Firestore record written (id: ${ref.id})`);
  // Clean up smoke test doc
  await ref.delete();
  console.log(`  ✓ Firestore record cleaned up`);
} catch (err) {
  console.error("  ✗ Firestore write failed:", err.message);
  process.exit(1);
}

console.log("\n✅ All smoke tests passed — report engine pipeline is healthy.\n");
process.exit(0);
