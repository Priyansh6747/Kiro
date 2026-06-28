import React from 'react';

const THEMES = [
  { name: 'Midnight', colors: ['#0E0D0B', '#181613', '#F4EFE6'] },
  { name: 'Paper', colors: ['#F9F6F0', '#EAE4D9', '#2C2A26'] },
  { name: 'Sage', colors: ['#121513', '#1C221F', '#D3DFD7'] },
  { name: 'Nebula', colors: ['#0D0B12', '#16131D', '#E2D9F4'] },
  { name: 'Nightshade', colors: ['#1A0B10', '#261219', '#F4D9E2'] },
];

export default function Themes() {
  return (
    <section className="w-full bg-[#181613] py-32 px-8 border-y border-[#332E27]">
      <div className="max-w-7xl mx-auto mb-16">
        <span className="text-[#9C9488] text-[11px] tracking-[0.12em] uppercase font-bold mb-6 block">
          THEMES
        </span>
        <h2 className="text-4xl md:text-5xl font-serif text-[#F4EFE6]">
          <em className="italic font-light">Five ways to see your work.</em>
        </h2>
      </div>

      <div className="max-w-7xl mx-auto flex gap-6 overflow-x-auto pb-8 snap-x">
        {THEMES.map((theme) => (
          <div key={theme.name} className="flex-shrink-0 snap-start flex flex-col gap-4">
            <div className="w-[200px] h-[140px] rounded-xl bg-[#221F1B] border border-[#332E27] p-4 flex flex-col gap-2">
              {theme.colors.map((color, i) => (
                <div key={i} className="w-full flex-1 rounded" style={{ backgroundColor: color }} />
              ))}
            </div>
            <span className="text-[#9C9488] text-xs tracking-widest uppercase ml-1">
              {theme.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
