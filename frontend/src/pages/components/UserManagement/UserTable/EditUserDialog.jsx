import { useEffect, useMemo, useState } from 'react';
import { X, Save, Eye, EyeOff, Search } from 'lucide-react';

/**
  Shared Edit dialog for Admin and Teacher
  Props:
  - isOpen, onClose, onSaved
  - user: normalized { id, role, name, email?, parentEmail?, staffId?, registerId?, class?, teacher? }
  - mode: 'admin' | 'teacher'
  - request: fetch helper (path relative to API base)
  - classes: [{ _id, class, section, label }] (admin mode only, optional for teacher)
*/
export default function EditUserDialog({ isOpen, onClose, onSaved, user, mode = 'admin', request, classes = [] }) {
  const [role, setRole] = useState(user?.role || 'student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Class/section selection
  const classNumbers = useMemo(
    () => Array.from(new Set((classes || []).map((c) => c.class))).sort((a, b) => a - b),
    [classes]
  );
  const [classNumber, setClassNumber] = useState(user?.class?.class || '');
  const sectionsForClass = useMemo(
    () => (classNumber ? (classes || []).filter((c) => c.class === Number(classNumber)).map((c) => c.section) : []),
    [classNumber, classes]
  );
  const [section, setSection] = useState(user?.class?.section || '');

  // Teacher search/select (admin only)
  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherResults, setTeacherResults] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(user?.teacher || null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setRole(user.role || 'student');
      setName(user.name || '');
      setEmail(user.email || '');
      setParentEmail(user.parentEmail || '');
      setStaffId(user.staffId || '');
      setRegisterId(user.registerId || '');
      setNewPassword('');
      setClassNumber(user?.class?.class || '');
      setSection(user?.class?.section || '');
      setTeacherQuery('');
      setSelectedTeacher(user?.teacher || null);
      setTeacherResults([]);
      setSearching(false);
      setShowPwd(false);
    }
  }, [isOpen, user]);

  // When teacher selected, lock class/section to teacher's class
  useEffect(() => {
    if (selectedTeacher?.class) {
      setClassNumber(selectedTeacher.class.class);
      setSection(selectedTeacher.class.section);
    }
  }, [selectedTeacher]);

  async function searchTeachers(q) {
    if (!q || q.trim().length < 2) {
      setTeacherResults([]);
      return;
    }
    try {
      setSearching(true);
      const params = new URLSearchParams({ query: q.trim() });
      // If classNumber present, filter teachers by class
      const cls = (classes || []).find((c) => c.class === Number(classNumber) && c.section === section);
      if (cls?._id) params.set('classId', cls._id);
      const { teachers } = await request(`/admin/teachers?${params.toString()}`);
      setTeacherResults(teachers || []);
    } catch {
      setTeacherResults([]);
    } finally {
      setSearching(false);
    }
  }

  const canEditAssignments = mode === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  async function onSubmit(e) {
    e.preventDefault();

    if (mode === 'teacher') {
      // Teacher can only edit their own students' basic fields
      await request(`/teacher/students/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          parentEmail,
          registerId,
          newPassword: newPassword || undefined,
        }),
      });
      onSaved?.();
      onClose?.();
      return;
    }

    // Admin mode
    const body = {
      role, // allow role change (teacher <-> student)
      name,
      ...(isTeacher ? { email } : { parentEmail }),
      ...(isTeacher ? { staffId: staffId || null } : {}),
      ...(isStudent ? { registerId: registerId || null } : {}),
      ...(newPassword ? { newPassword } : {}),
    };

    if (isTeacher) {
      // determine classId from selected class/section
      const cls = (classes || []).find((c) => c.class === Number(classNumber) && c.section === section);
      if (cls?._id) body.classId = cls._id;
    } else if (isStudent) {
      // require a teacher selection; this drives class as well
      if (!selectedTeacher?.id) {
        throw new Error('Please select a class teacher for the student');
      }
      body.teacherId = selectedTeacher.id;
    }

    await request(`/admin/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    onSaved?.();
    onClose?.();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-transparent backdrop-blur-xs backdrop-brightness-75 backdrop-saturate-150" />
      <div
        className="relative bg-white rounded-lg p-6 w-full max-w-xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit {user?.role === 'teacher' ? 'Teacher' : 'Student'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Role (admin only) */}
          {canEditAssignments && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => {
                  const next = e.target.value;
                  setRole(next);
                  // Clear assignment selections when switching role
                  setSelectedTeacher(null);
                }}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {isTeacher ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID (optional)</label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
                <input
                  type="email"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Register ID (optional)</label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={registerId}
                  onChange={(e) => setRegisterId(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Assignment area (admin only) */}
          {canEditAssignments && isTeacher && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  value={classNumber || ''}
                  onChange={(e) => {
                    setSelectedTeacher(null); // class change invalidates selected teacher state (though not applicable for teacher)
                    setClassNumber(e.target.value ? Number(e.target.value) : '');
                    setSection('');
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select class</option>
                  {classNumbers.map((n) => (
                    <option key={n} value={n}>Class {n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={section || ''}
                  onChange={(e) => setSection(e.target.value)}
                  disabled={!classNumber}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select section</option>
                  {sectionsForClass.map((s) => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {canEditAssignments && isStudent && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher</label>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      placeholder="Search teacher by name..."
                      className="w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={teacherQuery}
                      onChange={(e) => {
                        setTeacherQuery(e.target.value);
                        setSelectedTeacher(null);
                        searchTeachers(e.target.value);
                      }}
                    />
                    {teacherResults.length > 0 && !selectedTeacher && (
                      <div className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                        {teacherResults.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                            onClick={() => {
                              setSelectedTeacher(t);
                              setTeacherResults([]);
                              setTeacherQuery(`${t.name} • ${t.class?.label || ''}`);
                            }}
                          >
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-gray-500">
                              {t.email} • {t.class?.label || 'No class'}
                            </div>
                          </button>
                        ))}
                        {searching && <div className="px-3 py-2 text-xs text-gray-500">Searching...</div>}
                      </div>
                    )}
                  </div>
                </div>
                {selectedTeacher && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                    Selected: <strong>{selectedTeacher.name}</strong> • {selectedTeacher.class?.label || '-'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Password */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                className="w-full border rounded-md px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Toggle password"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save Changes
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