# Subdomain Discovery — Feature Plan

## Problem
Users submit a single domain expecting related subdomains to be discovered and tested automatically. Currently only the exact URL entered gets scanned — the rest are silently dropped (bug fixed) or simply never tested.

## Flow

```
User enters domain (e.g. castatus.cloud)
         │
         ▼
  [Discover Subdomains] button
         │
         ▼
  POST /api/discover-subdomains  { domain }
         │
         ▼
  Runner executes (non-intrusive, passive sources):
    subfinder -d <domain> -silent | sort -u
    amass enum -passive -d <domain> -silent
    httpx -silent -status-code -title
         │
         ▼
  Returns deduplicated live subdomains with status codes
         │
         ▼
  UI shows checkboxes next to each discovered subdomain
  User selects which to include as targets
         │
         ▼
  [Launch Pentests] → existing multi-target launch loop
  1 credit per selected target

```

## API Design

### `POST /api/discover-subdomains`

**Input:**
```json
{
  "domain": "castatus.cloud"
}
```

**Output:**
```json
{
  "subdomains": [
    { "url": "https://help.castatus.cloud", "status": 200, "title": "Castatus Help" },
    { "url": "https://forms.castatus.cloud", "status": 200, "title": "Castatus Forms" },
    { "url": "https://account.castatus.cloud", "status": 200 }
  ],
  "elapsed": 45
}
```

## Backend Execution

**Option A — SSH exec (simplest)**
- API route SSH's into Hetzner box and runs a shell script
- Script: `subfinder -d $1 -silent | sort -u | httpx -silent -status-code -title -json`
- Returns JSON to the API → forwarded to frontend
- Requires: SSH key access + subfinder/httpx installed on Hetzner

**Option B — Runner discovery job**
- New job type `discovery` on the existing `POST /jobs` endpoint
- Runner runs the same toolchain, POSTs results back to a callback
- Cleaner, async, but more infrastructure work

**Option C — Local Docker**
- Run a lightweight Kali container locally with the tools
- Avoids SSH dependency but slower for large domains

**Recommendation:** Option A for MVP (days), Option B for production (weeks).

## Tooling

| Tool | Purpose | Source |
|------|---------|--------|
| `subfinder` | Fast passive subdomain discovery | ProjectDiscovery |
| `amass enum -passive` | Broad passive enumeration (RapidDNS, etc.) | OWASP |
| `httpx` | Validate which are live, capture status + title | ProjectDiscovery |

Passive only — no active brute-forcing. Keeps discovery fast (<2 min) and doesn't ping unowned infra beyond what the subdomains resolve to.

## UI Changes

### `src/app/app/new-pentest/page.tsx`

- Add a **"Discover subdomains"** button below the target input (appears when the input looks like a domain)
- While running: spinner + "Discovering subdomains…"
- Results: list of checkboxes inline below the input
- User checks targets → adds them to `parsedTargets` → existing launch loop handles the rest
- If discovery finds 0 results: show "No additional subdomains found" and proceed with the single URL

## Credit Model

- **Discovery is free** — no credit consumed
- **Each launched pentest = 1 credit** (existing pricing)

## Future Considerations

- Periodic re-discovery for scheduled/recurring pentests
- Active brute-force mode (larger wordlists, longer runtime) as an advanced option
- Subdomain diffing across runs to detect scope drift