import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "@/utils/auth";
import {
  Pencil,
  Eraser,
  Lightbulb,
  RotateCcw,
  Clock,
  Gauge,
  AlertTriangle,
  Trophy,
  ArrowLeft,
  Infinity as InfinityIcon,
  Grid3x3,
  Hash,
  Lock,
  Edit3,
} from "lucide-react";

// ---------- Utilities ----------
const clone = (b) => b.map((r) => r.slice());
const fmtTime = (sec) => {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
};
const keyOf = (r, c) => `${r},${c}`;
const randint = (n) => Math.floor(Math.random() * n);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randint(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// Box dims: 4x4 => 2x2, 9x9 => 3x3
const dims = (size) => (size === 4 ? { br: 2, bc: 2 } : { br: 3, bc: 3 });

// ---------- Difficulties & Config ----------
const DIFFICULTIES = {
  Beginner: { size: 4, hints: 1, mistakes: 6, mult: 0.6, ref: "beginner", cluesRange: [10, 12] },
  Easy: { size: 9, hints: 2, mistakes: 5, mult: 0.8, ref: "easy", cluesRange: [40, 45] },
  Medium: { size: 9, hints: 2, mistakes: 4, mult: 1.0, ref: "medium", cluesRange: [34, 38] },
  Hard: { size: 9, hints: 3, mistakes: 3, mult: 1.25, ref: "hard", cluesRange: [28, 32] },
  Expert: { size: 9, hints: 3, mistakes: 3, mult: 1.5, ref: "expert", cluesRange: [24, 28] },
  Extreme: { size: 9, hints: 3, mistakes: 2, mult: 2.0, ref: "extreme", cluesRange: [22, 24] },
};
const DIFF_KEYS = Object.keys(DIFFICULTIES);

// ---------- Sudoku Generation ----------
function generateSolved(size) {
  const { br, bc } = dims(size);
  const basePattern = (r, c) => (r * br + Math.floor(r / br) + c) % size;

  let board = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => basePattern(r, c))
  );

  const rowBands = Array.from({ length: size / br }, (_, i) => i);
  const colBands = Array.from({ length: size / bc }, (_, i) => i);

  const shuffledRowBands = shuffle(rowBands);
  const shuffledColBands = shuffle(colBands);

  const shuffleWithinBand = (bandIdx, bandSize) => {
    const rows = Array.from({ length: bandSize }, (_, i) => bandIdx * bandSize + i);
    return shuffle(rows);
  };

  const rowOrder = [];
  for (const band of shuffledRowBands) rowOrder.push(...shuffleWithinBand(band, br));
  const colOrder = [];
  for (const band of shuffledColBands) colOrder.push(...shuffleWithinBand(band, bc));

  board = rowOrder.map((r) => colOrder.map((c) => board[r][c]));

  const digits = shuffle(Array.from({ length: size }, (_, i) => i + 1));
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) board[r][c] = digits[board[r][c]];
  return board;
}
function isValidPlacement(b, r, c, n, size) {
  for (let i = 0; i < size; i++) {
    if (b[r][i] === n && i !== c) return false;
    if (b[i][c] === n && i !== r) return false;
  }
  const { br, bc } = dims(size);
  const sr = Math.floor(r / br) * br;
  const sc = Math.floor(c / bc) * bc;
  for (let i = sr; i < sr + br; i++) {
    for (let j = sc; j < sc + bc; j++) {
      if ((i !== r || j !== c) && b[i][j] === n) return false;
    }
  }
  return true;
}
function countSolutions(board, size, limit = 2) {
  const b = clone(board);
  let solutions = 0;
  function backtrack() {
    let r = -1, c = -1;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (b[i][j] === 0) { r = i; c = j; break; }
      }
      if (r !== -1) break;
    }
    if (r === -1) return 1;
    for (let n = 1; n <= size; n++) {
      if (isValidPlacement(b, r, c, n, size)) {
        b[r][c] = n;
        const found = backtrack();
        if (found) {
          solutions += found;
          if (solutions >= limit) return 0;
        }
        b[r][c] = 0;
      }
    }
    return 0;
  }
  backtrack();
  return solutions === 0 ? limit : solutions;
}
function carvePuzzle(solved, size, targetClues) {
  const total = size * size;
  const puzzle = clone(solved);
  const cells = shuffle(Array.from({ length: total }, (_, k) => k));
  let clues = total;

  for (const k of cells) {
    if (clues <= targetClues) break;
    const r = Math.floor(k / size);
    const c = k % size;
    if (puzzle[r][c] === 0) continue;
    const saved = puzzle[r][c];
    puzzle[r][c] = 0;

    const solCount = countSolutions(puzzle, size, 2);
    if (solCount !== 1) puzzle[r][c] = saved;
    else clues -= 1;
  }
  return puzzle;
}
function generatePuzzleForDifficulty(diffKey) {
  const cfg = DIFFICULTIES[diffKey];
  const size = cfg.size;
  const solved = generateSolved(size);
  const [minClues, maxClues] = cfg.cluesRange;
  const targetClues = minClues + randint(Math.max(1, maxClues - minClues + 1));
  const puzzle = carvePuzzle(solved, size, targetClues);
  return { size, initial: puzzle, solved };
}

// ---------- Component ----------
export default function Sudoku() {
  const navigate = useNavigate();

  // Difficulty modal and outcome
  const [showDiffModal, setShowDiffModal] = useState(true);
  const [difficulty, setDifficulty] = useState("Beginner");
  const [practice, setPractice] = useState(false); // choose in modal
  const [lastOutcome, setLastOutcome] = useState(null); // 'gameover' | null

  const cfg = DIFFICULTIES[difficulty];

  // Core state
  const [size, setSize] = useState(0);
  const [initial, setInitial] = useState([]);
  const [board, setBoard] = useState([]);
  const [solved, setSolved] = useState(null);

  // Selection / notes
  const [selected, setSelected] = useState({ r: -1, c: -1 });
  const [pencil, setPencil] = useState(false);
  const [notes, setNotes] = useState(new Map());
  const [notedCells, setNotedCells] = useState(new Set());

  // Limits
  const [hintsLeft, setHintsLeft] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  // Timer / score
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const timerRef = useRef(null);
  const lastMoveRef = useRef(Date.now());

  // UI
  const [message, setMessage] = useState("");

  // Internal helpers
  const submittedRef = useRef(false);
  const unitMemo = useRef({ rows: new Set(), cols: new Set(), boxes: new Set() });

  // Start new random game
  function startGame(diffKey, isPractice) {
    const { size, initial, solved } = generatePuzzleForDifficulty(diffKey);
    setSize(size);
    setInitial(clone(initial));
    setBoard(clone(initial));
    setSolved(clone(solved));

    setSelected({ r: -1, c: -1 });
    setPencil(false);
    setNotes(new Map());
    setNotedCells(new Set());
    setHintsLeft(DIFFICULTIES[diffKey].hints);
    setMistakes(0);
    setScore(0);
    setTime(0);
    setMessage("");
    setRunning(true);
    submittedRef.current = false;
    lastMoveRef.current = Date.now();
    unitMemo.current = { rows: new Set(), cols: new Set(), boxes: new Set() };

    setPractice(isPractice);
    setLastOutcome(null);
  }

  // Timer
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

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (!size) return;
      if (e.key === "Escape") {
        setSelected({ r: -1, c: -1 });
        return;
      }
      if (e.key.toLowerCase() === "p") {
        setPencil((v) => !v);
        return;
      }
      if (e.key.toLowerCase() === "h") {
        useHint();
        return;
      }
      if (selected.r < 0 || selected.c < 0) return;

      if (e.key >= "1" && e.key <= String(size)) {
        const n = Number(e.key);
        pencil ? toggleNote(selected.r, selected.c, n) : enterNumber(selected.r, selected.c, n);
      } else if (["Backspace", "Delete", "0"].includes(e.key)) {
        pencil ? clearNotes(selected.r, selected.c) : enterNumber(selected.r, selected.c, 0);
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const dr = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        const dc = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        const nr = Math.max(0, Math.min(size - 1, selected.r + dr));
        const nc = Math.max(0, Math.min(size - 1, selected.c + dc));
        setSelected({ r: nr, c: nc });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, pencil, size, hintsLeft]);

  // Notes (max 2 cells)
  function toggleNote(r, c, n) {
    if (!isEditable(r, c) || board[r][c] !== 0) {
      setMessage("Notes only on empty editable cells.");
      return;
    }
    const k = keyOf(r, c);
    const map = new Map(notes);
    let set = map.get(k);
    if (!set) {
      if (notedCells.size >= 2 && !notedCells.has(k)) {
        setMessage("You can keep notes in at most two cells at a time.");
        return;
      }
      set = new Set();
    }
    if (set.has(n)) set.delete(n);
    else set.add(n);

    if (set.size === 0) {
      map.delete(k);
      const nc = new Set(notedCells);
      nc.delete(k);
      setNotedCells(nc);
    } else {
      map.set(k, set);
      const nc = new Set(notedCells);
      nc.add(k);
      setNotedCells(nc);
    }
    setNotes(map);
  }
  function clearNotes(r, c) {
    const k = keyOf(r, c);
    if (!notes.has(k)) return;
    const map = new Map(notes);
    map.delete(k);
    setNotes(map);
    const nc = new Set(notedCells);
    nc.delete(k);
    setNotedCells(nc);
  }

  // Placement & scoring
  function enterNumber(r, c, n) {
    if (!isEditable(r, c)) {
      setMessage("Cell is prefilled.");
      return;
    }
    const newB = clone(board);

    if (n === 0) {
      newB[r][c] = 0;
      setBoard(newB);
      clearNotes(r, c);
      setMessage("Cleared.");
      return;
    }

    const correct = solved?.[r]?.[c] ?? null;
    const moveSec = Math.max(1, Math.floor((Date.now() - lastMoveRef.current) / 1000));
    lastMoveRef.current = Date.now();

    if (correct && n !== correct) {
      if (!practice) {
        const m = mistakes + 1;
        setMistakes(m);
        setMessage(`Incorrect • Mistakes ${m}/${cfg.mistakes}`);
        if (m >= cfg.mistakes && !submittedRef.current) {
          setRunning(false);
          setLastOutcome("gameover");
          setShowDiffModal(true); // show dialog to start again
          autoSubmitScore("gameover");
        }
      } else {
        setMistakes((m) => m + 1); // unlimited in practice
        setMessage(`Incorrect (practice)`);
      }
      return;
    }

    // Commit
    newB[r][c] = n;
    clearNotes(r, c);
    setBoard(newB);
    setMessage("Good!");

    // Scoring
    const base = size === 4 ? 60 : 100;
    const penalty = Math.floor(moveSec / 2);
    const gained = Math.max(5, Math.round((base - penalty) * cfg.mult));
    let bonus = 0;
    if (unitCompleted(newB, r, c)) bonus += 40;
    setScore((s) => s + gained + bonus);

    // Solved
    if (isBoardSolved(newB)) {
      setRunning(false);
      setMessage(`Solved • Time ${fmtTime(time)} • +${gained + bonus}`);
      autoSubmitScore("solved");
    }
  }

  function unitCompleted(b, r, c) {
    let comp = false;
    if (!unitMemo.current.rows.has(r) && b[r].every((v) => v !== 0)) {
      unitMemo.current.rows.add(r);
      comp = true;
    }
    let colDone = true;
    for (let i = 0; i < size; i++) if (b[i][c] === 0) colDone = false;
    if (colDone && !unitMemo.current.cols.has(c)) {
      unitMemo.current.cols.add(c);
      comp = true;
    }
    const { br, bc } = dims(size);
    const sr = Math.floor(r / br) * br;
    const sc = Math.floor(c / bc) * bc;
    let boxDone = true;
    for (let i = sr; i < sr + br; i++) {
      for (let j = sc; j < sc + bc; j++) if (b[i][j] === 0) boxDone = false;
    }
    const boxKey = `${Math.floor(r / br)}-${Math.floor(c / bc)}`;
    if (boxDone && !unitMemo.current.boxes.has(boxKey)) {
      unitMemo.current.boxes.add(boxKey);
      comp = true;
    }
    return comp;
  }

  function isBoardSolved(b) {
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (b[r][c] === 0) return false;
    const check = clone(b);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const v = check[r][c];
        check[r][c] = 0;
        if (!isValidPlacement(check, r, c, v, size)) return false;
        check[r][c] = v;
      }
    }
    return true;
  }

  // Hints — random cell only, never the selected cell
  function useHint() {
    if (!solved) return;
    if (!practice && hintsLeft <= 0) {
      setMessage("No hints left.");
      return;
    }

    // build list of empty, editable cells
    const empties = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isEditable(r, c) && board[r][c] === 0) {
          empties.push([r, c]);
        }
      }
    }
    if (empties.length === 0) {
      setMessage("No empty cells for hint.");
      return;
    }

    // Exclude selected cell explicitly from hint targets
    const filtered = empties.filter(([r, c]) => !(r === selected.r && c === selected.c));

    if (filtered.length === 0) {
      setMessage("Hint cannot be placed in the selected cell. Pick another cell or continue.");
      return;
    }

    const [rr, cc] = filtered[randint(filtered.length)];
    enterNumber(rr, cc, solved[rr][cc]);
    if (!practice) setHintsLeft((h) => Math.max(0, h - 1));
    setMessage(`Hint filled at row ${rr + 1}, col ${cc + 1}.`);
  }

  // Auto-submit score (also used for exit/visibility/unmount). Skips practice.
  async function autoSubmitScore(outcome) {
    if (submittedRef.current) return;
    submittedRef.current = true;

    if (practice) return; // practice scores are not sent to leaderboard

    const timeFactor = Math.floor(time / 3);
    const outcomeBonus = outcome === "solved" ? 150 : 0;
    const points = Math.max(10, Math.round(score * DIFFICULTIES[difficulty].mult - timeFactor + outcomeBonus));
    try {
      await authFetch("/student/leaderboard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "game",
          ref: `sudoku-${DIFFICULTIES[difficulty].ref}`,
          points,
          meta: { difficulty, time, score, outcome, practice },
        }),
      });
      setMessage((m) => (m ? `${m} • Score submitted` : "Score submitted"));
    } catch {
      // ignore
    }
  }

  // Auto-submit when leaving: visibility/pagehide/beforeunload + unmount cleanup
  useEffect(() => {
    function submitIfNeeded(reason) {
      if (!submittedRef.current && running && size && !practice) {
        autoSubmitScore(reason);
      }
    }
    const onBeforeUnload = () => submitIfNeeded("exit");
    const onPageHide = () => submitIfNeeded("exit");
    const onVisibility = () => {
      if (document.visibilityState === "hidden") submitIfNeeded("exit");
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      // SPA unmount (route change)
      submitIfNeeded("exit");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, size, practice, score, time, difficulty]);

  // Reset this puzzle
  function resetBoard() {
    if (!size) return;
    setBoard(clone(initial));
    setSelected({ r: -1, c: -1 });
    setPencil(false);
    setNotes(new Map());
    setNotedCells(new Set());
    setHintsLeft(DIFFICULTIES[difficulty].hints);
    setMistakes(0);
    setScore(0);
    setTime(0);
    setMessage("");
    setRunning(true);
    submittedRef.current = false;
    unitMemo.current = { rows: new Set(), cols: new Set(), boxes: new Set() };
    lastMoveRef.current = Date.now();
    setLastOutcome(null);
  }

  const isEditable = (r, c) => initial?.[r]?.[c] === 0;
  const showNotes = (r, c) => {
    const set = notes.get(keyOf(r, c));
    return set ? Array.from(set).sort((a, b) => a - b) : [];
  };

  // Cell styles with CLEAR border highlight for selected cell
  const { br, bc } = useMemo(() => dims(size || 9), [size]);
  const cellCls = (r, c) => {
    const sel = selected.r === r && selected.c === c;
    const sameRow = selected.r === r;
    const sameCol = selected.c === c;
    const fixed = !isEditable(r, c);
    const topB = r % br === 0 ? "border-t-2" : "border-t";
    const leftB = c % bc === 0 ? "border-l-2" : "border-l";
    return [
      "relative flex items-center justify-center select-none transition-colors",
      size === 4 ? "w-16 h-16 text-2xl" : "w-12 h-12 text-xl",
      "border-r border-b border-gray-300",
      topB,
      leftB,
      fixed ? "bg-gray-50 font-semibold text-gray-900" : "bg-white text-gray-800 hover:bg-gray-50",
      sel
        ? "ring-2 ring-blue-600 ring-offset-1 ring-offset-white z-10"
        : (sameRow || sameCol)
        ? "bg-blue-50/40"
        : "",
      "cursor-pointer",
    ].join(" ");
  };

  const keypad = Array.from({ length: size || 0 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Title */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900">Sudoku</h1>
        <p className="text-sm text-gray-600">Random puzzle • Practice mode option • Auto-submit (non-practice)</p>
      </div>

      {/* Two-column: Board left, Features right */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Board */}
        <div className="bg-white border rounded-xl shadow-sm p-4">
          {/* Board grid */}
          <div
            className="grid mx-auto"
            style={{
              gridTemplateColumns: `repeat(${size || 9}, minmax(0,1fr))`,
              width: size ? (size === 4 ? 4 * 64 + "px" : 9 * 48 + "px") : "auto",
            }}
          >
            {board.map((row, r) =>
              row.map((val, c) => {
                const dots = showNotes(r, c);
                return (
                  <div
                    key={`${r}-${c}`}
                    className={cellCls(r, c)}
                    onClick={() => setSelected({ r, c })}
                    title={isEditable(r, c) ? "Editable" : "Prefilled"}
                  >
                    {val !== 0 ? (
                      <span>{val}</span>
                    ) : dots.length ? (
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-0.5 text-[10px] text-gray-500">
                        {Array.from({ length: size }, (_, i) => i + 1).map((n) => (
                          <div key={n} className="flex items-center justify-center">
                            {dots.includes(n) ? n : ""}
                          </div>
                        ))}
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Keypad numbers */}
          {!!size && (
            <div
              className="mt-4 grid mx-auto"
              style={{
                gridTemplateColumns: `repeat(${Math.min(size, 9)}, minmax(0,1fr))`,
                gap: "8px",
                width: size === 4 ? 4 * 64 + "px" : 9 * 48 + "px",
              }}
            >
              {keypad.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    if (selected.r >= 0) {
                      pencil ? toggleNote(selected.r, selected.c, n) : enterNumber(selected.r, selected.c, n);
                    }
                  }}
                  className={`inline-flex items-center justify-center gap-1 px-2 py-2 rounded-md transition ${
                    pencil
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-800"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {pencil && <Pencil className="w-4 h-4" />}
                  {n}
                </button>
              ))}
            </div>
          )}

          {/* Fixed controls: Erase, Hint, Reset (below the board) */}
          <div
            className="mt-3 flex items-center justify-center gap-3 mx-auto"
            style={{ width: size ? (size === 4 ? 4 * 64 + "px" : 9 * 48 + "px") : "auto" }}
          >
            <button
              onClick={() => {
                if (selected.r >= 0) {
                  pencil ? clearNotes(selected.r, selected.c) : enterNumber(selected.r, selected.c, 0);
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border hover:bg-gray-50 text-sm"
              title="Erase"
              aria-label="Erase"
            >
              <Eraser className="w-4 h-4 text-gray-700" />
              Erase
            </button>
            <button
              onClick={useHint}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
              title="Hint"
              aria-label="Hint"
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Hint
            </button>
            <button
              onClick={resetBoard}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border hover:bg-gray-50 text-sm"
              title="Reset puzzle"
              aria-label="Reset puzzle"
            >
              <RotateCcw className="w-4 h-4 text-gray-700" />
              Reset
            </button>
          </div>
        </div>

        {/* Right: Features / Stats */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl shadow-sm p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="px-3 py-2 rounded-md bg-gray-50 border text-gray-700 inline-flex items-center gap-2">
                <Gauge className="w-4 h-4 text-gray-600" />
                Difficulty: <span className="font-semibold">{difficulty}</span>
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-50 border text-gray-700 inline-flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                {fmtTime(time)} {practice && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><InfinityIcon className="w-3 h-3" />practice</span>}
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-50 border text-gray-700 inline-flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Hints: <span className="font-semibold text-blue-700">{practice ? "∞" : hintsLeft}</span>
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-50 border text-gray-700 inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Mistakes:{" "}
                <span className={`font-semibold ${mistakes ? "text-red-600" : "text-gray-800"}`}>
                  {mistakes}{!practice && `/${DIFFICULTIES[difficulty].mistakes}`}
                </span>
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-50 border text-gray-700 col-span-2 inline-flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-600" />
                Score: <span className="font-semibold text-blue-700">{score}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setPencil((v) => !v)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition ${
                  pencil ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
                }`}
                title="Toggle Pencil mode (P)"
                disabled={!size}
              >
                <Pencil className="w-4 h-4" />
                {pencil ? "Pencil: ON" : "Pencil: OFF"}
              </button>

              <button
                onClick={() => navigate("/student/games")}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>

          {/* Selected cell — professional card */}
          <div className="bg-white border rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <Grid3x3 className="w-4 h-4 text-blue-600" />
                Selected cell
              </div>
            </div>
            <div className="p-4">
              {selected.r >= 0 ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-500">Position</span>
                    <span className="ml-auto font-medium text-gray-900">
                      R{selected.r + 1} • C{selected.c + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-500">Value</span>
                    <span className="ml-auto font-medium text-gray-900">
                      {board[selected.r][selected.c] || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    {isEditable(selected.r, selected.c) ? (
                      <>
                        <Edit3 className="w-4 h-4 text-green-600" />
                        <span className="text-gray-500">Status</span>
                        <span className="ml-auto font-medium text-green-700">Editable</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-500">Status</span>
                        <span className="ml-auto font-medium text-gray-700">Prefilled</span>
                      </>
                    )}
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500 mb-1 flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-gray-600" />
                      Notes
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {showNotes(selected.r, selected.c).length ? (
                        showNotes(selected.r, selected.c).map((n) => (
                          <span
                            key={n}
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200"
                          >
                            {n}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No notes</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Click a cell on the board to view details.</div>
              )}
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-4 text-sm">
            <div className="font-semibold text-gray-900">Rules & tips</div>
            <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
              <li>Hints fill a random empty cell, never the one you selected.</li>
              <li>Practice mode: unlimited hints, mistakes, and time; score is not submitted.</li>
              <li>Pencil mode: candidate numbers allowed in up to two cells at once.</li>
              <li>Non-practice: limited hints and mistakes; reaching the mistakes cap ends the game and reopens difficulty dialog.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Difficulty + Practice modal */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="text-xl font-semibold text-gray-900">Start Sudoku</div>
            {lastOutcome === "gameover" && (
              <div className="mt-2 text-sm font-medium text-red-600">
                Game over — too many mistakes. Choose difficulty to start again.
              </div>
            )}
            <div className="text-sm text-gray-600 mt-1">Choose difficulty and mode. A new random puzzle will be generated.</div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {DIFF_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => setDifficulty(k)}
                  className={`px-3 py-2 rounded-md border text-sm transition ${
                    difficulty === k ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <label className="mt-4 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-blue-600"
                checked={practice}
                onChange={(e) => setPractice(e.target.checked)}
              />
              Practice mode (unlimited hints/mistakes/time; score not submitted)
            </label>

            <div className="mt-3 text-xs text-gray-600">
              Hints: {DIFFICULTIES[difficulty].hints} • Mistakes: {DIFFICULTIES[difficulty].mistakes} (non-practice)
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => navigate("/student/games")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md border bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDiffModal(false);
                  startGame(difficulty, practice);
                }}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}