import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — رفيق الدبلوم" },
      { name: "description", content: "كيف يحفظ رفيق الدبلوم بياناتك ويحميها، وما الذي لا يشاركه أبداً." },
      { property: "og:title", content: "سياسة الخصوصية — رفيق الدبلوم" },
      { property: "og:description", content: "بياناتك خاصة بحسابك ولا تُشارك مع الأكاديمية أو أي جهة." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-ink">سياسة الخصوصية</h1>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">ما الذي نحفظه</h2>
          <p>بريدك واسمك، وبيانات مسارك التي تختارها، وما تكتبه في الأداة (المهام، التأملات، المسودات، التقييم الذاتي، ملف الإنجاز) وسجل تفاعلك مع المساعد. تُحفظ في قاعدة بيانات محمية، ولا يصل إليها إلا حسابك.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">المساعد الذكي</h2>
          <p>عند طلبك مساعدة، يُرسل النص اللازم لذلك الطلب فقط إلى نموذج ذكاء اصطناعي لمعالجته ثم يُعاد إليك الرد. لا نبيع بياناتك ولا نستخدمها للإعلانات.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">ما لا نفعله أبداً</h2>
          <p>لا نشارك بياناتك مع الأكاديمية أو مدرّسيك أو أي جهة. صاحب الخدمة يرى في لوحة الإدارة بريدك وحالة اشتراكك وعدد طلباتك فقط، لا نصوصك.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">مسؤوليتك</h2>
          <p>لا تُدخل أسماء طلبة أو بيانات تعريفية عنهم أو عن أسرهم أو مدارسهم. استخدم «الطالب (أ)» ونحوه.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">حذف بياناتك</h2>
          <p>تستطيع حذف أي عنصر من حسابك في أي وقت، وطلب حذف حسابك كاملاً من صاحب الخدمة.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
