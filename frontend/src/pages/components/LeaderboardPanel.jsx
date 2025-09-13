import { useEffect, useState } from 'react';
import { authFetch } from '@/utils/auth';

/**
 * LeaderboardPanel
 * Props:
 * - type: 'game' | 'quiz'   (required)
 * - refKey: string          (required) e.g., 'circuitsnap', 'wordtrail-lv3', or quizId
 * - viewer: 'student' | 'teacher' (default: 'student')
 * - windowRange: 'daily' | 'weekly' | undefined (undefined => all-time)
 * - title: string (optional)
 */
export default function LeaderboardPanel({ type, refKey, viewer = 'student', windowRange, title = 'Leaderboard' }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]);
  const [you, setYou] = useState(null);

  const hasInputs = Boolean(type) && Boolean(refKey);
  const endpoint = viewer === 'teacher' ? '/teacher/leaderboard' : '/student/leaderboard';

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!hasInputs) {
        setLoading(false);
        setErr('');
        setRows([]);
        setYou(null);
        return;
      }
      setLoading(true);
      setErr('');
      try {
        const qs = new URLSearchParams({ type, ref: refKey });
        if (windowRange) qs.set('window', windowRange);
        const res = await authFetch(`${endpoint}?${qs.toString()}`);
        if (!alive) return;
        setRows(res.top || []);
        setYou(res.you || null);
      } catch (e) {
        if (!alive) return;
        const msg = String(e?.message || '');
        if (msg.includes('Unauthorized') || msg.includes('403')) {
          setErr('You are not allowed to view this leaderboard.');
        } else {
          setErr(e.message || 'Failed to load leaderboard');
        }
        setRows([]);
        setYou(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => { alive = false; };
  }, [type, refKey, viewer, windowRange, hasInputs, endpoint]);

  const rangeLabel = windowRange === 'daily' ? 'Daily' : windowRange === 'weekly' ? 'Weekly' : 'All-time';

  return (
    <div className="border rounded-lg bg-white">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-600">{rangeLabel}</div>
      </div>
      <div className="p-4">
        {!hasInputs ? (
          <div className="text-sm text-gray-600">Select a game/quiz to view its leaderboard.</div>
        ) : loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : err ? (
          <div className="text-sm text-red-600">{err}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600">No scores yet.</div>
        ) : (
          <div className="text-sm">
            <div className="grid grid-cols-4 font-semibold text-gray-700 border-b py-1">
              <div>#</div>
              <div className="col-span-2">Student</div>
              <div>Points</div>
            </div>
            {rows.map((r) => (
              <div key={r.studentId} className="grid grid-cols-4 py-1 border-b last:border-b-0">
                <div>{r.rank}</div>
                <div className="col-span-2">{r.name}</div>
                <div>{r.bestPoints}</div>
              </div>
            ))}
            {you && (
              <div className="mt-3 text-xs text-gray-600">
                Your best: <span className="font-semibold text-blue-700">{you.bestPoints}</span> • Rank {you.rank}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}