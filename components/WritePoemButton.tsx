"use client";

import { useActionState } from "react";
import { adminWritePoem, type FormState } from "@/app/actions";

export function WritePoemButton() {
  const [state, action, pending] = useActionState<FormState, FormData>(adminWritePoem, undefined);
  return (
    <form action={action} className="stack">
      <button className="primary" disabled={pending}>
        {pending ? "Working…" : "Rewrite today's poem"}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.message && <p className="ok">{state.message}</p>}
    </form>
  );
}
