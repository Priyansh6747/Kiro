export function ProjectProgressBar({
  donePct,
  readyPct,
  lockedPct,
}: {
  donePct: number;
  readyPct: number;
  lockedPct: number;
}) {
  return (
    <div className="bg-surface px-6 py-3 border-b border-border-default shrink-0 flex flex-col justify-center">
      <div className="h-1.5 rounded-full bg-surface-raised w-full overflow-hidden flex">
        <div
          className="h-full transition-all"
          style={{ width: `${donePct}%`, backgroundColor: "var(--status-done)" }}
          title={`Done: ${Math.round(donePct)}%`}
        />
        <div
          className="h-full transition-all"
          style={{ width: `${readyPct}%`, backgroundColor: "var(--node-ready)" }}
          title={`Ready: ${Math.round(readyPct)}%`}
        />
        <div
          className="h-full transition-all"
          style={{ width: `${lockedPct}%`, backgroundColor: "var(--border-strong)" }}
          title={`Locked: ${Math.round(lockedPct)}%`}
        />
      </div>
    </div>
  );
}
