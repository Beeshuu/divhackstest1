"use client";

import { useCallback, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";

import { useAuth, type AuthChallenge } from "@/lib/auth";
import { useChallengePoll } from "./use-challenge-poll";

const FIELD =
  "w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm";

export function TwoFactorForm({
  challenge,
  onBack,
}: {
  challenge: AuthChallenge;
  onBack: () => void;
}) {
  const { verifySecondFactor } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const finish = useCallback(
    async (nextCode: string, inbound = false) => {
      if (pending) return;
      setError(null);
      setPending(true);
      try {
        await verifySecondFactor(challenge.challengeId, nextCode, inbound);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not verify that code.");
        setPending(false);
      }
    },
    [challenge.challengeId, pending, verifySecondFactor],
  );

  useChallengePoll(challenge.challengeId, () => void finish("", true));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void finish(code);
  };

  return (
    <motion.form
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
      onSubmit={submit}
    >
      {challenge.channel === "imessage" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <p className="text-sm font-medium text-blue-800">
            Photon just iMessaged a code to <span className="font-bold">{challenge.phoneHint}</span>.
            Enter it here, or reply to that chat.
          </p>
        </div>
      ) : (
        challenge.demoCode && (
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              Photon isn’t connected yet. Add{" "}
              <span className="font-bold">SPECTRUM_PROJECT_ID</span> and{" "}
              <span className="font-bold">SPECTRUM_PROJECT_SECRET</span> from{" "}
              <a href="https://app.photon.codes" target="_blank" rel="noreferrer" className="underline">
                the Photon dashboard
              </a>
              , restart the server, and the code will iMessage instead. Demo code for{" "}
              <span className="font-bold">{challenge.phoneHint}</span>:{" "}
              <span className="font-bold tracking-[0.18em]">{challenge.demoCode}</span>
            </p>
          </div>
        )
      )}

      <div className="space-y-1">
        <label htmlFor="two-factor-code" className="text-sm font-semibold text-slate-700 ml-1">
          6-digit code
        </label>
        <div className="relative">
          <ShieldCheck className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
          <input
            id="two-factor-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className={`${FIELD} tracking-[0.24em]`}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-2 group"
      >
        {pending ? "Verifying…" : "Verify and sign in"}
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
      <button type="button" onClick={onBack} className="w-full text-sm font-semibold text-slate-500 hover:text-blue-600">
        Back to sign in
      </button>
    </motion.form>
  );
}
