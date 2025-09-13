import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Leaderboard from '../models/Leaderboard.js';
import LeaderboardScore from '../models/LeaderboardScore.js';

const router = express.Router();

function requireRole(role) {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (role && payload.role !== role) return res.status(403).json({ error: 'Forbidden' });
      req.userId = payload.sub;
      req.userRole = payload.role;
      next();
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

const requireStudent = requireRole('student');
const requireTeacher = requireRole('teacher');

async function getStudentWithClass(studentId) {
  const s = await User.findOne({ _id: studentId, role: 'student' })
    .populate('assignedClassId', 'class section')
    .lean();
  if (!s) return { error: 'Student not found' };
  if (!s.assignedClassId) return { error: 'No class assigned to this student' };
  return { student: s, klass: s.assignedClassId };
}

async function getTeacherPrimaryClass(teacherId) {
  const t = await User.findOne({ _id: teacherId, role: 'teacher' })
    .populate('classIds', 'class section')
    .lean();
  if (!t) return { error: 'Teacher not found' };
  const klass = t.classIds?.[0];
  if (!klass) return { error: 'No class assigned to this teacher' };
  return { teacher: t, klass };
}

function normalizeRef(type, ref) {
  if (type === 'quiz') return `quiz:${String(ref)}`;
  const r = String(ref);
  return r.startsWith('game:') ? r : `game:${r}`;
}

function windowFromQuery(win) {
  if (win === 'daily') {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return d;
  }
  if (win === 'weekly') {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d;
  }
  return null;
}

/**
 * STUDENT: Submit a new score (persists per-submission; upserts all-time best)
 * Body: { type: 'game'|'quiz', ref: string|quizId, points: number, meta?: object }
 */
router.post('/student/leaderboard/submit', requireStudent, async (req, res) => {
  const { type, ref, points, meta = {} } = req.body || {};
  if (!type || !ref || typeof points !== 'number' || points < 0) {
    return res.status(400).json({ error: 'type, ref, and non-negative points are required' });
  }
  if (!['quiz', 'game'].includes(type)) {
    return res.status(400).json({ error: 'type must be "quiz" or "game"' });
  }

  const { error, student, klass } = await getStudentWithClass(req.userId);
  if (error) return res.status(400).json({ error });

  // For quizzes, ensure it belongs to the student's class
  if (type === 'quiz') {
    const quiz = await Quiz.findOne({ _id: ref, classId: klass._id }).lean();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found for your class' });
  }

  const refKey = normalizeRef(type, ref);
  const teacherId = student.assignedTeacherId || null;

  // 1) Log submission in score history (supports time-window boards)
  await LeaderboardScore.create({
    type,
    ref: refKey,
    classId: klass._id,
    teacherId,
    studentId: req.userId,
    points: Math.floor(points),
    meta: meta || null,
  });

  // 2) Upsert all-time best in compact Leaderboard
  const existing = await Leaderboard.findOne({ ref: refKey, studentId: req.userId }).lean();
  if (!existing) {
    await Leaderboard.create({
      type,
      ref: refKey,
      classId: klass._id,
      teacherId,
      studentId: req.userId,
      bestPoints: Math.floor(points),
      bestMeta: meta || null,
    });
  } else if (points > (existing.bestPoints || 0)) {
    await Leaderboard.updateOne(
      { _id: existing._id },
      {
        $set: {
          bestPoints: Math.floor(points),
          bestMeta: meta || null,
          classId: klass._id,
          teacherId,
        },
      }
    );
  }

  return res.json({ ok: true });
});

/**
 * STUDENT: Get leaderboard (supports time windows for games)
 * Query: ?type=quiz|game&ref=<id|slug>&window=daily|weekly (optional)
 */
router.get('/student/leaderboard', requireStudent, async (req, res) => {
  const { type, ref, window: win } = req.query || {};
  if (!type || !ref) return res.status(400).json({ error: 'type and ref are required' });

  const { error, klass } = await getStudentWithClass(req.userId);
  if (error) return res.status(400).json({ error });

  const refKey = normalizeRef(type, ref);
  const from = windowFromQuery(win);

  if (from && type === 'game') {
    // Windowed leaderboard based on score history (best per student within window)
    const rows = await LeaderboardScore.aggregate([
      { $match: { ref: refKey, classId: klass._id, createdAt: { $gte: from } } },
      { $group: { _id: '$studentId', bestPoints: { $max: '$points' }, lastAt: { $max: '$createdAt' } } },
      { $sort: { bestPoints: -1, lastAt: 1 } },
      { $limit: 50 },
    ]);

    const ids = rows.map((r) => r._id);
    const users = await User.find({ _id: { $in: ids } }).select('name').lean();
    const nameMap = new Map(users.map((u) => [String(u._id), u.name]));

    // Compute my rank in window
    const myBest = await LeaderboardScore.aggregate([
      { $match: { ref: refKey, classId: klass._id, studentId: mongoose.Types.ObjectId.createFromHexString(String(req.userId)), createdAt: { $gte: from } } },
      { $group: { _id: '$studentId', bestPoints: { $max: '$points' } } },
    ]);
    let you = null;
    if (myBest.length) {
      const betterCount = await LeaderboardScore.countDocuments({ ref: refKey, classId: klass._id, createdAt: { $gte: from }, points: { $gt: myBest[0].bestPoints } });
      you = { rank: betterCount + 1, bestPoints: myBest[0].bestPoints };
    }

    return res.json({
      type,
      ref: refKey,
      window: win,
      top: rows.map((r, i) => ({
        rank: i + 1,
        studentId: r._id,
        name: nameMap.get(String(r._id)) || 'Student',
        bestPoints: r.bestPoints,
        updatedAt: r.lastAt,
      })),
      you,
    });
  }

  // All-time (fallback to compact Leaderboard best)
  const rows = await Leaderboard.aggregate([
    { $match: { ref: refKey, classId: klass._id } },
    { $sort: { bestPoints: -1, updatedAt: 1 } },
    { $limit: 50 },
    { $project: { studentId: 1, bestPoints: 1, updatedAt: 1 } },
  ]);

  const ids = rows.map((r) => r.studentId);
  const users = await User.find({ _id: { $in: ids } }).select('name').lean();
  const nameMap = new Map(users.map((u) => [String(u._id), u.name]));

  const me = await Leaderboard.findOne({ ref: refKey, classId: klass._id, studentId: req.userId }).lean();
  let you = null;
  if (me) {
    const betterCount = await Leaderboard.countDocuments({ ref: refKey, classId: klass._id, bestPoints: { $gt: me.bestPoints } });
    you = { rank: betterCount + 1, bestPoints: me.bestPoints };
  }

  res.json({
    type,
    ref: refKey,
    window: win || 'all',
    top: rows.map((r, i) => ({
      rank: i + 1,
      studentId: r.studentId,
      name: nameMap.get(String(r.studentId)) || 'Student',
      bestPoints: r.bestPoints,
      updatedAt: r.updatedAt,
    })),
    you,
  });
});

/**
 * TEACHER: Get leaderboard (supports time windows for games)
 * Query: ?type=quiz|game&ref=<id|slug>&window=daily|weekly (optional)
 */
router.get('/teacher/leaderboard', requireTeacher, async (req, res) => {
  const { type, ref, window: win } = req.query || {};
  if (!type || !ref) return res.status(400).json({ error: 'type and ref are required' });

  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const refKey = normalizeRef(type, ref);
  const from = windowFromQuery(win);

  if (from && type === 'game') {
    const rows = await LeaderboardScore.aggregate([
      { $match: { ref: refKey, classId: mongoose.Types.ObjectId.createFromHexString(String(klass._id)), createdAt: { $gte: from } } },
      { $group: { _id: '$studentId', bestPoints: { $max: '$points' }, lastAt: { $max: '$createdAt' } } },
      { $sort: { bestPoints: -1, lastAt: 1 } },
      { $limit: 100 },
    ]);

    const ids = rows.map((r) => r._id);
    const users = await User.find({ _id: { $in: ids } }).select('name').lean();
    const nameMap = new Map(users.map((u) => [String(u._id), u.name]));

    return res.json({
      type,
      ref: refKey,
      window: win,
      top: rows.map((r, i) => ({
        rank: i + 1,
        studentId: r._id,
        name: nameMap.get(String(r._id)) || 'Student',
        bestPoints: r.bestPoints,
        updatedAt: r.lastAt,
      })),
    });
  }

  // All-time (compact Leaderboard)
  const rows = await Leaderboard.aggregate([
    { $match: { ref: refKey, classId: mongoose.Types.ObjectId.createFromHexString(String(klass._id)) } },
    { $sort: { bestPoints: -1, updatedAt: 1 } },
    { $limit: 100 },
    { $project: { studentId: 1, bestPoints: 1, updatedAt: 1 } },
  ]);

  const ids = rows.map((r) => r.studentId);
  const users = await User.find({ _id: { $in: ids } }).select('name').lean();
  const nameMap = new Map(users.map((u) => [String(u._id), u.name]));

  res.json({
    type,
    ref: refKey,
    window: win || 'all',
    top: rows.map((r, i) => ({
      rank: i + 1,
      studentId: r.studentId,
      name: nameMap.get(String(r.studentId)) || 'Student',
      bestPoints: r.bestPoints,
      updatedAt: r.updatedAt,
    })),
  });
});

/**
 * TEACHER: Reset leaderboard for a specific ref (class-scoped)
 * Body: { type:'game'|'quiz', ref: string|id }
 * - Deletes score history and all-time best for the teacher's class only.
 */
router.post('/teacher/leaderboard/reset', requireTeacher, async (req, res) => {
  const { type, ref } = req.body || {};
  if (!type || !ref) return res.status(400).json({ error: 'type and ref are required' });

  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const refKey = normalizeRef(type, ref);

  await LeaderboardScore.deleteMany({ ref: refKey, classId: klass._id });
  await Leaderboard.deleteMany({ ref: refKey, classId: klass._id });

  res.json({ ok: true, message: 'Leaderboard reset for your class' });
});

export default router;