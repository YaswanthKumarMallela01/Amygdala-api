<div align="center">

# 🧠 Amygdala

**Production-grade Authentication-as-a-Service API**

Multi-tenant auth with JWTs, refresh token rotation, OAuth 2.1, TOTP MFA,
Cloudflare Turnstile bot protection, and Redis-backed rate limiting.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis&logoColor=white)](https://upstash.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-YaswanthKumarMallela01%2FAmygdala--api-181717?logo=github&logoColor=white)](https://github.com/YaswanthKumarMallela01/Amygdala-api)

[Live API](https://amygdala-api-37nt.onrender.com) · [Test Dashboard](https://amygdala-api-37nt.onrender.com/test) · [JWKS](https://amygdala-api-37nt.onrender.com/v1/auth/.well-known/jwks.json) · [GitHub Repo](https://github.com/YaswanthKumarMallela01/Amygdala-api)

</div>

---

## What is Amygdala?

Amygdala is a **drop-in authentication backend** that you plug into any frontend or mobile app. Instead of building auth from scratch, you:

1. Get an **API key** (via the dashboard or CLI)
2. Send `x-api-key` on every request
3. Get back **RS256 JWTs** and **rotating refresh tokens**

It handles signup, login, OAuth (Google & GitHub with PKCE), TOTP MFA, password reset, token rotation with theft detection, and bot protection — so you don't have to.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 18+ |
| **Language** | TypeScript |
| **Framework** | Express 4.x |
| **Database** | PostgreSQL (Supabase) |
| **Cache / Rate Limiting** | Redis (Upstash) |
| **Password Hashing** | Argon2id |
| **JWT** | RS256 — 2048-bit RSA, 15-min access tokens |
| **OAuth** | Google (PKCE / S256) & GitHub |
| **MFA** | TOTP (RFC 6238) via `otplib` |
| **Email** | Resend |
| **Bot Protection** | Cloudflare Turnstile |
| **Validation** | Zod |
| **Logging** | Pino (structured JSON) |

---

## Quick Start

### 1 · Clone & Install

```bash
git clone https://github.com/YaswanthKumarMallela01/Amygdala-api.git
cd Amygdala-api
npm install
```

### 2 · Generate RSA Keypair

```bash
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem
```

### 3 · Configure Environment

```bash
cp .env.example .env
# Fill in all values — see the Environment Variables section below
```

### 4 · Run Database Migration

```bash
npm run migrate
```

### 5 · Create Your First API Client

```bash
npm run create-client -- --name "My App" --origins "http://localhost:3000,https://myapp.com"
```

> [!WARNING]
> **Save the API key immediately** — it's displayed once and stored as a one-way SHA-256 hash. There is no way to retrieve it later.

### 6 · Start the Server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

---

## Environment Variables

Copy `.env.example` → `.env` and fill in every value. All variables are **required** (none hardcoded).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App secret |
| `GITHUB_REDIRECT_URI` | GitHub OAuth callback URL |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `RESEND_API_KEY` | Resend email API key |
| `SMTP_USER` | Gmail address for high-deliverability SMTP (avoids spam) |
| `SMTP_PASS` | Gmail App Password (16 characters) |
| `EMAIL_FROM` | Sender address (e.g. `Amygdala Security <your_email@gmail.com>`) |
| `JWT_PRIVATE_KEY` | RS256 private key (PEM, use `\\n` for newlines) |
| `JWT_PUBLIC_KEY` | RS256 public key (PEM) |
| `REDIS_URL` | Upstash Redis connection string |
| `APP_BASE_URL` | Your frontend's base URL |
| `PORT` | Server port (default: `3000`) |

---

## API Reference

> **Base URL:** `https://amygdala-api-37nt.onrender.com`
>
> All `/v1/auth/*` endpoints require the `x-api-key` header unless noted otherwise.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/auth/signup` | API Key | Create account (Turnstile required) |
| `POST` | `/v1/auth/login` | API Key | Login (Turnstile conditional after 3 failures) |
| `POST` | `/v1/auth/refresh` | API Key | Rotate refresh token → new token pair |
| `POST` | `/v1/auth/logout` | API Key | Revoke a refresh token |

### Password Reset

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/auth/forgot-password` | API Key | Send reset email (generic response, no enumeration) |
| `POST` | `/v1/auth/reset-password` | API Key | Reset password with email token |

### MFA (TOTP)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/auth/mfa/enroll` | API Key + Bearer | Generate TOTP secret & QR code |
| `POST` | `/v1/auth/mfa/verify` | API Key + Bearer | Confirm enrollment OR complete MFA login |
| `DELETE` | `/v1/auth/mfa/enroll` | API Key + Bearer | Disable TOTP two-factor authentication |

### OAuth 2.1

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/auth/oauth/google` | API Key | Redirect to Google (PKCE, extracts name & email) |
| `GET` | `/v1/auth/oauth/github` | API Key | Redirect to GitHub (extracts name & email) |
| `GET` | `/v1/auth/oauth/google/callback` | — | Google callback (public) |
| `GET` | `/v1/auth/oauth/github/callback` | — | GitHub callback (public) |

### Multi-Tenant User & Session Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/auth/projects/:id/users` | API Key + Bearer | List all users scoped to an API key/project |
| `GET` | `/v1/auth/projects/:id/sessions` | API Key + Bearer | List login sessions for a project |
| `DELETE` | `/v1/auth/projects/:id/sessions/:sessionId` | API Key + Bearer | Revoke a specific login session |
| `GET` | `/v1/auth/projects/:id/stats` | API Key + Bearer | Get aggregate stats (total users, active sessions, logins today) |

</details>

---

## Multi-Tenant Architecture

Amygdala supports **per-API-key user isolation** — each API key acts as its own tenant, with its own isolated user pool and login session tracking.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Developer Account (you)                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  API Key #1   │  │  API Key #2   │  │  API Key #3   │     │
│  │  (Prod App)   │  │  (Staging)    │  │  (Mobile)     │     │
│  │  ┌─────────┐  │  │  ┌─────────┐  │  │  ┌─────────┐  │   │
│  │  │ Users   │  │  │  │ Users   │  │  │  │ Users   │  │   │
│  │  │ alice@  │  │  │  │ alice@  │  │  │  │ bob@    │  │   │
│  │  │ bob@    │  │  │  │ charlie@│  │  │  │ dave@   │  │   │
│  │  └─────────┘  │  │  └─────────┘  │  │  └─────────┘  │   │
│  │  ┌─────────┐  │  │  ┌─────────┐  │  │  ┌─────────┐  │   │
│  │  │Sessions │  │  │  │Sessions │  │  │  │Sessions │  │   │
│  │  └─────────┘  │  │  └─────────┘  │  │  └─────────┘  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

- **Same email, different projects**: `alice@example.com` can sign up independently in API Key #1 and API Key #2 — they're treated as separate users with separate credentials.
- **Login sessions tracked per project**: Every login through your API key creates a `tenant_login_sessions` record with IP address, device info, timestamps, and status.
- **Ownership-verified access**: Only the developer who created the API key can view its users and sessions (via Bearer token ownership check against `api_clients.user_id`).
- **Session revocation**: Developers can revoke individual login sessions in real-time.

### Viewing Your App's Users & Sessions

```javascript
// List all users who signed up via your API key
const users = await fetch(`${API_URL}/v1/auth/projects/${apiKeyId}/users`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'x-api-key': API_KEY,
  },
});

// List login sessions
const sessions = await fetch(`${API_URL}/v1/auth/projects/${apiKeyId}/sessions`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'x-api-key': API_KEY,
  },
});

// Revoke a suspicious session
await fetch(`${API_URL}/v1/auth/projects/${apiKeyId}/sessions/${sessionId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'x-api-key': API_KEY,
  },
});
```

### Database Schema

The multi-tenant isolation adds:

| Table | Purpose |
|---|---|
| `users.client_id` | Nullable FK → `api_clients.id`. NULL for developer/master accounts. Scopes user to a specific API key tenant. |
| `tenant_login_sessions` | Records every login event with `client_id`, `user_id`, `user_email`, `ip_address`, `device_info`, `status` (active/expired/revoked), and timestamps. |
| Unique Constraint | `UNIQUE(COALESCE(client_id, nil_uuid), email)` — same email can exist in different projects. |

---

## Security

| Feature | Implementation |
|---|---|
| Password hashing | Argon2id (64 MB memory, time cost 3, parallelism 4) |
| JWT signing | RS256 with 2048-bit RSA |
| Access tokens | 15-minute expiry |
| Refresh tokens | 30-day expiry, SHA-256 hashed storage |
| Token rotation | Family-based reuse detection (revokes all on reuse) |
| OAuth | Authorization Code + PKCE (S256) for Google |
| MFA | TOTP (RFC 6238) with QR enrollment |
| Bot protection | Cloudflare Turnstile (always on signup, conditional on login) |
| Rate limiting | Redis-backed sliding window (100 req / 15 min) |
| Input validation | Zod schemas on every request body |
| Security headers | helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| API key auth | SHA-256 hashed, per-client CORS origins |
| Tenant isolation | Per-API-key user pools, ownership-verified data access |
| Logging | Pino structured JSON (never logs passwords/tokens) |

---

## Deployment

### Render (Docker — Recommended)

1. Create a **Web Service** on [render.com](https://render.com)
2. Connect repo: `YaswanthKumarMallela01/Amygdala-api`
3. Set **Environment** to Docker, **Build Context** to `.`
4. Add all env vars in the **Environment** tab
5. Deploy

### Render (Node.js)

- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npm run migrate && npm start`

### Post-Deploy

```bash
npm run migrate
npm run create-client -- --name "Production App" --origins "https://yourapp.com"
```

---

## Project Structure

```
amygdala/
├── src/
│   ├── index.ts                    # Entry point — starts server
│   ├── app.ts                      # Express app, middleware, routes
│   ├── config/
│   │   └── env.ts                  # Zod-validated environment config
│   ├── db/
│   │   ├── client.ts               # PostgreSQL connection pool
│   │   ├── migrate.ts              # Migration runner
│   │   └── migrations/
│   │       ├── 001_initial.sql     # Core schema
│   │       ├── 002_add_user_id_to_api_clients.sql
│   │       ├── 003_add_name_to_users.sql
│   │       └── 004_multi_tenant_partition.sql  # Multi-tenant isolation
│   ├── middleware/
│   │   ├── api-key.ts              # x-api-key validation + per-client CORS
│   │   ├── auth.ts                 # Bearer JWT verification
│   │   ├── rate-limit.ts           # Redis-backed rate limiting
│   │   ├── turnstile.ts            # Cloudflare Turnstile verification
│   │   └── validate.ts             # Zod request body validation
│   ├── routes/v1/auth/
│   │   ├── index.ts                # Route registration
│   │   ├── signup.ts               # POST /signup (tenant-scoped)
│   │   ├── login.ts                # POST /login (tenant-scoped + session tracking)
│   │   ├── refresh.ts              # POST /refresh
│   │   ├── logout.ts               # POST /logout
│   │   ├── forgot-password.ts      # POST /forgot-password
│   │   ├── reset-password.ts       # POST /reset-password
│   │   ├── me.ts                   # GET /me
│   │   ├── keys.ts                 # GET/POST/DELETE /keys
│   │   ├── projects.ts             # GET/DELETE /projects/:id/* (tenant management)
│   │   ├── jwks.ts                 # GET /.well-known/jwks.json
│   │   ├── mfa/
│   │   │   ├── enroll.ts           # POST /mfa/enroll
│   │   │   └── verify.ts          # POST /mfa/verify
│   │   └── oauth/
│   │       ├── google.ts           # Google OAuth + PKCE
│   │       └── github.ts           # GitHub OAuth
│   ├── services/
│   │   ├── jwt.service.ts          # Sign/verify JWTs, JWKS export
│   │   ├── token.service.ts        # Refresh token create/rotate/revoke
│   │   ├── password.service.ts     # Argon2id hash/verify
│   │   ├── email.service.ts        # Resend email templates
│   │   ├── redis.service.ts        # Redis client + login attempt tracking
│   │   ├── turnstile.service.ts    # Turnstile token verification
│   │   └── oauth/
│   │       ├── google.service.ts   # Google token exchange
│   │       └── github.service.ts   # GitHub token exchange
│   ├── types/index.ts              # TypeScript interfaces
│   └── utils/
│       ├── crypto.ts               # Token generation, hashing, PKCE
│       └── logger.ts               # Pino logger config
├── scripts/
│   └── create-api-client.ts        # CLI to create API clients
├── test-client.html                # Built-in auth test dashboard
├── Dockerfile                      # Multi-stage Docker build
├── package.json
└── tsconfig.json
```

---

## License

MIT


