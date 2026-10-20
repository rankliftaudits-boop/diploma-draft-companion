// Formative writing indicators (ported from v0.9). Self-review only — not a grade.

export const CLICHES = [
  "في الختام",
  "لا يخفى على أحد",
  "مما لا شك فيه",
  "في عصرنا الحالي",
  "تلعب دورا هاما",
  "تلعب دوراً هاماً",
  "من الجدير بالذكر",
  "بالغ الأهمية",
  "في ظل التطورات",
  "حجر الأساس",
  "يعتبر من أهم",
  "in conclusion",
  "needless to say",
];

export type Analysis = {
  words: number;
  quoteRatio: number;
  citations: number;
  cliches: string[];
  repeats: number;
  voice: number;
  analysis: number;
  evidence: number;
  actions: number;
};

export function analyzeText(x: string): Analysis {
  const trimmed = x.trim();
  const w = trimmed ? trimmed.split(/\s+/) : [];
  const T = w.map((s) => s.replace(/[^\p{L}\p{N}%]/gu, ""));
  const n = (r: RegExp) => T.filter((t) => r.test(t)).length;
  const qs = x.match(/["«“][^"»”]+["»”]/g) || [];
  const q = qs.join(" ").split(/\s+/).filter(Boolean).length;
  const ss = x
    .split(/[.!؟?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
  const lower = x.toLowerCase();
  return {
    words: w.length,
    quoteRatio: w.length ? Math.round((q / w.length) * 100) : 0,
    citations: (x.match(/\([^()]*\d{4}[^()]*\)/g) || []).length,
    cliches: CLICHES.filter((c) => lower.includes(c)),
    repeats: ss.filter((s, i) => ss.indexOf(s) !== i).length,
    voice:
      n(/^(و|ف)?(لاحظت|شعرت|جربت|قررت|أدركت|تعلمت|طبقت|واجهت|عدلت|طلابي|طالباتي|صفي|حصتي|أنا)$/u) +
      n(/^(i|my|we|our)$/i),
    analysis: n(/^(لأن|لأنني|بسبب|لذلك|ولذلك|يفسر|تفسر|because|therefore|since|suggests)$/i),
    evidence: n(/^\d+%?$/) + qs.length + n(/^(قبل|بعد|before|after)$/i),
    actions: n(/^(و|ف)?سأ(?!ل)\p{L}{2,}$/u) + n(/^(سوف|will|next)$/i),
  };
}

export type Indicator = { criterion: string; label: string; ok: boolean; value: string | number };

export function indicators(a: Analysis, minWords = 250): Indicator[] {
  return [
    { criterion: "المعرفة والفهم", label: "استشهاد موثّق (المؤلف، السنة)", ok: a.citations >= 1 && a.citations <= 8, value: a.citations },
    { criterion: "المهارات المعرفية", label: "تفسير وتحليل (لأن، بسبب…)", ok: a.analysis >= 2, value: a.analysis },
    { criterion: "المهارات المهنية", label: "أدلة من صفك: أرقام أو أقوال أو قبل/بعد", ok: a.evidence >= 3, value: a.evidence },
    { criterion: "المهارات المهنية", label: "خطوة تالية محددة (سأ…)", ok: a.actions >= 1, value: a.actions },
    { criterion: "العرض", label: `${minWords} كلمة فأكثر`, ok: a.words >= minWords, value: a.words },
    { criterion: "العرض", label: "اقتباس مباشر لا يتجاوز 15%", ok: a.quoteRatio <= 15, value: `${a.quoteRatio}%` },
    { criterion: "العرض", label: "بلا عبارات قالبية أو جمل مكررة", ok: !a.cliches.length && !a.repeats, value: a.cliches.length + a.repeats },
    { criterion: "العرض", label: "صوتك الشخصي (لاحظتُ، جرّبتُ…)", ok: a.voice >= 3, value: a.voice },
  ];
}

export function wordCount(x: string | null | undefined) {
  const t = (x ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}
