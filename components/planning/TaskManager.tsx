"use client";

import React, { useState } from "react";
import { TaskDependencyGraph } from "./TaskDependencyGraph";
import { Clock, Calendar, Link2, Plus, X, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

interface Subtask {
  title: string;
  estimate_min: number;
}

interface Task {
  id: string;
  title: string;
  estimate_min: number;
  deadline: string | null;
  depends_on: string[];
  subtasks?: Subtask[];
  selected?: boolean;
}

interface Stage {
  stage: number;
  stageName: string;
  tasks: Task[];
}

interface Props {
  data: {
    artifactId: string;
    stages: Stage[];
  };
}

const STAGE_COLORS = [
  { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.25)", accent: "#8b5cf6", badge: "rgba(139,92,246,0.15)", badgeText: "#a78bfa" },
  { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", accent: "#3b82f6", badge: "rgba(59,130,246,0.15)", badgeText: "#93c5fd" },
  { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", accent: "#10b981", badge: "rgba(16,185,129,0.15)", badgeText: "#6ee7b7" },
  { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", accent: "#f59e0b", badge: "rgba(245,158,11,0.15)", badgeText: "#fcd34d" },
];

function formatDeadline(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function formatEstimate(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TaskManager({ data }: Props) {
  const [stages, setStages] = useState<Stage[]>(
    JSON.parse(JSON.stringify(data.stages))
  );
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [cycleWarning, setCycleWarning] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  const updateTask = (stageIdx: number, taskIdx: number, updates: Partial<Task>) => {
    const newStages = [...stages];
    newStages[stageIdx].tasks[taskIdx] = {
      ...newStages[stageIdx].tasks[taskIdx],
      ...updates,
    };
    setStages(newStages);
  };

  const addTask = (stageIdx: number) => {
    const newStages = [...stages];
    newStages[stageIdx].tasks.push({
      id: "task_new_" + Date.now(),
      title: "New Task",
      estimate_min: 30,
      deadline: null,
      depends_on: [],
    });
    setStages(newStages);
  };

  const removeTask = (stageIdx: number, taskIdx: number) => {
    if (confirm("Remove task?")) {
      const newStages = [...stages];
      const removedId = newStages[stageIdx].tasks[taskIdx].id;
      newStages[stageIdx].tasks.splice(taskIdx, 1);
      newStages.forEach(s => {
        s.tasks.forEach(t => {
          t.depends_on = t.depends_on.filter(d => d !== removedId);
        });
      });
      setStages(newStages);
    }
  };

  const addDependency = (stageIdx: number, taskIdx: number, depId: string) => {
    const targetTask = stages[stageIdx].tasks[taskIdx];
    if (targetTask.depends_on.includes(depId) || targetTask.id === depId) return;

    const adj = new Map<string, string[]>();
    for (const s of stages) {
      for (const t of s.tasks) {
        adj.set(t.id, t.depends_on);
      }
    }

    const isCyclic = (start: string, target: string) => {
      const visited = new Set<string>();
      const dfs = (curr: string): boolean => {
        if (curr === target) return true;
        if (visited.has(curr)) return false;
        visited.add(curr);
        for (const next of (adj.get(curr) || [])) {
          if (dfs(next)) return true;
        }
        return false;
      };
      return dfs(start);
    };

    if (isCyclic(depId, targetTask.id)) {
      setCycleWarning("Circular dependency detected — skipped.");
      setTimeout(() => setCycleWarning(null), 2500);
      return;
    }

    updateTask(stageIdx, taskIdx, { depends_on: [...targetTask.depends_on, depId] });
  };

  const removeDependency = (stageIdx: number, taskIdx: number, depId: string) => {
    const task = stages[stageIdx].tasks[taskIdx];
    updateTask(stageIdx, taskIdx, { depends_on: task.depends_on.filter(d => d !== depId) });
  };

  const toggleSelect = (taskId: string) => {
    const next = new Set(deselected);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setDeselected(next);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const sessionId = localStorage.getItem("kiro_plan_session") || data.artifactId;
      let projectName = "New Project";
      try {
        const phase1Raw = localStorage.getItem("kiro_plan_phase1");
        if (phase1Raw) {
          const phase1 = JSON.parse(phase1Raw);
          projectName = phase1.name || "New Project";
        }
      } catch {
        // fallback is fine
      }

      const payloadStages = stages.map(s => ({
        ...s,
        tasks: s.tasks.map(t => ({
          ...t,
          selected: !deselected.has(t.id)
        }))
      }));

      const res = await fetch("/api/planning/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: payloadStages,
          projectName,
          artifactId: sessionId,
        })
      });

      if (res.ok) {
        localStorage.removeItem("kiro_plan_session");
        localStorage.removeItem("kiro_plan_phase1");
        window.location.href = "/projects";
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Finalize error:", err);
        alert(`Failed to create project: ${err.error || "Unknown error"}`);
        setSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Check the console for details.");
      setSubmitting(false);
    }
  };

  const allTasks = stages.flatMap(s => s.tasks);
  const selectedCount = allTasks.length - deselected.size;
  const totalMin = allTasks
    .filter(t => !deselected.has(t.id))
    .reduce((acc, t) => acc + (t.estimate_min || 0), 0);

  return (
    <div style={{ margin: "20px 0", color: "var(--text-primary)", fontFamily: "inherit" }}>
      {/* Header bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px",
        padding: "14px 18px",
        background: "var(--surface-raised)",
        borderRadius: "14px",
        border: "1px solid var(--border-default)",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "3px" }}>
            Review Your Project Plan
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            {selectedCount} task{selectedCount !== 1 ? "s" : ""} selected · {formatEstimate(totalMin)} total estimated
          </div>
        </div>
        <button
          onClick={() => setShowGraph(v => !v)}
          style={{
            padding: "7px 14px",
            borderRadius: "8px",
            border: "1px solid var(--border-default)",
            background: showGraph ? "var(--accent)" : "var(--surface)",
            color: showGraph ? "white" : "var(--text-secondary)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 150ms ease",
          }}
        >
          <Link2 size={13} /> {showGraph ? "Hide Graph" : "Dependency Graph"}
        </button>
      </div>

      {/* Cycle warning */}
      {cycleWarning && (
        <div style={{
          marginBottom: "12px",
          padding: "10px 16px",
          borderRadius: "10px",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "#f87171",
          fontSize: "13px",
          fontWeight: 500,
        }}>
          ⚠ {cycleWarning}
        </div>
      )}

      {/* Stages */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {stages.map((stage, sIdx) => {
          const color = STAGE_COLORS[sIdx % STAGE_COLORS.length];
          return (
            <div
              key={stage.stage}
              style={{
                borderRadius: "16px",
                overflow: "hidden",
                border: `1px solid ${color.border}`,
                background: "var(--surface)",
              }}
            >
              {/* Stage header */}
              <div style={{
                padding: "14px 18px",
                background: color.bg,
                borderBottom: `1px solid ${color.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: color.accent,
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {stage.stage}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "15px" }}>{stage.stageName}</span>
                </div>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "20px",
                  background: color.badge,
                  color: color.badgeText,
                }}>
                  {stage.tasks.length} task{stage.tasks.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Task grid */}
              <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                {stage.tasks.map((task, tIdx) => {
                  const isExcluded = deselected.has(task.id);
                  const deadline = formatDeadline(task.deadline);
                  const deps = task.depends_on
                    .map(id => allTasks.find(t => t.id === id))
                    .filter(Boolean) as Task[];

                  return (
                    <div
                      key={task.id}
                      style={{
                        padding: "14px",
                        borderRadius: "12px",
                        border: `1px solid ${isExcluded ? "var(--border-subtle)" : color.border}`,
                        background: isExcluded ? "var(--surface)" : "var(--surface-raised)",
                        opacity: isExcluded ? 0.45 : 1,
                        transition: "all 200ms ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {/* Task title row */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <button
                          onClick={() => toggleSelect(task.id)}
                          style={{
                            flexShrink: 0,
                            marginTop: "2px",
                            width: "17px",
                            height: "17px",
                            borderRadius: "5px",
                            border: `2px solid ${isExcluded ? "var(--border-default)" : color.accent}`,
                            background: isExcluded ? "transparent" : color.accent,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 150ms ease",
                          }}
                        >
                          {!isExcluded && <CheckCircle2 size={11} color="white" />}
                        </button>
                        <textarea
                          value={task.title}
                          onChange={e => updateTask(sIdx, tIdx, { title: e.target.value })}
                          rows={2}
                          style={{
                            flex: 1,
                            background: "transparent",
                            border: "none",
                            color: "var(--text-primary)",
                            outline: "none",
                            resize: "none",
                            fontSize: "13px",
                            fontWeight: 600,
                            lineHeight: "1.45",
                            fontFamily: "inherit",
                          }}
                        />
                        <button
                          onClick={() => removeTask(sIdx, tIdx)}
                          style={{
                            flexShrink: 0,
                            background: "none",
                            border: "none",
                            color: "var(--text-tertiary)",
                            cursor: "pointer",
                            padding: "2px",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            transition: "color 150ms ease",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {/* Metadata row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {/* Estimate */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "var(--surface)",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                        }}>
                          <Clock size={10} />
                          <input
                            type="number"
                            value={task.estimate_min}
                            onChange={e => updateTask(sIdx, tIdx, { estimate_min: parseInt(e.target.value) || 0 })}
                            style={{
                              width: "32px",
                              background: "transparent",
                              border: "none",
                              color: "var(--text-secondary)",
                              outline: "none",
                              fontSize: "11px",
                              fontWeight: 500,
                            }}
                          />
                          <span style={{ color: "var(--text-tertiary)" }}>min</span>
                        </div>

                        {/* Deadline */}
                        {deadline && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.2)",
                            fontSize: "11px",
                            fontWeight: 500,
                            color: "#fbbf24",
                          }}>
                            <Calendar size={10} />
                            {deadline}
                          </div>
                        )}
                      </div>

                      {/* Dependencies */}
                      {deps.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {deps.map(dep => (
                            <div
                              key={dep.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 7px",
                                borderRadius: "6px",
                                background: color.badge,
                                border: `1px solid ${color.border}`,
                                fontSize: "10px",
                                fontWeight: 500,
                                color: color.badgeText,
                                maxWidth: "140px",
                              }}
                            >
                              <ArrowRight size={9} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {dep.title.length > 18 ? dep.title.substring(0, 18) + "…" : dep.title}
                              </span>
                              <button
                                onClick={() => removeDependency(sIdx, tIdx, dep.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: color.badgeText, padding: 0, display: "flex", alignItems: "center" }}
                              >
                                <X size={9} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add dependency */}
                      <select
                        value=""
                        onChange={e => addDependency(sIdx, tIdx, e.target.value)}
                        style={{
                          background: "var(--surface)",
                          border: "1px dashed var(--border-default)",
                          color: "var(--text-tertiary)",
                          borderRadius: "6px",
                          fontSize: "11px",
                          outline: "none",
                          cursor: "pointer",
                          padding: "3px 8px",
                          fontFamily: "inherit",
                          width: "100%",
                        }}
                      >
                        <option value="" disabled>＋ Add dependency…</option>
                        {allTasks.filter(t => t.id !== task.id && !task.depends_on.includes(t.id)).map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}

                {/* Add task card */}
                <button
                  onClick={() => addTask(sIdx)}
                  style={{
                    padding: "14px",
                    background: "transparent",
                    border: `1px dashed ${color.border}`,
                    borderRadius: "12px",
                    color: color.badgeText,
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    minHeight: "80px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = color.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Plus size={18} />
                  Add Task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dependency graph (collapsible) */}
      {showGraph && (
        <div style={{
          marginTop: "20px",
          height: "500px",
          border: "1px solid var(--border-default)",
          borderRadius: "16px",
          overflow: "hidden",
          animation: "fadeIn 300ms ease",
        }}>
          <TaskDependencyGraph data={{ artifactId: data.artifactId, stages }} />
        </div>
      )}

      {/* Submit CTA */}
      <div style={{ marginTop: "24px" }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: submitting ? "var(--surface-raised)" : "var(--accent)",
            color: submitting ? "var(--text-secondary)" : "white",
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            border: "none",
            fontSize: "15px",
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            transition: "all 200ms ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            letterSpacing: "0.01em",
          }}
        >
          {submitting
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Creating Project…</>
            : <><CheckCircle2 size={16} /> Create Project & Tasks</>
          }
        </button>
        <div style={{ textAlign: "center", marginTop: "8px", fontSize: "11px", color: "var(--text-tertiary)" }}>
          {selectedCount} of {allTasks.length} tasks will be created · {formatEstimate(totalMin)} total
        </div>
      </div>
    </div>
  );
}
