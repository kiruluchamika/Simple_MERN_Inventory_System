import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

export async function sendEmail({ to, subject, html }) {
  const from = process.env.MAIL_FROM || 'no-reply@inventory.local';
  const info = await transporter.sendMail({ from, to, subject, html });
  return info;
}
