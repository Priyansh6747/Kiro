import { TypeBadge } from "@/components/ui";
import { formatTimestamp, type Project } from "@/lib/types";
import { ProjectSparkline } from "./ProjectSparkline";

export function ProjectHeader({
  project,
  onBack,
  activityData,
}: {
  project: Project;
  onBack?: () => void;
  activityData: any[];
}) {
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
        <div className="text-sm text-secondary font-medium mt-1 leading-snug">
          Created At <br />
          {formatTimestamp(project.createdAt)}
        </div>
      </div>
      <ProjectSparkline activityData={activityData} />
    </div>
  );
}
