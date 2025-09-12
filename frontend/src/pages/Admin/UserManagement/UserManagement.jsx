import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  GraduationCap,
  School,
  CheckCircle2,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

import UsersTable from '@/pages/components/UserManagement/UserTable/UsersTable';
import UserFiltersCard from '@/pages/components/UserManagement/UserFiltersCard';
import AddUserModal from '@/pages/components/UserManagement/AddUserModal';
import EditUserDialog from '../../components/UserManagement/UserTable/EditUserDialog';
import DeleteConfirmDialog from '../../components/UserManagement/UserTable/DeleteConfirmDialog';

// Lightweight HTTP helper
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

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
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
}

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function Notice({ ok = false, text }) {
  return (
    <div
      className={`mt-3 flex items-center gap-2 text-sm ${
        ok ? 'text-green-700' : 'text-red-700'
      }`}
    >
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      <span>{text}</span>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${
        active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-xs ${
            active ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Modern/hidden scrollbar utilities injected for this page.
 */
function ScrollbarStyles() {
  return (
    <style>{`
      .modern-scrollbar{scrollbar-width:thin;scrollbar-color:rgba(100,116,139,.6) transparent}
      .no-scrollbar{scrollbar-width:none}
      .modern-scrollbar::-webkit-scrollbar{width:8px;height:8px}
      .modern-scrollbar::-webkit-scrollbar-track{background:transparent}
      .modern-scrollbar::-webkit-scrollbar-thumb{background-color:rgba(100,116,139,.6);border-radius:9999px;border:2px solid transparent;background-clip:padding-box}
      .modern-scrollbar:hover::-webkit-scrollbar-thumb{background-color:rgba(71,85,105,.8)}
      .no-scrollbar::-webkit-scrollbar{display:none}
    `}</style>
  );
}

/**
 * Classes Panel (unchanged)
 */
function ClassesPanel({ classes, loading, error, onCreated }) {
  const [klass, setKlass] = useState('');
  const [section, setSection] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(error || null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setErr(error || null);
  }, [error]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSubmitting(true);
    try {
      const { class: created } = await request('/admin/classes', {
        method: 'POST',
        body: JSON.stringify({ class: Number(klass), section }),
      });
      onCreated?.(created);
      setMsg(`Created/Updated class ${created.label}`);
      setKlass('');
      setSection('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="font-semibold mb-3">Create Class</h2>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
        <div className="sm:col-span-1">
          <label className="text-sm text-gray-700">Class (1–12)</label>
          <input
            type="number"
            min="1"
            max="12"
            value={klass}
            onChange={(e) => setKlass(e.target.value)}
            required
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm text-gray-700">Section</label>
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value.toUpperCase())}
            placeholder="A/B/C..."
            required
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60 hover:bg-blue-700 transition-colors"
          >
            {submitting ? 'Saving...' : 'Save Class'}
          </button>
        </div>
      </form>

      {msg && <Notice ok text={msg} />}
      {err && <Notice text={err} />}

      <h3 className="font-semibold mt-4 mb-2">Existing Classes</h3>
      {loading ? (
        <div className="text-sm text-gray-500">Loading classes...</div>
      ) : classes?.length === 0 ? (
        <div className="text-sm text-gray-500">No classes yet.</div>
      ) : (
        <ul className="text-sm grid grid-cols-2 sm:grid-cols-3 gap-2">
          {classes.map((c) => (
            <li key={c._id} className="border rounded-md px-2 py-1">
              {c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function UserManagement() {
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [classesError, setClassesError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  // Modals
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [tab, setTab] = useState('users');

  const debouncedSearch = useDebounced(searchQuery, 300);

  // Load classes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { classes } = await request('/admin/classes');
        if (mounted) {
          setClasses(classes);
          setClassesError(null);
        }
      } catch (e) {
        if (mounted) setClassesError(e.message);
      } finally {
        if (mounted) setClassesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load users
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const [teachersRes, studentsRes] = await Promise.all([
        request('/admin/teachers'),
        request('/admin/students'),
      ]);

      const allUsers = [
        ...teachersRes.teachers.map((t) => ({ ...t, role: 'teacher' })),
        ...studentsRes.students.map((s) => ({ ...s, role: 'student' })),
      ];

      setUsers(allUsers);
    } catch (e) {
      console.error('Failed to load users:', e.message);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'users') {
      loadUsers();
    }
  }, [tab]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = debouncedSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.parentEmail && user.parentEmail.toLowerCase().includes(q)) ||
        (user.staffId && user.staffId.toLowerCase().includes(q)) ||
        (user.registerId && user.registerId.toLowerCase().includes(q));

      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesClass = !classFilter || user.class?.class?.toString() === classFilter;
      const matchesSection = !sectionFilter || user.class?.section === sectionFilter;

      return matchesSearch && matchesRole && matchesClass && matchesSection;
    });
  }, [users, debouncedSearch, roleFilter, classFilter, sectionFilter]);

  // Unique values for filters
  const uniqueClasses = useMemo(() => {
    const set = new Set(users.map((u) => u.class?.class).filter(Boolean));
    return Array.from(set).sort((a, b) => a - b);
  }, [users]);

  const uniqueSections = useMemo(() => {
    const set = new Set(users.map((u) => u.class?.section).filter(Boolean));
    return Array.from(set).sort();
  }, [users]);

  const teacherCount = users.filter((u) => u.role === 'teacher').length;
  const studentCount = users.filter((u) => u.role === 'student').length;

  const handleDelete = async () => {
    try {
      await request(`/admin/users/${deletingUser.id}`, { method: 'DELETE' });
      setDeletingUser(null);
      loadUsers();
    } catch (e) {
      console.error('Delete failed:', e.message);
    }
  };

  const upsertClassLocal = (created) => {
    setClasses((prev) => {
      const exists = prev.find((c) => c._id === created._id);
      if (exists) return prev;
      const next = [...prev, created];
      next.sort((a, b) => a.class - b.class || a.section.localeCompare(b.section));
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <ScrollbarStyles />

      {/* Page Header with Add User button */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Admin • User Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <TabButton
          active={tab === 'classes'}
          onClick={() => setTab('classes')}
          icon={School}
          label="Classes"
          count={classes.length}
        />
        <TabButton
          active={tab === 'users'}
          onClick={() => setTab('users')}
          icon={Users}
          label="All Users"
          count={users.length}
        />
      </div>

      <div className="bg-white border rounded-lg p-4">
        {tab === 'classes' && (
          <ClassesPanel
            classes={classes}
            loading={classesLoading}
            error={classesError}
            onCreated={upsertClassLocal}
          />
        )}

        {tab === 'users' && (
          <div>
            <div className="flex items-center gap-4 mb-3">
              <h2 className="font-semibold">Users</h2>
              <div className="flex gap-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  {teacherCount} Teachers
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {studentCount} Students
                </span>
              </div>
            </div>

            {/* Filters as separate card (not inside the table) */}
            <UserFiltersCard
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              roleFilter={roleFilter}
              onRoleChange={setRoleFilter}
              classFilter={classFilter}
              onClassChange={setClassFilter}
              sectionFilter={sectionFilter}
              onSectionChange={setSectionFilter}
              uniqueClasses={uniqueClasses}
              uniqueSections={uniqueSections}
              onClear={() => {
                setRoleFilter('');
                setClassFilter('');
                setSectionFilter('');
                setSearchQuery('');
              }}
            />

            {/* Users Table (reusable component) */}
            {usersLoading ? (
              <div className="text-center py-8 text-gray-500">Loading users...</div>
            ) : (
              <UsersTable
                users={filteredUsers}
                onEdit={(u) => setEditingUser(u)}
                onDelete={(u) => setDeletingUser(u)}
              />
            )}
          </div>
        )}
      </div>

      {/* Add User Modal (tabbed for Teacher/Student) */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        classes={classes}
        request={request}
        onSuccess={() => {
          setShowAddModal(false);
          loadUsers();
        }}
      />

      {/* Shared Modals */}
      <EditUserDialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => {
          setEditingUser(null);
          loadUsers();
        }}
        user={editingUser}
        mode="admin"
        request={request}
        classes={classes}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDelete}
        user={deletingUser}
      />
    </div>
  );
}