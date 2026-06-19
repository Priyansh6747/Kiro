"use client";

import { getPreferences, patchPreferences } from "@/lib/api-client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: "⚡" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/insights", label: "Insights", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border-default bg-surface z-50 flex md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-3 text-xs gap-1 ${
              active ? "text-accent font-semibold" : "text-secondary"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border-default bg-surface h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-border-default">
        <h1 className="text-lg font-bold tracking-tight text-primary">Kiro</h1>
        <p className="text-xs text-secondary mt-0.5">Daily execution</p>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${
                active
                  ? "bg-accent-subtle text-accent font-semibold"
                  : "text-secondary hover:bg-surface-raised"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let active = true;
    async function syncTimezone() {
      try {
        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!localTz) return;

        const prefs = await getPreferences();
        if (active && prefs && prefs.timezone !== localTz) {
          console.log(`[Timezone Sync] Updating timezone from ${prefs.timezone} to ${localTz}`);
          await patchPreferences({ timezone: localTz });
        }
      } catch (err) {
        console.error("[Timezone Sync] Failed to sync timezone:", err);
      }
    }
    syncTimezone();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
