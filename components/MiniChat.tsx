"use client";

import { Bot, Maximize2, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@/components/ThemeProvider";
import { ContentRenderer, StreamableContentRenderer } from "@/components/GenerativeUI";
import { useToast } from "@/hooks/useToast";

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
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    const cursorPosition = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    const lastAtMatch = textBeforeCursor.match(/@([a-zA-Z]*)$/);
    if (lastAtMatch) {
      setMentionFilter(lastAtMatch[1].toLowerCase());
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (agentId: string) => {
    const cursorPosition = inputRef.current?.selectionStart || text.length;
    const textBeforeCursor = text.slice(0, cursorPosition);
    const textAfterCursor = text.slice(cursorPosition);
    
    const newTextBefore = textBeforeCursor.replace(/@([a-zA-Z]*)$/, `@${agentId} `);
    setText(newTextBefore + textAfterCursor);
    setShowMentionMenu(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newTextBefore.length, newTextBefore.length);
      }
    }, 0);
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Thinking...");
  const [streamingAgents, setStreamingAgents] = useState<{agentName: string; snarkyComment?: string}[]>([]);
  const { showToast } = useToast();
  const [pendingToolCalls, setPendingToolCalls] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  if (pathname === "/chat") return null;

  const consumeSseStream = async (
    fetchBody: object,
    baseMessages: ChatMessage[],
  ) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fetchBody),
    });

    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let currentMessages: ChatMessage[] = [...baseMessages];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";

      for (const frame of frames) {
        const eventMatch = frame.match(/^event: (\S+)/);
        const dataMatch = frame.match(/^data: (.+)$/m);
        if (!eventMatch || !dataMatch) continue;

        const event = eventMatch[1];
        let payload: any;
        try {
          payload = JSON.parse(dataMatch[1]);
        } catch {
          continue;
        }

        switch (event) {
          case "yuki_comment": {
            const yukiMsg: ChatMessage = {
              role: "assistant",
              content: payload.content,
              name: "Yuki",
            };
            currentMessages = [...currentMessages, yukiMsg];
            setMessages([...currentMessages]);
            break;
          }

          case "agent_start":
            setStreamingAgents((prev) => [...prev, { agentName: payload.agentName }]);
            setLoadingText(`${payload.agentName} is thinking...`);
            break;

          case "agent_tool_call":
            setLoadingText(`${payload.agentName}: ${payload.toolName}...`);
            break;

          case "agent_response": {
            const agentMsg: ChatMessage = { ...payload.message, role: "assistant" };
            currentMessages = [...currentMessages, agentMsg];
            setMessages([...currentMessages]);
            setStreamingAgents((prev) => prev.filter((a) => a.agentName !== payload.agentName));
            break;
          }

          case "tool_call":
            setLoadingText(`Running ${payload.toolName}...`);
            break;

          case "theme_change":
            setTheme(payload.theme);
            break;

          case "requires_confirmation":
            setMessages([
              ...payload.messagesTrace.filter((m: any) => m.role !== "system"),
              payload.message,
            ]);
            setPendingToolCalls(payload.message.tool_calls);
            setStreamingAgents([]);
            break;

          case "done": {
            const visibleFromTrace = (payload.messagesTrace ?? []).filter(
              (m: any) =>
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string" &&
                m.content.trim() !== "",
            );
            const finalMsg = payload.message;
            setMessages(finalMsg ? [...visibleFromTrace, finalMsg] : visibleFromTrace);
            setStreamingAgents([]);
            break;
          }

          case "error": {
            const errMsg = payload.error ?? "Unknown error";
            if (payload.statusCode === 429 || errMsg === "Quota exceeded") {
              showToast("Daily usage quota exceeded. Please try again tomorrow.", "error");
            } else {
              showToast(`Error: ${errMsg}`, "error");
            }
            setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}` }]);
            setStreamingAgents([]);
            break;
          }
        }
      }
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setText("");
    setShowMentionMenu(false);
    setLoadingText("Thinking...");
    setStreamingAgents([]);
    setLoading(true);

    try {
      await consumeSseStream(
        { messages: newMessages, isMiniChat: true, pageContext: pathname },
        newMessages,
      );
    } catch (err) {
      showToast("Error processing request.", "error");
      setMessages((prev) => [...prev, { role: "assistant", content: "Error processing request." }]);
    } finally {
      setLoading(false);
      setStreamingAgents([]);
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
      await consumeSseStream(
        {
          messages: currentMessages,
          confirmedToolCallIds: approved ? toolsToProcess.map((t) => t.id) : [],
          isMiniChat: true,
          pageContext: pathname,
        },
        currentMessages,
      );
    } catch (err) {
      showToast("Error processing request.", "error");
      setMessages((prev) => [...prev, { role: "assistant", content: "Error processing request." }]);
    } finally {
      setLoading(false);
      setStreamingAgents([]);
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
            <div className="flex items-center gap-1">
              <Bot className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-primary">Yuki</span>
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
                      className={`flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both ${!m || m.role !== "user" ? "items-start" : "items-end"}`}
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

                      {m && (m.content || (m.tool_calls && isPending)) && (
                        <>
                          {m.role === "assistant" && (
                            <div className="text-[10px] font-semibold px-1 mb-0.5 text-accent/80">
                              {m.name ? `@${m.name}` : `@Yuki`}
                            </div>
                          )}
                          <div
                          className={`max-w-[90%] ${m.role === "user" ? "p-3 rounded-xl shadow-sm bg-accent text-white" : "py-2 bg-transparent text-primary"}`}
                        >
                          {m.content ? (
                            <StreamableContentRenderer 
                              content={m.content} 
                              isLast={m === visibleMessages[visibleMessages.length - 1] && m.role === "assistant"}
                              proseClassName="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-base prose-pre:border prose-pre:border-border-default prose-headings:text-primary prose-a:text-accent prose-strong:text-primary max-w-none" 
                            />
                          ) : m.tool_calls && isPending ? (
                            <div className="flex flex-col gap-2 p-3 rounded-xl shadow-sm bg-surface-raised border border-border-default">
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
                      </>
                    )}
                    </div>
                  );
                });
              })()
            )}
            {streamingAgents.map((agent) => (
              <div key={agent.agentName} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
                <div className="text-[10px] font-semibold px-1 mb-0.5 text-accent/80">
                  @{agent.agentName}
                </div>
                <div className="max-w-[90%] py-2 bg-transparent min-w-[150px]">
                  <div className="flex gap-1.5 items-center mt-2 h-6">
                    <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            ))}
            {loading && streamingAgents.length === 0 && (
              <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
                <div className="text-[10px] font-semibold px-1 mb-0.5 text-accent/80">
                  @Yuki
                </div>
                <div className="max-w-[90%] py-2 bg-transparent min-w-[150px]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                    <span className="text-[10px] text-secondary italic">{loadingText}</span>
                  </div>
                  <div className="flex gap-1.5 items-center mt-1 h-6">
                    <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border-default bg-surface flex gap-2 shrink-0">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask Yuki..."
                className="w-full bg-surface-raised border border-border-default rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-primary placeholder:text-tertiary"
                disabled={loading}
              />
              {showMentionMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-surface border border-border-default rounded-xl shadow-lg overflow-hidden z-50">
                  {AGENTS.filter(a => a.name.toLowerCase().includes(mentionFilter) || a.id.toLowerCase().includes(mentionFilter)).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => insertMention(a.id)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-raised text-xs text-primary transition-colors border-b border-border-subtle last:border-0 flex items-center justify-between"
                    >
                      <span className="font-bold text-accent">@{a.id}</span>
                      <span className="text-tertiary text-[10px]">{a.name.split(' ')[1].replace(/[()]/g, '')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
