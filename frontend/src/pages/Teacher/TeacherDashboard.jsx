import React, { useState } from "react";

/**
 * Read and validate env values from Vite.
 * Returns null if missing, blank, or the literal "undefined"/"null".
 */
function getEnv(key) {
  const v = import.meta.env?.[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return null;
  return t;
}

// Pick models via .env or fall back to safe defaults.
const GROQ_MODEL = getEnv("VITE_GROQ_MODEL") || "llama-3.1-8b-instant";
const GEMINI_MODEL = getEnv("VITE_GEMINI_MODEL") || "gemini-1.5-flash";

export default function TeacherDashboard() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ytLink, setYtLink] = useState("");
  const [blogLink, setBlogLink] = useState("");
  const [quizMode, setQuizMode] = useState("ai");
  const [manualQuestions, setManualQuestions] = useState([]);
  const [tempQ, setTempQ] = useState({ question: "", choices: ["", "", "", ""], answerIndex: 0 });
  const [generatedQuiz, setGeneratedQuiz] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  function validate() {
    setError("");
    if (!title.trim()) return "Content title is required.";
    if (!content.trim()) return "Content text is required.";
    if (quizMode === "manual" && manualQuestions.length === 0)
      return "Add at least one manual question or switch to AI generation.";
    return "";
  }

  function handleAddManualQuestion() {
    if (!tempQ.question.trim()) {
      setError("Question text is required to add.");
      return;
    }
    const cleanChoices = tempQ.choices.map((c) => c.trim()).filter((c) => c);
    if (cleanChoices.length < 2) {
      setError("Provide at least two choices.");
      return;
    }
    const q = { ...tempQ, choices: cleanChoices };
    setManualQuestions((s) => [...s, q].slice(0, 10)); // max 10 questions
    setTempQ({ question: "", choices: ["", "", "", ""], answerIndex: 0 });
    setError("");
  }

  function handleRemoveManualQuestion(idx) {
    setManualQuestions((s) => s.filter((_, i) => i !== idx));
  }

  async function generateQuizWithAI() {
    setError("");
    setSuccess("");
    setIsGenerating(true);

    if (!content.trim()) {
      setError("Provide content text to generate a quiz.");
      setIsGenerating(false);
      return;
    }

    try {
      // Try Groq first
      await generateQuizWithGroq();
    } catch (groqError) {
      console.error("Groq API failed, trying Gemini:", groqError);
      // Fallback to Gemini
      try {
        await generateQuizWithGemini();
      } catch (geminiError) {
        console.error("Gemini API also failed:", geminiError);
        setError(
          (groqError?.message || "Groq failed.") +
            " | " +
            (geminiError?.message || "Gemini failed.") +
            " | Please verify API keys and models in your .env, then restart the dev server."
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }

  // Normalize various possible responses into our expected shape.
  function normalizeQuiz(obj) {
    // Expected: { questions: [{ question, options, correctAnswer }] }
    if (!obj) return [];
    if (Array.isArray(obj.questions)) {
      return obj.questions.map((q) => ({
        question: q.question || q.text || "",
        options: q.options || q.choices || [],
        correctAnswer:
          typeof q.correctAnswer === "number"
            ? q.correctAnswer
            : typeof q.answerIndex === "number"
            ? q.answerIndex
            : 0,
      }));
    }
    // Some models might return an array directly
    if (Array.isArray(obj)) {
      return obj.map((q) => ({
        question: q.question || q.text || "",
        options: q.options || q.choices || [],
        correctAnswer:
          typeof q.correctAnswer === "number"
            ? q.correctAnswer
            : typeof q.answerIndex === "number"
            ? q.answerIndex
            : 0,
      }));
    }
    return [];
  }

  function extractJson(text) {
    // First, try direct JSON parse (when model returns pure JSON)
    try {
      return JSON.parse(text);
    } catch (_) {
      // Then try to extract a JSON object fragment
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (_) {
          // Try array fragment
          const arrMatch = text.match(/\[[\s\S]*\]/);
          if (arrMatch) {
            try {
              return JSON.parse(arrMatch[0]);
            } catch (_) {
              return null;
            }
          }
          return null;
        }
      }
      // Lastly, try array only
      const arrMatch = text.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try {
          return JSON.parse(arrMatch[0]);
        } catch (_) {
          return null;
        }
      }
      return null;
    }
  }

  async function generateQuizWithGroq() {
    const apiKey = getEnv("VITE_GROQ_API_KEY");
    if (!apiKey) {
      throw new Error("Groq API key not configured (VITE_GROQ_API_KEY).");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL, // e.g., "llama-3.1-8b-instant" or "llama-3.1-70b-versatile"
        messages: [
          {
            role: "system",
            content:
              "You are a quiz generator. Return ONLY JSON matching the specified schema. Do not include any extra text or code fences.",
          },
          {
            role: "user",
            content: `Generate exactly 5 multiple-choice quiz questions based on the following content.
For each question, provide 4 options and indicate the correct answer as a zero-based index.
Return ONLY JSON with this structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0
    }
  ]
}
Content:
${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData?.error?.message ||
        `Groq API request failed with status ${response.status} (${response.statusText})`;
      throw new Error(msg);
    }

    const data = await response.json();
    const responseText = data?.choices?.[0]?.message?.content || "";

    const parsed = extractJson(responseText);
    if (!parsed) {
      throw new Error("Failed to parse quiz questions from Groq response.");
    }

    const normalized = normalizeQuiz(parsed);
    if (!normalized.length) {
      throw new Error("Groq returned an unexpected structure (no questions).");
    }

    setGeneratedQuiz(normalized);
    setSuccess(`Quiz generated with Groq (${GROQ_MODEL}).`);
  }

  async function generateQuizWithGemini() {
    const apiKey = getEnv("VITE_GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("Gemini API key not configured (VITE_GEMINI_API_KEY).");
    }

    // v1 endpoint and a current model (gemini-1.5-flash or gemini-1.5-pro)
    const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          // Ask for JSON directly to reduce parsing issues
          response_mime_type: "application/json",
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate exactly 5 multiple-choice quiz questions based on the following content.
For each question, provide 4 options and indicate the correct answer as a zero-based index.
Return ONLY JSON with this structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0
    }
  ]
}
Content:
${content}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData?.error?.message ||
        `Gemini API request failed with status ${response.status} (${response.statusText})`;
      throw new Error(msg);
    }

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const parsed = extractJson(responseText);
    if (!parsed) {
      throw new Error("Failed to parse quiz questions from Gemini response.");
    }

    const normalized = normalizeQuiz(parsed);
    if (!normalized.length) {
      throw new Error("Gemini returned an unexpected structure (no questions).");
    }

    setGeneratedQuiz(normalized);
    setSuccess(`Quiz generated with Gemini (${GEMINI_MODEL}).`);
  }

  function handleSave() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    const payload = {
      id: Date.now(),
      title: title.trim(),
      content: content.trim(),
      ytLink: ytLink.trim() || null,
      blogLink: blogLink.trim() || null,
      quiz: quizMode === "ai" ? generatedQuiz : manualQuestions,
      quizMode,
      createdAt: new Date().toISOString(),
    };
    console.log("Saved content:", payload);
    setSuccess("Content saved.");
    setTimeout(() => setSuccess(""), 2000);
    setTitle("");
    setContent("");
    setYtLink("");
    setBlogLink("");
    setGeneratedQuiz([]);
    setManualQuestions([]);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-2">Teacher Dashboard</h1>
      <p className="text-sm text-gray-600 mb-6">
        Upload teaching content and create a quiz (AI or manual). You may omit the video/blog links.
      </p>

      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <label className="block text-sm font-medium">Content Title *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2"
          placeholder="Enter a short descriptive title"
        />

        <label className="block text-sm font-medium mt-4">Content *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2 h-24"
          placeholder="Enter content text"
        ></textarea>

        <label className="block text-sm font-medium mt-4">YouTube Link (optional)</label>
        <input
          value={ytLink}
          onChange={(e) => setYtLink(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2"
          placeholder="https://youtube.com/..."
        />

        <label className="block text-sm font-medium mt-4">Blog Link (optional)</label>
        <input
          value={blogLink}
          onChange={(e) => setBlogLink(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2"
          placeholder="https://example.com/..."
        />

        <div className="mt-4">
          <label className="block text-sm font-medium">Quiz Mode</label>
          <select
            value={quizMode}
            onChange={(e) => setQuizMode(e.target.value)}
            className="mt-1 block w-full border rounded px-3 py-2"
          >
            <option value="ai">AI Generated (Groq with Gemini fallback)</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {quizMode === "ai" && (
          <div className="mt-4">
            <button
              onClick={generateQuizWithAI}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            >
              {isGenerating ? "Generating Quiz..." : "Generate Quiz with AI"}
            </button>

            {generatedQuiz.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Generated Questions:</h3>
                {generatedQuiz.map((q, idx) => (
                  <div key={idx} className="mb-4 p-3 border rounded">
                    <p className="font-medium">{q.question}</p>
                    <ul className="mt-2 ml-4">
                      {q.options.map((opt, optIdx) => (
                        <li
                          key={optIdx}
                          className={optIdx === q.correctAnswer ? "text-green-600 font-medium" : ""}
                        >
                          {opt} {optIdx === q.correctAnswer && "(Correct)"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {quizMode === "manual" && (
          <div className="mt-4">
            <h2 className="text-sm font-medium mb-2">Add Manual Questions (Max 10)</h2>
            <input
              value={tempQ.question}
              onChange={(e) => setTempQ({ ...tempQ, question: e.target.value })}
              className="mt-1 block w-full border rounded px-3 py-2 mb-2"
              placeholder="Enter question"
            />
            {tempQ.choices.map((choice, i) => (
              <input
                key={i}
                value={choice}
                onChange={(e) => {
                  const newChoices = [...tempQ.choices];
                  newChoices[i] = e.target.value;
                  setTempQ({ ...tempQ, choices: newChoices });
                }}
                className="mt-1 block w-full border rounded px-3 py-2 mb-2"
                placeholder={`Choice ${i + 1}`}
              />
            ))}
            <div className="mt-2">
              <label className="mr-2">Correct Answer:</label>
              <select
                value={tempQ.answerIndex}
                onChange={(e) => setTempQ({ ...tempQ, answerIndex: parseInt(e.target.value) })}
                className="border rounded px-2 py-1"
              >
                {tempQ.choices.map((_, idx) => (
                  <option key={idx} value={idx}>
                    Choice {idx + 1}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddManualQuestion}
              className="mt-2 px-3 py-1 bg-green-600 text-white rounded"
            >
              Add Question
            </button>
            <ul className="mt-4">
              {manualQuestions.map((q, idx) => (
                <li key={idx} className="mb-3 p-2 border rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{q.question}</span>
                    <button
                      onClick={() => handleRemoveManualQuestion(idx)}
                      className="ml-2 text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <ul className="ml-4 mt-1">
                    {q.choices.map((choice, optIdx) => (
                      <li
                        key={optIdx}
                        className={optIdx === q.answerIndex ? "text-green-600 font-medium" : ""}
                      >
                        {choice} {optIdx === q.answerIndex && "(Correct)"}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-600">{success}</p>}

        <button onClick={handleSave} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
          Save Content
        </button>
      </div>
    </div>
  );
}