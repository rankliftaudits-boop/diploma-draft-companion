import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BookOpenCheck,
  ClipboardList,
  FolderKanban,
  KeyRound,
  ListChecks,
  LogOut,
  PenLine,
  Printer,
  Route as RouteIcon,
  Settings2,
  Shield,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { accessQuery, profileQuery } from "@/lib/queries";
import { daysLeft } from "@/lib/codes";
import { RESPONSIBLE_USE } from "@/lib/responsible-use";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async ({ context, location }) => {
    const access = await context.queryClient.ensureQueryData(accessQuery);
    if (!access.active && location.pathname !== "/app/export") {
      throw redirect({ to: "/activate" });
    }
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accessQuery),
      context.queryClient.ensureQueryData(profileQuery),
    ]);
  },
  component: AppLayout,
});

const NAV = [
  { to: "/app", label: "رحلتي", icon: RouteIcon, exact: true },
  { to: "/app/studio", label: "مساحة الكتابة", icon: PenLine },
  { to: "/app/reflect", label: "مختبر التأمل", icon: BookOpenCheck },
  { to: "/app/tasks", label: "المهام", icon: ListChecks },
  { to: "/app/assess", label: "التقييم الذاتي", icon: ClipboardList },
  { to: "/app/portfolio", label: "ملف الإنجاز", icon: FolderKanban },
  { to: "/app/profile", label: "ملفي وصوتي", icon: UserRound },
  { to: "/app/export", label: "تصدير وطباعة", icon: Printer },
] as const;

function AppLayout() {
  const { data: access } = useSuspenseQuery(accessQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const left = access.subscription ? daysLeft(access.subscription.access_until) : null;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string, exact?: boolean) => (exact ? pathname === to : pathname === to || pathname.startsWith(to + "/"));

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <Brand to="/app" subtitle={false} />
          <div className="flex items-center gap-2 text-sm">
            {access.isAdmin ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin">
                  <Shield className="size-4" /> الإدارة
                </Link>
              </Button>
            ) : left !== null ? (
              <Link
                to="/activate"
                className={cn(
                  "hidden items-center gap-1 rounded-full border px-3 py-1 text-xs sm:inline-flex",
                  left <= 7 ? "border-highlight bg-highlight/20 text-highlight-foreground" : "text-muted-foreground",
                )}
              >
                <KeyRound className="size-3.5" /> باقٍ {left} يوماً
              </Link>
            ) : null}
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="تسجيل الخروج">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 lg:hidden" aria-label="الأقسام">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm",
                isActive(n.to, "exact" in n) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="no-print sticky top-20 hidden h-fit w-56 shrink-0 lg:block">
          <nav className="space-y-1" aria-label="الأقسام">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(n.to, "exact" in n)
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 rounded-xl border bg-paper p-3 text-xs text-muted-foreground">
            <Settings2 className="mb-1 size-4 text-primary" />
            {profile?.track || "المسار غير محدد"} · {profile?.specialty || "التخصص غير محدد"}
            {profile?.sep ? ` · ${profile.sep}` : ""}
            <Link to="/app/profile" className="mt-1 block text-primary hover:underline">
              تعديل
            </Link>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      {!profile?.responsible_use_accepted_at && access.active ? <ResponsibleUseGate /> : null}
    </div>
  );
}

function ResponsibleUseGate() {
  const qc = useQueryClient();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ responsible_use_accepted_at: new Date().toISOString() })
      .eq("id", data.user!.id);
    setBusy(false);
    if (error) return toast.error("تعذّر الحفظ. حاول مجدداً.");
    qc.invalidateQueries({ queryKey: profileQuery.queryKey });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-labelledby="ru-title">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl">
        <h2 id="ru-title" className="font-display text-2xl font-bold text-ink">قبل أن تبدأ: استخدامي المسؤول</h2>
        <p className="mt-1 text-sm text-muted-foreground">رفيق قوي — ولهذا صُمّم ليجعل عملك أقوى وأصدق، لا ليحل محلك.</p>
        <ul className="mt-4 list-disc space-y-2 ps-5 text-sm">
          {RESPONSIBLE_USE.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <label className="mt-5 flex items-start gap-2 text-sm">
          <Checkbox checked={ok} onCheckedChange={(v) => setOk(v === true)} className="mt-1" />
          أفهم ذلك وألتزم به، وأعرف أن رفيق أداة مستقلة غير رسمية.
        </label>
        <Button className="mt-5 h-11 w-full" disabled={!ok || busy} onClick={accept}>
          ابدأ
        </Button>
      </div>
    </div>
  );
}
