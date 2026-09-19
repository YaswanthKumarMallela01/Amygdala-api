import { Router } from 'express';
import { query } from '../../../db/client';
import { logger } from '../../../utils/logger';
import { authMiddleware } from '../../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/:id/users', async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const ownership = await query('SELECT id FROM api_clients WHERE id = $1 AND user_id = $2', [projectId, userId]);
    if (ownership.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await query('SELECT id, email, name, created_at FROM users WHERE client_id = $1 ORDER BY created_at DESC', [projectId]);
    res.json({ users: users.rows });
  } catch (err) {
    logger.error({ err }, 'Error fetching project users');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/sessions', async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const ownership = await query('SELECT id FROM api_clients WHERE id = $1 AND user_id = $2', [projectId, userId]);
    if (ownership.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sessions = await query('SELECT * FROM tenant_login_sessions WHERE client_id = $1 ORDER BY logged_in_at DESC LIMIT 100', [projectId]);
    res.json({ sessions: sessions.rows });
  } catch (err) {
    logger.error({ err }, 'Error fetching project sessions');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/sessions/:sessionId', async (req, res) => {
  const projectId = req.params.id;
  const sessionId = req.params.sessionId;
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const ownership = await query('SELECT id FROM api_clients WHERE id = $1 AND user_id = $2', [projectId, userId]);
    if (ownership.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await query('UPDATE tenant_login_sessions SET status = $1 WHERE id = $2 AND client_id = $3', ['revoked', sessionId, projectId]);
    res.json({ message: 'Session revoked' });
  } catch (err) {
    logger.error({ err }, 'Error revoking session');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/stats', async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const ownership = await query('SELECT id FROM api_clients WHERE id = $1 AND user_id = $2', [projectId, userId]);
    if (ownership.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const totalUsersResult = await query('SELECT COUNT(*) FROM users WHERE client_id = $1', [projectId]);
    const totalUsers = parseInt(totalUsersResult.rows[0].count, 10);

    const activeSessionsResult = await query('SELECT COUNT(*) FROM tenant_login_sessions WHERE client_id = $1 AND status = $2', [projectId, 'active']);
    const activeSessions = parseInt(activeSessionsResult.rows[0].count, 10);

    const loginsTodayResult = await query('SELECT COUNT(*) FROM tenant_login_sessions WHERE client_id = $1 AND logged_in_at >= CURRENT_DATE', [projectId]);
    const loginsToday = parseInt(loginsTodayResult.rows[0].count, 10);

    res.json({ totalUsers, activeSessions, loginsToday });
  } catch (err) {
    logger.error({ err }, 'Error fetching project stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
