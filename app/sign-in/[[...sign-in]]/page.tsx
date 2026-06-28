import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import ConsentDialog from "@/components/ConsentDialog";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <ConsentDialog />
      <Suspense fallback={<div>Loading...</div>}>
        <SignIn />
      </Suspense>
    </div>
  );
}
