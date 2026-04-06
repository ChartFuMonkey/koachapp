import Link from "next/link";
import { Dumbbell, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6 text-center">
      <Dumbbell className="mb-4 size-14 text-blue-500" />
      <h1 className="text-4xl font-bold tracking-tight text-white">
        KoachApp
      </h1>
      <p className="mt-3 max-w-sm text-lg text-gray-400">
        Tvoj osobni trener u džepu — praćenje prehrane, treninga i napretka.
      </p>

      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <Link href="/login">
          <Button className="h-12 w-full text-base font-semibold">
            Prijava kao klijent
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" className="h-12 w-full text-base font-semibold">
            <ShieldCheck className="mr-2 size-5" />
            Prijava kao trener
          </Button>
        </Link>
      </div>
    </div>
  );
}
