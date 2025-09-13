import React, { useState, useMemo } from "react";
import { authFetch } from "@/utils/auth";

const WORD_BANK = {
  1: [
    { question: "Synonym of 'Happy'", answer: "Joyful", options: ["Sad", "Joyful", "Angry", "Dark"] },
    { question: "Antonym of 'Big'", answer: "Small", options: ["Tall", "Huge", "Small", "Large"] },
    { question: "Correct spelling?", answer: "Beautiful", options: ["Beutiful", "Beautifull", "Beautiful", "Beautifel"] },
  ],
  2: [
    { question: "Synonym of 'Fast'", answer: "Quick", options: ["Slow", "Quick", "Lazy", "Late"] },
    { question: "Antonym of 'Cold'", answer: "Hot", options: ["Cool", "Hot", "Freeze", "Chill"] },
    { question: "Correct spelling?", answer: "Knowledge", options: ["Knolege", "Knowledge", "Knowlege", "Knoladge"] },
  ],
  3: [
    { question: "Synonym of 'Brave'", answer: "Courageous", options: ["Weak", "Courageous", "Afraid", "Shy"] },
    { question: "Antonym of 'Light'", answer: "Dark", options: ["Glow", "Bright", "Dark", "Shiny"] },
    { question: "Correct spelling?", answer: "Environment", options: ["Enviroment", "Environmment", "Environment", "Environmant"] },
  ],
  4: [
    { question: "Synonym of 'Rich'", answer: "Wealthy", options: ["Poor", "Wealthy", "Broke", "Simple"] },
    { question: "Antonym of 'Young'", answer: "Old", options: ["Baby", "Teen", "Old", "New"] },
    { question: "Correct spelling?", answer: "Occasion", options: ["Occation", "Ocassion", "Occasion", "Ocationn"] },
  ],
  5: [
    { question: "Synonym of 'Angry'", answer: "Furious", options: ["Calm", "Furious", "Happy", "Silent"] },
    { question: "Antonym of 'Strong'", answer: "Weak", options: ["Tough", "Weak", "Solid", "Hard"] },
    { question: "Correct spelling?", answer: "Achievement", options: ["Acheivment", "Achievemant", "Achievement", "Acheevement"] },
  ],
};

const generateQuestions = (level) => {
  const base = WORD_BANK[level] || [];
  const qs = [];
  for (let i = 0; i < 10; i++) {
    const q = base[Math.floor(Math.random() * base.length)];
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);
    qs.push({ ...q, options: shuffled });
  }
  return qs;
};

const WordTrail = () => {
  const [level, setLevel] = useState(1);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  const questions = useMemo(() => generateQuestions(level), [level]);

  const handleAnswer = (selected) => {
    if (selected === questions[current].answer) setScore((s) => s + 1);
    if (current + 1 < questions.length) setCurrent((n) => n + 1);
    else setFinished(true);
  };

  const resetLevel = () => {
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setSaved(false);
  };

  const points = score * 100 + (level - 1) * 50; // small bonus for higher level
  const refKey = `wordtrail-lv${level}`;

  async function submitScore() {
    setSaved(false);
    try {
      await authFetch('/student/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'game', ref: refKey, points, meta: { score, total: questions.length, level } }),
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">WordTrail</h1>

        {!finished ? (
          <div className="rounded-2xl border bg-white shadow-sm p-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
              <span>Level: {level}</span>
              <span>Question {current + 1}/10</span>
            </div>

            <p className="text-xl font-semibold mb-5 text-gray-900">{questions[current].question}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {questions[current].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg shadow-sm transition-colors text-left"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white shadow-sm p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Level Complete 🎉</h2>
            <p className="text-sm text-gray-700 mb-1">Your Score: <span className="font-bold text-blue-700">{score}</span>/10</p>
            <div className="text-2xl font-bold text-blue-700 mb-3">{points} points</div>

            <div className="flex justify-center gap-2">
              {level < 5 ? (
                <button
                  onClick={() => { setLevel((v) => v + 1); resetLevel(); }}
                  className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Next Level →
                </button>
              ) : (
                <button
                  onClick={() => { setLevel(1); resetLevel(); }}
                  className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Restart
                </button>
              )}
              <button onClick={submitScore} className="px-5 py-2 rounded-md bg-gray-900 text-white hover:bg-black">Save Score</button>
            </div>
            {saved && <div className="mt-2 text-xs text-green-600">Score saved!</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordTrail;