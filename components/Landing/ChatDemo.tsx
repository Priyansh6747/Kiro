"use client";

import React, { useState, useEffect, useRef } from "react";
import { ContentRenderer } from "../GenerativeUI";

import { animate } from "motion";

export default function ChatDemo() {
  const [messages, setMessages] = useState<any[]>([]);
  const [script, setScript] = useState<any[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
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

    let isCancelled = false;

    const runConversation = async () => {
      while (!isCancelled) {
        setIsTransitioning(false);
        setMessages([script[0]]);
        let currentIdx = 1;
        
        while (currentIdx < script.length && !isCancelled) {
          // 4 seconds between messages for better reading pacing
          await new Promise(r => setTimeout(r, 4000));
          if (isCancelled) break;
          const nextMsg = script[currentIdx];
          setMessages(prev => [...prev, nextMsg]);
          currentIdx++;
        }
        
        if (isCancelled) break;
        
        // Wait a bit before restarting
        await new Promise(r => setTimeout(r, 6000));
        if (isCancelled) break;
        
        // Trigger fade out
        setIsTransitioning(true);
        // Wait for fade out animation to finish
        await new Promise(r => setTimeout(r, 800));
      }
    };

    runConversation();

    return () => {
      isCancelled = true;
    };
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
    <div className="theme-paper w-full h-full relative z-20 pointer-events-none flex items-center justify-center p-4 sm:p-8">
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
      <div className={`w-full max-w-xl h-[450px] md:h-[600px] bg-base rounded-xl shadow-[0_25px_65px_rgba(0,0,0,0.6)] border border-border-default/40 flex flex-col overflow-hidden transition-opacity duration-700 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Window Titlebar */}
        <div className="h-10 bg-surface-raised flex items-center px-4 shrink-0 border-b border-border-default/40">
          <div className="flex gap-2 w-16">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10" />
          </div>
          <div className="flex-1 flex justify-center">
            <span className="text-[12px] font-medium text-secondary">
              Yuki &mdash; Assistant
            </span>
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar bg-base">
          <div className="p-5 md:p-8 space-y-6 flex flex-col">
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
