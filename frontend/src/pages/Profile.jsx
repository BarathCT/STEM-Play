import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch, clearToken } from "../utils/auth";
import {
  Mail,
  Shield,
  IdCard,
  ClipboardCopy,
  CheckCircle2,
  Building2,
  GraduationCap,
  Users,
  Layers,
  ArrowLeft,
} from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [copyKey, setCopyKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load enriched profile (ensure /profile/me is mounted on the backend)
  useEffect(() => {
    let cancelled = false;
    async function fetchUser() {
      try {
        const data = await authFetch("/profile/me");
        if (!cancelled) {
          setUser(data?.user || null);
          setLoading(false);
        }
      } catch {
        clearToken();
        navigate("/login", { replace: true });
      }
    }
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const role = user?.role || "";
  const isTeacher = role === "teacher";
  const isStudent = role === "student";
  const isAdmin = role === "admin";
  const primaryEmail = user?.email || user?.parentEmail || "";
  const staffId = user?.staffId || "";
  const registerId = user?.registerId || "";
  const classLabel = user?.class?.label || user?.assignedClass?.label || "Not assigned";
  const teacherName = user?.assignedTeacher?.name || "";

  // Additional entries A–Z for completeness
  const EXCLUDE_KEYS = new Set([
    "passwordHash",
    "resetOtpHash",
    "resetOtpExpires",
    "resetOtpAttempts",
    "resetOtpLastSentAt",
    "__v",
  ]);
  const KNOWN_KEYS = new Set([
    "id",
    "_id",
    "name",
    "role",
    "email",
    "parentEmail",
    "staffId",
    "registerId",
    "class",
    "classes",
    "assignedClass",
    "assignedTeacher",
    "createdAt",
    "updatedAt",
  ]);

  const additionalEntries = useMemo(() => {
    if (!user) return [];
    const pairs = Object.entries(user)
      .filter(([k]) => !EXCLUDE_KEYS.has(k))
      .filter(([k]) => !KNOWN_KEYS.has(k));
    pairs.sort(([a], [b]) => a.localeCompare(b));
    return pairs.map(([k, v]) => {
      let display = "";
      if (v == null) display = "—";
      else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") display = String(v);
      else if (Array.isArray(v)) display = v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
      else display = JSON.stringify(v);
      return { key: k, value: display };
    });
  }, [user]);

  const copyToClipboard = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyKey(label);
      setTimeout(() => setCopyKey(null), 1200);
    } catch {
      setCopyKey(null);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading profile...</div>;
  }

  if (!user) {
    return <div className="text-center py-10 text-red-600">Unable to load profile.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Page header (app theme) */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900 truncate">{user.name}</h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border ${
                  isAdmin
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : isTeacher
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
                title="Role"
              >
                <Shield className="w-3.5 h-3.5" />
                {role.toUpperCase()}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              {primaryEmail && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-500" />
                  {primaryEmail}
                  <button
                    className="ml-1 text-blue-700 hover:text-blue-900"
                    onClick={() => copyToClipboard("email", primaryEmail)}
                    title="Copy email"
                  >
                    {copyKey === "email" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <ClipboardCopy className="w-4 h-4" />
                    )}
                  </button>
                </span>
              )}

              {(staffId || registerId) && (
                <span className="inline-flex items-center gap-1.5">
                  <IdCard className="w-4 h-4 text-gray-500" />
                  {staffId ? `Staff ID: ${staffId}` : `Register ID: ${registerId}`}
                </span>
              )}
            </div>
          </div>

          <div className="hidden sm:block">
            {classLabel ? (
              <div className="text-right">
                <div className="text-xs text-gray-500">Class</div>
                <div className="text-sm font-medium text-gray-800">{classLabel}</div>
              </div>
            ) : (
              <div className="text-right text-xs text-gray-500">No class assigned</div>
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Account (removed User ID, Created, Updated as requested) */}
        <section className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Account</h3>
          <DetailRow
            label="Role"
            value={role || "—"}
            icon={<Shield className="w-4 h-4 text-gray-400" />}
          />
        </section>

        {/* Contact */}
        <section className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact</h3>
          <DetailRow
            label={isStudent ? "Parent Email" : "Email"}
            value={primaryEmail || "Not provided"}
            icon={<Mail className="w-4 h-4 text-gray-400" />}
            onCopy={primaryEmail ? (v) => copyToClipboard("email2", v) : undefined}
          />
        </section>

        {/* School */}
        <section className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">School</h3>

          <DetailRow
            label="Class"
            value={classLabel}
            icon={<GraduationCap className="w-4 h-4 text-gray-400" />}
          />

          {isTeacher && user?.classes?.length > 1 && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                All Assigned Classes
              </div>
              <ul className="text-sm text-gray-800 list-disc ml-5">
                {user.classes.map((c) => (
                  <li key={c.id}>{c.label}</li>
                ))}
              </ul>
            </div>
          )}

          {isStudent && (
            <DetailRow
              label="Class Teacher"
              value={teacherName || "Not assigned"}
              icon={<Users className="w-4 h-4 text-gray-400" />}
            />
          )}

          {isTeacher && (
            <DetailRow
              label="Staff ID"
              value={staffId || "—"}
              icon={<IdCard className="w-4 h-4 text-gray-400" />}
            />
          )}

          {isStudent && (
            <DetailRow
              label="Register ID"
              value={registerId || "—"}
              icon={<IdCard className="w-4 h-4 text-gray-400" />}
            />
          )}
        </section>
      </div>

      {/* Additional info (A–Z of any extra fields) */}
      {additionalEntries.length > 0 && (
        <section className="bg-white border rounded-lg p-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Additional Info (A–Z)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {additionalEntries.map(({ key, value }) => (
              <div key={key} className="flex items-start gap-3">
                <div className="w-28 shrink-0 text-xs uppercase tracking-wide text-gray-500 pt-1">
                  {key}
                </div>
                <div className="text-sm text-gray-800 break-words">{value}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DetailRow({ label, value, icon, onCopy }) {
  const canCopy = typeof value === "string" && value && onCopy;
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex items-start gap-2">
        {icon ? <span className="mt-0.5">{icon}</span> : null}
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-sm font-medium text-gray-900 break-all">{value}</div>
        </div>
      </div>
      {canCopy ? (
        <button
          onClick={() => onCopy(value)}
          className="text-blue-700 hover:text-blue-900 p-1 rounded"
          title={`Copy ${label}`}
        >
          <ClipboardCopy className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
}