import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Leaderboard from '../models/Leaderboard.js';

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
const requireTeacher = requireRole('teacher');
const requireStudent = requireRole('student');

async function getTeacherPrimaryClass(teacherId) {
  const t = await User.findOne({ _id: teacherId, role: 'teacher' })
    .populate('classIds', 'class section')
    .lean();
  if (!t) return { error: 'Teacher not found' };
  const klass = t.classIds?.[0];
  if (!klass) return { error: 'No class assigned to this teacher' };
  return { teacher: t, klass };
}

async function getStudentClass(studentId) {
  const s = await User.findOne({ _id: studentId, role: 'student' })
    .populate('assignedClassId', 'class section')
    .lean();
  if (!s) return { error: 'Student not found' };
  const klass = s.assignedClassId;
  if (!klass) return { error: 'No class assigned to this student' };
  return { student: s, klass };
}

/**
 * TEACHER: List quizzes (own class)
 */
router.get('/teacher/quizzes', requireTeacher, async (req, res) => {
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const list = await Quiz.find({ teacherId: req.userId, classId: klass._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    quizzes: list.map(q => ({
      id: q._id,
      title: q.title,
      perQuestionSeconds: q.perQuestionSeconds,
      maxAttemptsPerStudent: q.maxAttemptsPerStudent,
      published: q.published,
      questionsCount: q.questions.length,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    })),
  });
});

/**
 * TEACHER: Create quiz
 */
router.post('/teacher/quizzes', requireTeacher, async (req, res) => {
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  let {
    title,
    questions = [],
    perQuestionSeconds = 30,
    maxAttemptsPerStudent = 1,
    published = true,
    sourceBlogId = null,
  } = req.body || {};

  if (!title || !Array.isArray(questions) || questions.length < 1) {
    return res.status(400).json({ error: 'title and at least 1 question are required' });
  }
  for (const q of questions) {
    if (!q?.text || !Array.isArray(q?.options) || q.options.length < 2 || typeof q.correctIndex !== 'number') {
      return res.status(400).json({ error: 'Invalid question format' });
    }
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return res.status(400).json({ error: 'correctIndex out of range' });
    }
  }

  perQuestionSeconds = Math.min(600, Math.max(5, Number(perQuestionSeconds) || 30));
  maxAttemptsPerStudent = Math.min(10, Math.max(1, Number(maxAttemptsPerStudent) || 1));

  const quiz = await Quiz.create({
    teacherId: req.userId,
    classId: klass._id,
    title: String(title).trim(),
    sourceBlogId: sourceBlogId || null,
    questions: questions.map(q => ({
      text: String(q.text).trim(),
      options: q.options.map(o => String(o)),
      correctIndex: Number(q.correctIndex),
    })),
    perQuestionSeconds,
    maxAttemptsPerStudent,
    published: !!published,
  });

  res.json({
    ok: true,
    quiz: {
      id: quiz._id,
      title: quiz.title,
      questionsCount: quiz.questions.length,
      perQuestionSeconds: quiz.perQuestionSeconds,
      maxAttemptsPerStudent: quiz.maxAttemptsPerStudent,
      published: quiz.published,
    },
  });
});

/**
 * TEACHER: Update quiz
 */
router.put('/teacher/quizzes/:id', requireTeacher, async (req, res) => {
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const updates = {};
  const { title, perQuestionSeconds, maxAttemptsPerStudent, published, questions } = req.body || {};

  if (title !== undefined) updates.title = String(title).trim();
  if (perQuestionSeconds !== undefined)
    updates.perQuestionSeconds = Math.min(600, Math.max(5, Number(perQuestionSeconds)));
  if (maxAttemptsPerStudent !== undefined)
    updates.maxAttemptsPerStudent = Math.min(10, Math.max(1, Number(maxAttemptsPerStudent)));
  if (published !== undefined) updates.published = !!published;

  if (questions !== undefined) {
    if (!Array.isArray(questions) || questions.length < 1) {
      return res.status(400).json({ error: 'questions must be a non-empty array' });
    }
    for (const q of questions) {
      if (!q?.text || !Array.isArray(q?.options) || q.options.length < 2 || typeof q.correctIndex !== 'number') {
        return res.status(400).json({ error: 'Invalid question format' });
      }
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        return res.status(400).json({ error: 'correctIndex out of range' });
      }
    }
    updates.questions = questions.map(q => ({
      text: String(q.text).trim(),
      options: q.options.map(o => String(o)),
      correctIndex: Number(q.correctIndex),
    }));
  }

  const quiz = await Quiz.findOneAndUpdate(
    { _id: req.params.id, teacherId: req.userId, classId: klass._id },
    { $set: updates },
    { new: true }
  ).lean();

  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  res.json({
    ok: true,
    quiz: {
      id: quiz._id,
      title: quiz.title,
      questionsCount: quiz.questions.length,
      perQuestionSeconds: quiz.perQuestionSeconds,
      maxAttemptsPerStudent: quiz.maxAttemptsPerStudent,
      published: quiz.published,
    },
  });
});

/**
 * TEACHER: Delete quiz
 */
router.delete('/teacher/quizzes/:id', requireTeacher, async (req, res) => {
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const found = await Quiz.findOne({ _id: req.params.id, teacherId: req.userId, classId: klass._id });
  if (!found) return res.status(404).json({ error: 'Quiz not found' });

  await Quiz.deleteOne({ _id: found._id });
  await QuizAttempt.deleteMany({ quizId: found._id });
  // It's fine to keep leaderboard entries; or you can delete them:
  // await Leaderboard.deleteMany({ ref: `quiz:${found._id}` });

  res.json({ ok: true, message: `Deleted quiz "${found.title}"` });
});

/**
 * TEACHER: Leaderboard (existing quiz-based, still available)
 */
router.get('/teacher/quizzes/:id/leaderboard', requireTeacher, async (req, res) => {
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const quiz = await Quiz.findOne({ _id: req.params.id, teacherId: req.userId, classId: klass._id }).lean();
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const rows = await QuizAttempt.aggregate([
    { $match: { quizId: mongoose.Types.ObjectId.createFromHexString(String(quiz._id)) } },
    {
      $group: {
        _id: '$studentId',
        bestPoints: { $max: '$totalPoints' },
        bestCorrect: { $max: '$correctCount' },
        lastAt: { $max: '$createdAt' },
      },
    },
    { $sort: { bestPoints: -1, lastAt: 1 } },
    { $limit: 100 },
  ]);

  const ids = rows.map(r => r._id);
  const students = await User.find({ _id: { $in: ids } }).select('name').lean();
  const nameMap = new Map(students.map(s => [s._id.toString(), s.name]));

  res.json({
    leaderboard: rows.map((r, i) => ({
      rank: i + 1,
      studentId: r._id,
      name: nameMap.get(String(r._id)) || 'Student',
      bestPoints: r.bestPoints,
      bestCorrect: r.bestCorrect,
      lastAt: r.lastAt,
    })),
  });
});

/**
 * STUDENT: List quizzes for student's class (published only) + attempts summary
 */
router.get('/student/quizzes', requireStudent, async (req, res) => {
  const { error, klass } = await getStudentClass(req.userId);
  if (error) return res.status(400).json({ error });

  const list = await Quiz.find({ classId: klass._id, published: true }).sort({ createdAt: -1 }).lean();

  const summary = await QuizAttempt.aggregate([
    { $match: { studentId: mongoose.Types.ObjectId.createFromHexString(String(req.userId)) } },
    { $group: { _id: '$quizId', count: { $sum: 1 }, bestPoints: { $max: '$totalPoints' } } },
  ]);
  const map = new Map(summary.map(s => [String(s._id), s]));

  res.json({
    class: { id: klass._id, class: klass.class, section: klass.section, label: `${klass.class} - ${klass.section}` },
    quizzes: list.map(q => {
      const a = map.get(String(q._id));
      return {
        id: q._id,
        title: q.title,
        perQuestionSeconds: q.perQuestionSeconds,
        questionsCount: q.questions.length,
        attemptsUsed: a?.count || 0,
        maxAttemptsPerStudent: q.maxAttemptsPerStudent,
        bestPoints: a?.bestPoints || 0,
        createdAt: q.createdAt,
      };
    }),
  });
});

/**
 * STUDENT: Get a quiz to play (without answers)
 */
router.get('/student/quizzes/:id', requireStudent, async (req, res) => {
  const { error, klass } = await getStudentClass(req.userId);
  if (error) return res.status(400).json({ error });

  const quiz = await Quiz.findOne({ _id: req.params.id, classId: klass._id, published: true }).lean();
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const used = await QuizAttempt.countDocuments({ quizId: quiz._id, studentId: req.userId });

  res.json({
    quiz: {
      id: quiz._id,
      title: quiz.title,
      perQuestionSeconds: quiz.perQuestionSeconds,
      maxAttemptsPerStudent: quiz.maxAttemptsPerStudent,
      attemptsUsed: used,
      questions: quiz.questions.map(q => ({
        text: q.text,
        options: q.options,
      })),
    },
  });
});

/**
 * STUDENT: Submit an attempt (also updates Leaderboard bestPoints)
 */
router.post('/student/quizzes/:id/attempt', requireStudent, async (req, res) => {
  const { error, klass } = await getStudentClass(req.userId);
  if (error) return res.status(400).json({ error });

  const quiz = await Quiz.findOne({ _id: req.params.id, classId: klass._id, published: true }).lean();
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const used = await QuizAttempt.countDocuments({ quizId: quiz._id, studentId: req.userId });
  if (used >= quiz.maxAttemptsPerStudent) {
    return res.status(403).json({ error: 'Attempts limit reached' });
  }

  const { answers = [] } = req.body || {};
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    return res.status(400).json({ error: 'answers must match questions length' });
  }

  const perSec = quiz.perQuestionSeconds;
  const maxPoints = 100;

  const computed = answers.map(a => {
    const qi = Number(a.questionIndex);
    const sel = Number(a.selectedIndex);
    const t = Math.max(0, Math.min(perSec, Number(a.timeTakenSec) || perSec));
    const q = quiz.questions[qi];
    const validSel = sel >= 0 && sel < (q?.options?.length || 0);
    const correct = !!q && validSel && sel === q.correctIndex;
    const remaining = Math.max(0, perSec - t);
    const scale = perSec > 0 ? remaining / perSec : 0;
    const points = correct ? Math.max(1, Math.round(maxPoints * scale)) : 0;

    return {
      questionIndex: qi,
      selectedIndex: validSel ? sel : -1,
      timeTakenSec: t,
      correct,
      points,
    };
  });

  const totalPoints = computed.reduce((s, x) => s + x.points, 0);
  const correctCount = computed.reduce((s, x) => s + (x.correct ? 1 : 0), 0);

  const attempt = await QuizAttempt.create({
    quizId: quiz._id,
    studentId: req.userId,
    answers: computed,
    correctCount,
    totalPoints,
  });

  // Upsert into Leaderboard (best score for this quiz)
  const refKey = `quiz:${quiz._id}`;
  const student = await User.findById(req.userId).select('assignedTeacherId').lean();
  const teacherId = student?.assignedTeacherId || null;
  const existing = await Leaderboard.findOne({ ref: refKey, studentId: req.userId }).lean();
  if (!existing || totalPoints > (existing.bestPoints || 0)) {
    if (!existing) {
      await Leaderboard.create({
        type: 'quiz',
        ref: refKey,
        classId: klass._id,
        teacherId,
        studentId: req.userId,
        bestPoints: totalPoints,
        bestMeta: { correctCount, total: quiz.questions.length },
      });
    } else {
      await Leaderboard.updateOne(
        { _id: existing._id },
        {
          $set: {
            bestPoints: totalPoints,
            bestMeta: { correctCount, total: quiz.questions.length },
            classId: klass._id,
            teacherId,
          },
        }
      );
    }
  }

  res.json({
    ok: true,
    attempt: {
      id: attempt._id,
      correctCount,
      totalPoints,
      answers: computed,
    },
  });
});

export default router;