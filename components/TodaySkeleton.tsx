export function TodaySkeleton() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-base h-full w-full">
      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-border-default flex flex-col p-6 bg-surface shrink-0">
          <div className="h-6 w-32 bg-border-default animate-pulse rounded mb-6"></div>
          <div className="space-y-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col">
                <div className="h-4 w-40 bg-border-default animate-pulse rounded mb-2"></div>
                <div className="h-3 w-12 bg-border-default animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-surface relative p-6">
          <div className="h-full w-full border-l-2 border-border-default relative">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute left-0 w-full flex items-center"
                style={{ top: `${i * 20}%` }}
              >
                <div className="w-4 h-px bg-border-default absolute -left-2"></div>
                <div className="ml-4 h-16 w-3/4 bg-border-default animate-pulse rounded-md"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
