"use client";

import React, { useState } from "react";
import { ContentRenderer } from "../GenerativeUI";

export function PlanningIntakeForm({ data }: { data: { phase: 1 } }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<number>(3);
  const [category, setCategory] = useState<string>("critical");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [phase2Content, setPhase2Content] = useState<string>("");

  const handleSubmit = async (finalDeadline: string | null) => {
    console.log("[PlanningIntakeForm] Submitting phase 1...", { name, description, priority, category, finalDeadline });
    setSubmitting(true);
    
    try {
      const res = await fetch("/api/planning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phase: 1,
          phase1: { name, description, priority, category, deadline: finalDeadline }
        })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          console.log("[PlanningIntakeForm] Received chunk:", chunk);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (dataStr) {
                try {
                  const parsed = JSON.parse(dataStr);
                  console.log("[PlanningIntakeForm] Parsed data:", parsed);
                  if (parsed.sessionId) {
                    console.log("[PlanningIntakeForm] Saved sessionId:", parsed.sessionId);
                    localStorage.setItem("kiro_plan_session", parsed.sessionId);
                    localStorage.setItem("kiro_plan_phase1", JSON.stringify({ name, description, priority, category, deadline: finalDeadline }));
                  }
                } catch (e) {
                  // Might not be JSON, ignore
                }
              }
            }
          }
        }
      }
      console.log("[PlanningIntakeForm] Stream done. Setting submitted=true");
      setSubmitted(true);

      // --- Automatically fetch Phase 2 ---
      try {
        const sessionId = localStorage.getItem("kiro_plan_session");
        if (sessionId) {
          console.log("[PlanningIntakeForm] Automatically fetching phase 2...");
          const res2 = await fetch("/api/planning", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phase: 2, sessionId, phase1: { name, description, priority, category, deadline: finalDeadline } })
          });

          const reader2 = res2.body?.getReader();
          const decoder2 = new TextDecoder();
          let phase2Str = "";
          let buffer = "";
          
          while (reader2) {
            const { value, done } = await reader2.read();
            if (done) break;
            if (value) {
              buffer += decoder2.decode(value, { stream: true });
              console.log("[PlanningIntakeForm] Phase 2 stream buffer length:", buffer.length);
              const parts = buffer.split("\n\n");
              buffer = parts.pop() || "";
              for (const part of parts) {
                const lines = part.split("\n");
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    let dataStr = line.replace("data: ", "").trim();
                    if (dataStr) {
                      try {
                        const parsed = JSON.parse(dataStr);
                        if (typeof parsed === "string") {
                          console.log("[PlanningIntakeForm] Received Phase 2 String Length:", parsed.length);
                          phase2Str += parsed;
                          setPhase2Content(phase2Str);
                        }
                      } catch(e) {}
                    }
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("[PlanningIntakeForm] Error during phase 2 fetch:", e);
      }
    } catch (e) {
      console.error("[PlanningIntakeForm] Error during submit:", e);
      setSubmitting(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-surface-raised)",
    border: "1px solid var(--border-default)",
    borderRadius: "16px",
    padding: "28px",
    maxWidth: "520px",
    margin: "16px 0",
    color: "var(--text-primary)",
    fontFamily: "inherit",
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-base)",
    border: "1px solid var(--border-default)",
    borderRadius: "8px",
    padding: "10px 14px",
    width: "100%",
    color: "var(--text-primary)",
    outline: "none",
    marginTop: "8px",
    fontFamily: "inherit",
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

  const nextDisabled = step === 0 && name.trim() === "";

  if (submitted) {
    if (phase2Content) {
      return <ContentRenderer content={phase2Content} />;
    }
    return (
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyItems: "center", minHeight: "120px" }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <p className="text-secondary text-sm">Great! Generating your questions...</p>
        </div>
      </div>
    );
  }

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
      
      {/* Step Indicator */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: "6px",
              width: "24px",
              borderRadius: "3px",
              background: i === step ? "var(--accent)" : "var(--border-default)",
              transition: "background 300ms ease",
            }}
          />
        ))}
      </div>

      <div key={step} className="fade-slide-up">
        {step === 0 && (
          <div>
            <label style={{ fontWeight: 600, fontSize: "1.1rem" }}>What's the name of this project?</label>
            <input 
              type="text" 
              style={inputStyle} 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Website Redesign" 
              autoFocus 
            />
          </div>
        )}
        
        {step === 1 && (
          <div>
            <label style={{ fontWeight: 600, fontSize: "1.1rem" }}>Describe the core idea</label>
            <textarea 
              rows={3} 
              style={{ ...inputStyle, resize: "none" }} 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What are we trying to achieve?" 
              autoFocus 
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <label style={{ fontWeight: 600, fontSize: "1.1rem", display: "block", marginBottom: "12px" }}>Priority</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setPriority(star)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "24px",
                    color: star <= priority ? "var(--accent)" : "var(--text-tertiary)",
                    transition: "color 200ms ease",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <label style={{ fontWeight: 600, fontSize: "1.1rem", display: "block", marginBottom: "12px" }}>Category</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {["critical", "recurring", "habit", "nicetohave"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    background: category === cat ? "var(--accent)" : "var(--surface-raised)",
                    color: category === cat ? "white" : "var(--text-primary)",
                    border: "1px solid",
                    borderColor: category === cat ? "var(--accent)" : "var(--border-default)",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <label style={{ fontWeight: 600, fontSize: "1.1rem" }}>Target Deadline (Optional)</label>
            <input 
              type="date" 
              style={{ ...inputStyle, display: "block", maxWidth: "200px" }} 
              value={deadline || ""} 
              onChange={(e) => setDeadline(e.target.value)} 
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", alignItems: "center" }}>
        <div>
          {step > 0 && (
            <button style={buttonStyle(false, false)} onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {step === 4 && (
            <button 
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => handleSubmit(null)}
              disabled={submitting}
            >
              Skip
            </button>
          )}
          <button 
            style={buttonStyle(true, submitting || nextDisabled)} 
            onClick={() => {
              if (step < 4) setStep(step + 1);
              else handleSubmit(deadline);
            }}
            disabled={submitting || nextDisabled}
          >
            {submitting ? "Submitting..." : step === 4 ? "Submit" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
