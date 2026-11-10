"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, logout, requireStaff } from "./auth";
import { changePassword, manageUser } from "./account-service";
import { saveDraft, submitRevision, reviewRevision, withdrawContent } from "./content-service";
import { AppError, publicError } from "./errors";
import { consumeRate, clientKey } from "./rate-limit";

export type ActionState = { ok?: boolean; message?: string; fields?: Record<string, string>; itemId?: string; revisionId?: string; version?: number; password?: string; redirectTo?: string };
function objectData(form: FormData) {
  const raw = form.get("data");
  if (typeof raw !== "string" || raw.length > 150000) throw new AppError("Formulir tidak sesuai atau terlalu besar.");
  try { return JSON.parse(raw); } catch { throw new AppError("Format formulir tidak sesuai."); }
}
const revisionSchema = z.object({ itemId: z.uuid(), revisionId: z.uuid(), version: z.coerce.number().int().positive() });
export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const email = String(form.get("email") ?? ""); const password = String(form.get("password") ?? "");
    const user = await authenticate(email, password, await headers());
    return { ok: true, redirectTo: user.mustChangePassword ? "/admin/ganti-sandi" : "/admin" };
  } catch (error) { return publicError(error); }
}
export async function logoutAction() { await logout(); redirect("/admin/login"); }
export async function passwordAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff(undefined, true);
    await consumeRate(`password:${staff.id}:${clientKey(await headers())}`, 5, 900);
    const parsed = z.object({ current: z.string(), password: z.string(), confirm: z.string() }).safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new AppError("Formulir sandi tidak sesuai.");
    const { current, password, confirm } = parsed.data;
    if (password !== confirm) throw new AppError("Konfirmasi sandi baru tidak sama.", 400, { confirm: "Konfirmasi sandi baru tidak sama." });
    await changePassword(staff, current, password);
    await logout();
  } catch (error) { return publicError(error); }
  redirect("/admin/login?changed=1");
}
export async function saveDraftAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const result = await saveDraft(await requireStaff(["editor"]), objectData(form));
    revalidatePath("/admin", "layout");
    return { ok: true, ...result, message: "Draf berhasil disimpan. Versi publik belum berubah." };
  } catch (error) { return publicError(error); }
}
export async function submitAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const input = revisionSchema.safeParse(Object.fromEntries(form));
    if (!input.success) throw new AppError("Identitas revisi tidak sesuai.");
    await submitRevision(await requireStaff(["editor"]), input.data.itemId, input.data.revisionId, input.data.version);
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Revisi diajukan dan dikunci sampai keputusan penyetuju." };
  } catch (error) { return publicError(error); }
}
export async function decisionAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const input = revisionSchema.extend({ decision: z.enum(["publish", "return"]), note: z.string() }).safeParse(Object.fromEntries(form));
    if (!input.success) throw new AppError("Keputusan atau identitas revisi tidak sesuai.");
    const { itemId, revisionId, version, decision, note } = input.data;
    await reviewRevision(await requireStaff(["approver"]), itemId, revisionId, version, decision, note);
    revalidatePath("/", "layout");
    return { ok: true, message: decision === "publish" ? "Revisi berhasil diterbitkan." : "Revisi dikembalikan kepada editor." };
  } catch (error) { return publicError(error); }
}
export async function withdrawAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const parsed = z.object({ itemId: z.uuid(), publishedRevisionId: z.uuid(), note: z.string(), archive: z.string().optional() }).safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new AppError("Isi alasan penarikan dan periksa identitas konten.");
    await withdrawContent(await requireStaff(["approver"]), parsed.data.itemId, parsed.data.publishedRevisionId, parsed.data.note, parsed.data.archive === "on");
    revalidatePath("/", "layout");
    return { ok: true, message: "Konten berhasil ditarik dari portal publik." };
  } catch (error) { return publicError(error); }
}
export async function userAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireStaff(["admin"]);
    const data = Object.fromEntries(form);
    const result = await manageUser(actor, { ...data, active: data.active === "true" ? true : data.active === "false" ? false : data.active });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Perubahan akun berhasil disimpan.", password: result.password };
  } catch (error) { return publicError(error); }
}
