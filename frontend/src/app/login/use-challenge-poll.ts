"use client";

import { useEffect } from "react";

export function useChallengePoll(challengeId: string | null, onVerified: () => void) {
  useEffect(() => {
    if (!challengeId) return;
    let active = true;
    const tick = async () => {
      const response = await fetch(`/api/auth/challenge/${challengeId}`).catch(() => null);
      if (!active || !response?.ok) return;
      const body = await response.json();
      if (body.inboundVerified) onVerified();
    };
    const timer = window.setInterval(() => void tick(), 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [challengeId, onVerified]);
}
