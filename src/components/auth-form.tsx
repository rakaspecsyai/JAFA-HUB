"use client";
import { useActionState, useEffect, useId, useRef } from "react";
import { loginAction, passwordAction, type ActionState } from "@/lib/admin-actions";
import s from "./admin.module.css";
export function AuthForm({ mode = "login", changed = false }: { mode?: "login" | "password"; changed?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(mode === "login" ? loginAction : passwordAction, {});
  const id = useId(); const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.redirectTo) window.location.assign(state.redirectTo); else if (state.fields) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [state]);
  const error = (key: string) => state.fields?.[key] && <span id={`${id}-${key}-error`} className="error-text">{state.fields[key]}</span>;
  const a11y = (key: string) => ({ "aria-labelledby": `${id}-${key}-label`, "aria-invalid": !!state.fields?.[key], "aria-describedby": state.fields?.[key] ? `${id}-${key}-error` : undefined });
  // React meminta reset native juga ketika action mengembalikan kesalahan.
  return <form ref={formRef} action={action} onReset={event => event.preventDefault()} className={s.form}>
    {changed && <p className={`${s.message} ${s.success}`}>Sandi berhasil diganti. Silakan masuk kembali.</p>}
    <fieldset disabled={pending}>
      {mode === "login" ? <><label>Email pengelola<input name="email" type="email" autoComplete="username" required maxLength={254} placeholder="Email yang didaftarkan admin" /></label><label>Sandi<input name="password" type="password" autoComplete="current-password" maxLength={128} required /></label></> : <>
        <label><span id={`${id}-current-label`}>Sandi saat ini</span><input name="current" type="password" autoComplete="current-password" required maxLength={128} {...a11y("current")} />{error("current")}</label>
        <label><span id={`${id}-password-label`}>Sandi baru</span><input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required {...a11y("password")} aria-describedby={`${id}-password-help${state.fields?.password ? ` ${id}-password-error` : ""}`} /><span id={`${id}-password-help`} className={s.formHelp}>Minimal 12 karakter, maksimal 128 karakter.</span>{error("password")}</label>
        <label><span id={`${id}-confirm-label`}>Ulangi sandi baru</span><input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required {...a11y("confirm")} />{error("confirm")}</label>
      </>}
      <button className={s.button} type="submit">{pending ? "Memproses…" : mode === "login" ? "Masuk ke CMS" : "Simpan sandi baru"}</button>
    </fieldset>
    {state.message && <p role="alert" className={`${s.message} ${state.ok ? s.success : s.error}`}>{state.message}</p>}
  </form>;
}
