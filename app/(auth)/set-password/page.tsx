"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Lozinka mora imati najmanje 6 znakova.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Lozinke se ne podudaraju.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Greška pri postavljanju lozinke. Pokušaj ponovo.");
      setLoading(false);
      return;
    }

    // Sign out so the user logs in fresh with their new password
    await supabase.auth.signOut();
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <Card className="w-full max-w-sm border-gray-800 bg-gray-900">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <CheckCircle size={48} className="text-green-400" />
            <h2 className="text-xl font-bold text-white">Lozinka postavljena!</h2>
            <p className="text-center text-sm text-gray-400">
              Sada se možeš prijaviti sa svojom novom lozinkom.
            </p>
            <Button
              onClick={() => router.push("/login?role=client")}
              className="mt-2 h-11 w-full text-base"
            >
              Prijavi se
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <Card className="w-full max-w-sm border-gray-800 bg-gray-900">
        <CardHeader>
          <h1 className="text-center text-2xl font-bold text-white">
            Postavi lozinku
          </h1>
          <p className="text-center text-sm text-gray-400">
            Odaberi lozinku za svoj KoachApp račun.
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-gray-300">
                Nova lozinka
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Najmanje 6 znakova"
                className="h-11 text-base border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">
                Potvrdi lozinku
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Ponovi lozinku"
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
                  Spremam...
                </>
              ) : (
                "Postavi lozinku"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
