"use client";

import {
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  Filter,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import {
  CreateProjectForm,
  EmptyState,
  ErrorBanner,
  LoadingScreen,
  TypeBadge,
} from "@/components/ui";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";
import {
  archiveProject,
  listProjects,
  listTasks,
  updateProject,
} from "@/lib/api-client";
import type { Project, Task } from "@/lib/types";
import { formatTimestamp } from "@/lib/types";

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  taskCount,
  doneCount,
  activity,
  onClick,
  isSelected,
}: {
  project: Project;
  taskCount: number;
  doneCount: number;
  activity: { day: number; completed: number }[];
  onClick: () => void;
  isSelected: boolean;
}) {
  const pct = taskCount > 0 ? (doneCount / taskCount) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 lg:p-5 transition-all flex items-center justify-between gap-3 lg:gap-4 ${
        isSelected
          ? "border-accent bg-surface-raised shadow-sm ring-1 ring-accent/10"
          : "border-border-default bg-surface hover:border-border-strong hover:shadow-sm"
      }`}
    >
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <p className="font-semibold text-primary text-base lg:text-lg truncate tracking-tight">
            {project.name}
          </p>
          <div className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-tertiary px-1.5 py-0.5 bg-surface-raised border border-border-subtle rounded-full uppercase tracking-wider">
            <span>P{project.importance}</span>
          </div>
          <div className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-tertiary px-1.5 py-0.5 bg-surface-raised border border-border-subtle rounded-full uppercase tracking-wider">
            <span>{project.type}</span>
          </div>
        </div>
        <p className="text-xs text-secondary font-medium">
          {project.deadlineAt
            ? `Deadline: ${formatTimestamp(project.deadlineAt)}`
            : `Created at: ${formatTimestamp(project.createdAt)}`}
        </p>
      </div>

      <div className="flex items-center gap-3 lg:gap-8 shrink-0 pl-2 lg:pl-4 border-l border-border-subtle">
        {/* Sparkline */}
        {activity &&
        activity.length > 0 &&
        activity.some((a) => a.completed > 0) ? (
          <div className="h-6 w-16 sm:h-8 sm:w-20 lg:h-10 lg:w-28 shrink-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={1}
              minHeight={1}
            >
              <LineChart data={activity}>
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="var(--status-done)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-6 w-16 sm:h-8 sm:w-20 lg:h-10 lg:w-28 shrink-0 items-center justify-center">
            <span className="text-[8px] lg:text-[10px] text-tertiary uppercase tracking-wider font-semibold">
              No Activity
            </span>
          </div>
        )}

        {/* Circular Progress */}
        <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              className="stroke-border-subtle"
              strokeWidth="2.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              className="stroke-done transition-all duration-500 ease-in-out"
              strokeWidth="2.5"
              strokeDasharray="94.248"
              strokeDashoffset={94.248 - (pct / 100) * 94.248}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[9px] lg:text-[10px] font-bold text-primary">
              {Math.round(pct)}%
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Project Details Pane ──────────────────────────────────────────────────────

function ProjectDetails({
  project,
  onOpenWorkspace,
  onUpdateProject,
  onArchiveProject,
}: {
  project: Project;
  onOpenWorkspace: () => void;
  onUpdateProject: (
    id: string,
    updates: Parameters<typeof updateProject>[1],
  ) => Promise<void>;
  onArchiveProject: (id: string) => Promise<void>;
}) {
  const { confirm, ConfirmModal } = useConfirm();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(project.name);

  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editDeadlineDate, setEditDeadlineDate] = useState(() =>
    project.deadlineAt
      ? new Date(project.deadlineAt * 1000).toISOString().split("T")[0]
      : "",
  );

  const [isEditingType, setIsEditingType] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);

  useEffect(() => {
    setEditName(project.name);
    setEditDeadlineDate(
      project.deadlineAt
        ? new Date(project.deadlineAt * 1000).toISOString().split("T")[0]
        : "",
    );
    setIsEditingName(false);
    setIsEditingDeadline(false);
    setIsEditingType(false);
    setIsEditingPriority(false);
  }, [project]);

  const handleSaveName = async () => {
    if (editName.trim() !== "" && editName !== project.name) {
      await onUpdateProject(project.id, { name: editName });
    }
    setIsEditingName(false);
  };

  const handleSaveDeadline = async (dateStr: string) => {
    let ts: number | null = null;
    if (dateStr) {
      // Create a Date object in local time and convert to unix timestamp
      const [year, month, day] = dateStr.split("-");
      ts = Math.floor(
        new Date(Number(year), Number(month) - 1, Number(day)).getTime() / 1000,
      );
    }
    setEditDeadlineDate(dateStr);
    await onUpdateProject(project.id, { deadline_at: ts });
    setIsEditingDeadline(false);
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm(
      "Archive Project",
      "Are you sure you want to archive this project? It will be removed from your active list.",
    );
    if (isConfirmed) {
      await onArchiveProject(project.id);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-slide-left h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className="w-full text-xl lg:text-2xl font-bold bg-surface-raised border border-border-strong rounded px-2 py-1 text-primary focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleSaveName}
                className="p-1.5 rounded bg-surface-raised border border-border-default hover:text-status-done text-primary"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  setEditName(project.name);
                }}
                className="p-1.5 rounded bg-surface-raised border border-border-default hover:text-status-missed text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 group cursor-pointer -ml-2 p-2 rounded hover:bg-surface-raised transition-colors"
              onClick={() => setIsEditingName(true)}
            >
              <h3 className="text-xl lg:text-2xl font-bold text-primary tracking-tight">
                {project.name}
              </h3>
              <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-tertiary transition-opacity">
                <Pencil className="w-4 h-4" />
              </div>
            </div>
          )}
          <p className="text-xs lg:text-sm text-secondary mt-1 lg:mt-1.5">
            Project details and meta information
          </p>
        </div>

        <button
          onClick={handleDelete}
          className="p-2 text-tertiary hover:text-status-missed hover:bg-surface-raised rounded-full transition-colors flex-shrink-0"
          title="Delete Project"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 lg:space-y-5 flex-1">
        <div className="flex flex-col gap-1.5 pb-4 lg:pb-5 border-b border-border-subtle">
          <span className="text-[10px] lg:text-[11px] text-tertiary uppercase tracking-widest font-bold">
            Type
          </span>
          {isEditingType ? (
            <div className="flex items-center gap-2 mt-1">
              <select
                value={project.type}
                onChange={async (e) => {
                  await onUpdateProject(project.id, {
                    type: e.target.value as any,
                  });
                  setIsEditingType(false);
                }}
                className="bg-surface-raised border border-border-strong rounded px-2 py-1 text-sm text-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="critical">Critical</option>
                <option value="recurring">Recurring</option>
                <option value="habit">Habit</option>
                <option value="nicetohave">Nice to have</option>
              </select>
              <button
                onClick={() => setIsEditingType(false)}
                className="p-1 rounded text-tertiary hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 group mt-1 cursor-pointer -ml-2 p-2 rounded hover:bg-surface-raised transition-colors inline-flex"
              onClick={() => setIsEditingType(true)}
            >
              <TypeBadge type={project.type} />
              <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-tertiary transition-opacity">
                <Pencil className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 pb-4 lg:pb-5 border-b border-border-subtle">
          <span className="text-[10px] lg:text-[11px] text-tertiary uppercase tracking-widest font-bold">
            Priority
          </span>
          {isEditingPriority ? (
            <div className="flex items-center gap-2 mt-1">
              <select
                value={project.importance}
                onChange={async (e) => {
                  await onUpdateProject(project.id, {
                    importance: Number(e.target.value),
                  });
                  setIsEditingPriority(false);
                }}
                className="bg-surface-raised border border-border-strong rounded px-2 py-1 text-sm text-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value={1}>1 (Lowest)</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5 (Highest)</option>
              </select>
              <button
                onClick={() => setIsEditingPriority(false)}
                className="p-1 rounded text-tertiary hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 group mt-1 cursor-pointer -ml-2 p-2 rounded hover:bg-surface-raised transition-colors inline-flex"
              onClick={() => setIsEditingPriority(true)}
            >
              <div className="flex items-center">
                <span className="text-base lg:text-lg text-primary font-semibold">
                  {project.importance}
                </span>
                <span className="text-xs lg:text-sm text-tertiary ml-1">
                  / 5
                </span>
              </div>
              <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-tertiary transition-opacity">
                <Pencil className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 pb-4 lg:pb-5 border-b border-border-subtle">
          <span className="text-[10px] lg:text-[11px] text-tertiary uppercase tracking-widest font-bold">
            Deadline
          </span>

          {isEditingDeadline ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="date"
                value={editDeadlineDate}
                onChange={(e) => handleSaveDeadline(e.target.value)}
                className="bg-surface-raised border border-border-strong rounded px-2 py-1 text-sm text-primary focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => setIsEditingDeadline(false)}
                className="p-1 rounded text-tertiary hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 group mt-1 cursor-pointer -ml-2 p-2 rounded hover:bg-surface-raised transition-colors inline-flex"
              onClick={() => setIsEditingDeadline(true)}
            >
              <span className="text-sm lg:text-base text-primary font-semibold">
                {project.deadlineAt
                  ? formatTimestamp(project.deadlineAt)
                  : "No Deadline"}
              </span>
              <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-tertiary transition-opacity">
                <Pencil className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 pb-4 lg:pb-5 border-b border-border-subtle">
          <span className="text-[10px] lg:text-[11px] text-tertiary uppercase tracking-widest font-bold">
            Created At
          </span>
          <span className="text-sm lg:text-base text-primary font-semibold">
            {formatTimestamp(project.createdAt)}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-4 pb-4">
        <button
          onClick={onOpenWorkspace}
          className="w-full py-3 rounded-xl bg-surface-raised border border-border-default text-primary font-semibold hover:bg-accent hover:text-white hover:border-accent transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Open Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <ConfirmModal />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskStats, setTaskStats] = useState<
    Record<
      string,
      {
        total: number;
        done: number;
        activity: { day: number; completed: number }[];
      }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "deadline" | "created" | "priority"
  >("created");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projs = await listProjects();
      setProjects(projs);

      // Load task stats per project concurrently
      const statsEntries = await Promise.all(
        projs.map(async (p) => {
          const tasks = await listTasks({ project_id: p.id });

          const now = new Date();
          const todayStart =
            new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            ).getTime() / 1000;
          const activity = [];
          for (let i = 13; i >= 0; i--) {
            const dayStart = todayStart - i * 86400;
            const dayEnd = dayStart + 86400;
            const completed = tasks.filter(
              (t) =>
                t.status === "done" &&
                t.completedAt &&
                t.completedAt >= dayStart &&
                t.completedAt < dayEnd,
            ).length;
            activity.push({ day: i, completed });
          }

          return [
            p.id,
            {
              total: tasks.length,
              done: tasks.filter((t) => t.status === "done").length,
              activity,
            },
          ] as const;
        }),
      );
      setTaskStats(Object.fromEntries(statsEntries));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side Elastic Search & Filter
  const filteredAndSortedProjects = useMemo(() => {
    let result = projects.filter((p) => !p.isDefault);

    // 1. Filter by Type
    if (filterType !== "all") {
      result = result.filter((p) => p.type === filterType);
    }

    // 2. Search by Name
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    // 3. Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "priority":
          cmp = b.importance - a.importance; // higher priority first by default
          break;
        case "deadline": {
          const deadlineA = a.deadlineAt ?? Infinity;
          const deadlineB = b.deadlineAt ?? Infinity;
          cmp = deadlineA - deadlineB;
          break;
        }
        case "created":
        default:
          cmp = b.createdAt - a.createdAt; // newest first by default
          break;
      }
      return sortAsc ? -cmp : cmp;
    });

    return result;
  }, [projects, filterType, searchQuery, sortBy, sortAsc]);

  if (loading) return <LoadingScreen message="Loading projects…" />;
  if (error)
    return (
      <div className="p-4">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );

  if (showWorkspace && selectedProject) {
    return (
      <ProjectWorkspace
        project={selectedProject}
        allProjects={projects}
        onBack={() => setShowWorkspace(false)}
        onProjectUpdated={(p) => {
          setProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
          setSelectedProject(p);
        }}
        onProjectArchived={(id) => {
          setProjects((prev) => prev.filter((x) => x.id !== id));
          setSelectedProject(null);
          setShowWorkspace(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-base overflow-hidden relative">
      {/* Header Toolbar */}
      <div
        className={`flex-col lg:flex-row items-start lg:items-center justify-between px-4 lg:px-8 py-4 lg:py-5 border-b border-border-default bg-surface shrink-0 gap-4 ${selectedProject ? "hidden lg:flex" : "flex"}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6 w-full lg:w-auto">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              Projects
            </h1>
            <button
              onClick={() => setShowCreate(true)}
              className="sm:hidden rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <span>+ New</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative flex items-center w-full sm:w-auto">
              <Search className="absolute left-3 w-4 h-4 text-tertiary" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full lg:w-64 text-sm bg-surface-raised border border-border-default rounded-full focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-primary transition-all placeholder:text-tertiary"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 bg-surface-raised p-1 rounded-full border border-border-default w-full sm:w-auto overflow-x-auto no-scrollbar">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-2 lg:pl-3 pr-6 py-1.5 text-xs lg:text-sm bg-transparent border-none focus:outline-none text-primary cursor-pointer font-medium"
              >
                <option value="all">All Types</option>
                <option value="critical">Critical</option>
                <option value="recurring">Recurring</option>
                <option value="habit">Habit</option>
                <option value="nicetohave">Nice to have</option>
              </select>
              <div className="w-px h-4 bg-border-strong mx-1 shrink-0"></div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="pl-2 lg:pl-3 pr-6 py-1.5 text-xs lg:text-sm bg-transparent border-none focus:outline-none text-primary cursor-pointer font-medium"
              >
                <option value="created">Sort: Created</option>
                <option value="deadline">Sort: Deadline</option>
                <option value="priority">Sort: Priority</option>
                <option value="name">Sort: Name</option>
              </select>
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="p-1.5 mx-1 shrink-0 text-tertiary hover:text-primary hover:bg-surface transition-all rounded-full"
                title={sortAsc ? "Ascending" : "Descending"}
              >
                <Filter
                  className={`w-3 h-3 lg:w-4 lg:h-4 ${sortAsc ? "rotate-180" : ""} transition-transform duration-300`}
                />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="hidden sm:flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity items-center gap-2 shrink-0"
        >
          <span>+ New Project</span>
        </button>
      </div>

      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left List */}
        <div
          className={`flex-1 overflow-y-auto p-4 lg:p-8 lg:pr-4 space-y-3 lg:space-y-4`}
        >
          {filteredAndSortedProjects.length > 0 ? (
            filteredAndSortedProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                taskCount={taskStats[p.id]?.total ?? 0}
                doneCount={taskStats[p.id]?.done ?? 0}
                activity={taskStats[p.id]?.activity ?? []}
                isSelected={selectedProject?.id === p.id}
                onClick={() => setSelectedProject(p)}
              />
            ))
          ) : (
            <div className="pt-20">
              <EmptyState
                icon="🔍"
                title="No projects found"
                description={
                  searchQuery
                    ? "Try adjusting your search or filters."
                    : "Create your first project using '+ New Project'."
                }
              />
            </div>
          )}
        </div>

        {/* Right Details Pane - Mobile Overlay or Desktop Split */}
        <div
          className={`
            fixed inset-0 z-50 flex flex-col bg-surface shadow-2xl transition-transform duration-300
            lg:relative lg:z-auto lg:w-[420px] lg:shrink-0 lg:border-l lg:border-border-default lg:shadow-[-4px_0_24px_rgba(0,0,0,0.02)] lg:translate-x-0
            ${selectedProject ? "translate-x-0" : "translate-x-full lg:flex"}
          `}
        >
          {/* Mobile Header for Details */}
          <div className="flex lg:hidden px-4 py-4 border-b border-border-default bg-surface items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-tertiary uppercase tracking-widest">
              Details
            </h2>
            <button
              onClick={() => setSelectedProject(null)}
              className="p-2 -mr-2 rounded-full hover:bg-surface-raised text-secondary hover:text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden lg:block px-8 py-6 border-b border-border-default bg-surface shrink-0">
            <h2 className="text-sm font-bold text-tertiary uppercase tracking-widest">
              Details
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            {selectedProject ? (
              <ProjectDetails
                project={selectedProject}
                onOpenWorkspace={() => setShowWorkspace(true)}
                onUpdateProject={async (id, updates) => {
                  try {
                    const updated = await updateProject(id, updates);
                    setProjects((prev) =>
                      prev.map((p) => (p.id === id ? updated : p)),
                    );
                    setSelectedProject(updated);
                    showToast("Project updated successfully");
                  } catch (err: any) {
                    showToast(
                      `Failed to update project: ${err.message}`,
                      "error",
                    );
                  }
                }}
                onArchiveProject={async (id) => {
                  try {
                    await archiveProject(id);
                    setProjects((prev) => prev.filter((p) => p.id !== id));
                    setSelectedProject(null);
                    showToast("Project archived successfully");
                  } catch (err: any) {
                    showToast(
                      `Failed to archive project: ${err.message}`,
                      "error",
                    );
                  }
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-5 opacity-70">
                <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center border border-border-default">
                  <Search className="w-8 h-8 text-tertiary" />
                </div>
                <div>
                  <p className="text-lg text-primary font-semibold tracking-tight">
                    No project selected
                  </p>
                  <p className="text-sm text-tertiary mt-1.5 font-medium">
                    Select a project to see details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateProjectForm
          onCreated={(p) => {
            setProjects((prev) => [p, ...prev]);
            setTaskStats((prev) => ({
              ...prev,
              [p.id]: { total: 0, done: 0, activity: [] },
            }));
            setShowCreate(false);
            setSelectedProject(p);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
