import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Sign JWT with role and subject
function sign(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// POST /auth/login
// Auto-detect role based on identifier:
// - admin/teacher: identifier matches users.email
// - student: identifier matches users.parentEmail
// Accepts (for backward compatibility):
//   { identifier, password }  OR  { role, identifier, password }
router.post('/login', async (req, res) => {
  const { identifier, password, role } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ error: 'identifier and password required' });
  }

  const id = String(identifier).toLowerCase();

  let user = null;

  // If role is explicitly provided, try that first
  if (role === 'admin' || role === 'teacher') {
    user = await User.findOne({ role, email: id });
  } else if (role === 'student') {
    user = await User.findOne({ role: 'student', parentEmail: id });
  }

  // If not found yet or no role provided, auto-detect:
  if (!user) {
    // Try admin/teacher via email
    user = await User.findOne({ email: id, role: { $in: ['admin', 'teacher'] } });
  }
  if (!user) {
    // Try student via parentEmail
    user = await User.findOne({ role: 'student', parentEmail: id });
  }

  // Not found or no password hash
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

export default router;