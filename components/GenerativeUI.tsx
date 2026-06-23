import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, Circle, Clock, TrendingUp, TrendingDown, AlertTriangle, Play, Pause, Square, Calendar, Folder } from "lucide-react";

// --- Subcomponents ---

export interface TableProps {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export function ResponsiveTable({ headers, rows, caption }: TableProps) {
  return (
    <div className="w-full my-4 rounded-xl border border-border-default bg-surface overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-500">
      {caption && (
        <div className="px-4 py-3 bg-surface-raised border-b border-border-default font-semibold text-sm text-primary">
          {caption}
        </div>
      )}
      <div className="overflow-x-auto w-full max-w-full custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
          <thead className="bg-surface-raised text-secondary border-b border-border-default">
            <tr>
              {headers?.map((h, i) => (
                <th key={i} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle text-primary">
            {rows?.map((row, i) => (
              <tr key={i} className="hover:bg-accent/5 transition-colors">
                {row?.map((cell, j) => (
                  <td key={j} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={headers?.length || 1} className="px-4 py-8 text-center text-tertiary italic">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskCard({ data }: { data: any }) {
  const [done, setDone] = useState(data.status === "done");
  return (
    <div className="my-4 p-4 rounded-xl border border-border-default bg-surface shadow-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-start gap-3">
        <button onClick={() => setDone(!done)} className="mt-0.5 text-accent hover:text-accent-hover transition-colors">
          {done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>
        <div className="flex-1">
          <div className={`font-medium ${done ? 'line-through text-tertiary' : 'text-primary'}`}>
            {data.title}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-secondary font-medium">
            {data.projectName && (
              <span className="flex items-center gap-1 bg-surface-raised px-2 py-0.5 rounded border border-border-default">
                <Folder className="w-3 h-3" /> {data.projectName}
              </span>
            )}
            {data.estimateMin && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {data.estimateMin}m
              </span>
            )}
            {data.scheduledDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {data.scheduledDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineView({ data }: { data: any }) {
  let items = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && Array.isArray(data.items)) {
    items = data.items;
  } else if (data && Array.isArray(data.timeline)) {
    items = data.timeline;
  } else if (data && typeof data === 'object') {
    items = [data]; // single item
  }

  return (
    <div className="my-4 rounded-xl border border-border-default bg-surface shadow-sm p-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-sm font-semibold mb-4 text-primary">Schedule Timeline</div>
      {items.length === 0 ? (
        <div className="text-sm text-tertiary italic">No timeline events found.</div>
      ) : (
        <div className="relative border-l-2 border-border-default ml-2 space-y-6">
          {items.map((item: any, i: number) => {
            const timeStr = item.time || item.scheduledDate || "Unknown Time";
            const dur = item.durationMin || item.estimateMin;
            return (
              <div key={i} className="relative pl-6">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-accent ring-4 ring-surface" />
                <div className="text-xs font-mono text-tertiary mb-1">
                  {timeStr} {dur ? `(${dur}m)` : ''}
                </div>
                <div className="font-medium text-sm text-primary">{item.title || "Untitled Event"}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricsChart({ data }: { data: any }) {
  return (
    <div className="my-4 p-4 rounded-xl border border-border-default bg-surface shadow-sm flex items-center justify-between animate-in fade-in zoom-in-95 duration-500">
      <div>
        <div className="text-xs text-secondary font-medium uppercase tracking-wider mb-1">{data.title}</div>
        <div className="text-2xl font-bold text-primary flex items-center gap-2">
          {data.unit === "$" && "$"}
          {data.value}
          {data.unit !== "$" && <span className="text-sm text-tertiary font-medium">{data.unit}</span>}
        </div>
      </div>
      {data.percentage !== undefined && (
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path className="text-border-default" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path className="text-accent" strokeDasharray={`${data.percentage}, 100`} strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
            {data.percentage}%
          </div>
        </div>
      )}
      {data.trend && !data.percentage && (
        <div className={`flex items-center gap-1 text-sm font-medium ${data.trend === 'up' ? 'text-missed' : 'text-done'}`}>
          {data.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        </div>
      )}
    </div>
  );
}

function ConfirmBox({ data }: { data: any }) {
  const [status, setStatus] = useState<"pending" | "confirmed" | "cancelled">("pending");
  
  if (status === "confirmed") return <div className="my-2 text-sm text-done font-medium">✓ Action confirmed</div>;
  if (status === "cancelled") return <div className="my-2 text-sm text-tertiary font-medium">✗ Action cancelled</div>;
  
  return (
    <div className="my-4 p-4 rounded-xl border border-missed/30 bg-missed-subtle shadow-sm animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-missed mt-0.5" />
        <div>
          <div className="font-semibold text-missed mb-1">Confirmation Required</div>
          <div className="text-sm text-primary mb-4">{data.message}</div>
          <div className="flex gap-2">
            <button onClick={() => setStatus("confirmed")} className="px-3 py-1.5 bg-missed text-white text-xs font-medium rounded hover:opacity-90 transition-opacity">
              {data.buttonText || "Confirm"}
            </button>
            <button onClick={() => setStatus("cancelled")} className="px-3 py-1.5 bg-surface border border-border-default text-secondary text-xs font-medium rounded hover:bg-surface-raised transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmartForm({ data }: { data: any }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return <div className="my-2 text-sm text-done font-medium">✓ Form submitted</div>;
  
  return (
    <div className="my-4 p-4 rounded-xl border border-border-default bg-surface shadow-sm animate-in fade-in zoom-in-95 duration-500">
      <div className="text-sm font-semibold mb-4 text-primary">{data.title || "Form"}</div>
      <div className="space-y-3">
        {data.fields?.map((f: any, i: number) => (
          <div key={i}>
            <label className="block text-xs font-medium text-secondary mb-1">{f.label || f.name}</label>
            {f.type === "string" ? (
              <input type="text" className="w-full text-sm px-3 py-1.5 rounded border border-border-default bg-base text-primary focus:outline-none focus:border-accent" />
            ) : (
              <input type="number" className="w-full text-sm px-3 py-1.5 rounded border border-border-default bg-base text-primary focus:outline-none focus:border-accent" />
            )}
          </div>
        ))}
      </div>
      <button onClick={() => setSubmitted(true)} className="mt-4 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors w-full">
        Submit
      </button>
    </div>
  );
}

function LiveTimer({ data }: { data: any }) {
  const [timeLeft, setTimeLeft] = useState((data.durationMin || 25) * 60);
  const [running, setRunning] = useState(false);
  
  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [running, timeLeft]);

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const secs = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <div className="my-4 p-4 rounded-xl border border-accent/30 bg-accent-subtle shadow-sm flex items-center justify-between animate-in fade-in zoom-in-95 duration-500">
      <div>
        <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">{data.label || "Focus Timer"}</div>
        <div className="text-3xl font-mono font-bold text-primary">{mins}:{secs}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setRunning(!running)} className="p-3 bg-accent text-white rounded-full hover:bg-accent-hover transition-colors">
          {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
        </button>
        <button onClick={() => { setRunning(false); setTimeLeft((data.durationMin || 25) * 60); }} className="p-3 bg-surface border border-border-default text-secondary rounded-full hover:bg-surface-raised transition-colors">
          <Square className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// --- Parser ---

export function ContentRenderer({ content, proseClassName }: { content: string, proseClassName?: string }) {
  if (!content) return null;
  const defaultProse = "prose prose-sm md:prose-base prose-p:leading-relaxed prose-pre:bg-base prose-pre:border prose-pre:border-border-default prose-headings:text-primary prose-a:text-accent prose-strong:text-primary max-w-none";
  const className = proseClassName || defaultProse;

  // Regex to find any tag like |-TABLE-|, |-TASK-|, etc.
  const tagRegex = /(\|-([A-Z]+)-\|)/;
  
  const renderPart = (text: string, index: number) => {
    let currentText = text;
    const elements: React.ReactNode[] = [];
    let keyCounter = 0;

    while (currentText) {
      const match = currentText.match(tagRegex);
      
      if (!match) {
        // No more tags, render remaining text
        if (currentText.trim()) {
          elements.push(
            <div key={`${index}-${keyCounter++}`} className={className}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentText}</ReactMarkdown>
            </div>
          );
        }
        break;
      }

      // Render text before the tag
      const preText = currentText.substring(0, match.index);
      if (preText.trim()) {
        elements.push(
          <div key={`${index}-${keyCounter++}`} className={className}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{preText}</ReactMarkdown>
          </div>
        );
      }

      // Now we are at the tag
      const tagString = match[1];
      const tagType = match[2];
      const afterTagIndex = (match.index || 0) + tagString.length;
      const textAfterTag = currentText.substring(afterTagIndex);

      // Find the JSON block after the tag
      let braceCount = 0;
      let jsonEndIndex = -1;
      let inString = false;
      let escape = false;

      // Skip whitespace to find the opening brace
      let jsonStartIndex = -1;
      for (let i = 0; i < textAfterTag.length; i++) {
        const char = textAfterTag[i];
        if (char === "{") {
          jsonStartIndex = i;
          break;
        } else if (char.trim() !== "" && char !== ":") {
          break; // found non-whitespace and non-colon before '{', invalid JSON block
        }
      }

      if (jsonStartIndex !== -1) {
        for (let i = jsonStartIndex; i < textAfterTag.length; i++) {
          const char = textAfterTag[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (char === '\\') {
            escape = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
          }
          if (!inString) {
            if (char === "{") braceCount++;
            else if (char === "}") braceCount--;

            if (braceCount === 0 && char === "}") {
              jsonEndIndex = i;
              break;
            }
          }
        }
      }

      if (jsonEndIndex !== -1) {
        // Successfully found a JSON block
        const jsonStr = textAfterTag.substring(jsonStartIndex, jsonEndIndex + 1);
        try {
          const data = JSON.parse(jsonStr);
          
          let Component: React.ReactNode = null;
          switch (tagType) {
            case "TABLE": Component = <ResponsiveTable {...data} />; break;
            case "TASK": Component = <TaskCard data={data} />; break;
            case "TIMELINE": Component = <TimelineView data={data} />; break;
            case "METRICS":
            case "CHART": Component = <MetricsChart data={data} />; break;
            case "CONFIRM": Component = <ConfirmBox data={data} />; break;
            case "FORM": Component = <SmartForm data={data} />; break;
            case "TIMER": Component = <LiveTimer data={data} />; break;
            default: Component = <div className="p-2 bg-missed-subtle text-missed text-xs rounded border border-missed/30">Unknown Tag: {tagType}</div>;
          }

          elements.push(<React.Fragment key={`${index}-${keyCounter++}`}>{Component}</React.Fragment>);
          
          // Move currentText past the JSON block
          currentText = textAfterTag.substring(jsonEndIndex + 1);
          continue;
        } catch (e) {
          // JSON parsing failed, fallback to treating the tag as text
        }
      }

      // If we got here, we couldn't parse the JSON or didn't find one. Just render the tag as text and move on.
      elements.push(
        <div key={`${index}-${keyCounter++}`} className={className}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{tagString}</ReactMarkdown>
        </div>
      );
      currentText = textAfterTag;
    }

    return <>{elements}</>;
  };

  return <>{renderPart(content, 0)}</>;
}

const streamedMessages = new Set<string>();

export function StreamableContentRenderer({ content, proseClassName, isLast }: { content: string, proseClassName?: string, isLast?: boolean }) {
  const shouldStream = isLast && !streamedMessages.has(content);
  const [visibleLength, setVisibleLength] = useState(shouldStream ? 0 : content.length);

  useEffect(() => {
    if (!shouldStream) {
      setVisibleLength(content.length);
      return;
    }
    
    if (visibleLength >= content.length) {
      streamedMessages.add(content);
      return;
    }

    const charsPerTick = Math.max(2, Math.floor(content.length / 50));
    const timer = setInterval(() => {
      setVisibleLength(prev => {
        const next = prev + charsPerTick;
        if (next >= content.length) {
          clearInterval(timer);
          streamedMessages.add(content);
          return content.length;
        }
        return next;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [content, visibleLength, shouldStream]);

  // Ensure that if content changes entirely, we reset (though shouldn't happen often)
  useEffect(() => {
    if (!shouldStream) setVisibleLength(content.length);
  }, [content, shouldStream]);

  return <ContentRenderer content={content.substring(0, visibleLength)} proseClassName={proseClassName} />;
}
