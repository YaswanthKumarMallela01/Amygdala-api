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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amygdala - Authenticating...</title>
  <link rel="icon" type="image/png" href="/fevicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(12, 16, 26, 0.7);
      --card-border: rgba(255, 255, 255, 0.12);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.35);
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
      position: relative;
    }
    /* Subtle background ambient glow */
    .glow-bg {
      position: absolute;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.05) 40%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 0;
    }
    .card {
      position: relative;
      z-index: 10;
      background: var(--card-bg);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 40px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .check-icon-wrap {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      animation: pulseGlow 2s infinite ease-in-out;
    }
    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); box-shadow: 0 0 25px rgba(16, 185, 129, 0.25); }
      50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(16, 185, 129, 0.45); }
    }
    .check-icon-wrap svg {
      width: 32px;
      height: 32px;
      color: #10b981;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      margin-bottom: 8px;
    }
    p {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .progress-bar-wrap {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 99px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .progress-bar-fill {
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #10b981);
      border-radius: 99px;
      animation: fillBar 1.6s ease forwards;
    }
    @keyframes fillBar {
      0% { width: 0%; }
      100% { width: 100%; }
    }
    .btn-primary {
      width: 100%;
      background: #6366f1;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 12px 20px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
      transition: all 0.2s ease;
    }
    .btn-primary:hover {
      background: #4f46e5;
      transform: translateY(-1px);
    }
    .token-details-toggle {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      margin-top: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: color 0.2s;
    }
    .token-details-toggle:hover { color: #ffffff; }
    .token-details-card {
      display: none;
      width: 100%;
      text-align: left;
      margin-top: 16px;
      background: #05070c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px;
    }
    .token-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .token-box {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #38bdf8;
      word-break: break-all;
      background: rgba(0, 0, 0, 0.6);
      padding: 8px 10px;
      border-radius: 6px;
      max-height: 80px;
      overflow-y: auto;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="glow-bg"></div>

  <div class="card">
    <div class="check-icon-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>

    <h1>Authentication Successful</h1>
    <p id="statusMsg">Your session has been established. Redirecting to your dashboard...</p>

    <div class="progress-bar-wrap">
      <div class="progress-bar-fill"></div>
    </div>

    <a href="/" id="btnRedirect" class="btn-primary">
      <span>Continue to Dashboard</span>
      <span>&rarr;</span>
    </a>

    <button class="token-details-toggle" onclick="toggleTokens()">
      <span>Inspect tokens</span>
      <span id="toggleArrow">&#9662;</span>
    </button>

    <div class="token-details-card" id="tokenBoxCard">
      <div class="token-label">RS256 Access Token</div>
      <div class="token-box" id="atBox">Extracting...</div>
      <div class="token-label">Refresh Token</div>
      <div class="token-box" id="rtBox">Extracting...</div>
    </div>
  </div>

  <script>
    let at = '', rt = '';

    function handleTokens() {
      const hash = window.location.hash ? window.location.hash.substring(1) : '';
      const params = new URLSearchParams(hash);
      at = params.get('access_token') || '';
      rt = params.get('refresh_token') || '';

      if (at) {
        try {
          localStorage.setItem('amygdala_access_token', at);
          if (rt) localStorage.setItem('amygdala_refresh_token', rt);
          localStorage.setItem('amygdala_login_time', String(Date.now()));
        } catch(e) {}

        document.getElementById('atBox').innerText = at;
        document.getElementById('rtBox').innerText = rt || '—';

        // Smooth automatic redirection to dashboard after progress animation
        setTimeout(() => {
          window.location.href = '/';
        }, 1600);
      } else {
        document.getElementById('statusMsg').innerText = 'No credentials found in authorization response.';
        document.getElementById('atBox').innerText = 'None';
        document.getElementById('rtBox').innerText = 'None';
      }
    }

    function toggleTokens() {
      const box = document.getElementById('tokenBoxCard');
      const arrow = document.getElementById('toggleArrow');
      if (box.style.display === 'block') {
        box.style.display = 'none';
        arrow.innerHTML = '&#9662;';
      } else {
        box.style.display = 'block';
        arrow.innerHTML = '&#9652;';
      }
    }

    handleTokens();
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
