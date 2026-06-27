import React from 'react';

export default function Problem() {
  return (
    <section className="w-full bg-[#181613] py-32 px-8 flex flex-col items-center justify-center text-center">
      <span className="text-[#9C9488] text-[11px] tracking-[0.12em] uppercase font-bold mb-8">
        THE PROBLEM
      </span>
      <h2 className="text-3xl md:text-5xl font-serif text-[#F4EFE6] leading-[1.3] max-w-4xl mx-auto">
        Most to-do lists don't know what's <em className="italic font-light">actually</em> urgent. Things just sit there, getting older, until something quietly falls through. <em className="italic font-light">Kiro keeps score instead.</em>
      </h2>
    </section>
  );
}
