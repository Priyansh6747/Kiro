import React from 'react';

export default function FinalCTA() {
  return (
    <section className="w-full bg-[#181613] py-40 px-8 flex flex-col items-center justify-center text-center">
      <h2 className="text-4xl md:text-5xl font-serif text-[#F4EFE6] mb-12">
        <em className="italic font-light">Your crew is already waiting.</em>
      </h2>
      <button className="px-10 py-4 rounded-full bg-[#FF8A3D] text-[#0E0D0B] text-sm font-semibold hover:opacity-90 transition-opacity">
        Get Started
      </button>
    </section>
  );
}
