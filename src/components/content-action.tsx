"use client";
import { createContext, useActionState, useContext, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import type { ActionState } from "@/lib/admin-actions";

export type ContentFeedback = { path: string; message: string };
export const ContentActionContext = createContext<Dispatch<SetStateAction<ContentFeedback | undefined>> | null>(null);

export function useContentAction(action: (previous: ActionState, form: FormData) => Promise<ActionState>) {
  const setFeedback = useContext(ContentActionContext), path = usePathname() ?? "/admin";
  if (!setFeedback) throw new Error("Formulir konten memerlukan AdminShell.");
  return useActionState<ActionState, FormData>(async (previous, form) => {
    setFeedback(undefined);
    const result = await action(previous, form);
    if (result.ok && result.message && window.location.pathname === path) {
      setFeedback({ path: result.itemId ? path.replace(/\/[^/]+$/, `/${result.itemId}`) : path, message: result.message });
    }
    return result;
  }, {});
}
