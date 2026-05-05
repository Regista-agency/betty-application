import { NextResponse } from "next/server";
import { uploadPhoto, makeFolderSlug, folderUrl } from "@/lib/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const ville = formData.get("ville") || "Sans ville";
    const typeBien = formData.get("type_bien") || "Bien";
    const files = formData.getAll("files");

    const validFiles = files.filter((f) => f && typeof f === "object" && f.size > 0);
    if (validFiles.length === 0) {
      return NextResponse.json({ detail: "Aucun fichier valide reçu" }, { status: 400 });
    }

    const slug = makeFolderSlug(ville, typeBien);
    const photoUrls = [];
    for (const file of validFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await uploadPhoto(slug, file.name || "photo.jpg", buffer, file.type || "image/jpeg");
      photoUrls.push(url);
    }

    return NextResponse.json({
      folder_id: slug,
      folder_url: folderUrl(slug),
      photo_urls: photoUrls,
    });
  } catch (e) {
    console.error("Upload photos failed:", e);
    const msg = String(e?.message || e);
    if (msg.includes("does not have storage.objects.create") || msg.includes("403")) {
      return NextResponse.json(
        {
          detail: `Accès GCS refusé. Vérifie le bucket '${process.env.GCS_BUCKET}' et les permissions du service account.`,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ detail: `Upload échoué: ${msg}` }, { status: 500 });
  }
}
