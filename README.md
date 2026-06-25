# Kiro: Advanced Task Orchestration & Scheduling

Kiro is a highly sophisticated, mathematically rigorous task management and scheduling engine wrapped in a premium, glassmorphic UI. Built on Next.js 16 and React 19, Kiro tackles some of the most complex challenges in modern frontend architecture, including graph-based dependency resolution, ultra-performant DOM virtualization, AI-driven data synthesis, and distributed timezone synchronization.

This project is engineered to handle massive, multi-year project timelines with zero perceived latency.

---

## 🏗️ Core Architectural Pillars

### 1. The Virtualized "Continuous Timeline" Engine
Rendering an unbounded timeline of days (past and future) typically crashes the browser DOM or causes severe Out-Of-Memory (OOM) faults on the server. Kiro solves this with a custom-built, extreme-performance DOM Virtualizer.

- **Mathematical Windowing**: The engine dynamically bounds rendering to exactly a 21-day sliding window (`3x ViewHeight`). 
- **Asynchronous Scroll Interception**: Using an `IntersectionObserver`-backed daemon, the engine tracks the scroll container. As the user approaches within a `600px` threshold of the DOM boundary, the window silently shifts forward or backward by precisely 7 days.
- **Scroll-Anchoring Manipulation**: To prevent the user's viewport from snapping wildly when 7 days of DOM nodes are prepended or appended, Kiro leverages native browser scroll-anchoring in tandem with precise `scrollTop` calculation algorithms.
- **Animation Loop Avoidance**: When a user programmatically requests to "Return to Today", the system mathematically re-centers the sliding window (`offset = -10`) and instantly jumps the scrollbar to simulate directional physics before allowing the browser to execute a `smooth` scroll. A dual `requestAnimationFrame` lock temporarily suspends the `IntersectionObserver` to prevent infinite sliding loops as the view glides across thresholds.

### 2. Directed Acyclic Graph (DAG) Dependency Resolver
Tasks in Kiro do not exist in a vacuum. The application utilizes advanced Graph Theory to manage complex project dependencies.

- **Deadlock Avoidance Matrix**: Before any dependency is committed to the database, a recursive graph traversal algorithm (Depth-First Search) walks the dependency tree to validate that the new link will not introduce a cyclical reference (e.g., A → B → A). This guarantees the project remains mathematically solvable.
- **Temporal Constraint Engine**: The DAG enforces the space-time continuum of the project schedule. A dependent task cannot be scheduled before its blockers. If a user attempts an invalid drag-and-drop, the constraint engine intercepts the interaction and throws an immediate violation.
- **Cascading Unscheduling**: Modifying the schedule of a root task has ripple effects. If a parent task is delayed into the future, the DAG recursively traverses downstream, automatically unscheduling or rescheduling all dependent children to maintain workflow integrity.
- **React Flow Visualizer**: The mathematical DAG is translated into an interactive, node-based flowchart using custom `React Flow` components, allowing users to visually trace their critical paths.

### 3. Distributed Timezone & UTC Synchronization
Dealing with dates across distributed clients and servers is notoriously difficult. Kiro implements a zero-drift timezone architecture.

- **Universal UTC Baseline**: All dates are mapped to exact midnight UTC integers. Kiro's backend math calculates local midnight offsets dynamically, guaranteeing that regardless of whether the user is in Tokyo or Los Angeles, the underlying day integers perfectly align with the calendar representation.
- **Preference Caching**: Timezone offsets are patched and synchronized on app load using `getOrCreatePreferences`, ensuring server-side rendering (SSR) aligns with the client's localized day boundaries.

### 4. Autonomous Multi-Agent Orchestration Team
Kiro runs a sophisticated multi-agent backend coordinated by **Yuki**, a sharp-tongued coordinator companion. Yuki delegates specialized sub-tasks to dedicated agents equipped with custom toolsets:
- **Nova (ProjectAgent)**: Manages creation, priority weights, and deadlines for projects.
- **Quill (TaskAgent)**: Manages granular task operations, scheduling, completions, and reschedules.
- **Echo (PreferencesAgent)**: Calibrates default timezone bounds, nudge times, and productivity ratios.
- **Iva (DayLogAgent)**: Maintains the append-only ledger of daily productivity logs, ratios, and penalty calculations.
- **Juno (PlannerAgent)**: Orchestrates the daily planner limits and triggers visual overload warnings.
- **Zef (UIAgent)**: Interacts with frontend state dynamically to navigate windows or toggle themes.

The agents collaborate for end-to-end planning workflows, asking clarifying questions, generating task breakdowns, and generating interactive dependency graphs.

### 5. Generative UI & SSE Streaming
Instead of static markdown, Kiro utilizes a dynamic SSE stream handler and `StreamableContentRenderer` in `/chat` and `MiniChat` to stream interactive UI components (prefixed with `<ui:*>` tags) directly into the message feed. This allows users to configure forms, inspect timeline schedules, and view dependencies inline.

### 6. Semantic Human-Readable Operations & Resource Quotas
- **No UUID Recitation**: Backend APIs maps human-readable project and task names (`projectName`, `taskTitle`) directly to internal database IDs.
- **Usage Tracking**: Features an "AI Usage" metrics tracker and quota system with a dynamic color-styled progress bar to monitor system resource consumption in real-time.

### 7. Optimistic UI & Transactional Rollbacks
Every interaction in Kiro feels instantaneous, operating on a "trust but verify" optimistic model.

- **Zero-Latency State Mutation**: Dragging a task, swiping to schedule, or establishing a graph dependency immediately patches the local React state, bypassing network round-trip delays.
- **Transactional Rollbacks**: If the backend API throws a validation error, the centralized state manager catches the failure, gracefully reverses the local state, and fires an error via the custom `useToast` system.
- **Task Styling & Gestures**: Task status and completions utilize polished strikethrough styling and transition animations. Interactive gestures (like swipe-to-bucket) are powered by Framer Motion velocity physics.
- **Responsive Mobile Layout**: The layout features dynamic visibility components, sliding panels, and modal-based transitions for task details to ensure complete feature parity on mobile screens.

---

## 🛠️ Technology Stack

- **Core Framework**: Next.js 16 (App Router, Server Actions)
- **Frontend Library**: React 19 (Concurrent Rendering, Custom Hooks, Server-Sent Events)
- **Authentication**: Clerk (with rigorous webhook parsing and fallback user ingestion)
- **AI/LLM Provider**: Groq API
- **Graph Visualization**: React Flow
- **Animations & Physics**: Framer Motion
- **Styling Engine**: TailwindCSS (Custom configuration for dynamic CSS-variable theming)
- **Icons**: Lucide React

---

## 🎨 Dynamic Theming Architecture
Kiro features a deep, token-based theming system utilizing CSS variables. It moves beyond simple "Light/Dark" modes into complex palette generation:
- **Themes**: *Paper* (Minimalist Light), *Midnight* (High-Contrast Dark), *Nebula* (Vibrant Space), *Sage* (Earthy/Calm), and *Nightshade* (Deep Emerald).
- **DOM Injection**: Theme tokens are dynamically injected into the root CSS tree via `localStorage` hydration, ensuring instantaneous, flash-free loading on initial paint.

---

## 🚀 Getting Started

To run Kiro locally and experience the architecture firsthand:

1. **Clone & Install**:
   ```bash
   git clone <repository>
   npm install
   ```

2. **Environment Configuration**:
   Ensure you have your Clerk API keys, Groq API keys, and database connection strings mapped in your `.env.local` file.

3. **Initialize**:
   ```bash
   npm run dev
   ```

4. **Explore**:
   Navigate to [http://localhost:3000](http://localhost:3000). Try dragging tasks in the Continuous Timeline or mapping a cyclical dependency in the Chart to watch the DAG constraint engine in action.
