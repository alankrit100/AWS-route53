# Route 53 Clone

A functional clone of the AWS Route 53 web console. Provides hosted zone and DNS record management with a Route 53-style UI (Cloudscape Design System), persistent SQLite storage, and a RESTful API.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (TypeScript, App Router) |
| UI Library | AWS Cloudscape Design System |
| Backend | FastAPI (Python) |
| Database | SQLite via SQLAlchemy |
| Auth | Mocked JWT-based (hardcoded `admin`/`admin123`) |
| Testing | pytest (100 tests, backend) |

## Architecture

```
┌─────────────┐     HTTP/JSON     ┌──────────────┐     SQL     ┌─────────┐
│  Next.js    │ ────────────────> │   FastAPI    │ ──────────> │ SQLite  │
│  (port 3000) │ <──────────────── │  (port 8000)  │ <────────── │  (file)  │
└─────────────┘                   └──────────────┘             └─────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Server starts at `http://localhost:8000`. On first run it creates `route53.db` and seeds 3 sample zones, ~20 records, and the admin user.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

App starts at `http://localhost:3000`.

### Login

| Username | Password |
|---|---|
| `admin` | `admin123` |

## Features

### Authentication
- JWT-based session with localStorage persistence
- Hardcoded single user (mocked IAM)
- Protected routes redirect to `/login`

### Hosted Zones
- Full CRUD: create, view, search, edit comment, delete
- Zone creation auto-generates SOA + 4 NS records
- Deletion blocked if non-essential records exist (matches Route53 behavior)
- Search by domain name, pagination
- Public/private type filter

### DNS Records
- Full CRUD with batch CREATE/DELETE/UPSERT support
- 9 record types: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA
- Filter by type, search by name, pagination
- Type-aware form (placeholder text changes per record type)
- SOA/NS deletion protection

### Tags
- Add/remove tags on hosted zones
- Max 10 tags per resource, key ≤128 chars, value ≤256 chars
- Batch tag retrieval

### Changes
- Every mutation creates a Change with PENDING status
- GET `/api/changes/{id}` to poll status

### Dark Mode
- Toggle in top navigation bar (☾/☀)
- Persisted to localStorage
- Uses Cloudscape's built-in dark mode for components
- Custom dark palette: nav `#0f141a`, content `#16191f`, borders `#3a3e45`

### Mocked Sections
Dashboard, Health Checks, Traffic Policies, Resolver, Profiles — each shows a "Coming Soon" page within the Route53 nav shell.

## Database Schema

### `users`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | UUID-style |
| username | TEXT (UNIQUE) | Login username |
| password_hash | TEXT | bcrypt hash |
| created_at | TEXT | ISO 8601 |

### `hosted_zones`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | e.g. `Z1PA6795UKMFR9` |
| name | TEXT | FQDN |
| caller_reference | TEXT (UNIQUE) | Idempotency token |
| comment | TEXT | Optional comment |
| private_zone | INTEGER | Boolean |
| resource_record_set_count | INTEGER | Cached count |
| created_at / updated_at | TEXT | Timestamps |

### `dns_records`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | UUID-style |
| zone_id | TEXT (FK) | FK → hosted_zones ON DELETE CASCADE |
| name | TEXT | FQDN |
| type | TEXT | A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA |
| ttl | INTEGER | Seconds |
| value | TEXT | JSON array of values |
| alias_target | TEXT | Nullable JSON |
| created_at / updated_at | TEXT | Timestamps |

### `changes`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | e.g. `C1PA6795UKMFR9` |
| zone_id | TEXT (FK) | FK → hosted_zones ON DELETE CASCADE |
| status | TEXT | PENDING or INSYNC |
| comment | TEXT | Optional |
| submitted_at | TEXT | ISO 8601 |

### `tags`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | UUID-style |
| resource_type | TEXT | `hostedzone` |
| resource_id | TEXT | Resource ID |
| key | TEXT | Max 128 chars |
| value | TEXT | Max 256 chars |
| UNIQUE | (resource_type, resource_id, key) | |

## API Overview

All endpoints require `Authorization: Bearer <token>` except `/api/auth/login`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

### Hosted Zones
| Method | Path | Description |
|---|---|---|
| POST | `/api/zones` | Create zone (auto-creates SOA + NS) |
| GET | `/api/zones` | List zones (`?search=&page=&size=&type=`) |
| GET | `/api/zones/{id}` | Get zone details |
| PUT | `/api/zones/{id}` | Update comment |
| DELETE | `/api/zones/{id}` | Delete (blocked if non-essential records exist) |

### DNS Records
| Method | Path | Description |
|---|---|---|
| POST | `/api/zones/{zid}/records` | Batch CREATE/DELETE/UPSERT |
| GET | `/api/zones/{zid}/records` | List (`?search=&type=&page=&size=`) |
| GET | `/api/zones/{zid}/records/{rid}` | Get single record |
| PUT | `/api/zones/{zid}/records/{rid}` | Update record |
| DELETE | `/api/zones/{zid}/records/{rid}` | Delete record |

### Tags
| Method | Path | Description |
|---|---|---|
| GET | `/api/zones/{id}/tags` | List tags |
| POST | `/api/zones/{id}/tags` | Add/remove tags |
| POST | `/api/tags` | Batch get (≤10 resources) |

### Changes
| Method | Path | Description |
|---|---|---|
| GET | `/api/changes/{id}` | Get change status (PENDING/INSYNC) |

## Supported Record Types

| Type | Value Format | Example |
|---|---|---|
| A | IPv4 address | `192.168.1.1` |
| AAAA | IPv6 address | `2001:db8::1` |
| CNAME | FQDN | `target.example.com.` |
| TXT | Text string | `"v=spf1 include:_spf.google.com ~all"` |
| MX | Priority + domain | `10 mail.example.com.` |
| NS | FQDN | `ns1.example.com.` |
| PTR | FQDN | `host.example.com.` |
| SRV | Priority Weight Port Target | `0 10 80 svc.example.com.` |
| CAA | Flags Tag Value | `0 issue "letsencrypt.org"` |

## Color Palette

### Light Mode
| Role | Color | Hex |
|---|---|---|
| Top nav / Side nav | Squid Ink | `#232f3e` |
| Page background | Light gray | `#f2f3f3` |
| Primary accent | AWS Blue | `#0972d3` |
| Accent hover | Dark blue | `#033160` |
| Active nav indicator | 3px left border | `#0972d3` |

### Dark Mode
| Role | Color | Hex |
|---|---|---|
| Top nav / Side nav | Darker navy | `#0f141a` |
| Content background | Very dark | `#16191f` |
| Borders | Medium dark | `#3a3e45` |
| Accent (bright) | AWS Blue | `#539fe5` |
| Accent hover | AWS Blue mid | `#0972d3` |

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

100 tests covering auth, zones, records (all 9 types), tags, changes, and value validation.

## What's Mocked

- **Authentication** — single hardcoded user (`admin`/`admin123`), no IAM/roles
- **Dashboard, Traffic Policies, Health Checks, Resolver, Profiles** — Coming Soon placeholders
- **DNS routing policies** — simple records only (no weighted, latency, failover, geolocation)
- **Delegation sets** — hardcoded name server list

## Deployment

### Frontend (Vercel)
1. Connect the GitHub repository to Vercel
2. Set `NEXT_PUBLIC_API_URL` to your deployed backend URL
3. Deploy from the `frontend/` directory

### Backend (Render)
1. Create a new Web Service
2. Build command: `pip install -r requirements.txt`
3. Start command: `cd backend && python run.py`
4. Environment variables:
   - `SECRET_KEY`: random string
   - `CORS_ORIGINS`: your Vercel frontend URL
   - `DATABASE_URL`: `sqlite:////data/route53.db`
5. Enable persistent disk at `/data` (1 GB)
