import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminUserManagement from './pages/AdminUserManagement';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Admin protected route */}
        <Route element={<ProtectedRoute allow={['admin']} />}>
          <Route path="/admin" element={<AdminUserManagement />} />
        </Route>

        {/* Teacher protected route */}
        <Route element={<ProtectedRoute allow={['teacher']} />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
        </Route>

        {/* Student protected route */}
        <Route element={<ProtectedRoute allow={['student']} />}>
          <Route path="/student" element={<StudentDashboard />} />
        </Route>

        {/* Profile protected route (all roles can access) */}
        <Route element={<ProtectedRoute allow={['admin', 'teacher', 'student']} />}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
