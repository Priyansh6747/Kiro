"use client";

import React, { useState, useEffect, useRef } from "react";
import { ContentRenderer } from "../GenerativeUI";

import { animate } from "motion";

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
    const el = scrollRef.current;
    if (!el) return;

    const innerEl = el.firstElementChild;
    if (!innerEl) return;

    let anim: any;

    const observer = new ResizeObserver(() => {
      const targetScroll = el.scrollHeight - el.clientHeight;
      // Only trigger animation if we actually need to scroll down
      // and we are not already at the bottom.
      if (targetScroll > el.scrollTop + 5) {
        if (anim) anim.stop();
        anim = animate(el.scrollTop, targetScroll, {
          type: "spring",
          bounce: 0,
          duration: 0.8,
          onUpdate: (latest) => {
            el.scrollTop = latest;
          }
        });
      }
    });

    observer.observe(innerEl);

    return () => {
      observer.disconnect();
      if (anim) anim.stop();
    };
  }, []);

  return (
    <div className="theme-paper w-full h-full relative z-20 pointer-events-none">
      <style>{`
        .theme-paper {
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
      <div className="w-full h-full bg-base md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar bg-base">
          <div className="p-6 md:p-10 space-y-8 flex flex-col">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'} animate-in slide-in-from-bottom-2 fade-in duration-500`}>
                {msg.role !== 'user' && msg.name && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5 ml-2">{msg.name}</span>
                )}
                <div className={`p-5 md:p-6 rounded-2xl ${msg.role === 'user' ? 'bg-accent text-white rounded-br-sm' : 'bg-surface-raised text-primary border border-border-default rounded-bl-sm'} shadow-sm w-full`}>
                  <ContentRenderer 
                    content={msg.content} 
                    proseClassName={`prose ${msg.role === 'user' ? 'text-white font-medium' : 'text-primary'} text-[15px] leading-relaxed max-w-none`} 
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
    </div>
  );
}
