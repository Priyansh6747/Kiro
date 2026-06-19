"use client";

import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "@clerk/nextjs";
import type { Preference, RatioMode } from "@/lib/types";
import { getPreferences, patchPreferences } from "@/lib/api-client";
import { LoadingScreen, ErrorBanner, Spinner } from "@/components/ui";
import { useTheme } from "@/components/ThemeProvider";

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-4 border-b border-border-default last:border-b-0">
      <label className="text-sm font-medium text-primary">{label}</label>
      {description && <p className="text-xs text-secondary">{description}</p>}
      {children}
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
      className={`rounded px-3 py-1.5 text-xs font-medium ${
        saved
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-accent text-white hover:bg-blue-700"
      } disabled:opacity-50 flex items-center gap-1`}
    >
      {saving && <Spinner size="sm" />}
      {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
    </button>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  // Individual field states
  const [timezone, setTimezone] = useState("UTC");
  const [availableMin, setAvailableMin] = useState(240);
  const [ratioMode, setRatioMode] = useState<RatioMode>("cumulative");
  const [nudgeTime, setNudgeTime] = useState("08:00");

  // Save states per field
  const [savingTz, setSavingTz] = useState(false);
  const [savedTz, setSavedTz] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);
  const [savedAvail, setSavedAvail] = useState(false);
  const [savingRatio, setSavingRatio] = useState(false);
  const [savedRatio, setSavedRatio] = useState(false);
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
      alert((e as Error).message);
    } finally {
      setFn(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading settings…" />;
  if (error)
    return (
      <div className="p-4">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 py-3 border-b border-border-default bg-surface">
        <h1 className="font-semibold text-primary">Settings</h1>
        <p className="text-xs text-secondary mt-0.5">Configure how the system behaves</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Planning Settings */}
        <div className="bg-surface border-b border-border-default">
          <div className="px-4 py-3 border-b border-border-default">
            <p className="text-xs font-semibold text-secondary uppercase">Planning</p>
          </div>
          <div className="px-4">
            <Field
              label="Timezone"
              description="Used to calculate today's date for scheduling."
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              description="How many minutes you have available per day by default."
            >
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={30}
                  max={1440}
                  step={15}
                  className="w-32 border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={availableMin}
                  onChange={(e) => setAvailableMin(Number(e.target.value))}
                />
                <span className="text-xs text-secondary">
                  = {Math.floor(availableMin / 60)}h {availableMin % 60}m
                </span>
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
              description="How your daily completion ratio is calculated."
            >
              <div className="flex gap-2">
                <select
                  className="flex-1 border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    save({ ratio_mode: ratioMode }, setSavingRatio, setSavedRatio)
                  }
                />
              </div>
              <p className="text-xs text-tertiary">
                {ratioMode === "cumulative"
                  ? "Tracks total tasks done / total assigned over time."
                  : "Tracks consecutive days of ≥50% completion."}
              </p>
            </Field>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-surface border-b border-border-default mt-4">
          <div className="px-4 py-3 border-b border-border-default">
            <p className="text-xs font-semibold text-secondary uppercase">Notifications</p>
          </div>
          <div className="px-4">
            <Field
              label="Morning Reminder Time"
              description="When to send your morning nudge (HH:MM, 24h)."
            >
              <div className="flex gap-2">
                <input
                  type="time"
                  className="border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-surface border-b border-border-default mt-4">
          <div className="px-4 py-3 border-b border-border-default">
            <p className="text-xs font-semibold text-secondary uppercase">Appearance</p>
          </div>
          <div className="px-4">
            <Field
              label="Theme"
              description="Choose between light and dark mode."
            >
              <div className="flex gap-2">
                <select
                  className="flex-1 border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-primary"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as "paper" | "midnight" | "nebula" | "sage" | "nightshade")}
                >
                  <option value="paper">Paper (Light)</option>
                  <option value="midnight">Midnight (Dark)</option>
                  <option value="nightshade">Nightshade (High Contrast)</option>
                  <option value="nebula">Nebula (Soft Lilac)</option>
                  <option value="sage">Sage (Nature)</option>
                </select>
              </div>
            </Field>
          </div>
        </div>

        {/* Account Management */}
        <div className="bg-surface border-b border-border-default mt-4">
          <div className="px-4 py-3 border-b border-border-default">
            <p className="text-xs font-semibold text-secondary uppercase">Account Management</p>
          </div>
          <div className="px-4 py-4 space-y-3">
            {prefs && (
              <div className="text-sm space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-secondary">Internal User ID</span>
                  <span className="text-secondary font-mono text-xs truncate max-w-[200px]">
                    {prefs.userId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Ratio mode</span>
                  <span className="text-secondary">{prefs.ratioMode}</span>
                </div>
              </div>
            )}
            <div className="flex justify-center pt-4">
              <UserProfile routing="hash" appearance={{ elements: { rootBox: "w-full shadow-none", cardBox: "shadow-none border border-border-default" } }} />
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}


