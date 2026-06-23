"use client";

import {
  BarChart2,
  Bot,
  CheckSquare,
  FolderKanban,
  Settings,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getPreferences, patchPreferences } from "@/lib/api-client";

const NAV_ITEMS = [
  { href: "/today", label: "Today", Icon: Zap },
  { href: "/todo", label: "Todo", Icon: CheckSquare },
  { href: "/projects", label: "Projects", Icon: FolderKanban },
  { href: "/insights", label: "Insights", Icon: BarChart2 },
  { href: "/chat", label: "Yuki", Icon: Bot },
  { href: "/settings", label: "Settings", Icon: Settings },
];

import { MiniChat } from "./MiniChat";

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
              active
                ? "text-accent font-semibold"
                : "text-secondary hover:text-primary transition-colors"
            }`}
          >
            <item.Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

import { useUser } from "@clerk/nextjs";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="hidden md:flex flex-col w-48 lg:w-56 shrink-0 border-r border-border-default bg-surface h-screen sticky top-0 justify-between">
      <div>
        <div className="px-6 py-6">
          <h1 className="text-xl font-mono tracking-tight text-primary">
            Kiro
          </h1>
        </div>
        <nav className="flex flex-col gap-3 px-6 mt-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium tracking-wide transition-all ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-secondary hover:text-primary hover:bg-surface-raised"
                }`}
              >
                <item.Icon
                  className={`w-5 h-5 ${active ? "text-accent" : "text-tertiary"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {user && (
        <div className="p-6 flex items-center gap-3 mt-auto">
          <img
            src={user.imageUrl}
            alt="Profile"
            className="w-10 h-10 rounded-full border border-border-default"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-primary leading-tight">
              {user.fullName || user.firstName || "User"}
            </span>
          </div>
        </div>
      )}
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
          console.log(
            `[Timezone Sync] Updating timezone from ${prefs.timezone} to ${localTz}`,
          );
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
    <div className="flex min-h-screen relative">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 relative overflow-hidden">
        {children}
      </main>
      <BottomNav />
      <MiniChat />
    </div>
  );
}
