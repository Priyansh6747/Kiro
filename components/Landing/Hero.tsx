"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Subtle, majestic starry background
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const stars: { x: number; y: number; radius: number; vx: number; vy: number; alpha: number; pulse: number }[] = [];
    const numStars = 600;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.05, // Very slow movement
        vy: (Math.random() - 0.5) * 0.05,
        alpha: Math.random(),
        pulse: Math.random() * 0.02
      });
    }

    let animationFrameId: number;

    const render = () => {
      // Clear with deep cosmic black
      ctx.fillStyle = "#010103";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      // Draw stars (Background layer)
      for (let i = 0; i < numStars; i++) {
        const star = stars[i];
        
        star.x += star.vx;
        star.y += star.vy;
        
        star.alpha += star.pulse;
        if (star.alpha > 1 || star.alpha < 0.1) {
            star.pulse = -star.pulse;
        }

        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, star.alpha))})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden text-white font-sans selection:bg-white selection:text-black">
      {/* Background Canvas (Stars) */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* SVG Filter Definition for the Nebula Clouds */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <filter id="nebula-clouds">
          {/* Fractal noise creates the organic, wispy cloud texture */}
          <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="6" result="noise">
            {/* Animating the noise slightly creates a very slow evolving cloud effect */}
            <animate attributeName="baseFrequency" values="0.004;0.0045;0.004" dur="40s" repeatCount="indefinite" />
          </feTurbulence>
          {/* Displacement map warps the smooth gradients using the noise, making them look like smoke/clouds */}
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="350" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Nebula Cloud Layer */}
      <div 
        className="absolute bottom-[-10%] left-[-10%] w-[120%] h-[80vh] pointer-events-none opacity-90"
        style={{
          filter: "url(#nebula-clouds)",
          mixBlendMode: "screen",
          background: `
            radial-gradient(ellipse at 30% 90%, rgba(140, 10, 80, 0.9) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 80%, rgba(20, 60, 140, 0.9) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(190, 40, 130, 0.7) 0%, transparent 70%),
            radial-gradient(ellipse at 80% 100%, rgba(90, 20, 110, 0.8) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 70%, rgba(40, 15, 100, 0.6) 0%, transparent 50%)
          `
        }}
      />

      {/* Base grounding gradient (like a dark atmosphere near the bottom edge) */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-t from-[#050110] via-transparent to-transparent opacity-90 h-full" />

      {/* Noise overlay for cinematic texture */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none mix-blend-screen"
        style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
      />

      {/* Header Area */}
      <header className="relative z-20 flex items-center justify-between border-b border-white/10 bg-black/10 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex-1 px-8 py-6 flex items-center gap-2 tracking-[0.2em] text-sm font-semibold uppercase">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M12 2L2 22h20L12 2z" />
            <path d="M12 12L7 22" />
            <path d="M12 12L17 22" />
          </svg>
          <div className="flex flex-col leading-none">
            <span>KIRO</span>
            <span className="text-[9px] font-normal text-gray-400 tracking-[0.3em] mt-1">COSMIC</span>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-10 text-[13px] font-medium tracking-wide">
          <a href="#" className="hover:text-gray-300 transition-colors">About</a>
          <a href="#" className="hover:text-gray-300 transition-colors flex items-center gap-1">
            Missions
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </a>
          <a href="#" className="hover:text-gray-300 transition-colors">Fleet</a>
          <a href="#" className="hover:text-gray-300 transition-colors">Crew</a>
          <a href="#" className="hover:text-gray-300 transition-colors">Investors</a>
          <a href="#" className="hover:text-gray-300 transition-colors">Contact</a>
        </nav>

        {/* Right Actions */}
        <div className="flex-1 flex justify-end items-center h-full border-l border-white/10 ml-8 lg:ml-0">
          <div className="px-8 py-6 text-xs font-medium tracking-widest text-gray-400 border-r border-white/10 hidden md:block">EN</div>
          <button className="px-8 py-6 text-[13px] font-medium tracking-wide hover:bg-white/5 transition-colors h-full flex items-center">
            Command Center
          </button>
        </div>
      </header>

      {/* Main Content / Pitch */}
      <div className="relative z-10 h-[calc(100vh-81px)] w-full flex flex-col justify-end p-8 md:p-16">
        <div className="flex flex-col-reverse md:flex-row justify-between items-start md:items-end w-full gap-12">
          
          {/* Scroll Indicator (Bottom Left) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="text-gray-400 text-xs tracking-[0.2em] uppercase flex items-center gap-6"
          >
            <span>Scroll</span>
            <div className="w-[1px] h-12 bg-white/20 relative overflow-hidden">
               <motion.div 
                 animate={{ y: ["-100%", "200%"] }} 
                 transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                 className="absolute inset-0 bg-white"
               />
            </div>
          </motion.div>

          {/* Typography (Bottom Right) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
            className="max-w-2xl md:text-right md:ml-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-light leading-[1.15] tracking-tight mb-8 md:text-left text-left text-white/95">
              Pioneering the cosmos <br className="hidden md:block" />
              for high-growth ventures <br className="hidden md:block" />
              and interstellar pioneers.
            </h1>
            
            <div className="md:text-left text-left">
              <a 
                href="#" 
                className="inline-block text-[15px] tracking-wide border-b border-white/60 pb-1 hover:text-white hover:border-white transition-colors"
              >
                Discover Missions
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
