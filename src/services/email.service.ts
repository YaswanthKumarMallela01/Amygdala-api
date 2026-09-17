import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.APP_BASE_URL}/reset-password?token=${resetToken}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
      <h2 style="color: #6366f1; margin-top: 0;">Amygdala Password Reset</h2>
      <p style="color: #cbd5e1; font-size: 15px;">You requested a password reset for your account.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
      </p>
      <p style="color: #94a3b8; font-size: 13px;">Or copy and paste this reset token into the reset form:</p>
      <p style="background: #1e293b; padding: 12px; border-radius: 6px; font-family: monospace; color: #38bdf8; word-break: break-all;">${resetToken}</p>
      <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This link expires in 30 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  // 1. If custom SMTP (like Gmail App Password) is provided in env vars, use it
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"Amygdala Auth" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset Your Password - Amygdala',
        html
      });

      logger.info({ email }, 'Password reset email sent successfully via SMTP');
      return;
    } catch (smtpErr) {
      logger.error({ err: smtpErr }, 'SMTP sending failed, attempting Resend fallback...');
    }
  }

  // 2. Default: Use Resend API
  try {
    const fromAddress = process.env.EMAIL_FROM || 'Amygdala <onboarding@resend.dev>';
    const result = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Reset Your Password - Amygdala',
      html
    });

    if (result.error) {
      logger.error({ err: result.error, email }, 'Resend API returned error');
    } else {
      logger.info({ email, id: result.data?.id }, 'Password reset email sent via Resend');
    }
  } catch (error) {
    logger.error({ err: error, email }, 'Failed to send password reset email via Resend');
  }
}
