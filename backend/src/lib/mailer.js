import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
  APP_NAME = 'STEMPlay',
  NODE_ENV = 'development',
} = process.env;

let transporter;
export function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST || 'smtp.gmail.com',
      port: Number(SMTP_PORT || 465),
      secure: String(SMTP_PORT || 465) === '465', // TLS for 465
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      tls: {
        // In dev, allow self-signed certs; in prod, enforce validation
        rejectUnauthorized: NODE_ENV === 'production',
      },
    });
  }
  return transporter;
}

export async function verifyEmailTransport() {
  try {
    await getTransporter().verify();
    console.log('✅ SMTP transport verified');
    return true;
  } catch (e) {
    console.warn('⚠️ SMTP verify failed:', e?.message || e);
    return false;
  }
}

export async function sendWelcomeEmail({
  to,
  role,
  name,
  classLabel,
  password,
  studentName,
  staffId,
  registerId,
}) {
  const subject =
    role === 'Teacher'
      ? `${APP_NAME} • Your teacher account`
      : `${APP_NAME} • Your student account`;

  const greeting =
    role === 'Teacher'
      ? `Hello ${name || ''},`
      : `Hello Parent/Guardian,`;

  const idLine =
    role === 'Teacher'
      ? (staffId ? `Staff ID: ${staffId}` : null)
      : (registerId ? `Register ID: ${registerId}` : null);

  const lines = [
    greeting,
    '',
    role === 'Teacher'
      ? 'Your teacher account has been created.'
      : `A student account for ${studentName || 'your child'} has been created.`,
    classLabel ? `Class: ${classLabel}` : null,
    idLine,
    '',
    'Login details:',
    `Email/Username: ${to}`,
    `Temporary Password: ${password}`,
    '',
    'For security, please change your password after first login.',
    '',
    'Thanks,',
    `${APP_NAME} Team`,
  ].filter(Boolean);

  await getTransporter().sendMail({
    from:
      FROM_EMAIL ||
      (SMTP_USER
        ? `${APP_NAME} <${SMTP_USER}>`
        : `${APP_NAME} <no-reply@localhost>`),
    to,
    subject,
    text: lines.join('\n'),
  });
}
