"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Pogrešan email ili lozinka.";
  if (message.includes("Email not confirmed"))
    return "Email adresa nije potvrđena.";
  if (message.includes("Too many requests"))
    return "Previše pokušaja. Pokušaj ponovo za par minuta.";
  if (message.includes("User not found"))
    return "Korisnik nije pronađen.";
  if (message.includes("Network"))
    return "Greška s mrežom. Provjeri internetsku vezu.";
  return "Greška pri prijavi. Pokušaj ponovo.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(translateAuthError(authError.message));
      setLoading(false);
      return;
    }

    if (data.user?.id === process.env.NEXT_PUBLIC_COACH_UUID) {
      router.push("/coach");
    } else {
      router.push("/app");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <Card className="w-full max-w-sm border-gray-800 bg-gray-900">
        <CardHeader>
          <h1 className="text-center text-2xl font-bold text-white">
            KoachApp
          </h1>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@primjer.com"
                className="h-11 text-base border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-gray-300">
                Lozinka
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                className="h-11 text-base border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="h-11 w-full text-base">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Prijava...
                </>
              ) : (
                "Prijava"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
