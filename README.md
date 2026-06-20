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

### 4. AI-Driven Insights & Granular Caching
Kiro integrates with Groq AI to process task data and deliver intelligent summaries, wrapped in a highly optimized caching layer.

- **End-of-Day (EOD) Analysis**: A background worker compiles the day's completed tasks, pending blockers, and DAG progress, feeding it to a Groq LLM to generate actionable, localized insights.
- **Cache Invalidation Lifecycle**: To prevent expensive LLM calls on every render, summaries are aggressively cached in `localStorage` and Next.js server caches with a 1-hour expiry TTL. The cache is automatically invalidated and revalidated only when a task's completion status mathematically alters the day's progression statistics.

### 5. Optimistic UI & Transactional Rollbacks
Every interaction in Kiro feels instantaneous, operating on a "trust but verify" optimistic model.

- **Zero-Latency State Mutation**: Dragging a task, swiping to schedule, or establishing a graph dependency immediately patches the local React state, bypassing network round-trip delays.
- **Transactional Rollbacks**: If the backend API throws a validation error (e.g., a foreign key failure or a temporal constraint violation), the centralized state manager catches the failure, gracefully reverses the local state, and fires an error via the custom `useToast` system.
- **Fluid Gestures**: Built with Framer Motion, swipeable interactions (like bucket-dropping) are tied to pointer velocity and physics simulations, providing native app-level haptics.

---

## 🛠️ Technology Stack

- **Core Framework**: Next.js 16 (App Router, Server Actions)
- **Frontend Library**: React 19 (Concurrent Rendering, Custom Hooks)
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
