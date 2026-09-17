import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate';
import { revokeRefreshToken } from '../../../services/token.service';
import { logger } from '../../../utils/logger';

const router = Router();
const bodySchema = z.object({
  refreshToken: z.string(),
});

router.post('/', validate(bodySchema), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await revokeRefreshToken(refreshToken);
  } catch (err) {
    logger.error({ err }, 'Logout error');
  }
  res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
