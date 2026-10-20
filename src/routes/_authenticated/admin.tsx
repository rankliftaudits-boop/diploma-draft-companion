import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, KeyRound, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accessQuery, settingsQuery } from "@/lib/queries";
import { CODE_STATUS_LABEL, codeStatus, describeTerm, downloadText, formatDate, toCsv, type CodeRow, type CodeStatus } from "@/lib/codes";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — رفيق الدبلوم" },
      { name: "description", content: "إدارة أكواد التفعيل والمشتركين والإعدادات." },
      { property: "og:title", content: "لوحة الإدارة — رفيق الدبلوم" },
      { property: "og:description", content: "إدارة أكواد التفعيل والمشتركين." },
    ],
  }),
  component: AdminPage,
});

const adminDataQuery = {
  queryKey: ["admin-data"],
  queryFn: async () => {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [codes, profiles, subs, usage] = await Promise.all([
      supabase.from("access_codes").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("profiles").select("id,email,full_name,track,specialty,created_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("subscriptions").select("*").limit(1000),
      supabase.from("ai_usage").select("user_id,created_at").gte("created_at", since).limit(10000),
    ]);
    return {
      codes: (codes.data ?? []) as CodeRow[],
      profiles: profiles.data ?? [],
      subs: subs.data ?? [],
      usage: usage.data ?? [],
    };
  },
};

function AdminPage() {
  const qc = useQueryClient();
  const { data: access } = useQuery(accessQuery);
  const { data: adminExists } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => (await supabase.rpc("admin_exists")).data ?? true,
  });

  if (!access) return <p className="p-8 text-center">يحمّل…</p>;
  if (!access.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border bg-card p-6 text-center">
          <Shield className="mx-auto size-8 text-primary" />
          {adminExists === false ? (
            <>
              <h1 className="mt-3 font-display text-2xl font-bold">إعداد حساب صاحب الخدمة</h1>
              <p className="mt-2 text-sm text-muted-foreground">لا يوجد مدير بعد. أول حساب يضغط هنا يصبح المدير الوحيد ولا يمكن لغيره ذلك لاحقاً.</p>
              <Button
                className="mt-4"
                onClick={async () => {
                  const { data } = await supabase.rpc("claim_first_admin");
                  if (data) {
                    toast.success("أصبحت مدير الخدمة.");
                    await qc.invalidateQueries();
                  } else toast.error("تعذّر — يوجد مدير بالفعل.");
                }}
              >
                اجعلني المدير
              </Button>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-xl font-bold">غير مصرّح</h1>
              <Link to="/app" className="mt-3 inline-block text-primary underline">العودة</Link>
            </>
          )}
        </div>
      </div>
    );
  }
  return <AdminDashboard />;
}

function AdminDashboard() {
  const qc = useQueryClient();
  const { data, refetch } = useQuery(adminDataQuery);
  const { data: settings } = useQuery(settingsQuery);
  const [tab, setTab] = useState<"codes" | "users" | "settings">("codes");
  const [filter, setFilter] = useState<CodeStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [gen, setGen] = useState({ count: 10, mode: "days" as "days" | "date", days: 120, until: "", redeemBefore: "", label: "", note: "" });
  const [lastBatch, setLastBatch] = useState<CodeRow[]>([]);
  const [s, setS] = useState<{ whatsapp: string; price_text: string; contact_note: string; daily_ai_limit: number } | null>(null);
  const now = new Date();

  const emailOf = useMemo(() => new Map((data?.profiles ?? []).map((p) => [p.id, p.email ?? p.full_name ?? p.id])), [data]);
  const codes = (data?.codes ?? []).filter(
    (c) => (filter === "all" || codeStatus(c, now) === filter) && (!search || c.code.includes(search.toUpperCase()) || (c.batch_label ?? "").includes(search)),
  );
  const counts = (data?.codes ?? []).reduce<Record<string, number>>((a, c) => ((a[codeStatus(c, now)] = (a[codeStatus(c, now)] ?? 0) + 1), a), {});
  const activeSubs = (data?.subs ?? []).filter((x) => new Date(x.access_until) > now && !x.suspended).length;
  const usage24 = (data?.usage ?? []).filter((u) => new Date(u.created_at).getTime() > now.getTime() - 86_400_000).length;

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (gen.mode === "date" && !gen.until) {
      toast.error("حدّد تاريخ انتهاء الاشتراك.");
      return;
    }
    const { data: rows, error } = await supabase.rpc("admin_generate_codes", {
      _count: gen.count,
      _duration_days: gen.mode === "days" ? gen.days : (null as unknown as number),
      _fixed_until: gen.mode === "date" ? new Date(gen.until + "T23:59:59").toISOString() : (null as unknown as string),
      _redeem_before: gen.redeemBefore ? new Date(gen.redeemBefore + "T23:59:59").toISOString() : (null as unknown as string),
      _label: gen.label,
      _note: gen.note,
    });
    if (error) {
      toast.error("تعذّر التوليد: " + error.message);
      return;
    }
    setLastBatch((rows ?? []) as CodeRow[]);
    toast.success(`تم توليد ${rows?.length ?? 0} كود`);
    refetch();
  }

  async function patchCode(id: string, patch: Partial<CodeRow>) {
    const { error } = await supabase.from("access_codes").update(patch).eq("id", id);
    if (error) toast.error("تعذّر التحديث");
    refetch();
  }

  async function setSub(userId: string, patch: { access_until?: string; suspended?: boolean }) {
    const existing = data?.subs.find((x) => x.user_id === userId);
    const { error } = existing
      ? await supabase.from("subscriptions").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", userId)
      : await supabase.from("subscriptions").insert({ user_id: userId, access_until: patch.access_until ?? new Date().toISOString(), suspended: patch.suspended ?? false });
    if (error) toast.error("تعذّر التحديث");
    else toast.success("تم التحديث");
    refetch();
  }

  const exportCodes = (rows: CodeRow[]) =>
    downloadText(
      toCsv([["الكود", "الدفعة", "المدة", "صالح للتفعيل حتى", "الحالة", "مُفعّل من", "تاريخ التفعيل"], ...rows.map((c) => [c.code, c.batch_label, describeTerm(c), formatDate(c.redeem_before), CODE_STATUS_LABEL[codeStatus(c, now)], c.redeemed_by ? emailOf.get(c.redeemed_by) : "", c.redeemed_at ? formatDate(c.redeemed_at) : ""])]),
      `rafeeq-codes-${Date.now()}.csv`,
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Brand to="/app" subtitle={false} />
          <Button asChild variant="outline" size="sm"><Link to="/app">مساحة الطالب</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <h1 className="font-display text-3xl font-bold text-ink">لوحة الإدارة</h1>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[["مستخدمون", data?.profiles.length ?? 0], ["اشتراكات فعّالة", activeSubs], ["أكواد جاهزة", counts.ready ?? 0], ["أكواد محروقة", counts.burned ?? 0], ["طلبات المساعد (24س)", usage24]].map(([k, v]) => (
            <div key={k} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-2xl font-bold text-ink">{v}</p></div>
          ))}
        </div>
        <div className="flex gap-2">
          {([["codes", "الأكواد"], ["users", "المشتركون"], ["settings", "الإعدادات"]] as const).map(([k, l]) => (
            <Button key={k} variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>{l}</Button>
          ))}
        </div>

        {tab === "codes" ? (
          <>
            <form onSubmit={generate} className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-4">
              <h2 className="flex items-center gap-2 font-semibold md:col-span-4"><KeyRound className="size-4 text-primary" /> توليد دفعة أكواد</h2>
              <label className="text-sm">العدد (1–500)<Input type="number" min={1} max={500} value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })} /></label>
              <label className="text-sm">نوع الصلاحية
                <select value={gen.mode} onChange={(e) => setGen({ ...gen, mode: e.target.value as "days" | "date" })} className="mt-1 h-10 w-full rounded-md border bg-background px-2">
                  <option value="days">عدد أيام من التفعيل</option>
                  <option value="date">حتى تاريخ محدد</option>
                </select>
              </label>
              {gen.mode === "days" ? (
                <label className="text-sm">الأيام<Input type="number" min={1} value={gen.days} onChange={(e) => setGen({ ...gen, days: Number(e.target.value) })} /></label>
              ) : (
                <label className="text-sm">ينتهي الاشتراك في<Input type="date" value={gen.until} onChange={(e) => setGen({ ...gen, until: e.target.value })} /></label>
              )}
              <label className="text-sm">آخر موعد لتفعيل الكود (اختياري)<Input type="date" value={gen.redeemBefore} onChange={(e) => setGen({ ...gen, redeemBefore: e.target.value })} /></label>
              <label className="text-sm md:col-span-2">اسم الدفعة<Input value={gen.label} onChange={(e) => setGen({ ...gen, label: e.target.value })} placeholder="مثال: دفعة الفصل الأول 2026" /></label>
              <label className="text-sm">ملاحظة<Input value={gen.note} onChange={(e) => setGen({ ...gen, note: e.target.value })} /></label>
              <Button type="submit" className="self-end">توليد</Button>
            </form>
            {lastBatch.length ? (
              <div className="rounded-2xl border-2 border-highlight bg-paper p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">الدفعة الجديدة ({lastBatch.length})</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(lastBatch.map((c) => c.code).join("\n")); toast.success("نُسخت الأكواد"); }}><Copy className="size-3.5" /> نسخ الكل</Button>
                    <Button size="sm" variant="outline" onClick={() => exportCodes(lastBatch)}><Download className="size-3.5" /> CSV</Button>
                  </div>
                </div>
                <p className="mt-2 font-mono text-sm leading-7" dir="ltr">{lastBatch.map((c) => c.code).join("  ·  ")}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالكود أو الدفعة" className="max-w-xs" />
              {(["all", "ready", "burned", "expired", "revoked"] as const).map((k) => (
                <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{k === "all" ? "الكل" : CODE_STATUS_LABEL[k]} {k !== "all" ? `(${counts[k] ?? 0})` : ""}</Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => exportCodes(codes)}><Download className="size-3.5" /> تصدير</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-start"><tr>{["الكود", "الدفعة", "المدة", "صالح للتفعيل حتى", "الحالة", "مُفعّل من", "إجراءات"].map((h) => <th key={h} className="p-2 text-start font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {codes.map((c) => {
                    const st = codeStatus(c, now);
                    return (
                      <tr key={c.id} className="border-t">
                        <td className="p-2 font-mono" dir="ltr">{c.code}</td>
                        <td className="p-2">{c.batch_label ?? "—"}</td>
                        <td className="p-2">{describeTerm(c)}</td>
                        <td className="p-2">{formatDate(c.redeem_before)}</td>
                        <td className="p-2"><span className={st === "ready" ? "text-success" : st === "burned" ? "text-primary" : "text-destructive"}>{CODE_STATUS_LABEL[st]}</span>{c.sold_at && st === "ready" ? <span className="ms-1 text-xs text-muted-foreground">· مُباع</span> : null}</td>
                        <td className="p-2 text-xs">{c.redeemed_by ? `${emailOf.get(c.redeemed_by) ?? ""} · ${formatDate(c.redeemed_at)}` : "—"}</td>
                        <td className="p-2">
                          {st === "ready" ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => patchCode(c.id, { sold_at: c.sold_at ? null : new Date().toISOString() })}>{c.sold_at ? "إلغاء البيع" : "تم البيع"}</Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm("إلغاء هذا الكود نهائياً؟") && patchCode(c.id, { revoked: true })}>إلغاء</Button>
                            </div>
                          ) : st === "revoked" && !c.redeemed_by ? (
                            <Button size="sm" variant="ghost" onClick={() => patchCode(c.id, { revoked: false })}>استرجاع</Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!codes.length ? <p className="p-6 text-center text-muted-foreground">لا أكواد.</p> : null}
            </div>
          </>
        ) : null}

        {tab === "users" ? (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>{["المستخدم", "المسار", "الاشتراك حتى", "طلبات 7 أيام", "إجراءات"].map((h) => <th key={h} className="p-2 text-start font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {(data?.profiles ?? []).map((p) => {
                  const sub = data?.subs.find((x) => x.user_id === p.id);
                  const active = sub && new Date(sub.access_until) > now && !sub.suspended;
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">{p.full_name}<span className="block text-xs text-muted-foreground" dir="ltr">{p.email}</span></td>
                      <td className="p-2 text-xs">{[p.track, p.specialty].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="p-2">{sub ? <span className={active ? "text-success" : "text-destructive"}>{formatDate(sub.access_until)}{sub.suspended ? " (موقوف)" : ""}</span> : "—"}</td>
                      <td className="p-2">{data?.usage.filter((u) => u.user_id === p.id).length}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <Input type="date" className="h-8 w-36" aria-label="تاريخ انتهاء الاشتراك" onChange={(e) => e.target.value && setSub(p.id, { access_until: new Date(e.target.value + "T23:59:59").toISOString() })} />
                          {sub ? <Button size="sm" variant="outline" onClick={() => setSub(p.id, { suspended: !sub.suspended })}>{sub.suspended ? "إلغاء الإيقاف" : "إيقاف"}</Button> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "settings" && settings ? (
          <form
            className="grid max-w-2xl gap-3 rounded-2xl border bg-card p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = s ?? { whatsapp: settings.whatsapp ?? "", price_text: settings.price_text ?? "", contact_note: settings.contact_note ?? "", daily_ai_limit: settings.daily_ai_limit };
              const { error } = await supabase.from("app_settings").update({ ...v, updated_at: new Date().toISOString() }).eq("id", 1);
              if (error) toast.error("تعذّر الحفظ");
              else { toast.success("حُفظت الإعدادات"); qc.invalidateQueries({ queryKey: settingsQuery.queryKey }); }
            }}
          >
            {(() => {
              const v = s ?? { whatsapp: settings.whatsapp ?? "", price_text: settings.price_text ?? "", contact_note: settings.contact_note ?? "", daily_ai_limit: settings.daily_ai_limit };
              return (
                <>
                  <label className="text-sm">رقم واتساب للبيع (مع رمز الدولة، مثال 9627XXXXXXXX)<Input dir="ltr" value={v.whatsapp} onChange={(e) => setS({ ...v, whatsapp: e.target.value })} /></label>
                  <label className="text-sm">نص السعر المعروض<Input value={v.price_text} onChange={(e) => setS({ ...v, price_text: e.target.value })} /></label>
                  <label className="text-sm">ملاحظة الشراء<Input value={v.contact_note} onChange={(e) => setS({ ...v, contact_note: e.target.value })} /></label>
                  <label className="text-sm">الحد اليومي لطلبات المساعد لكل طالب<Input type="number" min={1} value={v.daily_ai_limit} onChange={(e) => setS({ ...v, daily_ai_limit: Number(e.target.value) })} /></label>
                  <Button type="submit" className="justify-self-start">حفظ</Button>
                </>
              );
            })()}
          </form>
        ) : null}
      </main>
    </div>
  );
}
