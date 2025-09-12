import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import ClassModel from '../models/Class.js';
import User from '../models/User.js';
import { sendWelcomeEmail } from '../lib/mailer.js';

const router = express.Router();

// Development-only auth bypass (DO NOT enable in production)
const BYPASS_AUTH = process.env.DISABLE_AUTH === 'true';
// If true, delete the teacher if email send fails (keeps data consistent)
const EMAIL_TX_ROLLBACK = String(process.env.EMAIL_TX_ROLLBACK || 'false').toLowerCase() === 'true';

function requireAdmin(req, res, next) {
  if (BYPASS_AUTH) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[WARN] Admin auth is DISABLED (DISABLE_AUTH=true). Protect this in production!');
    }
    req.userId = 'dev-admin';
    return next();
  }

  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// Classes
router.get('/classes', requireAdmin, async (_req, res) => {
  const list = await ClassModel.find({}).sort({ class: 1, section: 1 }).lean();
  res.json({ classes: list.map(c => ({ ...c, label: `${c.class} - ${c.section}` })) });
});

router.post('/classes', requireAdmin, async (req, res) => {
  const { class: cls, section } = req.body;
  if (!cls || !section) return res.status(400).json({ error: 'class and section required' });
  try {
    const doc = await ClassModel.findOneAndUpdate(
      { class: Number(cls), section: String(section).toUpperCase().trim() },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ class: { ...doc.toObject(), label: `${doc.class} - ${doc.section}` } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Teachers
router.get('/teachers', requireAdmin, async (req, res) => {
  const { query = '', classId } = req.query;
  const filter = { role: 'teacher' };
  if (query) filter.name = { $regex: new RegExp(query, 'i') };
  if (classId) filter.classIds = classId;

  const teachers = await User.find(filter)
    .select('name email classIds staffId')
    .populate('classIds', 'class section')
    .lean();

  const normalized = teachers.map(t => {
    const firstClass = t.classIds?.[0];
    return {
      id: t._id,
      name: t.name,
      email: t.email,
      staffId: t.staffId || null,
      class: firstClass ? {
        id: firstClass._id,
        class: firstClass.class,
        section: firstClass.section,
        label: `${firstClass.class} - ${firstClass.section}`
      } : null
    };
  });
  res.json({ teachers: normalized });
});

router.post('/teachers', requireAdmin, async (req, res) => {
  const { name, email, classId, staffId } = req.body;
  if (!name || !email || !classId) return res.status(400).json({ error: 'name, email, classId required' });

  const klass = await ClassModel.findById(classId);
  if (!klass) return res.status(404).json({ error: 'Class not found' });

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  let teacher;
  try {
    teacher = await User.create({
      name,
      email: String(email).toLowerCase(),
      staffId: staffId?.toString().trim() || undefined,
      passwordHash,
      role: 'teacher',
      classIds: [klass._id]
    });
  } catch (e) {
    if (e?.code === 11000) {
      const key = e?.keyPattern ? Object.keys(e.keyPattern)[0] : '';
      if (key === 'email') return res.status(400).json({ error: 'Email already in use' });
      if (key === 'staffId') return res.status(400).json({ error: 'Staff ID already in use' });
      return res.status(400).json({ error: 'Duplicate value' });
    }
    return res.status(400).json({ error: e.message });
  }

  try {
    await sendWelcomeEmail({
      to: email,
      role: 'Teacher',
      name,
      classLabel: `${klass.class} - ${klass.section}`,
      password,
      staffId: teacher.staffId
    });
  } catch (mailErr) {
    if (EMAIL_TX_ROLLBACK) {
      try { await User.deleteOne({ _id: teacher._id }); } catch {}
      return res.status(502).json({ error: 'Email send failed; teacher creation rolled back' });
    }
    return res.status(502).json({ error: 'Email send failed, but teacher was created' });
  }

  return res.json({
    ok: true,
    emailSent: true,
    teacher: {
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      staffId: teacher.staffId || null,
      class: { id: klass._id, class: klass.class, section: klass.section, label: `${klass.class} - ${klass.section}` }
    }
  });
});

// Students - Auto-assign class/section based on selected teacher
router.post('/students', requireAdmin, async (req, res) => {
  const { name, parentEmail, teacherId, registerId } = req.body;
  if (!name || !parentEmail || !teacherId) return res.status(400).json({ error: 'name, parentEmail, teacherId required' });

  const teacher = await User.findOne({ _id: teacherId, role: 'teacher' }).populate('classIds', 'class section').lean();
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  const teacherClass = teacher.classIds?.[0];
  if (!teacherClass) return res.status(400).json({ error: 'Teacher has no class assigned' });

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  let student;
  try {
    student = await User.create({
      name,
      email: undefined, // Students don't need their own email; parentEmail is used for login
      parentEmail: String(parentEmail).toLowerCase(),
      registerId: registerId?.toString().trim() || undefined,
      passwordHash,
      role: 'student',
      assignedTeacherId: teacherId,
      assignedClassId: teacherClass._id, // Auto-assigned
      classIds: [teacherClass._id]
    });
  } catch (e) {
    if (e?.code === 11000) {
      const key = e?.keyPattern ? Object.keys(e.keyPattern)[0] : '';
      if (key === 'registerId') return res.status(400).json({ error: 'Register ID already in use' });
      return res.status(400).json({ error: 'Duplicate value' });
    }
    return res.status(400).json({ error: e.message });
  }

  try {
    await sendWelcomeEmail({
      to: parentEmail,
      role: 'Student',
      studentName: name,
      classLabel: `${teacherClass.class} - ${teacherClass.section}`,
      password,
      registerId: student.registerId
    });
  } catch (mailErr) {
    return res.status(502).json({ error: 'Email send failed, but student was created' });
  }

  return res.json({
    ok: true,
    emailSent: true,
    student: {
      id: student._id,
      name: student.name,
      parentEmail: student.parentEmail,
      registerId: student.registerId || null,
      teacher: { id: teacherId, name: teacher.name },
      class: {
        id: teacherClass._id,
        class: teacherClass.class,
        section: teacherClass.section,
        label: `${teacherClass.class} - ${teacherClass.section}`
      }
    }
  });
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent deletion of admin users
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    await User.deleteOne({ _id: id });

    res.json({
      success: true,
      message: `${user.role} ${user.name} deleted successfully`
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Enhanced PUT: allow admin to change role (teacher<->student), class assignment for teachers,
// and class-teacher assignment for students.
router.put('/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    parentEmail,
    staffId,
    registerId,
    newPassword,
    role,        // 'teacher' | 'student'
    classId,     // for teachers
    teacherId,   // for students
  } = req.body || {};

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Basic
    if (name) user.name = name;
    if (staffId !== undefined) user.staffId = staffId ? staffId.trim() : null;
    if (registerId !== undefined) user.registerId = registerId ? registerId.trim() : null;

    const targetRole = role || user.role;

    if (targetRole === 'teacher') {
      if (email) user.email = email.toLowerCase();
      // Clear student-only fields
      user.parentEmail = undefined;
      user.assignedTeacherId = undefined;
      user.assignedClassId = undefined;

      if (classId) {
        const exists = await ClassModel.exists({ _id: classId });
        if (!exists) return res.status(404).json({ error: 'Class not found' });
        user.classIds = [classId];
      } else if (!user.classIds?.length) {
        return res.status(400).json({ error: 'Teacher requires a class assignment' });
      }
    } else if (targetRole === 'student') {
      if (parentEmail) user.parentEmail = parentEmail.toLowerCase();
      // Clear teacher-only fields
      user.email = undefined;

      if (teacherId) {
        const teacher = await User.findOne({ _id: teacherId, role: 'teacher' }).populate('classIds', 'class section').lean();
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
        const tClass = teacher.classIds?.[0];
        if (!tClass) return res.status(400).json({ error: 'Selected teacher has no class assigned' });
        user.assignedTeacherId = teacherId;
        user.assignedClassId = tClass._id;
        user.classIds = [tClass._id];
      } else if (!user.assignedClassId) {
        return res.status(400).json({ error: 'Student requires a class teacher' });
      }
    } else {
      if (role === 'admin') return res.status(400).json({ error: 'Changing to admin is not allowed' });
    }

    if (role && (role === 'teacher' || role === 'student')) {
      user.role = role;
    }

    if (newPassword) {
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        parentEmail: user.parentEmail,
        staffId: user.staffId,
        registerId: user.registerId,
        role: user.role
      }
    });
  } catch (e) {
    if (e?.code === 11000) {
      const key = e?.keyPattern ? Object.keys(e.keyPattern)[0] : '';
      if (key === 'email') return res.status(400).json({ error: 'Email already in use' });
      if (key === 'staffId') return res.status(400).json({ error: 'Staff ID already in use' });
      if (key === 'registerId') return res.status(400).json({ error: 'Register ID already in use' });
      return res.status(400).json({ error: 'Duplicate value' });
    }
    res.status(400).json({ error: e.message });
  }
});

// Get students list for admin
router.get('/students', requireAdmin, async (req, res) => {
  const { query = '', classId, teacherId } = req.query;
  const filter = { role: 'student' };
  if (query) filter.name = { $regex: new RegExp(query, 'i') };
  if (classId) filter.assignedClassId = classId;
  if (teacherId) filter.assignedTeacherId = teacherId;

  const students = await User.find(filter)
    .select('name parentEmail assignedTeacherId assignedClassId registerId')
    .populate('assignedTeacherId', 'name')
    .populate('assignedClassId', 'class section')
    .lean();

  const normalized = students.map(s => ({
    id: s._id,
    name: s.name,
    parentEmail: s.parentEmail,
    registerId: s.registerId || null,
    teacher: s.assignedTeacherId ? { id: s.assignedTeacherId._id, name: s.assignedTeacherId.name } : null,
    class: s.assignedClassId ? {
      id: s.assignedClassId._id,
      class: s.assignedClassId.class,
      section: s.assignedClassId.section,
      label: `${s.assignedClassId.class} - ${s.assignedClassId.section}`
    } : null
  }));

  res.json({ students: normalized });
});

export default router;