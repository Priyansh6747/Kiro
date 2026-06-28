"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';

// 1. DayPlannerDemo
export function DayPlannerDemo() {
  const [tasks, setTasks] = useState([...Array(10)].map((_, i) => ({ id: i, done: false })));

  const toggleTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks[index].done = !newTasks[index].done;
    setTasks(newTasks);
  };

  return (
    <div className="w-full h-full bg-[#101114] flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar relative" style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent)' }}>
      {tasks.map((task, i) => (
        <motion.div 
          key={task.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-[#1c1d22] border border-[#27282f] hover:border-[#5c32fa]/50 transition-colors duration-300 rounded-xl p-4 flex gap-4 shrink-0 shadow-sm cursor-pointer group"
          onClick={() => toggleTask(i)}
        >
          <div className="flex flex-col items-center justify-center min-w-[40px] text-center border-r border-[#27282f] pr-4">
            <span className="text-xs text-[#9294a0] uppercase font-bold tracking-wider">{['Mon','Tue','Wed','Thu','Fri','Sat'][i%6]}</span>
            <span className="text-xl text-white font-light">{12 + i}</span>
          </div>
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <div className={`h-7 w-3/4 rounded border px-3 flex items-center transition-all duration-300 ${task.done ? 'bg-[#101114] border-[#27282f] opacity-40' : 'bg-[#1f1742] border-[#5c32fa]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'}`}>
              <span className={`text-[11px] font-medium truncate transition-all ${task.done ? 'text-[#585962] line-through' : 'text-[#8e6efc]'}`}>Strategic Planning</span>
            </div>
            {i % 2 === 0 && (
              <div className={`h-7 w-1/2 rounded border px-3 flex items-center transition-all duration-300 ${task.done ? 'bg-[#101114] border-[#27282f] opacity-40' : 'bg-[#26272d] border-[#34353e]'}`}>
                <span className={`text-[11px] truncate transition-all ${task.done ? 'text-[#585962] line-through' : 'text-[#9294a0]'}`}>Design Review</span>
              </div>
            )}
            {i % 3 === 0 && (
              <div className={`h-7 w-2/3 rounded border px-3 flex items-center transition-all duration-300 ${task.done ? 'bg-[#101114] border-[#27282f] opacity-40' : 'bg-[#FF8A3D]/10 border-[#FF8A3D]/30'}`}>
                <span className={`text-[11px] truncate transition-all ${task.done ? 'text-[#585962] line-through' : 'text-[#FF8A3D]'}`}>Launch Alpha</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center pl-2">
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.done ? 'bg-[#5c32fa] border-[#5c32fa]' : 'border-[#34353e] group-hover:border-[#5c32fa]/50'}`}>
               {task.done && <span className="text-white text-[10px]">✓</span>}
             </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// 2. DependencyGraphDemo
export function DependencyGraphDemo() {
  const x = useMotionValue(0);
  
  // Create trailing spring effects for the downstream tasks
  const x2 = useSpring(useTransform(x, v => Math.max(0, v)), { damping: 20, stiffness: 150 });
  const x3 = useSpring(useTransform(x, v => Math.max(0, v)), { damping: 25, stiffness: 120 });
  
  // Highlight connection lines when dragging
  const lineColor = useTransform(x, [0, 50], ["#27282f", "#5c32fa"]);

  return (
    <div className="w-full h-full bg-[#101114] flex items-center justify-center p-8 overflow-hidden relative">
      <div className="relative w-full max-w-sm flex flex-col gap-10">
        {/* Connection line */}
        <motion.div 
          className="absolute top-6 bottom-6 left-6 w-0.5 z-0" 
          style={{ backgroundColor: lineColor }} 
        />

        <motion.div 
          className="z-10 bg-[#1c1d22] border border-[#5c32fa]/50 shadow-[0_0_20px_rgba(92,50,250,0.15)] rounded-xl p-4 flex items-center gap-4 relative ml-0 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 150 }}
          dragElastic={0.1}
          style={{ x }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-4 h-4 rounded-full border-[3px] border-[#5c32fa] bg-[#1c1d22] z-10 shadow-[0_0_10px_#5c32fa]" />
          <div className="flex flex-col select-none">
            <span className="text-sm text-white font-semibold">API Integration</span>
            <span className="text-xs text-[#5c32fa] font-medium">Blocker &mdash; Drag me right</span>
          </div>
        </motion.div>

        <motion.div 
          className="z-10 bg-[#1c1d22] border border-[#27282f] rounded-xl p-4 flex items-center gap-4 relative pointer-events-none"
          style={{ x: x2 }}
        >
          <motion.div className="w-4 h-4 rounded-full border-[3px] border-[#34353e] bg-[#1c1d22] z-10" style={{ borderColor: useTransform(x, [0,50], ["#34353e", "#5c32fa"]) }} />
          <div className="flex flex-col">
            <span className="text-sm text-[#9294a0] font-medium">Frontend Implementation</span>
            <span className="text-xs text-[#585962]">Dependent</span>
          </div>
        </motion.div>

        <motion.div 
          className="z-10 bg-[#1c1d22] border border-[#27282f] rounded-xl p-4 flex items-center gap-4 relative pointer-events-none"
          style={{ x: x3 }}
        >
          <motion.div className="w-4 h-4 rounded-full border-[3px] border-[#34353e] bg-[#1c1d22] z-10" style={{ borderColor: useTransform(x, [0,50], ["#34353e", "#5c32fa"]) }} />
          <div className="flex flex-col">
            <span className="text-sm text-[#9294a0] font-medium">User Testing</span>
            <span className="text-xs text-[#585962]">Dependent</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// 3. YukiChatDemo
export function YukiChatDemo() {
  const [messages, setMessages] = useState<{role: string, content: any}[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput("");
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: (
          <>
            <p className="text-[13px] text-white mb-4 leading-relaxed">Here is the generated plan for your request.</p>
            <div className="bg-[#101114] rounded-lg border border-[#34353e] p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white font-medium">Phase 1: Foundation</span>
                <span className="text-[10px] text-[#9294a0] font-mono">2 Weeks</span>
              </div>
              <div className="h-2 w-full bg-[#27282f] rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#5c32fa]" 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5 }}
                />
              </div>
            </div>
          </>
        )
      }]);
    }, 1200);
  };

  return (
    <div className="w-full h-full bg-[#101114] flex flex-col p-4 overflow-hidden">
      <div ref={scrollRef} className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full overflow-y-auto custom-scrollbar p-2">
        
        <div className="self-start flex flex-col gap-1.5 w-full">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9294a0] ml-2">Yuki</span>
          <div className="bg-[#1c1d22] border border-[#27282f] p-4 rounded-2xl rounded-bl-sm shadow-sm w-[85%]">
            <p className="text-[13px] text-white">Hi. I'm ready to coordinate your next project. Tell me what we're building.</p>
          </div>
        </div>

        {messages.map((msg, i) => (
          msg.role === 'user' ? (
            <motion.div 
              key={i}
              className="self-end bg-[#5c32fa] text-white px-5 py-3 rounded-2xl rounded-br-sm text-[13px] font-medium shadow-sm w-3/4"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
            >
              {msg.content}
            </motion.div>
          ) : (
            <motion.div 
              key={i}
              className="self-start flex flex-col gap-1.5 w-full"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9294a0] ml-2">Yuki</span>
              <div className="bg-[#1c1d22] border border-[#27282f] p-5 rounded-2xl rounded-bl-sm shadow-sm w-[90%]">
                {msg.content}
              </div>
            </motion.div>
          )
        ))}

        {isTyping && (
           <div className="self-start flex flex-col gap-1.5 w-full animate-pulse">
             <span className="text-[10px] font-bold uppercase tracking-wider text-[#9294a0] ml-2">Yuki</span>
             <div className="bg-[#1c1d22] border border-[#27282f] px-5 py-3 rounded-2xl rounded-bl-sm shadow-sm w-auto flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-[#585962]" />
               <div className="w-1.5 h-1.5 rounded-full bg-[#585962]" />
               <div className="w-1.5 h-1.5 rounded-full bg-[#585962]" />
             </div>
           </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-2 max-w-md mx-auto w-full relative">
        <input 
           className="w-full bg-[#1c1d22] border border-[#34353e] rounded-full pl-5 pr-12 py-3.5 text-[13px] text-white outline-none focus:border-[#5c32fa] transition-colors shadow-sm placeholder:text-[#585962]"
           placeholder="Ask Yuki to plan something..."
           value={input}
           onChange={e => setInput(e.target.value)}
        />
        <button 
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#5c32fa] flex items-center justify-center hover:bg-[#4922db] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </form>
    </div>
  );
}
