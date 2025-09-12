// Removed the old inline header; Navbar comes from AppLayout
import { useEffect, useState } from "react";
import { authFetch, clearToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
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

  if (!user) {
    return <div className="text-center py-8 text-lg text-blue-700">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
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
         <Link
          to="/student/games"
          className="inline-block mt-4 px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          Play Games
        </Link>
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
    </div>
  );
}