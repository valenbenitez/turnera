"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase/auth-client";
import { safeAuthRedirectPath } from "@/lib/safe-auth-redirect";

function mapRegisterError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Ese email ya está registrado. Iniciá sesión.";
    case "auth/invalid-email":
      return "El email no es válido.";
    case "auth/weak-password":
      return "La contraseña es muy débil (mínimo 6 caracteres).";
    default:
      return "No se pudo crear la cuenta. Intentá de nuevo.";
  }
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = safeAuthRedirectPath(searchParams.get("from"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.replace(from);
      router.refresh();
    } catch (err: unknown) {
      const code =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof (err as { code: unknown }).code === "string"
          ? (err as { code: string }).code
          : "";
      setError(mapRegisterError(code));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          Registrate para acceder al panel. Si venís de un enlace de invitación,
          después vas a unirte al comercio automáticamente.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="register-email">Email</FieldLabel>
              <Input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="register-password">Contraseña</FieldLabel>
              <Input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                required
                minLength={6}
              />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t-0 sm:flex-row sm:justify-between">
          <Link
            href={
              from !== "/dashboard"
                ? `/login?from=${encodeURIComponent(from)}`
                : "/login"
            }
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline sm:text-left"
          >
            Ya tengo cuenta
          </Link>
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Creando…" : "Registrarme"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
