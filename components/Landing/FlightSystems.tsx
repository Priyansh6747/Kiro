"use client";

import React, { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';

const FEATURES = [
  {
    id: 'timeline',
    eyebrow: 'HOW IT FEELS DAY TO DAY',
    headline: 'Twenty-one days, one continuous view.',
    body: "No pages, no pagination lag — just what's coming, scrolling smoothly past.",
    imagePath: '/Demo/DayPlanner.png'
  },
  {
    id: 'dependency',
    eyebrow: null,
    headline: 'Move one task. Watch everything downstream catch up.',
    body: "Reschedule something upstream and Kiro automatically ripples the change through everything that depends on it.",
    imagePath: '/Demo/DependencyGraph.png'
  },
  {
    id: 'chat',
    eyebrow: null,
    headline: 'Ask for a plan. Watch it build itself.',
    body: "Tell Yuki what you're trying to do, and a real, editable plan appears inline — not a wall of text, an actual interface.",
    imagePath: '/Demo/Yuki.png'
  }
];

function FeatureRow({ feature, index }: { feature: any, index: number }) {
  const isReversed = index % 2 !== 0;
  const containerRef = useRef(null);
  
  // Parallax effect for the image to float against the scroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  const yImage = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <div ref={containerRef} className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16 lg:gap-24`}>
      
      {/* Text Block - Slides in slightly from the side */}
      <motion.div 
        initial={{ opacity: 0, x: isReversed ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 w-full"
      >
        {feature.eyebrow && (
          <span className="text-[#9C9488] text-[11px] tracking-[0.12em] uppercase font-bold mb-8 block">
            {feature.eyebrow}
          </span>
        )}
        <h3 className="text-3xl md:text-5xl font-serif text-[#F4EFE6] leading-[1.2] mb-6">
          {feature.headline.includes('Watch everything downstream') ? (
            <>Move one task. <em className="italic font-light">Watch everything downstream catch up.</em></>
          ) : feature.headline}
        </h3>
        <p className="text-[#9C9488] text-lg lg:text-xl leading-relaxed font-light max-w-lg">
          {feature.body}
        </p>
      </motion.div>

      {/* Image Block - Fades in, un-blurs, subtly scales down, and tracks with parallax */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="flex-1 w-full aspect-[4/3] lg:aspect-[16/10] bg-[#181613] rounded-2xl border border-[#332E27] p-2 md:p-4 shadow-2xl relative"
      >
        <motion.div 
          style={{ y: yImage }}
          className="relative w-full h-full rounded-xl overflow-hidden border border-[#332E27]/50 bg-[#0E0D0B]"
        >
          <motion.div
            initial={{ scale: 1.15 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            <Image 
              src={feature.imagePath} 
              alt={feature.headline}
              fill
              className="object-cover object-left-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
        </motion.div>
      </motion.div>

    </div>
  );
}

export default function FlightSystems() {
  return (
    <section className="w-full bg-[#0E0D0B] py-32 lg:py-48 px-8 overflow-hidden border-t border-[#332E27]">
      <div className="max-w-7xl mx-auto flex flex-col gap-32 lg:gap-48">
        {FEATURES.map((feature, i) => (
          <FeatureRow key={feature.id} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
