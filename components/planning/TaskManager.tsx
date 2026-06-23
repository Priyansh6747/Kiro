"use client";

import React, { useState } from "react";
import { TaskDependencyGraph } from "./TaskDependencyGraph";

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

export function TaskManager({ data }: Props) {
  const [stages, setStages] = useState<Stage[]>(
    JSON.parse(JSON.stringify(data.stages))
  );
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [cycleWarning, setCycleWarning] = useState<string | null>(null);

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
      setCycleWarning("Circular dependency — skipped.");
      setTimeout(() => setCycleWarning(null), 2000);
      return;
    }

    updateTask(stageIdx, taskIdx, { depends_on: [...targetTask.depends_on, depId] });
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
      const stored = localStorage.getItem("kiro_plan_session");
      const projectName = stored ? JSON.parse(stored).name || "New Project" : "New Project";

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
          artifactId: data.artifactId
        })
      });

      if (res.ok) {
        window.location.href = "/projects";
      } else {
        throw new Error("Failed to finalize");
      }
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  const allTasks = stages.flatMap(s => s.tasks);

  return (
    <div style={{ margin: "16px 0", color: "var(--text-primary)", fontFamily: "inherit" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
        {/* Top Panel: Task List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {stages.map((stage, sIdx) => (
            <div key={stage.stage} style={{ border: "1px solid var(--border-default)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ background: "var(--surface-raised)", padding: "12px 16px", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{stage.stageName}</span>
                <span style={{ fontSize: "12px", background: "var(--surface-input)", padding: "2px 8px", borderRadius: "12px" }}>{stage.tasks.length} tasks</span>
              </div>
              <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                {stage.tasks.map((task, tIdx) => {
                  const isExcluded = deselected.has(task.id);
                  return (
                    <div key={task.id} style={{ padding: "12px", border: "1px solid var(--border-default)", borderRadius: "8px", background: "var(--surface-raised)", opacity: isExcluded ? 0.5 : 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <input type="checkbox" checked={!isExcluded} onChange={() => toggleSelect(task.id)} style={{ cursor: "pointer", marginTop: "4px" }} />
                        <textarea 
                          value={task.title}
                          onChange={e => updateTask(sIdx, tIdx, { title: e.target.value })}
                          rows={2}
                          style={{ background: "transparent", border: "none", color: "var(--text-primary)", flex: 1, outline: "none", resize: "none", fontSize: "14px", fontWeight: 500 }}
                        />
                        <button onClick={() => removeTask(sIdx, tIdx)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}>✕</button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "12px" }}>
                        <div style={{ background: "var(--surface-input)", padding: "2px 6px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                          Est: 
                          <input 
                            type="number" 
                            value={task.estimate_min} 
                            onChange={e => updateTask(sIdx, tIdx, { estimate_min: parseInt(e.target.value) || 0 })}
                            style={{ width: "40px", background: "transparent", border: "none", color: "var(--text-primary)", outline: "none" }}
                          />
                        </div>
                        {task.deadline && (
                           <div style={{ background: "var(--surface-input)", padding: "2px 6px", borderRadius: "4px" }}>
                             {task.deadline}
                           </div>
                        )}
                        {task.depends_on.length > 0 && (
                          <div style={{ background: "var(--surface-input)", padding: "2px 6px", borderRadius: "4px", color: "var(--text-secondary)" }}>
                            needs: {task.depends_on.map(id => allTasks.find(t => t.id === id)?.title?.substring(0,6)).join(", ")}
                          </div>
                        )}
                        <select 
                          value="" 
                          onChange={e => addDependency(sIdx, tIdx, e.target.value)}
                          style={{ background: "var(--surface-input)", border: "none", color: "var(--text-primary)", borderRadius: "4px", fontSize: "12px", outline: "none", cursor: "pointer", padding: "2px 4px" }}
                        >
                          <option value="" disabled>＋ dep</option>
                          {allTasks.filter(t => t.id !== task.id).map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                <button 
                  onClick={() => addTask(sIdx)}
                  style={{ padding: "12px", background: "var(--surface-input)", border: "1px dashed var(--border-default)", borderRadius: "8px", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px", height: "100%", minHeight: "100px" }}
                >
                  ＋ Add Task
                </button>
              </div>
            </div>
          ))}
          {cycleWarning && (
            <div style={{ color: "var(--error)", fontSize: "13px", textAlign: "center" }}>
              {cycleWarning}
            </div>
          )}
        </div>

        {/* Bottom Panel: Graph */}
        <div style={{ minWidth: 0, height: "600px", border: "1px solid var(--border-default)", borderRadius: "12px", overflow: "hidden" }}>
          <TaskDependencyGraph data={{ artifactId: data.artifactId, stages }} />
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ marginTop: "24px" }}>
        <button 
          onClick={handleSubmit} 
          disabled={submitting}
          style={{
            background: "var(--accent)",
            color: "white",
            width: "100%",
            padding: "16px",
            borderRadius: "10px",
            border: "none",
            fontSize: "16px",
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            transition: "opacity 200ms ease",
            opacity: submitting ? 0.7 : 1
          }}
        >
          {submitting ? "Creating Project..." : "Create Project & Tasks"}
        </button>
      </div>
    </div>
  );
}
