import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CRITERIA, PORTFOLIO_TYPES, domainList } from "@/lib/diploma";
import { portfolioQuery, profileQuery } from "@/lib/queries";
import { run, toastError } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/portfolio")({
  head: () => ({
    meta: [
      { title: "ملف الإنجاز — رفيق الدبلوم" },
      { name: "description", content: "أدلتك موزعة على المعايير والمجالات المهنية." },
      { property: "og:title", content: "ملف الإنجاز — رفيق الدبلوم" },
      { property: "og:description", content: "أدلتك موزعة على المعايير." },
    ],
  }),
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(portfolioQuery), q.ensureQueryData(profileQuery)]),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { data: items } = useSuspenseQuery(portfolioQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const qc = useQueryClient();
  const standards = [...CRITERIA.map((c) => c.name), ...domainList(profile?.domain_names).map((d) => d.name)];
  const [form, setForm] = useState({ title: "", kind: PORTFOLIO_TYPES[0] as string, standard: standards[0], evidence: "", link: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: portfolioQuery.queryKey });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await run(supabase.from("portfolio_items").insert({ ...form, title: form.title.trim(), link: form.link.trim() || null }));
      setForm({ ...form, title: "", evidence: "", link: "" });
      refresh();
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">ملف الإنجاز</h1>
        <p className="text-muted-foreground">لكل دليل: لماذا يُثبت تحقق المعيار؟ بكلماتك.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {standards.map((s) => {
          const n = items.filter((i) => i.standard === s).length;
          return (
            <div key={s} className={cn("rounded-xl border p-3 text-sm", n ? "bg-accent" : "border-dashed bg-card")}>
              <p className="font-semibold leading-snug">{s}</p>
              <p className="text-xs text-muted-foreground">{n ? `${n} دليل` : "لا أدلة بعد"}</p>
            </div>
          );
        })}
      </div>
      <form onSubmit={add} className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-3">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الدليل (مثال: خطة درس الكسور)" required aria-label="عنوان الدليل" />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="h-10 rounded-md border bg-background px-2" aria-label="نوع الدليل">
          {PORTFOLIO_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={form.standard} onChange={(e) => setForm({ ...form, standard: e.target.value })} className="h-10 rounded-md border bg-background px-2" aria-label="المعيار">
          {standards.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Textarea value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} placeholder="لماذا يُثبت هذا الدليل تحقق المعيار؟" className="md:col-span-2" aria-label="لماذا يثبت الدليل المعيار" />
        <div className="flex flex-col gap-2">
          <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="رابط الملف https://… (اختياري)" dir="ltr" aria-label="رابط الملف" />
          <Button type="submit">إضافة للملف</Button>
        </div>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((i) => (
          <article key={i.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{i.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {i.kind} · {i.standard}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="حذف"
                onClick={async () => {
                  await run(supabase.from("portfolio_items").delete().eq("id", i.id)).catch(toastError);
                  refresh();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {i.evidence ? <p className="mt-2 whitespace-pre-wrap text-sm">{i.evidence}</p> : null}
            {i.link && /^https?:\/\//i.test(i.link) ? (
              <a href={i.link} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ExternalLink className="size-3.5" /> فتح الملف
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
