"use client";

import { useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  Edge,
  Node,
  MarkerType,
  Position,
  Handle,
  Connection,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Task } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";

const TaskNode = ({ data, id }: any) => {
  return (
    <div style={data.style} className="relative group">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-[var(--accent)] !border-2 !border-[var(--bg-surface)] hover:!scale-125 transition-transform cursor-crosshair z-10"
      />
      <div className="w-full h-full flex items-center justify-center relative pointer-events-none">
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-[var(--accent)] !border-2 !border-[var(--bg-surface)] hover:!scale-125 transition-transform cursor-crosshair z-10"
      />
    </div>
  );
};

const nodeTypes = {
  task: TaskNode,
};

export function DependencyChart({
  tasks,
  dependencies,
  onAddDependency,
}: {
  tasks: Task[];
  dependencies: { taskId: string; predecessorId: string }[];
  onAddDependency?: (taskId: string, predecessorId: string) => void;
}) {
  const { theme } = useTheme();

  const getAutoLayout = useCallback(
    (
      tasksList: Task[],
      depsList: { taskId: string; predecessorId: string }[],
    ) => {
      const taskMap = new Map(tasksList.map((t) => [t.id, t]));

      const adj = new Map<string, string[]>();
      const inDegree = new Map<string, number>();
      const outDegree = new Map<string, number>();
      const initialInDegree = new Map<string, number>();

      for (const t of tasksList) {
        adj.set(t.id, []);
        inDegree.set(t.id, 0);
        outDegree.set(t.id, 0);
        initialInDegree.set(t.id, 0);
      }

      for (const d of depsList) {
        if (adj.has(d.predecessorId) && inDegree.has(d.taskId)) {
          adj.get(d.predecessorId)!.push(d.taskId);
          inDegree.set(d.taskId, inDegree.get(d.taskId)! + 1);
          initialInDegree.set(d.taskId, initialInDegree.get(d.taskId)! + 1);
          outDegree.set(d.predecessorId, outDegree.get(d.predecessorId)! + 1);
        }
      }

      const depthLevels: string[][] = [];
      const queue: string[] = [];

      for (const [id, deg] of inDegree.entries()) {
        if (deg === 0) {
          if (outDegree.get(id) === 0) {
            // isolated node - do not push to queue initially so it spawns at the end (near final nodes)
          } else {
            queue.push(id);
          }
        }
      }

      const placed = new Set<string>();

      while (queue.length > 0) {
        const levelSize = queue.length;
        const levelNodes: string[] = [];
        for (let i = 0; i < levelSize; i++) {
          const curr = queue.shift()!;
          levelNodes.push(curr);
          placed.add(curr);
          for (const neighbor of adj.get(curr) || []) {
            inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
            if (inDegree.get(neighbor) === 0) {
              queue.push(neighbor);
            }
          }
        }
        depthLevels.push(levelNodes);
      }

      const remaining = tasksList
        .filter((t) => !placed.has(t.id))
        .map((t) => t.id);
      if (remaining.length > 0) {
        depthLevels.push(remaining);
      }

      const layoutNodes: Node[] = [];
      const layoutEdges: Edge[] = [];

      const X_SPACING = 300;
      const Y_SPACING = 120;

      depthLevels.forEach((level, x) => {
        const levelSize = level.length;
        level.forEach((id, index) => {
          const task = taskMap.get(id);
          if (!task) return;

          const yOffset = index - (levelSize - 1) / 2;
          const inDeg = initialInDegree.get(id) || 0;
          const outDeg = outDegree.get(id) || 0;

          const taskDeps = depsList.filter((d) => d.taskId === id);
          const allDepsCleared =
            taskDeps.length > 0 &&
            taskDeps.every(
              (d) => taskMap.get(d.predecessorId)?.status === "done",
            );

          let borderTopColor = "var(--accent)";
          if (task.status === "done") {
            borderTopColor = "var(--status-done)";
          } else if (inDeg === 0) {
            borderTopColor = "var(--node-start)";
          } else if (outDeg === 0) {
            borderTopColor = "var(--node-final)";
          } else if (allDepsCleared) {
            borderTopColor = "var(--node-ready)";
          } else {
            borderTopColor =
              task.status === "pending"
                ? "var(--accent)"
                : "var(--status-warning)";
          }

          layoutNodes.push({
            id,
            type: "task",
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            position: { x: x * X_SPACING, y: yOffset * Y_SPACING },
            data: {
              label: task.title,
              style: {
                background:
                  task.status === "done"
                    ? "var(--bg-done-subtle)"
                    : "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                boxShadow:
                  "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                borderRadius: "12px",
                borderTop: `4px solid ${borderTopColor}`,
                fontSize: "13px",
                fontWeight: 600,
                padding: "16px 20px",
                minWidth: "160px",
                textAlign: "center",
                color: "var(--text-primary)",
              },
            },
          });
        });
      });

      depsList.forEach((d) => {
        const isDone = taskMap.get(d.taskId)?.status === "done";
        layoutEdges.push({
          id: `e-${d.predecessorId}-${d.taskId}`,
          source: d.predecessorId,
          target: d.taskId,
          type: "straight",
          animated: !isDone,
          style: {
            stroke: isDone ? "var(--status-done)" : "var(--border-strong)",
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isDone ? "var(--status-done)" : "var(--border-strong)",
          },
        });
      });

      return { layoutNodes, layoutEdges };
    },
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const { layoutNodes, layoutEdges } = getAutoLayout(tasks, dependencies);
    setNodes((currentNodes) => {
      const currentMap = new Map(currentNodes.map((n) => [n.id, n]));
      return layoutNodes.map((ln) => {
        const existing = currentMap.get(ln.id);
        if (existing) {
          return { ...ln, position: existing.position };
        }
        return ln;
      });
    });
    setEdges(layoutEdges);
  }, [tasks, dependencies, getAutoLayout, setNodes, setEdges]);

  const handleResetLayout = () => {
    const { layoutNodes } = getAutoLayout(tasks, dependencies);
    setNodes(layoutNodes);
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && onAddDependency) {
        if (connection.source === connection.target) return;

        const exists = dependencies.some(
          (d) =>
            d.taskId === connection.target &&
            d.predecessorId === connection.source,
        );
        if (exists) return;

        const hasPath = (start: string, end: string) => {
          const visited = new Set<string>();
          const queue = [start];
          while (queue.length > 0) {
            const curr = queue.shift()!;
            if (curr === end) return true;
            if (!visited.has(curr)) {
              visited.add(curr);
              const children = dependencies
                .filter((d) => d.predecessorId === curr)
                .map((d) => d.taskId);
              queue.push(...children);
            }
          }
          return false;
        };

        if (hasPath(connection.target, connection.source)) {
          alert("Cycle detected! Cannot create this dependency.");
          return;
        }

        onAddDependency(connection.target, connection.source);
      }
    },
    [dependencies, onAddDependency],
  );

  if (tasks.length === 0) {
    return <p className="text-xs text-tertiary p-4">No tasks to chart.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end px-2">
        <button
          onClick={handleResetLayout}
          className="text-xs text-accent hover:underline px-2 py-1 bg-surface-raised border border-border-default rounded shadow-sm"
        >
          Reset Layout
        </button>
      </div>
      <div
        style={{
          height: 500,
          width: "100%",
          border: "1px solid var(--border-default)",
          borderRadius: "12px",
          background: "var(--bg-surface-raised)",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode={theme === "paper" || theme === "sage" ? "light" : "dark"}
        >
          <Background color="var(--border-strong)" gap={16} size={2} />
          <Controls />
        </ReactFlow>
      </div>
      <div className="flex flex-wrap gap-4 items-center justify-center text-xs text-secondary py-1 bg-surface rounded-lg border border-border-default px-4 py-2 self-center">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "var(--node-start)" }}
          ></div>{" "}
          Start
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "var(--node-ready)" }}
          ></div>{" "}
          Ready
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "var(--node-final)" }}
          ></div>{" "}
          Final
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "var(--status-done)" }}
          ></div>{" "}
          Done
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "var(--accent)" }}
          ></div>{" "}
          Pending/Locked
        </div>
      </div>
    </div>
  );
}
