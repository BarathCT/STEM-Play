import { Link } from "react-router-dom";

export default function Games() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-green-100 to-blue-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🎮 Student Games Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* MathTrail Card */}
        {/* <Link
          to="/student/games/mathtrail"
          className="bg-white shadow-lg rounded-xl p-6 text-center hover:scale-105 transition"
        >
          <h2 className="text-xl font-semibold mb-3">MathTrail</h2>
          <p className="text-gray-600">Test your math skills with 10 rapid-fire MCQs across levels 1–5.</p>
        </Link> */}


        <Link
          to="/student/games/wordtrail"
          className="bg-white shadow-lg rounded-xl p-6 text-center hover:scale-105 transition"
        >
          <h2 className="text-xl font-semibold mb-3">WordTrail</h2>
          <p className="text-gray-600">Test your math skills with 10 rapid-fire MCQs across levels 1–5.</p>
        </Link>


            <Link
          to="/student/games/wordquest"
          className="bg-white shadow-lg rounded-xl p-6 text-center hover:scale-105 transition"
        >
          <h2 className="text-xl font-semibold mb-3">WordQuest</h2>
          <p className="text-gray-600">Test your math skills with 10 rapid-fire MCQs across levels 1–5.</p>
        </Link>


        <Link
          to="/student/games/circuitsnap"
          className="bg-white shadow-lg rounded-xl p-6 text-center hover:scale-105 transition"
        >
          <h2 className="text-xl font-semibold mb-3">CircuitSnap</h2>
          <p className="text-gray-600">Test your math skills with 10 rapid-fire MCQs across levels 1–5.</p>
        </Link>

            <Link
          to="/student/games/chemconnect"
          className="bg-white shadow-lg rounded-xl p-6 text-center hover:scale-105 transition"
        >
          <h2 className="text-xl font-semibold mb-3">ChemConnect</h2>
          <p className="text-gray-600">Test your math skills with 10 rapid-fire MCQs across levels 1–5.</p>
        </Link>


            <Link
          to="/student/games/sudoku"
          className="bg-white shadow-lg rounded-xl p-6 text-center hover:scale-105 transition"
        >
          <h2 className="text-xl font-semibold mb-3">Sudoku</h2>
          <p className="text-gray-600">Test your math skills with 10 rapid-fire MCQs across levels 1–5.</p>
        </Link>


        {/* Add more games here */}
        <div className="bg-gray-200 shadow-inner rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold mb-3">Coming Soon 🚀</h2>
          <p className="text-gray-600">More fun games will appear here.</p>
        </div>
      </div>
    </div>
  );
}
