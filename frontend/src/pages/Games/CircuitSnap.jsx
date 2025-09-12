import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const CircuitSnap = () => {
  const navigate = useNavigate();

  const questions = [
    {
      question: "In a series circuit, if one bulb fuses, what happens to the other bulbs?",
      options: ["They glow brighter", "They go off", "They stay the same"],
      answer: "They go off",
    },
    {
      question: "In a parallel circuit, what happens if one bulb fuses?",
      options: [
        "All bulbs go off",
        "Only that bulb goes off",
        "Other bulbs glow brighter",
      ],
      answer: "Only that bulb goes off",
    },
    {
      question: "Which circuit connection is used in household wiring?",
      options: ["Series", "Parallel", "Both"],
      answer: "Parallel",
    },
    {
      question: "In a short circuit, what happens to the current?",
      options: [
        "It decreases a lot",
        "It becomes zero",
        "It increases dangerously",
      ],
      answer: "It increases dangerously",
    },
    {
      question: "Two 2Ω resistors in series give total resistance of:",
      options: ["1Ω", "2Ω", "4Ω"],
      answer: "4Ω",
    },
    {
      question: "Two 2Ω resistors in parallel give total resistance of:",
      options: ["1Ω", "2Ω", "4Ω"],
      answer: "1Ω",
    },
  ];

  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");
  const [gameOver, setGameOver] = useState(false);

  const checkAnswer = () => {
    if (selected === questions[currentQ].answer) {
      setScore(score + 1);
    }
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
      setSelected("");
    } else {
      setGameOver(true);
    }
  };

  const resetGame = () => {
    setCurrentQ(0);
    setScore(0);
    setSelected("");
    setGameOver(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-yellow-100 to-orange-100 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg text-center">
        <h2 className="text-2xl font-bold text-yellow-700 mb-6">⚡ CircuitSnap ⚡</h2>

        {!gameOver ? (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {questions[currentQ].question}
            </h3>
            <div className="flex flex-col gap-3 mb-6">
              {questions[currentQ].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(opt)}
                  className={`px-4 py-2 rounded-lg border ${
                    selected === opt
                      ? "bg-yellow-400 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              onClick={checkAnswer}
              disabled={!selected}
              className="px-6 py-2 bg-yellow-600 text-white rounded-xl shadow hover:bg-yellow-700 transition"
            >
              Submit
            </button>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Quiz Complete! 🎉
            </h3>
            <p className="text-lg mb-6">
              Your Score:{" "}
              <span className="font-bold text-yellow-600">
                {score}
              </span>{" "}
              / {questions.length}
            </p>
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-yellow-600 text-white rounded-xl shadow hover:bg-yellow-700 transition mb-4"
            >
              Play Again
            </button>
          </>
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate("/student/games")}
          className="mt-4 px-5 py-2 bg-gray-400 text-white rounded-lg shadow hover:bg-gray-500 transition"
        >
          ⬅ Back
        </button>
      </div>
    </div>
  );
};

export default CircuitSnap;
