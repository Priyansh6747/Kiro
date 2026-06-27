export function TodaySkeleton() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-base h-full w-full">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-border-default flex flex-col p-6 bg-surface shrink-0 hidden md:flex">
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

export function TodoSkeleton() {
  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-4xl mx-auto p-4 md:p-8">
      <div className="h-8 w-48 bg-border-default animate-pulse rounded mb-8"></div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border border-border-default rounded-lg bg-surface">
            <div className="w-5 h-5 rounded-full bg-border-default animate-pulse shrink-0"></div>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-2/3 bg-border-default animate-pulse rounded"></div>
              <div className="h-3 w-1/4 bg-border-default animate-pulse rounded"></div>
            </div>
            <div className="h-8 w-8 bg-border-default animate-pulse rounded shrink-0"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectsSkeleton() {
  return (
    <div className="flex flex-col flex-1 h-full w-full p-4 md:p-8">
      <div className="h-8 w-48 bg-border-default animate-pulse rounded mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col p-6 border border-border-default rounded-xl bg-surface h-48">
            <div className="h-6 w-1/2 bg-border-default animate-pulse rounded mb-4"></div>
            <div className="h-4 w-full bg-border-default animate-pulse rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-border-default animate-pulse rounded mb-auto"></div>
            <div className="flex justify-between items-end mt-4">
              <div className="h-4 w-1/4 bg-border-default animate-pulse rounded"></div>
              <div className="h-8 w-8 rounded-full bg-border-default animate-pulse shrink-0"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HabitsSkeleton() {
  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-5xl mx-auto p-4 md:p-8">
      <div className="h-8 w-48 bg-border-default animate-pulse rounded mb-8"></div>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 border border-border-default rounded-xl bg-surface p-6 flex flex-col gap-4">
              <div className="h-6 w-1/3 bg-border-default animate-pulse rounded"></div>
              <div className="flex-1 flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                  <div key={j} className="flex-1 bg-border-default animate-pulse rounded-md"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="flex flex-col flex-1 h-full w-full p-4 md:p-8 max-w-7xl mx-auto">
      <div className="h-8 w-48 bg-border-default animate-pulse rounded mb-8"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 border border-border-default rounded-xl bg-surface p-6 flex flex-col justify-center gap-4">
            <div className="h-4 w-1/2 bg-border-default animate-pulse rounded"></div>
            <div className="h-10 w-1/3 bg-border-default animate-pulse rounded"></div>
          </div>
        ))}
      </div>
      <div className="h-96 border border-border-default rounded-xl bg-surface p-6 flex flex-col gap-4">
        <div className="h-6 w-1/4 bg-border-default animate-pulse rounded"></div>
        <div className="flex-1 bg-border-default animate-pulse rounded"></div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-3xl mx-auto p-4 md:p-8">
      <div className="h-8 w-48 bg-border-default animate-pulse rounded mb-8"></div>
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-border-default rounded-xl bg-surface p-6 flex flex-col gap-4">
            <div className="h-6 w-1/4 bg-border-default animate-pulse rounded"></div>
            <div className="h-4 w-3/4 bg-border-default animate-pulse rounded"></div>
            <div className="h-10 w-full bg-border-default animate-pulse rounded mt-2"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
