import React, { useEffect, useMemo, useState } from 'react';
import { X, UserPlus, GraduationCap, Users } from 'lucide-react';

/**
 * AddUserModal
 * - mode: 'admin' | 'teacher'
 *   - admin: can create teacher or student (requires selecting a teacher for students)
 *   - teacher: can create students ONLY (auto-assigned to teacher's class on server)
 * - allowedTypes: ['teacher','student'] to control tabs; for teacher pass ['student']
 * - request: fetch wrapper; the component will call the proper endpoints per mode.
 */
export default function AddUserModal({
  isOpen,
  onClose,
  classes = [],
  request,
  onSuccess,
  mode = 'admin',
  allowedTypes = ['teacher', 'student'],
}) {
  // Ensure first tab is allowed
  const firstAllowed = allowedTypes[0] || 'student';
  const [activeTab, setActiveTab] = useState(firstAllowed); // 'teacher' | 'student'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    parentEmail: '',
    staffId: '',
    registerId: '',
    classId: '',
  });

  // Teacher search (admin creating students)
  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherResults, setTeacherResults] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Debounce
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(teacherQuery), 250);
    return () => clearTimeout(t);
  }, [teacherQuery]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset when opening/closing
  useEffect(() => {
    if (isOpen) {
      setActiveTab(firstAllowed);
      setFormData({
        name: '',
        email: '',
        parentEmail: '',
        staffId: '',
        registerId: '',
        classId: '',
      });
      setTeacherQuery('');
      setTeacherResults([]);
      setSelectedTeacher(null);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, firstAllowed]);

  // Search teachers for admin -> student tab
  useEffect(() => {
    let cancelled = false;
    async function searchTeachers() {
      if (mode !== 'admin' || activeTab !== 'student') return;
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setTeacherResults([]);
        return;
      }
      try {
        const qs = new URLSearchParams({ query: debouncedQuery.trim() });
        const { teachers } = await request(`/admin/teachers?${qs}`);
        if (!cancelled) setTeacherResults(teachers);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Teacher search failed:', e.message);
      }
    }
    searchTeachers();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, activeTab, mode, request]);

  const canSubmit = useMemo(() => {
    if (activeTab === 'teacher') {
      return mode === 'admin' && formData.name && formData.email && formData.classId;
    }
    // student
    if (mode === 'admin') {
      return formData.name && formData.parentEmail && !!selectedTeacher;
    }
    // teacher mode: teacher auto-assigned; no teacher selection needed
    return formData.name && formData.parentEmail;
  }, [activeTab, formData, selectedTeacher, mode]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      if (activeTab === 'teacher') {
        // Admin creating a teacher
        await request('/admin/teachers', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            staffId: formData.staffId || undefined,
            classId: formData.classId,
          }),
        });
      } else {
        // Creating a student
        if (mode === 'admin') {
          await request('/admin/students', {
            method: 'POST',
            body: JSON.stringify({
              name: formData.name,
              parentEmail: formData.parentEmail,
              registerId: formData.registerId || undefined,
              teacherId: selectedTeacher.id, // required for admin flow
            }),
          });
        } else {
          // teacher mode: server auto-assigns class/teacher
          await request('/teacher/students', {
            method: 'POST',
            body: JSON.stringify({
              name: formData.name,
              parentEmail: formData.parentEmail,
              registerId: formData.registerId || undefined,
            }),
          });
        }
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    // Strong blur backdrop (no dark overlay)
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with strong blur and slight brightness reduction */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-transparent backdrop-blur-xs backdrop-brightness-75 backdrop-saturate-150"
      />
      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-lg w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Add New User</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3">
          <div className="inline-flex border rounded-md overflow-hidden">
            {allowedTypes.includes('teacher') && (
              <button
                className={`px-4 py-2 text-sm flex items-center gap-2 ${
                  activeTab === 'teacher' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
                onClick={() => setActiveTab('teacher')}
              >
                <GraduationCap className="w-4 h-4" />
                Teacher
              </button>
            )}
            {allowedTypes.includes('student') && (
              <button
                className={`px-4 py-2 text-sm flex items-center gap-2 ${
                  activeTab === 'student' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
                onClick={() => setActiveTab('student')}
              >
                <Users className="w-4 h-4" />
                Student
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {activeTab === 'teacher' ? (
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Register ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.registerId}
                  onChange={(e) => setFormData({ ...formData, registerId: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {mode === 'admin' && (
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
                      <div className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-52 overflow-auto shadow-lg">
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
                        <strong>Selected:</strong> {selectedTeacher.name} • Class:{' '}
                        {selectedTeacher.class?.label || '-'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="md:col-span-2">
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : `Create ${activeTab}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}