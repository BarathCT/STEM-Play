import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { authFetch, clearToken } from '../../utils/auth';

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const me = await authFetch('/auth/me');
        if (!cancelled) {
          setUser(me.user);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          clearToken();
          navigate('/login', { replace: true });
        }
      }
    }
    run();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}