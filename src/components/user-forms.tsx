"use client";
import { useActionState, useEffect, useId, useRef, type FormEvent } from "react";
import { userAction, type ActionState } from "@/lib/admin-actions";
import { ActionMessage } from "./workflow-forms";
import s from "./admin.module.css";
function PasswordResult({ password }: { password?: string }) {
  return password ? <div className={s.password} role="status"><strong>Sandi sementara, tampil satu kali</strong><p>Sampaikan melalui kanal internal terverifikasi. Pengguna wajib menggantinya setelah masuk.</p><span style={{ userSelect: "all" }}>{password}</span></div> : null;
}
function useUserForm() {
  const resetAllowed = useRef(false), formRef = useRef<HTMLFormElement>(null), id = useId();
  const [state, action, pending] = useActionState<ActionState, FormData>(async (_previous, form) => {
    // Hasil sebelumnya dapat memuat sandi sementara; jangan kirim ulang ke server.
    const result = await userAction({}, form);
    // Hasil action harus tersedia sebelum React menjalankan reset native.
    resetAllowed.current = !!result.ok;
    return result;
  }, {});
  useEffect(() => {
    if (state.ok) formRef.current?.querySelector<HTMLElement>('[role="status"]')?.focus();
    else if (state.fields) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);
  const onReset = (event: FormEvent<HTMLFormElement>) => { if (!resetAllowed.current) event.preventDefault(); };
  const error = (key: string) => state.fields?.[key] && <span id={`${id}-${key}-error`} className="error-text">{state.fields[key]}</span>;
  const a11y = (key: string) => ({ "aria-labelledby": `${id}-${key}-label`, "aria-invalid": !!state.fields?.[key], "aria-describedby": state.fields?.[key] ? `${id}-${key}-error` : undefined });
  return { state, action, pending, id, formRef, onReset, error, a11y };
}
export function CreateUserForm() {
  const { state, action, pending, id, formRef, onReset, error, a11y } = useUserForm();
  return <form ref={formRef} className={s.form} action={action} onReset={onReset}><h2>Buat akun pengelola</h2><input type="hidden" name="operation" value="create" /><fieldset disabled={pending}>
    <div className={s.formGrid}><label><span id={`${id}-name-label`}>Nama petugas</span><input name="name" minLength={2} maxLength={100} required {...a11y("name")} />{error("name")}</label><label><span id={`${id}-email-label`}>Email</span><input name="email" type="email" maxLength={254} required autoComplete="off" {...a11y("email")} />{error("email")}</label></div>
    <label><span id={`${id}-role-label`}>Peran</span><select name="role" defaultValue="editor" {...a11y("role")}><option value="editor">Editor</option><option value="approver">Penyetuju</option><option value="admin">Admin akun</option></select>{error("role")}</label>
    <div><button className={s.button}>Buat akun & sandi sementara</button></div>
  </fieldset><ActionMessage state={state} /><PasswordResult password={state.password} /></form>;
}
export function UpdateUserForm({ user }: { user: { id: string; name: string; role: string; active: boolean } }) {
  const { state, action, pending, id, formRef, onReset, error, a11y } = useUserForm();
  // Select tak terkontrol perlu dipasang ulang saat nilai tersimpan berubah.
  return <form ref={formRef} action={action} onReset={onReset} className={s.form}><input type="hidden" name="userId" value={user.id} /><fieldset key={`${user.role}:${user.active}`} disabled={pending}>
    <div className={s.formGrid}><label><span id={`${id}-role-label`}>Peran</span><select name="role" defaultValue={user.role} {...a11y("role")}><option value="editor">Editor</option><option value="approver">Penyetuju</option><option value="admin">Admin akun</option></select>{error("role")}</label><label><span id={`${id}-active-label`}>Akses</span><select name="active" defaultValue={String(user.active)} {...a11y("active")}><option value="true">Aktif</option><option value="false">Nonaktif</option></select>{error("active")}</label></div>
    <div className={s.inlineButtons}><button name="operation" value="update" className={`${s.button} ${s.secondary}`}>Simpan akses</button><button name="operation" value="reset" className={s.linkButton}>Reset sandi</button></div><p className={s.formHelp}>Perubahan akses atau reset mencabut seluruh sesi akun ini.</p>
  </fieldset><ActionMessage state={state} /><PasswordResult password={state.password} /></form>;
}
