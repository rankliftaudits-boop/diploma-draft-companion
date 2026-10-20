import { CheckCircle2, Circle } from "lucide-react";
import { analyzeText, indicators } from "@/lib/writing-analysis";

export function IndicatorsCard({ text, minWords = 250 }: { text: string; minWords?: number }) {
  const a = analyzeText(text);
  const list = indicators(a, minWords);
  const passed = list.filter((x) => x.ok).length;
  return (
    <section className="rounded-xl border bg-card p-4" aria-live="polite">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink">مؤشرات تكوينية سريعة</h3>
        <span className="text-sm font-semibold text-primary">
          {passed} / {list.length}
        </span>
      </div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {list.map((x, i) => (
          <li key={i} className="flex items-start gap-2">
            {x.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span>
              <span className="text-muted-foreground">{x.criterion} — </span>
              {x.label} <span className="text-muted-foreground">({x.value})</span>
            </span>
          </li>
        ))}
      </ul>
      {a.cliches.length ? (
        <p className="mt-2 text-sm text-destructive">عبارات قالبية: {a.cliches.join("، ")}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        مؤشرات عددية للمراجعة الذاتية فقط، وليست درجة. للقراءة الحقيقية استخدم «قراءة ناقدة بالمعايير».
      </p>
    </section>
  );
}
