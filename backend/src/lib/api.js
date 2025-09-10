const API_BASE = import.meta.env.FRONTEND_URL || 'http://localhost:5173';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  getClasses: () => request('/admin/classes'),
  createClass: (payload) => request('/admin/classes', { method: 'POST', body: JSON.stringify(payload) }),

  searchTeachers: ({ query, classId } = {}) => {
    const qs = new URLSearchParams();
    if (query) qs.set('query', query);
    if (classId) qs.set('classId', classId);
    return request(`/admin/teachers?${qs.toString()}`);
  },
  createTeacher: (payload) => request('/admin/teachers', { method: 'POST', body: JSON.stringify(payload) }),

  createStudent: (payload) => request('/admin/students', { method: 'POST', body: JSON.stringify(payload) })
};