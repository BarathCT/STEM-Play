// frontend/src/pages/StudentDashboard.jsx
import { useEffect, useState } from "react";
import { authFetch, clearToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await authFetch("/auth/me");
        setUser(data.user);

        const lbData = await authFetch("/quiz/leaderboard").catch(() => []);
        setLeaderboard(lbData);
      } catch (err) {
        console.error("Auth error:", err);
        clearToken();
        navigate("/login");
      }
    }
    fetchUser();
  }, [navigate]);

  function handleLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  if (!user) {
    return <div className="text-center py-8 text-lg text-blue-700">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-blue-100 to-blue-50">
      {/* Navbar */}
      <header className="flex justify-between items-center px-6 py-4 bg-white shadow-md">
        <h1
          className="text-xl font-bold text-blue-700 cursor-pointer"
          onClick={() => navigate("/student")}
        >
          STEM-Play
        </h1>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center space-x-3 focus:outline-none"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>

            {/* Name + Reg No */}
            <div className="hidden sm:block text-left">
              <p className="font-semibold text-gray-800">{user.name}</p>
              {user.regNo && (
                <p className="text-gray-500 text-xs">Reg No: {user.regNo}</p>
              )}
            </div>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border rounded-md shadow-lg py-2 z-50">
              <button
  onClick={() => navigate("/profile")}
  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50"
>
  Profile
</button>

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Quizzes */}
        <section className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-blue-700 mb-3">Quizzes</h2>
          <p className="text-sm text-gray-600">Your available quizzes will appear here.</p>
          <button
            // onClick={() => navigate("/quiz")}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Attempt Quiz
          </button>
        </section>

        {/* Games */}
        <section className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-green-700 mb-3">Games</h2>
          <p className="text-sm text-gray-600">Play fun STEM-related educational games here.</p>
          <button
            // onClick={() => navigate("/games")}
            className="mt-4 px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Play Games
          </button>
        </section>

        {/* Leaderboard */}
        <section className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-yellow-700 mb-3">Leaderboard</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            {leaderboard.length === 0 ? (
              <p className="text-gray-500">No scores yet. Be the first!</p>
            ) : (
              <ul>
                {leaderboard.map((entry, idx) => (
                  <li
                    key={entry.id || idx}
                    className="flex justify-between py-2 border-b last:border-none"
                  >
                    <span className="font-medium text-gray-800">
                      {idx + 1}. {entry.name}
                    </span>
                    <span className="font-bold text-blue-600">{entry.score}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
