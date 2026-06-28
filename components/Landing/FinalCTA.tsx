import React from 'react';
import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section className="w-full bg-[#0E0D0B] py-32 px-8 flex flex-col items-center justify-center text-center border-t border-[#332E27]">
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#F4EFE6] leading-tight mb-10 max-w-2xl">
        Stop managing tasks.<br/>
        <em className="italic font-light">Your crew is already waiting.</em>
      </h2>
      <Link href="/today" className="inline-block px-10 py-4 rounded-full bg-[#FF8A3D] text-[#0E0D0B] text-sm font-semibold hover:opacity-90 transition-opacity">
        Get Started
      </Link>
    </section>
  );
}
