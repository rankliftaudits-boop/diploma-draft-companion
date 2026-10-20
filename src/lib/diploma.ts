// Domain knowledge about the Professional Diploma in Teaching (QRTA).
// Kept browser-safe: imported by pages and by the AI prompt builder.

export const TRACKS = ["قبل الخدمة", "أثناء الخدمة"] as const;
export const GENERAL_SPECIALTY = "المسار العام (المباحث الأخرى)";
export const SPECIALTIES = [
  "اللغة العربية",
  "اللغة الإنجليزية",
  "العلوم",
  "الرياضيات",
  "معلم الصف",
  GENERAL_SPECIALTY,
] as const;
export const SEPS = ["SEP1", "SEP2", "SEP3"] as const;
export const SEP_LABELS: Record<string, string> = {
  SEP1: "الخبرة المدرسية الأولى (SEP1)",
  SEP2: "الخبرة المدرسية الثانية (SEP2)",
  SEP3: "الخبرة المدرسية الثالثة (SEP3)",
};
export const GENDERS = ["مؤنث", "مذكر"] as const;
export const LEVELS = ["غير ملبٍ", "نامٍ", "كفؤ", "متميز"] as const;
export const PORTFOLIO_TYPES = ["ملاحظة حصة", "مقال تأملي", "خطة درس", "عينة عمل طالب", "أخرى"] as const;

export const MODULES = [
  "M1 — بيداغوجيا التعلم والتعليم",
  "M2 — بيداغوجيا المبحث",
  "M3 — الخبرة المدرسية وملف الإنجاز",
  "غير محدد",
] as const;

export const DOC_TYPES = [
  "مقال تأملي",
  "مهمة كتابية (M1)",
  "بحث استقصائي (M2)",
  "خطة درس مع مبرراتها",
  "تحليل ملاحظة حصة",
  "مهمة قبلية / بعدية",
  "أخرى",
] as const;

export const SPECIALTY_HINTS: Record<string, string> = {
  "اللغة العربية": "ركّز على موقف قرائي أو كتابي أو شفهي، واستشهد بنص من إنتاج الطالب.",
  "اللغة الإنجليزية": "ركّز على الاستماع أو التحدث أو القراءة أو الكتابة، واستشهد بإنتاج لغوي فعلي.",
  العلوم: "ركّز على استقصاء أو تجربة وتصوّر بديل ظهر لدى الطلبة، مع مراعاة السلامة.",
  الرياضيات: "ركّز على مسألة وطرائق حلها، وما كشفته التمثيلات والأخطاء عن الفهم.",
  "معلم الصف": "ركّز على نمو الأطفال والفروق الفردية والتكامل بين المباحث.",
  [GENERAL_SPECIALTY]: "ركّز على مهمة تطبيقية في مبحثك وكيف شارك الطلبة فيها.",
};

export const REFLECTION_AXES = [
  { key: "what", label: "ماذا حدث؟ — الوصف", hint: "صف موقفاً محدداً: السياق وما فعلتَه وما فعله الطلبة." },
  { key: "so", label: "لماذا حدث؟ — التحليل", hint: "فسّر الموقف واربطه بمعرفة تخصصية أو تربوية موثّقة." },
  { key: "impact", label: "ما الأثر على تعلم الطلبة؟", hint: "قارن دليلاً قبل التدريس وبعده، واحفظ خصوصية الطلبة." },
  { key: "now_step", label: "ماذا سأفعل لاحقاً؟", hint: "إجراء قابل للتنفيذ ودليل ستجمعه للحكم على أثره." },
  { key: "feedback", label: "ملاحظة تلقّيتُها", hint: "ملاحظة محددة تلقيتها ومن قالها: مرشد/ة أو زميل/ة أو مقيّم/ة." },
  { key: "changed", label: "ماذا غيّرتُ بعدها؟", hint: "ما الذي عدّلته في تخطيطك أو تدريسك بسبب الملاحظة، وما أثره؟" },
] as const;
export type ReflectionKey = (typeof REFLECTION_AXES)[number]["key"];

export const CRITERIA = [
  { name: "المعرفة والفهم", q: "هل ربطتَ الموقف بمصدر أو نظرية موثّقة؟" },
  { name: "المهارات المعرفية", q: "هل حلّلتَ وقيّمتَ ولم تكتفِ بالوصف؟" },
  { name: "المهارات المهنية", q: "هل استندتَ إلى دليل من صفك وخطوة تطبيقية؟" },
  { name: "العرض", q: "هل التنظيم واللغة والتوثيق سليمة؟" },
] as const;

export const DEFAULT_DOMAINS = [
  { name: "المعرفة المهنية", q: "ما المعرفة التي فسّرتَ بها تعلم الطلبة؟" },
  { name: "الممارسة المهنية", q: "ما الدليل على جودة التخطيط والتدريس والتقويم؟" },
  { name: "القيم والاتجاهات والممارسة التأملية", q: "كيف احترمتَ العدالة والخصوصية واستفدتَ من التغذية الراجعة؟" },
] as const;

export function domainList(names?: string[] | null) {
  return DEFAULT_DOMAINS.map((d, i) => ({ name: names?.[i]?.trim() || d.name, q: d.q }));
}

export const JOURNEY = [
  { t: "التهيئة", d: "يوم تعريفي بالرحلة وبنيتها ومحاورها." },
  { t: "M1 — بيداغوجيا التعلم والتعليم (30%، 7 ساعات)", d: "مهمة كتابية في نهاية الفترة التدريسية الأولى." },
  {
    t: "M2 — بيداغوجيا المبحث (30%، 7 ساعات)",
    d: "بحث استقصائي في قضية من طلبتك يُنفَّذ خلال الخبرة المدرسية الثالثة، مع جلسة تغذية راجعة.",
  },
  {
    t: "M3 — الخبرة المدرسية SEP (40%، 10 ساعات)",
    d: "ثلاث فترات خبرة مدرسية خلال 18 أسبوعاً، وملف إنجاز يضم ملاحظات حصص ومقالات تأملية.",
  },
  { t: "الحكم والتخرج", d: "مجلس الممتحنين يعتمد النتائج؛ حدّ النجاح 3.0 من 4.0." },
] as const;

export function estimateGpa(m1: unknown, m2: unknown, m3: unknown) {
  const vals = [m1, m2, m3].map((v) => (v === "" || v == null ? NaN : Number(v)));
  if (vals.some((v) => Number.isNaN(v) || v < 0 || v > 4)) return null;
  const v = 0.3 * vals[0] + 0.3 * vals[1] + 0.4 * vals[2];
  const band = v >= 4 ? "Distinction" : v >= 3.75 ? "Merit" : v >= 3.5 ? "Good Pass" : v >= 3 ? "Pass" : "Fail";
  return { value: v, pass: v >= 3, band };
}
