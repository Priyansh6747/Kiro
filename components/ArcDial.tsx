"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { todayUnixDay } from "@/lib/types";

interface ArcDialProps {
  selectedDate: number;
  onChange: (date: number) => void;
}

export function ArcDial({ selectedDate, onChange }: ArcDialProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dates, setDates] = useState<number[]>([]);
  const itemWidth = 80; // width of each item slot

  useEffect(() => {
    // Generate dates from today down to 30 days ago
    const today = todayUnixDay();
    const arr = [];
    for (let i = today; i >= today - 30; i--) {
      arr.push(i);
    }
    // Reverse so oldest is on left, today is on right
    setDates(arr.reverse());
  }, []);

  // Force scroll state update to calculate Y positions
  const [scrollPos, setScrollPos] = useState(0);

  const handleScroll = () => {
    if (scrollRef.current) {
      setScrollPos(scrollRef.current.scrollLeft);
    }
  };

  // Debounced center detection
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleScrollEnd = () => {
    if (!scrollRef.current) return;
    const center = scrollRef.current.scrollLeft + scrollRef.current.clientWidth / 2;
    // Find closest date to center
    let closestDate = selectedDate;
    let minDiff = Infinity;

    // We know each item is itemWidth wide
    // Left padding is 50%, so the first item's center is at scrollRef.current.clientWidth / 2
    // That means at scrollLeft = 0, the first item is exactly centered!
    // So item index = Math.round(scrollLeft / itemWidth)
    const index = Math.round(scrollRef.current.scrollLeft / itemWidth);
    if (index >= 0 && index < dates.length) {
      closestDate = dates[index];
      if (closestDate !== selectedDate) {
        onChange(closestDate);
      }
    }
  };

  const onScrollWrapper = () => {
    handleScroll();
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(handleScrollEnd, 150);
  };

  // Initial scroll to selected date
  useEffect(() => {
    if (dates.length === 0 || !scrollRef.current) return;
    const index = dates.indexOf(selectedDate);
    if (index !== -1) {
      const targetScroll = index * itemWidth;
      // If we are far away, jump. Else smooth.
      const currentScroll = scrollRef.current.scrollLeft;
      if (Math.abs(currentScroll - targetScroll) > 0) {
        scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }, [selectedDate, dates]);

  const selectedDateObj = new Date(selectedDate * 86400000);

  return (
    <div className="w-full bg-surface border-b border-border-default pt-4 pb-2 relative overflow-hidden flex flex-col items-center">
      <div className="text-center z-10 mb-4 select-none">
        <h2 className="text-lg font-bold text-primary">
          {selectedDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </h2>
        <p className="text-sm text-secondary">
          {selectedDateObj.toLocaleDateString("en-US", { weekday: "long" })}
        </p>
      </div>

      <div 
        className="w-full relative h-[100px] overflow-hidden"
      >
        {/* The SVG Arc Background */}
        <svg 
          className="absolute top-8 left-0 w-full h-[60px] pointer-events-none" 
          viewBox="0 0 1000 60" 
          preserveAspectRatio="none"
        >
          <path 
            d="M 0 60 Q 500 -10 1000 60" 
            fill="none" 
            stroke="var(--border-strong)" 
            strokeWidth="1"
          />
        </svg>

        <div
          ref={scrollRef}
          onScroll={onScrollWrapper}
          className="w-full h-full overflow-x-auto hide-scrollbar flex items-start snap-x snap-mandatory"
          style={{ paddingLeft: `calc(50% - ${itemWidth / 2}px)`, paddingRight: `calc(50% - ${itemWidth / 2}px)` }}
        >
          {dates.map((d, i) => {
            // Calculate distance from center to curve items
            // scrollLeft = 0 means item 0 is centered.
            // item center = scrollPos + containerWidth / 2
            // this item's absolute center = (clientWidth/2) + i * itemWidth
            const containerWidth = scrollRef.current?.clientWidth || 0;
            const absoluteCenter = (containerWidth / 2) + i * itemWidth;
            const viewportCenter = scrollPos + (containerWidth / 2);
            
            const distFromCenter = absoluteCenter - viewportCenter;
            
            // Normalize distance: 0 is center, 1 is edge of screen
            const normalizedDist = containerWidth > 0 ? distFromCenter / (containerWidth / 2) : 0;
            
            // Y offset: parabola. 0 at center, up to ~35px at edges
            const translateY = Math.pow(normalizedDist, 2) * 35;
            
            // Scale and opacity
            const scale = Math.max(1 - Math.abs(normalizedDist) * 0.2, 0.8);
            const opacity = Math.max(1 - Math.abs(normalizedDist) * 0.8, 0.2);

            const isSelected = d === selectedDate;

            return (
              <div 
                key={d}
                className="shrink-0 flex items-center justify-center snap-center"
                style={{ 
                  width: itemWidth,
                  transform: `translateY(${translateY + 5}px) scale(${scale})`,
                  opacity: opacity,
                  transition: 'transform 0.1s ease-out, opacity 0.1s ease-out'
                }}
              >
                <button
                  onClick={() => onChange(d)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-medium transition-colors ${
                    isSelected 
                      ? "bg-done text-surface shadow-md" 
                      : "bg-surface border border-border-default text-primary hover:border-border-strong"
                  }`}
                >
                  {new Date(d * 86400000).getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
