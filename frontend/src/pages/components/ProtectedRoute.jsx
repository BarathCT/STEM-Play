import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function ProtectedRoute({ allow = [] }) {
  const location = useLocation();
  const [status, setStatus] = useState({ checking: true, ok: false, role: null });

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const token = localStorage.getItem('token');
      if (!token) {
        if (!cancelled) setStatus({ checking: false, ok: false, role: null });
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const role = data?.user?.role || null;

        const ok = allow.length === 0 || (role && allow.includes(role));
        if (!cancelled) setStatus({ checking: false, ok, role });
      } catch {
        if (!cancelled) setStatus({ checking: false, ok: false, role: null });
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [allow]);

  if (status.checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-500">
        Checking access…
      </div>
    );
  }

  if (!status.ok) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}