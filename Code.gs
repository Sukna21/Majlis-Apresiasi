/**
 * Google Apps Script — RSVP Majlis Apresiasi SUKNA-21
 * Versi 5.1: JSONP untuk elak masalah CORS antara GitHub Pages dan Apps Script.
 *
 * PENTING:
 * Selepas paste code ini:
 * Deploy > Manage deployments > Edit > New version > Deploy
 * Execute as: Me
 * Who has access: Anyone
 */

const RSVP_SHEET = "RSVP";
const MASTER_SHEET = "Masterlist";

function outputData(obj, callback) {
  const json = JSON.stringify(obj);

  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || "dashboard";
    let result;

    if (action === "dashboard") {
      result = getDashboardData();
    } else if (action === "submit") {
      result = saveRSVP({
        name: p.name,
        bahagian: p.bahagian,
        status: p.status
      });
    } else {
      result = { ok: false, error: "Unknown action" };
    }

    return outputData(result, p.callback);
  } catch (err) {
    return outputData(
      { ok: false, error: String(err && err.message ? err.message : err) },
      e && e.parameter ? e.parameter.callback : ""
    );
  }
}

function doPost(e) {
  try {
    const data = parseBody(e);
    const result = saveRSVP(data);
    return outputData(result, "");
  } catch (err) {
    return outputData(
      { ok: false, error: String(err && err.message ? err.message : err) },
      ""
    );
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
      const parts = pair.split("=");
      const k = decodeURIComponent(parts[0] || "");
      const v = decodeURIComponent((parts.slice(1).join("=") || "").replace(/\+/g, " "));
      out[k] = v;
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
  if (status !== "Hadir" && status !== "Tidak Hadir") {
    throw new Error("Status tidak sah.");
  }

  // Semak nama wujud dalam masterlist
  const master = ss.getSheetByName(MASTER_SHEET);
  if (!master) throw new Error("Sheet Masterlist tidak dijumpai.");

  const masterRows = master.getLastRow() >= 2
    ? master.getRange(2, 1, master.getLastRow() - 1, 2).getValues()
    : [];

  const matched = masterRows.find(r =>
    String(r[0] || "").trim().toLowerCase() === name.toLowerCase()
  );

  if (!matched) throw new Error("Nama tidak dijumpai dalam masterlist.");

  const officialBahagian = String(matched[1] || "").trim();

  // Update rekod lama jika nama yang sama dah RSVP
  const lastRow = sh.getLastRow();
  let targetRow = 0;

  if (lastRow >= 2) {
    const values = sh.getRange(2, 1, lastRow - 1, 4).getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][1] || "").trim().toLowerCase() === name.toLowerCase()) {
        targetRow = i + 2;
        break;
      }
    }
  }

  const row = [new Date(), name, officialBahagian || bahagian, status];

  if (targetRow) {
    sh.getRange(targetRow, 1, 1, 4).setValues([row]);
  } else {
    sh.appendRow(row);
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    name: name,
    bahagian: officialBahagian || bahagian,
    status: status
  };
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

  const responses = new Map();

  rsvpRows.forEach(r => {
    const name = String(r[1] || "").trim();
    if (!name) return;

    responses.set(name.toLowerCase(), {
      timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ""),
      name: name,
      bahagian: String(r[2] || "").trim(),
      status: String(r[3] || "").trim()
    });
  });

  const rows = masterRows
    .filter(r => String(r[0] || "").trim())
    .map(r => {
      const name = String(r[0] || "").trim();
      const bahagian = String(r[1] || "").trim();
      const response = responses.get(name.toLowerCase());

      return response || {
        timestamp: "",
        name: name,
        bahagian: bahagian,
        status: "Belum Menjawab"
      };
    });

  return {
    ok: true,
    counts: {
      total: rows.length,
      hadir: rows.filter(r => r.status === "Hadir").length,
      tidakHadir: rows.filter(r => r.status === "Tidak Hadir").length,
      belumMenjawab: rows.filter(r => r.status === "Belum Menjawab").length
    },
    rows: rows
  };
}
