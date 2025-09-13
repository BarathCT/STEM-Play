import { useMemo, useState } from 'react';
import LeaderboardPanel from '@/pages/components/LeaderboardPanel';
import { authFetch } from '@/utils/auth';

const GAME_OPTIONS = [
  { value: 'circuitsnap', label: 'CircuitSnap' },
  { value: 'chemconnect', label: 'ChemConnect' },
  { value: 'wordquest', label: 'WordQuest' },
  { value: 'wordtrail', label: 'WordTrail (levels)' },
  { value: 'mathtrail', label: 'MathTrail (levels)' },
  { value: 'sudoku', label: 'Sudoku (levels)' },
];

export default function TeacherLeaderboards() {
  const [game, setGame] = useState('circuitsnap');
  const [level, setLevel] = useState(1);
  const [win, setWin] = useState('daily'); // 'daily' | 'weekly' | 'all'
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const needsLevel = useMemo(() => ['wordtrail', 'mathtrail', 'sudoku'].includes(game), [game]);
  const refKey = useMemo(() => (needsLevel ? `${game}-lv${level}` : game), [game, level, needsLevel]);

  async function resetNow() {
    setBusy(true);
    setMsg('');
    try {
      await authFetch('/teacher/leaderboard/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'game', ref: refKey }),
      });
      setMsg('Leaderboard reset for your class.');
    } catch (e) {
      setMsg(e.message || 'Failed to reset');
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(''), 1500);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Game Leaderboards</h1>
      <p className="text-sm text-gray-600">Select a game and view Daily/Weekly/All-time ranks.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <div className="text-xs text-gray-600 mb-1">Game</div>
          <select className="border rounded px-3 py-2 text-sm" value={game} onChange={(e) => setGame(e.target.value)}>
            {GAME_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </label>

        {needsLevel && (
          <label className="block">
            <div className="text-xs text-gray-600 mb-1">Level</div>
            <select className="border rounded px-3 py-2 text-sm" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}

        <div className="inline-flex rounded-md overflow-hidden border">
          {['daily', 'weekly', 'all'].map((k) => (
            <button
              key={k}
              className={`px-3 py-1.5 text-sm ${win === k ? 'bg-blue-600 text-white' : 'bg-white'}`}
              onClick={() => setWin(k)}
            >
              {k === 'all' ? 'All-time' : k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={resetNow}
          disabled={busy}
          className="ml-auto px-3 py-2 rounded-md border hover:bg-gray-50 text-sm"
          title="Clears scores for this game in your class"
        >
          {busy ? 'Resetting…' : 'Reset leaderboard (class)'}
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-600 h-5">{msg}</div>

      <div className="mt-4">
        <LeaderboardPanel viewer="teacher" type="game" refKey={refKey} windowRange={win === 'all' ? undefined : win} title="Class Leaderboard" />
      </div>
    </div>
  );
}