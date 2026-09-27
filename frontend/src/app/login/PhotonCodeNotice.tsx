import { MessageCircle, ShieldCheck } from "lucide-react";

import type { AuthChallenge } from "@/lib/auth";

export function PhotonCodeNotice({
  channel,
  phoneHint,
  e164,
  demoCode,
  connected,
  sendError,
  inboundVerified,
}: Pick<AuthChallenge, "channel" | "phoneHint" | "e164" | "demoCode" | "connected" | "sendError"> & {
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

  if (!demoCode) return null;

  const allowlisted = sendError?.toLowerCase().includes("target not allowed");
  const number = e164 || phoneHint || "this phone";

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
      <p className="text-sm font-medium text-blue-800">
        {allowlisted ? (
          <>
            Photon is connected. iMessage is blocked until{" "}
            <span className="font-bold">{number}</span> is on the project Users list. In{" "}
            <a href="https://app.photon.codes" target="_blank" rel="noreferrer" className="underline">
              the Photon dashboard
            </a>
            , open <span className="font-bold">Users</span> and add that number (include the +1).
            Until then, use this demo code:{" "}
            <span className="font-bold tracking-[0.18em]">{demoCode}</span>
          </>
        ) : connected ? (
          <>
            Photon is connected, but the iMessage did not send. Add{" "}
            <span className="font-bold">{number}</span> under Users, then try again. Demo code:{" "}
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
