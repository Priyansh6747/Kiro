"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  data: {
    artifactId: string;
    markdown: string;
  };
}

export function ArtifactPreview({ data }: Props) {
  const { markdown } = data;
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(markdown);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const sessionId = localStorage.getItem("kiro_plan_session");

      const res = await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: 3, sessionId, markdownContent: editContent }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
           decoder.decode(value);
        }
      }

      setConfirmed(true);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--surface-raised)",
    border: "1px solid var(--border-default)",
    borderRadius: "16px",
    padding: "28px",
    maxWidth: "800px",
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
    padding: "16px",
    width: "100%",
    color: "var(--text-primary)",
    outline: "none",
    fontFamily: "monospace",
    resize: "vertical",
    minHeight: "420px",
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

  if (confirmed) {
    return (
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyItems: "center", minHeight: "120px" }}>
        <p style={{ margin: 0, fontWeight: 500, color: "var(--text-secondary)", textAlign: "center", width: "100%" }}>Generating your task breakdown…</p>
      </div>
    );
  }

  return (
    <div style={cardStyle} className="fade-slide-up">
      <style>{`
        @keyframes fade-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-up {
          animation: fade-slide-up 300ms ease-out forwards;
        }
      `}</style>

      {editing ? (
        <div>
          <textarea 
            rows={16} 
            style={inputStyle} 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)} 
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button 
              style={buttonStyle(false, false)} 
              onClick={() => setEditing(false)}
            >
              Preview
            </button>
            <button 
              style={buttonStyle(true, submitting)} 
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ maxHeight: "420px", overflowY: "auto", paddingRight: "16px" }} className="custom-scrollbar">
            <div className="prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {editContent}
              </ReactMarkdown>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border-default)" }}>
            <button 
              style={buttonStyle(false, false)} 
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button 
              style={buttonStyle(true, submitting)} 
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Continuing..." : "Looks good, continue →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
