import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

const SHEET_HEADERS = [
  "id", "timestamp", "type_bien", "statut", "ville", "surface",
  "pieces", "chambres", "prix", "etage", "points_forts",
  "infos_complementaires", "ton", "drive_folder_id", "drive_folder_url",
  "photo_urls", "annonce_text", "hashtags",
];

let _client = null;
let _headersEnsured = false;

function getAuth() {
  return new GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheets() {
  if (_client) return _client;
  const auth = getAuth();
  _client = google.sheets({ version: "v4", auth });
  return _client;
}

async function ensureHeaders() {
  if (_headersEnsured) return;
  const sheets = await getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: "A1:R1" });
  const current = r.data.values?.[0];
  const same = current && SHEET_HEADERS.every((h, i) => current[i] === h);
  if (!same) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: { values: [SHEET_HEADERS] },
    });
  }
  _headersEnsured = true;
}

export async function appendRow(row) {
  await ensureHeaders();
  const sheets = await getSheets();
  const values = [SHEET_HEADERS.map((h) => String(row[h] ?? ""))];
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

export async function listBiens() {
  await ensureHeaders();
  const sheets = await getSheets();
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "A2:R10000",
  });
  const rows = r.data.values || [];
  return rows.map((row, idx) => {
    const padded = [...row];
    while (padded.length < SHEET_HEADERS.length) padded.push("");
    const obj = Object.fromEntries(SHEET_HEADERS.map((h, i) => [h, padded[i]]));
    obj._sheet_row = idx + 2;
    return obj;
  });
}

export async function getBien(bienId) {
  const all = await listBiens();
  return all.find((b) => b.id === bienId) || null;
}

function colLetter(n) {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function updateBienFields(sheetRow, updates) {
  await ensureHeaders();
  const sheets = await getSheets();
  for (const [key, value] of Object.entries(updates)) {
    const idx = SHEET_HEADERS.indexOf(key);
    if (idx < 0) continue;
    const col = colLetter(idx + 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${col}${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [[String(value)]] },
    });
  }
}

export async function sheetsHealth() {
  try {
    await ensureHeaders();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
