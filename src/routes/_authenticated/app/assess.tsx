import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CRITERIA, LEVELS, domainList } from "@/lib/diploma";
import { assessmentsQuery, profileQuery } from "@/lib/queries";
import { toastError } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/app/assess")({
  head: () => ({
    meta: [
      { title: "التقييم الذاتي — رفيق الدبلوم" },
      { name: "description", content: "قيّم نفسك على معايير التقدير الأربعة والمجالات المهنية." },
      { property: "og:title", content: "التقييم الذاتي — رفيق الدبلوم" },
      { property: "og:description", content: "قيّم نفسك على معايير التقدير الأربعة." },
    ],
  }),
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(assessmentsQuery), q.ensureQueryData(profileQuery)]),
  component: AssessPage,
});

function AssessPage() {
  const { data: rows } = useSuspenseQuery(assessmentsQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const domains = domainList(profile?.domain_names);
  const [names, setNames] = useState(domains.map((d) => d.name));
  const get = (c: string) => rows.find((r) => r.criterion === c);

  async function setLevel(criterion: string, patch: { self_level?: number | null; assessor_level?: number | null }) {
    const cur = get(criterion);
    const { error } = await supabase
      .from("self_assessments")
      .upsert(
        { criterion, self_level: cur?.self_level ?? null, assessor_level: cur?.assessor_level ?? null, ...patch, user_id: profile!.id },
        { onConflict: "user_id,criterion" },
      );
    if (error) return toastError(new Error("تعذّر الحفظ: تأكد أن اشتراكك فعّال."));
    qc.invalidateQueries({ queryKey: assessmentsQuery.queryKey });
  }

  const sections = [
    { title: "معايير تقدير الأعمال الكتابية", items: CRITERIA.map((c) => ({ name: c.name, q: c.q })) },
    { title: "المجالات المهنية (عدّل أسماءها بحسب دليل دفعتك)", items: domains, editable: true },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">التقييم الذاتي</h1>
        <p className="text-muted-foreground">تقييم تكويني غير معتمد. ارجع إلى روبرك المهمة الصادر عن الأكاديمية. سجّل تقدير المقيّم حين يصدر لتتعلم من الفرق.</p>
      </div>
      {sections.map((s) => {
        const low = s.items.filter((i) => (get(i.name)?.self_level ?? 0) > 0 && (get(i.name)?.self_level ?? 0) <= 2).map((i) => i.name);
        return (
          <section key={s.title} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold text-ink">{s.title}</h2>
              {s.editable ? (
                <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
                  تعديل أسماء المجالات
                </Button>
              ) : null}
            </div>
            {s.editable && editing ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {names.map((n, i) => (
                  <Input key={i} value={n} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`اسم المجال ${i + 1}`} />
                ))}
                <Button
                  className="sm:col-span-3"
                  onClick={async () => {
                    const { error } = await supabase.from("profiles").update({ domain_names: names }).eq("id", profile!.id);
                    if (error) return toast.error("تعذّر الحفظ");
                    setEditing(false);
                    qc.invalidateQueries({ queryKey: profileQuery.queryKey });
                  }}
                >
                  حفظ الأسماء
                </Button>
              </div>
            ) : null}
            <div className="mt-4 space-y-5">
              {s.items.map((item) => {
                const row = get(item.name);
                const self = row?.self_level ?? 0;
                const asr = row?.assessor_level ?? 0;
                return (
                  <div key={item.name}>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.q}</p>
                    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={item.name}>
                      {LEVELS.map((l, i) => (
                        <Button key={l} size="sm" variant={self === i + 1 ? "default" : "outline"} aria-pressed={self === i + 1} onClick={() => setLevel(item.name, { self_level: i + 1 })}>
                          {l}
                        </Button>
                      ))}
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      تقدير المقيّم (بعد صدوره):
                      <select
                        value={asr || ""}
                        onChange={(e) => setLevel(item.name, { assessor_level: e.target.value ? Number(e.target.value) : null })}
                        className="h-8 rounded-md border bg-background px-2"
                        aria-label={`تقدير المقيّم — ${item.name}`}
                      >
                        <option value="">—</option>
                        {LEVELS.map((l, i) => (
                          <option key={l} value={i + 1}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    {self && asr ? (
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {asr === self
                          ? "تقديرك مطابق لتقدير المقيّم."
                          : asr > self
                            ? "المقيّم قدّرك أعلى: ابحث في عملك عن نقاط قوة لم تلحظها، وابنِ عليها."
                            : "المقيّم قدّرك أقل: راجع الدليل الذي يدعم تقديرك، واسأل رفيق «قراءة ناقدة» عن هذا المعيار."}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {low.length ? <p className="mt-4 rounded-lg bg-highlight/15 p-3 text-sm">أولويات التحسين: {low.join("، ")}</p> : null}
          </section>
        );
      })}
    </div>
  );
}
