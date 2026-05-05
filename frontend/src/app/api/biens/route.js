import { NextResponse } from "next/server";
import { listBiens } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const biens = await listBiens();
    const items = biens
      .filter((b) => b.id)
      .map((b) => ({
        id: b.id,
        label: `${b.ville || ""} - ${b.type_bien || ""} - ${b.prix || ""}€`,
        ville: b.ville || "",
        type_bien: b.type_bien || "",
        statut: b.statut || "",
        prix: b.prix || "",
      }))
      .reverse();
    return NextResponse.json(items);
  } catch (e) {
    console.error("List biens failed:", e);
    return NextResponse.json({ detail: `Lecture Sheet échouée: ${e?.message || e}` }, { status: 500 });
  }
}
