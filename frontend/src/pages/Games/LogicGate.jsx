import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "@/utils/auth";
import {
  CircuitBoard,
  Cpu,
  ToggleLeft,
  ToggleRight,
  Timer,
  Trophy,
  Zap,
  HelpCircle,
  Lightbulb,
  SkipForward,
  ArrowLeft,
  Binary,
  Sigma,
  Layers,
  BookOpen,
  Info,
  Infinity as InfinityIcon,
} from "lucide-react";

/**
 * Logic Gate Puzzle (Grades 6–12) with Practice Mode
 * - Clear symbols + names + legend with mini truth tables
 * - Difficulties tuned for grade bands:
 *   • Easy (Grades 6–7): AND, OR, NOT, shallow circuits, 2 inputs
 *   • Medium (Grades 8–9): + NAND, XOR, medium depth, 2 inputs
 *   • Hard (Grades 10–11): + NOR, XNOR, deeper circuits, 3 inputs
 *   • Difficult (Grade 12): all gates, deepest circuits, 3 inputs
 * - Practice mode: unlimited time and lifelines, score NOT submitted to leaderboard
 * - Mixed question types:
 *    • evaluate: choose output 0/1 for given inputs
 *    • match: toggle inputs to reach a target output
 *    • identify_gate: read a mini truth table and pick the gate
 * - Per-question timer (disabled in practice), streak multiplier, speed bonus
 * - Auto-submit to leaderboard on finish and exit (non-practice only)
 */

// ---------- Utilities ----------
const boolTo01 = (b) => (b ? 1 : 0);
const fmtTime = (sec) => {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
};
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- Gates ----------
const GATES = {
  AND: { arity: 2, eval: (a, b) => a && b, sym: "AND (∧)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  OR: { arity: 2, eval: (a, b) => a || b, sym: "OR (∨)", color: "text-blue-700 bg-blue-50 border-blue-200" },
  XOR: { arity: 2, eval: (a, b) => (a ? !b : b), sym: "XOR (⊕)", color: "text-purple-700 bg-purple-50 border-purple-200" },
  NAND: { arity: 2, eval: (a, b) => !(a && b), sym: "NAND (⊼)", color: "text-rose-700 bg-rose-50 border-rose-200" },
  NOR: { arity: 2, eval: (a, b) => !(a || b), sym: "NOR (⊽)", color: "text-orange-700 bg-orange-50 border-orange-200" },
  XNOR: { arity: 2, eval: (a, b) => (a ? b : !b), sym: "XNOR (≡)", color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  NOT: { arity: 1, eval: (a) => !a, sym: "NOT (¬)", color: "text-gray-700 bg-gray-50 border-gray-200" },
};
const ALL_BIN = ["AND", "OR", "XOR", "NAND", "NOR", "XNOR"];
const ALL_UN = ["NOT"];

// ---------- Expression helpers ----------
function makeVar(name) {
  return { type: "VAR", name };
}
function makeNot(expr) {
  return { type: "NOT", in: expr };
}
function makeBin(op, left, right) {
  return { type: "BIN", op, left, right };
}

function randGateKey(allowedBin, allowedUn, includeUnary = true) {
  const pool = includeUnary ? [...allowedBin, ...allowedBin, ...allowedUn] : allowedBin;
  return sample(pool);
}

function buildExpr(vars, depthMin, depthMax, allowedBin, allowedUn) {
  if (depthMax <= 0) {
    const v = makeVar(sample(vars));
    return Math.random() < 0.25 && allowedUn.length ? makeNot(v) : v;
  }
  if (depthMin <= 0 && Math.random() < 0.3) {
    const v = makeVar(sample(vars));
    return Math.random() < 0.4 && allowedUn.length ? makeNot(v) : v;
  }
  const key = randGateKey(allowedBin, allowedUn, true);
  if (key === "NOT") {
    return makeNot(buildExpr(vars, depthMin - 1, depthMax - 1, allowedBin, allowedUn));
    } else {
    const left = buildExpr(vars, depthMin - 1, depthMax - 1, allowedBin, allowedUn);
    const right = buildExpr(vars, depthMin - 1, depthMax - 1, allowedBin, allowedUn);
    return makeBin(key, left, right);
  }
}

function evalExpr(expr, env) {
  switch (expr.type) {
    case "VAR":
      return !!env[expr.name];
    case "NOT":
      return !evalExpr(expr.in, env);
    case "BIN": {
      const f = GATES[expr.op].eval;
      const a = evalExpr(expr.left, env);
      const b = evalExpr(expr.right, env);
      return f(a, b);
    }
    default:
      return false;
  }
}

function exprToString(expr) {
  switch (expr.type) {
    case "VAR":
      return expr.name;
    case "NOT":
      return `¬${wrapIfNeeded(expr.in)}`;
    case "BIN": {
      const sym = {
        AND: "∧",
        OR: "∨",
        XOR: "⊕",
        NAND: "⊼",
        NOR: "⊽",
        XNOR: "≡",
      }[expr.op];
      return `(${exprToString(expr.left)} ${sym} ${exprToString(expr.right)})`;
    }
    default:
      return "?";
  }
}
function wrapIfNeeded(e) {
  if (e.type === "VAR") return e.name;
  return `(${exprToString(e)})`;
}

function allAssignments(varNames) {
  const n = varNames.length;
  const list = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const env = {};
    varNames.forEach((name, i) => {
      env[name] = !!(mask & (1 << i));
    });
    list.push(env);
  }
  return list;
}

// Truth tables for gates (mini)
function gateTruthTable(op) {
  if (op === "NOT") {
    return [
      { a: 0, out: Number(GATES.NOT.eval(false)) },
      { a: 1, out: Number(GATES.NOT.eval(true)) },
    ];
  }
  const f = GATES[op].eval;
  const rows = [];
  for (const a of [0, 1]) {
    for (const b of [0, 1]) {
      rows.push({ a, b, out: Number(f(!!a, !!b)) });
    }
  }
  return rows;
}

// ---------- Difficulty (grade-aligned) ----------
const DIFFICULTY = {
  easy: {
    label: "Easy (Grades 6–7)",
    inputs: 2,
    questions: 8,
    timePerQ: 20,
    depth: [1, 2],
    mult: 0.9,
    ref: "easy",
    lifelines: { peek: 1, skip: 1 },
    allowedBin: ["AND", "OR"], // basic
    allowedUn: ["NOT"],
  },
  medium: {
    label: "Medium (Grades 8–9)",
    inputs: 2,
    questions: 12,
    timePerQ: 15,
    depth: [2, 3],
    mult: 1.0,
    ref: "medium",
    lifelines: { peek: 1, skip: 1 },
    allowedBin: ["AND", "OR", "NAND", "XOR"],
    allowedUn: ["NOT"],
  },
  hard: {
    label: "Hard (Grades 10–11)",
    inputs: 3,
    questions: 15,
    timePerQ: 12,
    depth: [3, 4],
    mult: 1.15,
    ref: "hard",
    lifelines: { peek: 1, skip: 1 },
    allowedBin: ["AND", "OR", "NAND", "XOR", "NOR", "XNOR"],
    allowedUn: ["NOT"],
  },
  difficult: {
    label: "Difficult (Grade 12)",
    inputs: 3,
    questions: 18,
    timePerQ: 10,
    depth: [4, 5],
    mult: 1.3,
    ref: "difficult",
    lifelines: { peek: 1, skip: 0 },
    allowedBin: ALL_BIN,
    allowedUn: ALL_UN,
  },
};
const DIFF_KEYS = ["easy", "medium", "hard", "difficult"];

// ---------- Question generator ----------
/*
  Types:
  - evaluate: given env, user chooses output 0/1
  - match: set inputs to reach target output 0/1
  - identify_gate: mini truth table for a gate; pick the correct gate
*/
function makeQuestion(vars, depthRange, allowedBin, allowedUn) {
  const roll = Math.random();
  if (roll < 0.25) {
    const pool = [...allowedBin, ...allowedUn];
    const answer = sample(pool);
    const tt = gateTruthTable(answer);
    const optionsPool = shuffle(pool.filter((k) => k !== answer)).slice(0, 3);
    const opts = shuffle([answer, ...optionsPool]);
    return { type: "identify_gate", answer, table: tt, options: opts };
  }
  const expr = buildExpr(vars, depthRange[0], depthRange[1], allowedBin, allowedUn);
  if (roll < 0.6) {
    const env = sample(allAssignments(vars));
    const answer = boolTo01(evalExpr(expr, env));
    return { type: "evaluate", expr, vars, env, answer };
  } else {
    const target = Math.random() < 0.5 ? 1 : 0;
    return { type: "match", expr, vars, target };
  }
}

function generateQuiz(dKey) {
  const cfg = DIFFICULTY[dKey];
  const vars = ["A", "B", "C"].slice(0, cfg.inputs);
  const qs = [];
  for (let i = 0; i < cfg.questions; i++) {
    qs.push(makeQuestion(vars, cfg.depth, cfg.allowedBin, cfg.allowedUn));
  }
  return qs;
}

// ---------- UI bits ----------
const Chip = ({ children, className = "" }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${className}`}>{children}</span>
);

function InputToggle({ label, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-1 px-3 py-2 rounded-md border transition ${
        value ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-blue-50"
      }`}
      aria-label={`Toggle ${label}`}
      title={`Toggle ${label}`}
    >
      {value ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      {label}: {value ? 1 : 0}
    </button>
  );
}

function GateBadge({ op }) {
  const g = GATES[op];
  return (
    <Chip className={`${g.color} text-xs font-semibold`}>
      <Cpu className="w-3.5 h-3.5" />
      {g.sym}
    </Chip>
  );
}

function MiniTruthTable({ op }) {
  const rows = gateTruthTable(op);
  const isUnary = op === "NOT";
  return (
    <div className="text-[11px] leading-4">
      <div className="grid grid-cols-3 font-semibold text-gray-700">
        <div className="px-1">A</div>
        <div className="px-1">{isUnary ? "" : "B"}</div>
        <div className="px-1">Out</div>
      </div>
      <div className="divide-y">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-3">
            <div className="px-1">{r.a}</div>
            <div className="px-1">{isUnary ? "" : r.b}</div>
            <div className="px-1 font-semibold">{r.out}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GateLegend({ allowed }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Gate Legend
        </div>
        <div className="text-xs text-gray-500">Name • Symbol • Mini Table</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {allowed.map((op) => (
          <div key={op} className="border rounded-lg p-2">
            <div className="flex items-center justify-between mb-1">
              <GateBadge op={op} />
              <Info className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <MiniTruthTable op={op} />
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] text-gray-600">
        Tips: AND=both 1, OR=at least one 1, XOR=exactly one 1, NOT=inverts, NAND/NOR=NOT of AND/OR, XNOR=1 when inputs equal.
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function LogicGate() {
  const navigate = useNavigate();

  // Modal
  const [showDiffModal, setShowDiffModal] = useState(true);
  const [difficulty, setDifficulty] = useState("easy");
  const [practice, setPractice] = useState(false); // Practice mode toggle
  const cfg = DIFFICULTY[difficulty];

  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(""); // evaluate & identify_gate
  const [inputState, setInputState] = useState({}); // match
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);

  // Lifelines
  const [peekLeft, setPeekLeft] = useState(0);
  const [skipLeft, setSkipLeft] = useState(0);

  // Timers
  const [time, setTime] = useState(0);
  const [qTime, setQTime] = useState(cfg.timePerQ);
  const totalTimerRef = useRef(null);
  const qTimerRef = useRef(null);

  // UI
  const [message, setMessage] = useState("");
  const submittedRef = useRef(false);

  // Start quiz
  function startQuiz(dKey, isPractice) {
    const qs = generateQuiz(dKey);
    setQuestions(qs);
    setCurrent(0);
    setSelected("");
    setScore(0);
    setStreak(0);
    setFinished(false);

    // Lifelines: unlimited in practice
    if (isPractice) {
      setPeekLeft(Number.POSITIVE_INFINITY);
      setSkipLeft(Number.POSITIVE_INFINITY);
    } else {
      setPeekLeft(DIFFICULTY[dKey].lifelines.peek);
      setSkipLeft(DIFFICULTY[dKey].lifelines.skip);
    }

    setTime(0);
    setQTime(DIFFICULTY[dKey].timePerQ);
    setMessage("");
    submittedRef.current = false;
    setPractice(isPractice);

    // init input toggles if first is match
    const q0 = qs[0];
    if (q0?.type === "match") {
      const s = {};
      q0.vars.forEach((v) => (s[v] = false));
      setInputState(s);
    } else {
      setInputState({});
    }
    setShowDiffModal(false);
  }

  // Total timer (always runs, even in practice, for info)
  useEffect(() => {
    if (!showDiffModal && !finished) {
      totalTimerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [showDiffModal, finished]);

  // Per-question timer (disabled in practice)
  useEffect(() => {
    if (showDiffModal || finished || !questions.length) return;
    setQTime(cfg.timePerQ);
    if (qTimerRef.current) clearInterval(qTimerRef.current);
    if (!practice) {
      qTimerRef.current = setInterval(() => {
        setQTime((t) => {
          if (t <= 1) {
            clearInterval(qTimerRef.current);
            // time up: mark incorrect, move on
            handleSubmitAnswer(null, true);
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
  }, [current, questions.length, showDiffModal, finished, cfg.timePerQ, practice]);

  // On question change, prep state
  useEffect(() => {
    const q = questions[current];
    if (!q) return;
    if (q.type === "match") {
      const s = {};
      q.vars.forEach((v) => (s[v] = false));
      setInputState(s);
    } else {
      setInputState({});
    }
    setSelected("");
    setMessage("");
  }, [current, questions]);

  // Submit / check
  function handleSubmitAnswer(choice = selected, timedOut = false) {
    const q = questions[current];
    if (!q || finished) return;

    let isCorrect = false;
    if (q.type === "evaluate") {
      isCorrect = String(q.answer) === String(choice);
    } else if (q.type === "match") {
      const out = boolTo01(evalExpr(q.expr, inputState));
      isCorrect = out === q.target;
    } else if (q.type === "identify_gate") {
      isCorrect = choice === q.answer;
    }

    const base = 100;
    const speedBonus = practice ? 0 : Math.max(0, Math.floor((qTime / cfg.timePerQ) * 50)); // practice: ignore speed bonus
    const newStreak = isCorrect ? streak + 1 : 0;
    const streakMult = practice ? 1 : 1 + newStreak * 0.1; // practice: no multiplier boost, keep feedback simple
    const gained = isCorrect ? Math.round((base + speedBonus) * cfg.mult * streakMult) : 0;

    setScore((s) => s + gained);
    setStreak(newStreak);
    setMessage(
      timedOut
        ? "Time's up!"
        : isCorrect
        ? `Correct! ${practice ? "" : `+${gained} (base ${base}, speed +${speedBonus})`}`
        : "Incorrect."
    );

    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
    } else {
      setFinished(true);
      if (qTimerRef.current) clearInterval(qTimerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      autoSubmitScore("finished");
    }
  }

  // Lifelines
  function usePeek() {
    if (peekLeft <= 0) return;
    const q = questions[current];
    if (!q) return;

    if (q.type === "evaluate") {
      setMessage(`Peek: Correct output is ${q.answer}.`);
    } else if (q.type === "identify_gate") {
      const ar = q.answer === "NOT" ? 1 : 2;
      const hint =
        q.answer === "XOR"
          ? "Hint: Output is 1 when exactly one input is 1."
          : q.answer === "XNOR"
          ? "Hint: Output is 1 when inputs are equal."
          : q.answer === "NAND"
          ? "Hint: It is the opposite of AND."
          : q.answer === "NOR"
          ? "Hint: It is the opposite of OR."
          : q.answer === "AND"
          ? "Hint: Output is 1 only when both inputs are 1."
          : q.answer === "OR"
          ? "Hint: Output is 1 when at least one input is 1."
          : "Hint: It flips the input.";
      setMessage(`Peek: This gate has arity ${ar}. ${hint}`);
    } else {
      // match: suggest a variable to flip
      const out = boolTo01(evalExpr(q.expr, inputState));
      if (out === q.target) {
        setMessage(`Peek: Your current inputs already give ${q.target}. Press Check!`);
      } else {
        let suggestion = null;
        for (const v of q.vars) {
          const trial = { ...inputState, [v]: !inputState[v] };
          const tout = boolTo01(evalExpr(q.expr, trial));
          if (tout === q.target) {
            suggestion = `Try toggling ${v}.`;
            break;
          }
        }
        setMessage(`Peek: Output now is ${out}. ${suggestion ?? "Try a different toggle."}`);
      }
    }
    if (!practice) setPeekLeft((n) => n - 1); // unlimited in practice
  }

  function useSkip() {
    if (skipLeft <= 0) return;
    if (!practice) setSkipLeft((n) => n - 1); // unlimited in practice
    setStreak(0);
    setMessage("Question skipped.");
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
    } else {
      setFinished(true);
      if (qTimerRef.current) clearInterval(qTimerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      autoSubmitScore("finished");
    }
  }

  // Auto-submit score (finish or exit) — skip in practice
  async function autoSubmitScore(outcome) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (practice) return; // Do not submit in practice mode
    try {
      await authFetch("/student/leaderboard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "game",
          ref: `logicgate-${cfg.ref}`,
          points: score,
          meta: {
            difficulty,
            score,
            answered: current + (finished ? 1 : 0),
            total: questions.length || 0,
            time,
            outcome,
            practice,
          },
        }),
      });
      setMessage((m) => (m ? `${m} • Score submitted` : "Score submitted"));
    } catch {
      // ignore network errors for UX
    }
  }

  // Exit auto-submit (skip in practice)
  useEffect(() => {
    function submitIfNeeded() {
      if (!submittedRef.current && !showDiffModal && !practice && score > 0) {
        autoSubmitScore("exit");
      }
    }
    const onBeforeUnload = () => submitIfNeeded();
    const onPageHide = () => submitIfNeeded();
    const onVis = () => {
      if (document.visibilityState === "hidden") submitIfNeeded();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVis);
      submitIfNeeded();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDiffModal, score, difficulty, current, finished, time, practice]);

  // Derived UI data
  const q = questions[current];
  const total = questions.length;
  const progress = total ? Math.round((current / total) * 100) : 0;
  const exprStr = q && (q.type === "evaluate" || q.type === "match") ? exprToString(q.expr) : "";
  const allowedForLegend = useMemo(() => [...cfg.allowedBin, ...cfg.allowedUn], [cfg]);

  function collectGates(e, acc = []) {
    if (!e) return acc;
    if (e.type === "BIN") {
      acc.push(e.op);
      collectGates(e.left, acc);
      collectGates(e.right, acc);
    } else if (e.type === "NOT") {
      acc.push("NOT");
      collectGates(e.in, acc);
    }
    return acc;
  }
  const gateList = useMemo(() => {
    if (!q || q.type === "identify_gate") return [];
    const set = new Set(collectGates(q.expr, []));
    return Array.from(set);
  }, [q]);

  // Lifeline display text
  const peekDisplay = practice ? "∞" : String(peekLeft);
  const skipDisplay = practice ? "∞" : String(skipLeft);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 text-gray-900">
          <CircuitBoard className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Logic Gate Puzzle</h1>
        </div>
        <p className="text-sm text-gray-600">
          Clear gate names and symbols • Grade-aligned difficulty • Mixed challenges • {practice ? "Practice mode (score not submitted)" : "Auto-submits to leaderboard"}
        </p>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Circuit/Expression + Legend */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
                <Binary className="w-4 h-4 text-blue-600" />
                Circuit
              </div>
              <div className="text-xs text-gray-500">{DIFFICULTY[difficulty].label}</div>
            </div>

            {/* Expression (for evaluate/match) OR Truth table (for identify_gate) */}
            {q ? (
              q.type === "identify_gate" ? (
                <div className="rounded-lg border bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-800 mb-2">
                    <Sigma className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">Identify the Gate:</span>
                    <span className="text-gray-600">Use this truth table</span>
                  </div>
                  <div className="inline-block border rounded-md p-2 bg-white">
                    <div className="text-[12px]">
                      <div className="grid grid-cols-3 font-semibold text-gray-700">
                        <div className="px-1">A</div>
                        <div className="px-1">{q.table[0].b === undefined ? "" : "B"}</div>
                        <div className="px-1">Out</div>
                      </div>
                      <div className="divide-y">
                        {q.table.map((r, i) => (
                          <div key={i} className="grid grid-cols-3">
                            <div className="px-1">{r.a}</div>
                            <div className="px-1">{r.b === undefined ? "" : r.b}</div>
                            <div className="px-1 font-semibold">{r.out}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-800">
                    <Sigma className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">Expression:</span>
                    <span className="font-mono text-base">{exprStr}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <Layers className="w-4 h-4 text-gray-500" />
                    {gateList.length ? (
                      gateList.map((g) => <GateBadge key={g} op={g} />)
                    ) : (
                      <Chip className="bg-gray-50 border-gray-200 text-gray-600">No gates</Chip>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-600">Choose a difficulty to start.</div>
            )}

            {/* Inputs view */}
            {q && (q.type === "evaluate" || q.type === "match") && (
              <div className="mt-4">
                <div className="text-sm text-gray-700 mb-2">Inputs</div>
                {q.type === "evaluate" ? (
                  <div className="flex flex-wrap gap-2">
                    {q.vars.map((v) => (
                      <Chip key={v} className="bg-white border-gray-200 text-gray-800">
                        {v}: <span className="font-semibold">{q.env[v] ? 1 : 0}</span>
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {q.vars.map((v) => (
                      <InputToggle
                        key={v}
                        label={v}
                        value={!!inputState[v]}
                        onChange={(val) => setInputState((s) => ({ ...s, [v]: val }))}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Educational legend for allowed gates */}
          <GateLegend allowed={allowedForLegend} />
        </div>

        {/* Right: Quiz/Controls */}
        <div className="bg-white border rounded-2xl shadow-sm p-6">
          {!finished && total > 0 ? (
            <>
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border text-sm text-gray-700">
                  <Timer className="w-4 h-4" />
                  {fmtTime(time)}
                  {practice && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600 ml-1">
                      <InfinityIcon className="w-3 h-3" /> practice
                    </span>
                  )}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border text-sm text-gray-700">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  Streak: <span className="font-semibold">{streak}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border text-sm text-gray-700">
                  <Trophy className="w-4 h-4 text-yellow-600" />
                  Score: <span className="font-semibold">{score}</span>
                </div>
                <div className="ml-auto text-sm text-gray-600">
                  Q {current + 1} / {total}
                </div>
              </div>

              {/* Progress + per-question timer */}
              <div className="mb-4">
                <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                  <div className="h-2 bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 h-1.5 w-full rounded bg-gray-100 overflow-hidden">
                  <div
                    className={`h-1.5 ${practice ? "bg-gray-300" : "bg-emerald-500"} transition-all`}
                    style={{ width: practice ? "100%" : `${(qTime / cfg.timePerQ) * 100}%` }}
                    title={practice ? "Practice mode: unlimited time" : "Time left"}
                  />
                </div>
              </div>

              {/* Question prompt */}
              <div className="flex items-start gap-2 mb-3">
                <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                {q?.type === "evaluate" && (
                  <h3 className="text-base font-semibold text-gray-900">Given the inputs, what is the circuit output?</h3>
                )}
                {q?.type === "match" && (
                  <h3 className="text-base font-semibold text-gray-900">
                    Toggle inputs so the circuit outputs <span className="text-blue-700">{q.target}</span>.
                  </h3>
                )}
                {q?.type === "identify_gate" && (
                  <h3 className="text-base font-semibold text-gray-900">Which gate matches the truth table?</h3>
                )}
              </div>

              {/* Choices */}
              {q?.type === "evaluate" && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {["0", "1"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelected(opt)}
                      className={`px-4 py-2 rounded-lg border text-center transition ${
                        selected === opt ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-blue-50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q?.type === "match" && (
                <div className="mb-4 text-sm text-gray-700">
                  Use the input toggles on the left, then press Check.
                </div>
              )}

              {q?.type === "identify_gate" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {q.options.map((op) => (
                    <button
                      key={op}
                      onClick={() => setSelected(op)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition ${
                        selected === op ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-blue-50"
                      }`}
                      title={`${GATES[op].sym}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        <span className="font-semibold">{op}</span>
                      </span>
                      <span className="font-mono text-sm opacity-80">{GATES[op].sym.replace(op + " ", "")}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSubmitAnswer()}
                  disabled={
                    q?.type === "evaluate" ? !selected : q?.type === "identify_gate" ? !selected : false
                  }
                  className={`px-4 py-2 rounded-md text-white ${
                    q?.type === "evaluate" || q?.type === "identify_gate"
                      ? selected
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {q?.type === "match" ? "Check" : "Submit"}
                </button>

                <button
                  onClick={usePeek}
                  disabled={!practice && peekLeft <= 0}
                  title={practice ? "Practice: unlimited peeks" : "Peek: reveal helpful info"}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                    practice || peekLeft > 0 ? "bg-white hover:bg-blue-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Peek ({peekDisplay})
                </button>

                <button
                  onClick={useSkip}
                  disabled={!practice && skipLeft <= 0}
                  title={practice ? "Practice: unlimited skips" : "Skip this question"}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                    practice || skipLeft > 0 ? "bg-white hover:bg-blue-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <SkipForward className="w-4 h-4" />
                  Skip ({skipDisplay})
                </button>

                <button
                  onClick={() => navigate("/student/games")}
                  className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-blue-50 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              {/* Message */}
              <div className="mt-3 text-sm text-gray-700 min-h-[1.25rem]">
                {practice ? (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <InfinityIcon className="w-3 h-3" />
                    Practice mode: unlimited time and lifelines; score is not submitted.
                  </span>
                ) : null}
                {message && <div className="mt-1">{message}</div>}
              </div>
            </>
          ) : finished ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Challenge Complete 🎉</h2>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border text-sm text-gray-700">
                  <Trophy className="w-4 h-4 text-yellow-600" />
                  Score: <span className="font-semibold">{score}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border text-sm text-gray-700">
                  <Timer className="w-4 h-4" />
                  {fmtTime(time)}
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {DIFFICULTY[difficulty].label} • {total} questions {practice ? "• Practice (not submitted)" : ""}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => startQuiz(difficulty, practice)}
                  className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Play Again
                </button>
                <button
                  onClick={() => setShowDiffModal(true)}
                  className="px-5 py-2 rounded-md border bg-white hover:bg-blue-50"
                >
                  Change Difficulty
                </button>
                <button
                  onClick={() => navigate("/student/games")}
                  className="px-5 py-2 rounded-md border bg-white hover:bg-blue-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
              {!practice && <div className="mt-3 text-xs text-green-600">Score submitted automatically.</div>}
              {practice && <div className="mt-3 text-xs text-gray-600">Practice mode: score was not submitted.</div>}
            </>
          ) : (
            <div className="text-sm text-gray-500">Pick a difficulty or enable practice to start.</div>
          )}
        </div>
      </div>

      {/* Difficulty + Practice modal */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="text-xl font-semibold text-gray-900">Start Logic Gate Puzzle</div>
            <div className="text-sm text-gray-600 mt-1">
              Each game is new and randomized. Practice mode gives unlimited time and lifelines; score is not submitted.
            </div>

            {/* Difficulty selector — keep backgrounds white/light as requested */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIFF_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => setDifficulty(k)}
                  className={`px-3 py-2 rounded-md border text-sm transition ${
                    difficulty === k
                      ? "bg-white border-blue-600 ring-2 ring-blue-200"
                      : "bg-white hover:bg-blue-50 border-gray-200"
                  }`}
                >
                  <div className="font-semibold capitalize text-gray-900">{k}</div>
                  <div className="text-[11px] text-gray-700 mt-0.5">{DIFFICULTY[k].label.replace(/^\w+\s/, "")}</div>
                </button>
              ))}
            </div>

            {/* Practice mode toggle */}
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

            <div className="mt-4 text-xs text-gray-600 space-y-1">
              <div>Easy (Grades 6–7): AND, OR, NOT • 2 inputs • shallow circuits</div>
              <div>Medium (Grades 8–9): + NAND, XOR • 2 inputs • medium depth</div>
              <div>Hard (Grades 10–11): + NOR, XNOR • 3 inputs • deeper circuits</div>
              <div>Difficult (Grade 12): all gates • 3 inputs • deepest circuits</div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => navigate("/student/games")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md border bg-white hover:bg-blue-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={() => startQuiz(difficulty, practice)}
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