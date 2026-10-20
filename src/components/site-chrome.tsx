import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { sessionQuery } from "@/lib/queries";

export function SiteHeader() {
  const { data: user } = useQuery(sessionQuery);
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Brand />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="/#how" className="hover:text-foreground">كيف يعمل</a>
          <a href="/#features" className="hover:text-foreground">المزايا</a>
          <a href="/#pricing" className="hover:text-foreground">الاشتراك</a>
          <a href="/#faq" className="hover:text-foreground">أسئلة شائعة</a>
        </nav>
        {user ? (
          <Button asChild>
            <Link to="/app">مساحتي</Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/auth">دخول</Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                إنشاء حساب
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          «رفيق الدبلوم» أداة مستقلة وغير رسمية، ولا تتبع أكاديمية الملكة رانيا لتدريب المعلمين ولا تمثّلها.
        </p>
        <div className="flex gap-4">
          <Link to="/terms" className="hover:text-foreground">الشروط والاستخدام المسؤول</Link>
          <Link to="/privacy" className="hover:text-foreground">الخصوصية</Link>
        </div>
      </div>
    </footer>
  );
}
