"use client";

import { useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";

import type { AuthChallenge } from "@/lib/auth";

function CopyLine({ number }: { number: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="font-bold underline decoration-blue-400 underline-offset-2"
    >
      {number}
      <span className="ml-1 font-semibold no-underline">{copied ? "(copied)" : "(copy)"}</span>
    </button>
  );
}

export function PhotonCodeNotice({
  channel,
  phoneHint,
  e164,
  assignedLine,
  demoCode,
  connected,
  sendError,
  inboundVerified,
}: Pick<
  AuthChallenge,
  "channel" | "phoneHint" | "e164" | "assignedLine" | "demoCode" | "connected" | "sendError"
> & {
  inboundVerified?: boolean;
}) {
  if (channel === "imessage") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <p className="text-sm font-medium text-blue-800">
          {inboundVerified
            ? "Photon confirmed your iMessage reply. Continue below."
            : `Photon iMessaged a code to ${phoneHint || "your phone"}. Enter it here, or reply in that chat.`}
        </p>
      </div>
    );
  }

  if (!demoCode && !assignedLine) return null;

  const allowlisted = sendError?.toLowerCase().includes("target not allowed");
  const number = e164 || phoneHint || "this phone";

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
      <p className="text-sm font-medium text-blue-800">
        {assignedLine ? (
          <>
            Photon is connected, and {number} is already on the Users list. Shared iMessage
            can’t start the chat. On your iPhone, iMessage{" "}
            <CopyLine number={assignedLine} /> any text — we’ll reply with the code. Don’t
            open that number in this browser. Or use this demo code:{" "}
            <span className="font-bold tracking-[0.18em]">{demoCode}</span>
          </>
        ) : allowlisted ? (
          <>
            Photon is connected, but {number} is not on the project Users list. In{" "}
            <a href="https://app.photon.codes" target="_blank" rel="noreferrer" className="underline">
              the Photon dashboard
            </a>
            , open <span className="font-bold">Users</span> and add that number (include the +1).
            Until then, use this demo code:{" "}
            <span className="font-bold tracking-[0.18em]">{demoCode}</span>
          </>
        ) : connected ? (
          <>
            Photon is connected, but the iMessage did not send. Demo code for{" "}
            <span className="font-bold">{phoneHint}</span>:{" "}
            <span className="font-bold tracking-[0.18em]">{demoCode}</span>
          </>
        ) : (
          <>
            Photon isn’t connected yet. Add SPECTRUM_PROJECT_ID and SPECTRUM_PROJECT_SECRET, then
            restart. Demo code for <span className="font-bold">{phoneHint}</span>:{" "}
            <span className="font-bold tracking-[0.18em]">{demoCode}</span>
          </>
        )}
      </p>
    </div>
  );
}
