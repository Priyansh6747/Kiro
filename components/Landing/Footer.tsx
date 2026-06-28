import React from 'react';
import Link from 'next/link';
export default function Footer() {
  return (
    <footer className="w-full bg-[#0E0D0B] py-12 px-8 border-t border-[#332E27]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-[#9C9488] text-xs">
        <div className="flex items-center gap-4">
          <span className="font-bold text-[#F4EFE6] tracking-widest uppercase">Kiro</span>
          <span className="italic">A crew that runs your day.</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-[#FF8A3D] transition-colors">Privacy Policy</Link>
          <span>&copy; 2026 Kiro.</span>
        </div>
      </div>
    </footer>
  );
}
