"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/firebase/auth-client";
import { cn } from "@/lib/utils";

type Preview = {
  commerceId: string;
  commerceName: string;
  role: "provider" | "reception";
  staffName?: string;
};

type Props = { token: string };

export function JoinInviteClient({ token }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const autoRedeemStarted = useRef(false);

  const joinPath = `/join/${token}`;
  const loginHref = `/login?from=${encodeURIComponent(joinPath)}`;
  const registerHref = `/register?from=${encodeURIComponent(joinPath)}`;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/invites/${encodeURIComponent(token)}`);
        const data = (await res.json()) as Preview & { error?: string };
        if (!res.ok) {
          if (!cancelled) {
            setPreviewError(data.error || "Enlace inválido o vencido.");
          }
          return;
        }
        if (!cancelled) {
          setPreview({
            commerceId: data.commerceId,
            commerceName: data.commerceName,
            role: data.role,
            staffName: data.staffName,
          });
        }
      } catch {
        if (!cancelled) setPreviewError("Error de red.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const roleDescription = useCallback((p: Preview) => {
    if (p.role === "reception") {
      return "Te invitan como recepción: vas a poder ver la agenda de todo el equipo y gestionar turnos.";
    }
    return `Te invitan como prestador (${p.staffName ?? "tu perfil"}): vas a ver solo tu agenda en este comercio.`;
  }, []);

  const redeem = useCallback(async () => {
    if (!user) return;
    setRedeemError(null);
    setRedeeming(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}/redeem`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = (await res.json()) as {
        error?: string;
        commerceId?: string;
        role?: string;
        code?: string;
      };

      const goAgenda = (cid: string) => {
        router.replace(`/dashboard/${cid}/agenda`);
        router.refresh();
      };

      if (!res.ok) {
        if (
          data.commerceId &&
          (data.code === "ALREADY_MEMBER" || data.code === "INVITE_USED")
        ) {
          goAgenda(data.commerceId);
          return;
        }
        setRedeemError(data.error || "No se pudo unir.");
        return;
      }
      if (data.commerceId) {
        goAgenda(data.commerceId);
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch {
      setRedeemError("Error de red.");
    } finally {
      setRedeeming(false);
    }
  }, [user, token, router]);

  /**
   * Tras registrarse o iniciar sesión desde el enlace, canje automático: si el usuario
   * no pulsa "Unirme", igual queda vinculado (commerce_members + userId en staff).
   */
  useEffect(() => {
    if (!authReady || !user || !preview || autoRedeemStarted.current) return;
    autoRedeemStarted.current = true;
    void redeem();
  }, [authReady, user, preview, redeem]);

  if (!authReady) {
    return (
      <p className="text-center text-sm text-muted-foreground">Cargando…</p>
    );
  }

  if (previewError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enlace no disponible</CardTitle>
          <CardDescription>{previewError}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/" className={cn(buttonVariants({ variant: "link" }), "px-0")}>
            Volver al inicio
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (!preview) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Comprobando invitación…
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unirte al comercio</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{preview.commerceName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>{roleDescription(preview)}</p>
        {!user ? (
          <p>Para continuar, creá una cuenta o iniciá sesión con el mismo email.</p>
        ) : (
          <>
            <p>
              Sesión: <span className="font-mono text-xs">{user.email}</span>
            </p>
            {redeeming ? (
              <p className="text-foreground">
                Vinculando tu cuenta con {preview.commerceName}…
              </p>
            ) : null}
          </>
        )}
        {redeemError ? (
          <p className="text-destructive text-sm" role="alert">
            {redeemError}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {!user ? (
          <>
            <Link
              href={registerHref}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "inline-flex w-full justify-center sm:w-auto"
              )}
            >
              Crear cuenta
            </Link>
            <Link
              href={loginHref}
              className={cn(
                buttonVariants(),
                "inline-flex w-full justify-center sm:w-auto"
              )}
            >
              Ya tengo cuenta
            </Link>
          </>
        ) : (
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={redeeming}
            onClick={() => void redeem()}
          >
            {redeeming ? "Uniendo…" : "Reintentar"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
