import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { todayCET } from "@/lib/date";
import { generateReportForClient } from "@/lib/reports/generate";

export const dynamic = "force-dynamic";
// Vercel Hobby caps function duration at 60s; Pro allows more. One client = one
// quick AI call, so 60s is plenty now. If the client count grows large, batch
// the loop or move generation to a queue (see plan "out of scope / scale").
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayCET();
  const { data: clients, error } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("is_active", true);
  if (error) {
    console.error("cron: failed to list clients", error);
    return NextResponse.json({ error: "listFailed" }, { status: 500 });
  }

  let generated = 0;
  const failures: string[] = [];
  for (const c of clients ?? []) {
    try {
      await generateReportForClient(c.id as string, today);
      generated++;
    } catch (err) {
      console.error("cron: report failed for", c.id, err);
      failures.push(c.id as string);
    }
  }

  return NextResponse.json({ generated, failures });
}
