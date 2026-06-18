"use client";

import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "@clerk/nextjs";
import type { Preference, RatioMode } from "@/lib/types";
import { getPreferences, patchPreferences } from "@/lib/api-client";
import { LoadingScreen, ErrorBanner, Spinner } from "@/components/ui";

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
    <div className="flex flex-col gap-1.5 py-4 border-b last:border-b-0">
      <label className="text-sm font-medium text-gray-800">{label}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
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
          : "bg-blue-600 text-white hover:bg-blue-700"
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
      <div className="px-4 py-3 border-b bg-white">
        <h1 className="font-semibold text-gray-800">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">Configure how the system behaves</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Planning Settings */}
        <div className="bg-white border-b">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-gray-500 uppercase">Planning</p>
          </div>
          <div className="px-4">
            <Field
              label="Timezone"
              description="Used to calculate today's date for scheduling."
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={availableMin}
                  onChange={(e) => setAvailableMin(Number(e.target.value))}
                />
                <span className="text-xs text-gray-500">
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
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <p className="text-xs text-gray-400">
                {ratioMode === "cumulative"
                  ? "Tracks total tasks done / total assigned over time."
                  : "Tracks consecutive days of ≥50% completion."}
              </p>
            </Field>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white border-b mt-4">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-gray-500 uppercase">Notifications</p>
          </div>
          <div className="px-4">
            <Field
              label="Morning Reminder Time"
              description="When to send your morning nudge (HH:MM, 24h)."
            >
              <div className="flex gap-2">
                <input
                  type="time"
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Account Management */}
        <div className="bg-white border-b mt-4">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-gray-500 uppercase">Account Management</p>
          </div>
          <div className="px-4 py-4 space-y-3">
            {prefs && (
              <div className="text-sm space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Internal User ID</span>
                  <span className="text-gray-700 font-mono text-xs truncate max-w-[200px]">
                    {prefs.userId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ratio mode</span>
                  <span className="text-gray-700">{prefs.ratioMode}</span>
                </div>
              </div>
            )}
            <div className="flex justify-center pt-4">
              <UserProfile routing="hash" appearance={{ elements: { rootBox: "w-full shadow-none", cardBox: "shadow-none border border-gray-200" } }} />
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}


