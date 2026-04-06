import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold">Page not found</h2>
      <p className="mt-2 text-sm text-gray-400">
        The requested page does not exist.
      </p>
      <Link href="/coach">
        <Button variant="outline" className="mt-4">
          Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
