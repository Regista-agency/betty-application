import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateAnnonce } from "@/lib/gemini";
import { appendRow } from "@/lib/sheets";
import { extractHashtags } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const payload = await request.json();
    const annonceText = await generateAnnonce(payload);
    const hashtags = extractHashtags(annonceText);
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    await appendRow({
      id,
      timestamp,
      type_bien: payload.type_bien || "",
      statut: payload.statut || "",
      ville: payload.ville || "",
      surface: payload.surface || "",
      pieces: payload.pieces || "",
      chambres: payload.chambres || "",
      prix: payload.prix || "",
      etage: payload.etage || "",
      points_forts: payload.points_forts || "",
      infos_complementaires: payload.infos_complementaires || "",
      ton: payload.ton || "",
      drive_folder_id: payload.drive_folder_id || "",
      drive_folder_url: payload.drive_folder_url || "",
      photo_urls: JSON.stringify(payload.photo_urls || []),
      annonce_text: annonceText,
      hashtags: hashtags.join(" "),
    });

    return NextResponse.json({
      id,
      annonce_text: annonceText,
      hashtags,
      char_count: annonceText.length,
      drive_folder_url: payload.drive_folder_url || "",
    });
  } catch (e) {
    console.error("Generate annonce failed:", e);
    return NextResponse.json({ detail: `Génération échouée: ${e?.message || e}` }, { status: 500 });
  }
}
