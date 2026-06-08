"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-vero-600 py-2.5 font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-vero-700">Vero</h1>
          <p className="text-sm text-slate-500">
            Gestão de verdade pra sua clínica.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <Field
            label="Clínica"
            name="tenantSlug"
            placeholder="vero-demo"
            autoComplete="organization"
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            placeholder="voce@clinica.com.br"
            autoComplete="username"
          />
          <Field
            label="Senha"
            name="password"
            type="password"
            autoComplete="current-password"
          />

          {state.error ? (
            <p role="alert" className="text-sm text-red-600">
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </div>
    </main>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {props.label}
      </span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        required
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-vero-500 focus:ring-2 focus:ring-vero-500/20"
      />
    </label>
  );
}
