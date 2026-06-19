"use client";

import { useMemo } from "react";
import { ReactFlow, Controls, Background, Edge, Node, MarkerType, Position, Handle } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Task } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";

const TaskNode = ({ data, id }: any) => {
  return (
    <div style={data.style} className="relative group">
      <Handle type="target" position={Position.Left} />
      <div className="w-full h-full flex items-center justify-center">
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} />
      
      {data.onAddSubtask && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            data.onAddSubtask(id);
          }}
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-400 border border-border-default-2 border border-border-default-white rounded-full cursor-pointer hover:bg-accent hover:scale-150 transition-all z-10"
          title="Add dependent task"
        />
      )}
    </div>
  );
};

const nodeTypes = {
  task: TaskNode,
};

export function DependencyChart({
  tasks,
  dependencies,
  onAddSubtask,
}: {
  tasks: Task[];
  dependencies: { taskId: string; predecessorId: string }[];
  onAddSubtask?: (predecessorId: string) => void;
}) {
  const { theme } = useTheme();
  
  const { nodes, edges } = useMemo(() => {
    // Simple layout calculation:
    // We can do a topological sort and assign columns (x) based on depth,
    // and rows (y) based on sibling order.
    
    // Nodes mapping
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    
    // Outgoing edges (predecessor -> task)
    const adj = new Map<string, string[]>();
    // Incoming edges count (for topological sort)
    const inDegree = new Map<string, number>();
    
    for (const t of tasks) {
      adj.set(t.id, []);
      inDegree.set(t.id, 0);
    }
    
    for (const d of dependencies) {
      if (adj.has(d.predecessorId) && inDegree.has(d.taskId)) {
        adj.get(d.predecessorId)!.push(d.taskId);
        inDegree.set(d.taskId, inDegree.get(d.taskId)! + 1);
      }
    }
    
    // Group into depths
    const depthLevels: string[][] = [];
    const queue: string[] = [];
    
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }
    
    // To handle cycles/disconnected safely in UI
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
    
    // Any remaining nodes (cycles) just put them in a final level
    const remaining = tasks.filter(t => !placed.has(t.id)).map(t => t.id);
    if (remaining.length > 0) {
      depthLevels.push(remaining);
    }
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const X_SPACING = 300;
    const Y_SPACING = 120;
    
    depthLevels.forEach((level, x) => {
      level.forEach((id, y) => {
        const task = taskMap.get(id);
        if (!task) return;
        nodes.push({
          id,
          type: 'task',
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          position: { x: x * X_SPACING, y: y * Y_SPACING },
          data: { label: task.title, onAddSubtask, style: {
            background: task.status === 'done' ? 'var(--bg-done-subtle)' : 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            borderRadius: '12px',
            borderTop: task.status === 'done' ? '4px solid var(--status-done)' : (task.status === 'pending' ? '4px solid var(--accent)' : '4px solid var(--status-warning)'),
            fontSize: '13px',
            fontWeight: 600,
            padding: '16px 20px',
            minWidth: '160px',
            textAlign: 'center',
            color: 'var(--text-primary)'
          }},
        });
      });
    });
    
    dependencies.forEach((d) => {
      const isDone = taskMap.get(d.taskId)?.status === 'done';
      edges.push({
        id: `e-${d.predecessorId}-${d.taskId}`,
        source: d.predecessorId,
        target: d.taskId,
        type: 'smoothstep',
        animated: !isDone,
        style: { stroke: isDone ? 'var(--status-done)' : 'var(--border-strong)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isDone ? 'var(--status-done)' : 'var(--border-strong)',
        },
      });
    });
    
    return { nodes, edges };
  }, [tasks, dependencies]);

  if (tasks.length === 0) {
    return <p className="text-xs text-tertiary p-4">No tasks to chart.</p>;
  }

  return (
    <div style={{ height: 500, width: "100%", border: "1px solid var(--border-default)", borderRadius: "12px", background: "var(--bg-surface-raised)" }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView colorMode={theme === 'paper' || theme === 'sage' ? 'light' : 'dark'}>
        <Background color="var(--border-strong)" gap={16} size={2} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
