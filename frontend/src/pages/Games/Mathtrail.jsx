import React, { useState, useMemo } from "react";
import { authFetch } from "@/utils/auth";

const rand = (max, min = 1) => Math.floor(Math.random() * (max - min + 1)) + min;

const makeOptions = (answer) => {
  const options = new Set([answer]);
  while (options.size < 4) {
    const fake = answer + rand(10, -5);
    if (fake >= 0) options.add(fake);
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
};

const generateQuestion = (level) => {
  let num1, num2, answer, question;
  switch (level) {
    case 1:
      num1 = rand(20); num2 = rand(20);
      if (Math.random() > 0.5) { answer = num1 + num2; question = `${num1} + ${num2} = ?`; }
      else { answer = num1 - num2; question = `${num1} - ${num2} = ?`; }
      break;
    case 2:
      num1 = rand(12); num2 = rand(12);
      answer = num1 * num2; question = `${num1} × ${num2} = ?`;
      break;
    case 3:
      num2 = rand(12); answer = rand(12);
      num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`;
      break;
    case 4:
      if (Math.random() > 0.5) { num1 = rand(15, 2); answer = num1 * num1; question = `${num1}² = ?`; }
      else { answer = rand(20, 2); num1 = answer * answer; question = `√${num1} = ?`; }
      break;
    case 5:
      if (Math.random() > 0.5) { num1 = rand(20); num2 = rand(10); answer = num1 + num2; question = `If x = ${num1}, solve x + ${num2}`; }
      else { num1 = rand(200, 50); num2 = [10, 20, 25, 50][rand(3, 0)]; answer = (num1 * num2) / 100; question = `${num2}% of ${num1} = ?`; }
      break;
    default:
      answer = 0; question = "Error!";
  }
  return { question, answer, options: makeOptions(answer) };
};

const Mathtrail = () => {
  const [level, setLevel] = useState(1);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  const questions = useMemo(() => Array.from({ length: 10 }, () => generateQuestion(level)), [level]);

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

  const points = score * 100 + (level - 1) * 50;
  const refKey = `mathtrail-lv${level}`;

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">MathTrail</h1>

        {!finished ? (
          <div className="rounded-2xl border bg-white shadow-sm p-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
              <span>Level: {level}</span>
              <span>Question {current + 1}/10</span>
            </div>

            <p className="text-2xl font-semibold mb-6 text-gray-900 text-center">
              {questions[current].question}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {questions[current].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg shadow-sm transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white shadow-sm p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Game Over 🎉</h2>
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

export default Mathtrail;