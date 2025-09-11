import React from 'react';
import { Search } from 'lucide-react';

/**
 * UserFiltersCard
 * - Control which filters are shown via flags:
 *   showRole, showClass, showSection (all default true)
 * - For teacher student management, pass all three as false to show only search.
 */
export default function UserFiltersCard({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleChange,
  classFilter,
  onClassChange,
  sectionFilter,
  onSectionChange,
  uniqueClasses = [],
  uniqueSections = [],
  onClear,
  showRole = true,
  showClass = true,
  showSection = true,
  searchPlaceholder = 'Search users...',
}) {
  return (
    <div className="mb-4 p-4 border rounded-lg bg-white">
      <h3 className="font-medium mb-3">Search and Filters</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {showRole && (
          <div>
            <select
              value={roleFilter}
              onChange={(e) => onRoleChange?.(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Roles</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
            </select>
          </div>
        )}

        {showClass && (
          <div>
            <select
              value={classFilter}
              onChange={(e) => onClassChange?.(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
          </div>
        )}

        {showSection && (
          <div>
            <select
              value={sectionFilter}
              onChange={(e) => onSectionChange?.(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Sections</option>
              {uniqueSections.map((section) => (
                <option key={section} value={section}>
                  Section {section}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="md:col-span-3">
          <button
            onClick={onClear}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}