import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { tasksQuery } from "@/lib/queries";
import { run, toastError } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  head: () => ({
    meta: [
      { title: "المهام — رفيق الدبلوم" },
      { name: "description", content: "مهامك القبلية والبعدية لكل محاضرة ومواعيدها." },
      { property: "og:title", content: "المهام — رفيق الدبلوم" },
      { property: "og:description", content: "مهامك القبلية والبعدية لكل محاضرة." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery),
  component: TasksPage,
});

function TasksPage() {
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const qc = useQueryClient();
  const [lecture, setLecture] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"قبلية" | "بعدية">("قبلية");
  const [due, setDue] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: tasksQuery.queryKey });
  const done = tasks.filter((t) => t.done).length;
  const groups = [...new Set(tasks.map((t) => t.lecture || "بدون محاضرة"))];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await run(supabase.from("tasks").insert({ lecture: lecture.trim() || null, title: title.trim(), kind, due_date: due || null }));
      setTitle("");
      refresh();
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">المهام</h1>
        <p className="text-muted-foreground">القبلية تهيّئك للنقاش بسؤال حقيقي من صفك؛ البعدية تُثبت التطبيق بدليل من حصتك.</p>
      </div>
      <form onSubmit={add} className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-2">
        <Input value={lecture} onChange={(e) => setLecture(e.target.value)} placeholder="المحاضرة / الوحدة (مثال: التعلم النشط)" aria-label="المحاضرة" />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المهمة" aria-label="عنوان المهمة" required />
        <div className="flex gap-2" role="group" aria-label="نوع المهمة">
          {(["قبلية", "بعدية"] as const).map((k) => (
            <Button key={k} type="button" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)} aria-pressed={kind === k}>
              مهمة {k}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="الموعد" />
          <Button type="submit">إضافة</Button>
        </div>
      </form>
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm">
          الإنجاز {done} / {tasks.length}
        </p>
        <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} />
      </div>
      {groups.map((g) => (
        <section key={g} className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">{g}</h2>
          <ul className="space-y-2">
            {tasks
              .filter((t) => (t.lecture || "بدون محاضرة") === g)
              .map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={t.done}
                    aria-label={`إنجاز ${t.title}`}
                    onCheckedChange={async (v) => {
                      await run(supabase.from("tasks").update({ done: v === true }).eq("id", t.id)).catch(toastError);
                      refresh();
                    }}
                  />
                  <span className="rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">{t.kind}</span>
                  <span className={cn("flex-1", t.done && "text-muted-foreground line-through")}>{t.title}</span>
                  {t.due_date ? <span className="text-xs text-muted-foreground">{t.due_date}</span> : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="حذف"
                    onClick={async () => {
                      await run(supabase.from("tasks").delete().eq("id", t.id)).catch(toastError);
                      refresh();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
          </ul>
        </section>
      ))}
      {!tasks.length ? <p className="text-center text-muted-foreground">لا مهام بعد. أضف أول مهمة لمحاضرتك القادمة.</p> : null}
    </div>
  );
}
