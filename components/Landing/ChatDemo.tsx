"use client";

import React, { useState, useEffect, useRef } from "react";
import { ContentRenderer } from "../GenerativeUI";

export default function ChatDemo() {
  const [messages, setMessages] = useState<any[]>([]);
  const [script, setScript] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch the script from the public directory
    fetch("/Demo/convo.json")
      .then(res => res.json())
      .then(data => {
        setScript(data);
      })
      .catch(err => console.error("Failed to load conversation script", err));
  }, []);

  useEffect(() => {
    if (script.length === 0) return;

    let currentIdx = 0;
    
    // Add first message immediately
    setMessages([script[0]]);
    currentIdx++;

    const interval = setInterval(() => {
      if (currentIdx < script.length) {
        // Capture the current value to avoid closure issues
        const nextMsg = script[currentIdx];
        setMessages(prev => [...prev, nextMsg]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 4000); // 4 seconds between messages for better reading pacing

    return () => clearInterval(interval);
  }, [script]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="theme-nightshade w-full mt-12 relative z-20">
      <style>{`
        .theme-nightshade {
          --color-base: var(--bg-base);
          --color-surface: var(--bg-surface);
          --color-surface-raised: var(--bg-surface-raised);
          --color-accent-subtle: var(--bg-accent-subtle);
          --color-accent: var(--accent);
          --color-primary: var(--text-primary);
          --color-secondary: var(--text-secondary);
          --color-tertiary: var(--text-tertiary);
          --color-border-default: var(--border-default);
          --color-border-subtle: var(--border-subtle);
          
          --tw-prose-body: var(--text-primary);
          --tw-prose-headings: var(--text-primary);
          --tw-prose-lead: var(--text-secondary);
          --tw-prose-links: var(--accent);
          --tw-prose-bold: var(--text-primary);
          --tw-prose-counters: var(--text-secondary);
          --tw-prose-bullets: var(--text-secondary);
          --tw-prose-hr: var(--border-default);
          --tw-prose-quotes: var(--text-secondary);
          --tw-prose-quote-borders: var(--border-default);
          --tw-prose-captions: var(--text-tertiary);
          --tw-prose-code: var(--text-primary);
          --tw-prose-pre-code: var(--text-primary);
          --tw-prose-pre-bg: var(--bg-base);
          --tw-prose-th-borders: var(--border-strong);
          --tw-prose-td-borders: var(--border-default);
        }
      `}</style>
      <div className="w-full max-w-4xl mx-auto h-[600px] bg-base border border-border-default rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default flex items-center gap-3 bg-surface">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
          </div>
          <div className="text-xs font-mono text-tertiary ml-2">Yuki Intelligence Shell &mdash; Generative UI Demo</div>
        </div>
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar scroll-smooth bg-base">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'} animate-in slide-in-from-bottom-2 fade-in duration-500`}>
              {msg.role !== 'user' && msg.name && (
                <span className="text-xs font-bold uppercase tracking-wider text-secondary mb-1.5 ml-2">{msg.name}</span>
              )}
              <div className={`p-5 rounded-2xl ${msg.role === 'user' ? 'bg-accent text-white rounded-br-sm' : 'bg-surface-raised text-primary border border-border-default rounded-bl-sm'} shadow-md`}>
                <ContentRenderer 
                  content={msg.content} 
                  proseClassName={`prose ${msg.role === 'user' ? 'text-white font-medium' : 'text-primary'} text-sm md:text-base leading-relaxed max-w-none`} 
                />
              </div>
            </div>
          ))}
          
          {messages.length < script.length && script.length > 0 && (
            <div className="flex items-center gap-2 text-tertiary text-sm italic ml-2 mt-4 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-tertiary" />
              agent thinking...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
