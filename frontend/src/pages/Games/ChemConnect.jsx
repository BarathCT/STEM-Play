import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "@/utils/auth";
import {
  Atom,
  Trophy,
  Clock,
  Zap,
  Scissors,
  SkipForward,
  ArrowLeft,
  HelpCircle,
} from "lucide-react";

/**
 * ChemConnect
 * - Full periodic table preview (all 118 elements)
 * - Randomized, varied question types each session (no fixed order/format)
 * - Difficulty: easy / medium / hard (controls question count, options per Q, time per Q, lifelines)
 * - Lifelines: 50/50 and Skip (by difficulty)
 * - Streak multiplier + speed bonus scoring
 * - No manual save; score auto-submits to leaderboard when the game finishes
 * - "New Set" button removed to avoid interrupting flow
 */

// ---------- Data: Elements (1..118) ----------
const ELEMENTS = [
  { num: 1, symbol: "H", name: "Hydrogen", category: "Nonmetal" },
  { num: 2, symbol: "He", name: "Helium", category: "Noble Gas" },
  { num: 3, symbol: "Li", name: "Lithium", category: "Alkali Metal" },
  { num: 4, symbol: "Be", name: "Beryllium", category: "Alkaline Earth Metal" },
  { num: 5, symbol: "B", name: "Boron", category: "Metalloid" },
  { num: 6, symbol: "C", name: "Carbon", category: "Nonmetal" },
  { num: 7, symbol: "N", name: "Nitrogen", category: "Nonmetal" },
  { num: 8, symbol: "O", name: "Oxygen", category: "Nonmetal" },
  { num: 9, symbol: "F", name: "Fluorine", category: "Halogen" },
  { num: 10, symbol: "Ne", name: "Neon", category: "Noble Gas" },
  { num: 11, symbol: "Na", name: "Sodium", category: "Alkali Metal" },
  { num: 12, symbol: "Mg", name: "Magnesium", category: "Alkaline Earth Metal" },
  { num: 13, symbol: "Al", name: "Aluminium", category: "Post-transition Metal" },
  { num: 14, symbol: "Si", name: "Silicon", category: "Metalloid" },
  { num: 15, symbol: "P", name: "Phosphorus", category: "Nonmetal" },
  { num: 16, symbol: "S", name: "Sulfur", category: "Nonmetal" },
  { num: 17, symbol: "Cl", name: "Chlorine", category: "Halogen" },
  { num: 18, symbol: "Ar", name: "Argon", category: "Noble Gas" },
  { num: 19, symbol: "K", name: "Potassium", category: "Alkali Metal" },
  { num: 20, symbol: "Ca", name: "Calcium", category: "Alkaline Earth Metal" },
  { num: 21, symbol: "Sc", name: "Scandium", category: "Transition Metal" },
  { num: 22, symbol: "Ti", name: "Titanium", category: "Transition Metal" },
  { num: 23, symbol: "V", name: "Vanadium", category: "Transition Metal" },
  { num: 24, symbol: "Cr", name: "Chromium", category: "Transition Metal" },
  { num: 25, symbol: "Mn", name: "Manganese", category: "Transition Metal" },
  { num: 26, symbol: "Fe", name: "Iron", category: "Transition Metal" },
  { num: 27, symbol: "Co", name: "Cobalt", category: "Transition Metal" },
  { num: 28, symbol: "Ni", name: "Nickel", category: "Transition Metal" },
  { num: 29, symbol: "Cu", name: "Copper", category: "Transition Metal" },
  { num: 30, symbol: "Zn", name: "Zinc", category: "Transition Metal" },
  { num: 31, symbol: "Ga", name: "Gallium", category: "Post-transition Metal" },
  { num: 32, symbol: "Ge", name: "Germanium", category: "Metalloid" },
  { num: 33, symbol: "As", name: "Arsenic", category: "Metalloid" },
  { num: 34, symbol: "Se", name: "Selenium", category: "Nonmetal" },
  { num: 35, symbol: "Br", name: "Bromine", category: "Halogen" },
  { num: 36, symbol: "Kr", name: "Krypton", category: "Noble Gas" },
  { num: 37, symbol: "Rb", name: "Rubidium", category: "Alkali Metal" },
  { num: 38, symbol: "Sr", name: "Strontium", category: "Alkaline Earth Metal" },
  { num: 39, symbol: "Y", name: "Yttrium", category: "Transition Metal" },
  { num: 40, symbol: "Zr", name: "Zirconium", category: "Transition Metal" },
  { num: 41, symbol: "Nb", name: "Niobium", category: "Transition Metal" },
  { num: 42, symbol: "Mo", name: "Molybdenum", category: "Transition Metal" },
  { num: 43, symbol: "Tc", name: "Technetium", category: "Transition Metal" },
  { num: 44, symbol: "Ru", name: "Ruthenium", category: "Transition Metal" },
  { num: 45, symbol: "Rh", name: "Rhodium", category: "Transition Metal" },
  { num: 46, symbol: "Pd", name: "Palladium", category: "Transition Metal" },
  { num: 47, symbol: "Ag", name: "Silver", category: "Transition Metal" },
  { num: 48, symbol: "Cd", name: "Cadmium", category: "Transition Metal" },
  { num: 49, symbol: "In", name: "Indium", category: "Post-transition Metal" },
  { num: 50, symbol: "Sn", name: "Tin", category: "Post-transition Metal" },
  { num: 51, symbol: "Sb", name: "Antimony", category: "Metalloid" },
  { num: 52, symbol: "Te", name: "Tellurium", category: "Metalloid" },
  { num: 53, symbol: "I", name: "Iodine", category: "Halogen" },
  { num: 54, symbol: "Xe", name: "Xenon", category: "Noble Gas" },
  { num: 55, symbol: "Cs", name: "Cesium", category: "Alkali Metal" },
  { num: 56, symbol: "Ba", name: "Barium", category: "Alkaline Earth Metal" },
  { num: 57, symbol: "La", name: "Lanthanum", category: "Lanthanide" },
  { num: 58, symbol: "Ce", name: "Cerium", category: "Lanthanide" },
  { num: 59, symbol: "Pr", name: "Praseodymium", category: "Lanthanide" },
  { num: 60, symbol: "Nd", name: "Neodymium", category: "Lanthanide" },
  { num: 61, symbol: "Pm", name: "Promethium", category: "Lanthanide" },
  { num: 62, symbol: "Sm", name: "Samarium", category: "Lanthanide" },
  { num: 63, symbol: "Eu", name: "Europium", category: "Lanthanide" },
  { num: 64, symbol: "Gd", name: "Gadolinium", category: "Lanthanide" },
  { num: 65, symbol: "Tb", name: "Terbium", category: "Lanthanide" },
  { num: 66, symbol: "Dy", name: "Dysprosium", category: "Lanthanide" },
  { num: 67, symbol: "Ho", name: "Holmium", category: "Lanthanide" },
  { num: 68, symbol: "Er", name: "Erbium", category: "Lanthanide" },
  { num: 69, symbol: "Tm", name: "Thulium", category: "Lanthanide" },
  { num: 70, symbol: "Yb", name: "Ytterbium", category: "Lanthanide" },
  { num: 71, symbol: "Lu", name: "Lutetium", category: "Lanthanide" },
  { num: 72, symbol: "Hf", name: "Hafnium", category: "Transition Metal" },
  { num: 73, symbol: "Ta", name: "Tantalum", category: "Transition Metal" },
  { num: 74, symbol: "W", name: "Tungsten", category: "Transition Metal" },
  { num: 75, symbol: "Re", name: "Rhenium", category: "Transition Metal" },
  { num: 76, symbol: "Os", name: "Osmium", category: "Transition Metal" },
  { num: 77, symbol: "Ir", name: "Iridium", category: "Transition Metal" },
  { num: 78, symbol: "Pt", name: "Platinum", category: "Transition Metal" },
  { num: 79, symbol: "Au", name: "Gold", category: "Transition Metal" },
  { num: 80, symbol: "Hg", name: "Mercury", category: "Post-transition Metal" },
  { num: 81, symbol: "Tl", name: "Thallium", category: "Post-transition Metal" },
  { num: 82, symbol: "Pb", name: "Lead", category: "Post-transition Metal" },
  { num: 83, symbol: "Bi", name: "Bismuth", category: "Post-transition Metal" },
  { num: 84, symbol: "Po", name: "Polonium", category: "Metalloid" },
  { num: 85, symbol: "At", name: "Astatine", category: "Halogen" },
  { num: 86, symbol: "Rn", name: "Radon", category: "Noble Gas" },
  { num: 87, symbol: "Fr", name: "Francium", category: "Alkali Metal" },
  { num: 88, symbol: "Ra", name: "Radium", category: "Alkaline Earth Metal" },
  { num: 89, symbol: "Ac", name: "Actinium", category: "Actinide" },
  { num: 90, symbol: "Th", name: "Thorium", category: "Actinide" },
  { num: 91, symbol: "Pa", name: "Protactinium", category: "Actinide" },
  { num: 92, symbol: "U", name: "Uranium", category: "Actinide" },
  { num: 93, symbol: "Np", name: "Neptunium", category: "Actinide" },
  { num: 94, symbol: "Pu", name: "Plutonium", category: "Actinide" },
  { num: 95, symbol: "Am", name: "Americium", category: "Actinide" },
  { num: 96, symbol: "Cm", name: "Curium", category: "Actinide" },
  { num: 97, symbol: "Bk", name: "Berkelium", category: "Actinide" },
  { num: 98, symbol: "Cf", name: "Californium", category: "Actinide" },
  { num: 99, symbol: "Es", name: "Einsteinium", category: "Actinide" },
  { num: 100, symbol: "Fm", name: "Fermium", category: "Actinide" },
  { num: 101, symbol: "Md", name: "Mendelevium", category: "Actinide" },
  { num: 102, symbol: "No", name: "Nobelium", category: "Actinide" },
  { num: 103, symbol: "Lr", name: "Lawrencium", category: "Actinide" },
  { num: 104, symbol: "Rf", name: "Rutherfordium", category: "Transition Metal" },
  { num: 105, symbol: "Db", name: "Dubnium", category: "Transition Metal" },
  { num: 106, symbol: "Sg", name: "Seaborgium", category: "Transition Metal" },
  { num: 107, symbol: "Bh", name: "Bohrium", category: "Transition Metal" },
  { num: 108, symbol: "Hs", name: "Hassium", category: "Transition Metal" },
  { num: 109, symbol: "Mt", name: "Meitnerium", category: "Transition Metal" },
  { num: 110, symbol: "Ds", name: "Darmstadtium", category: "Transition Metal" },
  { num: 111, symbol: "Rg", name: "Roentgenium", category: "Transition Metal" },
  { num: 112, symbol: "Cn", name: "Copernicium", category: "Transition Metal" },
  { num: 113, symbol: "Nh", name: "Nihonium", category: "Post-transition Metal" },
  { num: 114, symbol: "Fl", name: "Flerovium", category: "Post-transition Metal" },
  { num: 115, symbol: "Mc", name: "Moscovium", category: "Post-transition Metal" },
  { num: 116, symbol: "Lv", name: "Livermorium", category: "Post-transition Metal" },
  { num: 117, symbol: "Ts", name: "Tennessine", category: "Halogen" },
  { num: 118, symbol: "Og", name: "Oganesson", category: "Noble Gas" },
];

const CATEGORIES = [
  "Nonmetal",
  "Noble Gas",
  "Alkali Metal",
  "Alkaline Earth Metal",
  "Halogen",
  "Metalloid",
  "Post-transition Metal",
  "Transition Metal",
  "Lanthanide",
  "Actinide",
];

// ---------- Utils ----------
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtTime = (sec) => {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
};

// ---------- Difficulty ----------
const DIFFICULTY = {
  easy: {
    questions: 10,
    options: 3,
    timePerQ: 20,
    lifelines: { fifty: 1, skip: 1 },
    ref: "easy",
    mult: 0.9,
  },
  medium: {
    questions: 14,
    options: 4,
    timePerQ: 15,
    lifelines: { fifty: 1, skip: 1 },
    ref: "medium",
    mult: 1.0,
  },
  hard: {
    questions: 18,
    options: 4,
    timePerQ: 10,
    lifelines: { fifty: 1, skip: 0 },
    ref: "hard",
    mult: 1.2,
  },
};
const DIFF_KEYS = ["easy", "medium", "hard"];

// ---------- Question Generator ----------
/*
  Types:
  - num_to_name: "Which element has atomic number X?" -> options: names
  - name_to_symbol: "What is the symbol for NAME?" -> options: symbols
  - symbol_to_name: "Which element has symbol SYM?" -> options: names
  - name_to_category: "Which group/category does NAME belong to?" -> options: category strings
  - name_to_num: "What is the atomic number of NAME?" -> options: numbers
  - category_pick: "Which of the following is a Noble Gas?" -> options: names
*/
function makeQuestion(type, cfg) {
  if (type === "category_pick") {
    const cat = sample(CATEGORIES);
    const valid = ELEMENTS.filter((e) => e.category === cat);
    const correctEl = sample(valid);
    const wrongEls = shuffle(ELEMENTS.filter((e) => e.category !== cat));
    const answers = [correctEl.name, ...wrongEls.slice(0, cfg.options - 1).map((e) => e.name)];
    return {
      q: `Which of the following is a ${cat}?`,
      options: shuffle(answers),
      answer: correctEl.name,
    };
  }

  const el = sample(ELEMENTS);

  switch (type) {
    case "num_to_name": {
      const correct = el.name;
      const others = shuffle(ELEMENTS.filter((e) => e.name !== correct).map((e) => e.name));
      return {
        q: `Which element has atomic number ${el.num}?`,
        options: shuffle([correct, ...others.slice(0, cfg.options - 1)]),
        answer: correct,
      };
    }
    case "name_to_symbol": {
      const correct = el.symbol;
      const others = shuffle(ELEMENTS.filter((e) => e.symbol !== correct).map((e) => e.symbol));
      return {
        q: `What is the symbol of ${el.name}?`,
        options: shuffle([correct, ...others.slice(0, cfg.options - 1)]),
        answer: correct,
      };
    }
    case "symbol_to_name": {
      const correct = el.name;
      const others = shuffle(ELEMENTS.filter((e) => e.name !== correct).map((e) => e.name));
      return {
        q: `Which element has the symbol ${el.symbol}?`,
        options: shuffle([correct, ...others.slice(0, cfg.options - 1)]),
        answer: correct,
      };
    }
    case "name_to_category": {
      const correct = el.category;
      const others = shuffle(CATEGORIES.filter((c) => c !== correct));
      return {
        q: `Which group/category does ${el.name} belong to?`,
        options: shuffle([correct, ...others.slice(0, cfg.options - 1)]),
        answer: correct,
      };
    }
    case "name_to_num": {
      const correct = String(el.num);
      const pool = ELEMENTS.map((e) => e.num).filter((n) => n !== el.num);
      const others = shuffle(pool).map(String);
      return {
        q: `What is the atomic number of ${el.name}?`,
        options: shuffle([correct, ...others.slice(0, cfg.options - 1)]),
        answer: correct,
      };
    }
    default:
      return makeQuestion("num_to_name", cfg);
  }
}

function generateQuiz(dKey) {
  const cfg = DIFFICULTY[dKey];
  const types = ["num_to_name", "name_to_symbol", "symbol_to_name", "name_to_category", "name_to_num", "category_pick"];
  const qs = [];
  for (let i = 0; i < cfg.questions; i++) {
    const t = types[i % types.length];
    qs.push(makeQuestion(t, cfg));
  }
  return shuffle(qs).map((q) => ({ ...q, options: shuffle(q.options) }));
}

// ---------- Component ----------
export default function ChemConnect() {
  const navigate = useNavigate();

  // Modal
  const [showDiffModal, setShowDiffModal] = useState(true);
  const [difficulty, setDifficulty] = useState("easy");
  const cfg = DIFFICULTY[difficulty];

  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);

  // Lifelines
  const [fiftyLeft, setFiftyLeft] = useState(0);
  const [skipLeft, setSkipLeft] = useState(0);

  // Timers
  const [time, setTime] = useState(0);
  const [qTime, setQTime] = useState(cfg.timePerQ);
  const totalTimerRef = useRef(null);
  const qTimerRef = useRef(null);

  const [message, setMessage] = useState("");
  const submittedRef = useRef(false);

  function startQuiz(dKey) {
    const qs = generateQuiz(dKey);
    setQuestions(qs);
    setCurrent(0);
    setSelected("");
    setScore(0);
    setStreak(0);
    setFinished(false);
    setFiftyLeft(DIFFICULTY[dKey].lifelines.fifty);
    setSkipLeft(DIFFICULTY[dKey].lifelines.skip);
    setTime(0);
    setQTime(DIFFICULTY[dKey].timePerQ);
    setMessage("");
    submittedRef.current = false;
    setShowDiffModal(false);
  }

  // Total timer
  useEffect(() => {
    if (!showDiffModal && !finished) {
      totalTimerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [showDiffModal, finished]);

  // Per-question timer
  useEffect(() => {
    if (showDiffModal || finished || !questions.length) return;
    setQTime(cfg.timePerQ);
    if (qTimerRef.current) clearInterval(qTimerRef.current);
    qTimerRef.current = setInterval(() => {
      setQTime((t) => {
        if (t <= 1) {
          clearInterval(qTimerRef.current);
          handleSubmitAnswer(null, true); // timeout
          return cfg.timePerQ;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (qTimerRef.current) clearInterval(qTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, questions.length, showDiffModal, finished, cfg.timePerQ]);

  function handleSubmitAnswer(choice = selected, timedOut = false) {
    if (finished || !questions.length) return;
    const q = questions[current];
    const isCorrect = choice === q.answer;

    const base = 100;
    const speedBonus = Math.max(0, Math.floor((qTime / cfg.timePerQ) * 50));
    const newStreak = isCorrect ? streak + 1 : 0;
    const streakMult = 1 + newStreak * 0.1;
    const gained = isCorrect ? Math.round((base + speedBonus) * cfg.mult * streakMult) : 0;

    setScore((s) => s + gained);
    setStreak(newStreak);
    setMessage(
      isCorrect
        ? `Correct! +${gained} (base ${base}, speed +${speedBonus}, diff x${cfg.mult.toFixed(2)}, streak x${streakMult.toFixed(2)})`
        : timedOut
        ? "Time's up!"
        : "Incorrect."
    );

    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setSelected("");
    } else {
      setFinished(true);
      if (qTimerRef.current) clearInterval(qTimerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      autoSubmitScore("finished");
    }
  }

  function useFifty() {
    if (fiftyLeft <= 0) return;
    const q = questions[current];
    const wrongs = q.options.filter((o) => o !== q.answer);
    const remove = shuffle(wrongs).slice(0, Math.max(0, q.options.length - 2));
    const newOptions = q.options.filter((o) => !remove.includes(o));
    const newQs = questions.slice();
    newQs[current] = { ...q, options: newOptions };
    setFiftyLeft((n) => n - 1);
    setMessage("50/50 used: two wrong options removed.");
    setQuestions(newQs);
  }

  function useSkip() {
    if (skipLeft <= 0) return;
    setSkipLeft((n) => n - 1);
    setMessage("Question skipped.");
    setStreak(0);
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setSelected("");
    } else {
      setFinished(true);
      if (qTimerRef.current) clearInterval(qTimerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      autoSubmitScore("finished");
    }
  }

  // Auto-submit score ONLY when finished (per request)
  async function autoSubmitScore(outcome) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      await authFetch("/student/leaderboard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "game",
          ref: `chemconnect-${cfg.ref}`,
          points: score,
          meta: {
            difficulty,
            score,
            answered: questions.length,
            total: questions.length,
            time,
            outcome,
          },
        }),
      });
      setMessage((m) => (m ? `${m} • Score submitted` : "Score submitted"));
    } catch {
      // ignore network error
    }
  }

  const total = questions.length;
  const progress = total ? Math.round((current / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 text-gray-900">
          <Atom className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">ChemConnect</h1>
        </div>
        <p className="text-sm text-gray-600">
          Full periodic table preview • Fresh randomized questions • Auto-submit to leaderboard when you finish
        </p>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Full periodic table preview (responsive) */}
        <div className="bg-white border rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
              <Atom className="w-4 h-4 text-blue-600" />
              Periodic Table — All Elements
            </div>
            <div className="text-xs text-gray-500">Reference</div>
          </div>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
            }}
          >
            {ELEMENTS.map((el) => (
              <div
                key={el.num}
                className="border border-gray-200 rounded-md p-2 text-center bg-white hover:bg-gray-50 transition-colors"
                title={`${el.name} • ${el.category}`}
              >
                <div className="text-[10px] text-gray-500">{el.num}</div>
                <div className="text-base font-bold text-gray-900">{el.symbol}</div>
                <div className="text-[10px] text-gray-500 truncate">{el.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quiz card */}
        <div className="bg-white border rounded-2xl shadow-sm p-6">
          {!finished && total > 0 ? (
            <>
              {/* Top stats */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border text-sm text-gray-700">
                  <Clock className="w-4 h-4" />
                  {fmtTime(time)}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border text-sm text-gray-700">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  Streak: <span className="font-semibold">{streak}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border text-sm text-gray-700">
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
                    className="h-1.5 bg-emerald-500 transition-all"
                    style={{ width: `${(qTime / cfg.timePerQ) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="flex items-start gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <h3 className="text-base font-semibold text-gray-900">{questions[current].q}</h3>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {questions[current].options.map((opt, i) => {
                  const isSelected = selected === opt;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(opt)}
                      className={`px-4 py-2 rounded-lg border text-left transition ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white hover:bg-gray-50 border-gray-200 text-gray-800"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Actions (New Set removed) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSubmitAnswer()}
                  disabled={!selected}
                  className={`px-4 py-2 rounded-md text-white ${
                    selected ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Submit
                </button>

                <button
                  onClick={useFifty}
                  disabled={fiftyLeft <= 0}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                    fiftyLeft > 0 ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  title="50/50: remove two wrong options"
                >
                  <Scissors className="w-4 h-4" />
                  50/50 ({fiftyLeft})
                </button>

                <button
                  onClick={useSkip}
                  disabled={skipLeft <= 0}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                    skipLeft > 0 ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  title="Skip question"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip ({skipLeft})
                </button>

                <button
                  onClick={() => navigate("/student/games")}
                  className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              {/* Message */}
              <div className="mt-3 text-sm text-gray-700">{message}</div>
            </>
          ) : finished ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete 🎉</h2>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border text-sm text-gray-700">
                  <Trophy className="w-4 h-4 text-yellow-600" />
                  Score: <span className="font-semibold">{score}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border text-sm text-gray-700">
                  <Clock className="w-4 h-4" />
                  {fmtTime(time)}
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-4">
                Difficulty: <span className="font-semibold capitalize">{difficulty}</span> • {total} questions
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => startQuiz(difficulty)}
                  className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Play Again
                </button>
                <button
                  onClick={() => setShowDiffModal(true)}
                  className="px-5 py-2 rounded-md border bg-white hover:bg-gray-50"
                >
                  Change Difficulty
                </button>
                <button
                  onClick={() => navigate("/student/games")}
                  className="px-5 py-2 rounded-md border bg-white hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
              <div className="mt-3 text-xs text-green-600">Score submitted automatically.</div>
            </>
          ) : (
            <div className="text-sm text-gray-500">Pick a difficulty to start.</div>
          )}
        </div>
      </div>

      {/* Difficulty modal */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="text-xl font-semibold text-gray-900">Start ChemConnect</div>
            <div className="text-sm text-gray-600 mt-1">
              A fresh randomized quiz is generated every time. Scores auto-submit when you complete the game.
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {DIFF_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => setDifficulty(k)}
                  className={`px-3 py-2 rounded-md border text-sm capitalize transition ${
                    difficulty === k ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs text-gray-600 space-y-1">
              <div>
                • Easy: {DIFFICULTY.easy.questions} Qs, {DIFFICULTY.easy.options} options, {DIFFICULTY.easy.timePerQ}s each, lifelines 50/50×{DIFFICULTY.easy.lifelines.fifty}, skip×{DIFFICULTY.easy.lifelines.skip}
              </div>
              <div>
                • Medium: {DIFFICULTY.medium.questions} Qs, {DIFFICULTY.medium.options} options, {DIFFICULTY.medium.timePerQ}s each, lifelines 50/50×{DIFFICULTY.medium.lifelines.fifty}, skip×{DIFFICULTY.medium.lifelines.skip}
              </div>
              <div>
                • Hard: {DIFFICULTY.hard.questions} Qs, {DIFFICULTY.hard.options} options, {DIFFICULTY.hard.timePerQ}s each, lifelines 50/50×{DIFFICULTY.hard.lifelines.fifty}, skip×{DIFFICULTY.hard.lifelines.skip}
              </div>
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
                onClick={() => startQuiz(difficulty)}
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