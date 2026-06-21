import { ProgressBar } from "@/components/ui";

export function ProjectProgressBar({ pct }: { pct: number }) {
  return (
    <div className="bg-surface px-6 py-3 border-b border-border-default shrink-0">
      <ProgressBar value={pct} />
    </div>
  );
}
