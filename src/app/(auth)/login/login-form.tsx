"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";

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

function mapAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "El email no es válido.";
    case "auth/user-disabled":
      return "Esta cuenta fue deshabilitada.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Probá más tarde.";
    default:
      return "No se pudo iniciar sesión. Intentá de nuevo.";
  }
}

export function LoginForm() {
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
      await signInWithEmailAndPassword(auth, email.trim(), password);
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
      setError(mapAuthError(code));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Accedé al panel con tu email y contraseña.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                id="login-email"
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
              <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
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
                ? `/register?from=${encodeURIComponent(from)}`
                : "/register"
            }
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline sm:text-left"
          >
            Crear cuenta
          </Link>
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
