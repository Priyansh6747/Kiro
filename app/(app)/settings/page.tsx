"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Contrast, Leaf, Moon, Sparkles, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { SettingsSkeleton } from "@/components/skeletons";
import { ErrorBanner, Spinner } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { getPreferences, patchPreferences } from "@/lib/api-client";
import type { Preference, RatioMode } from "@/lib/types";

function Field({
  label,
  description,
  children,
  fullWidthContent = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  fullWidthContent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-start justify-between gap-6 py-6 border-b border-border-subtle last:border-0 transition-colors`}
    >
      <div
        className={`${fullWidthContent ? "md:w-1/3" : "flex-1"} shrink-0 space-y-1.5`}
      >
        <label className="text-sm font-semibold text-primary">{label}</label>
        {description && (
          <p className="text-sm text-secondary max-w-md leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div
        className={`shrink-0 w-full ${fullWidthContent ? "md:flex-1" : "md:w-80"}`}
      >
        {children}
      </div>
    </div>
  );
}

function SaveButton({
  saving,
  saved,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all shadow-sm ${
        saved
          ? "bg-green-50 text-green-700 border border-green-200 ring-2 ring-green-100"
          : "bg-accent text-white hover:bg-accent-hover hover:shadow focus:ring-2 focus:ring-accent-subtle"
      } disabled:opacity-50 flex items-center justify-center gap-2`}
    >
      {saving && <Spinner size="sm" />}
      {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
    </button>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-border-default rounded-2xl shadow-sm overflow-hidden mb-8 transition-shadow hover:shadow-md">
      <div className="px-6 py-5 border-b border-border-subtle bg-surface-raised flex flex-col gap-1">
        <h2 className="text-base font-semibold text-primary">{title}</h2>
        {description && <p className="text-sm text-secondary">{description}</p>}
      </div>
      <div className="px-6">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const clerk = useClerk();
  const [prefs, setPrefs] = useState<Preference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  // Individual field states
  const [timezone, setTimezone] = useState("UTC");
  const [availableMin, setAvailableMin] = useState(240);
  const [ratioMode, setRatioMode] = useState<RatioMode>("cumulative");
  const [streakThreshold, setStreakThreshold] = useState(75);
  const [nudgeTime, setNudgeTime] = useState("08:00");

  // Save states per field
  const [savingTz, setSavingTz] = useState(false);
  const [savedTz, setSavedTz] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);
  const [savedAvail, setSavedAvail] = useState(false);
  const [savingRatio, setSavingRatio] = useState(false);
  const [savedRatio, setSavedRatio] = useState(false);
  const [savingStreakThreshold, setSavingStreakThreshold] = useState(false);
  const [savedStreakThreshold, setSavedStreakThreshold] = useState(false);
  const [savingNudge, setSavingNudge] = useState(false);
  const [savedNudge, setSavedNudge] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getPreferences();
      setPrefs(p);
      setTimezone(p.timezone);
      setAvailableMin(p.defaultAvailableMin);
      setRatioMode(p.ratioMode);
      setStreakThreshold(p.streakThreshold ?? 75);
      setNudgeTime(p.morningNudgeTime);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (
    data: Parameters<typeof patchPreferences>[0],
    setFn: (v: boolean) => void,
    savedFn: (v: boolean) => void,
  ) => {
    setFn(true);
    savedFn(false);
    try {
      const updated = await patchPreferences(data);
      setPrefs(updated);
      savedFn(true);
      setTimeout(() => savedFn(false), 2000);
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setFn(false);
    }
  };

  if (loading) return <SettingsSkeleton />;
  if (error)
    return (
      <div className="p-8 max-w-4xl mx-auto w-full">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );

  return (
    <div className="flex flex-col flex-1 bg-base min-h-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-6 md:p-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Settings
          </h1>
          <p className="text-base text-secondary mt-2">
            Manage your preferences, appearance, and account settings.
          </p>
        </div>

        <SectionCard title="Account" description="Manage your active session.">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-6 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-4 truncate">
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="w-12 h-12 rounded-full border border-border-default shadow-sm shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-primary truncate">
                    {user.fullName || user.firstName || "User"}
                  </span>
                  <span className="text-xs text-secondary truncate">
                    {user.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-secondary">Loading profile...</div>
            )}

            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => clerk.openUserProfile()}
                className="px-4 py-2 text-sm font-medium text-secondary bg-surface-raised hover:text-primary hover:border-border-strong border border-border-default rounded-lg transition-all focus:ring-2 focus:ring-accent/30"
              >
                Manage Account
              </button>
              <button
                onClick={() => clerk.signOut()}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all focus:ring-2 focus:ring-red-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Planning Preferences"
          description="Control how your daily tasks and availability are calculated."
        >
          <Field
            label="Timezone"
            description="Used to calculate today's date for scheduling and streaks."
          >
            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 bg-surface-raised border border-border-default rounded-lg px-4 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. America/New_York"
                list="timezones"
              />
              <SaveButton
                saving={savingTz}
                saved={savedTz}
                onClick={() => save({ timezone }, setSavingTz, setSavedTz)}
              />
            </div>
          </Field>

          <Field
            label="Default Available Minutes"
            description="How much total time you have available per day for tasks by default."
          >
            <div className="flex gap-3 items-center">
              <input
                type="number"
                min={30}
                max={1440}
                step={15}
                className="w-24 bg-surface-raised border border-border-default rounded-lg px-4 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all text-center"
                value={availableMin}
                onChange={(e) => setAvailableMin(Number(e.target.value))}
              />
              <span className="text-sm font-medium text-secondary min-w-[80px]">
                {Math.floor(availableMin / 60)}h {availableMin % 60}m
              </span>
              <div className="flex-1" />
              <SaveButton
                saving={savingAvail}
                saved={savedAvail}
                onClick={() =>
                  save(
                    { default_available_min: availableMin },
                    setSavingAvail,
                    setSavedAvail,
                  )
                }
              />
            </div>
          </Field>

          <Field
            label="Ratio Mode"
            description="How your daily completion performance ratio is calculated."
          >
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <select
                  className="flex-1 bg-surface-raised border border-border-default rounded-lg px-4 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer"
                  value={ratioMode}
                  onChange={(e) => setRatioMode(e.target.value as RatioMode)}
                >
                  <option value="cumulative">Cumulative</option>
                  <option value="streak">Streak</option>
                </select>
                <SaveButton
                  saving={savingRatio}
                  saved={savedRatio}
                  onClick={() =>
                    save(
                      { ratio_mode: ratioMode },
                      setSavingRatio,
                      setSavedRatio,
                    )
                  }
                />
              </div>
              <p className="text-xs text-tertiary bg-surface-raised px-3 py-2 rounded-md border border-border-subtle">
                {ratioMode === "cumulative"
                  ? "Cumulative tracks total completed project tasks against total assigned over time."
                  : "Streak tracks your consecutive days of achieving at least 50% project task completion."}
              </p>
            </div>
          </Field>

          <Field
            label="Routine Streak Threshold (%)"
            description="Minimum daily completion percentage of habits and recurring tasks required to maintain a routine streak."
          >
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                className="w-24 bg-surface-raised border border-border-default rounded-lg px-4 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all text-center"
                value={streakThreshold}
                onChange={(e) => setStreakThreshold(Number(e.target.value))}
              />
              <span className="text-sm font-medium text-secondary min-w-[30px]">
                %
              </span>
              <div className="flex-1" />
              <SaveButton
                saving={savingStreakThreshold}
                saved={savedStreakThreshold}
                onClick={() =>
                  save(
                    { streak_threshold: streakThreshold },
                    setSavingStreakThreshold,
                    setSavedStreakThreshold,
                  )
                }
              />
            </div>
          </Field>
        </SectionCard>

        <SectionCard
          title="Notifications"
          description="Manage when you receive alerts and reminders."
        >
          <Field
            label="Morning Reminder Time"
            description="The time you'll receive your daily morning nudge to plan your day."
          >
            <div className="flex gap-3">
              <input
                type="time"
                className="flex-1 bg-surface-raised border border-border-default rounded-lg px-4 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer"
                value={nudgeTime}
                onChange={(e) => setNudgeTime(e.target.value)}
              />
              <SaveButton
                saving={savingNudge}
                saved={savedNudge}
                onClick={() =>
                  save(
                    { morning_nudge_time: nudgeTime },
                    setSavingNudge,
                    setSavedNudge,
                  )
                }
              />
            </div>
          </Field>
        </SectionCard>

        <SectionCard
          title="Appearance"
          description="Customize the look and feel of your workspace."
        >
          <Field
            label="Color Theme"
            description="Choose a theme that suits your style. Themes affect all charts, tasks, and backgrounds."
            fullWidthContent
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
              {[
                {
                  id: "paper",
                  label: "Paper",
                  Icon: Sun,
                  desc: "Light & Clean",
                  preview: {
                    base: "#F6EFE4",
                    surface: "#FFFCF6",
                    primary: "#3A2E22",
                    accent: "#B0623E",
                    border: "#DDCCB4",
                  },
                },
                {
                  id: "midnight",
                  label: "Midnight",
                  Icon: Moon,
                  desc: "Dark & Emerald",
                  preview: {
                    base: "#050606",
                    surface: "#121514",
                    primary: "#FFFFFF",
                    accent: "#3ABF92",
                    border: "#262E2A",
                  },
                },
                {
                  id: "nightshade",
                  label: "Nightshade",
                  Icon: Contrast,
                  desc: "High Contrast Dark",
                  preview: {
                    base: "#101114",
                    surface: "#1C1D22",
                    primary: "#FFFFFF",
                    accent: "#5C32FA",
                    border: "#34353E",
                  },
                },
                {
                  id: "nebula",
                  label: "Nebula",
                  Icon: Sparkles,
                  desc: "Soft Lilac Light",
                  preview: {
                    base: "#FAF7FB",
                    surface: "#FFFFFF",
                    primary: "#352E40",
                    accent: "#9579C2",
                    border: "#E5D9EA",
                  },
                },
                {
                  id: "sage",
                  label: "Sage",
                  Icon: Leaf,
                  desc: "Organic Earthy Greens",
                  preview: {
                    base: "#F0F1E6",
                    surface: "#FBFCF6",
                    primary: "#283420",
                    accent: "#5B8C3E",
                    border: "#CDD2B5",
                  },
                },
              ].map((t) => {
                const active = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all w-full ${
                      active
                        ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                        : "border-border-default bg-surface hover:border-border-strong hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <t.Icon
                        className={`w-4 h-4 ${active ? "text-accent" : "text-secondary"}`}
                      />
                      <span
                        className={`text-sm font-semibold ${active ? "text-primary" : "text-secondary"}`}
                      >
                        {t.label}
                      </span>
                    </div>
                    <span className="text-xs text-tertiary">{t.desc}</span>

                    {/* Theme Preview Box */}
                    <div
                      style={{
                        backgroundColor: t.preview.base,
                        borderColor: t.preview.border,
                      }}
                      className="mt-4 w-full h-10 rounded-lg border flex items-center px-3 gap-2 overflow-hidden shadow-inner"
                    >
                      <div
                        style={{
                          backgroundColor: t.preview.surface,
                          borderColor: t.preview.border,
                        }}
                        className="w-5 h-5 rounded-md shadow-sm border"
                      />
                      <div
                        style={{ backgroundColor: t.preview.primary }}
                        className="w-8 h-2 rounded-full opacity-80"
                      />
                      <div className="flex-1" />
                      <div
                        style={{ backgroundColor: t.preview.accent }}
                        className="w-4 h-4 rounded-full"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>
        </SectionCard>

        <div className="h-12" />
      </div>
    </div>
  );
}
