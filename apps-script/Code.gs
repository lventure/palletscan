/**
 * Palletscan – Google Apps Script
 * Ontvangt scans van de webapp en voegt ze toe als rijen in het tabblad
 * "Scans" van de Sheet waaraan dit script gekoppeld is.
 *
 * Het script voegt alleen rijen toe onderaan het tabblad "Scans". Het wijzigt
 * of verwijdert nooit een bestaande rij en raakt geen ander tabblad aan.
 *
 * @OnlyCurrentDoc
 */

/* ======================= CONFIGURATIE ======================= */
var SHARED_KEY  = 'VERVANG-DIT-DOOR-EEN-EIGEN-SLEUTEL'; // dezelfde sleutel als in de app
var SHEET_NAME  = 'Scans';
var TIMEZONE    = 'Europe/Brussels';
var DATE_FORMAT = 'dd/mm/yyyy hh:mm:ss';
var DEDUP_ROWS  = 5000;  // zoveel laatste rijen worden nagekeken op een dubbele ScanID
var MAX_BATCH   = 200;   // max. aantal scans per verzending
// Toegelaten tekens in kolom C: letters, cijfers, spatie, punt, streepjes en schuine streep.
// Zo kan er nooit een formule in de Sheet terechtkomen. Gebruik je in de app
// een locatiepatroon met andere tekens, voeg ze dan hier toe.
var LOC_ALLOWED = /^[A-Za-z0-9][A-Za-z0-9 ._\/-]{0,39}$/;
var HEADERS     = ['Datum & uur', 'Pallet-SSCC', 'Palletplaats', 'ScanID', 'Toestel', 'Ontvangen'];
/* ============================================================ */

/** De app stuurt hierheen: { key, scans: [{ id, ts, sscc, loc, dev }] } */
function doPost(e) {
  var out;
  try {
    out = handle_(JSON.parse(e.postData.contents));
  } catch (err) {
    out = { ok: false, error: 'server', detail: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Het adres openen in een browser toont alleen dat het script draait. */
function doGet() {
  return ContentService.createTextOutput('Palletscan: het script is actief.').setMimeType(ContentService.MimeType.TEXT);
}

function handle_(req) {
  if (!req || typeof req.key !== 'string' || req.key !== SHARED_KEY || SHARED_KEY.indexOf('VERVANG') === 0) {
    return { ok: false, error: 'unauthorized' };
  }
  if (req.ping) return { ok: true, pong: true };

  var scans = Array.isArray(req.scans) ? req.scans : [];
  if (scans.length > MAX_BATCH) return { ok: false, error: 'too_many' };

  // Eén schrijver tegelijk: zo kunnen meerdere toestellen nooit dezelfde rij gebruiken.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, error: 'busy' };
  try {
    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();

    // ScanID's van de laatste rijen: een herhaalde verzending geeft geen dubbele rij.
    var seen = Object.create(null);
    if (lastRow > 1) {
      var n = Math.min(DEDUP_ROWS, lastRow - 1);
      var ids = sheet.getRange(lastRow - n + 1, 4, n, 1).getValues();
      for (var i = 0; i < ids.length; i++) seen[String(ids[i][0])] = true;
    }

    var received = toSerial_(new Date());
    var rows = [], written = [], duplicates = [], rejected = [];
    for (var j = 0; j < scans.length; j++) {
      var s = scans[j];
      var problem = validate_(s);
      if (problem) { rejected.push({ id: s && typeof s.id === 'string' ? s.id : '', reason: problem }); continue; }
      if (seen[s.id]) { duplicates.push(s.id); continue; }
      seen[s.id] = true;
      rows.push([toSerial_(new Date(s.ts)), s.sscc, s.loc, s.id, cleanDevice_(s.dev), received]);
      written.push(s.id);
    }

    if (rows.length) {
      var start = lastRow + 1;
      var needed = start + rows.length - 1;
      var max = sheet.getMaxRows();
      if (needed > max) sheet.insertRowsAfter(max, needed - max + 200);
      // Eerst het formaat, dan de waarden: B tot E zijn tekst (een SSCC van 18
      // cijfers of een plaats als "3.10" mag nooit een getal worden).
      sheet.getRange(start, 1, rows.length, 1).setNumberFormat(DATE_FORMAT);
      sheet.getRange(start, 2, rows.length, 4).setNumberFormat('@');
      sheet.getRange(start, 6, rows.length, 1).setNumberFormat(DATE_FORMAT);
      sheet.getRange(start, 1, rows.length, HEADERS.length).setValues(rows);
      SpreadsheetApp.flush();
    }
    return { ok: true, written: written, duplicates: duplicates, rejected: rejected };
  } finally {
    lock.releaseLock();
  }
}

/** Het tabblad "Scans" ophalen, of aanmaken met een kopregel als het niet bestaat. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME, ss.getNumSheets());
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setNumberFormat('@').setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Geeft een reden terug als de scan niet bruikbaar is, anders een lege tekst. */
function validate_(s) {
  if (!s || typeof s !== 'object') return 'geen scan';
  if (typeof s.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(s.id)) return 'ScanID ongeldig';
  if (typeof s.ts !== 'number' || !isFinite(s.ts) || s.ts <= 0 || s.ts > 4102444800000) return 'tijdstip ongeldig';
  if (typeof s.sscc !== 'string' || !isValidSscc_(s.sscc)) return 'SSCC ongeldig';
  if (typeof s.loc !== 'string' || !LOC_ALLOWED.test(s.loc)) return 'palletplaats ongeldig';
  return '';
}

/** Toestelnaam: alleen letters, cijfers, spatie, punt en streepjes. */
function cleanDevice_(dev) {
  return typeof dev === 'string' ? dev.replace(/[^A-Za-z0-9 ._-]/g, '').slice(0, 40) : '';
}

/** 18 cijfers met een geldig GS1-controlecijfer. */
function isValidSscc_(s) {
  if (!/^[0-9]{18}$/.test(s)) return false;
  var sum = 0, weight = 3;
  for (var i = 16; i >= 0; i--) {
    sum += (s.charCodeAt(i) - 48) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10 === s.charCodeAt(17) - 48;
}

/**
 * Een tijdstip omzetten naar een echte datum-tijdwaarde voor Sheets, in
 * Belgische tijd, los van de tijdzone die in de Sheet zelf is ingesteld.
 * (Sheets telt dagen sinds 30/12/1899.)
 */
function toSerial_(date) {
  var p = Utilities.formatDate(date, TIMEZONE, 'yyyy,M,d,H,m,s').split(',');
  var wall = Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]), Number(p[3]), Number(p[4]), Number(p[5]));
  return (wall - Date.UTC(1899, 11, 30)) / 86400000;
}

/**
 * Eén keer uitvoeren vanuit de editor (knop "Uitvoeren") om toegang te geven
 * en het tabblad "Scans" aan te maken.
 */
function eersteKeerInstellen() {
  var sheet = getSheet_();
  Logger.log('Tabblad "' + sheet.getName() + '" is klaar.');
}
