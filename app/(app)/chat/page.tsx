"use client";

import { useState } from "react";
import { Send, Bot, Bug, Code } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content?: string;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(true);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      
      if (data.debug) {
        setDebugInfo(data.debug);
      }

      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else if (data.error) {
        console.error("API error:", data.error);
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, there was an error processing your request." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full bg-base overflow-hidden relative">
        <div className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 border-b border-border-default bg-surface shrink-0">
          <div className="flex items-center">
            <Bot className="w-6 h-6 mr-3 text-accent" />
            <h1 className="text-2xl font-bold text-primary tracking-tight">AI Chat & Tools</h1>
          </div>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2 rounded-lg transition-colors ${showDebug ? "bg-accent text-white" : "bg-surface-raised text-secondary hover:text-primary"}`}
            title="Toggle Debug Sidebar"
          >
            <Bug className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 bg-base">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-70">
              <Bot className="w-16 h-16 text-tertiary mb-4" />
              <p className="text-lg text-primary font-semibold">How can I help you today?</p>
              <p className="text-sm text-tertiary mt-2">I have access to tools. Ask me about the weather or rainfall!</p>
            </div>
          )}
          {messages.filter(m => m.role !== "tool").map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-xl shadow-sm ${m.role === "user" ? "bg-accent text-white" : "bg-surface-raised border border-border-default text-primary"}`}>
                {m.content ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  m.tool_calls && <span className="italic opacity-70">Running tools...</span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="p-4 rounded-xl bg-surface-raised border border-border-default text-primary italic opacity-70 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-surface border-t border-border-default shrink-0">
          <div className="max-w-4xl mx-auto flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-primary transition-all placeholder:text-tertiary shadow-sm"
              disabled={loading}
            />
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

      {/* Debug Sidebar */}
      {showDebug && (
        <div className="w-80 lg:w-96 shrink-0 bg-surface h-full flex flex-col border-l border-border-default">
          <div className="px-6 py-5 border-b border-border-default shrink-0 flex items-center">
            <Code className="w-5 h-5 mr-2 text-accent" />
            <h2 className="text-lg font-bold text-primary">Debug Inspector</h2>
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
            {!debugInfo ? (
              <p className="text-sm text-tertiary italic text-center mt-10">Send a message to see debug info...</p>
            ) : (
              <>
                <DebugSection title="Initial Prompt (Messages)" data={debugInfo.initialPrompt} />
                <DebugSection title="First LLM Response" data={debugInfo.firstLlmResponse} />
                
                {debugInfo.toolCalls && (
                  <DebugSection title="Tool Calls Made" data={debugInfo.toolCalls} />
                )}
                
                {debugInfo.toolResults && (
                  <DebugSection title="Tool Results" data={debugInfo.toolResults} />
                )}
                
                {debugInfo.newLlmCall && (
                  <>
                    <DebugSection title="Final Prompt (With Tool Context)" data={debugInfo.finalPrompt} />
                    <div className="text-xs bg-done-subtle text-done p-2 rounded border border-status-done/20">
                      New LLM Call Triggered
                    </div>
                  </>
                )}

                <DebugSection title="Final LLM Response" data={debugInfo.finalLlmResponse} />
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
