import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FilePlus2, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DOC_TYPES, MODULES } from "@/lib/diploma";
import { docsQuery } from "@/lib/queries";
import { run, toastError } from "@/lib/db";
import { wordCount } from "@/lib/writing-analysis";
import { formatDate } from "@/lib/codes";

export const Route = createFileRoute("/_authenticated/app/studio/")({
  head: () => ({
    meta: [
      { title: "مساحة الكتابة — رفيق الدبلوم" },
      { name: "description", content: "مهامك ومقالاتك مع مساعد الكتابة الذكي." },
      { property: "og:title", content: "مساحة الكتابة — رفيق الدبلوم" },
      { property: "og:description", content: "مهامك ومقالاتك مع مساعد الكتابة الذكي." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(docsQuery),
  component: StudioList,
});

function StudioList() {
  const { data: docs } = useSuspenseQuery(docsQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>(DOC_TYPES[0]);
  const [module, setModule] = useState<string>(MODULES[2]);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const doc = await run(
        supabase
          .from("writing_docs")
          .insert({ title: title.trim() || docType, doc_type: docType, module })
          .select("id")
          .single(),
      );
      await qc.invalidateQueries({ queryKey: docsQuery.queryKey });
      navigate({ to: "/app/studio/$docId", params: { docId: doc.id } });
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">مساحة الكتابة</h1>
        <p className="text-muted-foreground">كل مهمة في مساحة خاصة: التعليمات، ملاحظاتك، المسودة، والمساعد.</p>
      </div>
      <form onSubmit={create} className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <label className="text-sm">
          عنوان المهمة
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مقال تأملي عن التقويم التكويني في SEP2" />
        </label>
        <label className="text-sm">
          النوع
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-2">
            {DOC_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          الوحدة
          <select value={module} onChange={(e) => setModule(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-2">
            {MODULES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <Button type="submit" className="h-10" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />} مهمة جديدة
        </Button>
      </form>

      {docs.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map((d) => {
            const wc = wordCount(d.content);
            return (
              <Link
                key={d.id}
                to="/app/studio/$docId"
                params={{ docId: d.id }}
                className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary"
              >
                <FileText className="size-5 text-primary" />
                <h3 className="mt-2 font-semibold group-hover:text-primary">{d.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {d.doc_type} · {d.module ?? "—"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {wc} كلمة{d.word_target ? ` من ${d.word_target}` : ""} · آخر تعديل {formatDate(d.updated_at)}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          لا مهام بعد. أنشئ أول مهمة وابدأ بلصق تعليماتها.
        </p>
      )}
    </div>
  );
}
