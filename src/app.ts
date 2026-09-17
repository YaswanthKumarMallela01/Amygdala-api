import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';
import { apiKeyMiddleware } from './middleware/api-key';
import { createRateLimiter } from './middleware/rate-limit';
import authRouter from './routes/v1/auth';

const app = express();

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(createRateLimiter());

// API key middleware for all /v1/auth routes
app.use('/v1/auth', apiKeyMiddleware, authRouter);

// Health check (no API key required)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Auth callback landing page for browser testing
app.get('/auth/callback', (_req, res) => {
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Amygdala - Authentication Successful</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #1e293b; border-radius: 16px; padding: 32px; max-width: 650px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; }
    .success-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-bottom: 16px; }
    h1 { margin: 0 0 8px; font-size: 24px; color: #fff; }
    p { margin: 0 0 24px; color: #94a3b8; font-size: 14px; line-height: 1.5; }
    .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #cbd5e1; margin-bottom: 6px; }
    .token-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; color: #38bdf8; word-break: break-all; max-height: 120px; overflow-y: auto; margin-bottom: 16px; }
    button { background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="success-badge">✓ Authenticated via OAuth</div>
    <h1>OAuth Login Successful! 🧠</h1>
    <p>Amygdala has verified your identity and issued RS256 Access & Refresh tokens.</p>
    
    <div class="label">Access Token (RS256 JWT, 15-min expiry)</div>
    <div class="token-box" id="accessToken">Loading...</div>

    <div class="label">Refresh Token (30-day expiry)</div>
    <div class="token-box" id="refreshToken">Loading...</div>

    <button onclick="navigator.clipboard.writeText(document.getElementById('accessToken').innerText); alert('Access token copied to clipboard!');">Copy Access Token</button>
  </div>

  <script>
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    document.getElementById('accessToken').innerText = accessToken || 'No access token found in URL hash';
    document.getElementById('refreshToken').innerText = refreshToken || 'No refresh token found in URL hash';
  </script>
</body>
</html>`);
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled exception');
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
