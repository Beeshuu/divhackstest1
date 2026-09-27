"use client";

import { useCallback, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useChallengePoll } from "./use-challenge-poll";

const FIELD =
  "w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm";

export function ResetPasswordForm({
  initialPhone,
  onBack,
}: {
  initialPhone: string;
  onBack: () => void;
}) {
  const { requestPasswordReset, resetPassword } = useAuth();
  const [phase, setPhase] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [challengeId, setChallengeId] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [channel, setChannel] = useState("demo");
  const [demoCode, setDemoCode] = useState<string | undefined>();
  const [inboundVerified, setInboundVerified] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const result = await requestPasswordReset(phone);
      setChallengeId(result.challengeId);
      setPhoneHint(result.phoneHint);
      setChannel(result.channel);
      setDemoCode(result.demoCode);
      setInboundVerified(false);
      setCode("");
      setPhase("code");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send a reset code.");
    } finally {
      setPending(false);
    }
  };

  const submitNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    if (password !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await resetPassword({
        phone,
        challengeId,
        code,
        inbound: inboundVerified,
        newPassword: password,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset your password.");
      setPending(false);
    }
  };

  const markInbound = useCallback(() => setInboundVerified(true), []);
  useChallengePoll(phase === "code" ? challengeId : null, markInbound);

  return (
    <AnimatePresence mode="wait">
      {phase === "phone" ? (
        <motion.form
          key="phone"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="space-y-4"
          onSubmit={sendCode}
        >
          <div className="space-y-1">
            <label htmlFor="reset-phone" className="text-sm font-semibold text-slate-700 ml-1">
              Phone number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                id="reset-phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 (555) 000-0000"
                className={FIELD}
              />
            </div>
            <p className="text-xs text-slate-400 ml-1 pt-1">
              Photon will iMessage a 6-digit code to the number on your account.
            </p>
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
            {pending ? "Sending code…" : "Send reset code"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button type="button" onClick={onBack} className="w-full text-sm font-semibold text-slate-500 hover:text-blue-600">
            Back to sign in
          </button>
        </motion.form>
      ) : (
        <motion.form
          key="code"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="space-y-4"
          onSubmit={submitNewPassword}
        >
          {channel === "imessage" ? (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">
                {inboundVerified
                  ? "Photon confirmed your iMessage reply. Set a new password to finish."
                  : `Photon iMessaged a reset code to ${phoneHint || "your phone"}. Enter it here, or reply in that chat.`}
              </p>
            </div>
          ) : (
            demoCode && (
              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">
                  Photon Spectrum is not connected in this environment, so use this code for{" "}
                  <span className="font-bold">{phoneHint || "your phone"}</span>:{" "}
                  <span className="font-bold tracking-[0.18em]">{demoCode}</span>
                </p>
              </div>
            )
          )}

          <div className="space-y-1">
            <label htmlFor="reset-code" className="text-sm font-semibold text-slate-700 ml-1">
              6-digit code
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                id="reset-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required={!inboundVerified}
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className={`${FIELD} tracking-[0.24em]`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reset-password" className="text-sm font-semibold text-slate-700 ml-1">
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a new password"
                className={`${FIELD} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reset-confirm" className="text-sm font-semibold text-slate-700 ml-1">
              Confirm new password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                id="reset-confirm"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Repeat the new password"
                className={FIELD}
              />
            </div>
            <p className="text-xs text-slate-400 ml-1 pt-1">Must be at least 8 characters.</p>
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setError(null);
              setPending(true);
              try {
                const result = await requestPasswordReset(phone);
                setChallengeId(result.challengeId);
                setPhoneHint(result.phoneHint);
                setChannel(result.channel);
                setDemoCode(result.demoCode);
                setInboundVerified(false);
                setCode("");
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not send a reset code.");
              } finally {
                setPending(false);
              }
            }}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Resend code
          </button>

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
            {pending ? "Updating password…" : "Reset password"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setPhase("phone");
                setError(null);
                setCode("");
                setPassword("");
                setConfirm("");
              }}
              className="text-slate-500 hover:text-blue-600"
            >
              Use a different number
            </button>
            <button type="button" onClick={onBack} className="text-slate-500 hover:text-blue-600">
              Back to sign in
            </button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
