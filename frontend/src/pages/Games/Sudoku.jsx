import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

/*
  Full featured Sudoku component with:
   - Levels 1..5 (1 => 4x4 small grid; 2..5 => 9x9 with increasing difficulty)
   - Timer with best-time saved per level (localStorage)
   - Hint, Check, Solve, Reset, Back
   - Conflicts highlighting, keyboard entry, number pad
*/

// --- Utility helpers ---
const cloneBoard = (b) => b.map((r) => r.slice());

// Format time seconds => MM:SS
const formatTime = (seconds) => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

// compute box dimensions for a given size:
// For size 4 -> 2x2, size 9 -> 3x3. We're using only 4 and 9 sizes here.
const getBoxDims = (size) => {
  if (size === 4) return { br: 2, bc: 2 };
  if (size === 9) return { br: 3, bc: 3 };
  // fallback (square)
  const sq = Math.sqrt(size);
  return { br: sq, bc: sq };
};

// --- Predefined puzzles ---
// Level 1: 4x4 (0 = empty)
const PUZZLE_4x4 = {
  size: 4,
  initial: [
    [1, 0, 0, 4],
    [0, 3, 4, 0],
    [0, 4, 1, 0],
    [3, 0, 0, 2],
  ],
};

// Level 2-5: 9x9 puzzles of increasing difficulty
// (0 = empty). You can swap these with other puzzles.
const PUZZLE_9_EASY = {
  size: 9,
  initial: [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 0],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ],
};

const PUZZLE_9_MEDIUM = {
  size: 9,
  initial: [
    [0, 0, 0, 6, 0, 0, 4, 0, 0],
    [7, 0, 0, 0, 0, 3, 6, 0, 0],
    [0, 0, 0, 0, 9, 1, 0, 8, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 5, 0, 1, 8, 0, 0, 0, 3],
    [0, 0, 0, 3, 0, 6, 0, 4, 5],
    [0, 4, 0, 2, 0, 0, 0, 6, 0],
    [9, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 2, 0, 0, 0, 0, 1, 0, 0],
  ],
};

const PUZZLE_9_HARD = {
  size: 9,
  initial: [
    [0, 0, 0, 0, 0, 0, 0, 1, 2],
    [0, 0, 0, 0, 0, 0, 7, 0, 0],
    [0, 0, 1, 0, 9, 0, 0, 0, 0],
    [0, 5, 0, 0, 0, 4, 0, 0, 0],
    [3, 0, 0, 7, 0, 0, 0, 0, 8],
    [0, 0, 0, 2, 0, 0, 0, 6, 0],
    [0, 0, 0, 0, 3, 0, 1, 0, 0],
    [0, 0, 6, 0, 0, 0, 0, 0, 0],
    [9, 2, 0, 0, 0, 0, 0, 0, 0],
  ],
};

const PUZZLE_9_EXPERT = {
  size: 9,
  initial: [
    [0,0,0,0,0,0,0,0,1],
    [0,0,0,0,0,3,0,0,0],
    [0,0,1,0,9,0,0,8,0],
    [0,5,0,0,0,4,0,0,0],
    [3,0,0,1,8,0,0,0,0],
    [0,0,0,3,0,6,0,4,5],
    [0,4,0,2,0,0,0,6,0],
    [9,0,3,0,0,0,0,0,0],
    [0,2,0,0,0,0,0,0,0],
  ]
};

// Choose puzzles by level
function choosePuzzleForLevel(level) {
  if (level === 1) return PUZZLE_4x4;
  if (level === 2) return PUZZLE_9_EASY;
  if (level === 3) return PUZZLE_9_MEDIUM;
  if (level === 4) return PUZZLE_9_HARD;
  return PUZZLE_9_EXPERT; // 5
}

// --- Generic validator + solver that works for 4x4 and 9x9 (and any square size with proper box dims) ---
const isValidPlacement = (b, r, c, n, size) => {
  if (n === 0) return true;
  for (let i = 0; i < size; i++) {
    if (b[r][i] === n) return false;
    if (b[i][c] === n) return false;
  }
  // box
  const { br, bc } = getBoxDims(size);
  const sr = Math.floor(r / br) * br;
  const sc = Math.floor(c / bc) * bc;
  for (let i = sr; i < sr + br; i++) {
    for (let j = sc; j < sc + bc; j++) {
      if (b[i][j] === n) return false;
    }
  }
  return true;
};

function solveBoard(board, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) {
        for (let n = 1; n <= size; n++) {
          if (isValidPlacement(board, r, c, n, size)) {
            board[r][c] = n;
            if (solveBoard(board, size)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

const validateFullBoard = (b, size) => {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = b[r][c];
      if (val === 0) return { ok: false, message: "Board has empty cells" };
      b[r][c] = 0;
      if (!isValidPlacement(b, r, c, val, size)) {
        b[r][c] = val;
        return { ok: false, message: `Conflict at row ${r + 1} col ${c + 1}` };
      }
      b[r][c] = val;
    }
  }
  return { ok: true, message: "Solved correctly!" };
};

// --- Component ---
export default function Sudoku() {
  const navigate = useNavigate();

  // level state (1..5)
  const [level, setLevel] = useState(1);

  // puzzle meta (size and initial)
  const [size, setSize] = useState(() => choosePuzzleForLevel(1).size);
  const [initial, setInitial] = useState(() => cloneBoard(choosePuzzleForLevel(1).initial));
  const [board, setBoard] = useState(() => cloneBoard(choosePuzzleForLevel(1).initial));

  const [selected, setSelected] = useState({ r: -1, c: -1 });
  const [conflicts, setConflicts] = useState(new Set());
  const [message, setMessage] = useState("");

  // Timer
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  // Best time from localStorage keyed by level
  const bestKey = (lv) => `sudoku_best_time_lv${lv}`;
  const [bestTime, setBestTime] = useState(() => {
    const v = localStorage.getItem(bestKey(1));
    return v ? Number(v) : null;
  });

  // initialize puzzle for a chosen level
  const loadLevel = (lv) => {
    const p = choosePuzzleForLevel(lv);
    setLevel(lv);
    setSize(p.size);
    setInitial(cloneBoard(p.initial));
    setBoard(cloneBoard(p.initial));
    setSelected({ r: -1, c: -1 });
    setConflicts(new Set());
    setMessage("");
    setTime(0);
    setRunning(true);
    const best = localStorage.getItem(bestKey(lv));
    setBestTime(best ? Number(best) : null);
  };

  // load first level on mount
  useEffect(() => {
    loadLevel(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer effect
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running]);

  // update conflicts whenever board changes
  useEffect(() => {
    const newConf = new Set();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = board[r][c];
        if (!val) continue;
        // row
        for (let i = 0; i < size; i++) {
          if (i !== c && board[r][i] === val) {
            newConf.add(`${r},${c}`);
            newConf.add(`${r},${i}`);
          }
        }
        // col
        for (let i = 0; i < size; i++) {
          if (i !== r && board[i][c] === val) {
            newConf.add(`${r},${c}`);
            newConf.add(`${i},${c}`);
          }
        }
        // box
        const { br, bc } = getBoxDims(size);
        const sr = Math.floor(r / br) * br;
        const sc = Math.floor(c / bc) * bc;
        for (let i = sr; i < sr + br; i++) {
          for (let j = sc; j < sc + bc; j++) {
            if ((i !== r || j !== c) && board[i][j] === val) {
              newConf.add(`${r},${c}`);
              newConf.add(`${i},${j}`);
            }
          }
        }
      }
    }
    setConflicts(newConf);
  }, [board, size]);

  // selection
  const handleSelect = (r, c) => {
    setSelected({ r, c });
  };

  // enter number (from pad or keyboard)
  const enterNumber = (n) => {
    const { r, c } = selected;
    if (r < 0 || c < 0) return;
    if (initial[r][c] !== 0) return; // fixed cell
    const newB = cloneBoard(board);
    newB[r][c] = n;
    setBoard(newB);
  };

  // keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (selected.r < 0) return;
      if (e.key >= "1" && e.key <= String(size)) {
        enterNumber(Number(e.key));
      } else if (e.key === "Backspace" || e.key === "0" || e.key === "Delete") {
        enterNumber(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, board, size]);

  // Check board
  const handleCheck = () => {
    const copy = cloneBoard(board);
    const res = validateFullBoard(copy, size);
    setMessage(res.message);
    if (res.ok) {
      // solved correctly => stop timer and store best time if applicable
      setRunning(false);
      const prevBest = localStorage.getItem(bestKey(level));
      if (!prevBest || Number(prevBest) > time) {
        localStorage.setItem(bestKey(level), String(time));
        setBestTime(time);
        setMessage(`Solved correctly! 🎉 Time: ${formatTime(time)} (New best)`);
      } else {
        setMessage(`Solved correctly! 🎉 Time: ${formatTime(time)}`);
      }
    }
  };

  // Solve board (fill whole board)
  const handleSolve = () => {
    const copy = cloneBoard(board);
    const ok = solveBoard(copy, size);
    if (ok) {
      setBoard(copy);
      setRunning(false);
      setMessage(`Solved in ${formatTime(time)}!`);
      // register best time maybe not since solved with help; we won't register best on Solve
    } else {
      setMessage("No solution exists for current board.");
    }
  };

  // Hint: fill first empty with solved board value
  const handleHint = () => {
    // check solvability
    const solved = cloneBoard(board);
    const solvable = solveBoard(cloneBoard(board), size);
    if (!solvable) {
      setMessage("No solution available from current state.");
      return;
    }
    solveBoard(solved, size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 0) {
          const newB = cloneBoard(board);
          newB[r][c] = solved[r][c];
          setBoard(newB);
          setMessage(`Hint applied at row ${r + 1}, col ${c + 1}`);
          return;
        }
      }
    }
    setMessage("No empty cells to hint.");
  };

  // Reset puzzle
  const handleReset = () => {
    setBoard(cloneBoard(initial));
    setSelected({ r: -1, c: -1 });
    setMessage("");
    setTime(0);
    setRunning(true);
  };

  // When user switches level via top buttons
  const handleLevelClick = (lv) => {
    if (lv === level) return;
    loadLevel(lv);
  };

  // When puzzle gets solved by filling all cells correctly auto-detect
  useEffect(() => {
    // if no zeros and no conflicts -> treat as solved
    const hasZero = board.some((row) => row.some((v) => v === 0));
    if (!hasZero && conflicts.size === 0) {
      // validate fully to be safe
      const res = validateFullBoard(cloneBoard(board), size);
      if (res.ok) {
        setRunning(false);
        const prevBest = localStorage.getItem(bestKey(level));
        if (!prevBest || Number(prevBest) > time) {
          localStorage.setItem(bestKey(level), String(time));
          setBestTime(time);
          setMessage(`Solved! 🎉 Time: ${formatTime(time)} (New best)`);
        } else {
          setMessage(`Solved! 🎉 Time: ${formatTime(time)}`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, conflicts]);

  // Render helpers
  const cellClass = (r, c) => {
    const base = `flex items-center justify-center select-none`;
    const cellSize = size <= 4 ? "w-12 h-12 text-xl" : "w-10 h-10 text-lg";
    const isFixed = initial[r][c] !== 0;
    const isSelected = selected.r === r && selected.c === c;
    const isConflict = conflicts.has(`${r},${c}`);
    const { br, bc } = getBoxDims(size);
    const topBorder = r % br === 0 ? "border-t-2" : "border-t";
    const leftBorder = c % bc === 0 ? "border-l-2" : "border-l";
    return [
      base,
      cellSize,
      isFixed ? "font-semibold text-gray-800" : "text-gray-700",
      isSelected ? "bg-blue-100" : "bg-white",
      isConflict ? "bg-red-100" : "",
      topBorder,
      leftBorder,
      "border-r border-b border-gray-300",
      "cursor-pointer",
    ].join(" ");
  };

  // number pad entries (1..size)
  const numberPad = Array.from({ length: size }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-gradient-to-r from-cyan-50 to-emerald-50">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6">
        {/* Header: title + level selector + timer + best time */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-teal-700">Sudoku — Circuit of Logic</h2>
            <p className="text-sm text-gray-500">Choose a level; higher levels are harder.</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Level buttons */}
            <div className="flex gap-2 items-center">
              { [1,2,3,4,5].map((lv) => (
                <button
                  key={lv}
                  onClick={() => handleLevelClick(lv)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    lv === level ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {lv}
                </button>
              )) }
            </div>

            {/* Timer & best */}
            <div className="ml-2 flex items-center gap-4">
              <div className="text-lg font-semibold text-gray-700">⏱ {formatTime(time)}</div>
              <div className="text-sm text-gray-500">
                Best: {bestTime != null ? formatTime(bestTime) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Body: board + controls */}
        <div className="flex gap-6">
          {/* Board */}
          <div>
            <div
              className={`grid`}
              style={{
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                width: size <= 4 ? 4 * 48 + "px" : 9 * 40 + "px",
              }}
            >
              {board.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSelect(r, c)}
                    className={cellClass(r, c)}
                    title={initial[r][c] !== 0 ? "Prefilled" : "Editable"}
                  >
                    {val !== 0 ? val : ""}
                  </div>
                ))
              )}
            </div>

            {/* Number pad */}
            <div className={`mt-4 grid`} style={{ gridTemplateColumns: `repeat(${Math.min(size,9)}, minmax(0,1fr))`, gap: "8px" }}>
              {numberPad.map((n) => (
                <button
                  key={n}
                  onClick={() => enterNumber(n)}
                  className="px-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-md"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => enterNumber(0)}
                className="col-span-3 px-2 py-2 bg-red-100 hover:bg-red-200 rounded-md"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-64">
            <div className="mb-4 p-3 border rounded-md">
              <div className="text-sm text-gray-600">Selected</div>
              {selected.r >= 0 ? (
                <div className="mt-2">
                  <div className="font-semibold">Row: {selected.r + 1}</div>
                  <div className="font-semibold">Col: {selected.c + 1}</div>
                  <div className="mt-2">Value: {board[selected.r][selected.c] || "—"}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {initial[selected.r][selected.c] !== 0 ? "Prefilled — not editable" : "Editable"}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-gray-500">Click a cell to select</div>
              )}
            </div>

            <div className="mb-4 p-3 border rounded-md min-h-[96px]">
              <div className="text-sm text-gray-600">Message</div>
              <div className="mt-2 font-medium text-gray-800">{message || "Status updates appear here."}</div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleHint}
                  className="flex-1 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 rounded-md text-sm"
                >
                  Hint
                </button>
                <button
                  onClick={handleCheck}
                  className="flex-1 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-md text-sm text-white"
                >
                  Check
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSolve}
                  className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-md text-sm text-white"
                >
                  Solve
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 rounded-md text-sm"
                >
                  Reset
                </button>
              </div>

              <button
                onClick={() => {
                  setRunning(false);
                  navigate("/student/games");
                  
                }}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 rounded-md text-white"
              >
                ⬅ Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
