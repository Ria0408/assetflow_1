const nodemailer = require('nodemailer');

// Email sending is OPTIONAL. If EMAIL_HOST/EMAIL_USER/EMAIL_PASS are not set in
// .env, the app still works — signup skips OTP verification and just logs
// what the welcome email would have said.
const configured = Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

let transporter = null;
if (configured) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.log(`[mailer] (no SMTP configured) Would send to ${to} — "${subject}"`);
    return { sent: false };
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"AssetFlow" <no-reply@assetflow.com>',
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
    return { sent: false };
  }
}

module.exports = { sendMail, isConfigured: () => configured };
