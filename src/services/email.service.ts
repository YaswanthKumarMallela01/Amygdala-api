import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.APP_BASE_URL}/reset-password?token=${resetToken}`;
  
  // Plain text fallback (essential for avoiding spam filters)
  const text = `Hello,

We received a request to reset your password for your Amygdala account.

To reset your password, visit the following link:
${resetUrl}

Or enter this reset token directly:
${resetToken}

This link and token will expire in 30 minutes.

If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The Amygdala Security Team
https://amygdala-api-37nt.onrender.com`;

  // Clean, responsive, anti-spam HTML template
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #121826; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #1e293b;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">🧠 Amygdala</span>
                    <span style="font-size: 11px; background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(129, 140, 248, 0.3); padding: 2px 8px; border-radius: 999px; margin-left: 8px; font-weight: 700; text-transform: uppercase;">Security</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #ffffff;">Password Reset Request</h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                We received a request to reset the password for your account (<strong style="color: #f1f5f9;">${email}</strong>). Click the button below to choose a new password:
              </p>

              <!-- Action Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: #6366f1;">
                    <a href="${resetUrl}" target="_blank" style="font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 10px; display: inline-block; letter-spacing: -0.01em;">Reset Password &rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- Token Box -->
              <p style="margin: 24px 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">
                Or use this single-use reset token:
              </p>
              <div style="background-color: #080c14; border: 1px solid #1e293b; border-radius: 8px; padding: 12px 14px; font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #38bdf8; word-break: break-all;">
                ${resetToken}
              </div>

              <!-- Security Warning -->
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.6; color: #64748b; border-top: 1px solid #1e293b; padding-top: 20px;">
                ⏱️ This link is valid for <strong>30 minutes</strong> and can only be used once.<br>
                If you did not request this password reset, no action is needed. Your account remains completely secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0e131f; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; 2026 Amygdala Authentication-as-a-Service. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // 1. Send via verified Gmail SMTP
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
        from: `"Amygdala Security" <${process.env.SMTP_USER}>`,
        replyTo: process.env.SMTP_USER,
        to: email,
        subject: 'Amygdala password reset request',
        text,
        html
      });

      logger.info({ email }, 'Password reset email delivered via Gmail SMTP');
      return;
    } catch (smtpErr) {
      logger.error({ err: smtpErr }, 'Gmail SMTP delivery failed, attempting fallback...');
    }
  }

  // 2. Resend API fallback
  try {
    const fromAddress = process.env.EMAIL_FROM || 'Amygdala <onboarding@resend.dev>';
    const result = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Amygdala password reset request',
      text,
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
