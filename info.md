# Kiro: Landing Page Copy & Structural Design Guide (Expanded Edition)

Kiro is not a typical task list—it is a mathematically rigorous task orchestration, scheduling, and agentic productivity system wrapped in a premium, glassmorphic UI. Built on Next.js 16 and React 19, this guide details Kiro's actual codebases, highlighting the unique multi-agent architecture and scheduling algorithms for your landing page.

---

## 💎 The Elevator Pitch & Value Prop

*   **Main Headline**: "Task Orchestration, Powered by Autonomous Agents." or "Where Mathematical Graph Scheduling Meets Agentic Intelligence."
*   **Subheader**: "Kiro couples a custom high-performance virtualized timeline with an autonomous multi-agent backend. Led by Yuki, your sharp-tongued coordinator, Kiro's specialized AI agents calculate project neglect indices, stream interactive UI components directly into your chat, and synchronize timezones to keep your life on track."
*   **Call-to-Action (CTA)**: "Launch Timeline" or "Talk to Yuki"

---

## ✨ Core User Features & Experiences

Beyond the under-the-hood engine, Kiro offers a rich suite of user-facing features designed to streamline productivity and minimize friction:

### 1. Intelligent Task Intake & Scheduling
*   **Natural Language Entry**: Simply type or speak to Yuki (e.g., "Remind me to prep for the quarterly review next Tuesday at 9 AM"), and the system instantly parses the intent, dates, and priorities.
*   **Generative UI Forms**: When complex projects are requested, Kiro streams fully interactive React components (like project intake forms) directly into the chat for quick configuration instead of plain text.
*   **Continuous Virtualized Timeline**: A beautifully rendered, infinitely scrolling timeline that provides a bird's-eye view of your next 21 days without any pagination lag.

### 2. The Append-Only Day Log (Productivity Ledger)
*   **Immutable Tracking**: Managed by the **Iva Agent**, this feature serves as an un-editable daily ledger of accomplishments, keeping users honest about their output.
*   **Daily Ratios & Penalties**: Analyzes task completion versus task deferral, automatically calculating daily efficiency scores and applying algorithmic "penalties" or warnings when tasks are repeatedly pushed back.

### 3. Dynamic Visual Planning & Dependency Management
*   **Interactive DAG Graphs**: View complex project dependencies in a gorgeous Directed Acyclic Graph. Understand exactly which milestones block others before you even start working.
*   **Cascading Reschedules & Un-scheduling**: If an upstream task is delayed or un-scheduled, Kiro automatically ripple-updates all dependent downstream tasks recursively, preserving graph integrity.

### 4. Smart Timezone & Context Awarenessw
*   **Global Synchronization**: Whether you are traveling or collaborating across the globe, Kiro synchronizes timezones seamlessly. The **Echo Agent** calibrates background configurations so deadlines remain absolute or shift contextually based on user preference.
*   **Contextual Morning Nudges**: Start your day with a personalized briefing. The AI highlights neglected projects and urgent deadlines mathematically, offering encouragement or snarky pushback if you've been slacking.

### 5. Habits & Recurring Task Dashboard
*   **Interactive Drag-to-Select Calendar**: A custom-built, fully responsive calendar that allows you to click and drag across dates to calculate custom completion statistics and range stats instantly.
*   **Dynamic Matrix Tracker**: A 7-day visual matrix that concurrently tracks completion statuses across all your active habits, natively integrated with Kiro's custom CSS theme engine.
*   **Algorithmic Streak Calculation**: The backend utilizes optimized aggregation to track current streaks, all-time best streaks, and custom period completion ratios seamlessly without overloading the database.

---

## 🧠 The Agentic Multi-Agent Engine (Ultimate Flex)

Unlike standard apps with generic chat assistants, Kiro runs an **Autonomous Multi-Agent Orchestration Team**. 

### 1. The Coordinator: Yuki
*   **Persona**: A sharp-tongued, bratty AI companion with ego. Yuki runs your day, teases you when you slack off or reschedule tasks five days in a row, pushes back against self-sabotaging plans, and demands credit when things go well.
*   **Behavior**: When delegated a task, Yuki leaves a witty or snarky comment tagging the specialized agent responsible before executing.

### 2. The Specialized Agency
Yuki manages autonomous agent roles to execute complex operations, each equipped with custom toolsets:
*   **Nova (ProjectAgent)**: Manages creation, priority weights (importance), and deadlines for projects.
*   **Quill (TaskAgent)**: Coordinates granular task operations, scheduling, completions, and reschedules.
*   **Echo (PreferencesAgent)**: Calibrates background configurations, default timezone bounds, nudge times, and ratio algorithms.
*   **Iva (DayLogAgent)**: Maintains the append-only ledger of daily productivity logs, ratios, and penalty calculations.
*   **Juno (PlannerAgent)**: Orchestrates the daily planner limits and triggers visual overload warnings.
*   **Zef (UIAgent)**: Interacts with the frontend state directly, navigating windows or changing themes dynamically on command.

### 3. End-to-End AI Project Planning Workflow
*   Kiro's agents collaborate to transform vague ideas into actionable execution plans.
*   The system actively asks clarifying questions, generates task breakdowns, and presents them via interactive Dependency Graphs, timeline planning tools (such as `schedule_task_timeline`), and Artifact Previews before committing them to your database.
*   **MCP (Model Context Protocol) Integration**: Kiro's agentic ecosystem is highly extensible, securely interfacing with external contexts, models, and custom plugins via the Model Context Protocol.

---

## 📊 The Math: Neglect Indices & Scoring Algorithms

Kiro ranks user attention mathematically, preventing crucial projects from sliding out of sight.

*   **Neglect Index (`neglectScore`)**: Calculates the elapsed time since the project’s last completed task:
    $$\text{neglectScore} = \text{daysSinceLastCompleted}$$
*   **Deadline Proximity (`deadlineProximity`)**: Multiplies the project's importance (scale 1–5) by the inverse of days remaining until the deadline:
    $$\text{deadlineProximity} = \text{importance} \times \left( \frac{1}{\max(\text{daysUntilDeadline}, 1)} \right)$$
*   **Total Priority Score**:
    $$\text{totalScore} = \text{deadlineProximity} + \text{neglectScore}$$
*   **Dynamic Morning Nudges**: The AI analyzes top-scored projects each morning to generate encouraging, mathematically-backed alerts.

---

## ⚡ Technical Core & Engineering Flexes

Ensure the landing page details these core architectural highlights:

### 1. Generative UI Streaming (`<ui:*>`)
*   Kiro's chat doesn't just return static markdown. It utilizes a `StreamableContentRenderer` to dynamically stream fully interactive React components—like project intake forms, interactive task managers, and dependency graphs—directly into `/chat` and `MiniChat` via SSE streams for seamless in-line interaction.

### 2. The Virtualized "Continuous Timeline" Engine
*   **3x ViewHeight Sliding Window**: Limits active rendering to exactly a 21-day window.
*   **Asynchronous Scroll Interception**: Shifts the rendering window silently by 7 days once within a `600px` threshold.
*   **Physics-Centering Loop**: Suspends trackers during programmatical jumps to avoid viewport drift.

### 3. Directed Acyclic Graph (DAG) Dependency Resolver
*   **Deadlock Avoidance Matrix**: Uses recursive Depth-First Search (DFS) to prevent cyclical task locks.
*   **Cascading Rescheduling**: Ripple-updates downstream tasks automatically if upstream milestones move.

### 4. Fluid Mobile-First Architecture
*   Complete UI parity between desktop and mobile. Uses dynamic sliding panels, full-screen overlays, dynamic visibility layout components, and modal-based transitions for task details to ensure complex workspaces and timelines are effortlessly navigable and beautiful on small screens.

### 5. Semantic Human-Readable Mapping & Intelligent Quotas
*   **Natural Referencing**: The backend automatically maps human-readable project and task names (`projectName`, `taskTitle`) to internal database IDs, meaning you never have to recite arbitrary UUIDs to your AI.
*   **Smart Quotas**: Granular AI usage tracking per user guarantees system sustainability, showing a gorgeous "AI Usage" progress bar with dynamic color styling based on usage thresholds.
*   **Task Polish**: The interface features high-end status transitions and strikethroughs for completed items.

---

## 🎨 Material Design Systems (Colors.md)

Showcase Kiro's custom, premium material theme palettes:
*   **Midnight**: Pitch-black base (`#050606`) with graphite-green panels (`#121514`) and a glowing Adapto-emerald accent (`#3ABF92`).
*   **Paper**: Authentic warm paper textures with clay ink. Feels like a physical notebook.
*   **Sage**: Calm earthy tones featuring lichen, moss, bark, and unbleached linen.
*   **Nebula**: Soft, comforting lilac light mode with muted lavender headers designed to alleviate eye strain.
*   **Nightshade**: High-contrast matte charcoal panels (`#101114`) highlighted by a vibrant Electric Indigo (`#5C32FA`) accent.

