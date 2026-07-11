# Route 53 Clone

A functional clone of the AWS Route 53 web console built for the Scalar AI Labs assessment. Provides hosted zone and DNS record management with a Route 53-style UI, persistent SQLite storage, and a RESTful API.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (TypeScript, App Router) |
| UI Library | AWS Cloudscape Design System |
| Backend | FastAPI (Python) |
| Database | SQLite via SQLAlchemy |
| Auth | Mocked JWT-based (hardcoded `admin`/`admin123`) |
| Testing | pytest (backend), Vitest/Jest (frontend API client) |

## Architecture

```
┌─────────────┐     HTTP/JSON     ┌──────────────┐     SQL     ┌─────────┐
│  Next.js    │ ────────────────> │   FastAPI    │ ──────────> │ SQLite  │
│  (port 3000) │ <──────────────── │  (port 8000)  │ <────────── │  (file)  │
└─────────────┘                   └──────────────┘             └─────────┘
```

- Frontend is a single-page application with client-side routing
- Backend exposes a RESTful JSON API mapped to Route 53 concepts
- All data persists to a local `route53.db` SQLite file
- Auth uses JWT tokens stored in `localStorage`

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

The server starts at `http://localhost:8000`. On first run, it creates the SQLite database and seeds it with sample data (3 hosted zones, ~20 DNS records, an admin user).

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The app starts at `http://localhost:3000`.

### Login

| Username | Password |
|---|---|
| `admin` | `admin123` |

## Database Schema

### `users`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | UUID-style identifier |
| username | TEXT (UNIQUE) | Login username |
| password_hash | TEXT | bcrypt hash |
| created_at | TEXT | ISO 8601 timestamp |

### `hosted_zones`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | e.g. `Z1PA6795UKMFR9` |
| name | TEXT | Fully qualified domain name |
| caller_reference | TEXT (UNIQUE) | Idempotency token |
| comment | TEXT | Optional comment |
| private_zone | INTEGER | Boolean flag |
| resource_record_set_count | INTEGER | Cached count |
| created_at / updated_at | TEXT | Timestamps |

### `dns_records`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | UUID-style identifier |
| zone_id | TEXT (FK → hosted_zones) | Owning hosted zone |
| name | TEXT | Record name (FQDN) |
| type | TEXT | A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA |
| ttl | INTEGER | Time to live (seconds) |
| value | TEXT | JSON array of value strings |
| alias_target | TEXT (nullable) | JSON alias target config |
| created_at / updated_at | TEXT | Timestamps |

### `changes`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | e.g. `C1PA6795UKMFR9` |
| zone_id | TEXT (FK → hosted_zones) | Related zone |
| status | TEXT | `PENDING` or `INSYNC` |
| comment | TEXT | Optional comment |
| submitted_at | TEXT | Timestamp |

### `tags`
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | UUID-style identifier |
| resource_type | TEXT | `hostedzone` |
| resource_id | TEXT | ID of the resource |
| key | TEXT | Tag key (max 128 chars) |
| value | TEXT | Tag value (max 256 chars) |
| UNIQUE | (resource_type, resource_id, key) | |

## API Overview

All endpoints require `Authorization: Bearer <token>` header except `/api/auth/login`.

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user info |

### Hosted Zones

| Method | Path | Description |
|---|---|---|
| POST | `/api/zones` | Create hosted zone (auto-creates SOA + NS) |
| GET | `/api/zones` | List zones (`?search=&page=&size=`) |
| GET | `/api/zones/{id}` | Get zone details |
| PUT | `/api/zones/{id}` | Update zone comment |
| DELETE | `/api/zones/{id}` | Delete zone (blocked if non-SOA/NS records exist) |

### DNS Records

| Method | Path | Description |
|---|---|---|
| POST | `/api/zones/{zid}/records` | Batch change: CREATE, DELETE, UPSERT |
| GET | `/api/zones/{zid}/records` | List records (`?search=&type=&page=&size=`) |
| GET | `/api/zones/{zid}/records/{rid}` | Get single record |
| PUT | `/api/zones/{zid}/records/{rid}` | Update record |
| DELETE | `/api/zones/{zid}/records/{rid}` | Delete record |

### Tags

| Method | Path | Description |
|---|---|---|
| GET | `/api/zones/{id}/tags` | List tags for zone |
| POST | `/api/zones/{id}/tags` | Add/remove tags |
| POST | `/api/tags` | Batch get tags (up to 10 resources) |

### Changes

| Method | Path | Description |
|---|---|---|
| GET | `/api/changes/{id}` | Get change status |

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

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

## What's Mocked

- **Authentication** — single hardcoded user, JWT-based, no IAM/roles
- **Dashboard, Traffic Policies, Health Checks, Resolver, Profiles** — "Coming Soon" placeholders
- **DNS routing policies** — simple records only (no weighted, latency, failover, geolocation, etc.)
- **Delegation sets** — hardcoded name server list

## Deployment

### Frontend (Vercel)

1. Connect the GitHub repository to Vercel
2. Set `NEXT_PUBLIC_API_URL` to your deployed backend URL
3. Deploy from the `frontend/` directory

### Backend (Render)

1. Create a new Web Service on Render
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `python run.py`
4. Set environment variables:
   - `SECRET_KEY`: a random string
   - `CORS_ORIGINS`: your Vercel frontend URL
5. Enable a persistent disk for SQLite at `/data` and set `DATABASE_URL=sqlite:////data/route53.db`
