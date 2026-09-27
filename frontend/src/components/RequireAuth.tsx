"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";

/**
 * Keeps the campus map behind a signed-in session.
 * The first paint is always the same placeholder so a session recovered on
 * the client does not disagree with the server HTML.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (!ready || status !== "authenticated") {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <p className="text-[15px] font-medium text-muted">Checking your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
