// Activation-code helpers shared by the admin panel and activation page.

export type CodeRow = {
  id: string;
  code: string;
  batch_label: string | null;
  duration_days: number | null;
  fixed_until: string | null;
  redeem_before: string | null;
  revoked: boolean;
  sold_at: string | null;
  note: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  created_at: string;
};

export type CodeStatus = "ready" | "burned" | "expired" | "revoked";

export const CODE_STATUS_LABEL: Record<CodeStatus, string> = {
  ready: "جاهز",
  burned: "محروق (مستخدَم)",
  expired: "منتهي",
  revoked: "ملغى",
};

/** A used code is burned forever, regardless of any other field. */
export function codeStatus(
  c: Pick<CodeRow, "redeemed_by" | "revoked" | "redeem_before" | "fixed_until">,
  now: Date = new Date(),
): CodeStatus {
  if (c.redeemed_by) return "burned";
  if (c.revoked) return "revoked";
  if (c.redeem_before && new Date(c.redeem_before) < now) return "expired";
  if (c.fixed_until && new Date(c.fixed_until) <= now) return "expired";
  return "ready";
}

export function normalizeCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function describeTerm(c: Pick<CodeRow, "duration_days" | "fixed_until">) {
  if (c.fixed_until) return `حتى ${formatDate(c.fixed_until)}`;
  if (c.duration_days) return `${c.duration_days} يوماً من التفعيل`;
  return "—";
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-JO", { year: "numeric", month: "long", day: "numeric" });
}

export function daysLeft(iso: string | null | undefined, now: Date = new Date()) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000));
}

export const REDEEM_ERRORS: Record<string, string> = {
  INVALID_CODE: "الكود غير صحيح. تأكد من كتابته كما وصلك.",
  ALREADY_USED: "هذا الكود استُخدم من قبل وأصبح محروقاً، ولا يمكن استخدامه مرة أخرى.",
  REVOKED: "هذا الكود ملغى. تواصل مع البائع.",
  EXPIRED: "انتهت صلاحية هذا الكود قبل تفعيله.",
  TOO_MANY_ATTEMPTS: "محاولات كثيرة خاطئة. انتظر ساعة ثم حاول مجدداً.",
  NOT_AUTHENTICATED: "سجّل الدخول أولاً.",
};

export function toCsv(rows: (string | number | null | undefined)[][]) {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^\s*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return "\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadText(content: string, filename: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
