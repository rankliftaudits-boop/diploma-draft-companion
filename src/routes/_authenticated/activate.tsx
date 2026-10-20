import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, LogOut, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accessQuery, settingsQuery } from "@/lib/queries";
import { REDEEM_ERRORS, daysLeft, formatDate } from "@/lib/codes";

export const Route = createFileRoute("/_authenticated/activate")({
  head: () => ({
    meta: [
      { title: "تفعيل الاشتراك — رفيق الدبلوم" },
      { name: "description", content: "أدخل كود التفعيل لبدء اشتراكك في رفيق الدبلوم." },
      { property: "og:title", content: "تفعيل الاشتراك — رفيق الدبلوم" },
      { property: "og:description", content: "أدخل كود التفعيل لبدء اشتراكك." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accessQuery),
  component: Activate,
});

function Activate() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: access } = useSuspenseQuery(accessQuery);
  const { data: settings } = useQuery(settingsQuery);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const sub = access.subscription;
  const wa = settings?.whatsapp?.replace(/[^\d]/g, "");

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("redeem_access_code", { _code: code });
    setBusy(false);
    const res = data as { ok: boolean; error?: string; access_until?: string } | null;
    if (error || !res) return toast.error("تعذّر التحقق من الكود. حاول مجدداً.");
    if (!res.ok) return toast.error(REDEEM_ERRORS[res.error ?? ""] ?? "تعذّر تفعيل الكود.");
    toast.success(`تم التفعيل! اشتراكك فعّال حتى ${formatDate(res.access_until)}`);
    setCode("");
    await qc.invalidateQueries({ queryKey: accessQuery.queryKey });
    navigate({ to: "/app" });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Brand />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> خروج
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <KeyRound className="size-8 text-primary" />
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">
            {access.active ? "تجديد أو تمديد الاشتراك" : "فعّل اشتراكك"}
          </h1>
          {access.active && sub ? (
            <p className="mt-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
              اشتراكك فعّال حتى {formatDate(sub.access_until)} (باقٍ {daysLeft(sub.access_until)} يوماً). الكود الجديد يمدّد اشتراكك.
            </p>
          ) : sub?.suspended ? (
            <p className="mt-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">حسابك موقوف. تواصل مع صاحب الخدمة.</p>
          ) : sub ? (
            <p className="mt-2 text-sm text-muted-foreground">
              انتهى اشتراكك في {formatDate(sub.access_until)}. بياناتك محفوظة؛ فعّل كوداً جديداً للمتابعة.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">أدخل كود التفعيل الذي وصلك. الكود يُستخدم مرة واحدة فقط ويرتبط بحسابك.</p>
          )}
          <form onSubmit={redeem} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="RFQ-XXXX-XXXX-XXXX"
              dir="ltr"
              className="h-12 flex-1 text-center font-mono text-lg tracking-widest"
              aria-label="كود التفعيل"
              autoComplete="off"
            />
            <Button type="submit" className="h-12 px-6" disabled={busy || !code.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} تفعيل
            </Button>
          </form>
          <div className="mt-6 border-t pt-4 text-sm text-muted-foreground">
            <p>ليس لديك كود؟ {settings?.contact_note}</p>
            {settings?.price_text ? <p className="mt-1 font-semibold text-foreground">{settings.price_text}</p> : null}
            {wa ? (
              <Button asChild variant="outline" className="mt-3">
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent("مرحباً، أريد كود تفعيل لرفيق الدبلوم")}`} target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="size-4" /> اطلب كوداً عبر واتساب
                </a>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-4 text-sm">
          {access.active ? (
            <Link to="/app" className="text-primary hover:underline">العودة إلى مساحتي</Link>
          ) : (
            <Link to="/app/export" className="text-muted-foreground hover:underline">تصدير بياناتي السابقة</Link>
          )}
          {access.isAdmin ? <Link to="/admin" className="text-primary hover:underline">لوحة الإدارة</Link> : null}
        </div>
      </main>
    </div>
  );
}
