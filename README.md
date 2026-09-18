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

[Live API](https://amygdala-api-37nt.onrender.com) · [Test Dashboard](https://amygdala-api-37nt.onrender.com/test) · [JWKS](https://amygdala-api-37nt.onrender.com/v1/auth/.well-known/jwks.json)

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

### OAuth 2.1

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/auth/oauth/google` | API Key | Redirect to Google (PKCE) |
| `GET` | `/v1/auth/oauth/github` | API Key | Redirect to GitHub |
| `GET` | `/v1/auth/oauth/google/callback` | — | Google callback (public) |
| `GET` | `/v1/auth/oauth/github/callback` | — | GitHub callback (public) |

### User & Keys

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/auth/me` | API Key + Bearer | Get current user profile |
| `GET` | `/v1/auth/keys` | API Key + Bearer | List your API keys |
| `POST` | `/v1/auth/keys` | API Key + Bearer | Generate new API key (max 3) |
| `DELETE` | `/v1/auth/keys/:id` | API Key + Bearer | Delete an API key |

### Public

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/auth/.well-known/jwks.json` | — | RSA public key (JWKS format) |
| `GET` | `/health` | — | Health check |

---

### Endpoint Details

<details>
<summary><strong>POST /v1/auth/signup</strong></summary>

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "turnstileToken": "cf-turnstile-response"
}

// Response 200
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "a3f2c9d8...",
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

| Status | Error |
|---|---|
| `409` | Email already exists |
| `403` | Turnstile verification failed |
| `400` | Validation error |

</details>

<details>
<summary><strong>POST /v1/auth/login</strong></summary>

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "turnstileToken": "optional"
}

// Response 200 (no MFA)
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "a3f2c9d8...",
  "user": { "id": "uuid", "email": "user@example.com" }
}

// Response 200 (MFA enabled)
{
  "mfaRequired": true,
  "mfaToken": "eyJhbGci..."
}
```

When `mfaRequired` is `true`, call `/v1/auth/mfa/verify` with the `mfaToken` as the Bearer token.

</details>

<details>
<summary><strong>POST /v1/auth/refresh</strong></summary>

```json
// Request
{ "refreshToken": "a3f2c9d8..." }

// Response 200
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "new-b4e5f6..."
}
```

Uses **reuse detection** — presenting a revoked token revokes the entire token family.

</details>

<details>
<summary><strong>POST /v1/auth/mfa/enroll</strong> — Requires Bearer token</summary>

```json
// Response 200
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "uri": "otpauth://totp/Amygdala:user@example.com?secret=..."
}
```

</details>

<details>
<summary><strong>POST /v1/auth/mfa/verify</strong></summary>

Dual purpose depending on the token type in the `Authorization` header:

| Token Type | Result |
|---|---|
| Regular access token (after `/mfa/enroll`) | `{ "message": "MFA enabled successfully" }` |
| MFA token (from login) | `{ "accessToken": "...", "refreshToken": "..." }` |

```json
// Request
{ "code": "123456" }
```

</details>

<details>
<summary><strong>GET /v1/auth/me</strong> — Requires Bearer token</summary>

```json
// Response 200
{
  "id": "uuid",
  "email": "user@example.com",
  "email_verified": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

</details>

<details>
<summary><strong>API Key Management</strong> — Requires Bearer token</summary>

**POST /v1/auth/keys** — Generate (max 3 per account):
```json
// Request
{ "name": "My App", "allowedOrigins": ["https://myapp.com"] }

// Response 201
{
  "apiKey": "shown-once-only",
  "key": { "id": "uuid", "name": "My App", "allowed_origins": [...], "created_at": "..." },
  "message": "API Key generated successfully. Save this key now; it will not be displayed again."
}
```

**GET /v1/auth/keys** — List all keys.

**DELETE /v1/auth/keys/:id** — Delete a key.

</details>

---

## Integration Guide

### For Frontend Developers

**Step 1 — Add your API key to every request:**
```javascript
const API_URL = 'https://amygdala-api-37nt.onrender.com';
const API_KEY = 'your-api-key';

const res = await fetch(`${API_URL}/v1/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
  body: JSON.stringify({ email, password }),
});
```

**Step 2 — Store tokens:**
```javascript
const { accessToken, refreshToken } = await res.json();
// accessToken → sessionStorage or memory (15-min expiry)
// refreshToken → localStorage or secure cookie (30-day expiry)
```

**Step 3 — Call protected endpoints:**
```javascript
const me = await fetch(`${API_URL}/v1/auth/me`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'x-api-key': API_KEY,
  },
});
```

**Step 4 — Auto-refresh on 401:**
```javascript
// When you get a 401, call /v1/auth/refresh with the stored refreshToken
// Replace both tokens with the new pair
```

### For Backend Developers — Verify JWTs Locally

Fetch the JWKS and verify tokens without calling the API:

```javascript
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const client = jwksClient({
  jwksUri: 'https://amygdala-api-37nt.onrender.com/v1/auth/.well-known/jwks.json'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    callback(null, key.getPublicKey());
  });
}

jwt.verify(token, getKey, { algorithms: ['RS256'], issuer: 'amygdala' }, (err, decoded) => {
  if (err) return console.error('Invalid token');
  console.log('User ID:', decoded.sub);
  console.log('Email:', decoded.email);
});
```

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
│   │       └── 002_add_user_id_to_api_clients.sql
│   ├── middleware/
│   │   ├── api-key.ts              # x-api-key validation + per-client CORS
│   │   ├── auth.ts                 # Bearer JWT verification
│   │   ├── rate-limit.ts           # Redis-backed rate limiting
│   │   ├── turnstile.ts            # Cloudflare Turnstile verification
│   │   └── validate.ts             # Zod request body validation
│   ├── routes/v1/auth/
│   │   ├── index.ts                # Route registration
│   │   ├── signup.ts               # POST /signup
│   │   ├── login.ts                # POST /login
│   │   ├── refresh.ts              # POST /refresh
│   │   ├── logout.ts               # POST /logout
│   │   ├── forgot-password.ts      # POST /forgot-password
│   │   ├── reset-password.ts       # POST /reset-password
│   │   ├── me.ts                   # GET /me
│   │   ├── keys.ts                 # GET/POST/DELETE /keys
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

