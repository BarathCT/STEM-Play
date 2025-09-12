import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '@/utils/auth';
import { Timer, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function QuizPlay() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [quiz, setQuiz] = useState(null);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]); // {questionIndex, selectedIndex, timeTakenSec}
  const [secLeft, setSecLeft] = useState(0);
  const timerRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await authFetch(`/student/quizzes/${id}`);
        if (!alive) return;
        if (res.quiz.attemptsUsed >= res.quiz.maxAttemptsPerStudent) {
          setErr('No attempts left for this quiz.');
        } else {
          setQuiz(res.quiz);
          setIdx(0);
          setAnswers([]);
        }
      } catch (e) {
        setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; stopTimer(); };
  }, [id]);

  const q = useMemo(() => quiz?.questions?.[idx] || null, [quiz, idx]);

  useEffect(() => {
    if (!q || !quiz) return;
    setSecLeft(quiz.perQuestionSeconds);
    stopTimer();
    timerRef.current = setInterval(() => {
      setSecLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          // auto move with no answer selected -> treat as wrong with full time used
          recordAnswer(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function recordAnswer(selectedIndex) {
    const timeTaken = (quiz?.perQuestionSeconds || 0) - secLeft;
    const entry = {
      questionIndex: idx,
      selectedIndex: selectedIndex ?? -1, // -1 means no answer selected
      timeTakenSec: Math.max(0, timeTaken),
    };
    const next = [...answers, entry];
    setAnswers(next);
    const nextIdx = idx + 1;
    if (nextIdx < (quiz?.questions?.length || 0)) {
      setIdx(nextIdx);
    } else {
      // submit
      submit(next);
    }
  }

  async function submit(arr) {
    setSubmitting(true);
    setErr('');
    try {
      // normalize: server expects indexes valid; map -1 -> 999 so it's wrong
      const fixed = arr.map(a => ({
        questionIndex: a.questionIndex,
        selectedIndex: a.selectedIndex >= 0 ? a.selectedIndex : 999,
        timeTakenSec: a.timeTakenSec,
      }));
      const res = await authFetch(`/student/quizzes/${id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: fixed }),
      });
      setResult(res.attempt);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-500">Loading…</div>;
  if (err) return (
    <div className="max-w-xl mx-auto px-4 py-10 text-center">
      <div className="text-red-600 mb-3">{err}</div>
      <button className="px-4 py-2 border rounded" onClick={() => nav(-1)}>Back</button>
    </div>
  );

  if (!quiz) return null;

  if (result) {
    const totalQ = quiz.questions.length;
    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-white border rounded-lg p-5 text-center">
          <div className="text-xl font-semibold mb-2">Quiz Finished</div>
          <div className="text-sm text-gray-700 mb-4">{result.correctCount} / {totalQ} correct</div>
          <div className="text-2xl font-bold text-emerald-700 mb-4">{result.totalPoints} points</div>
          <button className="px-4 py-2 border rounded" onClick={() => nav('/student/quizzes')}>Back to quizzes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="bg-white border rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{quiz.title}</div>
          <div className="inline-flex items-center gap-2 text-sm">
            <Timer className="w-4 h-4 text-blue-600" />
            <div>{secLeft}s</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm text-gray-600">Question {idx + 1} / {quiz.questions.length}</div>
          <div className="mt-2 text-base font-medium">{q.text}</div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {q.options.map((opt, i) => (
              <button key={i}
                onClick={() => { stopTimer(); recordAnswer(i); }}
                className="px-3 py-2 rounded border hover:bg-gray-50 text-left"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">Answer quickly to score more points.</div>
          <button
            onClick={() => { stopTimer(); recordAnswer(null); }}
            className="px-3 py-1.5 text-xs rounded border"
          >
            Skip
          </button>
        </div>
      </div>

      {submitting && (
        <div className="mt-4 text-center text-sm text-gray-600 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
        </div>
      )}
    </div>
  );
}