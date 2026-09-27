"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  GraduationCap,
  Mail,
  Phone,
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";

import { useAuth, type AuthChallenge } from "@/lib/auth";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { TwoFactorForm } from "./TwoFactorForm";

const OTHER_OPTION = "Other";

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

export default function AuthPage() {
  const router = useRouter();
  const { status, signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [twoFactor, setTwoFactor] = useState<AuthChallenge | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [college, setCollege] = useState("");
  const [isCollegeOpen, setIsCollegeOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [otherCollege, setOtherCollege] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Anyone already signed in belongs on the map, not on this form.
  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      if (isSignUp) {
        const school = college === OTHER_OPTION ? otherCollege.trim() : college.trim();
        await signUp({ name, email, phone, password, college: school });
      } else {
        const result = await signIn(identifier, password);
        if (result.requiresSecondFactor && result.challenge) {
          setTwoFactor(result.challenge);
          setPending(false);
          return;
        }
      }
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Try again.");
      setPending(false);
    }
  };

  const query = college.trim().toLowerCase();
  const matches = COLLEGES.filter((name) =>
    name.toLowerCase().includes(query),
  );
  // "Other" always stays reachable, even when the query matches nothing.
  const options = [...matches, OTHER_OPTION];

  const chooseCollege = (name: string) => {
    setCollege(name);
    setIsCollegeOpen(false);
    if (name !== OTHER_OPTION) setOtherCollege("");
  };

  const onCollegeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsCollegeOpen(true);
      setHighlight((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && isCollegeOpen) {
      e.preventDefault();
      chooseCollege(options[highlight]);
    } else if (e.key === "Escape") {
      setIsCollegeOpen(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 font-sans text-slate-900">
      {/* LEFT SIDE: Branding & Visuals (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-blue-700 relative overflow-hidden items-center justify-center p-12">
        {/* Decorative Map Pattern Background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(#fff 1.5px, transparent 1.5px)",
            backgroundSize: "40px 40px",
          }}
        ></div>

        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white p-3 rounded-2xl shadow-lg">
              <Navigation className="text-blue-700 w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Campus Connect</h1>
          </div>
          <h2 className="text-5xl font-extrabold leading-tight mb-6">
            Your campus, <br />
            <span className="text-blue-200">all in one place.</span>
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">
            Join thousands of other students at your NYC campus discovering free
            food, social clubs, and career opportunities in real-time.
          </p>

          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <p className="text-2xl font-bold">143</p>
              <p className="text-xs uppercase tracking-wider opacity-70">
                Active Now
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs uppercase tracking-wider opacity-70">
                New Events
              </p>
            </div>
          </div>
        </div>

        {/* Decorative Circle */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* RIGHT SIDE: The Forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px]"
        >
          {/* Header */}
          <div className="mb-10">
            <h3 className="text-3xl font-bold mb-2">
              {twoFactor
                ? "Two-step verification"
                : isReset
                  ? "Reset your password"
                  : isSignUp
                    ? "Create your account"
                    : "Welcome back"}
            </h3>
            <p className="text-slate-500">
              {twoFactor
                ? "Photon sends a code over iMessage so only you can finish signing in."
                : isReset
                  ? "Photon iMessages a reset code to the phone number on your account."
                  : isSignUp
                    ? "Join and have fun with your campus community!"
                    : "Log in to see what's happening on campus."}
            </p>
          </div>

          {twoFactor ? (
            <TwoFactorForm
              challenge={twoFactor}
              onBack={() => {
                setTwoFactor(null);
                setError(null);
              }}
            />
          ) : isReset ? (
            <ResetPasswordForm
              initialPhone={identifier}
              onBack={() => {
                setIsReset(false);
                setIsSignUp(false);
                setError(null);
              }}
            />
          ) : (
          <form className="space-y-4" onSubmit={submit}>
            <AnimatePresence mode="wait">
              {isSignUp ? (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  {/* NAME */}
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 ml-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jamie Chen"
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* EMAIL (Optional) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-sm font-semibold text-slate-700">
                        Email Address
                      </label>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Optional
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jamie@columbia.edu"
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* PHONE */}
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 ml-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 ml-1 pt-1">
                      Must be at least 8 characters.
                    </p>
                  </div>

                  {/* COLLEGE */}
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 ml-1">
                      College / University
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-3.5 text-slate-400 w-5 h-5 pointer-events-none z-10" />
                      <input
                        type="text"
                        role="combobox"
                        required
                        aria-expanded={isCollegeOpen}
                        aria-autocomplete="list"
                        autoComplete="off"
                        value={college}
                        placeholder="Start typing your school"
                        onChange={(e) => {
                          setCollege(e.target.value);
                          setIsCollegeOpen(true);
                          setHighlight(0);
                        }}
                        onFocus={() => setIsCollegeOpen(true)}
                        onBlur={() => setIsCollegeOpen(false)}
                        onKeyDown={onCollegeKeyDown}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                      />
                      <ChevronDown
                        className={`absolute right-4 top-3.5 text-slate-400 w-5 h-5 pointer-events-none transition-transform ${
                          isCollegeOpen ? "rotate-180" : ""
                        }`}
                      />

                      {isCollegeOpen && (
                        <ul
                          role="listbox"
                          className="absolute z-20 top-full left-0 right-0 mt-2 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl py-2"
                        >
                          {options.map((name, i) => (
                            <li key={name} role="option" aria-selected={i === highlight}>
                              <button
                                type="button"
                                // Keeps focus on the input so onBlur doesn't close the list first.
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => setHighlight(i)}
                                onClick={() => chooseCollege(name)}
                                className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${
                                  i === highlight
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-700"
                                } ${
                                  name === OTHER_OPTION
                                    ? "font-semibold border-t border-slate-100 mt-1 pt-3"
                                    : ""
                                }`}
                              >
                                {name === OTHER_OPTION
                                  ? "Other — my school isn't listed"
                                  : name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* WRITE-IN COLLEGE (only when "Other" is chosen) */}
                  {college === OTHER_OPTION && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-1 overflow-hidden"
                    >
                      <label className="text-sm font-semibold text-slate-700 ml-1">
                        Your College / University
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                        <input
                          type="text"
                          autoFocus
                          required
                          value={otherCollege}
                          onChange={(e) => setOtherCollege(e.target.value)}
                          placeholder="e.g. Manhattan College"
                          className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                        />
                      </div>
                      <p className="text-xs text-slate-400 ml-1 pt-1">
                        Tell us which NYC school you attend.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 ml-1">
                      Email or Phone
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Enter your credentials"
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-sm font-semibold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsReset(true);
                          setError(null);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p
                role="alert"
                className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-6 group"
            >
              {pending
                ? isSignUp
                  ? "Creating account…"
                  : "Signing in…"
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          )}

          {!isReset && !twoFactor && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setShowPassword(false);
                setIsCollegeOpen(false);
                setError(null);
                setPassword("");
              }}
              className="text-slate-500 hover:text-blue-600 transition-colors"
            >
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <span className="font-bold text-blue-600">Sign In</span>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <span className="font-bold text-blue-600">Join now</span>
                </>
              )}
            </button>
          </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
