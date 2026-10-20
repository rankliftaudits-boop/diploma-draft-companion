import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCopy,
  FileCheck2,
  Feather,
  ListTree,
  Loader2,
  MessageCircleQuestion,
  NotebookPen,
  PenLine,
  ScanSearch,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
import { streamAssist } from "@/lib/ai/assist-client";
import { MODE_LABELS, extractTextBlock, type AssistInput, type AssistMode } from "@/lib/ai/prompts";
import { settingsQuery, usageTodayQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export type ApplyAction = "append-notes" | "replace-draft" | "append-draft" | "replace-selection";

const GROUPS: { title: string; modes: { mode: AssistMode; icon: typeof Feather; hint: string }[] }[] = [
  {
    title: "قبل الكتابة",
    modes: [
      { mode: "interview", icon: MessageCircleQuestion, hint: "أسئلة دقيقة تستخرج تجربتك الحقيقية" },
      { mode: "outline", icon: ListTree, hint: "هيكل قوي مبني على ملاحظاتك" },
    ],
  },
  {
    title: "أثناء الكتابة",
    modes: [
      { mode: "draft", icon: PenLine, hint: "مسودة بصوتك من ملاحظاتك فقط" },
      { mode: "polish", icon: Feather, hint: "حدّد فقرة أو حسّن النص كاملاً" },
    ],
  },
  {
    title: "قبل التسليم",
    modes: [
      { mode: "critique", icon: ScanSearch, hint: "تقييم تكويني بالمعايير الأربعة" },
      { mode: "rubric", icon: FileCheck2, hint: "هل غطّيت كل متطلبات المهمة؟" },
    ],
  },
];

export function AssistantPanel({
  docId,
  getContext,
  onApply,
  hasSelection,
}: {
  docId: string;
  getContext: () => Omit<AssistInput, "mode">;
  onApply: (action: ApplyAction, text: string) => void;
  hasSelection: boolean;
}) {
  const qc = useQueryClient();
  const { data: used = 0 } = useQuery(usageTodayQuery);
  const { data: settings } = useQuery(settingsQuery);
  const limit = settings?.daily_ai_limit ?? 40;
  const [mode, setMode] = useState<AssistMode | null>(null);
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function run(m: AssistMode) {
    if (busy) return;
    const ctx = getContext();
    setMode(m);
    setOutput("");
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await streamAssist({ ...ctx, mode: m, docId, question: m === "ask" ? question : undefined }, setOutput, ac.signal);
      if (m === "ask") setQuestion("");
    } catch (e) {
      if (!ac.signal.aborted) toast.error(e instanceof Error ? e.message : "تعذّر إكمال الطلب.");
    } finally {
      setBusy(false);
      abortRef.current = null;
      qc.invalidateQueries({ queryKey: usageTodayQuery.queryKey });
      qc.invalidateQueries({ queryKey: ["writing-doc-log", docId] });
    }
  }

  const done = !busy && output.trim().length > 0;
  const textual = mode === "draft" || mode === "polish";

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-ink">رفيق — مساعد الكتابة</h2>
          <span className="text-xs text-muted-foreground">
            {used} / {limit} اليوم
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{g.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {g.modes.map(({ mode: m, icon: Icon, hint }) => (
                  <button
                    key={m}
                    type="button"
                    disabled={busy}
                    onClick={() => run(m)}
                    className={cn(
                      "flex min-h-[64px] flex-col items-start gap-0.5 rounded-lg border bg-background px-3 py-2 text-start transition-colors hover:border-primary hover:bg-accent disabled:opacity-50",
                      mode === m && "border-primary bg-accent",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Icon className="size-4 text-primary" />
                      {MODE_LABELS[m]}
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {m === "polish" && hasSelection ? "سيُحسَّن الجزء الذي حددته" : hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">اسأل عن مهمتك</p>
            <div className="flex gap-2">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="مثال: كيف أربط ما حدث في حصتي بنظرية فيجوتسكي دون حشو؟"
                className="min-h-[44px] flex-1"
                rows={2}
                aria-label="سؤالك للمساعد"
              />
              <Button type="button" onClick={() => run("ask")} disabled={busy || !question.trim()} className="self-end">
                اسأل
              </Button>
            </div>
          </div>
        </div>
      </div>

      {mode ? (
        <div className="rounded-xl border bg-paper p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-primary">{MODE_LABELS[mode]}</span>
            {busy ? (
              <Button size="sm" variant="outline" onClick={() => abortRef.current?.abort()}>
                <Square className="size-3.5" /> إيقاف
              </Button>
            ) : null}
          </div>
          {output ? (
            <Markdown text={output} />
          ) : busy ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> رفيق يقرأ عملك ويفكّر…
            </p>
          ) : null}
          {done ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(textual ? extractTextBlock(output) : output);
                  toast.success("تم النسخ");
                }}
              >
                <ClipboardCopy className="size-3.5" /> نسخ
              </Button>
              {mode === "interview" || mode === "outline" ? (
                <Button size="sm" variant="outline" onClick={() => onApply("append-notes", output)}>
                  <NotebookPen className="size-3.5" /> أضف إلى ملاحظاتي
                </Button>
              ) : null}
              {textual ? (
                <>
                  {mode === "polish" && hasSelection ? (
                    <Button size="sm" onClick={() => onApply("replace-selection", extractTextBlock(output))}>
                      استبدل الجزء المحدد
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onApply("replace-draft", extractTextBlock(output))}>
                      استبدل المسودة
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onApply("append-draft", extractTextBlock(output))}>
                    ألحق بالمسودة
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
          {done && textual ? (
            <p className="mt-2 text-xs text-muted-foreground">
              تُحفظ نسختك الحالية تلقائياً في «سجل العمل» قبل أي استبدال. راجع كل ⟦أضف: …⟧ واملأه من تجربتك.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">طريقة العمل المقترحة</p>
          <ol className="mt-1 list-decimal space-y-1 ps-5">
            <li>الصق تعليمات المهمة، ثم اطلب «أسئلة تُخرج تجربتك».</li>
            <li>أجب في «ملاحظاتي» بكلماتك — ولو بنقاط سريعة.</li>
            <li>اطلب الخطة أو المسودة، ثم عدّلها وأكمل ⟦أضف⟧.</li>
            <li>قبل التسليم: «قراءة ناقدة» و«مطابقة التعليمات».</li>
          </ol>
        </div>
      )}
    </aside>
  );
}
