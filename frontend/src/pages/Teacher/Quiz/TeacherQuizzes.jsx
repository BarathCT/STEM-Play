import { useEffect, useMemo, useRef, useState } from 'react';
import { authFetch } from '@/utils/auth';
import { BookOpenText, Plus, Trash2, Save, ListChecks, Sparkles, Eye, Loader2 } from 'lucide-react';

function QuestionEditor({ q, onChange, onDelete, idx }) {
  const [text, setText] = useState(q.text || '');
  const [options, setOptions] = useState(q.options?.length ? q.options : ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(
    typeof q.correctIndex === 'number' ? q.correctIndex : 0
  );

  useEffect(() => {
    onChange?.({ text, options, correctIndex });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, options, correctIndex]);

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Q{idx + 1}</div>
        <button type="button" className="text-red-600 inline-flex items-center gap-1 text-sm"
          onClick={onDelete}>
          <Trash2 className="w-4 h-4" /> Remove
        </button>
      </div>
      <input
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="Question text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <label key={i} className={`flex items-center gap-2 border rounded px-2 py-1 ${correctIndex === i ? 'bg-emerald-50 border-emerald-200' : ''}`}>
            <input
              type="radio"
              name={`correct-${idx}`}
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
            />
            <input
              className="flex-1 outline-none"
              value={opt}
              placeholder={`Option ${i + 1}`}
              onChange={(e) => {
                const next = options.slice();
                next[i] = e.target.value;
                setOptions(next);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

async function generateWithGemini({ title, content, count }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
  if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY');

  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = `Create exactly ${count} multiple-choice questions from the lesson below.
Return ONLY JSON (no backticks):
{
  "questions": [
    {"text":"...", "options":["A","B","C","D"], "correctIndex":0}
  ]
}
Lesson Title: ${title}
Content:
${content}`;

  const body = {
    generationConfig: {
      // response_mime_type is NOT supported on v1 generationConfig — remove it
      temperature: 0.6,
      maxOutputTokens: 2048,
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    let msg = `Gemini HTTP ${resp.status}`;
    try {
      const j = await resp.json();
      if (j?.error?.message) msg = j.error.message;
    } catch {}
    throw new Error(msg);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Be tolerant to models that still wrap JSON in text
  let obj = null;
  try {
    obj = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    obj = m ? JSON.parse(m[0]) : null;
  }

  if (!obj?.questions?.length) {
    throw new Error('No questions generated');
  }
  return obj.questions;
}

export default function TeacherQuizzes() {
  const [blogs, setBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [blogId, setBlogId] = useState('');
  const [blogPreview, setBlogPreview] = useState(null);

  const [mode, setMode] = useState('ai'); // 'ai' | 'manual'
  const [title, setTitle] = useState('');
  const [count, setCount] = useState(5);
  const [perQuestionSeconds, setPerQuestionSeconds] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [published, setPublished] = useState(true);

  const [questions, setQuestions] = useState([]);
  const [busyGen, setBusyGen] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [lbOpen, setLbOpen] = useState(false);
  const [lbRows, setLbRows] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  async function loadBlogs() {
    setLoadingBlogs(true);
    try {
      const res = await authFetch('/teacher/blogs');
      setBlogs(res.blogs || []);
    } catch (e) {
      setErr(e.message || 'Failed to load blogs');
    } finally {
      setLoadingBlogs(false);
    }
  }
  async function loadQuizzes() {
    setLoadingList(true);
    try {
      const res = await authFetch('/teacher/quizzes');
      setList(res.quizzes || []);
    } catch (e) {
      setErr(e.message || 'Failed to load quizzes');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadBlogs();
    loadQuizzes();
  }, []);

  async function onPickBlog(id) {
    setBlogId(id);
    setBlogPreview(null);
    setTitle('');
    if (!id) return;
    try {
      const { blog } = await authFetch(`/teacher/blogs/${id}`);
      setBlogPreview(blog);
      setTitle(blog.title || 'Untitled Quiz');
    } catch (e) {
      setErr(e.message);
    }
  }

  function addManualQuestion() {
    setQuestions((s) => [...s, { text: '', options: ['', '', '', ''], correctIndex: 0 }]);
  }
  function updateManualQuestion(idx, q) {
    const next = questions.slice();
    next[idx] = q;
    setQuestions(next);
  }
  function removeManualQuestion(idx) {
    const next = questions.slice();
    next.splice(idx, 1);
    setQuestions(next);
  }

  async function onGenerate() {
    setErr('');
    if (!blogPreview) { setErr('Select a blog first'); return; }
    setBusyGen(true);
    try {
      const contentText = JSON.stringify(blogPreview.content || {});
      const qs = await generateWithGemini({ title: blogPreview.title, content: contentText, count: Math.max(1, Number(count) || 5) });
      setQuestions(qs);
    } catch (e) {
      setErr(e.message || 'Generation failed');
    } finally {
      setBusyGen(false);
    }
  }

  async function onSave() {
    setErr('');
    setOk('');
    try {
      if (!title.trim()) { setErr('Title is required'); return; }
      if (!questions.length) { setErr('Add or generate at least one question'); return; }
      for (const q of questions) {
        if (!q.text?.trim()) throw new Error('Each question needs text');
        if (!Array.isArray(q.options) || q.options.length < 2) throw new Error('Each question needs >= 2 options');
        if (typeof q.correctIndex !== 'number') throw new Error('Each question needs a correct option');
      }
      await authFetch('/teacher/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          sourceBlogId: blogId || null,
          questions,
          perQuestionSeconds: Math.max(5, Number(perQuestionSeconds) || 30),
          maxAttemptsPerStudent: Math.max(1, Number(maxAttempts) || 1),
          published,
        }),
      });
      setOk('Quiz saved');
      setQuestions([]);
      setTitle('');
      setBlogId('');
      setBlogPreview(null);
      loadQuizzes();
      setTimeout(() => setOk(''), 1200);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function openLeaderboard(q) {
    setLbRows([]);
    setLbOpen(true);
    setLbLoading(true);
    try {
      const res = await authFetch(`/teacher/quizzes/${q.id}/leaderboard`);
      setLbRows(res.leaderboard || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLbLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Quizzes</h1>
      </div>

      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
      {ok && <div className="mb-3 text-sm text-emerald-700">{ok}</div>}

      {/* Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpenText className="w-4 h-4 text-blue-600" />
            <div className="font-semibold">Create quiz from a blog</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm text-gray-700 mb-1">Select Blog</div>
              <select
                value={blogId}
                onChange={(e) => onPickBlog(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">— Choose —</option>
                {blogs.map(b => (
                  <option key={b.id} value={b.id}>{b.title} ({b.subject})</option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-gray-700 mb-1">Quiz Title</div>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Backend Development Basics"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-700 mb-1">Questions to generate</div>
              <input
                type="number"
                min={1}
                max={20}
                className="w-full border rounded px-3 py-2 text-sm"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-700 mb-1">Seconds per question</div>
              <input
                type="number"
                min={5}
                max={600}
                className="w-full border rounded px-3 py-2 text-sm"
                value={perQuestionSeconds}
                onChange={(e) => setPerQuestionSeconds(e.target.value)}
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-700 mb-1">Max attempts per student</div>
              <input
                type="number"
                min={1}
                max={10}
                className="w-full border rounded px-3 py-2 text-sm"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              Published
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="inline-flex rounded-md overflow-hidden border">
              <button
                className={`px-3 py-1.5 text-sm ${mode === 'ai' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                onClick={() => setMode('ai')}
              >
                AI Generate
              </button>
              <button
                className={`px-3 py-1.5 text-sm ${mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                onClick={() => setMode('manual')}
              >
                Manual
              </button>
            </div>

            {mode === 'ai' && (
              <button
                type="button"
                onClick={onGenerate}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-violet-600 text-white text-sm hover:bg-violet-700"
                disabled={busyGen || !blogId}
                title={!blogId ? 'Select a blog first' : 'Generate with AI'}
              >
                {busyGen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate
              </button>
            )}
            {mode === 'manual' && (
              <button
                type="button"
                onClick={addManualQuestion}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            )}

            <button
              type="button"
              onClick={onSave}
              className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save Quiz
            </button>
          </div>

          {/* Questions editor */}
          <div className="mt-4 space-y-3">
            {questions.map((q, i) => (
              <QuestionEditor
                key={i}
                q={q}
                idx={i}
                onChange={(qq) => updateManualQuestion(i, qq)}
                onDelete={() => removeManualQuestion(i)}
              />
            ))}
            {!questions.length && (
              <div className="text-sm text-gray-500">No questions yet. Use AI Generate or add manually.</div>
            )}
          </div>
        </div>

        {/* Blog preview card */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm font-semibold mb-2">Blog preview</div>
          {loadingBlogs ? (
            <div className="text-gray-500 text-sm">Loading blogs…</div>
          ) : !blogPreview ? (
            <div className="text-sm text-gray-500">Select a blog to preview its title and summary.</div>
          ) : (
            <div className="text-sm">
              <div className="font-semibold">{blogPreview.title}</div>
              <div className="text-xs text-gray-500">{blogPreview.subject}</div>
              <div className="mt-2">{blogPreview.summary || '—'}</div>
              <div className="mt-2 text-xs text-gray-500">Questions: {questions.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* Existing quizzes */}
      <div className="mt-6 bg-white border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-4 h-4 text-blue-600" />
          <div className="font-semibold">Your quizzes</div>
        </div>
        {loadingList ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : !list.length ? (
          <div className="text-sm text-gray-500">No quizzes yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map(q => (
              <div key={q.id} className="border rounded-lg p-3">
                <div className="text-sm font-semibold">{q.title}</div>
                <div className="text-xs text-gray-500">
                  {q.questionsCount} Q • {q.perQuestionSeconds}s • attempts {q.maxAttemptsPerStudent} • {q.published ? 'Published' : 'Draft'}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border"
                    onClick={() => openLeaderboard(q)}
                    title="View leaderboard"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Leaderboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard modal */}
      {lbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setLbOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative bg-white border rounded-lg w-full max-w-xl mx-4 shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-base font-semibold">Leaderboard</div>
              <button onClick={() => setLbOpen(false)} className="text-gray-500">✕</button>
            </div>
            {lbLoading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : !lbRows.length ? (
              <div className="text-sm text-gray-500">No attempts yet.</div>
            ) : (
              <div className="text-sm">
                <div className="grid grid-cols-4 font-semibold border-b py-1">
                  <div>#</div><div className="col-span-2">Student</div><div>Points</div>
                </div>
                {lbRows.map(r => (
                  <div key={r.studentId} className="grid grid-cols-4 py-1 border-b last:border-b-0">
                    <div>{r.rank}</div>
                    <div className="col-span-2">{r.name}</div>
                    <div>{r.bestPoints}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-right">
              <button className="px-3 py-1.5 border rounded" onClick={() => setLbOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}