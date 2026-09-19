import { Router } from 'express';

import signupRouter from './signup';
import loginRouter from './login';
import refreshRouter from './refresh';
import logoutRouter from './logout';
import forgotPasswordRouter from './forgot-password';
import resetPasswordRouter from './reset-password';
import meRouter from './me';
import jwksRouter from './jwks';
import mfaEnrollRouter from './mfa/enroll';
import mfaVerifyRouter from './mfa/verify';
import googleOAuthRouter from './oauth/google';
import githubOAuthRouter from './oauth/github';
import keysRouter from './keys';
import projectsRouter from './projects';

const router = Router();

router.use('/signup', signupRouter);
router.use('/login', loginRouter);
router.use('/refresh', refreshRouter);
router.use('/logout', logoutRouter);
router.use('/forgot-password', forgotPasswordRouter);
router.use('/reset-password', resetPasswordRouter);
router.use('/me', meRouter);
router.use('/keys', keysRouter);
router.use('/projects', projectsRouter);
router.use('/.well-known/jwks.json', jwksRouter);
router.use('/mfa/enroll', mfaEnrollRouter);
router.use('/mfa/verify', mfaVerifyRouter);
router.use('/oauth/google', googleOAuthRouter);
router.use('/oauth/github', githubOAuthRouter);

export default router;
