import { Suspense } from "react";
import CustomSignIn from "@/components/Auth/CustomSignIn";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-base">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,138,61,0.05)_0%,transparent_50%)]" />
      <Suspense fallback={<div className="text-secondary text-sm">Loading...</div>}>
        <CustomSignIn />
      </Suspense>
    </div>
  );
}
