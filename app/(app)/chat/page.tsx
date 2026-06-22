"use client";

import { useUser } from "@clerk/nextjs";
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

function ChatUI() {
  const { user } = useUser();
  const [input, setInput] = useState("");

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Thinking...");
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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  const copyDebugJson = () => {
    if (!debugInfo) return;
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
  };

  const searchParams = useSearchParams();
  const router = useRouter();

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
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      
      if (data.debug) setDebugInfo(data.debug);

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
      } else if (data.messagesTrace) {
        const trace = data.messagesTrace.filter((m: any) => m.role !== "system");
        setMessages(data.message ? [...trace, data.message] : trace);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request.",
        },
      ]);
    } finally {
      setLoading(false);
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages,
          confirmedToolCallIds: approved ? toolsToProcess.map((t) => t.id) : [],
        }),
      });
      const data = await res.json();
      
      if (data.debug) setDebugInfo(data.debug);

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
      } else if (data.messagesTrace) {
        const trace = data.messagesTrace.filter((m: any) => m.role !== "system");
        setMessages(data.message ? [...trace, data.message] : trace);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex bg-base text-primary overflow-hidden">
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
      {messages.length === 0 ? (
        // --- EMPTY DASHBOARD STATE ---
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto w-full">
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
      ) : (
        // --- CHAT STATE ---
        <div className="flex flex-col flex-1 h-full overflow-hidden relative">
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 border-b border-border-default bg-surface shrink-0">
            <div className="flex items-center">
              <Bot className="w-6 h-6 mr-3 text-accent" />
              <span className="text-2xl font-bold tracking-tight text-primary">Yuki (Assistant)</span>
            </div>
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className={`p-2 rounded-lg transition-colors ${showDebug ? "bg-accent text-white" : "bg-surface-raised text-secondary hover:text-primary"}`}
              title="Toggle Debug Sidebar"
            >
              <Bug className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 bg-base">
            {(() => {
              const visibleMessages = messages.filter((m) => m.role !== "tool");
              const grouped = [];
              let currentTools: any[] = [];

              for (let i = 0; i < visibleMessages.length; i++) {
                const m = visibleMessages[i];
                const isLastMessage = i === visibleMessages.length - 1;
                const isPending =
                  isLastMessage && m.tool_calls && pendingToolCalls.length > 0;

                if (m.role === "assistant" && m.tool_calls && !isPending) {
                  currentTools.push(...m.tool_calls);
                } else {
                  grouped.push({ m, isPending, tools: currentTools });
                  currentTools = [];
                }
              }

              // If there are dangling tools without a response yet
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
                    {/* Render grouped tools horizontally above the bubble */}
                    {tools.length > 0 && (
                      <div className="flex flex-row flex-wrap items-center gap-2 mb-1.5 ml-2">
                        {tools.map((tc) => (
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

                    {/* Render the actual message bubble if it exists */}
                    {m && (m.content || (m.tool_calls && isPending)) && (
                      <>
                        {m.role === "assistant" && (
                          <div className="text-xs font-semibold px-2 mb-1 text-accent/80">
                            {m.name ? `@${m.name}` : `@Yuki`}
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] md:max-w-[70%] p-4 rounded-xl shadow-sm ${m.role === "user" ? "bg-accent text-white" : "bg-surface-raised border border-border-default text-primary"}`}
                        >
                        {m.content ? (
                          <div className="prose prose-sm md:prose-base prose-p:leading-relaxed prose-pre:bg-base prose-pre:border prose-pre:border-border-default prose-headings:text-primary prose-a:text-accent prose-strong:text-primary max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        ) : m.tool_calls && isPending ? (
                          <div className="flex flex-col gap-3">
                            <span className="font-semibold text-sm">
                              Action Required:
                            </span>
                            <p className="text-sm opacity-80">
                              The assistant wants to run the following tools:
                            </p>
                            <ul className="text-xs bg-surface p-2 rounded border border-border-subtle font-mono space-y-1 text-primary">
                              {m.tool_calls.map((tc) => (
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
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                );
              });
            })()}
            {loading && (
              <div className="flex justify-start">
                <div className="p-4 rounded-xl bg-surface-raised border border-border-default text-primary italic opacity-70 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  {loadingText}
                </div>
              </div>
            )}
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
      )}
      </div>

      {/* Debug Sidebar */}
      {showDebug && (
        <div className="w-80 lg:w-96 shrink-0 bg-surface h-full flex flex-col border-l border-border-default z-10">
          <div className="px-6 py-5 border-b border-border-default shrink-0 flex items-center justify-between">
            <div className="flex items-center">
              <Code className="w-5 h-5 mr-2 text-accent" />
              <h2 className="text-lg font-bold text-primary">Debug Inspector</h2>
            </div>
            {debugInfo && (
              <button 
                onClick={copyDebugJson}
                className="text-xs px-2 py-1 bg-surface-raised rounded text-secondary hover:text-primary transition-colors"
              >
                Copy JSON
              </button>
            )}
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
            {!debugInfo ? (
              <p className="text-sm text-tertiary italic text-center mt-10">Send a message to see debug info...</p>
            ) : (
              <>
                {debugInfo.fullTrace?.map((msg: any, idx: number) => {
                  let title = `Message ${idx + 1} (${msg.role})`;
                  if (msg.role === "tool") title = `Tool Result: ${msg.name}`;
                  if (msg.tool_calls) title = `Tool Call(s) by ${msg.role}`;
                  return <DebugSection key={idx} title={title} data={msg} />;
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for debug sections
function DebugSection({ title, data }: { title: string, data: any }) {
  if (!data) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">{title}</h3>
      <pre className="max-h-96 overflow-y-auto bg-surface-raised border border-border-subtle p-3 rounded-lg text-xs text-primary overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
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
