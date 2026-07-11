# AWS Route 53 Clone

A functional clone of the AWS Route 53 console. Built with Next.js (TypeScript), FastAPI (Python), and SQLite. Features hosted zone CRUD, DNS record management across 9 record types, BIND import/export, dark mode, keyboard shortcuts, and a Route 53-authentic UI powered by the AWS Cloudscape Design System.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (TypeScript, App Router) |
| UI Library | AWS Cloudscape Design System v3 |
| Backend | FastAPI (Python 3.11+) |
| Database | SQLite via SQLAlchemy ORM |
| Auth | JWT access + refresh tokens, bcrypt password hashing |
| Testing | pytest (114 tests, backend) |

## Architecture

```
┌────────────────┐     HTTP/JSON      ┌─────────────────┐     SQL      ┌──────────┐
│   Next.js      │ ─────────────────> │    FastAPI      │ ───────────> │  SQLite  │
│   Vercel       │ <───────────────── │    Render       | <─────────── │  /tmp    │
│   port :3000   │                    │    port :8000   │              │          │
└────────────────┘                    └─────────────────┘              └──────────┘

Authentication Flow:
┌──────────┐   POST /signup or /login    ┌──────────┐
│  Client  │ ──────────────────────────> │  Backend │
│          │ <─ {access_token,           │          │
│          │     refresh_token, user}    │          │
│          │                             │          │
│          │   On 401 → POST /refresh    │          │
│          │ ──────────────────────────> │          │
│          │ <─ New token pair           │          │
└──────────┘                             └──────────┘
```

- Access token: 24-hour JWT (HS256), stored in `localStorage`
- Refresh token: 7-day opaque token (bcrypt-hashed in SQLite), stored in `localStorage`
- Auto-refresh: Frontend API client intercepts 401s, refreshes silently, retries the request

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm / pip

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Starts at `http://localhost:8000`. On first run, creates `route53.db` and seeds:
- Admin user (`admin` / `admin123`)
- 3 sample hosted zones (`example.com`, `myapp.org`, `startup.io`)
- ~20 DNS records across all 9 supported types
- Sample tags and change entries

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Starts at `http://localhost:3000`. Ensure `NEXT_PUBLIC_API_URL` in `.env.local` points to `http://localhost:8000`.

### Login

| Username | Password |
|---|---|
| `admin` | `admin123` |

Or create a new account via the **Create account** tab on the login page.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, lifespan (init DB + seed)
│   │   ├── config.py          # Settings via Pydantic (env vars)
│   │   ├── database.py        # SQLAlchemy engine, session, FK pragma
│   │   ├── models.py          # User, RefreshToken, HostedZone, DNSRecord, Change, Tag
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── exceptions.py      # Custom HTTP exceptions (Route53 error codes)
│   │   ├── seed.py            # Database seeder (admin user + sample zones)
│   │   ├── routers/
│   │   │   ├── auth.py        # /api/auth (signup, login, refresh, logout, me)
│   │   │   ├── zones.py       # /api/zones CRUD
│   │   │   ├── records.py     # /api/zones/{id}/records CRUD + BIND import/export
│   │   │   ├── tags.py        # /api/zones/{id}/tags + batch retrieval
│   │   │   └── changes.py     # /api/changes/{id}
│   │   └── utils/
│   │       └── auth.py        # JWT creation, refresh token helpers, get_current_user
│   ├── tests/
│   │   ├── conftest.py        # Test fixtures (in-memory SQLite, TestClient)
│   │   ├── test_auth.py       # 19 tests (login, signup, refresh, logout, me)
│   │   ├── test_zones.py      # 17 tests (zone CRUD)
│   │   ├── test_records.py    # ~30 tests (record CRUD, all types)
│   │   ├── test_tags.py       # Tag tests
│   │   ├── test_validation.py # Record value validation tests
│   │   ├── test_changes.py    # Change status tests
│   │   └── test_bind.py       # BIND import/export tests
│   ├── requirements.txt
│   ├── runtime.txt            # Python 3.11 for Render
│   └── run.py                 # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx     # Root layout (Cloudscape + theme CSS)
│   │   │   ├── page.tsx       # Dashboard
│   │   │   ├── icon.tsx       # Favicon generator (PNG)
│   │   │   ├── globals.css    # Base styles + theme transitions
│   │   │   ├── login/page.tsx # Sign in / Create account
│   │   │   ├── zones/
│   │   │   │   ├── page.tsx   # Hosted zones list + CRUD
│   │   │   │   └── [id]/page.tsx  # Zone detail: records + tags
│   │   │   ├── health-checks/page.tsx
│   │   │   ├── traffic-policies/page.tsx
│   │   │   ├── resolver/page.tsx
│   │   │   └── profiles/page.tsx
│   │   ├── components/
│   │   │   ├── AppLayout.tsx           # App shell: top nav + side nav + breadcrumbs
│   │   │   ├── AwsTopNavigation.tsx    # AWS-style top bar (logo, search, theme, account)
│   │   │   ├── AwsSideNavigation.tsx   # Route53 side nav with section groups
│   │   │   ├── NotificationFlashbar.tsx # Auto-dismissing notifications (5s)
│   │   │   ├── ComingSoon.tsx          # Placeholder for mocked sections
│   │   │   ├── ShortcutsHelp.tsx       # Keyboard shortcuts modal
│   │   │   └── AuthGuard.tsx           # Client-side auth wrapper
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useDarkMode.ts          # Cloudscape applyMode + CSS class toggle
│   │   │   ├── useKeyboardShortcuts.ts # ? toggles help, Esc dismisses, / focuses search
│   │   │   ├── useZones.ts
│   │   │   └── useRecords.ts
│   │   ├── lib/
│   │   │   ├── api.ts          # API client with auto-refresh, all service methods
│   │   │   └── types.ts        # TypeScript interfaces + RECORD_TYPES const
│   │   └── styles/
│   │       ├── aws-overrides.css       # Light mode: dark header, sidebar, link colors
│   │       └── aws-dark-overrides.css  # Dark mode: refined nav + content palette
│   ├── public/
│   │   ├── aws-logo.svg        # AWS "aws" wordmark + orange smile
│   │   ├── route53-logo.svg    # Route53 globe-icon logo
│   │   └── favicon.svg         # Fallback favicon
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── vercel.json
│
├── deploy/                      # Legacy Docker deployment (not used)
├── render.yaml                  # Render blueprint
└── README.md
```

## Database Schema

![image](https://img.shields.io/badge/database-SQLite-003B57?logo=sqlite)

### `users`

| Column | Type | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| username | TEXT | UNIQUE, NOT NULL, INDEXED |
| password_hash | TEXT | NOT NULL (bcrypt) |
| created_at | TEXT | NOT NULL (ISO 8601) |

### `refresh_tokens`

| Column | Type | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| token_hash | TEXT | UNIQUE, NOT NULL, INDEXED (bcrypt) |
| user_id | TEXT | FOREIGN KEY → users.id ON DELETE CASCADE |
| expires_at | TEXT | NOT NULL (ISO 8601, 7 days) |
| created_at | TEXT | NOT NULL (ISO 8601) |

### `hosted_zones`

| Column | Type | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY (e.g. `Z1A2B3C4D5E6`) |
| name | TEXT | NOT NULL, INDEXED (FQDN, trailing dot) |
| caller_reference | TEXT | UNIQUE, NOT NULL |
| comment | TEXT | Default "" |
| private_zone | INTEGER | Default 0 |
| resource_record_set_count | INTEGER | Default 0 (cached) |
| created_at | TEXT | NOT NULL |
| updated_at | TEXT | NOT NULL |

### `dns_records`

| Column | Type | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| zone_id | TEXT | FOREIGN KEY → hosted_zones.id ON DELETE CASCADE |
| name | TEXT | NOT NULL, INDEXED (FQDN) |
| type | TEXT | NOT NULL (A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA) |
| ttl | INTEGER | Default 300 |
| value | TEXT | NOT NULL (JSON array of strings) |
| alias_target | TEXT | Nullable JSON |
| created_at | TEXT | NOT NULL |
| updated_at | TEXT | NOT NULL |

### `changes`

| Column | Type | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY (e.g. `C1A2B3C4D5E6`) |
| zone_id | TEXT | FOREIGN KEY → hosted_zones.id ON DELETE CASCADE |
| status | TEXT | PENDING or INSYNC |
| comment | TEXT | Default "" |
| submitted_at | TEXT | NOT NULL |

### `tags`

| Column | Type | Constraints |
|---|---|---|
| id | TEXT | PRIMARY KEY |
| resource_type | TEXT | NOT NULL (`hostedzone`) |
| resource_id | TEXT | NOT NULL |
| key | TEXT | NOT NULL |
| value | TEXT | NOT NULL |
| **UNIQUE** | | (resource_type, resource_id, key) |

## API Reference

Base URL: `http://localhost:8000` (dev) | `https://aws-route53-1-eerw.onrender.com` (prod)

All endpoints except auth require `Authorization: Bearer <access_token>`.

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | No | Create account. Returns `access_token`, `refresh_token`, `user` |
| `POST` | `/api/auth/login` | No | Sign in. Returns `access_token`, `refresh_token`, `user` |
| `POST` | `/api/auth/refresh` | No | Exchange refresh token for new token pair |
| `POST` | `/api/auth/logout` | Yes | Invalidate all refresh tokens |
| `GET` | `/api/auth/me` | Yes | Get current user profile |

### Hosted Zones

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/zones` | Yes | Create hosted zone (auto-creates SOA + NS records) |
| `GET` | `/api/zones` | Yes | List zones. Query: `?search=&page=&size=` |
| `GET` | `/api/zones/{zone_id}` | Yes | Get zone details (includes delegation set + record count) |
| `PUT` | `/api/zones/{zone_id}` | Yes | Update zone comment |
| `DELETE` | `/api/zones/{zone_id}` | Yes | Delete zone (blocked if non-essential records exist) |

### DNS Records

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/zones/{zone_id}/records` | Yes | Batch change (CREATE/DELETE/UPSERT) |
| `GET` | `/api/zones/{zone_id}/records` | Yes | List records. Query: `?search=&type=&page=&size=` |
| `GET` | `/api/zones/{zone_id}/records/{record_id}` | Yes | Get single record |
| `PUT` | `/api/zones/{zone_id}/records/{record_id}` | Yes | Update record |
| `DELETE` | `/api/zones/{zone_id}/records/{record_id}` | Yes | Delete record |

### Import / Export

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/zones/{zone_id}/export-json` | Yes | Export zone as JSON |
| `GET` | `/api/zones/{zone_id}/export-bind` | Yes | Export zone as BIND zone file (text/plain) |
| `POST` | `/api/zones/{zone_id}/import-bind` | Yes | Import records from BIND zone file content |

### Tags

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/zones/{zone_id}/tags` | Yes | List tags for a zone |
| `POST` | `/api/zones/{zone_id}/tags` | Yes | Add/remove tags (`add_tags`, `remove_tag_keys`) |

### Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/changes/{change_id}` | Yes | Get change status (PENDING/INSYNC) |

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check → `{"status": "ok"}` |

## Supported Record Types

| Type | Value Format | Example |
|---|---|---|
| A | IPv4 address | `192.168.1.1` |
| AAAA | IPv6 address | `2001:db8::1` |
| CNAME | Canonical name (FQDN) | `target.example.com.` |
| TXT | Text string (quoted) | `"v=spf1 include:_spf.google.com ~all"` |
| MX | Priority + mail server | `10 mail.example.com.` |
| NS | Name server (FQDN) | `ns1.example.com.` |
| PTR | Pointer record (FQDN) | `host.example.com.` |
| SRV | Priority Weight Port Target | `0 10 80 svc.example.com.` |
| CAA | Flags Tag Value | `0 issue "letsencrypt.org"` |

## Features

### Authentication
- **Signup & Login** — Create accounts or sign in with existing credentials
- **JWT access tokens** — 24-hour expiry, auto-refreshed on 401
- **Refresh tokens** — 7-day expiry, bcrypt-hashed in SQLite, invalidated on logout
- **Auto-refresh** — Frontend API client silently refreshes expired tokens

### Hosted Zones
- Full CRUD with search, pagination
- Auto-generates SOA + 4 NS records on creation
- Deletion blocked if non-essential records remain (matches Route53 behavior)
- Domain name validation with trailing-dot normalization

### DNS Records
- Batch CREATE / DELETE / UPSERT via `ChangeResourceRecordSets`
- Filter by record type, search by name, paginated
- Type-aware form with value format hints per record type
- SOA/NS deletion protection
- **Full record editing** — edit record name, value, and TTL (type is immutable, matching AWS)

### Import / Export
- **BIND zone file import** — Parse `$ORIGIN`, `$TTL`, SOA, and all standard record types
- **BIND zone file export** — Generates valid BIND zone file, triggers download
- **JSON export** — Full zone with all records, downloadable as JSON

### Dark Mode
- Toggle via ☀/☾ button in the top navigation bar
- Persists to `localStorage`
- Uses Cloudscape's built-in `applyMode()` for components
- Custom palette with smooth 0.4s CSS transitions between themes

### Keyboard Shortcuts
- `?` — Toggle shortcuts help modal
- `c` / `n` — Create (zone or record, context-dependent)
- `/` — Focus search input
- `Esc` — Close modals / blur inputs

### Bulk Operations
- Multi-select records in zone detail
- Bulk delete (SOA/NS records excluded)

### Notifications
- Success/error/info/warning notifications anchored below the top nav
- Auto-dismiss after 5 seconds with slide-out animation
- Manual dismiss via X button

### UI / UX
- **AWS Cloudscape Design System** — Same component library used by AWS Console
- **Top navigation**: AWS logo, Route 53 title, search, theme toggle, account dropdown
- **Side navigation**: Section groups matching Route53 organization (DNS management, Traffic management, Configuration)
- **Breadcrumbs**: Auto-generated from route path
- **Modals**: Create/edit/delete with Cancel/Action footers
- **Tables**: Multi-select, search, filter, pagination, empty states
- **Typography**: Amazon Ember font stack, AWS console sizing

## Color Palette

### Light Mode

| Role | Color | Hex |
|---|---|---|
| Top nav / Side nav | Squid Ink | `#232f3e` |
| Page background | Light gray | `#f2f3f3` |
| Primary accent | AWS Blue | `#0972d3` |
| Accent hover | Dark blue | `#033160` |
| Active nav indicator | Left border | `#0972d3` |

### Dark Mode

| Role | Color | Hex |
|---|---|---|
| Top nav / Side nav | Dark slate | `#1a202c` |
| Content background | Deep gray-blue | `#202530` |
| Primary accent | Bright blue | `#44b4ff` |
| Accent hover | Light blue | `#7cc4ff` |
| Side nav text | Muted gray | `#a0a7b4` |

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

114 tests covering:
- **Auth** (19): Login, signup, refresh tokens, logout, token validation, duplicate prevention
- **Zones** (17): CRUD, search, pagination, delegation sets, duplicate detection, SOA/NS creation
- **Records** (~30): CRUD for all 9 types, batch operations, value validation, type filtering
- **Tags**: CRUD, batch retrieval, cascade on zone delete
- **Changes**: Status lifecycle (PENDING → INSYNC)
- **BIND**: Import parsing, export generation
- **Validation**: Record value format validation per type

## What's Mocked

- **Authentication** — Self-contained signup/login with JWT. No IAM roles, AWS Organizations, or SSO.
- **Dashboard, Traffic Policies, Health Checks, Resolver, Profiles** — Coming Soon placeholders with Route53 nav shell.
- **DNS routing policies** — Simple records only. No weighted, latency, failover, geolocation, or geoproximity routing.
- **Delegation sets** — Hardcoded name server list.
- **Health checks** — Not implemented (placeholder).
- **Billing / Pricing** — Not implemented.
- **Account management** — Account dropdown in top nav is placeholder (settings, support disabled).

## Scope Checklist

| Requirement | Status |
|---|---|
| Login | ✅ |
| Logout | ✅ |
| Signup | ✅ |
| Session persistence (JWT + refresh) | ✅ |
| Hosted zones: View, Search, Create, Edit, Delete | ✅ |
| DNS records: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA | ✅ |
| DNS records: View, Search, Create, Edit, Delete | ✅ |
| Navigation structure | ✅ |
| Tables, Forms, Search, Filters, Pagination | ✅ |
| Modals, Notifications | ✅ |
| Mocked sections placeholders | ✅ |
| BIND zone file import | ✅ |
| BIND / JSON zone file export | ✅ |
| Dark mode | ✅ |
| Keyboard shortcuts | ✅ |
| Bulk operations | ✅ |
| Route53-like UI (Cloudscape) | ✅ |

## Deployment

### Live Demo

| Component | URL |
|---|---|
| **Frontend** | [https://aws-route53-eight.vercel.app](https://aws-route53-eight.vercel.app) |
| **Backend** | [https://aws-route53-1-eerw.onrender.com](https://aws-route53-1-eerw.onrender.com/api/health) |

Login: `admin` / `admin123`

### Environment Variables

**Backend (Render)**

| Variable | Value |
|---|---|
| `SECRET_KEY` | Random string (generate one) |
| `CORS_ORIGINS` | `https://aws-route53-eight.vercel.app` |
| `DATABASE_URL` | `sqlite:////tmp/route53.db` |

**Frontend (Vercel)**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://aws-route53-1-eerw.onrender.com` |

### Deploy from Scratch

**Backend → Render**
1. Create a [Render](https://render.com) Web Service connected to your GitHub repo
2. Root directory: `backend/`
3. Runtime: Python 3 (detected via `runtime.txt`)
4. Build command: `pip install -r requirements.txt`
5. Start command: `python run.py`
6. Set the environment variables above
7. Deploy

**Frontend → Vercel**
1. Import your GitHub repo at [Vercel](https://vercel.com)
2. Root directory: `frontend/`
3. Framework: Next.js (auto-detected)
4. Set `NEXT_PUBLIC_API_URL` to your Render backend URL
5. Deploy

**Note on SQLite**: On Render's free tier, SQLite data lives in `/tmp` — it persists across requests and restarts, but resets on redeploy. The seed script auto-populates on first run, so the app is always functional.
