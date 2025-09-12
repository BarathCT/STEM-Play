import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ClassModel from '../models/Class.js';

const router = express.Router();

// Auth for any logged-in role
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Helper: normalize user for profile response
async function buildProfile(userDoc) {
  const user = await User.findById(userDoc._id)
    .populate('classIds', 'class section')
    .populate('assignedClassId', 'class section')
    .populate('assignedTeacherId', 'name email classIds')
    .lean();

  const firstClass = user.classIds?.[0] || null;

  let assignedTeacher = null;
  if (user.assignedTeacherId) {
    const t = await User.findById(user.assignedTeacherId)
      .populate('classIds', 'class section')
      .lean();
    const tc = t?.classIds?.[0] || null;
    assignedTeacher = t
      ? {
          id: t._id,
          name: t.name,
          email: t.email,
          class: tc
            ? { id: tc._id, class: tc.class, section: tc.section, label: `${tc.class} - ${tc.section}` }
            : null,
        }
      : null;
  }

  const classes = (user.classIds || []).map((c) => ({
    id: c._id,
    class: c.class,
    section: c.section,
    label: `${c.class} - ${c.section}`,
  }));

  return {
    id: user._id,
    name: user.name,
    role: user.role,
    email: user.email || null,
    parentEmail: user.parentEmail || null,
    staffId: user.staffId || null,
    registerId: user.registerId || null,

    // Primary class (first)
    class: firstClass
      ? { id: firstClass._id, class: firstClass.class, section: firstClass.section, label: `${firstClass.class} - ${firstClass.section}` }
      : null,

    // All classes for teacher (if multiple)
    classes,

    // Student convenience pointers
    assignedClass: user.assignedClassId
      ? {
          id: user.assignedClassId._id,
          class: user.assignedClassId.class,
          section: user.assignedClassId.section,
          label: `${user.assignedClassId.class} - ${user.assignedClassId.section}`,
        }
      : null,

    assignedTeacher,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * GET /profile/me
 * Returns enriched profile for the logged-in user (all available fields + relations).
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const profile = await buildProfile(me);
    res.json({ user: profile });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * PUT /profile/profile
 * Update own profile details (safe fields only).
 * - Admin/Teacher: name, email, staffId
 * - Student: name, parentEmail, registerId
 */
router.put('/profile', requireAuth, async (req, res) => {
  const { name, email, parentEmail, staffId, registerId } = req.body || {};
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = String(name).trim();

    if (user.role === 'student') {
      if (parentEmail) user.parentEmail = String(parentEmail).toLowerCase().trim();
      if (registerId !== undefined) user.registerId = registerId ? String(registerId).trim() : null;
    } else {
      if (email) user.email = String(email).toLowerCase().trim();
      if (staffId !== undefined) user.staffId = staffId ? String(staffId).trim() : null;
    }

    await user.save();
    const profile = await buildProfile(user);
    res.json({ ok: true, user: profile });
  } catch (e) {
    if (e?.code === 11000) {
      const key = e?.keyPattern ? Object.keys(e.keyPattern)[0] : '';
      const map = {
        email: 'Email already in use',
        staffId: 'Staff ID already in use',
        registerId: 'Register ID already in use',
      };
      return res.status(400).json({ error: map[key] || 'Duplicate value' });
    }
    res.status(400).json({ error: e.message });
  }
});

/**
 * PUT /profile/password
 * Change own password (requires current password).
 * Body: { currentPassword, newPassword }
 */
router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user || !user.passwordHash) return res.status(400).json({ error: 'Invalid request' });

    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    res.json({ ok: true, message: 'Password updated successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Optional helper: list all classes for UI dropdowns (if you want it here)
 * GET /profile/classes
 */
router.get('/classes', requireAuth, async (_req, res) => {
  const list = await ClassModel.find({}).sort({ class: 1, section: 1 }).lean();
  res.json({
    classes: list.map((c) => ({
      id: c._id,
      class: c.class,
      section: c.section,
      label: `${c.class} - ${c.section}`,
    })),
  });
});

export default router;