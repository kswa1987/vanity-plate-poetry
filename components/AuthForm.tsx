"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type FormState } from "@/app/actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "login" ? login : signup, undefined);
  return (
    <form action={action} className="stack">
      {mode === "signup" && (
        <label>
          Display name (shown next to your plates)
          <input type="text" name="name" required maxLength={60} />
        </label>
      )}
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>
      {state?.error && <p className="error">{state.error}</p>}
      <button className="primary" disabled={pending}>
        {mode === "login" ? "Log in" : "Sign up"}
      </button>
      {mode === "login" ? (
        <p className="muted">
          New here? <Link href="/signup">Sign up</Link>
        </p>
      ) : (
        <p className="muted">
          An admin approves new accounts before they can upload. Already have one? <Link href="/login">Log in</Link>
        </p>
      )}
    </form>
  );
}
