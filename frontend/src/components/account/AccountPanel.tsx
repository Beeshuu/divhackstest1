"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  X,
} from "lucide-react";

import { CategoryGlyph } from "@/components/icons/CategoryIcons";
import { useAuth } from "@/lib/auth";
import { cn, initialsOf } from "@/lib/utils";
import type { EventHistory } from "@/lib/use-event-history";
import type { CampusEvent } from "@/types/event";

export type AccountView = "profile" | "settings";
export type ProfileTab = "going" | "hosted" | "attended";

const COLLEGES = [
  "Columbia University",
  "Barnard College",
  "New York University",
  "The New School",
  "Fordham University",
  "Pace University",
  "Cooper Union",
  "CUNY — Baruch College",
  "CUNY — City College of New York",
  "CUNY — Hunter College",
  "CUNY — Brooklyn College",
  "CUNY — Queens College",
  "St. John's University",
  "Stevens Institute of Technology",
];

const INPUT =
  "w-full rounded-[12px] border border-line bg-field px-3.5 text-[14.5px] font-medium text-ink placeholder:font-normal placeholder:text-faint outline-none transition-[background-color,border-color,box-shadow] duration-150 focus:border-brand/40 focus:bg-white focus:ring-4 focus:ring-brand/10";
const LABEL = "mb-[7px] block text-[13px] font-bold text-ink-soft";

interface AccountPanelProps {
  open: boolean;
  view: AccountView;
  onViewChange: (view: AccountView) => void;
  onClose: () => void;
  history: EventHistory;
  onSelectEvent: (event: CampusEvent) => void;
}

const TAB_COPY: Record<ProfileTab, { label: string; empty: string }> = {
  going: {
    label: "Going",
    empty: "Events you plan to attend will show up here after you tap I’m Going.",
  },
  hosted: {
    label: "Hosted",
    empty: "Events you post appear here. They’re saved to your profile even after they leave the map.",
  },
  attended: {
    label: "Attended",
    empty: "After an event you marked as going ends, it moves here.",
  },
};

/** Profile + settings sheet opened from the header avatar. */
export function AccountPanel({
  open,
  view,
  onViewChange,
  onClose,
  history,
  onSelectEvent,
}: AccountPanelProps) {
  const titleId = useId();
  const { user } = useAuth();
  const [tab, setTab] = useState<ProfileTab>("going");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && view === "profile") setTab("going");
  }, [open, view]);

  const lists: Record<ProfileTab, CampusEvent[]> = {
    going: history.going,
    hosted: history.hosted,
    attended: history.attended,
  };

  return (
    <AnimatePresence>
      {open && user && (
        <motion.div
          key="account-panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/30 p-3 backdrop-blur-[2px] tablet:p-6"
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] bg-panel shadow-[0_24px_60px_rgba(15,37,71,0.22)]"
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 tablet:px-7">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[22px] font-extrabold tracking-[-0.02em] text-ink">
                  {view === "profile" ? "Your profile" : "Settings"}
                </h2>
                <p className="mt-[3px] text-[14px] font-medium text-muted">
                  {view === "profile"
                    ? "Events you’ve attended, hosted, and plan to go to."
                    : "Account details, password, and profile privacy."}
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

            <div className="mx-6 mb-4 grid grid-cols-2 gap-1 rounded-[12px] bg-field p-1 tablet:mx-7">
              {(["profile", "settings"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onViewChange(item)}
                  className={cn(
                    "h-9 rounded-[9px] text-[13.5px] font-bold capitalize transition-colors",
                    view === item ? "bg-panel text-ink shadow-pill" : "text-muted hover:text-ink",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 tablet:px-7 scrollbar-none">
              {view === "profile" ? (
                <ProfileView
                  name={user.name}
                  college={user.college}
                  email={user.email}
                  phone={user.phone}
                  privateProfile={user.profilePrivate}
                  tab={tab}
                  onTabChange={setTab}
                  events={lists[tab]}
                  onSelectEvent={onSelectEvent}
                />
              ) : (
                <SettingsView />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProfileView({
  name,
  college,
  email,
  phone,
  privateProfile,
  tab,
  onTabChange,
  events,
  onSelectEvent,
}: {
  name: string;
  college: string;
  email: string | null;
  phone: string | null;
  privateProfile: boolean;
  tab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3.5 rounded-[16px] border border-line bg-rail px-4 py-3.5">
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-[16px] font-bold text-white"
        >
          {initialsOf(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-extrabold text-ink">{name}</p>
          <p className="mt-[2px] truncate text-[13px] font-medium text-muted">{college}</p>
          <p className="mt-[2px] truncate text-[12.5px] font-medium text-faint">
            {email ?? phone ?? "Campus Connect student"}
            {privateProfile ? " · Privacy on" : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-1 rounded-[12px] bg-field p-1">
        {(["going", "hosted", "attended"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onTabChange(item)}
            className={cn(
              "h-9 flex-1 rounded-[9px] text-[13px] font-bold transition-colors",
              tab === item ? "bg-panel text-ink shadow-pill" : "text-muted hover:text-ink",
            )}
          >
            {TAB_COPY[item].label}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {events.length === 0 ? (
          <li className="rounded-[14px] border border-dashed border-line px-4 py-8 text-center text-[13.5px] font-medium leading-[1.45] text-muted">
            {TAB_COPY[tab].empty}
          </li>
        ) : (
          events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelectEvent(event)}
                className="flex w-full items-start gap-3 rounded-[14px] border border-line px-3 py-3 text-left transition-colors hover:bg-brand-tint"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-field">
                  <CategoryGlyph category={event.category} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-bold text-ink">{event.title}</span>
                  <span className="mt-[3px] flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
                    <MapPin size={12} strokeWidth={2.3} aria-hidden />
                    <span className="truncate">{event.locationName}</span>
                  </span>
                  <span className="mt-[2px] flex items-center gap-1.5 text-[12.5px] font-medium text-faint">
                    <CalendarDays size={12} strokeWidth={2.3} aria-hidden />
                    <span className="truncate">
                      {event.dateLabel} · {event.startTime}–{event.endTime}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function SettingsView() {
  const { user, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [college, setCollege] = useState(user?.college ?? "");
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountPending, setAccountPending] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  const [privacyPending, setPrivacyPending] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  if (!user) return null;

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    setAccountError(null);
    setAccountMessage(null);
    setAccountPending(true);
    try {
      await updateProfile({ name, email: email.trim() || null, phone, college });
      setAccountMessage("Account information saved.");
    } catch (cause) {
      setAccountError(cause instanceof Error ? cause.message : "Could not save your account.");
    } finally {
      setAccountPending(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordPending(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : "Could not change your password.");
    } finally {
      setPasswordPending(false);
    }
  };

  const togglePrivacy = async () => {
    setPrivacyError(null);
    setPrivacyPending(true);
    try {
      await updateProfile({ profilePrivate: !user.profilePrivate });
    } catch (cause) {
      setPrivacyError(cause instanceof Error ? cause.message : "Could not update privacy.");
    } finally {
      setPrivacyPending(false);
    }
  };

  const collegeOptions = COLLEGES.includes(college) ? COLLEGES : [college, ...COLLEGES].filter(Boolean);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[15px] font-extrabold text-ink">Account information</h3>
        <p className="mt-1 text-[13px] font-medium text-muted">Name, contact details, and school on this account.</p>
        <form onSubmit={saveAccount} className="mt-3 space-y-3">
          <div>
            <label htmlFor="acct-name" className={LABEL}>
              Full name
            </label>
            <div className="relative">
              <User size={16} strokeWidth={2.2} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                id="acct-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className={cn(INPUT, "h-11 pl-10")}
              />
            </div>
          </div>
          <div>
            <label htmlFor="acct-email" className={LABEL}>
              Email
            </label>
            <div className="relative">
              <Mail size={16} strokeWidth={2.2} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                id="acct-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="optional"
                className={cn(INPUT, "h-11 pl-10")}
              />
            </div>
          </div>
          <div>
            <label htmlFor="acct-phone" className={LABEL}>
              Phone
            </label>
            <div className="relative">
              <Phone size={16} strokeWidth={2.2} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                id="acct-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                className={cn(INPUT, "h-11 pl-10")}
              />
            </div>
          </div>
          <div>
            <label htmlFor="acct-college" className={LABEL}>
              College
            </label>
            <select
              id="acct-college"
              value={college}
              onChange={(event) => setCollege(event.target.value)}
              className={cn(INPUT, "h-11 appearance-none")}
            >
              {collegeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          {accountError && (
            <p role="alert" className="text-[13px] font-semibold text-coral-text">
              {accountError}
            </p>
          )}
          {accountMessage && <p className="text-[13px] font-semibold text-brand">{accountMessage}</p>}
          <button
            type="submit"
            disabled={accountPending}
            className="h-11 rounded-[12px] bg-brand px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {accountPending ? "Saving…" : "Save account"}
          </button>
        </form>
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="text-[15px] font-extrabold text-ink">Change password</h3>
        <form onSubmit={savePassword} className="mt-3 space-y-3">
          <div>
            <label htmlFor="acct-current" className={LABEL}>
              Current password
            </label>
            <div className="relative">
              <Lock size={16} strokeWidth={2.2} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                id="acct-current"
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className={cn(INPUT, "h-11 pl-10 pr-11")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-faint hover:bg-[#e6eaf2] hover:text-ink"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="acct-new" className={LABEL}>
              New password
            </label>
            <input
              id="acct-new"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              className={cn(INPUT, "h-11")}
            />
          </div>
          <div>
            <label htmlFor="acct-confirm" className={LABEL}>
              Confirm new password
            </label>
            <input
              id="acct-confirm"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className={cn(INPUT, "h-11")}
            />
          </div>
          {passwordError && (
            <p role="alert" className="text-[13px] font-semibold text-coral-text">
              {passwordError}
            </p>
          )}
          {passwordMessage && <p className="text-[13px] font-semibold text-brand">{passwordMessage}</p>}
          <button
            type="submit"
            disabled={passwordPending}
            className="h-11 rounded-[12px] bg-field px-5 text-[14.5px] font-bold text-ink-soft transition-colors hover:bg-[#e6eaf2] disabled:opacity-60"
          >
            {passwordPending ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="text-[15px] font-extrabold text-ink">Profile privacy</h3>
        <div className="mt-3 flex items-start justify-between gap-4 rounded-[14px] border border-line px-4 py-3.5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14.5px] font-bold text-ink">
              <Shield size={16} strokeWidth={2.2} aria-hidden className="text-brand" />
              Hide my profile
            </p>
            <p className="mt-1 text-[12.5px] font-medium leading-[1.4] text-muted">
              When this is on, other students won’t see your email, phone, or event history on your
              profile.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={user.profilePrivate}
            disabled={privacyPending}
            onClick={togglePrivacy}
            className={cn(
              "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors",
              user.profilePrivate ? "bg-brand" : "bg-[#d5dbe6]",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-pill transition-transform",
                user.profilePrivate ? "left-5" : "left-0.5",
              )}
            />
          </button>
        </div>
        {privacyError && (
          <p role="alert" className="mt-2 text-[13px] font-semibold text-coral-text">
            {privacyError}
          </p>
        )}
        <p className="mt-3 flex items-start gap-[7px] text-[12.5px] font-medium leading-[1.4] text-muted">
          <Info size={14} strokeWidth={2.3} aria-hidden className="mt-[1px] shrink-0 text-faint" />
          You can still see your own account information and event lists while privacy is enabled.
        </p>
      </section>
    </div>
  );
}
