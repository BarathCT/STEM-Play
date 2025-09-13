import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "@/utils/auth";
import {
  Binary,
  Layers,
  Gamepad2,
  Brain,
  Grid3x3,
  Calculator,
  Ampersand,
  GitCompare, // XOR icon replacement
  Timer,
  Trophy,
  Zap,
  ArrowLeft,
  RotateCcw,
  HelpCircle,
  Lightbulb,
  Shuffle,
  Hash,
  ListChecks,
  Cpu,
  Infinity as InfinityIcon,
  XCircle,
  CheckCircle2,
} from "lucide-react";

/**
 * Binary Games Hub
 * Modes:
 *  - Binary Converter Challenge
 *  - Binary Match Game (memory pairs)
 *  - Binary Fill Puzzle (fill missing bits to match a target decimal)  <-- updated UI: explicit 0/1 buttons
 *  - Binary Addition/Subtraction Challenge
 *  - Bitwise Operator Puzzle (AND, OR, XOR, NOT)
 *
 * Features:
 *  - Streak multiplier, speed bonus, per-question timer (disabled in practice)
 *  - Lifelines: Hint (contextual), Shuffle (where applicable)
 *  - Practice mode: unlimited time and hints; score NOT submitted
 *  - Auto-submit to leaderboard on finish or exit (non-practice)
 *  - Lucide icons, responsive UI
 */

// ---------- Utils ----------
const randint = (n) => Math.floor(Math.random() * n);
const randRange = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randint(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fmtTime = (sec) => {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
};
const toBin = (n, width = 0) => {
  const s = (n >>> 0).toString(2);
  if (width <= 0) return s;
  return s.padStart(width, "0");
};
const fromBin = (s) => parseInt(s.replace(/[^01]/g, ""), 2) || 0;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- Modes ----------
const MODES = [
  {
    key: "converter",
    title: "Binary Converter",
    desc: "Convert between decimal and binary.",
    icon: Hash,
    ref: "binary-converter",
  },
  {
    key: "match",
    title: "Binary Match",
    desc: "Flip cards and match decimals with their binary pairs.",
    icon: Grid3x3,
    ref: "binary-match",
  },
  {
    key: "fill",
    title: "Binary Fill",
    desc: "Fill in missing bits to match a target decimal.",
    icon: Layers,
    ref: "binary-fill",
  },
  {
    key: "arithmetic",
    title: "Binary Add/Sub",
    desc: "Compute binary addition or subtraction.",
    icon: Calculator,
    ref: "binary-arith",
  },
  {
    key: "bitwise",
    title: "Bitwise Puzzle",
    desc: "Solve AND, OR, XOR, and NOT puzzles.",
    icon: Cpu,
    ref: "binary-bitwise",
  },
];

const DIFFICULTY = {
  easy: {
    questions: 10,
    timePerQ: 20,
    width: 4,
    range: [0, 15],
    pairs: 6,
    hints: 2,
    mult: 0.9,
    ref: "easy",
  },
  medium: {
    questions: 14,
    timePerQ: 15,
    width: 6,
    range: [0, 63],
    pairs: 8,
    hints: 2,
    mult: 1.0,
    ref: "medium",
  },
  hard: {
    questions: 18,
    timePerQ: 12,
    width: 8,
    range: [0, 255],
    pairs: 10,
    hints: 1,
    mult: 1.15,
    ref: "hard",
  },
};
const DIFF_KEYS = ["easy", "medium", "hard"];

// ---------- Base Scoring ----------
function calcPoints({ correct, qTime, cfg, streak }) {
  if (!correct) return 0;
  const base = 100;
  const speed = Math.max(0, Math.floor((qTime / cfg.timePerQ) * 50)); // up to +50
  const mult = 1 + streak * 0.1; // +10% per streak
  return Math.round((base + speed) * cfg.mult * mult);
}

// ---------- Converter Questions ----------
function makeConverterQuestion(cfg) {
  const direction = Math.random() < 0.5 ? 0 : 1;
  const n = randRange(cfg.range[0], cfg.range[1]);
  const width = cfg.width;
  if (direction === 0) {
    return {
      type: "converter_dec2bin",
      prompt: `Convert decimal ${n} to binary (${width} bits).`,
      answer: toBin(n, width),
      meta: { n, width },
    };
  } else {
    const b = toBin(n, width);
    return {
      type: "converter_bin2dec",
      prompt: `Convert binary ${b} to decimal.`,
      answer: String(n),
      meta: { n, width, b },
    };
  }
}

// ---------- Fill Puzzle ----------
function makeFillPuzzle(cfg) {
  const n = randRange(cfg.range[0], cfg.range[1]);
  const width = cfg.width;
  const bin = toBin(n, width);
  const k = clamp(Math.floor(width / 3), 1, width - 1);
  const idxs = shuffle([...Array(width).keys()]).slice(0, k);
  const masked = bin
    .split("")
    .map((ch, i) => (idxs.includes(i) ? "_" : ch))
    .join("");
  return {
    type: "fill",
    prompt: `Fill the bits to equal decimal ${n} (${width} bits).`,
    target: n,
    masked,
    width,
    answer: bin,
  };
}

// ---------- Arithmetic ----------
function makeArithmetic(cfg) {
  const width = cfg.width;
  const a = randRange(cfg.range[0], cfg.range[1]);
  const b = randRange(cfg.range[0], cfg.range[1]);
  const op = Math.random() < 0.5 ? "+" : "-";
  const result = op === "+" ? a + b : a - b;
  if (result < 0 || result > cfg.range[1]) return makeArithmetic(cfg);
  return {
    type: "arith",
    prompt: `Compute: ${toBin(a, width)} ${op} ${toBin(b, width)} = ? (binary)`,
    answer: toBin(result, Math.max(width, toBin(result).length)),
    meta: { a, b, op, width, result },
  };
}

// ---------- Bitwise ----------
const BITWISE_OPS = [
  { key: "AND", f: (a, b) => a & b, icon: Ampersand, label: "AND (&)" },
  { key: "OR", f: (a, b) => a | b, icon: ListChecks, label: "OR (|)" },
  { key: "XOR", f: (a, b) => a ^ b, icon: GitCompare, label: "XOR (^)" },
  { key: "NOT", f: (a) => ~a, label: "NOT (~)", unary: true },
];
function makeBitwise(cfg) {
  const width = cfg.width;
  const a = randRange(cfg.range[0], cfg.range[1]);
  const pick = BITWISE_OPS[randint(BITWISE_OPS.length)];
  if (pick.unary) {
    const out = (~a) & ((1 << width) - 1);
    return {
      type: "bitwise",
      prompt: `Compute: NOT ${toBin(a, width)} (width ${width})`,
      answer: toBin(out, width),
      meta: { op: pick.key, a, width },
    };
  } else {
    const b = randRange(cfg.range[0], cfg.range[1]);
    const out = pick.f(a, b) & ((1 << width) - 1);
    return {
      type: "bitwise",
      prompt: `Compute: ${toBin(a, width)} ${pick.key} ${toBin(b, width)} (width ${width})`,
      answer: toBin(out, width),
      meta: { op: pick.key, a, b, width },
    };
  }
}

// ---------- Match Game (Memory) ----------
function buildMatchDeck(pairsCount, cfg) {
  const used = new Set();
  const pairs = [];
  while (pairs.length < pairsCount) {
    const n = randRange(cfg.range[0], cfg.range[1]);
    if (used.has(n)) continue;
    used.add(n);
    pairs.push(n);
  }
  const cards = [];
  pairs.forEach((n, i) => {
    cards.push({ id: `D${i}`, kind: "dec", value: String(n), pairKey: String(n) });
    cards.push({ id: `B${i}`, kind: "bin", value: toBin(n, cfg.width), pairKey: String(n) });
  });
  return shuffle(cards);
}

// ---------- Main Component ----------
export default function BinaryGames() {
  const navigate = useNavigate();

  // Flow
  const [step, setStep] = useState(1); // 1: choose mode, 2: choose difficulty
  const [showModal, setShowModal] = useState(true);

  const [mode, setMode] = useState(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [practice, setPractice] = useState(false);

  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.easy;

  // Global stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [time, setTime] = useState(0);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("");
  const [hintsLeft, setHintsLeft] = useState(0);

  // Question gameplay
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [qTime, setQTime] = useState(cfg.timePerQ);

  // Inputs/Board state
  const [textAnswer, setTextAnswer] = useState("");

  // Binary Fill states
  const [fillBits, setFillBits] = useState([]); // char[]
  const [editableMask, setEditableMask] = useState([]); // boolean[] where masked "_"
  const [selectedBitIdx, setSelectedBitIdx] = useState(-1);

  // Match states
  const [matchDeck, setMatchDeck] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [moves, setMoves] = useState(0);

  // Timers
  const totalTimerRef = useRef(null);
  const qTimerRef = useRef(null);

  // Submission guard
  const submittedRef = useRef(false);

  // Build a quiz for non-match modes
  function generateQuestions(selectedMode, cfg) {
    const qs = [];
    if (selectedMode === "converter") {
      for (let i = 0; i < cfg.questions; i++) qs.push(makeConverterQuestion(cfg));
    } else if (selectedMode === "fill") {
      for (let i = 0; i < cfg.questions; i++) qs.push(makeFillPuzzle(cfg));
    } else if (selectedMode === "arithmetic") {
      for (let i = 0; i < cfg.questions; i++) qs.push(makeArithmetic(cfg));
    } else if (selectedMode === "bitwise") {
      for (let i = 0; i < cfg.questions; i++) qs.push(makeBitwise(cfg));
    }
    return qs;
  }

  function startGame() {
    setScore(0);
    setStreak(0);
    setTime(0);
    setFinished(false);
    setMessage("");
    setHintsLeft(practice ? Infinity : cfg.hints);
    setQTime(cfg.timePerQ);
    setTextAnswer("");
    submittedRef.current = false;

    if (mode === "match") {
      const deck = buildMatchDeck(cfg.pairs, cfg);
      setMatchDeck(deck);
      setFlipped([]);
      setMatchedIds(new Set());
      setMoves(0);
      setQuestions([{ type: "match_board" }]);
      setCurrent(0);
    } else {
      const qs = generateQuestions(mode, cfg);
      setQuestions(qs);
      setCurrent(0);
      if (qs[0]?.type === "fill") {
        const masked = qs[0].masked;
        setFillBits(masked.split(""));
        setEditableMask(masked.split("").map((ch) => ch === "_"));
        setSelectedBitIdx(-1);
      } else {
        setFillBits([]);
        setEditableMask([]);
        setSelectedBitIdx(-1);
      }
    }

    setShowModal(false);
  }

  // Timers
  useEffect(() => {
    if (!showModal && !finished) {
      totalTimerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [showModal, finished]);

  useEffect(() => {
    if (showModal || finished || !questions.length) return;
    setQTime(cfg.timePerQ);
    if (qTimerRef.current) clearInterval(qTimerRef.current);
    if (!practice && mode !== "match") {
      qTimerRef.current = setInterval(() => {
        setQTime((t) => {
          if (t <= 1) {
            clearInterval(qTimerRef.current);
            handleSubmit(null, true); // timeout
            return cfg.timePerQ;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (qTimerRef.current) clearInterval(qTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, questions.length, showModal, finished, cfg.timePerQ, practice, mode]);

  // On question change init states
  useEffect(() => {
    const q = questions[current];
    if (!q) return;

    setTextAnswer("");
    setMessage("");

    if (q.type === "fill") {
      setFillBits(q.masked.split(""));
      setEditableMask(q.masked.split("").map((ch) => ch === "_"));
      setSelectedBitIdx(-1);
    } else {
      setFillBits([]);
      setEditableMask([]);
      setSelectedBitIdx(-1);
    }
  }, [current, questions]);

  // Submit handler for non-match modes
  function handleSubmit(choice = textAnswer, timedOut = false) {
    if (mode === "match") return;

    const q = questions[current];
    if (!q) return;

    let correct = false;

    if (q.type === "converter_dec2bin" || q.type === "converter_bin2dec") {
      correct = choice.trim() === q.answer;
    } else if (q.type === "fill") {
      if (fillBits.includes("_")) {
        setMessage("Please fill all bits by choosing 0 or 1.");
        return;
      }
      const candidate = fillBits.join("");
      correct = candidate === q.answer;
    } else if (q.type === "arith" || q.type === "bitwise") {
      correct = choice.trim() === q.answer;
    }

    const points = calcPoints({ correct, qTime, cfg, streak });
    setScore((s) => s + points);
    setStreak((st) => (correct ? st + 1 : 0));
    setMessage(timedOut ? "Time's up!" : correct ? `Correct! ${practice ? "" : `+${points}`}` : "Incorrect.");

    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
    } else {
      setFinished(true);
      if (qTimerRef.current) clearInterval(qTimerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      autoSubmitScore("finished");
    }
  }

  // Memory Match interactions
  function onFlipCard(card) {
    if (finished) return;
    if (matchedIds.has(card.id)) return;
    if (flipped.find((c) => c.id === card.id)) return;

    const newFlipped = [...flipped, card].slice(-2);
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [c1, c2] = newFlipped;
      const isMatch =
        c1.id !== c2.id &&
        c1.pairKey === c2.pairKey &&
        ((c1.kind === "dec" && c2.kind === "bin") || (c1.kind === "bin" && c2.kind === "dec"));

      if (isMatch) {
        const newMatched = new Set(matchedIds);
        newMatched.add(c1.id);
        newMatched.add(c2.id);
        setMatchedIds(newMatched);
        setStreak((st) => st + 1);
        const points = Math.round(50 * cfg.mult * (1 + streak * 0.1));
        setScore((s) => s + points);
        setMessage(`Great! Pair matched. ${practice ? "" : `+${points}`}`);
        setTimeout(() => setFlipped([]), 250);
        if (newMatched.size === matchDeck.length) {
          setFinished(true);
          autoSubmitScore("finished");
        }
      } else {
        setStreak(0);
        setMessage("Not a match. Try again.");
        setTimeout(() => setFlipped([]), 700);
      }
    }
  }

  // Hint
  function useHint() {
    if (!practice && hintsLeft <= 0) return;
    if (mode === "converter") {
      const q = questions[current];
      if (!q) return;
      if (q.type === "converter_dec2bin") {
        const dec = q.meta.n;
        setMessage(`Hint: ${dec} = ${toBin(dec)} in binary (unpadded).`);
      } else {
        const b = q.meta.b;
        setMessage(`Hint: Place values (left to right): ${b.split("").join(" ")}`);
      }
    } else if (mode === "fill") {
      const q = questions[current];
      if (!q) return;
      // reveal one missing bit and lock it (not editable anymore)
      const idx = q.answer.split("").findIndex((bit, i) => editableMask[i] && fillBits[i] === "_");
      if (idx !== -1) {
        const fb = fillBits.slice();
        const em = editableMask.slice();
        fb[idx] = q.answer[idx];
        em[idx] = false;
        setFillBits(fb);
        setEditableMask(em);
        setMessage("Revealed one bit.");
      } else {
        setMessage("No missing bits left to reveal.");
      }
    } else if (mode === "arithmetic") {
      const q = questions[current];
      if (!q) return;
      setMessage(`Hint: Convert to decimal: ${q.meta.a} ${q.meta.op} ${q.meta.b}`);
    } else if (mode === "bitwise") {
      const q = questions[current];
      if (!q) return;
      setMessage(`Hint: Apply ${q.meta.op} bit by bit.`);
    } else if (mode === "match") {
      const hidden = matchDeck.filter((c) => !matchedIds.has(c.id));
      if (hidden.length <= 2) {
        setMessage("Almost done!");
      } else {
        const sampleIds = shuffle(hidden).slice(0, 2).map((c) => c.id);
        const temp = matchDeck.filter((c) => sampleIds.includes(c.id));
        setFlipped(temp);
        setMessage("Quick peek!");
        setTimeout(() => setFlipped([]), 650);
      }
    }
    if (!practice) setHintsLeft((h) => Math.max(0, h - 1));
  }

  function shuffleBoard() {
    if (mode !== "match") return;
    const hidden = matchDeck.filter((c) => !matchedIds.has(c.id));
    const shown = matchDeck.filter((c) => matchedIds.has(c.id));
    const shuffledHidden = shuffle(hidden);
    setMatchDeck(shown.concat(shuffledHidden));
    setFlipped([]);
    setMessage("Board shuffled.");
  }

  // Auto-submit score (finish or exit) — skip in practice
  async function autoSubmitScore(outcome) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (practice) return;
    const modeRef = MODES.find((m) => m.key === mode)?.ref || "binary";
    try {
      await authFetch("/student/leaderboard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "game",
          ref: `${modeRef}-${cfg.ref}`,
          points: score,
          meta: {
            mode,
            difficulty,
            score,
            time,
            outcome,
            practice,
            questions: mode === "match" ? 1 : questions.length,
            current: current + 1,
            moves: mode === "match" ? moves : undefined,
          },
        }),
      });
      setMessage((m) => (m ? `${m} • Score submitted` : "Score submitted"));
    } catch {
      // ignore
    }
  }

  // Exit auto-submit
useEffect(() => {
  function submitIfNeeded() {
    if (!submittedRef.current && !showModal && !practice && score > 0) {
      autoSubmitScore("exit");
    }
  }
  function handleBeforeUnload() {
    submitIfNeeded();
  }
  function handlePageHide() {
    submitIfNeeded();
  }
  function handleVisibility() {
    if (document.visibilityState === "hidden") submitIfNeeded();
  }

  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("pagehide", handlePageHide);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("pagehide", handlePageHide);
    document.removeEventListener("visibilitychange", handleVisibility);
    submitIfNeeded();
  };
// deps
}, [showModal, score, difficulty, current, finished, time, practice, mode]);

  // Derived
const q = questions[current] || null;
const totalQs = mode === "match" ? 1 : (Array.isArray(questions) ? questions.length : 0);
const progress = totalQs > 0 ? Math.round(((Math.min(current, totalQs - 1) + 1) / totalQs) * 100) : 0;
const hintsDisplay = practice ? "∞" : String(hintsLeft);

  // Helpers for Binary Fill keypad
  const canSetBit = selectedBitIdx >= 0 && editableMask[selectedBitIdx];
  function setSelectedBit(val) {
    if (!canSetBit) return;
    const fb = fillBits.slice();
    fb[selectedBitIdx] = val;
    setFillBits(fb);
  }
  function clearSelectedBit() {
    if (!canSetBit) return;
    const fb = fillBits.slice();
    fb[selectedBitIdx] = "_";
    setFillBits(fb);
  }

  // Renderers for different modes
  const renderQuestionArea = () => {
    if (!q) return <div className="text-sm text-gray-600">Select a game and difficulty to start.</div>;

    if (mode === "match") {
      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-700">
              Find all pairs. Moves: <span className="font-semibold">{moves}</span>
            </div>
            <button
              onClick={shuffleBoard}
              className="inline-flex items-center gap-2 px-2 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-xs"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle
            </button>
          </div>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(matchDeck.length))}, minmax(0,1fr))`,
            }}
          >
            {matchDeck.map((card) => {
              const isFaceUp = flipped.find((c) => c.id === card.id) || matchedIds.has(card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => onFlipCard(card)}
                  disabled={matchedIds.has(card.id)}
                  className={`aspect-[3/2] rounded-md border flex items-center justify-center text-sm transition ${
                    isFaceUp ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                  title={card.kind === "dec" ? "Decimal" : "Binary"}
                >
                  <div className="text-center">
                    <div className="text-[11px] opacity-80">{card.kind === "dec" ? "DEC" : "BIN"}</div>
                    <div className="font-mono font-semibold text-base">{isFaceUp ? card.value : "?"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (q.type === "converter_dec2bin" || q.type === "converter_bin2dec") {
      return (
        <>
          <div className="flex items-start gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <h3 className="text-base font-semibold text-gray-900">{q.prompt}</h3>
          </div>
          <input
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Type your answer"
            className="w-full px-3 py-2 rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => handleSubmit()}
              disabled={!textAnswer}
              className={`px-4 py-2 rounded-md text-white ${
                textAnswer ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Submit
            </button>
          </div>
        </>
      );
    }

    if (q.type === "fill") {
      const width = q.width;
      const currentDec = fromBin(fillBits.join("").replace(/_/g, "0"));
      return (
        <>
          <div className="flex items-start gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <h3 className="text-base font-semibold text-gray-900">{q.prompt}</h3>
          </div>

          {/* Bit row */}
          <div className="flex items-center gap-2 flex-wrap">
            {fillBits.map((ch, idx) => {
              const editable = editableMask[idx];
              const selected = idx === selectedBitIdx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!editable) return;
                    setSelectedBitIdx(idx);
                  }}
                  className={[
                    "w-10 h-12 rounded-md border font-mono text-lg flex items-center justify-center transition",
                    editable
                      ? selected
                        ? "bg-blue-50 border-blue-600 ring-2 ring-blue-200 text-blue-700"
                        : "bg-white hover:bg-gray-50 border-gray-300 text-gray-900"
                      : "bg-blue-600 text-white border-blue-600",
                  ].join(" ")}
                  title={editable ? "Select to set 0 or 1" : "Fixed bit"}
                >
                  {editable ? (ch === "_" ? "?" : ch) : ch}
                </button>
              );
            })}
          </div>

          {/* Keypad: 0 / 1 / Clear */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setSelectedBit("0")}
              disabled={!canSetBit}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${
                canSetBit ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              title="Set selected bit to 0"
            >
              <XCircle className="w-4 h-4 text-red-600" />
              Set 0
            </button>
            <button
              onClick={() => setSelectedBit("1")}
              disabled={!canSetBit}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${
                canSetBit ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              title="Set selected bit to 1"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Set 1
            </button>
            <button
              onClick={clearSelectedBit}
              disabled={!canSetBit}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${
                canSetBit ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              title="Clear selected bit"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>

            <div className="ml-auto text-sm text-gray-700">
              Target:{" "}
              <span className="font-semibold">{q.target}</span>
            </div>
          </div>

          <div className="mt-3">
            <button
              onClick={() => handleSubmit()}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Check
            </button>
          </div>
        </>
      );
    }

    if (q.type === "arith" || q.type === "bitwise") {
      return (
        <>
          <div className="flex items-start gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <h3 className="text-base font-semibold text-gray-900">{q.prompt}</h3>
          </div>
          <input
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Enter result in binary"
            className="w-full px-3 py-2 rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono"
          />
          <div className="mt-3">
            <button
              onClick={() => handleSubmit()}
              disabled={!textAnswer}
              className={`px-4 py-2 rounded-md text-white ${
                textAnswer ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Submit
            </button>
          </div>
        </>
      );
    }

    return null;
  };

  // Reset (replay same settings)
  function resetGame() {
    setScore(0);
    setStreak(0);
    setTime(0);
    setFinished(false);
    setMessage("");
    setHintsLeft(practice ? Infinity : cfg.hints);
    setQTime(cfg.timePerQ);
    setTextAnswer("");
    submittedRef.current = false;

    if (mode === "match") {
      const deck = buildMatchDeck(cfg.pairs, cfg);
      setMatchDeck(deck);
      setFlipped([]);
      setMatchedIds(new Set());
      setMoves(0);
      setQuestions([{ type: "match_board" }]);
      setCurrent(0);
    } else {
      const qs = generateQuestions(mode, cfg);
      setQuestions(qs);
      setCurrent(0);
      if (qs[0]?.type === "fill") {
        setFillBits(qs[0].masked.split(""));
        setEditableMask(qs[0].masked.split("").map((ch) => ch === "_"));
        setSelectedBitIdx(-1);
      } else {
        setFillBits([]);
        setEditableMask([]);
        setSelectedBitIdx(-1);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 text-gray-900">
          <Gamepad2 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Binary Games</h1>
        </div>
        <p className="text-sm text-gray-600">
          Choose a game • Select difficulty • Play.{" "}
          {practice ? "Practice mode: unlimited time & hints; score not submitted." : "Scores auto-submit when you finish or exit."}
        </p>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Game area */}
        <div className="bg-white border rounded-xl shadow-sm p-4">
          {/* Progress and meta */}
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
              <Binary className="w-4 h-4 text-blue-600" />
              {mode ? MODES.find((m) => m.key === mode)?.title : "Mode"}
              <span className="text-xs text-gray-500">• {difficulty}</span>
              {practice && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 ml-1">
                  <InfinityIcon className="w-3 h-3" />
                  practice
                </span>
              )}
            </div>
            <button
              onClick={resetGame}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-xs"
              title="Reset current set"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Bars */}
          {mode !== "match" && (
            <div className="mb-4">
              <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                <div className="h-2 bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 h-1.5 w-full rounded bg-gray-100 overflow-hidden">
                <div
                  className={`h-1.5 ${practice ? "bg-gray-300" : "bg-emerald-500"} transition-all`}
                  style={{ width: practice ? "100%" : `${(qTime / cfg.timePerQ) * 100}%` }}
                  title={practice ? "Practice: unlimited time" : "Time left"}
                />
              </div>
            </div>
          )}

          {/* Question/UI */}
          {renderQuestionArea()}
        </div>

        {/* Right: Stats & Controls */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl shadow-sm p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="px-3 py-2 rounded-md bg-gray-50 border text-gray-700 inline-flex items-center gap-2">
                <Timer className="w-4 h-4" />
                {fmtTime(time)}
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-50 border text-gray-700 inline-flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                Streak: <span className="font-semibold">{streak}</span>
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-50 border text-gray-700 inline-flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-600" />
                Score: <span className="font-semibold">{score}</span>
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-50 border text-gray-700 inline-flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Hints: <span className="font-semibold">{hintsDisplay}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={useHint}
                disabled={!practice && hintsLeft <= 0}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                  practice || hintsLeft > 0 ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Hint
              </button>

              <button
                onClick={() => {
                  setShowModal(true);
                  setStep(1);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
              >
                <Brain className="w-4 h-4" />
                Change Game
              </button>

              <button
                onClick={() => navigate("/student/games")}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-4 min-h-[84px]">
            <div className="text-sm text-gray-600">Message</div>
            <div className="mt-1 text-sm font-medium text-gray-800">{message || "Status updates appear here."}</div>
          </div>

          {mode && mode !== "match" && q && (
            <div className="bg-white border rounded-xl shadow-sm p-4 text-sm">
              <div className="font-semibold text-gray-900">Quick tips</div>
              <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
                {mode === "converter" && (
                  <>
                    <li>Place values (from right): 1, 2, 4, 8, 16, ...</li>
                    <li>Decimal → Binary: subtract highest place values that fit.</li>
                  </>
                )}
                {mode === "fill" && (
                  <>
                    <li>Click a ? bit to select, then use the 0/1 buttons to fill.</li>
                    <li>Current decimal updates live to guide you.</li>
                  </>
                )}
                {mode === "arithmetic" && (
                  <>
                    <li>Align bits and carry/borrow like decimal arithmetic.</li>
                    <li>Double-check your result’s length (leading zeros allowed).</li>
                  </>
                )}
                {mode === "bitwise" && (
                  <>
                    <li>AND: 1 only if both bits are 1; OR: 1 if at least one bit is 1.</li>
                    <li>XOR: 1 if bits differ; NOT flips all bits (within width).</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Finish screen inline */}
      {finished && (
        <div className="max-w-6xl mx-auto px-4 pb-10">
          <div className="bg-white border rounded-xl shadow-sm p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Well done! 🎉</h2>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border text-sm text-gray-700">
                <Trophy className="w-4 h-4 text-yellow-600" />
                Score: <span className="font-semibold">{score}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border text-sm text-gray-700">
                <Timer className="w-4 h-4" />
                {fmtTime(time)}
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              {mode ? MODES.find((m) => m.key === mode)?.title : "Mode"} • {difficulty}
              {practice ? " • Practice (not submitted)" : ""}
              {mode === "match" ? ` • Moves ${moves}` : ""}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={resetGame} className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
                Play Again
              </button>
              <button
                onClick={() => {
                  setShowModal(true);
                  setStep(1);
                }}
                className="px-5 py-2 rounded-md border bg-white hover:bg-gray-50"
              >
                Change Game
              </button>
              <button onClick={() => navigate("/student/games")} className="px-5 py-2 rounded-md border bg-white hover:bg-gray-50">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
            {!practice && <div className="mt-3 text-xs text-green-600">Score submitted automatically.</div>}
            {practice && <div className="mt-3 text-xs text-gray-600">Practice mode: score was not submitted.</div>}
          </div>
        </div>
      )}

      {/* Modal: Step 1 (Game) + Step 2 (Difficulty) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
            {step === 1 ? (
              <>
                <div className="text-xl font-semibold text-gray-900">Choose a Binary Game</div>
                <div className="text-sm text-gray-600 mt-1">Pick a game mode to continue.</div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MODES.map((m) => {
                    const Icon = m.icon || Brain;
                    const selected = mode === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        className={`text-left p-4 rounded-lg border transition ${
                          selected ? "bg-blue-50 border-blue-600 ring-2 ring-blue-200" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${selected ? "text-blue-600" : "text-gray-700"}`} />
                          <div className="font-semibold text-gray-900">{m.title}</div>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => navigate("/student/games")} className="px-4 py-2 text-sm rounded-md border bg-white hover:bg-gray-50">
                    <ArrowLeft className="w-4 h-4 inline-block mr-1" />
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!mode}
                    className={`px-4 py-2 text-sm rounded-md text-white ${
                      mode ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-xl font-semibold text-gray-900">Select Difficulty</div>
                <div className="text-sm text-gray-600 mt-1">
                  Choose your challenge level. Practice mode gives unlimited time and hints; score is not submitted.
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {DIFF_KEYS.map((k) => (
                    <button
                      key={k}
                      onClick={() => setDifficulty(k)}
                      className={`px-3 py-3 rounded-md border text-sm transition ${
                        difficulty === k ? "bg-white border-blue-600 ring-2 ring-blue-200" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-semibold capitalize text-gray-900">{k}</div>
                      <div className="text-[11px] text-gray-700 mt-0.5">
                        {DIFFICULTY[k].questions} Qs • {DIFFICULTY[k].timePerQ}s/Q • bits {DIFFICULTY[k].width}
                      </div>
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
                  <span className="inline-flex items-center gap-1">
                    <InfinityIcon className="w-4 h-4" />
                    Practice mode (unlimited; score not submitted)
                  </span>
                </label>

                <div className="mt-5 flex justify-between">
                  <button onClick={() => setStep(1)} className="px-4 py-2 text-sm rounded-md border bg-white hover:bg-gray-50">
                    Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate("/student/games")}
                      className="px-4 py-2 text-sm rounded-md border bg-white hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4 inline-block mr-1" />
                      Cancel
                    </button>
                    <button onClick={startGame} className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
                      Start
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}