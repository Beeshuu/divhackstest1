"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, Heart, Info, LoaderCircle, ShieldCheck, X } from "lucide-react";

import { cn } from "@/lib/utils";

const PRESETS = [1, 2, 5];

export interface DonateCause {
  id: string;
  name: string;
  description: string;
}

export interface DonateCheck {
  id: string;
  ok: boolean;
  label: string;
}

export interface DonateReceipt {
  message: string;
  cause?: DonateCause;
  destination?: string;
  explorerUrl?: string;
  payment?: { hash: string; ledgerIndex?: number };
  funding?: { hash: string; explorerUrl?: string } | null;
  checks?: DonateCheck[];
}

interface DonateStatus {
  remainingTodayXrp: number;
  spentTodayXrp: number;
  policy: {
    minXrp: number;
    maxPerTxXrp: number;
    dailyCapXrp: number;
  };
  causes: DonateCause[];
  agent: { name: string; credential: string };
  recent: Array<{
    id: number;
    cause_id: string;
    amount_xrp: string;
    decision: string;
    explorer_url?: string;
    created_at: string;
  }>;
}

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const INPUT =
  "w-full rounded-[12px] border border-line bg-field px-3.5 text-[14.5px] font-medium text-ink placeholder:font-normal placeholder:text-faint outline-none transition-[background-color,border-color,box-shadow] duration-150 focus:border-brand/40 focus:bg-white focus:ring-4 focus:ring-brand/10";
const LABEL = "mb-[7px] block text-[13px] font-bold text-ink-soft";

/** Campus gift form. The donation agent settles on XRPL Testnet after policy checks. */
export function DonateModal({ open, onClose, authFetch }: DonateModalProps) {
  const titleId = useId();
  const [status, setStatus] = useState<DonateStatus | null>(null);
  const [causeId, setCauseId] = useState("free-food");
  const [amount, setAmount] = useState("1");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DonateReceipt | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setReceipt(null);
    setError(null);
    void authFetch("/api/donate")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load campus donation policy.");
        return response.json();
      })
      .then((body: DonateStatus) => {
        setStatus(body);
        if (body.causes[0]) setCauseId(body.causes[0].id);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load donate."));
  }, [open, authFetch]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await authFetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          causeId,
          amountXrp: Number(amount),
          memo,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof body?.message === "string"
            ? body.message
            : typeof body?.error === "string"
              ? body.error
              : "The campus agent could not send that gift.",
        );
      }
      setReceipt(body as DonateReceipt);
      const next = await authFetch("/api/donate");
      if (next.ok) setStatus((await next.json()) as DonateStatus);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The campus agent could not send that gift.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="donate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 backdrop-blur-[2px] tablet:p-6"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onSubmit={send}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="flex max-h-[92vh] w-full max-w-[540px] flex-col overflow-hidden rounded-[20px] bg-panel shadow-[0_24px_60px_rgba(15,37,71,0.22)]"
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 tablet:px-7">
              <div>
                <h2 id={titleId} className="text-[22px] font-extrabold tracking-[-0.02em] text-ink">
                  Donate
                </h2>
                <p className="mt-[3px] text-[14px] font-medium text-muted">
                  The campus agent sends XRP on Ripple&apos;s XRPL Testnet, inside spending limits.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-field text-ink transition-colors hover:bg-[#e6eaf2]"
              >
                <X size={16} strokeWidth={2.6} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-[18px] overflow-y-auto px-6 pb-2 tablet:px-7 scrollbar-none">
              {receipt ? (
                <div className="space-y-3">
                  <p className="flex items-start gap-2 rounded-[12px] bg-[#DFF3E6] px-3.5 py-3 text-[14px] font-semibold text-[#1F914A]">
                    <Check size={18} strokeWidth={2.6} className="mt-[1px] shrink-0" />
                    {receipt.message}
                  </p>
                  {receipt.payment?.hash && (
                    <p className="break-all text-[12.5px] font-medium text-muted">
                      Payment hash {receipt.payment.hash}
                    </p>
                  )}
                  {receipt.funding?.hash && (
                    <p className="text-[12.5px] font-medium text-muted">
                      Treasury first funded the donation agent ({receipt.funding.hash.slice(0, 10)}…).
                    </p>
                  )}
                  {receipt.explorerUrl && (
                    <a
                      href={receipt.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand hover:underline"
                    >
                      View on XRPL Testnet
                      <ExternalLink size={14} strokeWidth={2.3} />
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <fieldset>
                    <legend className={LABEL}>Campus fund</legend>
                    <div className="space-y-2">
                      {(status?.causes ?? []).map((cause) => {
                        const selected = cause.id === causeId;
                        return (
                          <button
                            key={cause.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setCauseId(cause.id)}
                            className={cn(
                              "flex w-full flex-col items-start rounded-[12px] border px-3.5 py-2.5 text-left transition-colors",
                              selected
                                ? "border-brand/30 bg-brand-tint"
                                : "border-line bg-panel hover:bg-[#f5f7fb]",
                            )}
                          >
                            <span className="text-[14.5px] font-bold text-ink">{cause.name}</span>
                            <span className="mt-0.5 text-[12.5px] font-medium text-muted">{cause.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div>
                    <p className={LABEL}>Amount (XRP)</p>
                    <div className="mb-2 flex gap-2">
                      {PRESETS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAmount(String(value))}
                          className={cn(
                            "h-10 flex-1 rounded-[11px] border text-[14px] font-bold",
                            amount === String(value)
                              ? "border-brand/30 bg-brand-tint text-brand"
                              : "border-line text-ink-soft hover:bg-[#f5f7fb]",
                          )}
                        >
                          {value} XRP
                        </button>
                      ))}
                    </div>
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={cn(INPUT, "h-11")}
                      aria-label="Custom XRP amount"
                    />
                  </div>

                  <div>
                    <label htmlFor="donate-memo" className={LABEL}>
                      Memo <span className="font-medium text-faint">(optional)</span>
                    </label>
                    <input
                      id="donate-memo"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      maxLength={80}
                      placeholder="Thanks for the free bagels"
                      className={cn(INPUT, "h-11")}
                    />
                  </div>

                  <div className="rounded-[12px] bg-[#F3F6FB] px-3.5 py-3">
                    <p className="flex items-center gap-2 text-[13px] font-bold text-ink">
                      <ShieldCheck size={15} strokeWidth={2.3} className="text-brand" />
                      Agent guardrails
                    </p>
                    <ul className="mt-2 space-y-1 text-[12.5px] font-medium text-muted">
                      <li>
                        Max {status?.policy.maxPerTxXrp ?? 10} XRP per gift · {status?.policy.dailyCapXrp ?? 25} XRP / day
                      </li>
                      <li>
                        {status?.remainingTodayXrp?.toFixed(2) ?? "—"} XRP remaining for you today
                      </li>
                      <li>{status?.agent.credential ?? "KYA · campus donation agent"}</li>
                    </ul>
                  </div>
                </>
              )}

              {error && (
                <p role="alert" className="text-[13px] font-semibold text-coral-text">
                  {error}
                </p>
              )}

              {status?.recent?.length ? (
                <div>
                  <p className={LABEL}>Your recent gifts</p>
                  <ul className="space-y-1.5">
                    {status.recent.slice(0, 4).map((row) => (
                      <li key={row.id} className="flex items-center justify-between text-[12.5px] font-medium text-muted">
                        <span>
                          {row.amount_xrp} XRP · {row.decision}
                        </span>
                        {row.explorer_url && (
                          <a href={row.explorer_url} target="_blank" rel="noreferrer" className="font-bold text-brand">
                            Ledger
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="px-6 pb-6 pt-4 tablet:px-7">
              <p className="flex items-start gap-[7px] rounded-[11px] bg-[#F3F6FB] px-[11px] py-[9px] text-[12.5px] font-medium leading-[1.4] text-muted">
                <Info size={14} strokeWidth={2.3} aria-hidden className="mt-[1px] shrink-0 text-faint" />
                Testnet XRP only — the agent signs and submits. You never hold the campus seed.
              </p>
              <div className="mt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 rounded-[12px] bg-field px-5 text-[15px] font-bold text-ink-soft transition-colors hover:bg-[#e6eaf2]"
                >
                  {receipt ? "Close" : "Cancel"}
                </button>
                {!receipt && (
                  <motion.button
                    type="submit"
                    disabled={busy}
                    whileHover={{ y: busy ? 0 : -1 }}
                    whileTap={{ scale: busy ? 1 : 0.98, y: 0 }}
                    className="flex h-11 items-center gap-2 rounded-[12px] bg-[#0D9488] px-6 text-[15px] font-bold text-white shadow-[0_4px_12px_rgb(13_148_136_/_0.28)] hover:bg-[#0F766E] disabled:opacity-70"
                  >
                    {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Heart size={16} />}
                    {busy ? "Agent settling…" : "Send with campus agent"}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
