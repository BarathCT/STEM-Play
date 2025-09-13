import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Auth/Login';
import ProtectedRoute from '@/pages/components/ProtectedRoute';
import AppLayout from '@/pages/components/AppLayout';

// Admin
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import UserManagement from '@/pages/Admin/UserManagement/UserManagement';

// Teacher
import TeacherDashboard from '@/pages/Teacher/TeacherDashboard';
import StudentManagement from '@/pages/Teacher/StudentManagement';
import TeacherBlogs from '@/pages/Teacher/Blogs';
import TeacherQuizzes from '@/pages/Teacher/Quiz/TeacherQuizzes';
import TeacherLeaderboards from '@/pages/Teacher/Leaderboards'; // FIXED: import the teacher leaderboards page

// Student
import StudentDashboard from '@/pages/Student/StudentDashboard';
import StudentBlogs from '@/pages/Student/Blogs';
import BlogView from '@/pages/Student/BlogView';
import StudentQuizzes from '@/pages/Student/Quiz/StudentQuizzes';
import QuizPlay from '@/pages/Student/Quiz/QuizPlay';
import StudentLeaderboards from '@/pages/Student/Leaderboards'; // NEW: student leaderboards page

// Games (student)
import Games from '@/pages/Games/Games';
import Mathtrail from '@/pages/Games/Mathtrail';
import Sudoku from '@/pages/Games/Sudoku';
import WordQuest from '@/pages/Games/WordQuest';
import WordTrail from '@/pages/Games/WordTrail';
import ChemConnect from '@/pages/Games/ChemConnect';
import CircuitSnap from '@/pages/Games/CircuitSnap';

// Shared
import Profile from '@/pages/Profile';
import LogicGate from './pages/Games/LogicGate';
import BinaryGames from './pages/Games/BinaryGames';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        {/* Legacy redirects */}
        <Route path="/games" element={<Navigate to="/student/games" replace />} />
        <Route path="/student/quiz" element={<Navigate to="/student/quizzes" replace />} />

        {/* Admin routes (protected) */}
        <Route element={<ProtectedRoute allow={['admin']} />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/user-management" element={<UserManagement />} />
          </Route>
        </Route>

        {/* Teacher routes (protected) */}
        <Route element={<ProtectedRoute allow={['teacher']} />}>
          <Route element={<AppLayout />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/student-management" element={<StudentManagement />} />
            <Route path="/teacher/blogs" element={<TeacherBlogs />} />
            <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
            <Route path="/teacher/leaderboards" element={<TeacherLeaderboards />} /> {/* Route for teacher leaderboards */}
          </Route>
        </Route>

        {/* Student routes (protected) */}
        <Route element={<ProtectedRoute allow={['student']} />}>
          <Route element={<AppLayout />}>
            <Route path="/student" element={<StudentDashboard />} />
            {/* Blogs */}
            <Route path="/student/blogs" element={<StudentBlogs />} />
            <Route path="/student/blogs/:id" element={<BlogView />} />
            {/* Quizzes */}
            <Route path="/student/quizzes" element={<StudentQuizzes />} />
            <Route path="/student/quizzes/:id" element={<QuizPlay />} />
            {/* Games hub + individual games */}
            <Route path="/student/games" element={<Games />} />
            <Route path="/student/games/mathtrail" element={<Mathtrail />} />
            <Route path="/student/games/sudoku" element={<Sudoku />} />
            <Route path="/student/games/wordquest" element={<WordQuest />} />
            <Route path="/student/games/wordtrail" element={<WordTrail />} />
            <Route path="/student/games/chemconnect" element={<ChemConnect />} />
            <Route path="/student/games/circuitsnap" element={<CircuitSnap />} />
            <Route path="/student/games/logic-gate" element={<LogicGate />} />
            <Route path="/student/games/binary-games" element={<BinaryGames />} />
            {/* Leaderboards (student) */}
            <Route path="/student/leaderboards" element={<StudentLeaderboards />} /> {/* NEW route */}
          </Route>
        </Route>

        {/* Profile (protected for all roles) */}
        <Route element={<ProtectedRoute allow={['admin', 'teacher', 'student']} />}>
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}