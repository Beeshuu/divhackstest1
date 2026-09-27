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
}

export interface SignUpInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  college: string;
}

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthValue {
  user: AuthUser | null;
  status: AuthStatus;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
        setUser(body.user);
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
    setUser(nextUser);
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

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!response.ok) throw await errorFrom(response, "Could not sign you in.");
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
    () => ({ user, status, signUp, signIn, signOut, authFetch }),
    [user, status, signUp, signIn, signOut, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside an AuthProvider.");
  return value;
}
