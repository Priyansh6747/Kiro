"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Target, CheckSquare, Globe, BookOpen, Calendar, Layout, Hexagon } from 'lucide-react';

const CREW = [
  { name: 'Nova', role: 'Projects', desc: 'Sets priorities and deadlines before you forget to.', icon: Target },
  { name: 'Quill', role: 'Tasks', desc: 'Schedules, completes, reschedules. Repeat.', icon: CheckSquare },
  { name: 'Echo', role: 'Preferences', desc: 'Keeps every timezone and nudge time honest.', icon: Globe },
  { name: 'Iva', role: 'Day Log', desc: 'Writes down what you actually did. No edits.', icon: BookOpen },
  { name: 'Juno', role: 'Planning', desc: 'Stops you from overloading tomorrow.', icon: Calendar },
  { name: 'Zef', role: 'Interface', desc: 'Changes the scenery on command.', icon: Layout },
];

function MemberBlock({ member }: { member: any }) {
  const Icon = member.icon;
  return (
    <motion.div
      initial={{ opacity: 0.1, y: 30, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: false, margin: "-30% 0px -30% 0px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col justify-center py-24 lg:py-32 border-b border-[#332E27]/50 last:border-0"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 border border-[#332E27] rounded-full flex items-center justify-center bg-[#181613] text-[#9C9488]">
             <Icon size={18} strokeWidth={1.5} />
          </div>
          <h3 className="font-serif text-[#F4EFE6] text-4xl lg:text-5xl tracking-tight">
            {member.name}
          </h3>
          <span className="px-3 py-1 rounded-full bg-[#181613] text-[#9C9488] text-[10px] uppercase tracking-widest border border-[#332E27] ml-2">
            {member.role}
          </span>
        </div>
        <p className="text-[#9C9488] text-xl lg:text-2xl leading-[1.6] max-w-xl font-light">
          {member.desc}
        </p>
      </div>
    </motion.div>
  );
}

export default function Crew() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  return (
    <section ref={containerRef} className="w-full bg-[#0E0D0B] border-t border-[#332E27] relative">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row px-6 md:px-8">
        
        {/* Left Side: Fixed/Sticky Yuki */}
        <div className="lg:w-1/2 lg:sticky lg:top-0 lg:h-screen flex flex-col justify-center py-20 lg:py-0 relative">
          
          <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-[#FF8A3D] opacity-5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <span className="text-[#9C9488] text-[10px] md:text-[11px] tracking-[0.12em] uppercase font-bold mb-8 md:mb-12 block">
              THE CREW
            </span>
            
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="w-16 h-16 border border-[#FF8A3D]/40 bg-[#FF8A3D]/10 rounded-full flex items-center justify-center mb-8 relative shadow-[0_0_30px_rgba(255,138,61,0.05)] text-[#FF8A3D]">
                <Hexagon size={24} strokeWidth={1.5} className="drop-shadow-[0_0_8px_#FF8A3D]" />
              </div>
              
              <h2 className="text-6xl md:text-7xl font-serif text-[#F4EFE6] mb-6">
                Yuki
              </h2>
              
              <div className="flex items-center gap-4 mb-8">
                <span className="inline-block px-4 py-1.5 rounded-full bg-[#0E0D0B] text-[#FF8A3D] text-[11px] uppercase tracking-widest border border-[#FF8A3D]/30 font-semibold">
                  Coordinator
                </span>
                <span className="text-[#9C9488] italic font-serif text-xl">The leader.</span>
              </div>
              
              <p className="text-[#F4EFE6] text-xl md:text-2xl leading-relaxed max-w-md font-light">
                Runs the day. Delegates everything. Forgives nothing.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right Side: Scrolling text for the council */}
        <div className="lg:w-1/2 lg:pl-16 pb-[10vh] lg:py-[20vh]">
          {CREW.map((member) => (
            <MemberBlock key={member.name} member={member} />
          ))}
        </div>

      </div>
    </section>
  );
}
