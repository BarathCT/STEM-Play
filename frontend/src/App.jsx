import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import ProtectedRoute from './pages/components/ProtectedRoute';
import UserManagement from './pages/Admin/UserManagement/UserManagement';
import TeacherDashboard from './pages/Teacher/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Profile from "./pages/Profile";
import AppLayout from './pages/components/AppLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import StudentManagement from './pages/Teacher/StudentManagement';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />


        {/* Admin protected route with shared layout */}
        <Route element={<ProtectedRoute allow={['admin']} />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            {/* add more admin pages under AppLayout here */}
          </Route>
        </Route>

        {/* Teacher protected route with shared layout */}
        <Route element={<ProtectedRoute allow={['teacher']} />}>
          <Route element={<AppLayout />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            {/* add more teacher pages under AppLayout here */}
          </Route>
        </Route>

        {/* Student protected route with shared layout */}
        <Route element={<ProtectedRoute allow={['student']} />}>
          <Route element={<AppLayout />}>
            <Route path="/student" element={<StudentDashboard />} />
            {/* add more student pages under AppLayout here */}
          </Route>
        </Route>

        {/* Admin protected route with shared layout */}
        <Route element={<ProtectedRoute allow={['admin']} />}>
          <Route element={<AppLayout />}>
            <Route path="/admin/user-management" element={<UserManagement />} />
            {/* add more admin pages under AppLayout here */}
          </Route>
        </Route>

        {/* Teacher routes */}
        <Route element={<ProtectedRoute allow={['teacher']} />}>
          <Route element={<AppLayout />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/student-management" element={<StudentManagement/>} />
          </Route>
        </Route>

        {/* Profile for all roles, still under shared layout */}
        <Route element={<ProtectedRoute allow={['admin', 'teacher', 'student']} />}>
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}