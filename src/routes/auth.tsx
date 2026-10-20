import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "الدخول — رفيق الدبلوم" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابك في رفيق الدبلوم." },
      { property: "og:title", content: "الدخول — رفيق الدبلوم" },
      { property: "og:description", content: "سجّل الدخول أو أنشئ حسابك في رفيق الدبلوم." },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(r?: string) {
  if (!r) return "/app";
  try {
    const u = new URL(r, "http://x");
    if (r.startsWith("http") && typeof window !== "undefined" && u.origin !== window.location.origin) return "/app";
    const path = u.pathname + u.search;
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth") ? path : "/app";
  } catch {
    return "/app";
  }
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const target = safeRedirect(search.redirect);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(/invalid/i.test(error.message) ? "البريد أو كلمة المرور غير صحيحة." : /confirm/i.test(error.message) ? "أكّد بريدك أولاً من الرسالة التي وصلتك." : "تعذّر الدخول. حاول مجدداً.");
        navigate({ to: target, replace: true });
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("كلمة المرور 8 أحرف على الأقل.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/app", data: { full_name: name } },
        });
        if (error) throw new Error(/registered|exists/i.test(error.message) ? "هذا البريد مسجّل مسبقاً. سجّل الدخول." : "تعذّر إنشاء الحساب: " + error.message);
        if (data.session) navigate({ to: target, replace: true });
        else setSent("أرسلنا رابط تأكيد إلى بريدك. افتحه لتفعيل حسابك ثم سجّل الدخول.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw new Error("تعذّر الإرسال. تحقق من البريد.");
        setSent("إن كان البريد مسجّلاً فستصلك رسالة لتعيين كلمة مرور جديدة.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      sessionStorage.setItem("rafeeq:after-login", target);
    } catch {
      /* ignore */
    }
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error("تعذّر الدخول عبر Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: target, replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <AfterOAuth />
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-ink">
            {mode === "signin" ? "مرحباً بعودتك" : mode === "signup" ? "أنشئ حسابك" : "استعادة كلمة المرور"}
          </h1>
          {sent ? (
            <p className="mt-4 rounded-lg bg-accent p-3 text-sm text-accent-foreground">{sent}</p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === "signup" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name">الاسم</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              {mode !== "forgot" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
              ) : null}
              <Button type="submit" className="h-11 w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "signin" ? "دخول" : mode === "signup" ? "إنشاء الحساب" : "إرسال رابط الاستعادة"}
              </Button>
            </form>
          )}
          {mode !== "forgot" && !sent ? (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="h-11 w-full" onClick={google}>
                المتابعة باستخدام Google
              </Button>
            </>
          ) : null}
          <div className="mt-5 space-y-1 text-center text-sm">
            {mode === "signin" ? (
              <>
                <button className="text-primary hover:underline" onClick={() => { setMode("signup"); setSent(null); }}>
                  ليس لديك حساب؟ أنشئ حساباً
                </button>
                <br />
                <button className="text-muted-foreground hover:underline" onClick={() => { setMode("forgot"); setSent(null); }}>
                  نسيت كلمة المرور؟
                </button>
              </>
            ) : (
              <button className="text-primary hover:underline" onClick={() => { setMode("signin"); setSent(null); }}>
                لديك حساب؟ سجّل الدخول
              </button>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          بإنشاء حساب فأنت توافق على <Link to="/terms" className="underline">الشروط والاستخدام المسؤول</Link> و
          <Link to="/privacy" className="underline">سياسة الخصوصية</Link>.
        </p>
      </div>
    </div>
  );
}

/** After a full-page Google redirect lands back on /auth, continue once the session exists. */
function AfterOAuth() {
  const navigate = useNavigate();
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      let to = "/app";
      try {
        to = safeRedirect(sessionStorage.getItem("rafeeq:after-login") ?? undefined);
        sessionStorage.removeItem("rafeeq:after-login");
      } catch {
        /* ignore */
      }
      navigate({ to, replace: true });
    });
  }, [navigate]);
  return null;
}
