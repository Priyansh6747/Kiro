"use client";

import React from 'react';
import ChatDemo from './ChatDemo';

export default function Hero() {
  return (
    <section className="relative w-full min-h-[100dvh] md:h-screen bg-[#0E0D0B] overflow-hidden flex flex-col md:flex-row">
      {/* Accent Glow ONLY behind the left column */}
      <div 
        className="absolute top-1/4 left-[-50%] md:left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(circle, #FF8A3D 0%, transparent 70%)" }}
      />

      {/* Left column (~42%) */}
      <div className="relative z-10 w-full md:w-[42%] flex flex-col justify-center px-6 md:px-12 lg:px-20 pt-32 md:pt-0 pb-12 md:pb-0 h-auto md:h-full">
        <span className="text-[#9C9488] text-[10px] md:text-[11px] tracking-[0.12em] uppercase font-bold mb-4 md:mb-6">
          KIRO &middot; TASK MANAGEMENT, RUN BY AGENTS
        </span>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#F4EFE6] leading-[1.1] tracking-tight mb-6 md:mb-8">
          There's an intelligence running your day. <span className="italic font-light">Meet Yuki — she has opinions about how you're running it.</span>
        </h1>
        
        <p className="text-[#9C9488] text-base md:text-lg font-sans leading-relaxed mb-8 md:mb-10 max-w-md">
          Yuki is your primary coordinator. She delegates to a crew of specialized agents, calls you out when you slack off, and keeps your week from quietly falling apart — with brutal efficiency.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <button className="px-8 py-3.5 rounded-full bg-[#F4EFE6] text-[#0E0D0B] text-sm font-bold hover:opacity-90 transition-opacity w-full sm:w-auto">
            Get Started
          </button>
          <a href="#" className="text-[#9C9488] text-sm font-medium hover:text-[#F4EFE6] transition-colors ml-4 sm:ml-0">
            Watch her think &rarr;
          </a>
        </div>
      </div>

      {/* Right column (~58%) */}
      <div className="relative z-10 w-full md:w-[58%] md:flex-1 h-[500px] sm:h-[600px] md:h-full min-h-0 p-4 sm:p-8 md:p-0 md:py-16 md:pr-12 mt-4 md:mt-0 flex flex-col pb-12 md:pb-16">
        <ChatDemo />
      </div>
    </section>
  );
}
