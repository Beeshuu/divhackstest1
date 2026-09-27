"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const TOKEN_KEY = "campus-connect-token";

export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  college: string;
  profilePrivate: boolean;
  twoFactorEnabled: boolean;
}

export interface ProfileUpdate {
  name?: string;
  email?: string | null;
  phone?: string;
  college?: string;
  profilePrivate?: boolean;
  twoFactorEnabled?: boolean;
}

export interface SignUpInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  college: string;
}

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthChallenge {
  challengeId: string;
  phoneHint: string;
  e164?: string;
  channel: "imessage" | "demo" | string;
  connected?: boolean;
  sendError?: string;
  demoCode?: string;
}

export interface SignInResult {
  requiresSecondFactor: boolean;
  challenge?: AuthChallenge;
}

interface AuthValue {
  user: AuthUser | null;
  status: AuthStatus;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<SignInResult>;
  verifySecondFactor: (challengeId: string, code: string, inbound?: boolean) => Promise<void>;
  requestPasswordReset: (phone: string) => Promise<AuthChallenge>;
  resetPassword: (input: {
    phone?: string;
    challengeId?: string;
    code?: string;
    inbound?: boolean;
    newPassword: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (input: ProfileUpdate) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** fetch() with the session token attached, for the events API. */
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthValue | null>(null);

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** Surfaces the API's own error copy rather than a generic status message. */
async function errorFrom(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null);
  return new Error(typeof body?.error === "string" ? body.error : fallback);
}

function asUser(value: unknown): AuthUser {
  const row = value as Partial<AuthUser> & { profile_private?: unknown };
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: typeof row.email === "string" ? row.email : null,
    phone: String(row.phone ?? ""),
    college: String(row.college ?? ""),
    profilePrivate: Boolean(row.profilePrivate ?? row.profile_private),
    twoFactorEnabled:
      typeof row.twoFactorEnabled === "boolean"
        ? row.twoFactorEnabled
        : row.two_factor_enabled !== 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const token = readToken();
    if (!token) {
      setStatus("anonymous");
      return;
    }
    let active = true;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session expired.");
        const body = await response.json();
        if (!active) return;
        setUser(asUser(body.user));
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        window.localStorage.removeItem(TOKEN_KEY);
        setStatus("anonymous");
      });
    return () => {
      active = false;
    };
  }, []);

  const adopt = useCallback((token: string, nextUser: AuthUser) => {
    window.localStorage.setItem(TOKEN_KEY, token);
    setUser(asUser(nextUser));
    setStatus("authenticated");
  }, []);

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw await errorFrom(response, "Could not create your account.");
      const body = await response.json();
      adopt(body.token, body.user);
    },
    [adopt],
  );

  const signIn = useCallback(async (identifier: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    if (!response.ok) throw await errorFrom(response, "Could not sign you in.");
    const body = await response.json();
    if (body.requiresSecondFactor) {
      return {
        requiresSecondFactor: true,
        challenge: {
          challengeId: String(body.challengeId ?? ""),
          phoneHint: typeof body.phoneHint === "string" ? body.phoneHint : "your phone",
          e164: typeof body.e164 === "string" ? body.e164 : undefined,
          channel: typeof body.channel === "string" ? body.channel : "demo",
          connected: Boolean(body.connected),
          sendError: typeof body.sendError === "string" ? body.sendError : undefined,
          demoCode: typeof body.demoCode === "string" ? body.demoCode : undefined,
        },
      };
    }
    adopt(body.token, body.user);
    return { requiresSecondFactor: false };
  }, [adopt]);

  const verifySecondFactor = useCallback(
    async (challengeId: string, code: string, inbound = false) => {
      const response = await fetch("/api/auth/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code, inbound }),
      });
      if (!response.ok) throw await errorFrom(response, "Could not verify that code.");
      const body = await response.json();
      adopt(body.token, body.user);
    },
    [adopt],
  );

  const requestPasswordReset = useCallback(async (phone: string) => {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!response.ok) throw await errorFrom(response, "Could not send a reset code.");
    const body = await response.json();
    return {
      challengeId: String(body.challengeId ?? ""),
      phoneHint: typeof body.phoneHint === "string" ? body.phoneHint : "your phone",
      e164: typeof body.e164 === "string" ? body.e164 : undefined,
      channel: typeof body.channel === "string" ? body.channel : "demo",
      connected: Boolean(body.connected),
      sendError: typeof body.sendError === "string" ? body.sendError : undefined,
      demoCode: typeof body.demoCode === "string" ? body.demoCode : undefined,
    };
  }, []);

  const resetPassword = useCallback(
    async (input: {
      phone?: string;
      challengeId?: string;
      code?: string;
      inbound?: boolean;
      newPassword: string;
    }) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw await errorFrom(response, "Could not reset your password.");
      const body = await response.json();
      adopt(body.token, body.user);
    },
    [adopt],
  );

  const signOut = useCallback(async () => {
    const token = readToken();
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus("anonymous");
    if (!token) return;
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }, []);

  const updateProfile = useCallback(async (input: ProfileUpdate) => {
    const token = readToken();
    if (!token) throw new Error("Sign in to continue.");
    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw await errorFrom(response, "Could not update your account.");
    const body = await response.json();
    setUser(asUser(body.user));
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const token = readToken();
    if (!token) throw new Error("Sign in to continue.");
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) throw await errorFrom(response, "Could not change your password.");
  }, []);

  const authFetch = useCallback((path: string, init: RequestInit = {}) => {
    const token = readToken();
    return fetch(path, {
      ...init,
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      signUp,
      signIn,
      verifySecondFactor,
      requestPasswordReset,
      resetPassword,
      signOut,
      updateProfile,
      changePassword,
      authFetch,
    }),
    [user, status, signUp, signIn, verifySecondFactor, requestPasswordReset, resetPassword, signOut, updateProfile, changePassword, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside an AuthProvider.");
  return value;
}
