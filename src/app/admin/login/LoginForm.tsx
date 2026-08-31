"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary mt-5 w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="card p-6">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue={state.email ?? ""}
          className="field"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </div>

      <SubmitButton />

      <p className="mt-4 text-center text-[13px] text-ink-600">
        Admin access only — there is no public sign-up.
      </p>
    </form>
  );
}
