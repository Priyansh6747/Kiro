"use client";

import React, { useRef, useEffect } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'motion/react';

export default function MissionControl() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-20% 0px -20% 0px" });
  
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(1));

  useEffect(() => {
    if (isInView) {
      animate(count, 7.8, { duration: 1.5, ease: [0.16, 1, 0.3, 1] });
    }
  }, [isInView, count]);

  return (
    <section className="w-full bg-[#181613] py-20 md:py-32 px-6 md:px-8 border-y border-[#332E27]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
        
        {/* Left: Copy */}
        <div className="flex-1 max-w-xl">
          <span className="text-[#9C9488] text-[10px] md:text-[11px] tracking-[0.12em] uppercase font-bold mb-4 md:mb-6 block">
            HOW IT DECIDES
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-[#F4EFE6] leading-[1.2] mb-6">
            Every project gets a score. <br />
            <em className="italic font-light">Ignore it, and the number knows.</em>
          </h2>
          <p className="text-[#9C9488] text-base md:text-lg leading-relaxed">
            The longer something sits untouched, the higher its score climbs. The closer the deadline, the sharper it spikes. Kiro doesn't guess what needs your attention — it calculates it, every morning, and says so plainly.
          </p>
          
          <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-[#332E27]/60">
            <p className="text-[#9C9488] text-xs md:text-sm flex items-start gap-3 opacity-80">
              <span className="text-[#FF5C5C] mt-0.5 select-none">↳</span>
              <span className="italic font-light">Yuki's already seen it. She'll mention it.</span>
            </p>
          </div>
        </div>

        {/* Right: Data Visualization */}
        <div className="flex-1 w-full flex flex-col items-center justify-center py-8 md:py-12" ref={containerRef}>
          <div className="relative flex items-center justify-center w-full max-w-[280px]">
            
            <svg viewBox="0 0 200 200" className="w-full h-auto transform -rotate-90 drop-shadow-xl overflow-visible">
              {/* Outer Track */}
              <circle cx="100" cy="100" r="90" fill="none" stroke="#2A261F" strokeWidth="2" />
              
              {/* Main Score Arc */}
              <motion.circle 
                cx="100" cy="100" r="90" 
                fill="none" stroke="#FF5C5C" strokeWidth="4" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 0.78 }}
                viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className="drop-shadow-[0_0_12px_rgba(255,92,92,0.4)]"
              />

              {/* Inner Track (Deadline) */}
              <circle cx="100" cy="100" r="70" fill="none" stroke="#2A261F" strokeWidth="1" strokeDasharray="2 4" />
              
              {/* Inner Arc (Deadline progress - e.g. 90% meaning very close) */}
              <motion.circle 
                cx="100" cy="100" r="70" 
                fill="none" stroke="#9C9488" strokeWidth="2" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 0.90 }}
                viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              />
            </svg>

            {/* Center Data */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-[#9C9488] font-mono mb-2 uppercase tracking-widest opacity-80">
                score
              </span>
              <motion.span className="text-6xl font-mono text-[#FF5C5C] tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,92,92,0.2)]">
                {rounded}
              </motion.span>
              <span className="text-[10px] text-[#9C9488] font-mono mt-3 uppercase tracking-widest opacity-80">
                2d left
              </span>
            </div>

          </div>
          
          {/* Legend */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-12 flex items-center gap-8 text-[10px] font-mono text-[#9C9488] uppercase tracking-widest opacity-60"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C5C] shadow-[0_0_5px_#FF5C5C]"></span>
              Urgency
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9C9488]"></span>
              Deadline
            </span>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
