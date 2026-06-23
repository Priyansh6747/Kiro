"use client";

import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/useToast";
import {
  Bot,
  CheckSquare,
  FolderKanban,
  Lightbulb,
  PenTool,
  Send,
  Bug,
  Code
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useRef } from "react";
import { ContentRenderer, StreamableContentRenderer } from "@/components/GenerativeUI";
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

function ChatUI() {
  const { user } = useUser();
  const [input, setInput] = useState("");

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Thinking...");
  const [streamingAgents, setStreamingAgents] = useState<{agentName: string; snarkyComment?: string}[]>([]);
  const [pendingToolCalls, setPendingToolCalls] = useState<any[]>([]);
  const { setTheme } = useTheme();
  
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, isBottom: boolean) => {
    const val = e.target.value;
    setInput(val);

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

  const insertMention = (agentId: string, isBottom: boolean) => {
    const ref = isBottom ? bottomInputRef : inputRef;
    const cursorPosition = ref.current?.selectionStart || input.length;
    const textBeforeCursor = input.slice(0, cursorPosition);
    const textAfterCursor = input.slice(cursorPosition);
    
    const newTextBefore = textBeforeCursor.replace(/@([a-zA-Z]*)$/, `@${agentId} `);
    setInput(newTextBefore + textAfterCursor);
    setShowMentionMenu(false);
    
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        ref.current.setSelectionRange(newTextBefore.length, newTextBefore.length);
      }
    }, 0);
  };
  const { showToast } = useToast();

  const searchParams = useSearchParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, streamingAgents]);

  useEffect(() => {
    const msg = searchParams.get("msg");
    if (msg) {
      setInput(msg);
      // Remove query param to prevent resending on reload
      router.replace("/chat");

      // We need to trigger the send immediately. Since sendMessage relies on the state `input`,
      // which isn't updated instantly, we can pass `msg` directly to a helper or just execute the logic.
      handleSendDirect(msg);
    }
  }, [searchParams]);

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

    // Optimistically start with the messages we already have
    let currentMessages: ChatMessage[] = [...baseMessages];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      // SSE frames are separated by double newlines
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
            // Yuki's snarky comment arrives the instant delegation is decided —
            // before any sub-agent even starts, so the order is always: Yuki → Agent
            const yukiMsg: ChatMessage = {
              role: "assistant",
              content: payload.content,
              name: "Yuki",
              tool_calls: payload.tool_calls,
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
            // Render this agent's reply immediately, before all agents finish.
            // Use functional update to avoid stale closure issues with concurrent agents.
            const agentMsg: ChatMessage = {
              ...payload.message,
              role: "assistant",
            };
            currentMessages = [...currentMessages, agentMsg];
            setMessages([...currentMessages]);
            setStreamingAgents((prev) =>
              prev.filter((a) => a.agentName !== payload.agentName),
            );
            setLoadingText(""); // Reset loading text to prevent stale tool call strings
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
            // The raw messagesTrace contains tool messages, bare tool-call messages,
            // and inner-trace debris. We DON'T dump it directly — that would cause a
            // flash reorder. Instead, build the visible list the same way streaming did:
            // keep only messages that have actual text content (user or assistant).
            // The final Yuki message (if any content remains after stripping <DONE>) is appended.
            const visibleFromTrace = (payload.messagesTrace ?? []).filter(
              (m: any) =>
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string" &&
                m.content.trim() !== "",
            );
            const finalMsg = payload.message; // null if Yuki only said <DONE>
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
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: `Error: ${errMsg}` },
            ]);
            setStreamingAgents([]);
            break;
          }
        }
      }
    }
  };

  const handleSendDirect = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: textToSend },
    ];
    setMessages(newMessages);
    setInput("");
    setShowMentionMenu(false);
    setLoadingText("Thinking...");
    setStreamingAgents([]);
    setLoading(true);

    try {
      await consumeSseStream({ messages: newMessages }, newMessages);
    } catch (err) {
      showToast("Sorry, there was an error processing your request.", "error");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, there was an error processing your request." },
      ]);
    } finally {
      setLoading(false);
      setStreamingAgents([]);
    }
  };

  const sendMessage = async () => {
    await handleSendDirect(input);
  };

  const executeTools = async (approved: boolean) => {
    setLoadingText("Running tools...");
    setLoading(true);
    const toolsToProcess = [...pendingToolCalls];
    setPendingToolCalls([]);

    let currentMessages = [...messages];

    if (!approved) {
      // Mock the tool results as explicitly denied by the user
      const toolMessages: ChatMessage[] = toolsToProcess.map((tc) => ({
        role: "tool",
        tool_call_id: tc.id,
        name: tc.function.name,
        content: JSON.stringify({
          error: "User explicitly denied this action.",
        }),
      }));
      currentMessages = [...currentMessages, ...toolMessages];
      setMessages(currentMessages);
    }

    try {
      await consumeSseStream(
        {
          messages: currentMessages,
          confirmedToolCallIds: approved ? toolsToProcess.map((t) => t.id) : [],
        },
        currentMessages,
      );
    } catch (err) {
      showToast("Sorry, there was an error processing your request.", "error");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, there was an error processing your request." },
      ]);
    } finally {
      setLoading(false);
      setStreamingAgents([]);
    }
  };

  return (
    <div className="relative h-full w-full flex bg-base text-primary overflow-hidden">
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        {/* --- EMPTY DASHBOARD STATE --- */}
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto w-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            messages.length > 0 ? 'opacity-0 -translate-y-12 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="max-w-3xl w-full flex flex-col items-center gap-8 mt-[-10vh]">
            {/* Greeting */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {greeting}, {user?.firstName || "there"}
              </h1>
              <p className="text-secondary text-lg">How can I help you?</p>
            </div>

            {/* Big Centered Input */}
            <div className="w-full bg-surface-raised border border-border-default rounded-3xl p-4 shadow-sm flex flex-col gap-3 transition-shadow focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent">
              <div className="relative w-full">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e, false)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask Yuki..."
                  className="w-full bg-transparent border-none focus:outline-none text-lg px-2 py-1 placeholder:text-tertiary"
                  disabled={loading}
                />
                {showMentionMenu && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border-default rounded-xl shadow-lg overflow-hidden z-50">
                    {AGENTS.filter(a => a.name.toLowerCase().includes(mentionFilter) || a.id.toLowerCase().includes(mentionFilter)).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => insertMention(a.id, false)}
                        className="w-full text-left px-4 py-2 hover:bg-surface-raised text-sm text-primary transition-colors border-b border-border-subtle last:border-0"
                      >
                        <span className="font-bold text-accent">@{a.id}</span> - <span className="text-secondary">{a.name.split(' ')[1].replace(/[()]/g, '')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-tertiary px-2">Type @ to assign tasks to specific agents</div>
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="p-2 bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
              <button
                onClick={() => setInput("What's on my agenda today?")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-default hover:bg-surface-raised text-sm text-secondary transition-colors shadow-sm"
              >
                <CheckSquare className="w-4 h-4" /> My Agenda
              </button>
              <button
                onClick={() => setInput("Show me my active projects")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-default hover:bg-surface-raised text-sm text-secondary transition-colors shadow-sm"
              >
                <FolderKanban className="w-4 h-4" /> Active Projects
              </button>
              <button
                onClick={() => setInput("Create a new task: ")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-default hover:bg-surface-raised text-sm text-secondary transition-colors shadow-sm"
              >
                <PenTool className="w-4 h-4" /> New Task
              </button>
              <button
                onClick={() => setInput("Give me an inspirational quote")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-default hover:bg-surface-raised text-sm text-secondary transition-colors shadow-sm"
              >
                <Lightbulb className="w-4 h-4" /> Inspire Me
              </button>
            </div>

            {loading && (
              <div className="flex justify-center mt-4">
                <div className="p-4 rounded-xl bg-surface-raised border border-border-default text-primary italic opacity-70 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  {loadingText}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- CHAT STATE --- */}
        <div 
          className={`absolute inset-0 flex flex-col h-full overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            messages.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 border-b border-border-default bg-surface shrink-0">
            <div className="flex items-center">
              <Bot className="w-6 h-6 mr-3 text-accent" />
              <span className="text-2xl font-bold tracking-tight text-primary">Yuki (Assistant)</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 bg-base">
            {(() => {
              const visibleMessages = messages.filter((m) => m.role !== "tool");

              return visibleMessages.map((m, idx) => {
                const isLastMessage = idx === visibleMessages.length - 1;
                const isPending = isLastMessage && m.tool_calls && pendingToolCalls.length > 0;
                const tools = m.tool_calls || [];

                return (
                  <div
                    key={idx}
                    className={`flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both ${m.role !== "user" ? "items-start" : "items-end"}`}
                  >
                    {(m.content || tools.length > 0) && (
                      <>
                        {m.role === "assistant" && (
                          <div className="text-xs font-semibold px-2 mb-1 text-accent/80">
                            {m.name ? `@${m.name}` : `@Yuki`}
                          </div>
                        )}
                        
                        {m.content && (
                          <div
                            className={`max-w-[85%] md:max-w-[70%] ${m.role === "user" ? "p-4 rounded-xl shadow-sm bg-accent text-white" : "py-2 bg-transparent text-primary"}`}
                          >
                            <StreamableContentRenderer content={m.content} isLast={isLastMessage && m.role === "assistant"} />
                          </div>
                        )}

                        {isPending ? (
                          <div className="max-w-[85%] md:max-w-[70%] mt-2 flex flex-col gap-3 p-4 rounded-xl shadow-sm bg-surface-raised border border-border-default">
                            <span className="font-semibold text-sm">
                              Action Required:
                            </span>
                            <p className="text-sm opacity-80">
                              The assistant wants to run the following tools:
                            </p>
                            <ul className="text-xs bg-surface p-2 rounded border border-border-subtle font-mono space-y-1 text-primary">
                              {tools.map((tc: any) => (
                                <li key={tc.id}>👉 {tc.function.name}</li>
                              ))}
                            </ul>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => executeTools(true)}
                                className="flex-1 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-hover transition-colors"
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => executeTools(false)}
                                className="flex-1 py-1.5 bg-surface border border-border-default text-secondary hover:text-primary rounded text-sm transition-colors"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        ) : tools.length > 0 && (
                          <div className="flex flex-row flex-wrap items-center gap-2 mt-1.5 ml-2">
                            {tools.map((tc: any) => (
                              <div
                                key={tc.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-xs font-semibold text-accent tracking-wide shadow-sm"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                {tc.function.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              });
            })()}
            {/* Per-agent streaming skeletons — one bubble per in-flight agent */}
            {streamingAgents.map((agent) => (
              <div key={agent.agentName} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
                <div className="text-xs font-semibold px-2 mb-1 text-accent/80">
                  @{agent.agentName}
                </div>
                <div className="max-w-[85%] md:max-w-[70%] py-2 bg-transparent min-w-[200px]">
                  <div className="flex gap-1.5 items-center mt-2 h-6">
                    <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            ))}
            {/* Generic thinking skeleton when no specific agents are streaming yet */}
            {loading && streamingAgents.length === 0 && (
              <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
                <div className="text-xs font-semibold px-2 mb-1 text-accent/80">
                  @Yuki
                </div>
                <div className="max-w-[85%] md:max-w-[70%] py-2 bg-transparent min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    <span className="text-xs text-secondary italic">{loadingText}</span>
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

          {/* Bottom Input */}
          <div className="p-4 bg-surface border-t border-border-default shrink-0">
            <div className="max-w-4xl mx-auto flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={bottomInputRef}
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e, true)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask Yuki..."
                  className="w-full px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all placeholder:text-tertiary shadow-sm text-primary"
                  disabled={loading}
                />
                {showMentionMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border-default rounded-xl shadow-lg overflow-hidden z-50">
                    {AGENTS.filter(a => a.name.toLowerCase().includes(mentionFilter) || a.id.toLowerCase().includes(mentionFilter)).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => insertMention(a.id, true)}
                        className="w-full text-left px-4 py-2 hover:bg-surface-raised text-sm text-primary transition-colors border-b border-border-subtle last:border-0"
                      >
                        <span className="font-bold text-accent">@{a.id}</span> - <span className="text-secondary">{a.name.split(' ')[1].replace(/[()]/g, '')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-5 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      }
    >
      <ChatUI />
    </Suspense>
  );
}
