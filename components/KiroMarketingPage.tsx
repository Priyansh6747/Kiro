"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KiroDagGraph } from "@/components/KiroDagGraph";

export function KiroMarketingPage() {
  const [yukiMessage, setYukiMessage] = useState<string>("");

  const yukiReplies: Record<number, string> = {
    1: "wireframe's blocked until research lands. that's not me being dramatic, that's the graph.",
    2: "copy draft can start — but ship still waits on review downstream.",
    3: "moving review. quill's rippling the two tasks under it now.",
    4: "assets is a leaf node. it was never blocking anyone.",
    0: "this is upstream of basically everything. touch it carefully.",
    5: "ship has no children. it's the end of the line — as it should be.",
  };

  const handleNodeSelect = (nodeId: number) => {
    setYukiMessage(yukiReplies[nodeId] || "");
  };

  return (
    <div className="min-h-screen bg-base text-primary overflow-x-hidden selection:bg-accent/20 scroll-smooth">
      <style dangerouslySetInnerHTML={{ __html: `
        html {
          scroll-behavior: smooth;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
      {/* ---------- NAV ---------- */}
      <nav className="sticky top-0 z-50 bg-base/80 backdrop-blur-md border-b border-border-default">
        <div className="max-w-[1180px] mx-auto px-5 md:px-8 flex items-center justify-between h-16">
          <div className="font-mono text-sm font-semibold tracking-wider flex items-center gap-2 select-none">
            <span className="w-2.5 h-2.5 bg-primary rounded-none inline-block" />
            KIRO
          </div>
          <div className="hidden md:flex gap-7 text-xs font-medium text-secondary">
            <a href="#graph" className="hover:text-primary transition-colors">Scheduling</a>
            <a href="#agents" className="hover:text-primary transition-colors">Agents</a>
            <a href="#math" className="hover:text-primary transition-colors">The Math</a>
            <a href="#engineering" className="hover:text-primary transition-colors">Engineering</a>
            <a href="#themes" className="hover:text-primary transition-colors">Design</a>
          </div>
          <Link
            href="/today"
            className="font-mono text-[11px] border border-border-default hover:border-secondary px-3.5 py-2 rounded transition-colors"
          >
            Launch Timeline →
          </Link>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <header className="max-w-[1180px] mx-auto px-5 md:px-8 py-20 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14 items-center border-b border-border-default animate-fade-in-up">
        <div className="space-y-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-tertiary flex items-center gap-2.5">
            <span className="w-4 h-[1px] bg-border-strong" />
            Task orchestration, not a to-do list
          </div>
          <h1 className="font-serif font-semibold text-4xl md:text-5xl lg:text-6xl leading-[1.04] tracking-tight">
            Your tasks form a graph.<br />
            <em className="font-normal italic text-secondary">Kiro just refuses to pretend otherwise.</em>
          </h1>
          <p className="text-base text-secondary max-w-[460px] leading-relaxed">
            A virtualized timeline, a dependency resolver, and six autonomous agents — led by Yuki, who will absolutely let you know when you've rescheduled something five days running.
          </p>
          <div className="flex items-center gap-5 pt-2">
            <Link
              href="/today"
              className="font-mono text-xs bg-primary text-base hover:opacity-90 px-5.5 py-3 rounded transition-all flex items-center gap-2 font-semibold"
            >
              Launch Timeline →
            </Link>
            <a
              href="#agents"
              className="font-mono text-xs text-secondary hover:text-primary border-b border-border-default hover:border-secondary pb-0.5 transition-all"
            >
              Meet the agents
            </a>
          </div>
        </div>

        <div className="relative" id="graph">
          <KiroDagGraph onNodeSelect={handleNodeSelect} />
          <div
            className={`absolute bottom-[18px] left-[20px] right-[20px] bg-surface-raised border border-border-default rounded p-2.5 px-3.5 text-xs text-secondary transition-all duration-300 transform ${
              yukiMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <span className="font-mono font-medium text-primary">yuki — </span>
            {yukiMessage}
          </div>
        </div>
      </header>

      {/* ---------- INTAKE (feature 1) ---------- */}
      <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-20 border-b border-border-default animate-fade-in-up" id="intake">
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-6 mb-12">
          <div>
            <div className="font-mono text-[11px] text-tertiary tracking-wider mb-2">01 · Intake</div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight max-w-[640px]">
              Tell it what you mean. It figures out what you need.
            </h2>
          </div>
          <div className="text-sm text-secondary md:text-right max-w-[280px]">
            Natural language in, structured project out — with a form, not a wall of text.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Chat Mock */}
          <div className="bg-surface border border-border-default rounded-lg overflow-hidden flex flex-col transition-transform duration-500 hover:scale-[1.01]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default font-mono text-[11px] text-tertiary select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-border-strong" />
              yuki — coordinator
            </div>
            <div className="p-4.5 flex flex-col gap-3.5">
              <div className="max-w-[80%] self-end bg-surface-raised border border-border-default text-[13.5px] px-3.5 py-2.5 rounded">
                set up the Q3 marketing launch, due in 3 weeks, this one's important
              </div>
              <div className="self-start font-mono text-[11.5px] text-tertiary">
                → delegating to Nova (ProjectAgent)
              </div>
              <div className="self-start w-full bg-surface-raised border border-border-default rounded p-3.5 space-y-2 select-none">
                <div className="flex justify-between text-xs border-b border-border-default/40 pb-2">
                  <span className="text-tertiary">Project</span>
                  <span className="font-medium">Q3 Marketing Launch</span>
                </div>
                <div className="flex justify-between text-xs border-b border-border-default/40 py-2">
                  <span className="text-tertiary">Importance</span>
                  <span className="font-medium">5 / 5</span>
                </div>
                <div className="flex justify-between text-xs border-b border-border-default/40 py-2">
                  <span className="text-tertiary">Deadline</span>
                  <span className="font-medium">21 days</span>
                </div>
                <div className="flex justify-between text-xs pt-2">
                  <span className="text-tertiary">Tasks drafted</span>
                  <span className="font-medium">6, dependency-linked</span>
                </div>
              </div>
              <div className="self-start font-mono text-[11.5px] text-tertiary">
                six tasks, three layers deep. confirm and I'll lock the graph.
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-col justify-center gap-7">
            {[
              {
                tag: "A",
                title: "Generative UI, not generated text",
                desc: "Complex requests stream an actual interactive form into the chat — project intake, task editors, dependency graphs — so you configure by clicking, not by parsing paragraphs.",
              },
              {
                tag: "B",
                title: "A 21-day window, always smooth",
                desc: "The timeline renders a continuous 21-day slice and silently shifts itself forward as you scroll — no pagination, no jump cuts, no lag.",
              },
              {
                tag: "C",
                title: "Names, not UUIDs",
                desc: 'Say "the launch project" or "tomorrow\'s review" — Kiro resolves human language to the right record. You never type an ID.',
              },
            ].map((f) => (
              <div key={f.tag} className="flex gap-4">
                <span className="font-mono text-[11px] text-tertiary w-6 pt-1 shrink-0">{f.tag}</span>
                <div>
                  <h4 className="text-sm font-semibold mb-1">{f.title}</h4>
                  <p className="text-[13.5px] text-secondary leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- AGENT ROSTER ---------- */}
      <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-20 border-b border-border-default" id="agents">
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-6 mb-12">
          <div>
            <div className="font-mono text-[11px] text-tertiary tracking-wider mb-2">02 · The Agency</div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight max-w-[640px]">
              One coordinator. Five specialists. Zero generic chatbot energy.
            </h2>
          </div>
          <div className="text-sm text-secondary md:text-right max-w-[280px]">
            Yuki delegates by name, in order, every time — so the numbering below is how it actually runs.
          </div>
        </div>

        <div className="bg-surface border border-border-default rounded-lg p-7 mb-7 flex flex-col md:flex-row gap-6 items-start transition-transform duration-500 hover:scale-[1.01]">
          <div className="w-12 h-12 border border-border-default rounded-full shrink-0 flex items-center justify-center font-serif text-lg font-semibold bg-surface-raised">
            Y
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Yuki</h3>
            <div className="font-mono text-[11px] text-tertiary uppercase tracking-wider">
              Coordinator · sharp-tongued, opinionated, keeping score
            </div>
            <p className="text-[13.5px] text-secondary leading-relaxed max-w-[560px]">
              Runs the conversation, picks the agent for the job, and isn't shy about pointing out you've moved this task five days running. Tags whoever's handling your request before it executes — you always know who's working.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border-default border border-border-default rounded-lg overflow-hidden">
          {[
            { num: "01", name: "Nova", code: "ProjectAgent", desc: "Creates projects, sets importance weights, tracks deadlines." },
            { num: "02", name: "Quill", code: "TaskAgent", desc: "Handles the granular work — scheduling, completing, rescheduling individual tasks." },
            { num: "03", name: "Echo", code: "PreferencesAgent", desc: "Calibrates timezones, nudge timing, and your ratio thresholds in the background." },
            { num: "04", name: "Iva", code: "DayLogAgent", desc: "Keeps the append-only ledger — what got done, what got pushed, no edits." },
            { num: "05", name: "Juno", code: "PlannerAgent", desc: "Watches your daily load and flags it before a planner gets unworkable." },
            { num: "06", name: "Zef", code: "UIAgent", desc: "Moves you around the interface directly — switches views, swaps themes, on command." },
          ].map((agent) => (
            <div key={agent.num} className="bg-surface p-5.5 space-y-2.5 transition-colors duration-300 hover:bg-surface-raised">
              <div className="font-mono text-[11px] text-tertiary">{agent.num}</div>
              <div>
                <h4 className="text-sm font-semibold">{agent.name}</h4>
                <div className="font-mono text-[11px] text-tertiary">{agent.code}</div>
              </div>
              <p className="text-[13px] text-secondary leading-relaxed">{agent.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- MATH STRIP ---------- */}
      <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-20 border-b border-border-default" id="math">
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-6 mb-12">
          <div>
            <div className="font-mono text-[11px] text-tertiary tracking-wider mb-2">03 · The Math</div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight max-w-[640px]">
              Neglect isn't a feeling here. It's a number.
            </h2>
          </div>
          <div className="text-sm text-secondary md:text-right max-w-[280px]">
            Every project gets scored every morning — so nothing important slides out of view quietly.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { title: "Neglect score", formula: "neglect = daysSinceLastCompleted", desc: "The longer a project goes untouched, the louder it gets." },
            { title: "Deadline proximity", formula: "proximity = importance × 1/max(daysLeft, 1)", desc: "Important work due soon dominates the score — by design." },
            { title: "Total priority", formula: "total = proximity + neglect", desc: "This is what Yuki actually reads before your morning nudge." },
          ].map((m, idx) => (
            <div key={idx} className="border border-border-default rounded-lg p-6 space-y-4 transition-transform duration-300 hover:-translate-y-1">
              <h4 className="text-sm font-semibold">{m.title}</h4>
              <div className="font-mono text-[13.5px] bg-surface-raised border border-border-default rounded p-3 text-primary select-all overflow-x-auto whitespace-nowrap">
                {m.formula}
              </div>
              <p className="text-[13px] text-secondary leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- TIMELINE ENGINE STRIP ---------- */}
      <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-20 border-b border-border-default" id="timeline-engine">
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-6 mb-12">
          <div>
            <div className="font-mono text-[11px] text-tertiary tracking-wider mb-2">Metrics · Engine</div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight max-w-[640px]">
              Visualizing the system limits.
            </h2>
          </div>
          <div className="text-sm text-secondary md:text-right max-w-[280px]">
            Real-time viewport constraints and performance variables.
          </div>
        </div>

        <div className="flex gap-4.5 overflow-x-auto pb-4 scrollbar-thin">
          {[
            { val: "21d", label: "sliding window", desc: "Always loaded in memory for snappy continuous scrolling." },
            { val: "600px", label: "edge threshold", desc: "Scroll within this bounds to trigger the 7-day slide loader." },
            { val: "0.5px", label: "default border", desc: "System border width design spec across components." },
            { val: "5", label: "active specialists", desc: "Domain-specific AI agents working in sequence." },
            { val: "0ms", label: "ui lag", desc: "Optimistic updates guarantee immediate interaction feedback." },
          ].map((metric, idx) => (
            <div key={idx} className="flex-none w-[240px] border border-border-default rounded-lg p-4.5 bg-surface space-y-3 select-none transition-colors duration-300 hover:bg-surface-raised">
              <div className="font-mono text-2xl font-semibold">{metric.val}</div>
              <div className="font-mono text-[10.5px] text-tertiary uppercase tracking-wider">{metric.label}</div>
              <p className="text-[12.5px] text-secondary leading-relaxed">{metric.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- DAG / ENGINEERING SECTION ---------- */}
      <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-20 border-b border-border-default" id="engineering">
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-6 mb-12">
          <div>
            <div className="font-mono text-[11px] text-tertiary tracking-wider mb-2">04 · Engineering</div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight max-w-[640px]">
              Built like infrastructure, not like a widget.
            </h2>
          </div>
          <div className="text-sm text-secondary md:text-right max-w-[280px]">
            The parts you won't see — and the reason the parts you do see never stutter.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border-default border border-border-default rounded-lg overflow-hidden">
          {[
            { title: "Continuous timeline engine", desc: "A sliding window holds exactly 21 days in memory. Scroll within 600px of either edge and the window shifts seven days — no pagination, no visible seam." },
            { title: "DAG dependency resolver", desc: "Recursive depth-first search keeps the task graph acyclic. Move an upstream milestone and every downstream task ripples into place automatically." },
            { title: "Generative UI streaming", desc: "Interactive components — forms, graphs, planners — stream directly into chat over SSE. Not markdown pretending to be an app." },
            { title: "MCP-extensible core", desc: "The agent layer speaks Model Context Protocol, so external tools and context sources plug in without touching the core scheduler." },
          ].map((e, idx) => (
            <div key={idx} className="bg-surface p-7 space-y-3 transition-colors duration-300 hover:bg-surface-raised">
              <h4 className="font-mono text-sm font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-secondary rounded-full" />
                {e.title}
              </h4>
              <p className="text-[13.5px] text-secondary leading-relaxed">{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- THEMES SECTION ---------- */}
      <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-20 border-b border-border-default" id="themes">
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-6 mb-12">
          <div>
            <div className="font-mono text-[11px] text-tertiary tracking-wider mb-2">05 · Surface</div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight max-w-[640px]">
              Five material systems. One graph underneath.
            </h2>
          </div>
          <div className="text-sm text-secondary md:text-right max-w-[280px]">
            Configured locally. Colors derive dynamically from the active global theme.
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border-default border border-border-default rounded-lg overflow-hidden">
          {[
            { name: "Midnight", desc: "Graphite base, emerald accent" },
            { name: "Paper", desc: "Warm texture, clay ink" },
            { name: "Sage", desc: "Lichen, moss, bark, linen" },
            { name: "Nebula", desc: "Lilac light, muted lavender" },
            { name: "Nightshade", desc: "Matte charcoal, electric indigo" },
          ].map((t, idx) => (
            <div key={idx} className="bg-surface p-5 space-y-4 transition-colors duration-300 hover:bg-surface-raised">
              <div className="flex gap-1 select-none">
                <span className="w-4.5 h-4.5 rounded bg-accent" />
                <span className="w-4.5 h-4.5 rounded bg-border-strong" />
                <span className="w-4.5 h-4.5 rounded bg-surface-raised border border-border-default" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">{t.name}</h4>
                <p className="text-[11.5px] text-tertiary">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FOOTER CTA ---------- */}
      <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-24 text-center space-y-6">
        <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight animate-pulse">
          Stop managing a list.<br />
          Start running a graph.
        </h2>
        <div className="pt-2">
          <Link
            href="/today"
            className="font-mono text-xs bg-primary text-base hover:opacity-90 px-6 py-3 rounded transition-all inline-flex items-center gap-2 font-semibold"
          >
            Launch Timeline →
          </Link>
        </div>

        <div className="flex justify-between items-center font-mono text-[11.5px] text-tertiary pt-16 border-t border-border-default mt-16 select-none">
          <span>KIRO</span>
          <span>Built on Next.js 16 / React 19</span>
          <span>© 2026</span>
        </div>
      </div>
    </div>
  );
}
