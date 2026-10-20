import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";
import {
  ASSIST_MODES,
  MIN_NOTES_WORDS_FOR_DRAFT,
  buildSystemPrompt,
  buildUserPrompt,
  type AssistInput,
} from "./prompts";
import { wordCount } from "@/lib/writing-analysis";

const MODEL_ID = "anthropic/claude-fable-5-1";
export const STREAM_ERROR_MARK = "\u0000ERR:";

const str = (max: number) => z.string().max(max).optional();
const BodySchema = z.object({
  mode: z.enum(ASSIST_MODES),
  docId: z.string().uuid().nullable().optional(),
  title: str(300),
  docType: str(120),
  module: str(120),
  brief: str(12000),
  notes: str(20000),
  content: str(40000),
  selection: str(10000),
  question: str(3000),
  wordTarget: z.number().int().min(0).max(20000).nullable().optional(),
  reflection: z.record(z.string(), z.string().max(8000)).optional(),
});

function json(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function gatewayErrorMessage(err: unknown): string {
  const e = err as { statusCode?: number; message?: string; responseBody?: string };
  const status = e?.statusCode;
  if (status === 402) return "نفد رصيد الذكاء الاصطناعي لدى صاحب الخدمة مؤقتاً. حاول لاحقاً أو تواصل معه.";
  if (status === 429) return "ضغط كبير على المساعد الآن. انتظر دقيقة ثم حاول مجدداً.";
  if (status === 403) return "المساعد غير متاح حالياً لهذه الخدمة. تواصل مع صاحب الخدمة.";
  if (status && status >= 500) return "تعذّر الوصول إلى المساعد مؤقتاً. حاول بعد قليل.";
  return "تعذّر إكمال الطلب. حاول مرة أخرى.";
}

export async function handleAssist(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.split(".").length !== 3) return json(401, "سجّل الدخول أولاً.");

  const supabase = userClient(token);
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (claimsErr || !userId) return json(401, "انتهت الجلسة. سجّل الدخول مجدداً.");

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return json(400, "الطلب غير صالح أو النص أطول من المسموح.");
  }

  const { data: active } = await supabase.rpc("has_active_access", { _user_id: userId });
  if (!active) return json(403, "اشتراكك غير فعّال. فعّل كوداً جديداً للمتابعة.");

  const [{ data: settings }, { count }] = await Promise.all([
    supabase.from("app_settings").select("daily_ai_limit").eq("id", 1).maybeSingle(),
    supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  const limit = settings?.daily_ai_limit ?? 40;
  if ((count ?? 0) >= limit) {
    return json(429, `وصلت إلى الحد اليومي (${limit} طلباً خلال 24 ساعة). يتجدد الحد تلقائياً.`);
  }

  if (body.mode === "draft" && wordCount(body.notes) < MIN_NOTES_WORDS_FOR_DRAFT) {
    return json(
      422,
      `لكي تكون المسودة نصّك أنت، اكتب أولاً ${MIN_NOTES_WORDS_FOR_DRAFT} كلمة على الأقل في «ملاحظاتي» عن تجربتك (استخدم «أسئلة تُخرج تجربتك» إن احترت).`,
    );
  }
  if (body.mode === "ask" && !body.question?.trim()) return json(422, "اكتب سؤالك أولاً.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,track,specialty,sep,gender,school_context,voice_sample")
    .eq("id", userId)
    .maybeSingle();

  const input: AssistInput = { ...body, reflection: body.reflection as AssistInput["reflection"] };
  const system = buildSystemPrompt(profile ?? {});
  const prompt = buildUserPrompt(input);

  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  if (!lovableApiKey) return json(500, "إعداد الخدمة غير مكتمل.");

  await supabase.from("ai_usage").insert({ user_id: userId, mode: body.mode });
  const docId = body.docId ?? null;
  if (docId) {
    const requestNote =
      body.mode === "ask"
        ? body.question!
        : body.selection?.trim()
          ? `على الجزء المحدد:\n${body.selection.trim().slice(0, 600)}`
          : "على المهمة كاملة";
    await supabase.from("assistant_messages").insert({ user_id: userId, doc_id: docId, mode: body.mode, role: "user", content: requestNote });
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch(undefined);
  const anthropic = createAnthropic({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: lovableApiKey,
    headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: anthropic(MODEL_ID),
    system,
    prompt,
    maxOutputTokens: 12000,
    maxRetries: 0,
    abortSignal: request.signal,
    providerOptions: { anthropic: { effort: body.mode === "draft" || body.mode === "critique" ? "high" : "medium" } },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      let failed = false;
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            full += part.text;
            controller.enqueue(encoder.encode(part.text));
          } else if (part.type === "error") {
            failed = true;
            console.error("assist stream error", part.error);
            controller.enqueue(encoder.encode(STREAM_ERROR_MARK + gatewayErrorMessage(part.error)));
          } else if (part.type === "finish" && part.finishReason === "content-filter") {
            failed = true;
            controller.enqueue(encoder.encode(STREAM_ERROR_MARK + "اعتذر المساعد عن هذا الطلب. عدّل المحتوى ثم ابدأ طلباً جديداً."));
          }
        }
      } catch (err) {
        failed = true;
        if (!request.signal.aborted) {
          console.error("assist error", err);
          controller.enqueue(encoder.encode(STREAM_ERROR_MARK + gatewayErrorMessage(err)));
        }
      } finally {
        if (docId && full.trim() && !failed) {
          await supabase
            .from("assistant_messages")
            .insert({ user_id: userId, doc_id: docId, mode: body.mode, role: "assistant", content: full });
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  const headers = new Headers({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-cache, no-transform",
  });
  const runId = runIdFetch.getRunId();
  if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
  return new Response(stream, { headers });
}
