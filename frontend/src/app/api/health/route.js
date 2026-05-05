import { NextResponse } from "next/server";
import { sheetsHealth } from "@/lib/sheets";
import { gcsHealth } from "@/lib/gcs";

export const dynamic = "force-dynamic";

export async function GET() {
  const [sheets, gcs] = await Promise.all([sheetsHealth(), gcsHealth()]);
  const ok = sheets.ok && gcs.ok;
  return NextResponse.json({
    status: ok ? "ok" : "degraded",
    google_sheets: sheets.ok ? "connected" : sheets.error,
    gcs,
  });
}
