import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpenCheck,
  ClipboardList,
  Feather,
  FolderKanban,
  History,
  MessageCircle,
  MessageCircleQuestion,
  Route as RouteIcon,
  ScanSearch,
  ShieldCheck,
  Sparkle,
} from "lucide-react";
import heroImg from "@/assets/hero-desk.jpg";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "رفيق الدبلوم — مساعد كتابة حقيقي لطلبة الدبلوم المهني في التعليم" },
      {
        name: "description",
        content:
          "اكتب مهامك ومقالاتك التأملية بقوة وبصوتك: أسئلة تستخرج تجربتك، مسودات من ملاحظاتك، وقراءة ناقدة بمعايير التقدير الأربعة. لطلبة الدبلوم قبل الخدمة وأثناءها.",
      },
      { property: "og:title", content: "رفيق الدبلوم — مساعد كتابة لطلبة الدبلوم المهني" },
      {
        property: "og:description",
        content: "مساعد كتابة ذكي يصغي لتجربتك ويكتب معك بصوتك، ويقرأ عملك كما يقرؤه المقيّم.",
      },
    ],
  }),
  component: Landing,
});

const ROLES = [
  {
    icon: MessageCircleQuestion,
    t: "يُصغي قبل أن يكتب",
    d: "يقرأ تعليمات مهمتك ثم يسألك أسئلة دقيقة عن حصتك وطلبتك وما لاحظته، فيخرج من تجربتك مادة لا يملكها أي قالب.",
  },
  {
    icon: Feather,
    t: "يكتب معك بصوتك",
    d: "يحوّل ملاحظاتك الخام إلى خطة ومسودة قوية بأسلوبك أنت، ويقوّي فقراتك دون أن يخترع وقائع أو مراجع.",
  },
  {
    icon: ScanSearch,
    t: "يقرأ كما يقرأ المقيّم",
    d: "تقييم تكويني بالمعايير الأربعة، ادعاءات بلا دليل، تحدٍّ نقدي، ومطابقة كاملة مع تعليمات مهمتك قبل التسليم.",
  },
];

const FEATURES = [
  { icon: Sparkle, t: "مساحة الكتابة الذكية", d: "لكل مهمة: التعليمات، ملاحظاتك، المسودة، والمساعد جنباً إلى جنب مع حفظ تلقائي." },
  { icon: BookOpenCheck, t: "مختبر التأمل", d: "ستة محاور من الوصف إلى التغيير، وقراءة ناقدة لكل تأمل، وتحويله إلى مقال بنقرة." },
  { icon: ClipboardList, t: "التقييم الذاتي", d: "المعايير الأربعة والمجالات المهنية بأربعة مستويات، ومقارنة تقديرك بتقدير المقيّم." },
  { icon: FolderKanban, t: "ملف الإنجاز", d: "أدلتك موزعة على المعايير، لترى ما ينقص ملفك قبل أن يراه غيرك." },
  { icon: RouteIcon, t: "رحلتي والمعدل", d: "بنية الدبلوم بوحداته وأوزانه، ومتطلبات الخبرة المدرسية، وحاسبة معدل تقديري." },
  { icon: History, t: "سجل العمل", d: "كل مسودة وكل تفاعل مع المساعد محفوظ — دليل على أن عملك متدرج وأصيل." },
];

function Landing() {
  const { data: settings } = useQuery(settingsQuery);
  const wa = settings?.whatsapp?.replace(/[^\d]/g, "");
  const waLink = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent("مرحباً، أريد كود تفعيل لرفيق الدبلوم")}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-paper px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-highlight" />
              لطلبة الدبلوم المهني في التعليم — قبل الخدمة وأثناءها
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.35] text-ink md:text-6xl md:leading-[1.25]">
              مهامك ومقالاتك التأملية،
              <br />
              <span className="relative inline-block">
                أقوى وبصوتك أنت.
                <span className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded bg-highlight/50" />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              رفيق ليس منظِّم مهام ولا قالباً مكرراً. هو مساعد كتابة حقيقي يصغي لتجربتك في الصف، يكتب معك
              مسودة قوية من ملاحظاتك، ثم يقرأ عملك بعين مقيّم يعرف معايير الدبلوم الأربعة.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to="/auth" search={{ mode: "signup" }}>
                  ابدأ الآن
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <a href="#pricing">كيف أحصل على كود؟</a>
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              أداة مستقلة غير رسمية · بياناتك خاصة بحسابك ولا تُشارك مع أي جهة
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -rotate-2 rounded-3xl bg-accent" aria-hidden />
            <img
              src={heroImg}
              alt="دفتر معلم مفتوح بملاحظات مكتوبة بخط اليد وقلم حبر على مكتب دراسة"
              width={1536}
              height={1024}
              className="relative aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
            />
            <div className="absolute -bottom-6 start-4 max-w-[260px] rounded-xl border bg-paper p-3 text-sm shadow-lg">
              <p className="font-semibold text-ink">«ماذا قال الطلبة حين رأوا شرائح الكسور؟»</p>
              <p className="mt-1 text-xs text-muted-foreground">سؤال من رفيق قبل أن يكتب سطراً واحداً.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-y bg-paper py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-bold text-ink">ثلاثة أدوار، لا زر «اكتب عني»</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            المقيّم يبحث عن تجربتك أنت وتحليلك أنت. لذلك صُمّم رفيق ليستخرجها منك ويقوّيها، لا ليستبدلها بكلام عام.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {ROLES.map(({ icon: Icon, t, d }, i) => (
              <div key={t} className="rounded-2xl border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl font-bold text-highlight">{i + 1}</span>
                  <Icon className="size-6 text-primary" />
                </div>
                <h3 className="mt-3 text-lg font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-bold text-ink">كل ما تحتاجه رحلة الدبلوم، في مكان واحد</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-4 rounded-xl border bg-card p-5">
                <Icon className="mt-1 size-6 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">{t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
              <h3 className="font-display text-xl font-bold">قبل الخدمة</h3>
              <p className="mt-2 text-sm opacity-90">
                تجاربك من فترات الخبرة المدرسية SEP1–3 مع المعلم المرشد، وملاحظات الحصص، والبحث الاستقصائي في SEP3.
              </p>
            </div>
            <div className="rounded-2xl bg-secondary p-6">
              <h3 className="font-display text-xl font-bold text-ink">أثناء الخدمة</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                تنطلق من صفك الحالي ومشكلاته القائمة، بروح البحث الإجرائي، ومع زملائك وإدارتك.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y bg-paper py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold text-ink">الاشتراك بكود تفعيل</h2>
            <ol className="mt-5 space-y-3 text-sm">
              {[
                "أنشئ حسابك مجاناً.",
                "اطلب كود التفعيل من البائع المعتمد.",
                "أدخل الكود في حسابك — يُفعَّل اشتراكك فوراً حتى التاريخ المحدد.",
                "الكود يُستخدم مرة واحدة فقط: بعد تفعيله يُحرق ولا يعمل لأي شخص آخر.",
              ].map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">الاشتراك</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">{settings?.price_text || "اشتراك فصلي"}</p>
            <p className="mt-3 text-sm text-muted-foreground">{settings?.contact_note}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li>✓ مساعد الكتابة بكل أدواره</li>
              <li>✓ مختبر التأمل والتقييم الذاتي وملف الإنجاز</li>
              <li>✓ حفظ سحابي من أي جهاز + تصدير وطباعة</li>
              <li>✓ بياناتك تبقى لك للقراءة والتصدير حتى بعد انتهاء الاشتراك</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              {waLink ? (
                <Button asChild size="lg">
                  <a href={waLink} target="_blank" rel="noreferrer noopener">
                    <MessageCircle className="size-4" /> اطلب كودك عبر واتساب
                  </a>
                </Button>
              ) : null}
              <Button asChild size="lg" variant={waLink ? "outline" : "default"}>
                <Link to="/auth" search={{ mode: "signup" }}>
                  أنشئ حسابك
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-bold text-ink">أسئلة شائعة</h2>
          <div className="mt-6 space-y-3">
            {[
              [
                "هل استخدام رفيق نزيه أكاديمياً؟",
                "رفيق مبني على مبدأ «شريك تفكير لا كاتب بديل»: لا يكتب إلا من تجربتك وملاحظاتك، ولا يخترع وقائع أو مراجع، ويحتفظ بسجل لكل مسوداتك. أنت المسؤول عن عملك النهائي واتباع سياسة الأكاديمية في استخدام الذكاء الاصطناعي.",
              ],
              [
                "هل الأداة تابعة للأكاديمية؟",
                "لا. رفيق أداة مستقلة غير رسمية، مبنية على الوثائق المنشورة عن بنية الدبلوم. ارجع دائماً إلى دليل دفعتك وتعليمات مدرّسيك.",
              ],
              [
                "ماذا لو شاركت الكود مع زميل؟",
                "الكود يُحرق عند أول تفعيل ويرتبط بحساب واحد فقط، فلن يعمل لأي شخص آخر.",
              ],
              [
                "هل تُحفظ بياناتي إذا انتهى الاشتراك؟",
                "نعم، تبقى بياناتك في حسابك للقراءة والتصدير، وتستطيع التجديد بكود جديد في أي وقت.",
              ],
              ["هل يعمل على الهاتف؟", "نعم، الواجهة مصممة للهاتف والحاسوب، وتُحفظ كتابتك تلقائياً في السحابة."],
            ].map(([q, a]) => (
              <details key={q} className="group rounded-xl border bg-card p-4">
                <summary className="cursor-pointer list-none font-semibold">
                  <span className="me-2 text-primary group-open:hidden">+</span>
                  <span className="me-2 hidden text-primary group-open:inline">−</span>
                  {q}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
