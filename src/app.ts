import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import path from 'path';
import fs from 'fs';
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

// Favicon handler
app.get(['/favicon.ico', '/fevicon.png'], (_req, res) => {
  const p = path.join(process.cwd(), 'fevicon.png');
  if (fs.existsSync(p)) return res.sendFile(p);
  const alt = path.join(__dirname, '../fevicon.png');
  if (fs.existsSync(alt)) return res.sendFile(alt);
  res.status(204).end();
});

// Helper to serve test dashboard
function serveTestDashboard(_req: express.Request, res: express.Response) {
  const filePath = path.join(__dirname, '../test-client.html');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  // Fallback if running from root or dist
  const rootPath = path.join(process.cwd(), 'test-client.html');
  if (fs.existsSync(rootPath)) {
    return res.sendFile(rootPath);
  }
  res.status(404).send('test-client.html not found');
}

// Serve Test Authentication Dashboard at root and /test
app.get('/', serveTestDashboard);
app.get('/test', serveTestDashboard);

// Auth callback landing page for OAuth redirects
app.get('/auth/callback', (_req, res) => {
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Amygdala - Authentication Successful</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #111827; border-radius: 16px; padding: 32px; max-width: 650px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #1f293d; }
    .success-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 16px; border: 1px solid rgba(52, 211, 153, 0.3); }
    h1 { margin: 0 0 8px; font-size: 24px; color: #fff; }
    p { margin: 0 0 20px; color: #9ca3af; font-size: 14px; line-height: 1.5; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #cbd5e1; margin-bottom: 6px; }
    .token-box { background: #060910; border: 1px solid #1f293d; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; color: #38bdf8; word-break: break-all; max-height: 110px; overflow-y: auto; margin-bottom: 14px; }
    .actions { display: flex; gap: 10px; margin-top: 10px; }
    .btn { background: #6366f1; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
    .btn:hover { background: #4f46e5; }
    .btn-sec { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
    .btn-sec:hover { background: #2d3e56; }
  </style>
</head>
<body>
  <div class="card">
    <div class="success-badge">✓ Authenticated via OAuth 2.1 (PKCE)</div>
    <h1>Authentication Successful! 🧠</h1>
    <p>Identity confirmed. Tokens have been saved to your session and are ready to use.</p>
    
    <div class="label">RS256 Access Token (15-min expiry)</div>
    <div class="token-box" id="accessToken">Extracting...</div>

    <div class="label">Refresh Token (30-day expiry)</div>
    <div class="token-box" id="refreshToken">Extracting...</div>

    <div class="actions">
      <a href="/" class="btn">Open Auth Test Dashboard &rarr;</a>
      <button class="btn btn-sec" onclick="copyToken()">Copy Access Token</button>
    </div>
  </div>

  <script>
    function parseTokens() {
      const hash = window.location.hash ? window.location.hash.substring(1) : '';
      const params = new URLSearchParams(hash);
      const at = params.get('access_token');
      const rt = params.get('refresh_token');

      const atEl = document.getElementById('accessToken');
      const rtEl = document.getElementById('refreshToken');

      if (at) {
        atEl.innerText = at;
        try { localStorage.setItem('amygdala_access_token', at); } catch(e) {}
      } else {
        atEl.innerText = 'No access token found in URL hash.';
      }

      if (rt) {
        rtEl.innerText = rt;
        try { localStorage.setItem('amygdala_refresh_token', rt); } catch(e) {}
      } else {
        rtEl.innerText = 'No refresh token found in URL hash.';
      }
    }

    function copyToken() {
      const t = document.getElementById('accessToken').innerText;
      if (t && !t.startsWith('No access')) {
        navigator.clipboard.writeText(t);
        alert('Access token copied to clipboard!');
      }
    }

    parseTokens();
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
