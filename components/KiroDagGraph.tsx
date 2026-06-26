"use client";

import React, { useState } from "react";

interface KiroDagGraphProps {
  onNodeSelect?: (nodeId: number, label: string) => void;
}

export function KiroDagGraph({ onNodeSelect }: KiroDagGraphProps) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  // adjacency: node -> direct children
  const children: Record<number, number[]> = {
    0: [1, 2],
    1: [3],
    2: [3, 4],
    3: [5],
    4: [],
    5: [],
  };

  const nodeLabels: Record<number, string> = {
    0: "research",
    1: "wireframe",
    2: "copy draft",
    3: "review",
    4: "assets",
    5: "ship",
  };

  const getDescendants = (id: number, acc: Set<number>): Set<number> => {
    acc.add(id);
    (children[id] || []).forEach((c) => {
      if (!acc.has(c)) getDescendants(c, acc);
    });
    return acc;
  };

  const handleNodeClick = (id: number) => {
    setSelectedNode(id);
    if (onNodeSelect) {
      onNodeSelect(id, nodeLabels[id]);
    }
  };

  const affected = selectedNode !== null ? getDescendants(selectedNode, new Set()) : new Set<number>();

  return (
    <div className="relative bg-surface border border-border-default rounded-lg p-5 h-[420px] flex flex-col justify-between">
      <div className="flex justify-between items-center select-none">
        <span className="font-mono text-[11px] text-tertiary uppercase tracking-wider">
          Dependency graph — live
        </span>
        <span className="font-mono text-[11px] text-tertiary">
          {selectedNode !== null
            ? affected.size > 1
              ? `${affected.size - 1} downstream`
              : "leaf node"
            : "click a node"}
        </span>
      </div>

      <svg className="w-full h-full block" viewBox="0 0 400 320">
        {/* Edges drawn first */}
        <g>
          {[
            { id: "0-1", from: 0, to: 1, d: "M 80,60 C 130,60 130,110 180,110" },
            { id: "0-2", from: 0, to: 2, d: "M 80,60 C 110,90 110,150 160,170" },
            { id: "1-3", from: 1, to: 3, d: "M 220,110 C 260,110 260,180 300,200" },
            { id: "2-3", from: 2, to: 3, d: "M 200,170 C 250,180 260,190 300,200" },
            { id: "2-4", from: 2, to: 4, d: "M 180,180 C 170,220 170,250 180,270" },
            { id: "3-5", from: 3, to: 5, d: "M 320,220 C 320,250 280,260 250,275" },
          ].map((edge) => {
            const isActive = affected.has(edge.from) && affected.has(edge.to);
            return (
              <path
                key={edge.id}
                d={edge.d}
                fill="none"
                className={`transition-all duration-300 ${
                  isActive
                    ? "stroke-secondary stroke-[2px]"
                    : "stroke-border-default stroke-[1.5px]"
                }`}
              />
            );
          })}
        </g>

        {/* Nodes */}
        {[
          { id: 0, cx: 65, cy: 55, r: 22 },
          { id: 1, cx: 200, cy: 105, r: 20 },
          { id: 2, cx: 178, cy: 172, r: 20 },
          { id: 3, cx: 318, cy: 208, r: 20 },
          { id: 4, cx: 183, cy: 278, r: 18 },
          { id: 5, cx: 248, cy: 282, r: 18 },
        ].map((node) => {
          const isSelected = selectedNode === node.id;
          const isPulsing = affected.has(node.id) && !isSelected;
          const label = nodeLabels[node.id];

          return (
            <g
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNodeClick(node.id);
                }
              }}
              className="cursor-pointer group outline-none"
              tabIndex={0}
            >
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                className={`transition-all duration-300 ${
                  isSelected
                    ? "fill-primary stroke-primary stroke-[1.5px]"
                    : isPulsing
                      ? "fill-surface-raised stroke-border-strong stroke-[1.5px] animate-pulse"
                      : "fill-surface-raised stroke-border-default stroke-[1.5px] group-hover:stroke-secondary"
                }`}
              />
              <text
                x={node.cx}
                y={node.cy + node.r + 15}
                textAnchor="middle"
                className={`font-mono text-[10.5px] transition-colors duration-300 select-none ${
                  isSelected ? "fill-primary font-semibold" : "fill-secondary group-hover:fill-primary"
                }`}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
