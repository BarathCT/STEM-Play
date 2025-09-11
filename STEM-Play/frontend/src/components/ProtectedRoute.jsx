import { Navigate, Outlet } from 'react-router-dom';
import { getRole, isExpired } from '../utils/auth';

export default function ProtectedRoute({ allow = [] }) {
  if (isExpired()) return <Navigate to="/login" replace />;
  const role = getRole();
  if (!role || (allow.length > 0 && !allow.includes(role))) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}