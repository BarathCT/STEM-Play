import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Routes
import adminRoutes from './src/controller/admin.js';
import authRoutes from './src/controller/auth.js';
import teacherRoutes from './src/controller/teacher.js';
import profileRoutes from './src/controller/profile.js';
import blogRoutes from './src/controller/blogs.js';
import quizRoutes from './src/controller/quizzes.js';
import leaderboardRoutes from './src/controller/leaderboard.js'; // NEW

// Models (for seeding)
import User from './src/models/User.js';

// Optional: verify SMTP on boot (non-fatal)
import { verifyEmailTransport } from './src/lib/mailer.js';

// Env vars
const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/userManagementDB';
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (NODE_ENV !== 'production') return cb(null, true);
      if (FRONTEND_URLS.includes(origin)) return cb(null, true);
      return cb(new Error('CORS not allowed'), false);
    },
    credentials: false,
  })
);

app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, env: NODE_ENV, time: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/teacher', teacherRoutes);
app.use('/profile', profileRoutes);
app.use('/', blogRoutes);
app.use('/', quizRoutes);
app.use('/', leaderboardRoutes); // NEW

// 404
app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ error: 'Not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (NODE_ENV !== 'production') console.error('Error:', err);
  res.status(err?.status || 500).json({ error: err?.message || 'Server error' });
});

let server;

async function seedAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const adminName = process.env.ADMIN_NAME || 'STEMPlay Admin';

  const existing = await User.findOne({ role: 'admin', email: adminEmail });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await User.create({ name: adminName, email: adminEmail, passwordHash, role: 'admin' });
    console.log('🔐 Seeded admin', adminEmail);
  } else {
    console.log('🔐 Admin exists:', adminEmail);
  }
}

async function start() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: MONGO_URI.split('/').pop() });
    console.log('✅ MongoDB connected');
    verifyEmailTransport?.().catch(() => {});
    await seedAdmin();
    server = app.listen(PORT, () => console.log(`🚀 API on http://localhost:${PORT}`));
  } catch (e) {
    console.error('❌ Failed to start server:', e);
    process.exit(1);
  }
}
start();

async function shutdown(code = 0) {
  try {
    if (server) await new Promise((r) => server.close(r));
    await mongoose.connection.close();
  } finally {
    process.exit(code);
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));