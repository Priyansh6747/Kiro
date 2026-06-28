"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function ConsentDialog() {
  const { isLoaded, userId } = useAuth();
  
  // Show dialog if we're not sure, but default isChecked to false
  const [showDialog, setShowDialog] = useState(true);
  const [isChecked, setIsChecked] = useState(false);
  const [isAlreadyAgreed, setIsAlreadyAgreed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // If not mounted or auth not loaded, wait
    if (!mounted || !isLoaded) return;

    // Check localStorage first for immediate UI
    const localConsent = localStorage.getItem("privacy_consent") === "true";
    
    // If user is logged in, check DB
    if (userId) {
      fetch("/api/auth/consent")
        .then((res) => res.json())
        .then((data) => {
          if (data.consent) {
            setIsAlreadyAgreed(true);
            setIsChecked(true);
            setShowDialog(true); // User said: "make it reflect it in UI (no option to untick)" - maybe we still show it?
            
            // Actually, if it's the sign in page blocking dialog, if they are already agreed, 
            // we should probably just hide it so they can proceed. But user requested:
            // "if a user is already agreed... make it reflect it in UI (no option to untick)"
            // So we show the dialog but let them close it? Or just auto-proceed?
            // Let's hide it if already agreed and it's a blocking dialog, unless they want to see it.
            // Let's assume if already agreed, we can just hide the dialog after a brief moment, 
            // or the user meant we shouldn't block them. 
            // I will keep it visible if they manually open it, but since it's blocking, 
            // I'll add a "Continue" button.
          } else {
            setIsAlreadyAgreed(false);
            setIsChecked(localConsent);
          }
        })
        .catch(console.error);
    } else {
      // Not logged in
      if (localConsent) {
        setIsChecked(true);
      }
    }
  }, [isLoaded, userId, mounted]);

  const handleAgree = async () => {
    if (!isChecked) return;
    
    setIsSaving(true);
    localStorage.setItem("privacy_consent", "true");
    
    if (userId && !isAlreadyAgreed) {
      try {
        await fetch("/api/auth/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consent: true }),
        });
      } catch (err) {
        console.error("Failed to save consent to DB", err);
      }
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
            Before proceeding, please review and agree to our{" "}
            <Link
              href="/privacy"
              className="text-accent hover:underline font-medium"
              target="_blank"
            >
              Privacy Policy
            </Link>{" "}
            and terms of service. We need your consent to process your data.
          </p>
          
          <label className={`flex items-start gap-3 cursor-pointer ${isAlreadyAgreed ? 'opacity-70 cursor-not-allowed' : ''}`}>
            <div className="pt-0.5">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-border-strong text-accent focus:ring-accent bg-base"
                checked={isChecked}
                onChange={(e) => {
                  if (!isAlreadyAgreed) {
                    setIsChecked(e.target.checked);
                  }
                }}
                disabled={isAlreadyAgreed}
              />
            </div>
            <span className="text-sm font-medium text-primary select-none">
              I have read and agree to the Privacy Policy.
              {isAlreadyAgreed && <span className="block text-xs text-accent mt-1">✓ You have already agreed to this.</span>}
            </span>
          </label>
        </div>
        
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAgree}
            disabled={!isChecked || isSaving}
            className={`px-6 py-2.5 text-white text-sm font-semibold rounded-full transition-all ${
              !isChecked || isSaving
                ? "bg-border-strong text-secondary cursor-not-allowed opacity-50"
                : "bg-accent hover:opacity-90 shadow-[0_0_15px_rgba(255,138,61,0.3)]"
            }`}
          >
            {isSaving ? "Saving..." : isAlreadyAgreed ? "Continue" : "Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}
