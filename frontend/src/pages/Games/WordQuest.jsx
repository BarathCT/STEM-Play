import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "@/utils/auth";

const WordQuest = () => {
  const navigate = useNavigate();
  const refKey = "wordquest";

  const questions = [
    { word: "CAT", jumbled: "TAC" },
    { word: "BOOK", jumbled: "KOOB" },
    { word: "TREE", jumbled: "REET" },
    { word: "WATER", jumbled: "TERWA" },
    { word: "EARTH", jumbled: "RHTEA" },
  ];

  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [saved, setSaved] = useState(false);

  const total = questions.length;

  const checkAnswer = () => {
    if (answer.trim().toUpperCase() === questions[currentQ].word) {
      setScore((s) => s + 1);
    }
    if (currentQ + 1 < total) {
      setCurrentQ((n) => n + 1);
      setAnswer("");
    } else {
      setGameOver(true);
    }
  };

  const resetGame = () => {
    setCurrentQ(0);
    setAnswer("");
    setScore(0);
    setGameOver(false);
    setSaved(false);
  };

  const points = score * 100;

  async function submitScore() {
    setSaved(false);
    try {
      await authFetch('/student/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'game', ref: refKey, points, meta: { score, total } }),
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-2xl border bg-white shadow-sm p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">WordQuest</h2>
          <p className="text-sm text-gray-600 mb-6">Unscramble words • Blue/Gray</p>

          {!gameOver ? (
            <>
              <div className="text-sm text-gray-600 mb-2">
                Question {currentQ + 1} / {total} • Score <span className="font-semibold text-blue-700">{score}</span>
              </div>

              <div className="text-3xl font-extrabold text-blue-700 tracking-widest mb-5">
                {questions[currentQ].jumbled}
              </div>

              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer"
                className="w-full border border-gray-300 rounded-md px-4 py-2 mb-4 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={checkAnswer}
                className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Submit
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Game Over 🎉</h3>
              <p className="text-sm text-gray-700 mb-2">
                Your Score: <span className="font-bold text-blue-700">{score}</span> / {total}
              </p>
              <div className="text-2xl font-bold text-blue-700 mb-3">{points} points</div>
              <div className="flex justify-center gap-2">
                <button onClick={resetGame} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Play Again</button>
                <button onClick={() => navigate("/student/games")} className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50">Back</button>
                <button onClick={submitScore} className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black">Save Score</button>
              </div>
              {saved && <div className="mt-2 text-xs text-green-600">Score saved!</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordQuest;