import React from 'react';

export default function MissionControl() {
  return (
    <section className="w-full bg-[#181613] py-32 px-8 border-y border-[#332E27]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1">
          <span className="text-[#9C9488] text-[11px] tracking-[0.12em] uppercase font-bold mb-6 block">
            HOW IT DECIDES
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-[#F4EFE6] leading-[1.2] mb-6">
            Every project gets a score. <br />
            <em className="italic font-light">Ignore it, and the number knows.</em>
          </h2>
          <p className="text-[#9C9488] text-lg leading-relaxed mb-8">
            The longer something sits untouched, the higher its score climbs. The closer the deadline, the sharper it spikes. Kiro doesn't guess what needs your attention — it calculates it, every morning, and says so plainly.
          </p>
          <p className="text-[#F4EFE6] text-sm italic">
            Yuki's already seen it. She'll mention it.
          </p>
        </div>

        <div className="flex-1 w-full bg-[#0E0D0B] rounded-2xl border border-[#332E27] p-12 flex flex-col items-center justify-center relative min-h-[400px]">
          {/* Abstract Dial / Math Vis */}
          <div className="absolute top-8 left-8 text-[#FF5C5C] font-mono text-sm tracking-widest">
            neglect: rising &middot; deadline: 2d &middot; score: 7.8
          </div>
          <div className="w-[200px] h-[200px] rounded-full border border-[#332E27] relative flex items-center justify-center">
             <div className="absolute inset-0 border-t-2 border-r-2 border-[#FF5C5C] rounded-full transform rotate-45 opacity-80" />
             <div className="text-5xl font-mono text-[#FF5C5C]">7.8</div>
          </div>
        </div>
      </div>
    </section>
  );
}
