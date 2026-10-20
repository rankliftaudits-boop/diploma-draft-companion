import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, History, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssistantPanel, type ApplyAction } from "@/components/assistant-panel";
import { IndicatorsCard } from "@/components/indicators-card";
import { Markdown } from "@/components/markdown";
import { DOC_TYPES, MODULES } from "@/lib/diploma";
import { docLogQuery, docQuery, docsQuery, type WritingDoc } from "@/lib/queries";
import { MODE_LABELS, type AssistMode } from "@/lib/ai/prompts";
import { wordCount } from "@/lib/writing-analysis";
import { run, toastError } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/studio/$docId")({
  head: () => ({
    meta: [
      { title: "مهمة — مساحة الكتابة — رفيق الدبلوم" },
      { name: "description", content: "اكتب مهمتك مع رفيق: أسئلة، خطة، مسودة، وقراءة ناقدة." },
      { property: "og:title", content: "مساحة الكتابة — رفيق الدبلوم" },
      { property: "og:description", content: "اكتب مهمتك مع رفيق." },
    ],
  }),
  loader: async ({ context, params }) => {
    const doc = await context.queryClient.ensureQueryData(docQuery(params.docId));
    if (!doc) throw notFound();
  },
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p>لم نجد هذه المهمة.</p>
      <Link to="/app/studio" className="text-primary underline">العودة لمساحة الكتابة</Link>
    </div>
  ),
  component: StudioDoc,
});

type Fields = Pick<WritingDoc, "title" | "doc_type" | "module" | "brief" | "notes" | "content" | "word_target">;

function StudioDoc() {
  const { docId } = Route.useParams();
  const { data: doc } = useSuspenseQuery(docQuery(docId));
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState<Fields>(() => ({
    title: doc!.title,
    doc_type: doc!.doc_type,
    module: doc!.module,
    brief: doc!.brief,
    notes: doc!.notes,
    content: doc!.content,
    word_target: doc!.word_target,
  }));
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">("saved");
  const [tab, setTab] = useState<"write" | "log">("write");
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<Partial<Fields>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    setSaveState("saving");
    try {
      await run(supabase.from("writing_docs").update(patch).eq("id", docId));
      setSaveState("saved");
      qc.invalidateQueries({ queryKey: docsQuery.queryKey });
    } catch (e) {
      pending.current = { ...patch, ...pending.current };
      setSaveState("dirty");
      toastError(e);
    }
  }, [docId, qc]);

  const update = (patch: Partial<Fields>) => {
    setF((p) => ({ ...p, ...patch }));
    pending.current = { ...pending.current, ...patch };
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1200);
  };

  useEffect(() => {
    const onUnload = () => void flush();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      void flush();
    };
  }, [flush]);

  async function snapshot(label: string) {
    if (!(f.content ?? "").trim()) return;
    await supabase.from("doc_versions").insert({ doc_id: docId, content: f.content!, label });
    qc.invalidateQueries({ queryKey: docLogQuery(docId).queryKey });
  }

  const selectedText =
    selection && f.content ? f.content.slice(selection.start, selection.end).trim() : "";

  async function onApply(action: ApplyAction, text: string) {
    if (action === "append-notes") {
      update({ notes: [(f.notes ?? "").trim(), "— من رفيق —", text.trim(), "إجاباتي:\n"].filter(Boolean).join("\n\n") });
      toast.success("أُضيفت إلى ملاحظاتي. أجب تحتها بكلماتك.");
      return;
    }
    await snapshot(action === "append-draft" ? "قبل الإلحاق من رفيق" : "قبل الاستبدال من رفيق");
    if (action === "replace-draft") update({ content: text });
    else if (action === "append-draft") update({ content: [(f.content ?? "").trim(), text].filter(Boolean).join("\n\n") });
    else if (action === "replace-selection" && selection && f.content) {
      update({ content: f.content.slice(0, selection.start) + text + f.content.slice(selection.end) });
      setSelection(null);
    }
    toast.success("تم التحديث، ونسختك السابقة محفوظة في سجل العمل.");
  }

  const wc = wordCount(f.content);
  const notesWc = wordCount(f.notes);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/studio" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-4" /> كل المهام
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
            {saveState === "saving" ? (
              <>
                <Loader2 className="size-3 animate-spin" /> يحفظ…
              </>
            ) : saveState === "dirty" ? (
              "تغييرات غير محفوظة"
            ) : (
              <>
                <Check className="size-3 text-success" /> محفوظ
              </>
            )}
          </span>
          <Button size="sm" variant="outline" onClick={async () => { await flush(); await snapshot("نسخة يدوية"); toast.success("حُفظت نسخة في سجل العمل"); }}>
            <Save className="size-4" /> حفظ نسخة
          </Button>
          <Button
            size="sm"
            variant={tab === "log" ? "default" : "outline"}
            onClick={() => setTab(tab === "log" ? "write" : "log")}
          >
            <History className="size-4" /> سجل العمل
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="حذف المهمة"
            onClick={async () => {
              if (!confirm("حذف هذه المهمة وكل سجلها نهائياً؟")) return;
              pending.current = {};
              await run(supabase.from("writing_docs").delete().eq("id", docId)).catch(toastError);
              await qc.invalidateQueries({ queryKey: docsQuery.queryKey });
              navigate({ to: "/app/studio" });
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <div className="min-w-0 space-y-4">
          {tab === "log" ? (
            <ProcessLog docId={docId} onRestore={async (content) => { await snapshot("قبل الاستعادة"); update({ content }); setTab("write"); toast.success("تمت استعادة النسخة"); }} />
          ) : (
            <>
              <div className="rounded-2xl border bg-card p-4">
                <Input
                  value={f.title}
                  onChange={(e) => update({ title: e.target.value })}
                  className="border-0 bg-transparent px-0 font-display text-2xl font-bold text-ink shadow-none focus-visible:ring-0"
                  aria-label="عنوان المهمة"
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <select value={f.doc_type} onChange={(e) => update({ doc_type: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="نوع المهمة">
                    {DOC_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <select value={f.module ?? ""} onChange={(e) => update({ module: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="الوحدة">
                    {MODULES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={0}
                    placeholder="الطول المطلوب (كلمة)"
                    value={f.word_target ?? ""}
                    onChange={(e) => update({ word_target: e.target.value ? Number(e.target.value) : null })}
                    className="h-9"
                    aria-label="الطول المطلوب بالكلمات"
                  />
                </div>
              </div>

              <details className="rounded-2xl border bg-card p-4" open={!f.brief}>
                <summary className="cursor-pointer font-semibold">
                  ١. تعليمات المهمة والروبرك <span className="text-xs font-normal text-muted-foreground">(الصقها كما وصلتك — يُقاس عملك عليها)</span>
                </summary>
                <Textarea
                  value={f.brief ?? ""}
                  onChange={(e) => update({ brief: e.target.value })}
                  rows={6}
                  className="mt-3"
                  placeholder="الصق نص المهمة، المحاور المطلوبة، الطول، معايير التقدير من دليل دفعتك…"
                  aria-label="تعليمات المهمة"
                />
              </details>

              <section className="rounded-2xl border bg-card p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold">٢. ملاحظاتي وتجربتي</h2>
                  <span className="text-xs text-muted-foreground">{notesWc} كلمة</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  نقاط سريعة بكلماتك: ماذا حدث في صفك، ماذا قال الطلبة، ماذا لاحظت، ما الذي غيّرته. هذا ما يجعل النص نصّك.
                </p>
                <Textarea
                  value={f.notes ?? ""}
                  onChange={(e) => update({ notes: e.target.value })}
                  rows={8}
                  className="mt-2"
                  placeholder="مثال: في حصة الكسور للصف الرابع، معظم الطلبة قارنوا 1/3 و1/4 وقالوا إن 1/4 أكبر لأن 4 أكبر…"
                  aria-label="ملاحظاتي"
                />
              </section>

              <section className="rounded-2xl border bg-paper p-4 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold">٣. المسودة</h2>
                  <span className={cn("text-xs", f.word_target && wc >= f.word_target ? "text-success" : "text-muted-foreground")}>
                    {wc}
                    {f.word_target ? ` / ${f.word_target}` : ""} كلمة
                    {selectedText ? ` · محدد: ${wordCount(selectedText)} كلمة` : ""}
                  </span>
                </div>
                <Textarea
                  ref={draftRef}
                  value={f.content ?? ""}
                  onChange={(e) => update({ content: e.target.value })}
                  onSelect={(e) => {
                    const t = e.currentTarget;
                    setSelection(t.selectionEnd - t.selectionStart > 10 ? { start: t.selectionStart, end: t.selectionEnd } : null);
                  }}
                  dir="auto"
                  rows={22}
                  className="paper-lines mt-2 min-h-[480px] resize-y border-0 bg-transparent text-[16px] shadow-none focus-visible:ring-1"
                  placeholder="اكتب هنا، أو اطلب من رفيق خطة أو مسودة من ملاحظاتك…"
                  aria-label="المسودة"
                />
              </section>

              <IndicatorsCard text={f.content ?? ""} minWords={f.word_target || 250} />
            </>
          )}
        </div>

        <div className="xl:sticky xl:top-20 xl:h-fit">
          <AssistantPanel
            docId={docId}
            hasSelection={Boolean(selectedText)}
            onApply={onApply}
            getContext={() => ({
              title: f.title,
              docType: f.doc_type,
              module: f.module ?? undefined,
              brief: f.brief ?? undefined,
              notes: f.notes ?? undefined,
              content: f.content ?? undefined,
              selection: selectedText || undefined,
              wordTarget: f.word_target,
            })}
          />
        </div>
      </div>
    </div>
  );
}

function ProcessLog({ docId, onRestore }: { docId: string; onRestore: (content: string) => void }) {
  const { data, isLoading } = useQuery(docLogQuery(docId));
  if (isLoading || !data) return <p className="p-4 text-sm text-muted-foreground">يحمّل السجل…</p>;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">نسخ المسودة</h2>
        <p className="text-xs text-muted-foreground">تُحفظ تلقائياً قبل كل استبدال من رفيق، أو يدوياً بزر «حفظ نسخة».</p>
        {data.versions.length ? (
          <ul className="mt-3 space-y-2">
            {data.versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <span>
                  {v.label ?? "نسخة"} — {new Date(v.created_at).toLocaleString("ar-JO")} · {wordCount(v.content)} كلمة
                </span>
                <Button size="sm" variant="outline" onClick={() => onRestore(v.content)}>
                  <RotateCcw className="size-3.5" /> استعادة
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">لا نسخ بعد.</p>
        )}
      </div>
      <div className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">تفاعلاتي مع رفيق</h2>
        <p className="text-xs text-muted-foreground">سجل شفاف لعملية الكتابة — يمكنك تصديره من «تصدير وطباعة».</p>
        <div className="mt-3 space-y-3">
          {data.messages.length ? (
            data.messages.map((m) =>
              m.role === "user" ? (
                <p key={m.id} className="rounded-lg bg-muted p-2 text-sm">
                  <b>طلبتُ: {MODE_LABELS[m.mode as AssistMode] ?? m.mode}</b> — {m.content.slice(0, 200)}
                  <span className="block text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("ar-JO")}</span>
                </p>
              ) : (
                <details key={m.id} className="rounded-lg border p-2">
                  <summary className="cursor-pointer text-sm text-primary">رد رفيق ({MODE_LABELS[m.mode as AssistMode] ?? m.mode})</summary>
                  <div className="mt-2">
                    <Markdown text={m.content} />
                  </div>
                </details>
              ),
            )
          ) : (
            <p className="text-sm text-muted-foreground">لا تفاعلات بعد.</p>
          )}
        </div>
      </div>
    </div>
  );
}
