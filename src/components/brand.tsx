import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg bg-primary font-display text-xl font-bold text-primary-foreground shadow-sm",
        className,
      )}
    >
      ر
    </span>
  );
}

export function Brand({ to = "/", subtitle = true }: { to?: string; subtitle?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <BrandMark />
      <span className="leading-tight">
        <span className="block font-display text-xl font-bold text-ink">رفيق الدبلوم</span>
        {subtitle ? <span className="block text-[11px] text-muted-foreground">مساعد كتابة لطلبة الدبلوم المهني</span> : null}
      </span>
    </Link>
  );
}
