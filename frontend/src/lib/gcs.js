import { Storage } from "@google-cloud/storage";
import crypto from "crypto";

let _storage = null;

function getStorage() {
  if (_storage) return _storage;
  _storage = new Storage({
    keyFilename: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
  });
  return _storage;
}

function safeSlug(value, fallback = "x") {
  const cleaned = String(value || "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

export function makeFolderSlug(ville, typeBien) {
  const ts = new Date()
    .toISOString()
    .replace(/[:T-]/g, "")
    .replace(/\..+/, "")
    .replace(/^(\d{8})(\d{6})$/, "$1-$2");
  return `${safeSlug(ville, "ville")}-${safeSlug(typeBien, "type")}-${ts}`;
}

export function folderUrl(slug) {
  const bucket = process.env.GCS_BUCKET;
  return `https://console.cloud.google.com/storage/browser/${bucket}/biens/${slug}`;
}

export async function uploadPhoto(slug, filename, buffer, contentType) {
  const bucketName = process.env.GCS_BUCKET;
  const storage = getStorage();
  const bucket = storage.bucket(bucketName);

  let ext = (filename.split(".").pop() || "jpg").toLowerCase();
  if (!["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(ext)) ext = "jpg";
  const objectName = `biens/${slug}/${crypto.randomBytes(16).toString("hex")}.${ext}`;

  const file = bucket.file(objectName);
  await file.save(buffer, {
    contentType: contentType || "image/jpeg",
    resumable: false,
  });
  return `https://storage.googleapis.com/${bucketName}/${objectName}`;
}

export async function gcsHealth() {
  try {
    const bucketName = process.env.GCS_BUCKET;
    const storage = getStorage();
    const [meta] = await storage.bucket(bucketName).getMetadata();
    return { ok: true, bucket: meta.name };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
