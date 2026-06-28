import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-[#0E0D0B]">
      {/* Animated glowing orbs for an "alive" feel */}
      <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-[#FF8A3D]/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[20%] right-[20%] w-[30rem] h-[30rem] bg-[#FF5722]/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      
      {/* A subtle grid overlay */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

      <div className="relative z-10 animate-in fade-in zoom-in duration-500">
        <Suspense fallback={<div className="text-[#F4EFE6]">Loading...</div>}>
          <SignIn
            signUpFallbackRedirectUrl="/privacy"
            appearance={{
              elements: {
                card: "bg-[#181613]/80 backdrop-blur-xl border border-[#332E27] shadow-2xl",
                headerTitle: "text-[#F4EFE6]",
                headerSubtitle: "text-[#8E8675]",
                socialButtonsBlockButton: "bg-[#221F1B] border border-[#332E27] hover:bg-[#332E27] text-[#F4EFE6]",
                socialButtonsBlockButtonText: "text-[#F4EFE6] font-medium",
                dividerLine: "bg-[#332E27]",
                dividerText: "text-[#8E8675]",
                formFieldLabel: "text-[#D1C7B1]",
                formFieldInput: "bg-[#0E0D0B] border-[#332E27] text-[#F4EFE6] focus:border-[#FF8A3D] focus:ring-[#FF8A3D]/20",
                formButtonPrimary: "bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white",
                footerActionText: "text-[#8E8675]",
                footerActionLink: "text-[#FF8A3D] hover:text-[#FF8A3D]/80",
              },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
