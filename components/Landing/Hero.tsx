"use client";

import React from 'react';
import ChatDemo from './ChatDemo';

export default function Hero() {
  return (
    <section className="relative w-full min-h-screen bg-[#0E0D0B] flex flex-col px-8 py-12 md:py-24 overflow-hidden">
      {/* Accent Glow moved to bottom right to highlight Yuki */}
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(circle, #FF8A3D 0%, transparent 70%)" }}
      />
      {/* Small bright accent dot */}
      <div className="absolute bottom-[25%] right-[20%] w-1.5 h-1.5 bg-[#FF8A3D] rounded-full shadow-[0_0_15px_#FF8A3D] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col flex-grow justify-between min-h-[calc(100vh-12rem)]">
        
        {/* Top Left: Describe Kiro */}
        <div className="flex flex-col items-start max-w-2xl mt-12 md:mt-20">
          <span className="text-[#9C9488] text-[11px] tracking-[0.12em] uppercase font-bold mb-6">
            KIRO &middot; TASK MANAGEMENT, RUN BY AGENTS
          </span>
          
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-[#F4EFE6] leading-[1.1] tracking-tight mb-8">
            There's an intelligence running your day.
          </h1>
          
          <p className="text-[#9C9488] text-lg md:text-xl font-sans leading-relaxed mb-10 max-w-xl">
            Kiro is a task system run by a crew of specialized agents that track what's slipping, untangle what depends on what, and keep your week from quietly falling apart.
          </p>

          <button className="px-6 py-3 rounded-full border border-[#2C2A28] text-[#F4EFE6] text-sm font-semibold hover:bg-[#1A1816] transition-colors">
            Explore Kiro
          </button>
        </div>

        {/* Bottom Right: Meet Yuki */}
        <div className="flex flex-col items-end self-end max-w-lg text-right mt-24 mb-12">
          <h2 className="text-3xl md:text-5xl font-serif text-[#F4EFE6] leading-[1.1] tracking-tight mb-6">
            Meet Yuki.<br/>
            <span className="italic font-light text-[#FF8A3D]">She has opinions.</span>
          </h2>
          
          <p className="text-[#9C9488] text-base md:text-lg font-sans leading-relaxed mb-8">
            Your primary coordinator. She delegates to the other agents, calls you out when you slack off, and organizes your life with brutal efficiency.
          </p>
          
          <div className="flex items-center gap-6 justify-end">
            <a href="#" className="text-[#9C9488] text-sm font-medium hover:text-[#F4EFE6] transition-colors flex items-center gap-2">
              Watch her think &rarr;
            </a>
            <button className="px-8 py-3.5 rounded-full bg-[#FF8A3D] text-[#0E0D0B] text-sm font-semibold hover:opacity-90 transition-opacity">
              Get Started
            </button>
          </div>
        </div>

      </div>

      {/* Chat Demo Visualization */}
      <div className="relative z-10 w-full max-w-7xl mx-auto mt-12 mb-24">
        <div className="text-center mb-12">
          <h3 className="text-[#9C9488] text-sm tracking-widest uppercase font-bold mb-4">See the crew in action</h3>
          <p className="text-[#F4EFE6] text-2xl md:text-3xl font-serif">Rich components generated dynamically by your agents.</p>
        </div>
        <ChatDemo />
      </div>
    </section>
  );
}
