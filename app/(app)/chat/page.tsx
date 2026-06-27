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
  Code,
  FileText,
  Clock,
  X
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useRef } from "react";
import { ContentRenderer, StreamableContentRenderer } from "@/components/GenerativeUI";
import { useTheme } from "@/components/ThemeProvider";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  { id: "Sage", name: "Sage (Planning Agent)" },
];

const PlanRenderer = ({ content }: { content: string }) => {
  try {
    const data = JSON.parse(content);
    if (!data.stages) return <pre className="whitespace-pre-wrap font-mono text-sm">{JSON.stringify(data, null, 2)}</pre>;
    
    return (
      <div className="space-y-6">
        {data.stages.map((stage: any, sIdx: number) => (
          <div key={sIdx} className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="bg-surface-raised p-4 border-b border-border-default">
              <h3 className="text-lg font-bold text-primary">
                Stage {stage.stage}: {stage.stageName}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {stage.tasks?.map((task: any, tIdx: number) => (
                <div key={tIdx} className="bg-base rounded-lg border border-border-subtle p-4">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h4 className="font-semibold text-primary leading-tight">{task.title}</h4>
                    {task.estimate_min != null && (
                      <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-md font-medium shrink-0">
                        ~{task.estimate_min} min
                      </span>
                    )}
                  </div>
                  {task.depends_on && task.depends_on.length > 0 && (
                    <div className="text-xs text-secondary mb-3 flex gap-1">
                      <span className="font-medium">Depends on:</span>
                      {task.depends_on.join(", ")}
                    </div>
                  )}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-border-subtle space-y-2">
                      {task.subtasks.map((sub: any, subIdx: number) => (
                        <div key={subIdx} className="flex justify-between items-center text-sm gap-4">
                          <span className="text-secondary flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-border-strong shrink-0" />
                            {sub.title}
                          </span>
                          {sub.estimate_min != null && (
                            <span className="text-xs text-tertiary shrink-0">{sub.estimate_min} min</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  } catch (err) {
    return <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>;
  }
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  let md = content;
  try {
    const data = JSON.parse(content);
    if (data.markdown) {
      md = data.markdown;
    }
  } catch {
    // Not JSON, assume it's raw markdown
  }

  return (
    <div className="prose prose-sm md:prose-base max-w-none 
      text-secondary
      prose-headings:text-primary 
      prose-p:text-secondary 
      prose-a:text-accent 
      prose-strong:text-primary 
      prose-em:text-secondary
      prose-code:text-accent prose-code:bg-accent/10 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-surface-raised prose-pre:border prose-pre:border-border-default prose-pre:text-primary
      prose-blockquote:text-tertiary prose-blockquote:border-l-border-strong
      prose-ul:text-secondary prose-ol:text-secondary prose-li:text-secondary
      prose-table:text-secondary prose-th:text-primary prose-td:text-secondary
      prose-tr:border-border-subtle prose-thead:border-border-default
      prose-hr:border-border-default
      dark:prose-invert"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </div>
  );
};

const ArtifactContent = ({ content }: { content: string }) => {
  // If it's valid JSON but not a plan, format it nicely
  try {
    const data = JSON.parse(content);
    return <pre className="whitespace-pre-wrap font-mono text-sm">{JSON.stringify(data, null, 2)}</pre>;
  } catch {
    return <>{content}</>;
  }
};

function ChatUI() {
  const { user } = useUser();
  const [input, setInput] = useState("");

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dbMessages, setDbMessages] = useState<ChatMessage[]>([]);
  const [chatActive, setChatActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Thinking...");
  const [streamingAgents, setStreamingAgents] = useState<{agentName: string; snarkyComment?: string}[]>([]);
  const [pendingToolCalls, setPendingToolCalls] = useState<any[]>([]);
  const { setTheme } = useTheme();
  
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);
  const [loadingArtifactId, setLoadingArtifactId] = useState<string | null>(null);
  const [showArtifactsPanel, setShowArtifactsPanel] = useState(false);

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

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior });
      });
    }
  };

  useEffect(() => {
    const isFirstInject = chatActive && messages.length > 2 && messages.length <= dbMessages.length + 2;
    scrollToBottom(isFirstInject ? "auto" : "smooth");
  }, [messages, loading, streamingAgents, chatActive]);

  useEffect(() => {
    fetch("/api/chat?limit=30")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDbMessages(data);
        }
      })
      .catch(console.error);

    fetch("/api/artifacts")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setArtifacts(data);
      })
      .catch(console.error);
  }, []);

  const fetchFullArtifact = async (id: string) => {
    setLoadingArtifactId(id);
    try {
      const res = await fetch(`/api/artifacts?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedArtifact(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingArtifactId(null);
    }
  };

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

          case "planning_flow_start": {
            const planningMsg: ChatMessage & { isCustomUI?: boolean } = {
              role: "assistant",
              name: "Sage",
              content: `<ui:planning-form>{"phase":${payload.phase}}</ui:planning-form>`,
              isCustomUI: true,
            };
            currentMessages = [...currentMessages, planningMsg];
            setMessages([...currentMessages]);
            setStreamingAgents((prev) =>
              prev.filter((a) => a.agentName !== "Sage"),
            );
            setLoadingText("");
            break;
          }

          case "scheduling_flow_start": {
            const schedMsg: ChatMessage & { isCustomUI?: boolean } = {
              role: "assistant",
              name: "Sage",
              content: `<ui:scheduling-flow>{}</ui:scheduling-flow>`,
              isCustomUI: true,
            };
            currentMessages = [...currentMessages, schedMsg];
            setMessages([...currentMessages]);
            setStreamingAgents((prev) =>
              prev.filter((a) => a.agentName !== "Sage"),
            );
            setLoadingText("");
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
            const customMessages = currentMessages.filter((m: any) => m.isCustomUI);
            const visibleFromTrace = (payload.messagesTrace ?? []).filter(
              (m: any) =>
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string" &&
                m.content.trim() !== "",
            );
            const finalMsg = payload.message; // null if Yuki only said <DONE>
            
            let finalArray = visibleFromTrace;
            if (customMessages.length > 0) finalArray = [...finalArray, ...customMessages];
            if (finalMsg) finalArray = [...finalArray, finalMsg];
            
            setMessages(finalArray);
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

    setChatActive(true);

    // If it's the first message of the session, inject the db history
    const isFirstOfSession = messages.length === 0;
    const baseMessages = isFirstOfSession ? [...dbMessages] : [...messages];

    const newMessages: ChatMessage[] = [
      ...baseMessages,
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

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isRightSwipe) {
      setShowArtifactsPanel(false);
    }
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
            chatActive ? 'opacity-0 -translate-y-12 pointer-events-none' : 'opacity-100 translate-y-0'
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

            {/* Artifacts Section */}
            {artifacts.length > 0 && (
              <div className="w-full mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both max-w-4xl">
                <h2 className="text-xl font-bold tracking-tight mb-4 text-primary flex items-center gap-2 justify-center">
                  <FileText className="w-5 h-5 text-accent" /> Recent Artifacts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {artifacts.slice(0, 4).map((art) => (
                    <button
                      key={art.id}
                      onClick={() => fetchFullArtifact(art.id)}
                      disabled={loadingArtifactId === art.id}
                      className="flex flex-col text-left p-4 rounded-2xl bg-surface border border-border-default hover:bg-surface-raised transition-all shadow-sm group"
                    >
                      <div className="font-semibold text-primary group-hover:text-accent transition-colors flex items-center gap-2">
                        {loadingArtifactId === art.id ? (
                           <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        ) : (
                           <FileText className="w-4 h-4" />
                        )}
                        {art.title || "Untitled Artifact"}
                      </div>
                      <div className="text-xs text-secondary mt-2 flex items-center flex-wrap gap-x-4 gap-y-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(art.createdAt * 1000).toLocaleDateString()}
                        </span>
                        {art.projectId && (
                          <span className="flex items-center gap-1">
                            <FolderKanban className="w-3 h-3" />
                            {art.projectId.substring(0,8)}...
                          </span>
                        )}
                        <span className="bg-surface-raised px-2 py-0.5 rounded-md border border-border-subtle">{art.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
            chatActive ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-16 pointer-events-none'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 border-b border-border-default bg-surface shrink-0">
            <div className="flex items-center">
              <Bot className="w-6 h-6 mr-3 text-accent" />
              <span className="text-2xl font-bold tracking-tight text-primary">Yuki (Assistant)</span>
            </div>
            <button
              onClick={() => setShowArtifactsPanel(!showArtifactsPanel)}
              className={`p-2 rounded-xl transition-colors ${showArtifactsPanel ? 'bg-accent/10 text-accent' : 'hover:bg-surface-raised text-secondary'}`}
              title="Toggle Artifacts"
            >
              <FileText className="w-5 h-5" />
            </button>
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
                    className={`flex flex-col ${
                      idx >= dbMessages.length ? "animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both" : ""
                    } ${m.role !== "user" ? "items-start" : "items-end"}`}
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

      {/* Artifacts Side Panel */}
      <div 
        className={`h-full bg-surface border-l border-border-default flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          showArtifactsPanel ? 'w-64 lg:w-80 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full border-none'
        } overflow-hidden shrink-0`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="p-4 border-b border-border-default shrink-0 flex items-center justify-between">
          <h3 className="font-bold text-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" /> Artifacts
          </h3>
          <button
            onClick={() => setShowArtifactsPanel(false)}
            className="p-1 hover:bg-surface-raised rounded-lg transition-colors"
            title="Close Panel"
          >
            <X className="w-4 h-4 text-secondary" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {artifacts.length === 0 ? (
             <div className="text-sm text-tertiary italic text-center mt-4">No artifacts yet.</div>
          ) : (
            artifacts.map((art) => (
              <button
                key={art.id}
                onClick={() => fetchFullArtifact(art.id)}
                disabled={loadingArtifactId === art.id}
                className="w-full flex flex-col text-left p-3 rounded-xl bg-surface-raised border border-border-default hover:border-accent/50 transition-all shadow-sm group"
              >
                <div className="font-semibold text-primary text-sm group-hover:text-accent transition-colors flex items-center gap-2">
                  {loadingArtifactId === art.id ? (
                     <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                  ) : (
                     <FileText className="w-3 h-3 shrink-0" />
                  )}
                  <span className="truncate">{art.title || "Untitled Artifact"}</span>
                </div>
                <div className="text-[10px] text-secondary mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="bg-surface px-1.5 py-0.5 rounded border border-border-subtle truncate max-w-[100px]">{art.type}</span>
                  <span className="flex items-center gap-1 opacity-70 whitespace-nowrap">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(art.createdAt * 1000).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedArtifact && (
        <div className="fixed inset-0 bg-base/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in">
          <div className="bg-surface border border-border-default rounded-3xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border-default">
              <div>
                <h2 className="text-xl font-bold text-primary">{selectedArtifact.title || "Untitled Artifact"}</h2>
                <p className="text-sm text-secondary mt-1">{selectedArtifact.type}</p>
              </div>
              <button
                onClick={() => setSelectedArtifact(null)}
                className="p-2 hover:bg-surface-raised rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <div className={`p-4 md:p-6 overflow-y-auto flex-1 text-primary m-4 rounded-xl border border-border-default shadow-inner ${['plan_complete', 'plan_markdown', 'markdown'].includes(selectedArtifact.type) ? 'bg-base' : 'bg-surface-raised text-sm whitespace-pre-wrap font-mono'}`}>
              {selectedArtifact.type === 'plan_complete' ? (
                <PlanRenderer content={selectedArtifact.content} />
              ) : selectedArtifact.type === 'plan_markdown' || selectedArtifact.type === 'markdown' ? (
                <MarkdownRenderer content={selectedArtifact.content} />
              ) : (
                <ArtifactContent content={selectedArtifact.content} />
              )}
            </div>
          </div>
        </div>
      )}
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
