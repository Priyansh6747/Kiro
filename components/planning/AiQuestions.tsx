"use client";

import React, { useState } from "react";
import { ContentRenderer } from "../GenerativeUI";

interface Question {
  id: string;
  question: string;
  type: "text" | "choice";
  choices?: string[];
}

interface Props {
  data: {
    artifactId: string;
    questions: Question[];
  };
}

export function AiQuestions({ data }: Props) {
  const { questions, artifactId } = data;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nextContent, setNextContent] = useState<string>("");

  if (!questions || questions.length === 0) {
    return <div className="text-secondary text-sm">No questions provided.</div>;
  }

  const currentQuestion = questions[currentIndex];

  const handleAnswerChange = (val: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: val });
  };

  const handleNext = () => {
    if (currentIndex < questions.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleChoiceClick = (choice: string) => {
    handleAnswerChange(choice);
    setTimeout(() => {
      handleNext();
    }, 300);
  };

  const handleSubmit = async () => {
    console.log("[AiQuestions] Submitting phase 2 answers...", answers);
    setSubmitting(true);
    setSubmitted(true); // Transition immediately to the loading screen
    try {
      const sessionId = localStorage.getItem("kiro_plan_session");
      const phase1Str = localStorage.getItem("kiro_plan_phase1");
      const phase1 = phase1Str ? JSON.parse(phase1Str) : {};
      console.log("[AiQuestions] Loaded sessionId from localStorage:", sessionId);

      const phase2Answers = Object.entries(answers).map(([id, answer]) => ({
        question: questions.find((q) => q.id === id)?.question || "",
        answer,
      }));

      console.log("[AiQuestions] Sending phase: 3 with phase2Answers...");
      const res = await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: 3, sessionId, phase1, phase2Answers }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      let fullStr = "";
      let buffer3 = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
           buffer3 += decoder.decode(value, { stream: true });
           const parts = buffer3.split("\n\n");
           buffer3 = parts.pop() || "";
           for (const part of parts) {
             const lines = part.split("\n");
             for (const line of lines) {
               if (line.startsWith("data: ")) {
                 let dataStr = line.replace("data: ", "").trim();
                 if (dataStr) {
                   try {
                     const parsed = JSON.parse(dataStr);
                     if (typeof parsed === "string") {
                       fullStr += parsed;
                       setNextContent(fullStr);
                     }
                   } catch(e) {}
                 }
               }
             }
           }
        }
      }

      console.log("[AiQuestions] Stream done.");
    } catch (e) {
      console.error("[AiQuestions] Error during submit:", e);
      setSubmitting(false);
      setSubmitted(false); // Revert UI if it failed completely
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--surface-raised)",
    border: "1px solid var(--border-default)",
    borderRadius: "16px",
    padding: "28px",
    maxWidth: "520px",
    margin: "16px 0",
    color: "var(--text-primary)",
    fontFamily: "inherit",
    position: "relative",
    overflow: "hidden",
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-input)",
    border: "1px solid var(--border-default)",
    borderRadius: "8px",
    padding: "10px 14px",
    width: "100%",
    color: "var(--text-primary)",
    outline: "none",
    marginTop: "12px",
    fontFamily: "inherit",
    resize: "none",
  };

  const buttonStyle = (primary: boolean, disabled: boolean): React.CSSProperties => ({
    background: primary ? (disabled ? "var(--surface-input)" : "var(--accent)") : "transparent",
    color: primary ? (disabled ? "var(--text-tertiary)" : "white") : "var(--text-secondary)",
    border: primary ? "none" : "1px solid var(--border-default)",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 500,
  });

  if (submitted) {
    if (nextContent) {
      return <ContentRenderer content={nextContent} />;
    }
    return (
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyItems: "center", minHeight: "120px" }}>
        <div style={{ width: "100%", textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 500, color: "var(--text-secondary)" }}>Crafting your Project Artifact...</p>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;
  const currentAnswer = answers[currentQuestion?.id] || "";
  const isNextDisabled = currentQuestion?.type === "text" && currentAnswer.trim() === "";

  return (
    <div style={cardStyle}>
      <style>{`
        @keyframes fade-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-up {
          animation: fade-slide-up 300ms ease-out forwards;
        }
      `}</style>

      {/* Progress bar */}
      <div style={{ 
        position: "absolute", 
        top: 0, 
        left: 0, 
        right: 0, 
        height: "3px", 
        background: "var(--surface-input)" 
      }}>
        <div style={{
          width: `${(currentIndex / questions.length) * 100}%`,
          background: "var(--accent)",
          height: "100%",
          transition: "width 400ms ease",
        }} />
      </div>

      {currentIndex < questions.length ? (
        <div key={currentIndex} className="fade-slide-up" style={{ marginTop: "12px" }}>
          <label style={{ fontWeight: 600, fontSize: "1.1rem" }}>{currentQuestion.question}</label>
          
          {currentQuestion.type === "text" && (
            <textarea 
              rows={2} 
              style={inputStyle} 
              value={currentAnswer} 
              onChange={(e) => handleAnswerChange(e.target.value)} 
              placeholder="Your answer..."
              autoFocus
            />
          )}

          {currentQuestion.type === "choice" && currentQuestion.choices && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
              {currentQuestion.choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => handleChoiceClick(choice)}
                  style={{
                    background: currentAnswer === choice ? "var(--accent)" : "var(--surface-raised)",
                    color: currentAnswer === choice ? "white" : "var(--text-primary)",
                    border: "1px solid",
                    borderColor: currentAnswer === choice ? "var(--accent)" : "var(--border-default)",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "all 200ms ease"
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
            {isLastQuestion ? (
              <button 
                style={buttonStyle(true, isNextDisabled || submitting)} 
                onClick={handleSubmit}
                disabled={isNextDisabled || submitting}
              >
                {submitting ? "Submitting..." : "Submit Answers"}
              </button>
            ) : (
              currentQuestion.type === "text" && (
                <button 
                  style={buttonStyle(true, isNextDisabled)} 
                  onClick={handleNext}
                  disabled={isNextDisabled}
                >
                  Continue →
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="fade-slide-up" style={{ marginTop: "12px" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontWeight: 500 }}>All questions answered!</p>
              <button 
                style={buttonStyle(true, submitting)} 
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Answers"}
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
