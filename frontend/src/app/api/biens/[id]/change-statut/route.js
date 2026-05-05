import { NextResponse } from "next/server";
import { generateAnnonce } from "@/lib/gemini";
import { getBien, updateBienFields } from "@/lib/sheets";
import { extractHashtags } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { nouveau_statut } = await request.json();

    const bien = await getBien(id);
    if (!bien) {
      return NextResponse.json({ detail: "Bien introuvable" }, { status: 404 });
    }

    const fields = {
      type_bien: bien.type_bien || "",
      statut: nouveau_statut,
      ville: bien.ville || "",
      surface: bien.surface || "",
      pieces: bien.pieces || "",
      chambres: bien.chambres || "",
      prix: bien.prix || "",
      etage: bien.etage || "",
      points_forts: bien.points_forts || "",
      infos_complementaires: bien.infos_complementaires || "",
      ton: bien.ton || "",
    };

    const annonceText = await generateAnnonce(fields);
    const hashtags = extractHashtags(annonceText);
    const timestamp = new Date().toISOString();

    await updateBienFields(parseInt(bien._sheet_row, 10), {
      statut: nouveau_statut,
      annonce_text: annonceText,
      hashtags: hashtags.join(" "),
      timestamp,
    });

    return NextResponse.json({
      id,
      annonce_text: annonceText,
      hashtags,
      char_count: annonceText.length,
      drive_folder_url: bien.drive_folder_url || "",
    });
  } catch (e) {
    console.error("Change statut failed:", e);
    return NextResponse.json({ detail: `Changement échoué: ${e?.message || e}` }, { status: 500 });
  }
}
