import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GENDERS, SEPS, SEP_LABELS, SPECIALTIES, TRACKS } from "@/lib/diploma";
import { accessQuery, profileQuery } from "@/lib/queries";
import { daysLeft, formatDate } from "@/lib/codes";
import { wordCount } from "@/lib/writing-analysis";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({
    meta: [
      { title: "ملفي وصوتي — رفيق الدبلوم" },
      { name: "description", content: "مسارك وتخصصك وسياق صفك وعيّنة من كتابتك ليكتب رفيق بصوتك." },
      { property: "og:title", content: "ملفي وصوتي — رفيق الدبلوم" },
      { property: "og:description", content: "عرّف رفيق بك ليكتب بصوتك." },
    ],
  }),
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(profileQuery), q.ensureQueryData(accessQuery)]),
  component: ProfilePage,
});

function Select({ label, value, options, onChange, labels }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <label className="text-sm">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-2">
        <option value="">اختر…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: access } = useSuspenseQuery(accessQuery);
  const qc = useQueryClient();
  const [p, setP] = useState({
    full_name: profile?.full_name ?? "",
    track: profile?.track ?? "",
    specialty: profile?.specialty ?? "",
    sep: profile?.sep ?? "",
    gender: profile?.gender ?? "مؤنث",
    school_context: profile?.school_context ?? "",
    voice_sample: profile?.voice_sample ?? "",
  });
  const [busy, setBusy] = useState(false);
  const sub = access.subscription;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ...p, track: p.track || null, specialty: p.specialty || null, sep: p.sep || null })
      .eq("id", profile!.id);
    setBusy(false);
    if (error) { toast.error("تعذّر الحفظ."); return; }
    toast.success("حُفظ ملفك. سيكتب رفيق الآن بصوتك وسياقك.");
    qc.invalidateQueries({ queryKey: profileQuery.queryKey });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">ملفي وصوتي</h1>
        <p className="text-muted-foreground">كل ما تكتبه هنا يجعل رفيق أقرب إليك: يفهم صفك، ويكتب بأسلوبك لا بأسلوب عام.</p>
      </div>
      <form onSubmit={save} className="space-y-5">
        <section className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            الاسم
            <Input value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} className="mt-1" />
          </label>
          <Select label="المسار" value={p.track} options={TRACKS} onChange={(v) => setP({ ...p, track: v })} />
          <Select label="التخصص" value={p.specialty} options={SPECIALTIES} onChange={(v) => setP({ ...p, specialty: v })} />
          <Select label="الخبرة المدرسية الحالية" value={p.sep} options={SEPS} labels={SEP_LABELS} onChange={(v) => setP({ ...p, sep: v })} />
          <label className="text-sm">
            صيغة المخاطبة
            <select value={p.gender} onChange={(e) => setP({ ...p, gender: e.target.value })} className="mt-1 h-10 w-full rounded-md border bg-background px-2">
              {GENDERS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">سياق مدرستي وصفي</h2>
          <p className="text-xs text-muted-foreground">الصف، نوع المدرسة، عدد الطلبة، تحديات معتادة… بدون أسماء أو بيانات تعريفية.</p>
          <Textarea
            value={p.school_context}
            onChange={(e) => setP({ ...p, school_context: e.target.value })}
            rows={4}
            className="mt-2"
            placeholder="مثال: أدرّس الرياضيات للصف السابع في مدرسة حكومية للإناث، 38 طالبة، تفاوت كبير في المستويات…"
          />
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">عيّنة من كتابتي ({wordCount(p.voice_sample)} كلمة)</h2>
          <p className="text-xs text-muted-foreground">
            الصق فقرة أو فقرتين كتبتهما أنت سابقاً (تأمل، مقال، حتى رسالة). يتعلم منها رفيق إيقاعك ومفرداتك — ليكتب بصوتك لا بصوت آلة. 150–400 كلمة تكفي.
          </p>
          <Textarea value={p.voice_sample} onChange={(e) => setP({ ...p, voice_sample: e.target.value })} rows={8} className="mt-2" dir="auto" />
        </section>
        <Button type="submit" className="h-11 px-8" disabled={busy}>
          حفظ
        </Button>
      </form>
      <section className="rounded-2xl border bg-paper p-5">
        <h2 className="font-semibold">اشتراكي</h2>
        {access.isAdmin ? (
          <p className="text-sm text-muted-foreground">حساب صاحب الخدمة — وصول كامل.</p>
        ) : sub ? (
          <p className="text-sm">
            فعّال حتى <b>{formatDate(sub.access_until)}</b> — باقٍ {daysLeft(sub.access_until)} يوماً.
          </p>
        ) : null}
        <Button asChild variant="outline" className="mt-3">
          <Link to="/activate">تمديد بكود جديد</Link>
        </Button>
      </section>
    </div>
  );
}
