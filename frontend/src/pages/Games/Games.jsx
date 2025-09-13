import { Link } from "react-router-dom";

export default function Games() {
  const cards = [
    { to: "/student/games/wordtrail", title: "WordTrail", desc: "Build your vocabulary with quick MCQs.", emoji: "📝" },
    { to: "/student/games/wordquest", title: "WordQuest", desc: "Unscramble words and sharpen spelling.", emoji: "🔤" },
    { to: "/student/games/circuitsnap", title: "CircuitSnap", desc: "Test electricity circuit basics.", emoji: "⚡" },
    { to: "/student/games/chemconnect", title: "ChemConnect", desc: "Learn first 20 elements playfully.", emoji: "🧪" },
    { to: "/student/games/sudoku", title: "Sudoku", desc: "Challenge logic across levels.", emoji: "🧠" },
    { to: "/student/games/logic-gate", title: "Logic Gate", desc: "Logic gates to improve the logic of 0's and 1's", emoji: "⚡" },
    { to: "/student/games/binary-games", title: "Binary Games", desc: "Binary games 0's and 1's", emoji: "0 & 1" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Student Games</h1>
        <p className="text-sm text-gray-600 mt-1">Blue • White • Gray classic theme</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-2xl">{c.emoji}</div>
              <div className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-blue-700">{c.title}</div>
              <div className="text-sm text-gray-600 mt-1">{c.desc}</div>
              <div className="mt-4 inline-flex items-center text-sm font-medium text-blue-700">
                Play now →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}