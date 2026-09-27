"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, X } from "lucide-react";

import { GeminiSparkle } from "./GeminiSparkle";
import { answerCampusQuestion, fetchGeminiReply } from "./ask-gemini";
import { CategoryGlyph } from "@/components/icons/CategoryIcons";
import { useMediaQuery } from "@/lib/use-media-query";
import type { CampusEvent } from "@/types/event";

const OPEN_EASE = [0.32, 0.72, 0, 1] as const;

interface Message {
  id: number;
  role: "assistant" | "user";
  text: string;
  matches?: CampusEvent[];
}

interface AskGeminiPanelProps {
  open: boolean;
  onClose: () => void;
  events: CampusEvent[];
  selectedEvent: CampusEvent | null;
  onSelectEvent: (event: CampusEvent) => void;
}

const SUGGESTIONS = [
  "What's happening now?",
  "Any student-posted events?",
  "What's remote?",
  "How do I reject an event?",
];

function seedMessage(): Message {
  return {
    id: 0,
    role: "assistant",
    text: "Hi — I'm Gemini, your Campus Connect assistant. Ask me what's happening today, which events are student-posted, what's remote or TBD, how to reject a pin, or how reminders work.",
  };
}

/** Floating Gemini chat: live model when a key is set, local campus answers otherwise. */
export function AskGeminiPanel({
  open,
  onClose,
  events,
  selectedEvent,
  onSelectEvent,
}: AskGeminiPanelProps) {
  const titleId = useId();
  const isSheet = useMediaQuery("(max-width: 899px)");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [seedMessage()]);
  const listRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const focus = window.setTimeout(() => fieldRef.current?.focus(), 180);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focus);
    };
  }, [open, onClose]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || pending) return;
    const userId = Date.now();
    setInput("");
    setPending(true);
    setMessages((current) => [...current, { id: userId, role: "user", text }]);

    try {
      const reply = await fetchGeminiReply(text, events, selectedEvent);
      setMessages((current) => [
        ...current,
        { id: userId + 1, role: "assistant", text: reply.text, matches: reply.matches },
      ]);
    } catch {
      const reply = answerCampusQuestion(text, events, selectedEvent);
      setMessages((current) => [
        ...current,
        { id: userId + 1, role: "assistant", text: reply.text, matches: reply.matches },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && isSheet && (
        <motion.button
          key="ask-gemini-backdrop"
          type="button"
          aria-label="Close Ask Gemini"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[65] bg-ink/25"
        />
      )}
      {open && (
        <motion.div
          key="ask-gemini"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={isSheet ? { y: "100%", opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={isSheet ? { y: 0, opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={isSheet ? { y: "100%", opacity: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.24, ease: OPEN_EASE }}
          className={
            isSheet
              ? "fixed inset-x-2 bottom-2 z-[70] flex max-h-[82vh] flex-col overflow-hidden rounded-[20px] bg-panel shadow-float"
              : "absolute bottom-[114px] right-4 z-30 flex h-[min(520px,62vh)] w-[380px] flex-col overflow-hidden rounded-[20px] bg-panel shadow-float"
          }
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-full text-white"
              style={{
                background: "linear-gradient(135deg, #4B8BFF 0%, #7C5CFF 48%, #C084FC 100%)",
              }}
            >
              <GeminiSparkle size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate text-[16px] font-extrabold tracking-[-0.02em] text-ink">
                Ask Gemini
              </h2>
              <p className="truncate text-[12.5px] font-medium text-muted">Campus assistant</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Ask Gemini"
              className="grid h-[30px] w-[30px] place-items-center rounded-full bg-field text-ink transition-colors hover:bg-[#e6eaf2]"
            >
              <X size={16} strokeWidth={2.6} />
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3.5 scrollbar-none">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[88%] rounded-[16px] bg-brand px-3.5 py-2.5 text-[14px] font-medium leading-[1.4] text-white"
                      : "max-w-[92%] rounded-[16px] bg-field px-3.5 py-2.5 text-[14px] font-medium leading-[1.45] text-ink-soft"
                  }
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.matches && message.matches.length > 0 && (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {message.matches.slice(0, 5).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => onSelectEvent(event)}
                          className="flex w-full items-center gap-2 rounded-[11px] bg-panel px-2.5 py-2 text-left transition-colors hover:bg-brand-tint"
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-field">
                            <CategoryGlyph category={event.category} size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-bold text-ink">{event.title}</span>
                            <span className="block truncate text-[12px] font-medium text-muted">
                              {event.locationName}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {pending && (
              <div className="max-w-[92%] rounded-[16px] bg-field px-3.5 py-2.5 text-[14px] font-medium text-muted">
                Thinking…
              </div>
            )}

            {messages.length === 1 && !pending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void ask(suggestion)}
                    className="rounded-full border border-line bg-panel px-3 py-[7px] text-[13px] font-semibold text-ink-soft transition-colors hover:border-brand/30 hover:bg-brand-tint hover:text-brand"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="flex shrink-0 items-center gap-2 border-t border-line px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <input
              ref={fieldRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask Gemini about campus events"
              placeholder="Ask about campus events…"
              disabled={pending}
              className="h-11 min-w-0 flex-1 rounded-full border border-transparent bg-field px-4 text-[14.5px] font-medium text-ink placeholder:font-normal placeholder:text-faint outline-none transition-colors focus:border-brand/30 focus:bg-white disabled:opacity-70"
            />
            <motion.button
              type="submit"
              aria-label="Send question"
              disabled={pending || !input.trim()}
              whileTap={{ scale: 0.94 }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-opacity disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #4B8BFF 0%, #7C5CFF 48%, #C084FC 100%)",
              }}
            >
              <ArrowUp size={18} strokeWidth={2.6} />
            </motion.button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
