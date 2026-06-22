import { Line, LineChart, ResponsiveContainer } from "recharts";

export function ProjectSparkline({ activityData }: { activityData: any[] }) {
  return (
    <div className="h-16 w-64 shrink-0 hidden md:block">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={1}
      >
        <LineChart data={activityData}>
          <Line
            type="monotone"
            dataKey="completed"
            stroke="var(--status-done)"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
