import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CRITERIA, LEVELS, REFLECTION_AXES, domainList, estimateGpa } from "@/lib/diploma";
import {
  accessQuery,
  assessmentsQuery,
  portfolioQuery,
  profileQuery,
  reflectionsQuery,
  tasksQuery,
  type AssistantMessage,
  type WritingDoc,
} from "@/lib/queries";
import { downloadText } from "@/lib/codes";
import { MODE_LABELS, type AssistMode } from "@/lib/ai/prompts";

const fullDocsQuery = {
  queryKey: ["export-docs"],
  queryFn: async () => {
    const [d, m] = await Promise.all([
      supabase.from("writing_docs").select("*").order("created_at"),
      supabase.from("assistant_messages").select("*").order("created_at"),
    ]);
    return { docs: (d.data ?? []) as WritingDoc[], messages: (m.data ?? []) as AssistantMessage[] };
  },
};

export const Route = createFileRoute("/_authenticated/app/export")({
  head: () => ({
    meta: [
      { title: "تصدير وطباعة — رفيق الدبلوم" },
      { name: "description", content: "صدّر سجل أعمالك كاملاً واطبعه أو احفظه PDF." },
      { property: "og:title", content: "تصدير وطباعة — رفيق الدبلوم" },
      { property: "og:description", content: "صدّر سجل أعمالك واطبعه." },
    ],
  }),
  loader: ({ context: { queryClient: q } }) =>
    Promise.all([
      q.ensureQueryData(profileQuery),
      q.ensureQueryData(tasksQuery),
      q.ensureQueryData(reflectionsQuery),
      q.ensureQueryData(portfolioQuery),
      q.ensureQueryData(assessmentsQuery),
      q.ensureQueryData(accessQuery),
    ]),
  component: ExportPage,
});

function ExportPage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: reflections } = useSuspenseQuery(reflectionsQuery);
  const { data: portfolio } = useSuspenseQuery(portfolioQuery);
  const { data: assessments } = useSuspenseQuery(assessmentsQuery);
  const { data: access } = useSuspenseQuery(accessQuery);
  const { data: docsData } = useQuery(fullDocsQuery);
  const [withLog, setWithLog] = useState(false);
  const gpa = estimateGpa(profile?.grade_m1, profile?.grade_m2, profile?.grade_m3);
  const criteria = [...CRITERIA.map((c) => c.name), ...domainList(profile?.domain_names).map((d) => d.name)];

  function downloadJson() {
    downloadText(
      JSON.stringify({ app: "rafeeq", version: 3, exportedAt: new Date().toISOString(), profile, tasks, reflections, portfolio, assessments, ...docsData }, null, 2),
      "rafeeq-backup.json",
      "application/json",
    );
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">تصدير وطباعة</h1>
          <p className="text-muted-foreground">سجل أعمالك كاملاً — للطباعة أو الحفظ PDF أو نسخة احتياطية.</p>
          {!access.active ? (
            <p className="mt-2 text-sm text-destructive">
              اشتراكك غير فعّال — بياناتك متاحة هنا للقراءة والتصدير. <Link to="/activate" className="underline">فعّل كوداً</Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={withLog} onCheckedChange={(v) => setWithLog(v === true)} /> تضمين سجل التفاعل مع رفيق
          </label>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة / PDF
          </Button>
          <Button variant="outline" onClick={downloadJson} disabled={!docsData}>
            <Download className="size-4" /> نسخة احتياطية JSON
          </Button>
        </div>
      </div>

      <article className="space-y-6 rounded-2xl border bg-paper p-6 print:border-0 print:p-0">
        <header>
          <h2 className="font-display text-3xl font-bold text-ink">سجل الأعمال — {profile?.full_name ?? ""}</h2>
          <p className="text-sm text-muted-foreground">
            {[profile?.track, profile?.specialty, profile?.sep].filter(Boolean).join(" — ")} · {new Date().toLocaleDateString("ar-JO")}
            {gpa ? ` · المعدل التقديري ${gpa.value.toFixed(2)} من 4.0 (استرشادي)` : ""}
          </p>
        </header>

        {docsData?.docs.length ? (
          <section>
            <h3 className="border-b-2 border-primary pb-1 text-xl font-bold">المهام والمقالات</h3>
            {docsData.docs.map((d) => (
              <div key={d.id} className="mt-4 break-inside-avoid-page">
                <h4 className="text-lg font-semibold">{d.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {d.doc_type} · {d.module}
                </p>
                <p className="mt-2 whitespace-pre-wrap leading-8">{d.content || "(لا مسودة)"}</p>
                {withLog ? (
                  <div className="mt-2 rounded border p-2 text-xs text-muted-foreground">
                    <b>سجل التفاعل:</b>
                    <ul className="list-disc ps-5">
                      {docsData.messages
                        .filter((m) => m.doc_id === d.id && m.role === "user")
                        .map((m) => (
                          <li key={m.id}>
                            {new Date(m.created_at).toLocaleString("ar-JO")} — {MODE_LABELS[m.mode as AssistMode] ?? m.mode}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        {reflections.length ? (
          <section>
            <h3 className="border-b-2 border-primary pb-1 text-xl font-bold">التأملات</h3>
            {reflections.map((r) => (
              <div key={r.id} className="mt-4 break-inside-avoid-page">
                <h4 className="text-lg font-semibold">{r.title}</h4>
                {REFLECTION_AXES.map((a) => (
                  <div key={a.key} className="mt-1">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="whitespace-pre-wrap text-sm">{(r[a.key] as string | null) || "—"}</p>
                  </div>
                ))}
              </div>
            ))}
          </section>
        ) : null}

        {portfolio.length ? (
          <section>
            <h3 className="border-b-2 border-primary pb-1 text-xl font-bold">ملف الإنجاز</h3>
            {portfolio.map((p) => (
              <div key={p.id} className="mt-3">
                <h4 className="font-semibold">{p.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {p.kind} · {p.standard}
                </p>
                <p className="whitespace-pre-wrap text-sm">{p.evidence}</p>
                {p.link ? <p className="text-xs" dir="ltr">{p.link}</p> : null}
              </div>
            ))}
          </section>
        ) : null}

        <section>
          <h3 className="border-b-2 border-primary pb-1 text-xl font-bold">التقييم الذاتي</h3>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-1.5 text-start">المعيار/المجال</th>
                <th className="border p-1.5 text-start">تقديري</th>
                <th className="border p-1.5 text-start">تقدير المقيّم</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c) => {
                const r = assessments.find((a) => a.criterion === c);
                return (
                  <tr key={c}>
                    <td className="border p-1.5">{c}</td>
                    <td className="border p-1.5">{r?.self_level ? LEVELS[r.self_level - 1] : "—"}</td>
                    <td className="border p-1.5">{r?.assessor_level ? LEVELS[r.assessor_level - 1] : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {tasks.length ? (
          <section>
            <h3 className="border-b-2 border-primary pb-1 text-xl font-bold">المهام القبلية والبعدية</h3>
            <ul className="mt-2 list-disc ps-5 text-sm">
              {tasks.map((t) => (
                <li key={t.id}>
                  {t.lecture ? `${t.lecture} — ` : ""}
                  {t.title} ({t.kind}) {t.done ? "✓" : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
