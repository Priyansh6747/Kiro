import { TypeBadge } from "@/components/ui";
import { formatTimestamp, type Project } from "@/lib/types";
import { ProjectSparkline } from "./ProjectSparkline";
import { useState, useEffect } from "react";
import { Pencil, X } from "lucide-react";
import { updateProject } from "@/lib/api-client";

export function ProjectHeader({
  project,
  onBack,
  activityData,
  onProjectUpdated,
}: {
  project: Project;
  onBack?: () => void;
  activityData: any[];
  onProjectUpdated?: (p: Project) => void;
}) {
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editDeadlineDate, setEditDeadlineDate] = useState(() =>
    project.deadlineAt
      ? new Date(project.deadlineAt * 1000).toISOString().split("T")[0]
      : "",
  );

  useEffect(() => {
    setEditDeadlineDate(
      project.deadlineAt
        ? new Date(project.deadlineAt * 1000).toISOString().split("T")[0]
        : "",
    );
    setIsEditingDeadline(false);
  }, [project]);

  const handleSaveDeadline = async (dateStr: string) => {
    let ts: number | null = null;
    if (dateStr) {
      const [year, month, day] = dateStr.split("-");
      ts = Math.floor(
        new Date(Number(year), Number(month) - 1, Number(day)).getTime() / 1000,
      );
    }
    setEditDeadlineDate(dateStr);
    try {
      const updated = await updateProject(project.id, { deadline_at: ts });
      if (onProjectUpdated) {
        onProjectUpdated(updated);
      }
    } catch (e) {
      console.error(e);
    }
    setIsEditingDeadline(false);
  };

  return (
    <div className="flex items-start lg:items-center justify-between border-b border-border-default bg-surface px-6 py-6 shrink-0">
      <div className="flex flex-col">
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs font-semibold text-accent hover:underline mb-3 self-start"
          >
            ← Back to Projects
          </button>
        )}
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold text-primary tracking-tight">
            {project.name}
          </h1>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs rounded-md bg-[#EBF5FF] text-[#1D4ED8] dark:bg-blue-900/40 dark:text-blue-300 font-semibold tracking-wide border border-blue-200 dark:border-blue-800/50">
              Priority P{project.importance}
            </span>
            <TypeBadge type={project.type} />
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm text-secondary font-medium mt-1 leading-snug">
          <div>
            Created At <br />
            {formatTimestamp(project.createdAt)}
          </div>
          <div className="w-px h-8 bg-border-default"></div>
          <div>
            Deadline <br />
            {isEditingDeadline ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="date"
                  value={editDeadlineDate}
                  onChange={(e) => handleSaveDeadline(e.target.value)}
                  className="bg-surface-raised border border-border-strong rounded px-2 py-0.5 text-xs text-primary focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => setIsEditingDeadline(false)}
                  className="p-0.5 rounded text-tertiary hover:text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 group cursor-pointer -ml-1 p-1 rounded hover:bg-surface-raised transition-colors inline-flex mt-0.5"
                onClick={() => setIsEditingDeadline(true)}
              >
                <span className="text-primary font-semibold">
                  {project.deadlineAt
                    ? formatTimestamp(project.deadlineAt)
                    : "No Deadline"}
                </span>
                <div className="opacity-0 group-hover:opacity-100 text-tertiary transition-opacity">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ProjectSparkline activityData={activityData} />
    </div>
  );
}
