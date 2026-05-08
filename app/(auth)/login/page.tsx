"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type AuthErrorCode =
  | "invalidCredentials"
  | "emailConfirmationRequired"
  | "tooManyRequests"
  | "userNotFound"
  | "networkError"
  | "genericError";

function classifyAuthError(message: string): AuthErrorCode {
  if (message.includes("Invalid login credentials")) return "invalidCredentials";
  if (message.includes("Email not confirmed")) return "emailConfirmationRequired";
  if (message.includes("Too many requests")) return "tooManyRequests";
  if (message.includes("User not found")) return "userNotFound";
  if (message.includes("Network")) return "networkError";
  return "genericError";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const t = useTranslations("auth.login");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorCode, setErrorCode] = useState<AuthErrorCode | "">("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorCode("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setErrorCode(classifyAuthError(authError.message));
      setLoading(false);
      return;
    }

    // If user chose "login as client", always go to client dashboard
    if (role === "client") {
      router.push("/app");
    } else if (data.user?.id === process.env.NEXT_PUBLIC_COACH_UUID) {
      router.push("/coach");
    } else {
      router.push("/app");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-sm border-border bg-surface">
        <CardHeader>
          <h1 className="text-center text-2xl font-bold text-ink">
            {t("title")}
          </h1>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-ink-2">
                {tCommon("email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t("emailPlaceholder")}
                className="h-11 text-base border-border bg-surface-2 text-ink placeholder:text-ink-3"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-ink-2">
                {tCommon("password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t("passwordPlaceholder")}
                className="h-11 text-base border-border bg-surface-2 text-ink placeholder:text-ink-3"
              />
            </div>
            {errorCode && (
              <p className="text-sm text-danger">{t(errorCode)}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="h-11 w-full text-base">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("loading")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
