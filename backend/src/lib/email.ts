import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'Smart Campus <onboarding@resend.dev>';

/**
 * Sends an OTP verification email using Resend.
 * In development without an API key, it logs the OTP to console instead.
 */
export async function sendOtpEmail(to: string, code: string, name: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%);padding:32px 24px;text-align:center;">
      <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:24px;">🎓</span>
      </div>
      <h1 style="color:#ffffff;font-size:22px;margin:0 0 4px 0;font-weight:700;">Smart Campus</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;">Email Verification</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Use the verification code below to complete your Smart Campus registration. This code expires in <strong>10 minutes</strong>.
      </p>

      <!-- OTP Code -->
      <div style="background:#f8f7ff;border:2px dashed #c4b5fd;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px 0;">
        <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#6366f1;font-family:'Courier New',monospace;">
          ${code}
        </div>
      </div>

      <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
        If you didn't request this code, you can safely ignore this email. Someone may have entered your email by mistake.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        © ${new Date().getFullYear()} Smart Campus · Secure Verification
      </p>
    </div>
  </div>
</body>
</html>`;

  if (!resend) {
    console.log(`[DEV] OTP for ${to}: ${code}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${code} — Smart Campus Verification Code`,
    html,
  });

  if (error) {
    console.error('[Email] Failed to send OTP:', error);
    throw new Error('Failed to send verification email. Please try again.');
  }
}
