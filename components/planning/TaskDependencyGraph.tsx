"use client";

import React, { useState, useMemo } from "react";

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
  stageNum?: number;
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

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

export function TaskDependencyGraph({ data }: Props) {
  const { stages } = data;
  const [selected, setSelected] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; task: Task } | null>(null);

  const { tasks, taskMap, adj, nodePositions, svgWidth, svgHeight, edges } = useMemo(() => {
    const allTasks: Task[] = stages.flatMap((s) => s.tasks.map((t) => ({ ...t, stageNum: s.stage })));
    const tMap = new Map(allTasks.map((t) => [t.id, t]));
    
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const t of allTasks) {
      inDegree.set(t.id, t.depends_on.length);
      for (const dep of t.depends_on) {
        if (!adjacency.has(dep)) adjacency.set(dep, []);
        adjacency.get(dep)!.push(t.id);
      }
    }

    const queue: string[] = allTasks.filter((t) => inDegree.get(t.id) === 0).map((t) => t.id);
    const columns = new Map<string, number>();
    for (const id of queue) columns.set(id, 0);

    let maxCol = 0;
    while (queue.length > 0) {
      const u = queue.shift()!;
      const c = columns.get(u)!;
      maxCol = Math.max(maxCol, c);
      for (const v of adjacency.get(u) || []) {
        inDegree.set(v, inDegree.get(v)! - 1);
        columns.set(v, Math.max(columns.get(v) || 0, c + 1));
        if (inDegree.get(v) === 0) queue.push(v);
      }
    }

    // Assign orphaned cycles to maxCol + 1 safely
    for (const t of allTasks) {
      if (!columns.has(t.id)) {
        columns.set(t.id, maxCol + 1);
        maxCol = Math.max(maxCol, maxCol + 1);
      }
    }

    const colGroups = new Map<number, Task[]>();
    for (const t of allTasks) {
      const c = columns.get(t.id)!;
      if (!colGroups.has(c)) colGroups.set(c, []);
      colGroups.get(c)!.push(t);
    }

    const positions = new Map<string, { x: number; y: number }>();
    let maxRow = 0;

    for (const [col, cTasks] of colGroups.entries()) {
      cTasks.sort((a, b) => (a.stageNum || 0) - (b.stageNum || 0) || a.title.localeCompare(b.title));
      maxRow = Math.max(maxRow, cTasks.length - 1);
      cTasks.forEach((t, i) => {
        positions.set(t.id, { x: col * 220 + 20, y: i * 90 + 20 });
      });
    }

    const width = (maxCol + 1) * 220 + 40;
    const height = (maxRow + 1) * 90 + 40;

    const allEdges: { source: string; target: string }[] = [];
    for (const t of allTasks) {
      for (const dep of t.depends_on) {
        if (positions.has(dep) && positions.has(t.id)) {
          allEdges.push({ source: dep, target: t.id });
        }
      }
    }

    return { tasks: allTasks, taskMap: tMap, adj: adjacency, nodePositions: positions, svgWidth: width, svgHeight: height, edges: allEdges };
  }, [stages]);

  const { highlightNodes, highlightEdges } = useMemo(() => {
    const nodes = new Set<string>();
    const edgeSet = new Set<string>();

    if (selected) {
      nodes.add(selected);
      // Ancestors
      let q = [selected];
      while (q.length) {
        const u = q.shift()!;
        const t = taskMap.get(u);
        for (const dep of t?.depends_on || []) {
          if (!nodes.has(dep)) {
            nodes.add(dep);
            edgeSet.add(`${dep}-${u}`);
            q.push(dep);
          } else {
            edgeSet.add(`${dep}-${u}`);
          }
        }
      }
      // Descendants
      q = [selected];
      while (q.length) {
        const u = q.shift()!;
        for (const v of adj.get(u) || []) {
          if (!nodes.has(v)) {
            nodes.add(v);
            edgeSet.add(`${u}-${v}`);
            q.push(v);
          } else {
            edgeSet.add(`${u}-${v}`);
          }
        }
      }
    }
    return { highlightNodes: nodes, highlightEdges: edgeSet };
  }, [selected, taskMap, adj]);

  const rectW = 160;
  const rectH = 52;

  const getPath = (sx: number, sy: number, tx: number, ty: number) => {
    return `M ${sx} ${sy} C ${sx + 40} ${sy}, ${tx - 40} ${ty}, ${tx} ${ty}`;
  };

  return (
    <div className="fade-slide-up" style={{ 
      overflowX: "auto", 
      background: "var(--surface-raised)",
      border: "1px solid var(--border-default)",
      borderRadius: "16px",
      margin: "16px 0",
      position: "relative"
    }}>
      <style>{`
        @keyframes fade-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-up {
          animation: fade-slide-up 300ms ease-out forwards;
        }
      `}</style>
      
      <svg width={Math.max(svgWidth, 600)} height={Math.max(svgHeight, 300)} style={{ display: "block" }}>
        <defs>
          <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-default)" opacity={0.6} />
          </marker>
          <marker id="arrow-highlight" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map(({ source, target }) => {
          const sPos = nodePositions.get(source)!;
          const tPos = nodePositions.get(target)!;
          const edgeId = `${source}-${target}`;
          
          const isHighlighted = highlightEdges.has(edgeId);
          const isFaded = selected !== null && !isHighlighted;
          
          return (
            <path
              key={edgeId}
              d={getPath(sPos.x + rectW, sPos.y + rectH / 2, tPos.x, tPos.y + rectH / 2)}
              fill="none"
              stroke={isHighlighted ? "var(--accent)" : "var(--border-default)"}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              opacity={isFaded ? 0.15 : (isHighlighted ? 1 : 0.6)}
              markerEnd={`url(#arrow-${isHighlighted ? "highlight" : "default"})`}
              style={{ transition: "all 300ms ease" }}
            />
          );
        })}

        {/* Nodes */}
        {tasks.map((task) => {
          const pos = nodePositions.get(task.id)!;
          const color = COLORS[(task.stageNum || 1) % COLORS.length];
          const isHighlighted = highlightNodes.has(task.id);
          const isSelected = selected === task.id;
          const isFaded = selected !== null && !isHighlighted;

          return (
            <g 
              key={task.id} 
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{ transition: "opacity 300ms ease", opacity: isFaded ? 0.2 : 1 }}
            >
              <rect
                width={rectW}
                height={rectH}
                rx={8}
                fill={color}
                fillOpacity={0.15}
                stroke={isSelected ? "var(--accent)" : color}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text
                x={12}
                y={22}
                fill="var(--text-primary)"
                fontSize={12}
                fontWeight={500}
                style={{ pointerEvents: "none", fontFamily: "inherit" }}
              >
                {task.title.length > 20 ? task.title.substring(0, 20) + "..." : task.title}
              </text>
              <text
                x={12}
                y={40}
                fill="var(--text-tertiary)"
                fontSize={10}
                style={{ pointerEvents: "none", fontFamily: "inherit" }}
              >
                Stage {task.stageNum} • {task.estimate_min}m
              </text>
              <rect
                width={rectW}
                height={rectH}
                fill="transparent"
                cursor="pointer"
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGElement).getBoundingClientRect();
                  const svgRect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
                  setTooltip({
                    x: rect.left - svgRect.left + rectW / 2,
                    y: rect.top - svgRect.top,
                    task
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => setSelected(isSelected ? null : task.id)}
              />
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <foreignObject
            x={Math.min(tooltip.x - 120, svgWidth - 260)}
            y={Math.max(tooltip.y - 120, 10)}
            width={240}
            height={200}
            style={{ pointerEvents: "none" }}
          >
            <div style={{
              background: "var(--surface-overlay)",
              border: "1px solid var(--border-default)",
              borderRadius: "8px",
              padding: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              color: "var(--text-primary)",
              fontSize: "12px",
              fontFamily: "inherit",
              backdropFilter: "blur(8px)"
            }}>
              <div style={{ fontWeight: 600, marginBottom: "4px", fontSize: "13px" }}>{tooltip.task.title}</div>
              <div style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>Estimate: {tooltip.task.estimate_min}m</div>
              {tooltip.task.deadline && (
                <div style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>Deadline: {tooltip.task.deadline}</div>
              )}
              {tooltip.task.depends_on.length > 0 && (
                <div>
                  <span style={{ color: "var(--text-tertiary)", display: "block", marginBottom: "2px" }}>Depends on:</span>
                  <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--text-secondary)" }}>
                    {tooltip.task.depends_on.map(depId => (
                      <li key={depId}>{taskMap.get(depId)?.title || depId}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}
