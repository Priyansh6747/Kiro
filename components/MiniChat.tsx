"use client";

import { Bot, Maximize2, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/components/ThemeProvider";

interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content?: string;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

const AGENTS = [
  { id: "Yuki", name: "Yuki (Assistant)" },
  { id: "Nova", name: "Nova (Project Agent)" },
  { id: "Quill", name: "Quill (Task Agent)" },
  { id: "Echo", name: "Echo (Preferences Agent)" },
  { id: "Iva", name: "Iva (DayLog Agent)" },
  { id: "Juno", name: "Juno (Planner Agent)" },
  { id: "Zef", name: "Zef (UI Agent)" },
];

export function MiniChat() {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("Yuki");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Thinking...");
  const [pendingToolCalls, setPendingToolCalls] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  if (pathname === "/chat") return null;

  const handleSend = async () => {
    if (!text.trim()) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setText("");
    setLoadingText("Thinking...");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          isMiniChat: true,
          pageContext: pathname,
          selectedAgent,
        }),
      });
      const data = await res.json();

      if (data.messagesTrace) {
        for (const msg of data.messagesTrace) {
          if (msg.role === "tool" && msg.name === "changeTheme") {
            try {
              const resObj = JSON.parse(msg.content);
              if (resObj.success && resObj.theme) setTheme(resObj.theme);
            } catch (e) {}
          }
        }
      }

      if (data.requiresConfirmation) {
        setMessages([
          ...data.messagesTrace.filter((m: any) => m.role !== "system"),
          data.message,
        ]);
        setPendingToolCalls(data.message.tool_calls);
      } else if (data.message) {
        setMessages([
          ...data.messagesTrace.filter((m: any) => m.role !== "system"),
          data.message,
        ]);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error processing request." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const executeTools = async (approved: boolean) => {
    setLoadingText("Running tools...");
    setLoading(true);
    const toolsToProcess = [...pendingToolCalls];
    setPendingToolCalls([]);

    let currentMessages = [...messages];
    if (!approved) {
      const toolMessages: ChatMessage[] = toolsToProcess.map((tc) => ({
        role: "tool" as const,
        tool_call_id: tc.id,
        name: tc.function.name,
        content: JSON.stringify({ error: "User denied." }),
      }));
      currentMessages = [...currentMessages, ...toolMessages];
      setMessages(currentMessages);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages,
          confirmedToolCallIds: approved ? toolsToProcess.map((t) => t.id) : [],
          isMiniChat: true,
          pageContext: pathname,
          selectedAgent,
        }),
      });
      const data = await res.json();

      if (data.messagesTrace) {
        for (const msg of data.messagesTrace) {
          if (msg.role === "tool" && msg.name === "changeTheme") {
            try {
              const resObj = JSON.parse(msg.content);
              if (resObj.success && resObj.theme) setTheme(resObj.theme);
            } catch (e) {}
          }
        }
      }

      if (data.requiresConfirmation) {
        setMessages([
          ...data.messagesTrace.filter((m: any) => m.role !== "system"),
          data.message,
        ]);
        setPendingToolCalls(data.message.tool_calls);
      } else if (data.message) {
        setMessages([
          ...data.messagesTrace.filter((m: any) => m.role !== "system"),
          data.message,
        ]);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error processing request." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 p-4 bg-accent text-white rounded-full shadow-lg hover:bg-accent-hover transition-transform hover:scale-105 z-50 flex items-center justify-center"
        title="Chat with Yuki"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 md:bottom-28 md:right-10 w-80 md:w-96 bg-surface border border-border-default rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border-default bg-surface-raised">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="font-semibold text-primary bg-transparent focus:outline-none cursor-pointer hover:opacity-80 transition-opacity"
              >
                {AGENTS.map((a) => (
                  <option key={a.id} value={a.id} className="font-normal text-base text-primary">
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                className="p-1.5 text-secondary hover:text-primary hover:bg-surface rounded-lg transition-colors"
                title="Open Full Screen Chat"
                onClick={() => setIsOpen(false)}
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-secondary hover:text-primary hover:bg-surface rounded-lg transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 h-96 overflow-y-auto bg-base flex flex-col space-y-4">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                <Bot className="w-10 h-10 text-tertiary mb-3" />
                <p className="text-sm text-secondary">
                  Hi! I'm Yuki. Ask me anything about your projects or agenda!
                </p>
              </div>
            ) : (
              (() => {
                const visibleMessages = messages.filter(
                  (m) => m.role !== "tool",
                );
                const grouped: any[] = [];
                let currentTools: any[] = [];

                for (let i = 0; i < visibleMessages.length; i++) {
                  const m = visibleMessages[i];
                  const isLastMessage = i === visibleMessages.length - 1;
                  const isPending =
                    isLastMessage &&
                    m.tool_calls &&
                    pendingToolCalls.length > 0;

                  if (m.role === "assistant" && m.tool_calls && !isPending) {
                    currentTools.push(...m.tool_calls);
                  } else {
                    grouped.push({ m, isPending, tools: currentTools });
                    currentTools = [];
                  }
                }

                if (currentTools.length > 0) {
                  grouped.push({
                    m: null,
                    isPending: false,
                    tools: currentTools,
                  });
                }

                return grouped.map((group, idx) => {
                  const { m, isPending, tools } = group;

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${!m || m.role !== "user" ? "items-start" : "items-end"}`}
                    >
                      {tools.length > 0 && (
                        <div className="flex flex-row flex-wrap items-center gap-1.5 mb-1 ml-1">
                          {tools.map((tc: any) => (
                            <div
                              key={tc.id}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-accent/10 border border-accent/20 text-[10px] font-semibold text-accent shadow-sm"
                            >
                              <div className="w-1 h-1 rounded-full bg-accent" />
                              {tc.function.name}
                            </div>
                          ))}
                        </div>
                      )}

                      {m && (
                        <div
                          className={`max-w-[90%] p-3 rounded-xl shadow-sm text-sm ${m.role === "user" ? "bg-accent text-white" : "bg-surface-raised border border-border-default text-primary"}`}
                        >
                          {m.content ? (
                            <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-base prose-pre:border prose-pre:border-border-default prose-headings:text-primary prose-a:text-accent prose-strong:text-primary max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {m.content}
                              </ReactMarkdown>
                            </div>
                          ) : m.tool_calls && isPending ? (
                            <div className="flex flex-col gap-2">
                              <span className="font-semibold text-xs">
                                Action Required:
                              </span>
                              <ul className="text-[11px] bg-surface p-1.5 rounded border border-border-subtle font-mono space-y-1 text-primary">
                                {m.tool_calls.map((tc: any) => (
                                  <li key={tc.id}>👉 {tc.function.name}</li>
                                ))}
                              </ul>
                              <div className="flex gap-1.5 mt-1">
                                <button
                                  onClick={() => executeTools(true)}
                                  className="flex-1 py-1 bg-accent text-white rounded text-xs hover:bg-accent-hover transition-colors"
                                >
                                  Allow
                                </button>
                                <button
                                  onClick={() => executeTools(false)}
                                  className="flex-1 py-1 bg-surface border border-border-default text-secondary rounded text-xs transition-colors hover:text-primary"
                                >
                                  Deny
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="p-3 rounded-xl bg-surface-raised border border-border-default text-primary italic opacity-70 flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                  {loadingText}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border-default bg-surface flex gap-2 shrink-0">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={`Message ${selectedAgent}...`}
              className="flex-1 px-3 py-2 bg-surface-raised border border-border-subtle rounded-lg text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || loading}
              className="p-2 bg-accent text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-hover transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
