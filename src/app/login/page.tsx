"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/dashboard");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const next = query.get("next");
    if (next) {
      setNextPath(next);
    }
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ?? (mode === "signup" ? "Signup failed" : "Invalid credentials")
        );
      }

      router.push(nextPath);
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message ?? "Login failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 px-4 py-10 text-slate-900 md:px-8">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Paila auth</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          {mode === "signup" ? "Create account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Superadmins can update pothole status. Registered users can report and comment.
        </p>

        <div className="mt-4 flex gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              mode === "login" ? "bg-white text-slate-900 shadow" : "text-slate-600"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              mode === "signup" ? "bg-white text-slate-900 shadow" : "text-slate-600"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <label className="text-sm text-slate-600">
              Display name (optional)
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-accent focus:outline-none"
                placeholder="your full name"
              />
            </label>
          )}

          <label className="text-sm text-slate-600">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-accent focus:outline-none"
              placeholder="your username"
            />
          </label>

          <label className="text-sm text-slate-600">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-accent focus:outline-none"
              placeholder="your password"
            />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending
              ? mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
