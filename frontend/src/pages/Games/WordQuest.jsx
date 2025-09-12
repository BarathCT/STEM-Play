import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const WordQuest = () => {
  const navigate = useNavigate();

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

  const checkAnswer = () => {
    if (answer.trim().toUpperCase() === questions[currentQ].word) {
      setScore(score + 1);
    }
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
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
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-green-100 to-blue-100 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-green-700 mb-6">Word Quest</h2>

        {!gameOver ? (
          <>
            <p className="text-lg font-medium text-gray-700 mb-4">
              Unscramble this word:
            </p>
            <h3 className="text-3xl font-extrabold text-blue-600 mb-6">
              {questions[currentQ].jumbled}
            </h3>

            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer"
              className="border rounded-lg px-4 py-2 mb-4 w-full text-center"
            />
            <button
              onClick={checkAnswer}
              className="px-6 py-2 bg-green-500 text-white rounded-xl shadow hover:bg-green-600 transition"
            >
              Submit
            </button>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Game Over! 🎉
            </h3>
            <p className="text-lg mb-6">
              Your Score: <span className="font-bold text-blue-600">{score}</span>{" "}
              / {questions.length}
            </p>
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-green-500 text-white rounded-xl shadow hover:bg-green-600 transition mb-4"
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

export default WordQuest;
