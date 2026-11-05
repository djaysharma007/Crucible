import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BrevoEmailService {
  private readonly logger = new Logger(BrevoEmailService.name);
  private readonly apiKey = process.env.BREVO_API_KEY || '';
  private readonly senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@crucible.dev';
  private readonly senderName =
    process.env.BREVO_SENDER_NAME || 'Crucible Technical Interview Platform';
  private readonly frontendUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';

  async sendPasswordResetEmail(toEmail: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    if (!this.apiKey) {
      this.logger.warn(
        `[Brevo Simulation] BREVO_API_KEY is not set. Reset link for ${toEmail}: ${resetUrl}`,
      );
      return true;
    }

    const payload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [{ email: toEmail }],
      subject: 'Reset your Crucible password',
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #121212; color: #D3D0CB; margin: 0; padding: 24px; }
              .card { background-color: #1E2019; border: 1px solid #393E41; border-radius: 8px; max-width: 520px; margin: 0 auto; padding: 32px; }
              .title { color: #E2C044; font-size: 20px; font-weight: bold; margin-bottom: 16px; }
              .btn { display: inline-block; background-color: #E2C044; color: #1E2019; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 24px 0; }
              .footer { font-size: 11px; color: #8B8E87; margin-top: 24px; border-top: 1px solid #393E41; padding-top: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="title">Crucible Password Reset</div>
              <p>We received a request to reset the password for your Crucible interviewer account (${toEmail}).</p>
              <p>Click the button below to choose a new password. This link is valid for 1 hour.</p>
              <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
              <p>If you did not request this change, you can safely ignore this email.</p>
              <div class="footer">
                Crucible Technical Interview Platform &bull; Zero-Cost Architecture
              </div>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Brevo API returned HTTP ${response.status}: ${errText}`);
        return false;
      }

      this.logger.log(`Password reset email dispatched via Brevo to ${toEmail}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email via Brevo to ${toEmail}: ${(err as Error).message}`);
      return false;
    }
  }
}
