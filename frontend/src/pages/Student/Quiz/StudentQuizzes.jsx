import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '@/utils/auth';
import { Timer, Trophy, Play } from 'lucide-react';

export default function StudentQuizzes() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [cls, setCls] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await authFetch('/student/quizzes');
        if (!alive) return;
        setCls(res.class || null);
        setQuizzes(res.quizzes || []);
      } catch (e) {
        setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="text-center py-10 text-gray-500">Loading…</div>;
  if (err) return <div className="text-center py-10 text-red-600">{err}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold">Quizzes</h1>
      {cls && <div className="text-xs text-gray-500">Class {cls.label}</div>}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {quizzes.map(q => {
          const attemptsLeft = Math.max(0, q.maxAttemptsPerStudent - q.attemptsUsed);
          return (
            <div key={q.id} className="border rounded-lg p-3 bg-white">
              <div className="text-sm font-semibold">{q.title}</div>
              <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                <span className="inline-flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {q.perQuestionSeconds}s • {q.questionsCount} Q</span>
                <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Best {q.bestPoints}</span>
              </div>
              <div className="mt-2 text-xs text-gray-600">Attempts left: {attemptsLeft}</div>
              <button
                disabled={attemptsLeft <= 0}
                onClick={() => navigate(`/student/quizzes/${q.id}`)}
                className={`mt-3 inline-flex items-center gap-2 px-3 py-2 rounded text-white ${attemptsLeft <= 0 ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            </div>
          );
        })}
        {quizzes.length === 0 && (
          <div className="text-sm text-gray-500">No quizzes posted yet.</div>
        )}
      </div>
    </div>
  );
}