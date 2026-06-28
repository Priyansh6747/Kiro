"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export function AcceptButton() {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) return null;

  // Check if account was just created. Clerk dates are Date objects on the client.
  const isNewUser = user.createdAt?.getTime() === user.lastSignInAt?.getTime();

  if (!isNewUser) return null;

  return (
    <div className="mt-12 flex justify-center border-t border-[#332E27] pt-8">
      <Link
        href="/"
        className="px-8 py-3 bg-[#FF8A3D] text-white font-medium rounded-lg hover:bg-[#FF8A3D]/90 transition-colors shadow-lg shadow-[#FF8A3D]/20"
      >
        I Accept
      </Link>
    </div>
  );
}
