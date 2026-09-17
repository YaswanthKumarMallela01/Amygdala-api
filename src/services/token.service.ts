import { query } from '../db/client';
import { generateRandomToken, hashToken } from '../utils/crypto';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export async function createRefreshToken(userId: string, deviceInfo?: string): Promise<{ rawToken: string; familyId: string }> {
  const rawToken = generateRandomToken();
  const tokenHash = hashToken(rawToken);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, device_info)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, familyId, expiresAt, deviceInfo || null]
  );

  return { rawToken, familyId };
}

export async function rotateRefreshToken(rawToken: string): Promise<{ rawToken: string; userId: string; familyId: string }> {
  const tokenHash = hashToken(rawToken);

  const result = await query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid refresh token');
  }

  const tokenRecord = result.rows[0];

  if (tokenRecord.revoked) {
    // Reuse detection
    logger.warn({ familyId: tokenRecord.family_id }, 'Refresh token reuse detected');
    await query(
      `UPDATE refresh_tokens SET revoked = true WHERE family_id = $1`,
      [tokenRecord.family_id]
    );
    throw new Error('Token reuse detected');
  }

  if (new Date() > new Date(tokenRecord.expires_at)) {
    throw new Error('Refresh token expired');
  }

  // Revoke old token
  await query(
    `UPDATE refresh_tokens SET revoked = true WHERE id = $1`,
    [tokenRecord.id]
  );

  // Create new token in same family
  const newRawToken = generateRandomToken();
  const newTokenHash = hashToken(newRawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, device_info)
     VALUES ($1, $2, $3, $4, $5)`,
    [tokenRecord.user_id, newTokenHash, tokenRecord.family_id, expiresAt, tokenRecord.device_info]
  );

  return { rawToken: newRawToken, userId: tokenRecord.user_id, familyId: tokenRecord.family_id };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await query(
    `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
    [tokenHash]
  );
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`,
    [userId]
  );
}
