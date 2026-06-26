import { useState } from "react";
import { X } from "lucide-react";
import { createHabit, createRecurringTask } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";

export function CreateRoutineModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"habit" | "recurring">("habit");
  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState<"daily" | "weekly" | "custom">("daily");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      if (type === "habit") {
        await createHabit({ name: title, cadence, activeDays: null, estimateMin: 30 });
      } else {
        await createRecurringTask({ title, cadence, activeDays: null, recurrenceRule: null, estimateMin: 30, projectId: null });
      }
      showToast(`${type === "habit" ? "Habit" : "Recurring Task"} created!`, "success");
      onSuccess();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border border-border-default rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-tertiary hover:text-primary hover:bg-surface-raised rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-primary mb-6">Create New Routine</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("habit")}
                className={`flex-1 py-2 px-3 rounded-lg border font-medium text-sm transition-colors ${
                  type === "habit"
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-surface-raised border-border-subtle text-secondary"
                }`}
              >
                Habit
              </button>
              <button
                type="button"
                onClick={() => setType("recurring")}
                className={`flex-1 py-2 px-3 rounded-lg border font-medium text-sm transition-colors ${
                  type === "recurring"
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-surface-raised border-border-subtle text-secondary"
                }`}
              >
                Recurring Task
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "habit" ? "e.g. Drink 2L Water" : "e.g. Take out trash"}
              className="w-full bg-surface-raised border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Cadence</label>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as any)}
              className="w-full bg-surface-raised border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-accent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
