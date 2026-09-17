const nodemailer = require('nodemailer');
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = require('./env');

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

const isMailConfigured = Boolean(SMTP_USER);

const getMailDefaults = () => ({
  from: MAIL_FROM,
});

module.exports = { transporter, getMailDefaults, isMailConfigured };