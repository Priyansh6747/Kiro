import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface TableProps {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export function ResponsiveTable({ headers, rows, caption }: TableProps) {
  return (
    <div className="w-full my-4 rounded-xl border border-border-default bg-surface overflow-hidden shadow-sm">
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

export function ContentRenderer({ content, proseClassName }: { content: string, proseClassName?: string }) {
  if (!content) return null;
  const defaultProse = "prose prose-sm md:prose-base prose-p:leading-relaxed prose-pre:bg-base prose-pre:border prose-pre:border-border-default prose-headings:text-primary prose-a:text-accent prose-strong:text-primary max-w-none";
  const className = proseClassName || defaultProse;

  if (!content.includes("|-TABLE-|")) {
    return (
      <div className={className}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  const parts = content.split("|-TABLE-|");
  return (
    <>
      {parts.map((part, index) => {
        if (index === 0) {
          return part.trim() ? (
            <div key={index} className={className}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>
            </div>
          ) : null;
        }

        let braceCount = 0;
        let jsonEndIndex = -1;
        let inString = false;
        let escape = false;

        for (let i = 0; i < part.length; i++) {
          const char = part[i];
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

        if (jsonEndIndex !== -1) {
          const jsonStr = part.substring(0, jsonEndIndex + 1);
          const remainingStr = part.substring(jsonEndIndex + 1);
          try {
            const tableData = JSON.parse(jsonStr);
            return (
              <React.Fragment key={index}>
                <ResponsiveTable {...tableData} />
                {remainingStr.trim() && (
                  <div className={className}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{remainingStr}</ReactMarkdown>
                  </div>
                )}
              </React.Fragment>
            );
          } catch (e) {
            // Fallback to text
          }
        }

        return (
          <div key={index} className={className}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{"|-TABLE-|" + part}</ReactMarkdown>
          </div>
        );
      })}
    </>
  );
}
