"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { todayUnixDay } from "@/lib/types";

interface ArcDialProps {
  selectedDate: number;
  onChange: (date: number) => void;
  totalPlannedMin?: number;
  completedCount?: number;
  totalTasksCount?: number;
}

export function ArcDial({
  selectedDate,
  onChange,
  totalPlannedMin = 0,
  completedCount = 0,
  totalTasksCount = 0,
}: ArcDialProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dates, setDates] = useState<number[]>([]);
  const itemWidth = 80; // width of each item slot

  useEffect(() => {
    // Generate dates from today down to 30 days ago, and 15 days in future
    const today = todayUnixDay();
    const arr = [];
    for (let i = today + 15; i >= today - 30; i--) {
      arr.push(i);
    }
    // Reverse so oldest is on left, future is on right
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
    const center =
      scrollRef.current.scrollLeft + scrollRef.current.clientWidth / 2;
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
      const today = todayUnixDay();

      if (closestDate > today) {
        // Prevent navigating to future dates by rubber-banding back to today
        const todayIndex = dates.indexOf(today);
        if (todayIndex !== -1 && scrollRef.current) {
          scrollRef.current.scrollTo({
            left: todayIndex * itemWidth,
            behavior: "smooth",
          });
        }
      } else if (closestDate !== selectedDate && hasMounted.current) {
        onChange(closestDate);
      }
    }
  };

  const onScrollWrapper = () => {
    handleScroll();
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(handleScrollEnd, 150);
  };

  const hasMounted = useRef(false);

  // Initial scroll to selected date
  useEffect(() => {
    if (dates.length === 0 || !scrollRef.current) return;
    const index = dates.indexOf(selectedDate);
    if (index !== -1) {
      const targetScroll = index * itemWidth;
      const currentScroll = scrollRef.current.scrollLeft;

      if (!hasMounted.current) {
        const tryScroll = (attempts = 0) => {
          if (!scrollRef.current || attempts > 15) return;
          scrollRef.current.scrollLeft = targetScroll;
          setScrollPos(targetScroll);

          if (scrollRef.current.scrollLeft !== targetScroll) {
            requestAnimationFrame(() => tryScroll(attempts + 1));
          } else {
            hasMounted.current = true;
          }
        };
        tryScroll();
      } else if (Math.abs(currentScroll - targetScroll) > 0) {
        scrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
      }
    }
  }, [selectedDate, dates]);

  const selectedDateObj = new Date(selectedDate * 86400000);

  const cap = 480;
  const isOverload = totalPlannedMin > cap;
  const progressRatio =
    totalTasksCount > 0 ? completedCount / totalTasksCount : 0;

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div
      className="w-full border-b pt-4 relative overflow-hidden flex flex-col items-center transition-colors duration-300"
      style={{
        background: "var(--bg-header, var(--color-surface))",
        borderColor: "var(--border-header, var(--color-border-default))",
      }}
    >
      <div className="text-center z-10 mb-4 select-none">
        <h2
          className="text-lg font-bold transition-colors duration-300"
          style={{ color: "var(--text-header, var(--color-primary))" }}
        >
          {selectedDateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </h2>
        <p
          className="text-sm transition-colors duration-300"
          style={{
            color: "var(--text-header-secondary, var(--color-secondary))",
          }}
        >
          {selectedDateObj.toLocaleDateString("en-US", { weekday: "long" })}
        </p>
      </div>

      <div className="absolute top-4 right-6 flex flex-col items-end z-20 pointer-events-none">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: isOverload ? "var(--status-warning)" : "var(--accent)",
          }}
        >
          {isOverload ? "Overload" : "Chill"}
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          {formatTime(totalPlannedMin)} planned
        </span>
      </div>

      <div className="w-full relative h-[124px] overflow-hidden">
        {/* The SVG Arc Background with Progress */}
        <svg
          className="absolute top-8 left-0 w-full h-[92px] pointer-events-none transition-colors duration-300"
          viewBox="0 0 1000 92"
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id="arcProgressClip">
              <rect
                x="0"
                y="0"
                height="92"
                width={`${progressRatio * 1000}`}
                className="transition-all duration-500"
              />
            </clipPath>
          </defs>

          {/* Base capacity area */}
          <path
            d="M 0 60 Q 500 -10 1000 60 L 1000 92 L 0 92 Z"
            style={{ fill: "var(--bg-surface-raised)" }}
            className="opacity-70"
          />

          {/* Progress area */}
          <path
            d="M 0 60 Q 500 -10 1000 60 L 1000 92 L 0 92 Z"
            style={{ fill: "var(--color-done)" }}
            className="opacity-40 transition-all duration-500"
            clipPath="url(#arcProgressClip)"
          />

          {/* Arc stroke line */}
          <path
            d="M 0 60 Q 500 -10 1000 60"
            fill="none"
            style={{
              stroke: "var(--border-header-strong, var(--color-border-strong))",
            }}
            strokeWidth="1"
          />
        </svg>

        <div
          ref={scrollRef}
          onScroll={onScrollWrapper}
          className="w-full h-full overflow-x-auto hide-scrollbar flex items-start snap-x snap-mandatory"
          style={{
            paddingLeft: `calc(50% - ${itemWidth / 2}px)`,
            paddingRight: `calc(50% - ${itemWidth / 2}px)`,
          }}
        >
          {dates.map((d, i) => {
            // Calculate distance from center to curve items
            // scrollLeft = 0 means item 0 is centered.
            // item center = scrollPos + containerWidth / 2
            // this item's absolute center = (clientWidth/2) + i * itemWidth
            const containerWidth = scrollRef.current?.clientWidth || 0;
            const absoluteCenter = containerWidth / 2 + i * itemWidth;
            const viewportCenter = scrollPos + containerWidth / 2;

            const distFromCenter = absoluteCenter - viewportCenter;

            // Normalize distance: 0 is center, 1 is edge of screen
            const normalizedDist =
              containerWidth > 0 ? distFromCenter / (containerWidth / 2) : 0;

            // Y offset: parabola. 0 at center, up to ~35px at edges
            const translateY = Math.pow(normalizedDist, 2) * 35;

            // Scale and opacity
            const scale = Math.max(1 - Math.abs(normalizedDist) * 0.2, 0.8);
            const opacity = Math.max(1 - Math.abs(normalizedDist) * 0.8, 0.2);

            const isSelected = d === selectedDate;
            const isFuture = d > todayUnixDay();
            const futureOpacity = isFuture ? 0.4 : 1;

            return (
              <div
                key={d}
                className="shrink-0 flex items-center justify-center snap-center"
                style={{
                  width: itemWidth,
                  transform: `translateY(${translateY + 5}px) scale(${scale})`,
                  opacity: opacity * futureOpacity,
                  transition: "transform 0.1s ease-out, opacity 0.1s ease-out",
                }}
              >
                <button
                  onClick={() => !isFuture && onChange(d)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-medium transition-all duration-300 ${
                    isSelected
                      ? "shadow-md"
                      : isFuture
                        ? "cursor-not-allowed opacity-50"
                        : "hover:brightness-110"
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? "var(--color-done)"
                      : "var(--bg-header-surface, var(--color-surface))",
                    color: isSelected
                      ? "var(--color-surface)"
                      : "var(--text-header-surface, var(--color-primary))",
                    border: isSelected
                      ? "none"
                      : "1px solid var(--border-header, var(--color-border-default))",
                  }}
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
