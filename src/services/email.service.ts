import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  try {
    const resetUrl = `${env.APP_BASE_URL}/reset-password?token=${resetToken}`;
    
    await resend.emails.send({
      from: 'Amygdala <noreply@resend.dev>',
      to: email,
      subject: 'Reset Your Password',
      html: `<p>Please reset your password by clicking the link below:</p><p><a href="${resetUrl}">Reset Password</a></p>`
    });
    
    logger.info({ email }, 'Password reset email sent');
  } catch (error) {
    logger.error({ err: error, email }, 'Failed to send password reset email');
    throw error;
  }
}
