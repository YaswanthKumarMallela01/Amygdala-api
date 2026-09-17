# Amygdala 🧠

> **Production-grade Authentication-as-a-Service API** — Multi-tenant auth with JWTs, refresh token rotation, OAuth 2.1 (Google & GitHub with PKCE), TOTP MFA, Cloudflare Turnstile bot protection, and Redis-backed rate limiting.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Language | TypeScript (CommonJS) |
| Framework | Express 4.x |
| Database | PostgreSQL (Supabase-hosted) |
| Cache/Rate-limit | Redis (Upstash) |
| Password Hashing | Argon2id |
| JWT | RS256 (jsonwebtoken + Node crypto) |
| OAuth | Google & GitHub with PKCE |
| MFA | TOTP via otplib (RFC 6238) |
| Email | Resend |
| Bot Protection | Cloudflare Turnstile |
| Validation | Zod |
| Logging | Pino (structured JSON) |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YaswanthKumarMallela01/Amygdala-api.git
cd Amygdala-api
npm install
```

### 2. Generate RSA Keypair

```bash
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

### 4. Run Database Migration

```bash
npm run migrate
```

### 5. Create Your First API Client

```bash
npm run create-client -- --name "My App" --origins "http://localhost:3000,https://myapp.com"
```

> ⚠️ **Save the API key** — it's shown only once and stored as a one-way hash.

### 6. Start the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

---

## Environment Variables

All 14 variables are **required** (none hardcoded). See the implementation plan for step-by-step instructions on obtaining each one.

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://postgres.ref:pw@pooler.supabase.com:6543/postgres` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret | `GOCSPX-xxxxx` |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL | `https://api.example.com/v1/auth/oauth/google/callback` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | `xxxxx` |
| `GITHUB_REDIRECT_URI` | GitHub OAuth callback URL | `https://api.example.com/v1/auth/oauth/github/callback` |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key | `0x4AAAAAAA...` |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key | `0x4AAAAAAA...` |
| `RESEND_API_KEY` | Resend email service API key | `re_xxxxx` |
| `JWT_PRIVATE_KEY` | RS256 private key (PEM format, `\n` for newlines) | `-----BEGIN PRIVATE KEY-----\nMIIE...` |
| `JWT_PUBLIC_KEY` | RS256 public key (PEM format) | `-----BEGIN PUBLIC KEY-----\nMIIB...` |
| `REDIS_URL` | Upstash Redis connection string | `rediss://default:xxx@us1-xxx.upstash.io:6379` |
| `APP_BASE_URL` | Your frontend's base URL | `https://myapp.com` |
| `PORT` | Server port (optional, default 3000) | `3000` |

---

## API Endpoints

All endpoints require the `x-api-key` header.

### Authentication

#### POST `/v1/auth/signup`
Create a new account.
```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "turnstileToken": "cf-turnstile-response-token"
}

// Response 200
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "a3f2c9d8...",
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

#### POST `/v1/auth/login`
Authenticate with email and password.
```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "turnstileToken": "optional-unless-3-failed-attempts"
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

#### POST `/v1/auth/refresh`
Rotate refresh token. Uses reuse detection — if a revoked token is presented, the entire token family is revoked (theft signal).
```json
// Request
{ "refreshToken": "a3f2c9d8..." }

// Response 200
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "new-b4e5f6..."
}
```

#### POST `/v1/auth/logout`
Revoke a refresh token.
```json
// Request
{ "refreshToken": "a3f2c9d8..." }

// Response 200
{ "message": "Logged out successfully" }
```

### Password Reset

#### POST `/v1/auth/forgot-password`
Always returns a generic success message (prevents email enumeration).
```json
// Request
{ "email": "user@example.com" }

// Response 200 (always)
{ "message": "If an account with that email exists, a password reset link has been sent." }
```

#### POST `/v1/auth/reset-password`
Reset password using the token from the email link.
```json
// Request
{ "token": "raw-256-bit-token", "newPassword": "newSecurePassword" }

// Response 200
{ "message": "Password reset successfully" }
```

### MFA (TOTP)

#### POST `/v1/auth/mfa/enroll`
Generate a TOTP secret. Requires Bearer access token.
```json
// Response 200
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "uri": "otpauth://totp/Amygdala:user@example.com?secret=..."
}
```

#### POST `/v1/auth/mfa/verify`
Verify TOTP code. Dual purpose:
- **Enrollment confirmation** (Bearer access token): confirms MFA setup
- **Login verification** (MFA token from login): issues full tokens

```json
// Request
{ "code": "123456" }

// Response 200 (enrollment)
{ "message": "MFA enabled successfully" }

// Response 200 (login verification)
{ "accessToken": "eyJhbGci...", "refreshToken": "b4e5f6..." }
```

### OAuth 2.1

#### GET `/v1/auth/oauth/google`
Redirects to Google with PKCE challenge. After user consents, callback handles token exchange.

#### GET `/v1/auth/oauth/github`
Redirects to GitHub with state parameter. After user authorizes, callback handles token exchange.

Both callbacks redirect to `{APP_BASE_URL}/auth/callback#access_token=...&refresh_token=...`

### User Info

#### GET `/v1/auth/me`
Returns current user info. Requires Bearer access token.
```json
// Response 200
{
  "id": "uuid",
  "email": "user@example.com",
  "email_verified": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### JWKS

#### GET `/v1/auth/.well-known/jwks.json`
Returns the public key in JWKS format for local JWT verification.
```json
{
  "keys": [{
    "kty": "RSA",
    "n": "...",
    "e": "AQAB",
    "alg": "RS256",
    "use": "sig",
    "kid": "amygdala-key-1"
  }]
}
```

---

## Integration Guide for Third-Party Developers

### Step 1: Register Your Application
Ask the Amygdala admin to run:
```bash
npm run create-client -- --name "Your App" --origins "https://yourapp.com"
```
You'll receive a one-time API key.

### Step 2: Add API Key to All Requests
```http
x-api-key: your-api-key-here
Content-Type: application/json
```

### Step 3: Verify JWTs Locally (Recommended)
Fetch the JWKS from `/v1/auth/.well-known/jwks.json` and verify tokens locally in your backend:

```javascript
// Node.js example using jsonwebtoken + jwks-rsa
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const client = jwksClient({ jwksUri: 'https://your-amygdala.onrender.com/v1/auth/.well-known/jwks.json' });

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

### Alternative: Call `/v1/auth/me`
If you don't want to verify JWTs locally, call the `/v1/auth/me` endpoint with the access token:
```http
GET /v1/auth/me
Authorization: Bearer <access-token>
x-api-key: <your-api-key>
```

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | Argon2id (memory=64MB, time=3, parallelism=4) |
| JWT signing | RS256 with 2048-bit RSA keypair |
| Access tokens | 15-minute expiry |
| Refresh tokens | 30-day expiry, SHA-256 hashed storage |
| Token rotation | Family-based reuse detection (revokes all on reuse) |
| OAuth | Authorization Code + PKCE (S256) |
| MFA | TOTP (RFC 6238) with QR code enrollment |
| Bot protection | Cloudflare Turnstile (always on signup, conditional on login) |
| Rate limiting | Redis-backed sliding window (100 req/15min default) |
| Input validation | Zod schemas on every request body |
| Security headers | helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| API key auth | SHA-256 hashed, per-client CORS origins |
| Logging | Pino structured JSON (never logs passwords/tokens) |

---

## Render Deployment

### Option A: Docker (Recommended)
1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo: `YaswanthKumarMallela01/Amygdala-api`
3. Settings:
   - **Environment**: Docker
   - **Docker Build Context**: `.`
4. Add all env vars in the **Environment** tab
5. Deploy

### Option B: Node.js
1. Same as above, but select **Node** environment
2. **Build Command**: `npm ci && npm run build`
3. **Start Command**: `npm run migrate && npm start`

### Post-Deploy
After deploying, run the migration and create your first API client:
```bash
# Using Render Shell or locally with DATABASE_URL pointing to production
npm run migrate
npm run create-client -- --name "Production App" --origins "https://yourapp.com"
```

---

## Project Structure

```
amygdala/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express app setup
│   ├── config/env.ts         # Zod-validated env vars
│   ├── db/
│   │   ├── client.ts         # PostgreSQL pool
│   │   ├── migrate.ts        # Migration runner
│   │   └── migrations/001_initial.sql
│   ├── middleware/
│   │   ├── api-key.ts        # x-api-key + per-client CORS
│   │   ├── auth.ts           # Bearer token verification
│   │   ├── rate-limit.ts     # Redis-backed rate limiting
│   │   ├── turnstile.ts      # Cloudflare Turnstile
│   │   └── validate.ts       # Zod request validation
│   ├── routes/v1/auth/       # All 14 endpoints
│   ├── services/             # Business logic
│   ├── types/index.ts        # TypeScript interfaces
│   └── utils/                # Crypto, logging helpers
├── scripts/create-api-client.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

## License

MIT
