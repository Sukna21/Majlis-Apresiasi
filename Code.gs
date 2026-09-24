/**
 * Google Apps Script untuk Portal RSVP Majlis Apresiasi SUKNA-21.
 * Pasang sebagai BOUND SCRIPT pada Google Sheet yang disediakan.
 *
 * Deploy:
 * 1. Extensions > Apps Script
 * 2. Paste code ini
 * 3. Deploy > New deployment > Web app
 * 4. Execute as: Me
 * 5. Who has access: Anyone
 * 6. Copy Web app URL ke config.js
 */

const RSVP_SHEET = "RSVP";
const MASTER_SHEET = "Masterlist";

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "dashboard";

    if (action === "dashboard") {
      return jsonResponse(getDashboardData());
    }

    return jsonResponse({ ok: false, error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const data = parseBody(e);
    const action = data.action || "submit";

    if (action === "submit") {
      return jsonResponse(saveRSVP(data));
    }

    return jsonResponse({ ok: false, error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const raw = e.postData.contents;

  try {
    return JSON.parse(raw);
  } catch (_) {
    const out = {};
    raw.split("&").forEach(pair => {
      const [k, v = ""] = pair.split("=");
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
    });
    return out;
  }
}

function saveRSVP(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(RSVP_SHEET);
  if (!sh) throw new Error("Sheet RSVP tidak dijumpai.");

  const name = String(data.name || "").trim();
  const bahagian = String(data.bahagian || "").trim();
  const status = String(data.status || "").trim();

  if (!name) throw new Error("Nama diperlukan.");
  if (!bahagian) throw new Error("Bahagian diperlukan.");
  if (!["Hadir", "Tidak Hadir"].includes(status)) throw new Error("Status tidak sah.");

  const lastRow = sh.getLastRow();
  let targetRow = 0;

  if (lastRow >= 2) {
    const values = sh.getRange(2, 1, lastRow - 1, 4).getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][1]).trim().toLowerCase() === name.toLowerCase()) {
        targetRow = i + 2;
        break;
      }
    }
  }

  const rowValues = [[new Date(), name, bahagian, status]];

  if (targetRow) {
    sh.getRange(targetRow, 1, 1, 4).setValues(rowValues);
  } else {
    sh.appendRow(rowValues[0]);
  }

  SpreadsheetApp.flush();
  return { ok: true, name, bahagian, status };
}

function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(MASTER_SHEET);
  const rsvp = ss.getSheetByName(RSVP_SHEET);

  if (!master || !rsvp) throw new Error("Sheet Masterlist/RSVP tidak dijumpai.");

  const masterRows = master.getLastRow() >= 2
    ? master.getRange(2, 1, master.getLastRow() - 1, 2).getValues()
    : [];

  const rsvpRows = rsvp.getLastRow() >= 2
    ? rsvp.getRange(2, 1, rsvp.getLastRow() - 1, 4).getValues()
    : [];

  const responsesByName = new Map();
  rsvpRows.forEach(r => {
    const name = String(r[1] || "").trim();
    if (!name) return;
    responsesByName.set(name.toLowerCase(), {
      timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ""),
      name,
      bahagian: String(r[2] || "").trim(),
      status: String(r[3] || "").trim()
    });
  });

  const rows = masterRows
    .filter(r => String(r[0] || "").trim())
    .map(r => {
      const name = String(r[0] || "").trim();
      const bahagian = String(r[1] || "").trim();
      const response = responsesByName.get(name.toLowerCase());

      return response || {
        timestamp: "",
        name,
        bahagian,
        status: "Belum Menjawab"
      };
    });

  const counts = {
    total: rows.length,
    hadir: rows.filter(r => r.status === "Hadir").length,
    tidakHadir: rows.filter(r => r.status === "Tidak Hadir").length,
    belumMenjawab: rows.filter(r => r.status === "Belum Menjawab").length
  };

  return { ok: true, counts, rows };
}
