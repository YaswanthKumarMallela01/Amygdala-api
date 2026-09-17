import { Router } from 'express';
import { getJWKS } from '../../../services/jwt.service';

const router = Router();

router.get('/', (req, res) => {
  const jwks = getJWKS();
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(jwks);
});

export default router;
