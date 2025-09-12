import React, { useState } from "react";

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
    if (quizMode === "manual" && manualQuestions.length === 0) return "Add at least one manual question or switch to AI generation.";
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
      
      // If Groq fails, try Gemini
      try {
        await generateQuizWithGemini();
      } catch (geminiError) {
        console.error("Gemini API also failed:", geminiError);
        setError("Both Groq and Gemini APIs failed. Please check your API keys and try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateQuizWithGroq() {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error("Groq API key not configured");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // You can change this to any Groq supported model
        messages: [
          {
            role: "user",
            content: `Generate 5 multiple-choice quiz questions based on the following content. 
                     For each question, provide 4 options and indicate the correct answer.
                     Format your response as JSON with this structure: 
                     {
                       "questions": [
                         {
                           "question": "Question text",
                           "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                           "correctAnswer": 0
                         }
                       ]
                     }
                     Content: ${content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Groq API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    
    // Try to extract JSON from the response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const quizData = JSON.parse(jsonMatch[0]);
        setGeneratedQuiz(quizData.questions);
        setSuccess("Quiz generated with Groq API!");
      } else {
        throw new Error("Could not find JSON in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Groq response:", parseError);
      throw new Error("Failed to parse quiz questions from Groq response.");
    }
  }

  async function generateQuizWithGemini() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate 5 multiple-choice quiz questions based on the following content. 
                       For each question, provide 4 options and indicate the correct answer.
                       Format your response as JSON with this structure: 
                       {
                         "questions": [
                           {
                             "question": "Question text",
                             "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                             "correctAnswer": 0
                           }
                         ]
                       }
                       Content: ${content}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Gemini API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.candidates && data.candidates[0].content.parts[0].text) {
      const responseText = data.candidates[0].content.parts[0].text;
      
      // Try to extract JSON from the response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const quizData = JSON.parse(jsonMatch[0]);
          setGeneratedQuiz(quizData.questions);
          setSuccess("Quiz generated with Gemini API!");
        } else {
          throw new Error("Could not find JSON in response");
        }
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", parseError);
        throw new Error("Failed to parse quiz questions from Gemini response.");
      }
    } else {
      throw new Error("Failed to generate quiz from Gemini. No text in response.");
    }
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
      <p className="text-sm text-gray-600 mb-6">Upload teaching content and create a quiz (AI or manual). You may omit the video/blog links.</p>

      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <label className="block text-sm font-medium">Content Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="Enter a short descriptive title" />

        <label className="block text-sm font-medium mt-4">Content *</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2 h-24" placeholder="Enter content text"></textarea>

        <label className="block text-sm font-medium mt-4">YouTube Link (optional)</label>
        <input value={ytLink} onChange={(e) => setYtLink(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="https://youtube.com/..." />

        <label className="block text-sm font-medium mt-4">Blog Link (optional)</label>
        <input value={blogLink} onChange={(e) => setBlogLink(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="https://example.com/..." />

        <div className="mt-4">
          <label className="block text-sm font-medium">Quiz Mode</label>
          <select value={quizMode} onChange={(e) => setQuizMode(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2">
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
                        <li key={optIdx} className={optIdx === q.correctAnswer ? "text-green-600 font-medium" : ""}>
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
            <input value={tempQ.question} onChange={(e) => setTempQ({ ...tempQ, question: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2 mb-2" placeholder="Enter question" />
            {tempQ.choices.map((choice, i) => (
              <input key={i} value={choice} onChange={(e) => {
                const newChoices = [...tempQ.choices];
                newChoices[i] = e.target.value;
                setTempQ({ ...tempQ, choices: newChoices });
              }} className="mt-1 block w-full border rounded px-3 py-2 mb-2" placeholder={`Choice ${i + 1}`} />
            ))}
            <div className="mt-2">
              <label className="mr-2">Correct Answer:</label>
              <select 
                value={tempQ.answerIndex} 
                onChange={(e) => setTempQ({ ...tempQ, answerIndex: parseInt(e.target.value) })}
                className="border rounded px-2 py-1"
              >
                {tempQ.choices.map((_, idx) => (
                  <option key={idx} value={idx}>Choice {idx + 1}</option>
                ))}
              </select>
            </div>
            <button onClick={handleAddManualQuestion} className="mt-2 px-3 py-1 bg-green-600 text-white rounded">Add Question</button>
            <ul className="mt-4">
              {manualQuestions.map((q, idx) => (
                <li key={idx} className="mb-3 p-2 border rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{q.question}</span>
                    <button onClick={() => handleRemoveManualQuestion(idx)} className="ml-2 text-red-600">Remove</button>
                  </div>
                  <ul className="ml-4 mt-1">
                    {q.choices.map((choice, optIdx) => (
                      <li key={optIdx} className={optIdx === q.answerIndex ? "text-green-600 font-medium" : ""}>
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

        <button onClick={handleSave} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">Save Content</button>
      </div>
    </div>
  );
}