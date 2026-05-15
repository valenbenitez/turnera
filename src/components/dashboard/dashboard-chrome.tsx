"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChevronRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/firebase/auth-client";
import { cn } from "@/lib/utils";

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const onCommerceDashboard =
    /^\/dashboard\/[^/]+/.test(pathname) && pathname !== "/dashboard";

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <div className="flex min-w-0 items-center gap-1 text-sm">
              <Link
                href="/"
                className="shrink-0 font-semibold tracking-tight text-foreground hover:underline"
              >
                Turnera
              </Link>
              <ChevronRight
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <Link
                href="/dashboard"
                className={cn(
                  "min-w-0 truncate font-medium tracking-tight hover:underline",
                  pathname === "/dashboard"
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Mis locales
              </Link>
            </div>
            {onCommerceDashboard ? (
              <>
                <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                  ·
                </span>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Panel del comercio
                </p>
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex"
              )}
            >
              Sitio público
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
              Salir
            </Button>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
