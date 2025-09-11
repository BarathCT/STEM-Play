import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, setToken } from '../utils/auth';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // role omitted; server auto-detects from identifier
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setToken(data.token);
      navigate(data.redirectPath || '/login', { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border rounded-lg p-4">
        <h1 className="text-xl font-semibold mb-3">Sign in</h1>
        <form onSubmit={onSubmit} className="grid gap-2">
          <div>
            <label className="text-sm text-gray-700">Email or Parent email</label>
            <input
              type="email"
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              placeholder="you@example.com or parent@example.com"
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Your password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
          {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
          <p className="text-xs text-gray-500 mt-2">
            Admin/Teacher: enter your email. Student: enter Parent email.
          </p>
        </form>
      </div>
    </div>
  );
}