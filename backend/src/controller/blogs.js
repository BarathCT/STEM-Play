import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Blog from '../models/Blog.js';

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
 * TEACHER: List blogs (own class)
 */
router.get('/teacher/blogs', requireTeacher, async (req, res) => {
  const { subject = '' } = req.query;
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const filter = { teacherId: req.userId, classId: klass._id };
  if (subject) filter.subject = subject;

  const blogs = await Blog.find(filter).sort({ updatedAt: -1 }).lean();
  res.json({
    blogs: blogs.map((b) => ({
      id: b._id,
      subject: b.subject,
      title: b.title,
      summary: b.summary || '',
      published: b.published,
      updatedAt: b.updatedAt,
      createdAt: b.createdAt,
      class: { id: klass._id, class: klass.class, section: klass.section, label: `${klass.class} - ${klass.section}` },
    })),
  });
});

/**
 * TEACHER: Create blog (rich content)
 */
router.post('/teacher/blogs', requireTeacher, async (req, res) => {
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const { subject, title, summary = '', content, published = true } = req.body || {};
  if (!subject || !title) return res.status(400).json({ error: 'subject and title are required' });
  if (typeof content !== 'object' || !content) return res.status(400).json({ error: 'content (rich JSON) is required' });

  const blog = await Blog.create({
    teacherId: req.userId,
    classId: klass._id,
    subject: String(subject).trim(),
    title: String(title).trim(),
    summary: String(summary || ''),
    content,
    published: !!published,
  });

  res.json({
    ok: true,
    blog: {
      id: blog._id,
      subject: blog.subject,
      title: blog.title,
      summary: blog.summary,
      published: blog.published,
      content: blog.content,
      class: { id: klass._id, class: klass.class, section: klass.section, label: `${klass.class} - ${klass.section}` },
    },
  });
});

/**
 * TEACHER: Get one blog
 */
router.get('/teacher/blogs/:id', requireTeacher, async (req, res) => {
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const blog = await Blog.findOne({ _id: req.params.id, teacherId: req.userId, classId: klass._id }).lean();
  if (!blog) return res.status(404).json({ error: 'Blog not found' });

  res.json({
    blog: {
      id: blog._id,
      subject: blog.subject,
      title: blog.title,
      summary: blog.summary,
      published: blog.published,
      content: blog.content,
      class: { id: klass._id, class: klass.class, section: klass.section, label: `${klass.class} - ${klass.section}` },
    },
  });
});

/**
 * TEACHER: Update blog
 */
router.put('/teacher/blogs/:id', requireTeacher, async (req, res) => {
  const { error, klass } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const updates = {};
  const { subject, title, summary, content, published } = req.body || {};
  if (subject !== undefined) updates.subject = String(subject).trim();
  if (title !== undefined) updates.title = String(title).trim();
  if (summary !== undefined) updates.summary = String(summary);
  if (content !== undefined) {
    if (typeof content !== 'object' || !content) return res.status(400).json({ error: 'content must be a rich JSON object' });
    updates.content = content;
  }
  if (published !== undefined) updates.published = !!published;

  const blog = await Blog.findOneAndUpdate(
    { _id: req.params.id, teacherId: req.userId, classId: klass._id },
    { $set: updates },
    { new: true }
  ).lean();

  if (!blog) return res.status(404).json({ error: 'Blog not found' });

  res.json({
    ok: true,
    blog: {
      id: blog._id,
      subject: blog.subject,
      title: blog.title,
      summary: blog.summary,
      published: blog.published,
      content: blog.content,
      class: { id: klass._id, class: klass.class, section: klass.section, label: `${klass.class} - ${klass.section}` },
    },
  });
});

/**
 * TEACHER: Delete blog
 */
router.delete('/teacher/blogs/:id', requireTeacher, async (req, res) => {
  const { error } = await getTeacherPrimaryClass(req.userId);
  if (error) return res.status(400).json({ error });

  const found = await Blog.findOne({ _id: req.params.id, teacherId: req.userId });
  if (!found) return res.status(404).json({ error: 'Blog not found' });

  await Blog.deleteOne({ _id: found._id });
  res.json({ ok: true, message: `Deleted blog "${found.title}"` });
});

/**
 * STUDENT: List blogs for student's class (published only)
 */
router.get('/student/blogs', requireStudent, async (req, res) => {
  const { error, klass } = await getStudentClass(req.userId);
  if (error) return res.status(400).json({ error });

  const blogs = await Blog.find({ classId: klass._id, published: true })
    .populate('teacherId', 'name')
    .sort({ updatedAt: -1 })
    .lean();

  res.json({
    class: { id: klass._id, class: klass.class, section: klass.section, label: `${klass.class} - ${klass.section}` },
    blogs: blogs.map((b) => ({
      id: b._id,
      subject: b.subject,
      title: b.title,
      summary: b.summary || '',
      teacher: b.teacherId ? { id: b.teacherId._id, name: b.teacherId.name } : null,
      updatedAt: b.updatedAt,
    })),
  });
});

/**
 * STUDENT: Get one published blog for student's class
 */
router.get('/student/blogs/:id', requireStudent, async (req, res) => {
  const { error, klass } = await getStudentClass(req.userId);
  if (error) return res.status(400).json({ error });

  const blog = await Blog.findOne({ _id: req.params.id, classId: klass._id, published: true })
    .populate('teacherId', 'name')
    .lean();
  if (!blog) return res.status(404).json({ error: 'Blog not found' });

  res.json({
    blog: {
      id: blog._id,
      subject: blog.subject,
      title: blog.title,
      summary: blog.summary,
      content: blog.content,
      teacher: blog.teacherId ? { id: blog.teacherId._id, name: blog.teacherId.name } : null,
      class: { id: klass._id, class: klass.class, section: klass.section, label: `${klass.class} - ${klass.section}` },
    },
  });
});

export default router;