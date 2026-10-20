import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { RESPONSIBLE_USE } from "@/lib/responsible-use";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "الشروط والاستخدام المسؤول — رفيق الدبلوم" },
      { name: "description", content: "شروط استخدام رفيق الدبلوم ومبادئ الاستخدام المسؤول للذكاء الاصطناعي في المهام الأكاديمية." },
      { property: "og:title", content: "الشروط والاستخدام المسؤول — رفيق الدبلوم" },
      { property: "og:description", content: "كيف تستخدم مساعد الكتابة بنزاهة: شريك تفكير لا كاتب بديل." },
    ],
  }),
  component: Terms,
});


function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-ink">الشروط والاستخدام المسؤول</h1>
        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">مبادئ الاستخدام المسؤول</h2>
          <ul className="list-disc space-y-2 ps-6">
            {RESPONSIBLE_USE.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold">طبيعة الخدمة</h2>
          <p>«رفيق الدبلوم» أداة مستقلة وغير رسمية، لا تتبع أكاديمية الملكة رانيا لتدريب المعلمين ولا الجامعة الأردنية ولا تمثّلهما. المعلومات عن بنية الدبلوم مأخوذة من مصادر منشورة وقد تختلف عن دليل دفعتك؛ المرجع دائماً هو دليل الدفعة وتعليمات المدرّسين.</p>
          <p>التقديرات والمؤشرات التي يقدمها رفيق تكوينية واسترشادية، وليست درجات ولا تضمن نتيجة.</p>
        </section>
        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold">الاشتراك وأكواد التفعيل</h2>
          <p>يُفعَّل الاشتراك بكود يُستخدم مرة واحدة فقط ويرتبط بحساب واحد. بعد تفعيله يصبح الكود محروقاً ولا يمكن استخدامه مجدداً. مدة الاشتراك أو تاريخ انتهائه يظهران في حسابك بعد التفعيل.</p>
          <p>الحساب شخصي؛ مشاركته مع آخرين قد تؤدي إلى إيقافه. يحق لصاحب الخدمة إيقاف أي حساب يسيء الاستخدام.</p>
          <p>بعد انتهاء الاشتراك تبقى بياناتك متاحة لك للقراءة والتصدير.</p>
        </section>
        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold">حدود الاستخدام</h2>
          <p>لضمان جودة الخدمة للجميع، هناك حد يومي لعدد طلبات المساعد لكل حساب.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
