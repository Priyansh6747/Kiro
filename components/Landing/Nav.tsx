import React from 'react';

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-5 bg-[#0E0D0B]/90 backdrop-blur-md border-b border-[#332E27]/50 text-[#F4EFE6]">
      <div className="text-xl font-bold tracking-tight">Kiro</div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <a href="#" className="hover:text-white transition-colors">Crew</a>
        <a href="#" className="hover:text-white transition-colors">How it works</a>
      </div>
      <div>
        <button className="px-6 py-2.5 rounded-full bg-[#221F1B] text-[#F4EFE6] text-sm font-medium hover:bg-[#332E27] transition-colors border border-[#332E27]">
          Get Started
        </button>
      </div>
    </nav>
  );
}
