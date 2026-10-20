import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { FileOutput, Loader2, Plus, ScanSearch, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IndicatorsCard } from "@/components/indicators-card";
import { Markdown } from "@/components/markdown";
import { REFLECTION_AXES, SPECIALTY_HINTS, type ReflectionKey } from "@/lib/diploma";
import { docsQuery, profileQuery, reflectionsQuery, usageTodayQuery, type Reflection } from "@/lib/queries";
import { streamAssist } from "@/lib/ai/assist-client";
import { run, toastError } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/reflect")({
  head: () => ({
    meta: [
      { title: "مختبر التأمل — رفيق الدبلوم" },
      { name: "description", content: "تأمل مهني بستة محاور مع قراءة ناقدة ذكية." },
      { property: "og:title", content: "مختبر التأمل — رفيق الدبلوم" },
      { property: "og:description", content: "تأمل مهني بستة محاور مع قراءة ناقدة ذكية." },
    ],
  }),
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(reflectionsQuery), q.ensureQueryData(profileQuery)]),
  component: ReflectPage,
});

function ReflectPage() {
  const { data: list } = useSuspenseQuery(reflectionsQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(list[0]?.id ?? null);
  const active = list.find((r) => r.id === activeId) ?? null;

  async function create() {
    try {
      const ctx = [profile?.track, profile?.sep, profile?.specialty].filter(Boolean).join(" — ");
      const r = await run(
        supabase
          .from("reflections")
          .insert({ title: `تأمل ${new Date().toLocaleDateString("ar-JO")}`, context_label: ctx || null })
          .select("id")
          .single(),
      );
      await qc.invalidateQueries({ queryKey: reflectionsQuery.queryKey });
      setActiveId(r.id);
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">مختبر التأمل</h1>
          <p className="text-muted-foreground">من الوصف إلى التحليل إلى الأثر إلى الفعل — بعد كل موقف صفي مهم.</p>
        </div>
        <Button onClick={create}>
          <Plus className="size-4" /> تأمل جديد
        </Button>
      </div>
      {profile?.specialty && SPECIALTY_HINTS[profile.specialty] ? (
        <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">{SPECIALTY_HINTS[profile.specialty]}</p>
      ) : null}
      {list.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                r.id === activeId ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {r.title}
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">لا تأملات بعد. ابدأ بتأمل عن آخر حصة لافتة.</p>
      )}
      {active ? <ReflectionEditor key={active.id} r={active} onDeleted={() => setActiveId(null)} /> : null}
    </div>
  );
}

function ReflectionEditor({ r, onDeleted }: { r: Reflection; onDeleted: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [v, setV] = useState<Record<ReflectionKey | "title", string>>({
    title: r.title,
    what: r.what ?? "",
    so: r.so ?? "",
    impact: r.impact ?? "",
    now_step: r.now_step ?? "",
    feedback: r.feedback ?? "",
    changed: r.changed ?? "",
  });
  const pending = useRef<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const ac = useRef<AbortController | null>(null);

  const flush = async () => {
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    try {
      await run(supabase.from("reflections").update(patch).eq("id", r.id));
      qc.invalidateQueries({ queryKey: reflectionsQuery.queryKey });
    } catch (e) {
      toastError(e);
    }
  };
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof v, val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    pending.current[k] = val;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1000);
  };

  const fullText = REFLECTION_AXES.map((a) => v[a.key]).join("\n");

  async function critique() {
    setBusy(true);
    setOut("");
    const ctrl = new AbortController();
    ac.current = ctrl;
    try {
      await streamAssist(
        { mode: "reflection", reflection: Object.fromEntries(REFLECTION_AXES.map((a) => [a.key, v[a.key]])) },
        setOut,
        ctrl.signal,
      );
    } catch (e) {
      if (!ctrl.signal.aborted) toast.error(e instanceof Error ? e.message : "تعذّر إكمال الطلب.");
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: usageTodayQuery.queryKey });
    }
  }

  async function toEssay() {
    await flush();
    try {
      const notes = REFLECTION_AXES.map((a) => `${a.label}:\n${v[a.key]}`).join("\n\n");
      const doc = await run(
        supabase.from("writing_docs").insert({ title: `مقال تأملي: ${v.title}`, doc_type: "مقال تأملي", module: "M3 — الخبرة المدرسية وملف الإنجاز", notes }).select("id").single(),
      );
      await qc.invalidateQueries({ queryKey: docsQuery.queryKey });
      navigate({ to: "/app/studio/$docId", params: { docId: doc.id } });
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input value={v.title} onChange={(e) => set("title", e.target.value)} className="font-semibold" aria-label="عنوان التأمل" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="حذف التأمل"
            onClick={async () => {
              if (!confirm("حذف هذا التأمل نهائياً؟")) return;
              pending.current = {};
              await run(supabase.from("reflections").delete().eq("id", r.id)).catch(toastError);
              await qc.invalidateQueries({ queryKey: reflectionsQuery.queryKey });
              onDeleted();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        {r.context_label ? <p className="text-xs text-muted-foreground">{r.context_label}</p> : null}
        {REFLECTION_AXES.map((a, i) => (
          <section key={a.key} className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">
              <span className="me-1 font-display text-highlight">{i + 1}.</span> {a.label}
            </h3>
            <p className="text-xs text-muted-foreground">{a.hint}</p>
            <Textarea value={v[a.key]} onChange={(e) => set(a.key, e.target.value)} rows={4} className="mt-2" dir="auto" aria-label={a.label} />
          </section>
        ))}
      </div>
      <div className="space-y-4 xl:sticky xl:top-20 xl:h-fit">
        <div className="flex flex-wrap gap-2">
          <Button onClick={critique} disabled={busy || fullText.trim().length < 40}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />} قراءة ناقدة من رفيق
          </Button>
          {busy ? (
            <Button variant="outline" onClick={() => ac.current?.abort()}>
              <Square className="size-4" /> إيقاف
            </Button>
          ) : null}
          <Button variant="outline" onClick={toEssay} disabled={fullText.trim().length < 40}>
            <FileOutput className="size-4" /> حوّله إلى مقال
          </Button>
        </div>
        {out ? (
          <div className="rounded-xl border bg-paper p-4 shadow-sm">
            <Markdown text={out} />
          </div>
        ) : null}
        <IndicatorsCard text={fullText} />
      </div>
    </div>
  );
}
