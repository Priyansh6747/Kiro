import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#0E0D0B] py-12 px-8 border-t border-[#332E27]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-[#9C9488] text-xs">
        <div className="flex items-center gap-4">
          <span className="font-bold text-[#F4EFE6] tracking-widest uppercase">Kiro</span>
          <span className="italic">A crew that runs your day.</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          <a href="#" className="hover:text-[#F4EFE6] transition-colors">Crew</a>
          <a href="#" className="hover:text-[#F4EFE6] transition-colors">How it works</a>
          <a href="#" className="hover:text-[#F4EFE6] transition-colors">Themes</a>
          <a href="#" className="hover:text-[#F4EFE6] transition-colors">Contact</a>
        </div>
        
        <div>
          &copy; 2026 Kiro.
        </div>
      </div>
    </footer>
  );
}
