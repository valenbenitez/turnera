"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

import { Button, buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/firebase/auth-client";
import { cn } from "@/lib/utils";

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight sm:text-base"
          >
            Panel
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex"
              )}
            >
              Inicio
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
