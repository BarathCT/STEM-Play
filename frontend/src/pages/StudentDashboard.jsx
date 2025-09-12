import { useEffect, useMemo, useState } from 'react';
import UsersTable from './components/UserManagement/UserTable/UsersTable';
import UserFiltersCard from './components/UserManagement/UserFiltersCard';
import AddUserModal from './components/UserManagement/AddUserModal';
import { Plus, Save, X, Eye, EyeOff, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
function authHeaders() { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {}; }
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) } });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

function Notice({ ok = false, text }) {
  return (
    <div className={`mt-2 text-sm ${ok ? 'text-green-700' : 'text-red-700'}`}>{text}</div>
  );
}

function EditStudentModal({ student, isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', parentEmail: '', registerId: '', newPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (isOpen && student) {
      setForm({
        name: student.name || '',
        parentEmail: student.parentEmail || '',
        registerId: student.registerId || '',
        newPassword: '',
      });
      setErr('');
      setSubmitting(false);
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    try {
      await request(`/teacher/students/${student.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          parentEmail: form.parentEmail,
          registerId: form.registerId,
          newPassword: form.newPassword || undefined,
        }),
      });
      onSaved?.();
      onClose?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-transparent backdrop-blur-xs backdrop-brightness-75 backdrop-saturate-150" />
      <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit Student</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="grid gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Name</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Parent Email</label>
            <input
              type="email"
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.parentEmail}
              onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Register ID (optional)</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.registerId}
              onChange={(e) => setForm({ ...form, registerId: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">New Password (optional)</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                className="w-full border rounded-md px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="Leave blank to keep current password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {err && <Notice text={err} />}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDelete({ open, onClose, onConfirm, student }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-transparent backdrop-blur-xs backdrop-brightness-75 backdrop-saturate-150" />
      <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold">Delete Student</h3>
        </div>
        <p className="text-gray-700">Are you sure you want to delete <strong>{student?.name}</strong>?</p>
        <p className="text-sm text-gray-500 mt-1">Email: {student?.parentEmail}</p>
        <div className="flex gap-2 mt-5">
          <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function StudentManagement() {
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

      {/* Edit Student */}
      <EditStudentModal
        student={editing}
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        onSaved={load}
      />

      {/* Delete confirm */}
      <ConfirmDelete
        open={!!deleting}
        onClose={() => setDeleting(null)}
        student={deleting}
        onConfirm={async () => {
          try {
            await request(`/teacher/students/${deleting.id}`, { method: 'DELETE' });
            setDeleting(null);
            load();
          } catch (e) {
            // eslint-disable-next-line no-alert
            alert(e.message);
          }
        }}
      />
    </div>
  );
}