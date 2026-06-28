"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function ConsentDialog() {
  const { isLoaded, user } = useUser();
  
  const [showDialog, setShowDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isLoaded || !user) return;

    if (user.createdAt && user.lastSignInAt) {
      // Check if this is a new account creation (createdAt and lastSignInAt are identical or very close)
      const timeDiff = Math.abs(user.createdAt.getTime() - user.lastSignInAt.getTime());
      const isNewAccount = timeDiff < 5000;
      
      const localConsent = localStorage.getItem("privacy_consent") === "true";
      
      if (isNewAccount && !localConsent) {
        setShowDialog(true);
      }
    }
  }, [isLoaded, user, mounted]);

  const handleAgree = async () => {
    setIsSaving(true);
    localStorage.setItem("privacy_consent", "true");
    
    try {
      await fetch("/api/auth/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });
    } catch (err) {
      console.error("Failed to save consent to DB", err);
    }
    
    setIsSaving(false);
    setShowDialog(false);
  };

  if (!mounted || !showDialog) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-raised border border-border-default rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-primary mb-3">Privacy & Terms</h2>
          <p className="text-sm text-secondary leading-relaxed mb-6">
            Welcome! Before proceeding, please review and agree to our{" "}
            <Link
              href="/privacy"
              className="text-accent hover:underline font-medium"
              target="_blank"
            >
              Privacy Policy
            </Link>{" "}
            and terms of service. We need your consent to process your data.
          </p>
        </div>
        
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAgree}
            disabled={isSaving}
            className={`px-6 py-2.5 text-white text-sm font-semibold rounded-full transition-all ${
              isSaving
                ? "bg-border-strong text-secondary cursor-not-allowed opacity-50"
                : "bg-accent hover:opacity-90 shadow-[0_0_15px_rgba(255,138,61,0.3)]"
            }`}
          >
            {isSaving ? "Saving..." : "I Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
