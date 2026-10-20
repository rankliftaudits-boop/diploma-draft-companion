import { toast } from "sonner";

export function friendlyDbError(msg: string) {
  if (/row-level security|permission denied|violates/i.test(msg)) {
    return "تعذّر الحفظ: تأكد أن اشتراكك فعّال.";
  }
  return "تعذّر الحفظ. تحقق من الاتصال وحاول مجدداً.";
}

/** Unwraps a Supabase response, throwing a user-facing error. */
export async function run<D>(p: PromiseLike<{ data: D; error: { message: string } | null }>): Promise<D> {
  const r = await p;
  if (r.error) {
    console.error(r.error);
    throw new Error(friendlyDbError(r.error.message));
  }
  return r.data;
}

export function toastError(e: unknown) {
  toast.error(e instanceof Error ? e.message : "حدث خطأ غير متوقع.");
}
