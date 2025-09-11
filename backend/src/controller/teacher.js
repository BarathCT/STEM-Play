import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ClassModel from '../models/Class.js';
import { sendWelcomeEmail } from '../lib/mailer.js';

const router = express.Router();

function requireTeacher(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
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

// Resolve teacher's assigned class (first classId); error if missing
async function getTeacherPrimaryClass(teacherId) {
  const teacher = await User.findOne({ _id: teacherId, role: 'teacher' }).populate('classIds', 'class section').lean();
  if (!teacher) return { error: 'Teacher not found' };
  const klass = teacher.classIds?.[0];
  if (!klass) return { error: 'No class assigned to this teacher' };
  return { teacher, klass };
}

// GET /teacher/students
// List only students from the teacher's assigned class
router.get('/students', requireTeacher, async (req, res) => {
  const { q = '' } = req.query;
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const filter = {
    role: 'student',
    assignedClassId: klass._id
  };
  if (q) {
    filter.$or = [
      { name: { $regex: new RegExp(String(q), 'i') } },
      { parentEmail: { $regex: new RegExp(String(q), 'i') } },
      { registerId: { $regex: new RegExp(String(q), 'i') } }
    ];
  }

  const students = await User.find(filter)
    .select('name parentEmail registerId assignedTeacherId assignedClassId')
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

  res.json({ students: normalized, classLabel: `${klass.class} - ${klass.section}` });
});

// POST /teacher/students
// Create student assigned to this teacher's class and teacher
router.post('/students', requireTeacher, async (req, res) => {
  const { name, parentEmail, registerId } = req.body || {};
  if (!name || !parentEmail) return res.status(400).json({ error: 'name and parentEmail required' });

  const { error, teacher, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  let student;
  try {
    student = await User.create({
      name,
      parentEmail: String(parentEmail).toLowerCase(),
      registerId: registerId?.toString().trim() || undefined,
      passwordHash,
      role: 'student',
      assignedTeacherId: teacher._id,
      assignedClassId: klass._id,
      classIds: [klass._id]
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
      classLabel: `${klass.class} - ${klass.section}`,
      password,
      registerId: student.registerId
    });
  } catch {
    // Non-fatal: student created even if email fails
  }

  return res.json({
    ok: true,
    student: {
      id: student._id,
      name: student.name,
      parentEmail: student.parentEmail,
      registerId: student.registerId || null,
      teacher: { id: teacher._id, name: teacher.name },
      class: { id: klass._id, class: klass.class, section: klass.section, label: `${klass.class} - ${klass.section}` }
    }
  });
});

// PUT /teacher/students/:id
// Update only students belonging to this teacher (no class/section change)
router.put('/students/:id', requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { name, parentEmail, registerId, newPassword } = req.body || {};

  // Ensure the student belongs to this teacher
  const student = await User.findOne({ _id: id, role: 'student', assignedTeacherId: req.userId });
  if (!student) return res.status(404).json({ error: 'Student not found or not in your section' });

  if (name) student.name = name;
  if (parentEmail) student.parentEmail = String(parentEmail).toLowerCase();
  if (registerId !== undefined) student.registerId = registerId?.toString().trim() || null;
  if (newPassword) student.passwordHash = await bcrypt.hash(newPassword, 10);

  try {
    await student.save();
  } catch (e) {
    if (e?.code === 11000) {
      const key = e?.keyPattern ? Object.keys(e.keyPattern)[0] : '';
      if (key === 'registerId') return res.status(400).json({ error: 'Register ID already in use' });
      return res.status(400).json({ error: 'Duplicate value' });
    }
    return res.status(400).json({ error: e.message });
  }

  res.json({
    ok: true,
    student: {
      id: student._id,
      name: student.name,
      parentEmail: student.parentEmail,
      registerId: student.registerId || null
    }
  });
});

// DELETE /teacher/students/:id
// Delete only students belonging to this teacher
router.delete('/students/:id', requireTeacher, async (req, res) => {
  const { id } = req.params;

  const student = await User.findOne({ _id: id, role: 'student', assignedTeacherId: req.userId });
  if (!student) return res.status(404).json({ error: 'Student not found or not in your section' });

  await User.deleteOne({ _id: id });
  res.json({ ok: true, message: `Deleted ${student.name}` });
});

export default router;