import { useMemo, useState } from 'react';
import LeaderboardPanel from '@/components/LeaderboardPanel';

const GAME_OPTIONS = [
  { value: 'circuitsnap', label: 'CircuitSnap' },
  { value: 'chemconnect', label: 'ChemConnect' },
  { value: 'wordquest', label: 'WordQuest' },
  { value: 'wordtrail', label: 'WordTrail (levels)' },
  { value: 'mathtrail', label: 'MathTrail (levels)' },
  { value: 'sudoku', label: 'Sudoku (levels)' },
];

export default function GameLeaderboards() {
  const [game, setGame] = useState('circuitsnap');
  const [level, setLevel] = useState(1);

  const needsLevel = useMemo(() => ['wordtrail', 'mathtrail', 'sudoku'].includes(game), [game]);
  const refKey = useMemo(() => (needsLevel ? `${game}-lv${level}` : game), [game, level, needsLevel]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Game Leaderboards</h1>
      <p className="text-sm text-gray-600">View top students in your class.</p>

      <div className="mt-4 flex flex-wrap gap-3 items-end">
        <label className="block">
          <div className="text-xs text-gray-600 mb-1">Game</div>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={game}
            onChange={(e) => setGame(e.target.value)}
          >
            {GAME_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </label>

        {needsLevel && (
          <label className="block">
            <div className="text-xs text-gray-600 mb-1">Level</div>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            >
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="mt-4">
        <LeaderboardPanel viewer="teacher" type="game" refKey={refKey} title="Class Leaderboard" />
      </div>
    </div>
  );
}