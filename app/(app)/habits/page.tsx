"use client";

import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getHabitsDashboard,
  archiveHabit,
  archiveRecurringTask
} from "@/lib/api-client";
import { CreateRoutineModal } from "@/components/CreateRoutineModal";
import type { Habit, RecurringTask } from "@/lib/db/models";
import { HabitsSkeleton } from "@/components/skeletons";
import { ErrorBanner } from "@/components/ui";
import { useMemo } from "react";
import { useConfirm } from "@/hooks/useConfirm";

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  itemIds: Set<string> = new Set();
}

class Trie {
  root: TrieNode = new TrieNode();

  insert(title: string, id: string) {
    const text = title.toLowerCase();
    const words = text.split(/\s+/);
    for (const word of words) {
      for (let i = 0; i < word.length; i++) {
        let node = this.root;
        for (let j = i; j < word.length; j++) {
          const char = word[j];
          if (!node.children.has(char)) {
            node.children.set(char, new TrieNode());
          }
          node = node.children.get(char)!;
          node.itemIds.add(id);
        }
      }
    }
  }

  search(query: string): Set<string> {
    const text = query.toLowerCase().trim();
    if (!text) return new Set();
    
    let node = this.root;
    for (const char of text) {
      if (!node.children.has(char)) {
        return new Set();
      }
      node = node.children.get(char)!;
    }
    return node.itemIds;
  }
}

function RoutineListItem({ 
  title, 
  streak, 
  onClick, 
  onEdit,
  onDelete,
  isActive 
}: { 
  title: string; 
  streak?: { current: number; best: number; rate7d: number; totalCompletions: number };
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isActive: boolean;
}) {
  const completionRate = streak ? Math.round(streak.rate7d * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={`flex justify-between items-center p-4 bg-surface border rounded-2xl cursor-pointer hover:border-accent transition-all group ${
        isActive ? "border-accent shadow-sm" : "border-border-default"
      }`}
    >
      <span className="font-semibold text-lg text-primary">{title}</span>
      <span className="font-medium text-secondary">{completionRate}%</span>
      <div className={`flex gap-4 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-sm font-medium text-secondary hover:text-accent transition-colors"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-sm font-medium text-secondary hover:text-missed transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const [data, setData] = useState<{
    habits: Habit[];
    streaks: Record<string, { current: number; best: number; rate7d: number; totalCompletions: number }>;
    markers: Record<string, Record<number, string>>;
    recurringTasks: RecurringTask[];
    recurringStreaks: Record<string, { current: number; best: number; rate7d: number; totalCompletions: number }>;
    recurringMarkers: Record<string, Record<number, string>>;
    today: number;
  } | null>(null);
  
  const [activeTab, setActiveTab] = useState<"habits" | "recurring">("habits");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [calendarOffset, setCalendarOffset] = useState(0);
  
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const [dragOrigin, setDragOrigin] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    setRangeStart(null);
    setRangeEnd(null);
  }, [selectedHabitId, activeTab]);

  useEffect(() => {
    const handleGlobalMouseUp = () => setDragOrigin(null);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handleMouseDown = (dayUnix: number) => {
    setDragOrigin(dayUnix);
    setRangeStart(dayUnix);
    setRangeEnd(null);
  };

  const handleMouseEnter = (dayUnix: number) => {
    if (dragOrigin !== null) {
      setRangeStart(Math.min(dragOrigin, dayUnix));
      setRangeEnd(Math.max(dragOrigin, dayUnix));
    }
  };

  const loadData = async (keepSelection = false) => {
    try {
      setIsLoading(true);
      // Fetch data for roughly a year back just to be safe for calendar scrolling, 
      // though typically you'd fetch per month dynamically.
      const res = await getHabitsDashboard();
      setData(res);
      if (!keepSelection && res.habits.length > 0) {
        setSelectedHabitId(res.habits[0].id);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentStreaks = activeTab === "habits" ? data?.streaks || {} : data?.recurringStreaks || {};
  const currentMarkers = activeTab === "habits" ? data?.markers || {} : data?.recurringMarkers || {};
  const currentList = [...(activeTab === "habits" ? data?.habits || [] : data?.recurringTasks || [])].sort((a, b) => {
    const rateA = currentStreaks[a.id]?.rate7d ?? 0;
    const rateB = currentStreaks[b.id]?.rate7d ?? 0;
    return rateB - rateA;
  });

  const searchTrie = useMemo(() => {
    const trie = new Trie();
    for (const item of currentList) {
      trie.insert((item as any).name || (item as any).title, item.id);
    }
    return trie;
  }, [currentList]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const matchedIds = searchTrie.search(searchQuery);
    return currentList.filter(item => matchedIds.has(item.id));
  }, [currentList, searchQuery, searchTrie]);

  if (isLoading || !data) return <HabitsSkeleton />;
  if (error) return <ErrorBanner message={error.message} onRetry={loadData} />;

  const { today } = data;

  const selectedItem = currentList.find(item => item.id === selectedHabitId);
  const selectedStreak = selectedHabitId ? currentStreaks[selectedHabitId] : null;

  // Tracker grid days (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => today - 6 + i);

  // Calendar calculations
  const todayDateObj = new Date(today * 86400000);
  const calDateObj = new Date(Date.UTC(todayDateObj.getUTCFullYear(), todayDateObj.getUTCMonth() + calendarOffset, 1));
  const calYear = calDateObj.getUTCFullYear();
  const calMonth = calDateObj.getUTCMonth();
  
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(calDateObj);
  
  const daysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate();
  // 0 = Mon, 6 = Sun
  const firstDayOfWeek = (new Date(Date.UTC(calYear, calMonth, 1)).getUTCDay() + 6) % 7;
  
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyCells = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="flex flex-col h-full w-full bg-base p-6 md:p-8 overflow-hidden font-sans">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full mb-8 gap-4">
        <div className="flex gap-2 md:gap-4">
          <button 
            onClick={() => { setActiveTab("habits"); setSelectedHabitId(data?.habits?.[0]?.id || null); }}
            className={`px-6 md:px-10 py-2.5 rounded-xl font-bold text-lg transition-colors ${
              activeTab === "habits" 
                ? "bg-accent-subtle text-accent border border-accent" 
                : "bg-surface-raised text-secondary border border-border-default hover:bg-surface"
            }`}
          >
            Habits
          </button>
          <button 
            onClick={() => { setActiveTab("recurring"); setSelectedHabitId(data?.recurringTasks?.[0]?.id || null); }}
            className={`px-6 md:px-10 py-2.5 rounded-xl font-bold text-lg transition-colors ${
              activeTab === "recurring" 
                ? "bg-accent-subtle text-accent border border-accent" 
                : "bg-surface-raised text-secondary border border-border-default hover:bg-surface"
            }`}
          >
            Recurring tasks
          </button>
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border-default text-primary rounded-xl focus:outline-none focus:border-accent font-medium placeholder:text-tertiary transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none">
              <Search className="w-5 h-5" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-160px)] overflow-hidden w-full">
        {/* Left Panel: List */}
        <div className="lg:w-[450px] flex shrink-0 h-full relative">
          {/* Y axis */}
          <div className="flex flex-col items-center mr-6 mt-8 relative shrink-0">
            <div className="h-full w-0.5 bg-border-strong relative flex justify-center rounded-full">
              <div className="absolute top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-tertiary font-bold text-lg tracking-wide bg-base px-2">
                Avg completion rate
              </div>
              <div className="absolute -bottom-[1px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-border-strong"></div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-24 w-full scrollbar-none">
            {filteredList.length === 0 ? (
               <div className="text-secondary text-sm p-4 text-center">No items found.</div>
            ) : (
               filteredList.map((item) => (
                <RoutineListItem 
                  key={item.id} 
                  title={(item as any).name || (item as any).title} 
                  streak={currentStreaks[item.id]}
                  isActive={selectedHabitId === item.id}
                  onClick={() => setSelectedHabitId(item.id)}
                  onEdit={() => {
                    setEditItem(item);
                    setIsCreateModalOpen(true);
                  }}
                  onDelete={async () => {
                    const confirmed = await confirm("Delete item", "Are you sure you want to delete this?");
                    if (confirmed) {
                      if ("name" in item) await archiveHabit(item.id);
                      else await archiveRecurringTask(item.id);
                      
                      if (selectedHabitId === item.id) setSelectedHabitId(null);
                      loadData(true);
                    }
                  }}
                />
              ))
            )}
          </div>

          {/* Floating FAB */}
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-accent rounded-full flex items-center justify-center hover:bg-accent-hover text-white shadow-lg shadow-accent/20 transition-all z-10"
          >
            <Plus className="w-8 h-8" strokeWidth={2.5} />
          </button>
        </div>

        {/* Right Panel: Details */}
        <div className="flex-1 h-full border border-border-default rounded-2xl p-6 lg:p-8 flex flex-col overflow-y-auto bg-surface shadow-sm">
          {/* Top Streak section */}
          <div className="flex gap-12 md:gap-24 ml-2 md:ml-8 mb-8">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-[3px] border-accent flex items-center justify-center text-accent text-4xl font-bold mb-3 bg-accent-subtle/30 shadow-inner shadow-accent/10">
                {selectedStreak?.current ?? 0}
              </div>
              <span className="text-accent font-semibold text-base">Current Streak</span>
              <span className="text-secondary text-sm">Selected {activeTab === "habits" ? "Habit" : "Task"}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 border-[3px] border-border-strong flex items-center justify-center text-secondary text-4xl font-bold mb-3 rotate-45 rounded-lg bg-surface-raised">
                <span className="-rotate-45 block">{selectedStreak?.best ?? 0}</span>
              </div>
              <span className="text-secondary font-semibold text-base mt-1">Longest Streak</span>
              <span className="text-tertiary text-sm">All Time</span>
            </div>
          </div>

          {/* Tracker Grid (7 Days for all habits) */}
          <div className="border-t border-b border-border-subtle py-6 mb-8">
            <div className="flex overflow-x-auto gap-3 pb-2">
              {last7Days.map((dayUnix) => {
                const dateObj = new Date(dayUnix * 86400000);
                const dayName = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(dateObj).toUpperCase();
                
                // Let's color the header based on whether the selected item was completed this day
                const selectedStatus = selectedHabitId ? currentMarkers[selectedHabitId]?.[dayUnix] : null;
                const headerStyle = selectedStatus === "done" 
                   ? "bg-done-subtle text-done border-done/20" 
                   : selectedStatus === "missed"
                   ? "bg-missed-subtle text-missed border-missed/20"
                   : "bg-surface-raised text-tertiary border-border-subtle";

                return (
                  <div key={dayUnix} className="flex flex-col min-w-[120px]">
                    <div className={`text-center font-bold text-[10px] sm:text-xs mb-2 py-1 rounded border ${headerStyle}`}>
                      {dayName}
                    </div>
                    
                    {currentList.slice(0, 5).map((h, idx) => {
                      const status = currentMarkers[h.id]?.[dayUnix];
                      const isDone = status === "done";
                      const isMissed = status === "missed";
                      
                      const itemName = (h as any).name || (h as any).title;
                      
                      return (
                        <div key={h.id} className="flex items-center gap-1.5 mb-2 text-xs font-medium text-secondary truncate">
                          <div
                            className={`w-3 h-3 rounded-full border shrink-0 transition-colors ${
                              isDone
                                ? "bg-done border-done"
                                : isMissed
                                ? "bg-missed-subtle border-missed"
                                : "bg-transparent border-border-strong"
                            }`}
                          ></div>
                          <span className="truncate min-w-0" title={itemName}>{itemName}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom details */}
          <div className="flex-1 flex flex-col gap-6 min-h-[400px]">
            <div className="flex flex-col xl:flex-row gap-6 shrink-0 h-auto">
              
              {/* Dynamic Calendar for Selected Habit */}
              <div className="w-full xl:w-[320px] flex flex-col p-4 border border-border-default rounded-2xl bg-surface-raised select-none">
                <div className="flex justify-between items-center font-bold text-sm text-secondary mb-6">
                  <ChevronLeft 
                    className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" 
                    onClick={() => setCalendarOffset(o => o - 1)}
                  />
                  <span className="tracking-widest uppercase text-primary">{monthName} {calYear}</span>
                  <ChevronRight 
                    className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" 
                    onClick={() => setCalendarOffset(o => o + 1)}
                  />
                </div>
                <div className="grid grid-cols-7 text-center text-xs font-bold text-tertiary mb-4">
                  <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                </div>
                <div className="grid grid-cols-7 text-center text-sm gap-y-4 font-medium text-secondary">
                  {emptyCells.map((_, i) => (
                    <span key={`empty-${i}`}></span>
                  ))}
                  
                  {calendarDays.map((dayNum) => {
                    const dayUnix = Math.floor(Date.UTC(calYear, calMonth, dayNum) / 86400000);
                    const status = selectedHabitId ? currentMarkers[selectedHabitId]?.[dayUnix] : null;
                    
                    const isRangeStart = rangeStart === dayUnix;
                    const isRangeEnd = rangeEnd === dayUnix || (rangeStart === dayUnix && rangeEnd === null);
                    const inRange = rangeStart !== null && dayUnix >= rangeStart && dayUnix <= (rangeEnd ?? rangeStart);

                    let wrapperClass = "relative flex items-center justify-center h-8 cursor-pointer group";
                    if (inRange) {
                      if (isRangeStart && isRangeEnd) wrapperClass += " bg-accent-subtle rounded-full";
                      else if (isRangeStart) wrapperClass += " bg-accent-subtle rounded-l-full";
                      else if (isRangeEnd) wrapperClass += " bg-accent-subtle rounded-r-full";
                      else wrapperClass += " bg-accent-subtle";
                    }

                    let cellStyle = "w-7 h-7 rounded-full mx-auto flex items-center justify-center transition-colors group-hover:text-primary z-10 font-bold";
                    
                    if (isRangeStart || isRangeEnd) {
                      cellStyle += " bg-accent text-white shadow-sm border border-accent";
                    } else if (status === "done") {
                      cellStyle += " bg-done text-white shadow-sm";
                    } else if (status === "missed") {
                      cellStyle += " bg-missed text-white shadow-sm";
                    } else if (dayUnix === today && !inRange) {
                      cellStyle += " border-2 border-accent text-accent";
                    } else {
                      cellStyle += " text-secondary";
                    }

                    return (
                      <div 
                        key={dayNum} 
                        className={wrapperClass} 
                        onMouseDown={() => handleMouseDown(dayUnix)}
                        onMouseEnter={() => handleMouseEnter(dayUnix)}
                      >
                        <span className={cellStyle}>
                          {dayNum}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Range specific details */}
              <div className="flex-1 border border-border-default rounded-2xl p-6 flex flex-col items-center justify-center text-secondary font-medium h-full min-h-[250px] bg-surface-raised/50">
                <span className="text-tertiary mb-2">✦</span>
                {selectedItem ? (
                  <div className="text-center w-full">
                    <p className="text-primary font-bold text-lg mb-2">{(selectedItem as any).name || (selectedItem as any).title} Range Stats</p>
                    {rangeStart !== null ? (
                      <div className="flex flex-col gap-2 mt-4">
                        {(() => {
                          const rEnd = rangeEnd ?? rangeStart;
                          const total = rEnd - rangeStart + 1;
                          let comp = 0; let miss = 0; let skip = 0;
                          for(let i=rangeStart; i<=rEnd; i++) {
                            const st = currentMarkers[selectedItem.id]?.[i];
                            if (st === "done") comp++;
                            else if (st === "missed") miss++;
                            else if (st === "skipped") skip++;
                          }
                          const rate = Math.round((comp / total) * 100);
                          return (
                            <>
                              <p className="text-sm text-tertiary mb-2">
                                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(rangeStart * 86400000))} 
                                {rEnd !== rangeStart && ` - ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(rEnd * 86400000))}`}
                              </p>
                              <div className="flex justify-between px-4 bg-surface rounded-lg py-2 border border-border-default">
                                <span>Completion Rate</span>
                                <span className="font-bold text-primary">{rate}%</span>
                              </div>
                              <div className="flex justify-between px-4 bg-surface rounded-lg py-2 border border-border-default">
                                <span>Completed</span>
                                <span className="font-bold text-done">{comp} days</span>
                              </div>
                              <div className="flex justify-between px-4 bg-surface rounded-lg py-2 border border-border-default">
                                <span>Missed</span>
                                <span className="font-bold text-missed">{miss} days</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <>
                        <p>7-Day Completion Rate: {selectedStreak?.rate7d ? Math.round(selectedStreak.rate7d * 100) : 0}%</p>
                        <p>Cadence: {(selectedItem as any).cadence}</p>
                        <p className="text-xs text-tertiary mt-4 max-w-[200px] mx-auto">Select a range on the calendar to see custom statistics.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p>Select an item to view range details.</p>
                )}
              </div>
            </div>

            {/* Task details */}
            <div className="border border-border-default rounded-2xl flex-1 flex flex-col items-center justify-center text-secondary font-medium min-h-[200px] bg-surface-raised/50">
              <span className="text-tertiary mb-2">✦</span>
              {selectedItem ? (
                <div className="text-center">
                  <p className="text-primary font-bold text-lg mb-4">{(selectedItem as any).name || (selectedItem as any).title} Overview</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="text-right text-tertiary">Current Streak:</div>
                    <div className="text-left font-bold text-primary">{selectedStreak?.current ?? 0}</div>
                    
                    <div className="text-right text-tertiary">Best Streak:</div>
                    <div className="text-left font-bold text-primary">{selectedStreak?.best ?? 0}</div>
                    
                    <div className="text-right text-tertiary">Total Completions:</div>
                    <div className="text-left font-bold text-primary">{selectedStreak?.totalCompletions ?? 0}</div>
                    
                    <div className="text-right text-tertiary">Created:</div>
                    <div className="text-left font-bold text-primary">
                      {new Date((selectedItem as any).createdAt * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ) : (
                <p>Task details</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <CreateRoutineModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditItem(null);
        }}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          setEditItem(null);
          loadData(true);
        }}
        editItem={editItem}
      />
      
      <ConfirmModal />
    </div>
  );
}
