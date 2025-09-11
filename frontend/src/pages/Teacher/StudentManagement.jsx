import { useEffect, useMemo, useState } from 'react';
import UsersTable from '../components/UserManagement/UsersTable';
import UserFiltersCard from '../components/UserManagement/UserFiltersCard';
import AddUserModal from '../components/UserManagement/AddUserModal';
import { Plus } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
function authHeaders() { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {}; }
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) } });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export default function TeacherStudentManagement() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [loading, setLoading] = useState(true);

  const q = searchQuery.trim().toLowerCase();

  async function load() {
    setLoading(true);
    try {
      const data = await request(`/teacher/students${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setStudents(data.students || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  const filtered = useMemo(() => students, [students]); // server filters by q

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">My Students</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      <UserFiltersCard
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
        showRole={false}
        showClass={false}
        showSection={false}
        searchPlaceholder="Search by name / parent email / register ID"
      />

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      ) : (
        <UsersTable
          users={filtered}
          onEdit={(u) => setEditing(u)}
          onDelete={(u) => setDeleting(u)}
          columns={{ role: false, class: false, teacher: false }} // hide columns for teacher view
        />
      )}

      {/* Create student (teacher mode) */}
      <AddUserModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        classes={[]} // not used in teacher mode
        request={request}
        onSuccess={load}
        mode="teacher"
        allowedTypes={['student']}
      />

      {/* Edit uses your existing edit modal in the teacher page or you can reuse admin edit with teacher endpoints if you refactor it similarly */}
      {/* For brevity, wire your existing edit/delete flows here using /teacher/students/:id */}
    </div>
  );
}