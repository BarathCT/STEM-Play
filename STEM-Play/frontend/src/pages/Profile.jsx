import { useEffect, useState } from "react";
import { authFetch, clearToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await authFetch("/auth/me");
        setUser(data.user);
      } catch (err) {
        console.error("Profile fetch error:", err);
        clearToken();
        navigate("/login");
      }
    }
    fetchUser();
  }, [navigate]);

  if (!user) {
    return <div className="text-center py-8 text-lg text-blue-700">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-blue-100 to-blue-50 flex justify-center items-center px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-sky-500 mx-auto flex items-center justify-center text-white text-2xl font-bold">
          {user.name?.charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <h1 className="mt-4 text-2xl font-bold text-gray-800">{user.name}</h1>
        <p className="text-sm text-gray-500">{user.role.toUpperCase()}</p>

        {/* Details */}
        <div className="mt-6 text-left space-y-3">
          <div>
            <p className="text-gray-600 text-sm">Email</p>
            <p className="font-medium text-gray-800">
              {user.email || user.parentEmail || "Not provided"}
            </p>
          </div>
          {user.regNo && (
            <div>
              <p className="text-gray-600 text-sm">Registration Number</p>
              <p className="font-medium text-gray-800">{user.regNo}</p>
            </div>
          )}
          <div>
            <p className="text-gray-600 text-sm">Role</p>
            <p className="font-medium text-gray-800">{user.role}</p>
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          ⬅ Back
        </button>
      </div>
    </div>
  );
}
