import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold">Stranica nije pronađena</h2>
      <p className="mt-2 text-sm text-gray-400">
        Tražena stranica ne postoji.
      </p>
      <Link href="/app">
        <Button variant="outline" className="mt-4">
          Natrag na početnu
        </Button>
      </Link>
    </div>
  );
}
