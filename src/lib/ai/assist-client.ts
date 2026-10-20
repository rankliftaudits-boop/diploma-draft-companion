import { supabase } from "@/integrations/supabase/client";
import type { AssistInput } from "./prompts";

const ERR_MARK = "\u0000ERR:";

export type AssistRequest = AssistInput & { docId?: string | null };

/** Streams the assistant reply. Throws Error with a user-facing Arabic message on failure. */
export async function streamAssist(
  req: AssistRequest,
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("سجّل الدخول أولاً.");

  const res = await fetch("/api/assist", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    let msg = "تعذّر الوصول إلى المساعد.";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    const errAt = full.indexOf(ERR_MARK);
    if (errAt >= 0) {
      const partial = full.slice(0, errAt);
      onText(partial);
      throw new Error(full.slice(errAt + ERR_MARK.length) || "تعذّر إكمال الطلب.");
    }
    onText(full);
  }
  full += decoder.decode();
  onText(full);
  if (!full.trim()) throw new Error("لم يصل رد من المساعد. حاول مرة أخرى.");
  return full;
}
