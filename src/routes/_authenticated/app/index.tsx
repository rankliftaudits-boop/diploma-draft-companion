import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { JOURNEY, SEP_LABELS, SPECIALTY_HINTS, estimateGpa } from "@/lib/diploma";
import {
  docsQuery,
  portfolioQuery,
  profileQuery,
  reflectionsQuery,
  requirementsQuery,
  tasksQuery,
} from "@/lib/queries";
import { run, toastError } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "رحلتي — رفيق الدبلوم" },
      { name: "description", content: "رحلتك في الدبلوم: الوحدات، الخبرة المدرسية، تقدمك ومعدلك التقديري." },
      { property: "og:title", content: "رحلتي — رفيق الدبلوم" },
      { property: "og:description", content: "رحلتك في الدبلوم وتقدمك." },
    ],
  }),
  loader: ({ context: { queryClient: q } }) =>
    Promise.all([
      q.ensureQueryData(profileQuery),
      q.ensureQueryData(tasksQuery),
      q.ensureQueryData(reflectionsQuery),
      q.ensureQueryData(portfolioQuery),
      q.ensureQueryData(requirementsQuery),
      q.ensureQueryData(docsQuery),
    ]),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: reflections } = useSuspenseQuery(reflectionsQuery);
  const { data: portfolio } = useSuspenseQuery(portfolioQuery);
  const { data: docs } = useSuspenseQuery(docsQuery);
  const done = tasks.filter((t) => t.done).length;
  const covered = new Set(portfolio.map((p) => p.standard)).size;
  const incomplete = !profile?.track || !profile?.specialty;
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">أهلاً{firstName ? ` ${firstName}` : ""}</h1>
        <p className="text-muted-foreground">ما الذي تكتبه اليوم؟</p>
      </div>

      {incomplete ? (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-highlight bg-highlight/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <b>خطوة مهمة:</b> حدّد مسارك وتخصصك وصف صفك، وأضف عيّنة من كتابتك — ليكتب رفيق بصوتك أنت لا بصوت عام.
          </p>
          <Button asChild>
            <Link to="/app/profile">أكمل ملفي</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
          <PenLine className="size-7" />
          <h2 className="mt-3 font-display text-2xl font-bold">ابدأ مهمة أو مقالاً جديداً</h2>
          <p className="mt-1 text-sm opacity-90">الصق التعليمات، ودع رفيق يسألك عن تجربتك، ثم اكتبا معاً.</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link to="/app/studio">مساحة الكتابة</Link>
          </Button>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold">آخر ما كتبت</h3>
          {docs.length ? (
            <ul className="mt-2 space-y-1.5 text-sm">
              {docs.slice(0, 4).map((d) => (
                <li key={d.id}>
                  <Link to="/app/studio/$docId" params={{ docId: d.id }} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted">
                    <span className="truncate">{d.title}</span>
                    <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">لا مسودات بعد.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["المهام", `${done}/${tasks.length}`],
          ["التأملات", reflections.length],
          ["أدلة الملف", portfolio.length],
          ["معايير مغطاة", `${covered}/7`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="font-display text-2xl font-bold text-ink">{v}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-display text-xl font-bold text-ink">رحلتي من التهيئة إلى التخرج</h2>
        <p className="text-sm text-muted-foreground">24 ساعة معتمدة في ثلاث وحدات. استرشادي — ارجع إلى دليل دفعتك.</p>
        <ol className="mt-4 space-y-3 border-s-2 border-accent ps-5">
          {JOURNEY.map((s) => (
            <li key={s.t} className="relative">
              <span className="absolute -start-[27px] top-1.5 size-3 rounded-full bg-primary" />
              <p className="font-semibold">{s.t}</p>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
        {profile?.specialty && SPECIALTY_HINTS[profile.specialty] ? (
          <p className="mt-4 rounded-lg bg-accent p-3 text-sm text-accent-foreground">موجّه تخصصك: {SPECIALTY_HINTS[profile.specialty]}</p>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <SepRequirements sep={profile?.sep ?? null} />
        <GpaCalculator />
      </div>
    </div>
  );
}

function SepRequirements({ sep }: { sep: string | null }) {
  const qc = useQueryClient();
  const { data: reqs } = useSuspenseQuery(requirementsQuery);
  const [text, setText] = useState("");
  const list = reqs.filter((r) => r.sep === sep);
  const refresh = () => qc.invalidateQueries({ queryKey: requirementsQuery.queryKey });

  if (!sep) {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">متطلبات الخبرة المدرسية</h2>
        <p className="mt-1 text-sm text-muted-foreground">اختر الخبرة المدرسية الحالية من «ملفي وصوتي» لتتابع متطلباتها.</p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">متطلبات {SEP_LABELS[sep] ?? sep}</h2>
      <p className="text-xs text-muted-foreground">اكتبها كما وردت في دليل دفعتك.</p>
      <ul className="mt-3 space-y-2">
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <Checkbox
              checked={r.done}
              aria-label={`إنجاز ${r.text}`}
              onCheckedChange={async (v) => {
                try {
                  await run(supabase.from("sep_requirements").update({ done: v === true }).eq("id", r.id));
                  refresh();
                } catch (e) {
                  toastError(e);
                }
              }}
            />
            <span className={r.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{r.text}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="حذف"
              onClick={async () => {
                await run(supabase.from("sep_requirements").delete().eq("id", r.id)).catch(toastError);
                refresh();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          try {
            await run(supabase.from("sep_requirements").insert({ sep, text: text.trim() }));
            setText("");
            refresh();
          } catch (err) {
            toastError(err);
          }
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="مثال: ملاحظة حصة مع المرشد" aria-label="متطلب جديد" />
        <Button type="submit">إضافة</Button>
      </form>
      {list.length ? (
        <p className="mt-2 text-sm font-semibold text-primary">
          {list.filter((r) => r.done).length} / {list.length}
        </p>
      ) : null}
    </section>
  );
}

function GpaCalculator() {
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery(profileQuery);
  const [g, setG] = useState({
    grade_m1: profile?.grade_m1?.toString() ?? "",
    grade_m2: profile?.grade_m2?.toString() ?? "",
    grade_m3: profile?.grade_m3?.toString() ?? "",
  });
  const est = estimateGpa(g.grade_m1, g.grade_m2, g.grade_m3);

  async function save() {
    if (!profile) return;
    const num = (v: string) => (v === "" ? null : Math.min(4, Math.max(0, Number(v))));
    const { error } = await supabase
      .from("profiles")
      .update({ grade_m1: num(g.grade_m1), grade_m2: num(g.grade_m2), grade_m3: num(g.grade_m3) })
      .eq("id", profile.id);
    if (error) toast.error("تعذّر حفظ الدرجات.");
    else qc.invalidateQueries({ queryKey: profileQuery.queryKey });
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">حاسبة المعدل التقديري</h2>
      <p className="text-xs text-muted-foreground">بأوزان 30/30/40 المنشورة. تقدير استرشادي وليس نتيجة رسمية.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(
          [
            ["grade_m1", "M1"],
            ["grade_m2", "M2"],
            ["grade_m3", "M3"],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="text-sm">
            {l}
            <Input
              type="number"
              min={0}
              max={4}
              step={0.01}
              inputMode="decimal"
              value={g[k]}
              onChange={(e) => setG({ ...g, [k]: e.target.value })}
              onBlur={save}
              aria-label={`درجة ${l}`}
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-primary" role="status">
        {est
          ? `المعدل التقديري ${est.value.toFixed(2)} من 4.0 — ${est.pass ? "فوق" : "دون"} حدّ النجاح 3.0 — ${est.band}`
          : "أدخل درجاتك المتوقعة (0–4) لكل وحدة."}
      </p>
    </section>
  );
}
