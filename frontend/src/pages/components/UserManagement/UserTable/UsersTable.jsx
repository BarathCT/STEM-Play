import React from 'react';
import { Edit, Trash2, Users, GraduationCap } from 'lucide-react';

/**
 * UsersTable
 * - Pass columns to control visibility per role/context.
 *   Example teacher-view: columns={{ role:false, class:false, teacher:false }}
 */
export default function UsersTable({
  users = [],
  onEdit,
  onDelete,
  columns: columnsProp,
}) {
  const defaultColumns = {
    email: true,
    role: true,
    id: true,
    class: true,
    teacher: true,
  };
  const columns = { ...defaultColumns, ...(columnsProp || {}) };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200" aria-label="Users table">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Name</th>
            {columns.email && (
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Email</th>
            )}
            {columns.role && (
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Role</th>
            )}
            {columns.id && (
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">ID</th>
            )}
            {columns.class && (
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Class</th>
            )}
            {columns.teacher && (
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Teacher</th>
            )}
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-4 py-2 text-sm">{user.name}</td>

              {columns.email && (
                <td className="border border-gray-200 px-4 py-2 text-sm">
                  {user.email || user.parentEmail}
                </td>
              )}

              {columns.role && (
                <td className="border border-gray-200 px-4 py-2 text-sm">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'teacher'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {user.role === 'teacher' ? (
                      <GraduationCap className="w-3 h-3" />
                    ) : (
                      <Users className="w-3 h-3" />
                    )}
                    {user.role}
                  </span>
                </td>
              )}

              {columns.id && (
                <td className="border border-gray-200 px-4 py-2 text-sm">
                  {user.staffId || user.registerId || '-'}
                </td>
              )}

              {columns.class && (
                <td className="border border-gray-200 px-4 py-2 text-sm">
                  {user.class ? user.class.label : 'No class assigned'}
                </td>
              )}

              {columns.teacher && (
                <td className="border border-gray-200 px-4 py-2 text-sm">
                  {user.role === 'student'
                    ? user.teacher
                      ? user.teacher.name
                      : 'No teacher'
                    : '-'}
                </td>
              )}

              <td className="border border-gray-200 px-4 py-2 text-sm">
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit?.(user)}
                    className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                    aria-label={`Edit ${user.name}`}
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete?.(user)}
                    className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs transition-colors"
                    aria-label={`Delete ${user.name}`}
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

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">No users found</div>
      )}
    </div>
  );
}