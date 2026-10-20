import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة — رفيق الدبلوم" },
      { name: "description", content: "عيّن كلمة مرور جديدة لحسابك في رفيق الدبلوم." },
      { property: "og:title", content: "تعيين كلمة مرور جديدة — رفيق الدبلوم" },
      { property: "og:description", content: "عيّن كلمة مرور جديدة لحسابك في رفيق الدبلوم." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("كلمة المرور 8 أحرف على الأقل.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error("انتهت صلاحية الرابط. اطلب رابطاً جديداً.");
    toast.success("تم تعيين كلمة المرور.");
    navigate({ to: "/app", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
          <h1 className="font-display text-2xl font-bold text-ink">كلمة مرور جديدة</h1>
          <div className="space-y-1.5">
            <Label htmlFor="np">كلمة المرور الجديدة</Label>
            <Input id="np" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            حفظ
          </Button>
        </form>
      </div>
    </div>
  );
}
