import nodemailer from 'nodemailer';

const getTransport = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_FROM) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
};

export const sendPasswordResetEmail = async ({ email, token }) => {
  const transport = getTransport();
  if (!transport) return false;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset your Smart Campus Parking password',
    text: `Use this link to reset your password: ${clientUrl}/reset-password?token=${encodeURIComponent(token)}. It expires in one hour.`
  });
  return true;
};
