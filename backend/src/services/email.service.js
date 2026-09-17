const crypto = require('crypto');
const { transporter, getMailDefaults, isMailConfigured } = require('../config/email');
const { CLIENT_URL } = require('../config/env');
const logger = require('../utils/logger');

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const generateOtpHash = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const sendMail = async ({ to, subject, html }) => {
  if (!isMailConfigured) {
    logger.warn(`[MAIL] SMTP not configured - skipping send to ${to}`);
    return false;
  }
  try {
    await transporter.sendMail({ ...getMailDefaults(), to, subject, html });
    logger.info(`[MAIL] Sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    logger.error(`[MAIL] Failed to send to ${to}:`, err.message);
    return false;
  }
};

const sendOtpEmail = async (user, otp) => {
  const otpDigits = otp.split('').map(d => `
    <td style="padding:0 4px">
      <div style="width:48px;height:56px;background:linear-gradient(135deg,#1e2536,#252d3d);border:2px solid rgba(108,99,255,0.35);border-radius:12px;text-align:center;line-height:56px;font-size:26px;font-weight:800;color:#a5b4fc;font-family:'Segoe UI',Arial,sans-serif;letter-spacing:0">${d}</div>
    </td>`).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Roboto,Arial,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 20px">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:linear-gradient(145deg,rgba(22,27,39,0.95),rgba(30,37,54,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:24px;overflow:hidden">

            <!-- Top accent gradient bar -->
            <tr><td style="height:4px;background:linear-gradient(90deg,#6c63ff,#818cf8,#9c4fff)"></td></tr>

            <!-- Logo -->
            <tr><td align="center" style="padding:36px 32px 0">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:10px">
                  <img src="https://img.icons8.com/3d-fluency/94/speech-bubble-with-dots.png" width="40" height="40" alt="InstantTalk" style="display:block;border:0"/>
                </td>
                <td style="vertical-align:middle;font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#e8eaf0;font-family:'Segoe UI',Arial,sans-serif">
                  Instant<span style="color:#818cf8">Talk</span>
                </td>
              </tr></table>
            </td></tr>

            <!-- Title -->
            <tr><td align="center" style="padding:24px 32px 0">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#e8eaf0;letter-spacing:-0.3px">Verify your email</h1>
            </td></tr>

            <!-- Greeting -->
            <tr><td style="padding:16px 32px 0;font-size:15px;color:#8892a4;line-height:1.6">
              Hi ${user.name},<br><br>
              Thanks for signing up! Use the code below to verify your email address:
            </td></tr>

            <!-- OTP Code -->
            <tr><td align="center" style="padding:28px 32px">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background:rgba(108,99,255,0.06);border:1px solid rgba(108,99,255,0.15);border-radius:16px;padding:20px 16px">
                <tr>${otpDigits}</tr>
              </table>
            </td></tr>

            <!-- Expiry note -->
            <tr><td align="center" style="padding:0 32px">
              <div style="display:inline-block;background:rgba(108,99,255,0.08);border-radius:8px;padding:8px 16px;font-size:12px;color:#818cf8;font-weight:600;letter-spacing:0.3px">
                ⏱ This code expires in 10 minutes
              </div>
            </td></tr>

            <!-- Divider -->
            <tr><td style="padding:28px 32px 0">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)"></div>
            </td></tr>

            <!-- Footer -->
            <tr><td style="padding:16px 32px 32px;font-size:12px;color:#5a6478;line-height:1.6;text-align:center">
              If you didn't create an InstantTalk account, you can safely ignore this email.<br>
              <span style="color:#3a4256">© ${new Date().getFullYear()} InstantTalk</span>
            </td></tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendMail({ to: user.email, subject: 'Your InstantTalk verification code', html });
};

const sendWelcomeEmail = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Roboto,Arial,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 20px">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:linear-gradient(145deg,rgba(22,27,39,0.95),rgba(30,37,54,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:24px;overflow:hidden">

            <!-- Top accent gradient bar -->
            <tr><td style="height:4px;background:linear-gradient(90deg,#6c63ff,#818cf8,#9c4fff)"></td></tr>

            <!-- Logo -->
            <tr><td align="center" style="padding:36px 32px 0">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:10px">
                  <img src="https://img.icons8.com/3d-fluency/94/speech-bubble-with-dots.png" width="40" height="40" alt="InstantTalk" style="display:block;border:0"/>
                </td>
                <td style="vertical-align:middle;font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#e8eaf0;font-family:'Segoe UI',Arial,sans-serif">
                  Instant<span style="color:#818cf8">Talk</span>
                </td>
              </tr></table>
            </td></tr>

            <!-- Title -->
            <tr><td align="center" style="padding:24px 32px 0">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#e8eaf0;letter-spacing:-0.3px">Welcome to InstantTalk! 🎉</h1>
            </td></tr>

            <!-- Content -->
            <tr><td style="padding:16px 32px 0;font-size:15px;color:#8892a4;line-height:1.6">
              Hi ${user.name},<br><br>
              Your account is all set up. You can now start chatting with your contacts in real time.
            </td></tr>

            <!-- CTA Button -->
            <tr><td align="center" style="padding:28px 32px">
              <a href="${CLIENT_URL}" style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#7c74ff);color:#fff;padding:14px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 4px 20px rgba(108,99,255,0.35)">
                Open InstantTalk
              </a>
            </td></tr>

            <!-- Divider -->
            <tr><td style="padding:0 32px">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)"></div>
            </td></tr>

            <!-- Footer -->
            <tr><td style="padding:16px 32px 32px;font-size:12px;color:#5a6478;line-height:1.6;text-align:center">
              If you have any questions, just reply to this email.<br>
              <span style="color:#3a4256">© ${new Date().getFullYear()} InstantTalk</span>
            </td></tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendMail({ to: user.email, subject: 'Welcome to InstantTalk', html });
};

module.exports = {
  generateOtp,
  generateOtpHash,
  sendMail,
  sendOtpEmail,
  sendWelcomeEmail,
};