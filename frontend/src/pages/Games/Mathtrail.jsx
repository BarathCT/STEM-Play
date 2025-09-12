import React, { useState, useMemo } from "react";

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
    case 1: // Addition/Subtraction
      num1 = rand(20);
      num2 = rand(20);
      if (Math.random() > 0.5) {
        answer = num1 + num2;
        question = `${num1} + ${num2} = ?`;
      } else {
        answer = num1 - num2;
        question = `${num1} - ${num2} = ?`;
      }
      break;

    case 2: // Multiplication
      num1 = rand(12);
      num2 = rand(12);
      answer = num1 * num2;
      question = `${num1} × ${num2} = ?`;
      break;

    case 3: // Division
      num2 = rand(12);
      answer = rand(12);
      num1 = num2 * answer;
      question = `${num1} ÷ ${num2} = ?`;
      break;

    case 4: // Squares & Roots
      if (Math.random() > 0.5) {
        num1 = rand(15, 2);
        answer = num1 * num1;
        question = `${num1}² = ?`;
      } else {
        answer = rand(20, 2);
        num1 = answer * answer;
        question = `√${num1} = ?`;
      }
      break;

    case 5: // Algebra & Percentages
      if (Math.random() > 0.5) {
        num1 = rand(20);
        num2 = rand(10);
        answer = num1 + num2;
        question = `If x = ${num1}, solve x + ${num2}`;
      } else {
        num1 = rand(200, 50);
        num2 = [10, 20, 25, 50][rand(3, 0)];
        answer = (num1 * num2) / 100;
        question = `${num2}% of ${num1} = ?`;
      }
      break;

    default:
      answer = 0;
      question = "Error!";
  }

  return { question, answer, options: makeOptions(answer) };
};

const Mathtrail = () => {
  const [level, setLevel] = useState(1);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // Generate 10 questions per level
  const questions = useMemo(() => Array.from({ length: 10 }, () => generateQuestion(level)), [level]);

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">MathTrail Game</h1>

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
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Over 🎉</h2>
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
            <p className="text-lg font-semibold text-purple-600 mt-4">
              You completed all levels! 🏆
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Mathtrail;
