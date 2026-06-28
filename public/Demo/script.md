# Generative UI Components

List of all supported `<ui:TAG>` components in `components/GenerativeUI.tsx`:
1. `TABLE` (`<ui:table>`): Renders a responsive table.
2. `TASK` (`<ui:task>`): Displays a task card with status, estimate, etc.
3. `TIMELINE` (`<ui:timeline>`): Shows a vertical schedule timeline of events.
4. `METRICS` (`<ui:metrics>` or `<ui:chart>`): Displays a metric card with value, unit, trend, and percentage ring.
5. `CONFIRM` (`<ui:confirm>`): Shows a confirmation dialog for destructive/important actions.
6. `FORM` (`<ui:form>`): Generic smart form for structured data input.
7. `TIMER` (`<ui:timer>`): A live counting-down focus timer.
8. `PLANNING-FORM` (`<ui:planning-form>`): Project intake/planning form.
9. `AI-QUESTIONS` (`<ui:ai-questions>`): Question prompt component for AI clarifications.
10. `ARTIFACT-PREVIEW` (`<ui:artifact-preview>`): Renders an artifact/document preview.
11. `TASK-GRAPH` (`<ui:task-graph>`): Visualizes task dependencies in stages.
12. `TASK-MANAGER` (`<ui:task-manager>`): Advanced list/kanban view for complex project stages.
13. `SCHEDULING-FLOW` (`<ui:scheduling-flow>`): Multi-phase scheduling tool flow.

# Conversation Script Flow
1. **User**: "Yuki, give me a status update on Kiro."
2. **Yuki (Assistant)**: "Here is your dashboard for today. You are doing well, keep it up." [Show `METRICS` and `TABLE`]
3. **User**: "Okay, I want to plan the marketing launch."
4. **Sage (Assistant)**: "Let's structure this project. Fill this out so I know what we're dealing with." [Show `PLANNING-FORM`]
5. **User**: "Done."
6. **Sage (Assistant)**: "Great. I have a few clarifying questions about the scope." [Show `AI-QUESTIONS`]
7. **User**: "Answered. Can you draft the project spec?"
8. **Sage (Assistant)**: "Here is the drafted spec." [Show `ARTIFACT-PREVIEW`]
9. **User**: "Looks good. Break it down into tasks."
10. **Sage (Assistant)**: "I've generated the task dependency graph." [Show `TASK-GRAPH` and `TASK-MANAGER`]
11. **User**: "Let's schedule the first few tasks for today."
12. **Sage (Assistant)**: "Launching the scheduling engine." [Show `SCHEDULING-FLOW`]
13. **Juno (Assistant)**: "I've added them to your timeline. Here is the agenda and the first task." [Show `TIMELINE` and `TASK`]
14. **User**: "Wait, I also need to update my personal preferences."
15. **Echo (Assistant)**: "Sure, you can update your settings here." [Show `FORM`]
16. **User**: "Time for deep work."
17. **Yuki (Assistant)**: "Focus time. Don't slack off." [Show `TIMER`]
18. **User**: "I think I want to completely archive the old legacy project."
19. **Yuki (Assistant)**: "Whoa. That's a big move. Are you sure?" [Show `CONFIRM`]
