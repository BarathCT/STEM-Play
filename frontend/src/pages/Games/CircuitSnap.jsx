import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "@/utils/auth";

const CircuitSnap = () => {
  const navigate = useNavigate();
  const refKey = "circuitsnap";

  const questions = [
    { question: "In a series circuit, if one bulb fuses, what happens to the other bulbs?", options: ["They glow brighter", "They go off", "They stay the same"], answer: "They go off" },
    { question: "In a parallel circuit, what happens if one bulb fuses?", options: ["All bulbs go off", "Only that bulb goes off", "Other bulbs glow brighter"], answer: "Only that bulb goes off" },
    { question: "Which circuit connection is used in household wiring?", options: ["Series", "Parallel", "Both"], answer: "Parallel" },
    { question: "In a short circuit, what happens to the current?", options: ["It decreases a lot", "It becomes zero", "It increases dangerously"], answer: "It increases dangerously" },
    { question: "Two 2Ω resistors in series give total resistance of:", options: ["1Ω", "2Ω", "4Ω"], answer: "4Ω" },
    { question: "Two 2Ω resistors in parallel give total resistance of:", options: ["1Ω", "2Ω", "4Ω"], answer: "1Ω" },
  ];

  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [saved, setSaved] = useState(false);

  const total = questions.length;

  const checkAnswer = () => {
    if (selected === questions[currentQ].answer) setScore((s) => s + 1);
    if (currentQ + 1 < total) {
      setCurrentQ((n) => n + 1);
      setSelected("");
    } else {
      setGameOver(true);
    }
  };

  async function submitScore(points) {
    setSaved(false);
    try {
      await authFetch('/student/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'game',
          ref: refKey,
          points,
          meta: { score, total },
        }),
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  const points = score * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">CircuitSnap</h2>
          <p className="text-sm text-gray-600 mb-4">Blue • White • Gray</p>

          {!gameOver ? (
            <>
              <div className="text-sm text-gray-600 mb-2">
                Question {currentQ + 1} / {total} • Score <span className="font-semibold text-blue-700">{score}</span>
              </div>

              <h3 className="text-base font-medium text-gray-900 mb-3">{questions[currentQ].question}</h3>

              <div className="flex flex-col gap-2 mb-4">
                {questions[currentQ].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(opt)}
                    className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                      selected === opt ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50 border-gray-200 text-gray-800"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <button
                onClick={checkAnswer}
                disabled={!selected}
                className={`px-4 py-2 rounded-md text-white ${selected ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
              >
                Submit
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Quiz Complete 🎉</h3>
              <p className="text-sm text-gray-700 mb-4">Your Score: <span className="font-bold text-blue-700">{score}</span> / {total}</p>
              <div className="text-2xl font-bold text-blue-700 mb-3">{points} points</div>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => { setCurrentQ(0); setScore(0); setSelected(""); setGameOver(false); setSaved(false); }}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Play Again
                </button>
                <button
                  onClick={() => navigate("/student/games")}
                  className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => submitScore(points)}
                  className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black"
                >
                  Save Score
                </button>
              </div>
              {saved && <div className="mt-2 text-xs text-green-600">Score saved!</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CircuitSnap;