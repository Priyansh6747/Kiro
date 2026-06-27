"use client";

import React from 'react';

export default function Hero() {
  return (
    <section className="relative w-full min-h-screen bg-[#0E0D0B] flex flex-col pt-32 pb-20 px-8 overflow-hidden">
      {/* Accent Glow */}
      <div 
        className="absolute top-[20%] right-[30%] w-[600px] h-[600px] rounded-full pointer-events-none opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(circle, #FF8A3D 0%, transparent 70%)" }}
      />
      {/* Small bright accent dot */}
      <div className="absolute top-[28%] right-[38%] w-1.5 h-1.5 bg-[#FF8A3D] rounded-full shadow-[0_0_10px_#FF8A3D]" />

      <div className="relative z-10 max-w-4xl w-full mx-auto my-auto flex flex-col items-start md:items-center md:text-center">
        <span className="text-[#9C9488] text-[11px] tracking-[0.12em] uppercase font-bold mb-8">
          KIRO &middot; TASK MANAGEMENT, RUN BY AGENTS
        </span>
        
        <h1 className="text-4xl md:text-6xl lg:text-[72px] font-serif text-[#F4EFE6] leading-[1.2] tracking-tight mb-8">
          There's an intelligence running your day. <em className="italic font-light">She has opinions about how you're running it.</em>
        </h1>
        
        <p className="text-[#9C9488] text-lg md:text-xl max-w-2xl font-sans leading-relaxed mb-12">
          Kiro is a task system led by Yuki — an AI coordinator who runs a crew of specialized agents that track what's slipping, untangle what depends on what, and keep your week from quietly falling apart.
        </p>
        
        <div className="flex items-center gap-6">
          <button className="px-8 py-3.5 rounded-full bg-[#FF8A3D] text-[#0E0D0B] text-sm font-semibold hover:opacity-90 transition-opacity">
            Talk to Yuki
          </button>
          <a href="#" className="text-[#F4EFE6] text-sm font-medium hover:text-[#9C9488] transition-colors flex items-center gap-2">
            Watch it think &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
