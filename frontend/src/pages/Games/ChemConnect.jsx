import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ChemConnect = () => {
  const navigate = useNavigate();

  // simplified periodic table (first 20 elements)
  const elements = [
    { num: 1, symbol: "H", name: "Hydrogen" },
    { num: 2, symbol: "He", name: "Helium" },
    { num: 3, symbol: "Li", name: "Lithium" },
    { num: 4, symbol: "Be", name: "Beryllium" },
    { num: 5, symbol: "B", name: "Boron" },
    { num: 6, symbol: "C", name: "Carbon" },
    { num: 7, symbol: "N", name: "Nitrogen" },
    { num: 8, symbol: "O", name: "Oxygen" },
    { num: 9, symbol: "F", name: "Fluorine" },
    { num: 10, symbol: "Ne", name: "Neon" },
    { num: 11, symbol: "Na", name: "Sodium" },
    { num: 12, symbol: "Mg", name: "Magnesium" },
    { num: 13, symbol: "Al", name: "Aluminium" },
    { num: 14, symbol: "Si", name: "Silicon" },
    { num: 15, symbol: "P", name: "Phosphorus" },
    { num: 16, symbol: "S", name: "Sulfur" },
    { num: 17, symbol: "Cl", name: "Chlorine" },
    { num: 18, symbol: "Ar", name: "Argon" },
    { num: 19, symbol: "K", name: "Potassium" },
    { num: 20, symbol: "Ca", name: "Calcium" },
  ];

  // quiz questions
  const questions = [
    {
      q: "Which element has atomic number 8?",
      options: ["Nitrogen", "Oxygen", "Fluorine"],
      answer: "Oxygen",
    },
    {
      q: "Which element symbol is 'Na'?",
      options: ["Neon", "Sodium", "Nitrogen"],
      answer: "Sodium",
    },
    {
      q: "Calcium belongs to which group?",
      options: ["Alkali Metals", "Alkaline Earth Metals", "Noble Gases"],
      answer: "Alkaline Earth Metals",
    },
    {
      q: "Which element is a noble gas?",
      options: ["Neon", "Sodium", "Nitrogen"],
      answer: "Neon",
    },
  ];

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState("");
  const [score, setScore] = useState(0);
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
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-r from-blue-100 to-indigo-100 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-4xl text-center">
        <h2 className="text-2xl font-bold text-indigo-700 mb-6">🧪 ChemConnect</h2>

        {/* Periodic Table Section */}
        <div className="grid grid-cols-10 gap-2 justify-center mb-8">
          {elements.map((el) => (
            <div
              key={el.num}
              className="border rounded-md p-2 text-center text-sm bg-indigo-50 hover:bg-indigo-200 transition"
            >
              <div className="font-bold">{el.symbol}</div>
              <div className="text-xs">{el.num}</div>
            </div>
          ))}
        </div>

        {/* Quiz Section */}
        {!gameOver ? (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {questions[currentQ].q}
            </h3>
            <div className="flex flex-col gap-3 mb-6">
              {questions[currentQ].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(opt)}
                  className={`px-4 py-2 rounded-lg border ${
                    selected === opt
                      ? "bg-indigo-500 text-white"
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
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
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
              <span className="font-bold text-indigo-600">
                {score}
              </span>{" "}
              / {questions.length}
            </p>
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition mb-4"
            >
              Play Again
            </button>
          </>
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate("/games")}
          className="mt-4 px-5 py-2 bg-gray-400 text-white rounded-lg shadow hover:bg-gray-500 transition"
        >
          ⬅ Back
        </button>
      </div>
    </div>
  );
};

export default ChemConnect;
