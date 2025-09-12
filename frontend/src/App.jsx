import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import ProtectedRoute from './pages/components/ProtectedRoute';
import AppLayout from './pages/components/AppLayout';

// Admin
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement/UserManagement';

// Teacher
import TeacherDashboard from './pages/Teacher/TeacherDashboard';
import StudentManagement from './pages/Teacher/StudentManagement';

// Student
import StudentDashboard from './pages/StudentDashboard';

// Shared
import Profile from './pages/Profile';

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
          </Route>
        </Route>

        {/* Student routes (protected) */}
        <Route element={<ProtectedRoute allow={['student']} />}>
          <Route element={<AppLayout />}>
            <Route path="/student" element={<StudentDashboard />} />
          </Route>
        </Route>

        {/* Profile for all roles (protected) */}
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