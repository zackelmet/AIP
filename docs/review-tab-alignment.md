# AIP Review Tab — Alignment Plan

## Current State

AIP's `/admin` uses a **tabbed layout** (`AdminTabs.tsx`): Dashboard | Review | Docx Reporting. The Review tab loads `ReviewPentests.tsx` as a standalone page component.

mspp-ai's admin has a more polished review section (`PendingSection.tsx` inside `AdminDashboard.tsx`) with features AIP's lacks.

## Gaps & Fixes

### 1. Pending count badge on the Review tab button

**File:** `src/components/admin/AdminTabs.tsx`

The Review tab currently shows no badge — an admin has to click into it to know if anything is waiting.

**Fix:** Fetch pending_dispatch + review counts on the AdminTabs level and show a badge (like ` (3)`) next to the tab label when > 0.

```
{ id: "review", label: "Review", icon: faShieldHalved, count: pendingCount }
```

### 2. Pending notification banner below tabs

**File:** `src/components/admin/AdminTabs.tsx` (or `ReviewPentests.tsx` if the tab loads it)

mspp-ai shows a "N pentests pending" line at the top when items are queued.

**Fix:** If `pending_dispatch + review > 0`, show a colored banner below the tabs: "3 pentests waiting for your review" with a link/button to the Review tab (or auto-scroll if already on it).

### 3. Pending Dispatch section (missing entirely in AIP)

**File:** `src/components/admin/ReviewPentests.tsx`

AIP's ReviewPentests **only loads items with `status=review`**. Items in `pending_dispatch` status exist but are nowhere in the UI — admins have no queue to dispatch them.

**Fix:** Add a "Pending Dispatch" section above "Pending Review", same as mspp-ai. Two sections:

```
┌─────────────────────────────────┐
│ Pending Dispatch      (2)       │
│ New pentests waiting...         │
│                                 │
│ ┌─────────────────────────┐    │
│ │ user@email · 2 pentests │    │
│ │ [target.com]      [🔄 D]│    │
│ │ [target2.org]     [🔄 D]│    │
│ └─────────────────────────┘    │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Pending Review        (1)       │
│ Completed scans awaiting...     │
│ ...                              │
└─────────────────────────────────┘
```

### 4. Expandable rows with findings preview

**File:** `src/components/admin/ReviewPentests.tsx`

AIP currently shows a flat row with maybe a few badges. mspp-ai expands on click to show:
- Type, Batch, Billing mode, Token cost
- Findings preview (severity + title for up to 5 findings)

**Fix:** Replace flat rows with expandable rows that reveal details + findings on click.

### 5. User-grouped sections

**File:** `src/components/admin/ReviewPentests.tsx`

mspp-ai groups items by the user who launched them (user email header + batch count). AIP's flat list gets unwieldy with many items.

**Fix:** Group pending items by user email. Each group shows a user header row followed by their pentests.

### 6. Double-click confirmation

**File:** `src/components/admin/ReviewPentests.tsx`

AIP currently dispatches/approves/rejects on a single click — easy to misclick. mspp-ai uses double-click:
- First click: button turns amber with "You sure?"
- Second click (within 4s): fires the action
- Clicking a different button cancels the arm

**Fix:** Port the `armed` state pattern from mspp-ai's `QueueRow` into AIP.

### 7. Auto-refresh every 30s

**File:** `src/components/admin/ReviewPentests.tsx`

mspp-ai auto-refreshes via `useAdminPentests()`. AIP loads on page load but doesn't refresh.

**Fix:** Add a `useAdminPentests` equivalent or a simple `setInterval(refresh, 30000)`.

### 8. AIP color scheme

mspp-ai uses a blue palette (`#4590e2`, `#7a9bb5`). AIP uses green-emerald (`#34D399`, `#041018`).

**Fix:** Map the same structural colors to AIP's palette:
- Card background: `bg-[#0a1929]` (AIP's panel bg)
- Accent: `[#34D399]` (AIP's green)
- Muted text: `text-[var(--text-muted)]`
- Borders: `border-[#34D399]/30`

## Files to modify

| File | Changes |
|------|---------|
| `src/components/admin/AdminTabs.tsx` | Fetch pending counts, add badge to Review tab, notification banner |
| `src/components/admin/ReviewPentests.tsx` | Complete rewrite: two queue sections, user grouping, expandable rows, double-click confirmation, auto-refresh, AIP color palette |
| `src/lib/pentests/useAdminPentests.ts` *(new)* | Shared hook for batch fetch + auto-refresh (port from mspp-ai's `useAdminPentests.ts`) |

## Summary

About 3 files, ~400 lines new/modified. The core work is rewriting `ReviewPentests.tsx` to match `PendingSection.tsx`'s UX while switching the blue palette to AIP's green.