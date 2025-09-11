import { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Users, GraduationCap, School, CheckCircle2, AlertCircle, Search, 
  Filter, Edit, Eye, EyeOff, Save, X, ChevronDown, ChevronUp, Trash2, UserPlus
} from 'lucide-react';

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
    <div className={`mt-3 flex items-center gap-2 text-sm ${ok ? 'text-green-700' : 'text-red-700'}`}>
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
        <span className={`px-1.5 py-0.5 rounded-full text-xs ${
          active ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function DeleteConfirmModal({ user, isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Delete {user?.role}</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{user?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Email: {user?.email || user?.parentEmail}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    parentEmail: '',
    staffId: '',
    registerId: '',
    currentPassword: '',
    newPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        parentEmail: user.parentEmail || '',
        staffId: user.staffId || '',
        registerId: user.registerId || '',
        currentPassword: user.role === 'teacher' ? 'teacher' : 'student',
        newPassword: '',
      });
      setError(null);
    }
  }, [user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const updateData = {
        name: formData.name,
        ...(user.role === 'student' ? { parentEmail: formData.parentEmail } : { email: formData.email }),
        ...(formData.staffId && { staffId: formData.staffId }),
        ...(formData.registerId && { registerId: formData.registerId }),
        ...(formData.newPassword && { newPassword: formData.newPassword }),
      };

      await request(`/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Edit {user?.role === 'teacher' ? 'Teacher' : 'Student'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {user?.role === 'teacher' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700">Parent Email</label>
              <input
                type="email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          )}

          {user?.role === 'teacher' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Staff ID</label>
              <input
                type="text"
                value={formData.staffId}
                onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {user?.role === 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Register ID</label>
              <input
                type="text"
                value={formData.registerId}
                onChange={(e) => setFormData({ ...formData, registerId: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={formData.currentPassword}
                className="mt-1 w-full border rounded-md px-3 py-2 pr-10 text-sm bg-gray-50"
                readOnly
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">New Password (optional)</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Leave blank to keep current password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <Notice text={error} />}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateUserForm({ classes, onSuccess, onCancel }) {
  const [userType, setUserType] = useState('teacher');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    parentEmail: '',
    staffId: '',
    registerId: '',
    classId: '',
    teacherId: '',
  });
  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherResults, setTeacherResults] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const debouncedQuery = useDebounced(teacherQuery, 250);

  useEffect(() => {
    let cancelled = false;
    async function searchTeachers() {
      if (userType !== 'student' || !debouncedQuery || debouncedQuery.trim().length < 2) {
        setTeacherResults([]);
        return;
      }
      try {
        const qs = new URLSearchParams({ query: debouncedQuery.trim() });
        const { teachers } = await request(`/admin/teachers?${qs}`);
        if (!cancelled) {
          setTeacherResults(teachers);
        }
      } catch (e) {
        console.error('Teacher search failed:', e.message);
      }
    }
    searchTeachers();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, userType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (userType === 'teacher') {
        await request('/admin/teachers', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            staffId: formData.staffId,
            classId: formData.classId,
          }),
        });
      } else {
        await request('/admin/students', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            parentEmail: formData.parentEmail,
            registerId: formData.registerId,
            teacherId: selectedTeacher.id,
          }),
        });
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-6 p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Add New User</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="teacher"
              checked={userType === 'teacher'}
              onChange={(e) => setUserType(e.target.value)}
              className="mr-2"
            />
            Teacher
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="student"
              checked={userType === 'student'}
              onChange={(e) => setUserType(e.target.value)}
              className="mr-2"
            />
            Student
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {userType === 'teacher' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID (optional)</label>
              <input
                type="text"
                value={formData.staffId}
                onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
              <input
                type="email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Register ID (optional)</label>
              <input
                type="text"
                value={formData.registerId}
                onChange={(e) => setFormData({ ...formData, registerId: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search teacher by name..."
                  value={teacherQuery}
                  onChange={(e) => {
                    setTeacherQuery(e.target.value);
                    setSelectedTeacher(null);
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {teacherResults.length > 0 && !selectedTeacher && (
                  <div className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-40 overflow-auto shadow-lg">
                    {teacherResults.map((teacher) => (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setTeacherQuery(teacher.name);
                          setTeacherResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                      >
                        <div className="font-medium">{teacher.name}</div>
                        <div className="text-xs text-gray-500">
                          {teacher.email} • {teacher.class?.label || 'No class'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedTeacher && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                    <strong>Selected:</strong> {selectedTeacher.name} • Class: {selectedTeacher.class?.label}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting || (userType === 'student' && !selectedTeacher)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating...' : `Create ${userType}`}
          </button>
        </div>
      </form>
      {error && <Notice text={error} />}
    </div>
  );
}

export default function AdminUserManagement() {
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
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
        request('/admin/students')
      ]);
      
      const allUsers = [
        ...teachersRes.teachers.map(t => ({ ...t, role: 'teacher' })),
        ...studentsRes.students.map(s => ({ ...s, role: 'student' }))
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
    return users.filter(user => {
      const matchesSearch = !debouncedSearch || 
        user.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (user.parentEmail && user.parentEmail.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (user.staffId && user.staffId.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (user.registerId && user.registerId.toLowerCase().includes(debouncedSearch.toLowerCase()));
      
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesClass = !classFilter || user.class?.class?.toString() === classFilter;
      const matchesSection = !sectionFilter || user.class?.section === sectionFilter;

      return matchesSearch && matchesRole && matchesClass && matchesSection;
    });
  }, [users, debouncedSearch, roleFilter, classFilter, sectionFilter]);

  // Get unique values for filters
  const uniqueClasses = useMemo(() => {
    const set = new Set(users.map(u => u.class?.class).filter(Boolean));
    return Array.from(set).sort((a, b) => a - b);
  }, [users]);

  const uniqueSections = useMemo(() => {
    const set = new Set(users.map(u => u.class?.section).filter(Boolean));
    return Array.from(set).sort();
  }, [users]);

  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const studentCount = users.filter(u => u.role === 'student').length;

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
      <h1 className="text-2xl font-bold mb-3">Admin • User Management</h1>

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
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold">Users Management</h2>
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
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {showCreateForm ? 'Cancel' : 'Add User'}
              </button>
            </div>

            {showCreateForm && (
              <CreateUserForm 
                classes={classes} 
                onSuccess={() => { 
                  setShowCreateForm(false); 
                  loadUsers(); 
                }} 
                onCancel={() => setShowCreateForm(false)}
              />
            )}

            {/* Search and Filters */}
            <div className="mb-4 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-gray-50 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {showFilters && (
                <div className="flex gap-2 p-3 bg-gray-50 rounded-md">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Roles</option>
                    <option value="teacher">Teachers</option>
                    <option value="student">Students</option>
                  </select>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Classes</option>
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Sections</option>
                    {uniqueSections.map(section => (
                      <option key={section} value={section}>Section {section}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setRoleFilter('');
                      setClassFilter('');
                      setSectionFilter('');
                      setSearchQuery('');
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Users Table */}
            {usersLoading ? (
              <div className="text-center py-8 text-gray-500">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Name</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Email</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Role</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">ID</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Class</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Teacher</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2 text-sm">{user.name}</td>
                        <td className="border border-gray-200 px-4 py-2 text-sm">
                          {user.email || user.parentEmail}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-sm">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'teacher' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-sm">
                          {user.staffId || user.registerId || '-'}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-sm">
                          {user.class ? user.class.label : 'No class assigned'}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-sm">
                          {user.role === 'student' ? (user.teacher ? user.teacher.name : 'No teacher') : '-'}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-sm">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No users found</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={() => {
          setEditingUser(null);
          loadUsers();
        }}
      />

      <DeleteConfirmModal
        user={deletingUser}
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDelete}
      />
    </div>
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