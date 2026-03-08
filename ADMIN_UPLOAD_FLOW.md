# Admin Portal + Pentest Report Upload Flow

## Context

Next.js 14 App Router project with Firebase (Firestore + Storage + Auth) and Tailwind CSS. Users launch pentests stored in Firestore. Admins upload PDF/DOCX reports to Firebase Storage and attach them to the correct pentest doc. Users then see and download their reports from their dashboard.

---

## Firestore Data Model

**`users/{userId}`**
```json
{
  "email": "user@example.com",
  "isAdmin": true,
  "currentPlan": "paid",
  "credits": { "web": 2 }
}
```

**`pentests/{pentestId}`**
```json
{
  "userId": "abc123",
  "target": "scanme.nmap.org",
  "type": "Web Application",
  "status": "running",
  "createdAt": "<timestamp>",
  "reportUrl": null,
  "reportUploadedAt": null
}
```

---

## Firebase Storage

- Bucket: `<project-id>.firebasestorage.app`
- Reports stored at: `reports/{pentestId}.pdf` or `reports/{pentestId}.docx`
- Writes: server-side Admin SDK only
- Reads: signed URLs (15-minute expiry) generated server-side

> ⚠️ The bucket must be **manually created** in the Firebase Console (Storage → Get Started) before any upload API calls will work.

---

## Environment Variables

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=                    # from service account JSON, keep \n literals
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=    # e.g. project-id.firebasestorage.app
```

> ⚠️ **Gotchas:**
> - Always `.trim().replace(/^["']|["']$/g, '')` the bucket name — Vercel sometimes wraps env values in quotes
> - `FIREBASE_PRIVATE_KEY` needs `.replace(/\\n/g, '\n')` to restore real newlines
> - The Firestore composite index for `pentests` queried by `userId + createdAt desc` must exist — Firebase will give you a direct creation link in the error the first time the query runs
> - Signed URLs require the service account to have the **Storage Object Admin** IAM role in Google Cloud Console

---

## 1. Firebase Admin SDK — `src/lib/firebase/firebaseAdmin.ts`

- Initialize with `credential.cert()` using the env vars above
- Strip quotes + whitespace from `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` at init time:
  ```ts
  const cleanBucket = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  ```
- Pass `storageBucket: cleanBucket || undefined` to `initializeApp()`
- Guard against re-initialization with `getApps().length`
- Export `adminDb` (Firestore), `adminAuth`, `adminStorage`

---

## 2. API Routes — `src/app/api/admin/`

All routes must:
- Verify caller is admin: read `uid` from cookie → check `users/{uid}.isAdmin === true`
- Return `{ error: string }` with appropriate status on failure
- Include `export const dynamic = 'force-dynamic'`

### `GET /api/admin/stats`
- Returns `{ totalUsers: number }` via Firestore count query on `users` collection

### `GET /api/admin/search-users?q=<emailPrefix>`
- Firestore prefix query: `email >= q` and `email < q + '\uf8ff'`
- Returns up to 8 matches: `[{ uid, email }]`
- Return empty array (not error) if `q` is fewer than 2 chars

### `GET /api/admin/user-pentests?userEmail=<email>`
- Look up user by email → get `userId`
- Query `pentests` where `userId == uid` ordered by `createdAt desc` limit 20
- Returns `[{ pentestId, target, type, status, createdAt }]`

### `POST /api/admin/upload-report`
- Accepts `multipart/form-data`: fields `pentestId` (string) + `file` (File)
- Accept only `application/pdf` and `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Verify pentest doc exists before uploading
- Strip quotes from bucket name (do not rely on SDK init value — pass explicitly):
  ```ts
  const bucket = admin.storage().bucket(cleanBucket);
  ```
- Upload to `reports/{pentestId}.{ext}` with correct `contentType` metadata
- Update Firestore pentest doc:
  ```ts
  { reportUrl: storagePath, status: 'completed', reportUploadedAt: serverTimestamp() }
  ```
- Return `{ success: true, storagePath }`
- Add `export const maxDuration = 60` (Vercel function timeout)
- Expose `error.message` in the 500 response body so the client can display it

### `GET /api/reports/download?pentestId=<id>`
- **User-facing** (not admin-only) — verify `pentests/{pentestId}.userId === requestingUid` (or caller is admin)
- Read `reportUrl` from pentest doc
- Strip quotes from bucket name
- Generate 15-minute signed URL:
  ```ts
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000,
    responseDisposition: `attachment; filename="pentest-report-${pentestId}.${ext}"`,
  });
  ```
- Return `{ url }`

---

## 3. Next.js Config — `next.config.mjs`

Increase the request body size limit for large file uploads:

```js
experimental: {
  serverActions: {
    bodySizeLimit: "20mb",
  },
}
```

---

## 4. Admin Dashboard Component — `src/components/admin/AdminDashboard.tsx`

`"use client"` component. Dark themed using the app's CSS variables and utility classes.

### Stats Row
- Single card: **Total Users** count fetched from `/api/admin/stats` on mount

### Upload Wizard (4 Steps)

#### Step 1 — Client Email
- Text input with live autocomplete dropdown
  - Debounce 250ms, trigger at ≥ 2 chars
  - Calls `/api/admin/search-users?q=<value>` on each keystroke
  - Dropdown: click a suggestion to fill the input, close on outside click
- "Next" button: fetches `/api/admin/user-pentests?userEmail=<value>` immediately
  - If user not found or has no pentests → show error toast, stay on step 1
  - On success → advance to step 2

#### Step 2 — Select Pentest
- Shows selected email with a "Change" link (returns to step 1)
- Custom dropdown listing all returned pentests
  - Each row: target name + formatted launch date + color-coded status badge
    - `completed` → green, `running` → yellow, `pending` → gray/blue, `failed` → red
- "Next" button advances to step 3 (disabled until a pentest is selected)
- "Back" button returns to step 1

#### Step 3 — Upload File
- Confirmation banner showing selected pentest target + date
- File picker: `accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"`
- "Upload Report" button — `POST /api/admin/upload-report` via `FormData`
  - Show spinner during upload
  - On error: display `data.error` from response body as toast
  - On success: advance to step 4
- "Back" returns to step 2

#### Step 4 — Success
- Confirmation message naming the client email
- "Upload Another Report" button resets wizard to step 1

### Step Indicator
- Pill-style chips for steps 1–3: active = filled accent color, completed = muted accent, future = faded
- Hide on step 4

---

## 5. Admin Page Route — `src/app/admin/page.tsx`

```tsx
import AdminDashboard from "@/components/admin/AdminDashboard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const uid = cookies().get("uid")?.value;
  const res = await fetch(
    process.env.NEXT_PUBLIC_SITE_URL.trim() + "/api/auth/isAdmin?uid=" + uid
  );
  const { isAdmin } = await res.json();
  if (!isAdmin) redirect("/app/dashboard");

  return (
    <DashboardLayout>
      <AdminDashboard />
    </DashboardLayout>
  );
}
```

- Use the **same layout wrapper** as all other dashboard pages so the sidebar renders correctly
- The admin page lives at `/admin` (not `/app/admin`) — keep this in mind for nav exclusions below

---

## 6. Hide Public Navbar on Admin Routes — `src/components/nav/ConditionalNav.tsx`

```tsx
const isDashboard =
  !pathname ||
  pathname.startsWith("/app") ||
  pathname.startsWith("/admin");

return (
  <>
    {!isDashboard && <Navbar />}
    {children}
    {!isDashboard && <Footer />}
  </>
);
```

- Default to `true` (hidden) when `pathname` is null so SSR never flashes the public nav on protected pages

---

## 7. User-Facing Download — `src/app/app/pentests/page.tsx`

In the completed pentest detail card:

```tsx
// ✅ Check top-level reportUrl — NOT scan.results?.reportUrl
{(scan.reportUrl || scan.results?.reportUrl) ? (
  <DownloadReportButton pentestId={scan.id} />
) : (
  <span>No report available yet</span>
)}
```

`DownloadReportButton`:
```tsx
function DownloadReportButton({ pentestId }: { pentestId: string }) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/download?pentestId=${pentestId}`);
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed"); return; }
      window.open(data.url, "_blank");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={download} disabled={loading}>
      {loading ? "Getting link…" : "Download Report"}
    </button>
  );
}
```

---

## 8. Data Hook — `src/lib/hooks/useUserScans.ts`

Make sure the hook that maps Firestore pentest docs explicitly includes the top-level report fields:

```ts
return {
  scanId: doc.id,
  // ... other fields ...
  results: data.results || null,         // nested scan results object
  reportUrl: data.reportUrl || null,     // ← top-level, set by admin upload
  reportUploadedAt: data.reportUploadedAt || null,
};
```

> ⚠️ `reportUrl` is a **top-level field** on the pentest doc — it is NOT nested inside `results`. Checking `scan.results?.reportUrl` will always be undefined.
