import React, { useState, useMemo } from "react";

// Sample word data
const WORD_BANK = {
  1: [
    {
      question: "Synonym of 'Happy'",
      answer: "Joyful",
      options: ["Sad", "Joyful", "Angry", "Dark"],
    },
    {
      question: "Antonym of 'Big'",
      answer: "Small",
      options: ["Tall", "Huge", "Small", "Large"],
    },
    {
      question: "Correct spelling?",
      answer: "Beautiful",
      options: ["Beutiful", "Beautifull", "Beautiful", "Beautifel"],
    },
  ],
  2: [
    {
      question: "Synonym of 'Fast'",
      answer: "Quick",
      options: ["Slow", "Quick", "Lazy", "Late"],
    },
    {
      question: "Antonym of 'Cold'",
      answer: "Hot",
      options: ["Cool", "Hot", "Freeze", "Chill"],
    },
    {
      question: "Correct spelling?",
      answer: "Knowledge",
      options: ["Knolege", "Knowledge", "Knowlege", "Knoladge"],
    },
  ],
  3: [
    {
      question: "Synonym of 'Brave'",
      answer: "Courageous",
      options: ["Weak", "Courageous", "Afraid", "Shy"],
    },
    {
      question: "Antonym of 'Light'",
      answer: "Dark",
      options: ["Glow", "Bright", "Dark", "Shiny"],
    },
    {
      question: "Correct spelling?",
      answer: "Environment",
      options: ["Enviroment", "Environmment", "Environment", "Environmant"],
    },
  ],
  4: [
    {
      question: "Synonym of 'Rich'",
      answer: "Wealthy",
      options: ["Poor", "Wealthy", "Broke", "Simple"],
    },
    {
      question: "Antonym of 'Young'",
      answer: "Old",
      options: ["Baby", "Teen", "Old", "New"],
    },
    {
      question: "Correct spelling?",
      answer: "Occasion",
      options: ["Occation", "Ocassion", "Occasion", "Ocationn"],
    },
  ],
  5: [
    {
      question: "Synonym of 'Angry'",
      answer: "Furious",
      options: ["Calm", "Furious", "Happy", "Silent"],
    },
    {
      question: "Antonym of 'Strong'",
      answer: "Weak",
      options: ["Tough", "Weak", "Solid", "Hard"],
    },
    {
      question: "Correct spelling?",
      answer: "Achievement",
      options: ["Acheivment", "Achievemant", "Achievement", "Acheevement"],
    },
  ],
};

// Randomize question set
const generateQuestions = (level) => {
  const base = WORD_BANK[level] || [];
  let questions = [];
  for (let i = 0; i < 10; i++) {
    const q = base[Math.floor(Math.random() * base.length)];
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);
    questions.push({ ...q, options: shuffled });
  }
  return questions;
};

const WordTrail = () => {
  const [level, setLevel] = useState(1);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = useMemo(() => generateQuestions(level), [level]);

  const handleAnswer = (selected) => {
    if (selected === questions[current].answer) setScore((prev) => prev + 1);

    if (current + 1 < questions.length) {
      setCurrent((prev) => prev + 1);
    } else {
      setFinished(true);
    }
  };

  const resetLevel = () => {
    setCurrent(0);
    setScore(0);
    setFinished(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200 p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">WordTrail Game</h1>

      {!finished ? (
        <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-6">
          <div className="flex justify-between mb-4">
            <span className="text-lg font-semibold">Level: {level}</span>
            <span className="text-lg font-semibold">
              Question {current + 1}/10
            </span>
          </div>

          <p className="text-2xl font-bold mb-6 text-center">
            {questions[current].question}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {questions[current].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Level Complete 🎉
          </h2>
          <p className="text-lg mb-2">
            Your Score: <span className="font-bold">{score}/10</span>
          </p>

          {level < 5 ? (
            <button
              onClick={() => {
                setLevel((prev) => prev + 1);
                resetLevel();
              }}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl mt-4"
            >
              Next Level →
            </button>
          ) : (
            <p className="text-lg font-semibold text-indigo-600 mt-4">
              You completed all levels! 🏆
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WordTrail;
