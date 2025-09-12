// Removed the old inline header; Navbar comes from AppLayout
import { useEffect, useState } from "react";
import { authFetch, clearToken } from "@/utils/auth";
import { useNavigate, Link } from "react-router-dom";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    async function fetchUser() {
      try {
        const data = await authFetch("/auth/me");
        if (!alive) return;
        setUser(data.user);
      } catch {
        // Auth failed -> clear token and redirect to login
        clearToken();
        navigate("/login");
      }
    }
    fetchUser();
    return () => {
      alive = false;
    };
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
          onClick={() => navigate("/student/quizzes")}
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
    </div>
  );
}