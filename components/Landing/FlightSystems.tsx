import React from 'react';

const FEATURES = [
  {
    id: 'timeline',
    eyebrow: 'HOW IT FEELS DAY TO DAY',
    headline: 'Twenty-one days, one continuous view.',
    body: "No pages, no pagination lag — just what's coming, scrolling smoothly past.",
    visual: 'Timeline strip visualization'
  },
  {
    id: 'dependency',
    eyebrow: null,
    headline: 'Move one task. Watch everything downstream catch up.',
    body: "Reschedule something upstream and Kiro automatically ripples the change through everything that depends on it.",
    visual: 'Dependency graph snippet'
  },
  {
    id: 'chat',
    eyebrow: null,
    headline: 'Ask for a plan. Watch it build itself.',
    body: "Tell Yuki what you're trying to do, and a real, editable plan appears inline — not a wall of text, an actual interface.",
    visual: 'Generative chat UI mockup'
  }
];

export default function FlightSystems() {
  return (
    <section className="w-full bg-[#0E0D0B] py-32 px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-32">
        {FEATURES.map((feature, i) => {
          const isReversed = i % 2 !== 0;
          return (
            <div key={feature.id} className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}>
              <div className="flex-1 w-full">
                {feature.eyebrow && (
                  <span className="text-[#9C9488] text-[11px] tracking-[0.12em] uppercase font-bold mb-8 block">
                    {feature.eyebrow}
                  </span>
                )}
                <h3 className="text-3xl md:text-4xl font-serif text-[#F4EFE6] leading-[1.2] mb-6">
                  {feature.headline.includes('Watch everything downstream') ? (
                    <>Move one task. <em className="italic font-light">Watch everything downstream catch up.</em></>
                  ) : feature.headline}
                </h3>
                <p className="text-[#9C9488] text-lg leading-relaxed">
                  {feature.body}
                </p>
              </div>
              <div className="flex-1 w-full aspect-[4/3] bg-[#181613] rounded-2xl border border-[#332E27] flex items-center justify-center p-8 text-[#9C9488] text-sm uppercase tracking-widest text-center">
                [ {feature.visual} ]
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
