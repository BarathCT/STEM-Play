import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendPasswordOtpEmail } from '../lib/mailer.js';

const router = express.Router();

// Sign JWT with role and subject
function sign(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Utility: find user by identifier (email or parentEmail)
async function findUserByIdentifier(identifier) {
  const id = String(identifier || '').toLowerCase().trim();
  if (!id) return null;
  let user = await User.findOne({ email: id, role: { $in: ['admin', 'teacher'] } });
  if (!user) {
    user = await User.findOne({ role: 'student', parentEmail: id });
  }
  return user;
}

// POST /auth/login
router.post('/login', async (req, res) => {
  const { identifier, password, role } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ error: 'identifier and password required' });
  }

  const id = String(identifier).toLowerCase();
  let user = null;

  if (role === 'admin' || role === 'teacher') {
    user = await User.findOne({ role, email: id });
  } else if (role === 'student') {
    user = await User.findOne({ role: 'student', parentEmail: id });
  }
  if (!user) user = await User.findOne({ email: id, role: { $in: ['admin', 'teacher'] } });
  if (!user) user = await User.findOne({ role: 'student', parentEmail: id });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = sign(user);
  const redirectPath =
    user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';

  res.json({
    token,
    user: { id: user._id, name: user.name, role: user.role },
    redirectPath
  });
});

// GET /auth/me
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('name role email parentEmail');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user: { id: user._id, name: user.name, role: user.role } });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// POST /auth/forgot  { identifier }
// - Creates or updates a ResetOtp doc with 5 minute expiry
// - Throttle resends to every 30 seconds
router.post('/forgot', async (req, res) => {
  const { identifier } = req.body || {};
  const genericResponse = { ok: true, message: 'If an account exists, a code has been sent.' };

  try {
    const user = await findUserByIdentifier(identifier);
    if (!user) return res.json(genericResponse);

    const now = Date.now();
    // Upsert existing OTP doc for this user+identifier
    let record = await Otp.findOne({ user: user._id, identifier: String(identifier).toLowerCase().trim() });

    // Throttle: 30 seconds between sends
    if (record?.lastSentAt && now - new Date(record.lastSentAt).getTime() < 30_000) {
      return res.json(genericResponse);
    }

    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes

    if (!record) {
      record = new Otp({
        user: user._id,
        identifier: String(identifier).toLowerCase().trim(),
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(now),
      });
    } else {
      record.codeHash = codeHash;
      record.expiresAt = expiresAt;
      record.attempts = 0;
      record.lastSentAt = new Date(now);
    }
    await record.save();

    const toAddress = user.role === 'student' ? user.parentEmail : user.email;
    await sendPasswordOtpEmail({ to: toAddress, code, name: user.name });

    return res.json(genericResponse);
  } catch {
    return res.json(genericResponse);
  }
});

// POST /auth/verify-otp  { identifier, otp }
router.post('/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body || {};
  if (!identifier || !otp) return res.status(400).json({ error: 'identifier and otp required' });

  const user = await findUserByIdentifier(identifier);
  if (!user) return res.status(400).json({ error: 'Invalid or expired code' });

  const record = await Otp.findOne({ user: user._id, identifier: String(identifier).toLowerCase().trim() });
  if (!record) return res.status(400).json({ error: 'Invalid or expired code' });

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  if (record.attempts >= 10) {
    return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
  }

  const ok = await bcrypt.compare(String(otp), record.codeHash);
  record.attempts = (record.attempts || 0) + 1;
  await record.save();

  if (!ok) return res.status(400).json({ error: 'Invalid or expired code' });
  return res.json({ ok: true });
});

// POST /auth/reset  { identifier, otp, newPassword }
router.post('/reset', async (req, res) => {
  const { identifier, otp, newPassword } = req.body || {};
  if (!identifier || !otp || !newPassword) {
    return res.status(400).json({ error: 'identifier, otp and newPassword required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const user = await findUserByIdentifier(identifier);
  if (!user) return res.status(400).json({ error: 'Invalid or expired code' });

  const record = await Otp.findOne({ user: user._id, identifier: String(identifier).toLowerCase().trim() });
  if (!record) return res.status(400).json({ error: 'Invalid or expired code' });
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const ok = await bcrypt.compare(String(otp), record.codeHash);
  if (!ok) return res.status(400).json({ error: 'Invalid or expired code' });

  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  await user.save();
  // remove the OTP record after successful reset
  await Otp.deleteOne({ _id: record._id });

  return res.json({ ok: true, message: 'Password updated successfully' });
});

export default router;