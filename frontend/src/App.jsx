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

// Student
import StudentDashboard from '@/pages/Student/StudentDashboard';
import StudentBlogs from '@/pages/Student/Blogs';
import BlogView from '@/pages/Student/BlogView';

import Games from '@/pages/Games/Games';
import Mathtrail from '@/pages/Games/Mathtrail';
import Sudoku from '@/pages/Games/Sudoku';
import WordQuest from '@/pages/Games/WordQuest';
import WordTrail from '@/pages/Games/WordTrail';
import ChemConnect from '@/pages/Games/ChemConnect';
import CircuitSnap from '@/pages/Games/CircuitSnap';

// Shared
import Profile from '@/pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

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
          </Route>
        </Route>

        {/* Student routes (protected) */}
        <Route element={<ProtectedRoute allow={['student']} />}>
          <Route element={<AppLayout />}>
            <Route path="/student" element={<StudentDashboard />} />
            {/* Blogs */}
            <Route path="/student/blogs" element={<StudentBlogs />} />
            <Route path="/student/blogs/:id" element={<BlogView />} />
            {/* Games hub + individual games */}
            <Route path="/student/games" element={<Games />} />
            <Route path="/student/games/mathtrail" element={<Mathtrail />} />
            <Route path="/student/games/sudoku" element={<Sudoku />} />
            <Route path="/student/games/wordquest" element={<WordQuest />} />
            <Route path="/student/games/wordtrail" element={<WordTrail />} />
            <Route path="/student/games/chemconnect" element={<ChemConnect />} />
            <Route path="/student/games/circuitsnap" element={<CircuitSnap />} />
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