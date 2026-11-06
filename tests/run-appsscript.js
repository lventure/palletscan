/* Test van apps-script/Code.gs tegen een nagebootste Sheet: node tests/run-appsscript.js */
'use strict';
var makeWorld = require('./mock-sheet.js').makeWorld;
var results = [];
function test(name, fn) { try { fn(); results.push({ name: name, ok: true }); } catch (e) { results.push({ name: name, ok: false, detail: String(e && e.message || e) }); } }
function eq(a, b, label) { var x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((label ? label + ': ' : '') + 'verwacht ' + y + ', kreeg ' + x); }

var KEY = 'test-sleutel-1234567890';
var A = '340123451234567895', B = '354123450000000014', P1 = '154199802502004042', P2 = '154199802502008620';
var TS = Date.UTC(2026, 10, 6, 9, 30, 0); // 6 nov 2026 10:30 Brussel
function scan(id, sscc, loc, ts, extra) { var s = { id: id, ts: ts || TS, sscc: sscc, loc: loc, dev: 'KEY1' }; if (extra) for (var k in extra) s[k] = extra[k]; return s; }
var OLD_HEADERS = ['Datum & uur', 'Pallet-SSCC', 'Palletplaats', 'ScanID', 'Toestel', 'Ontvangen'];

test('verkeerde sleutel wordt geweigerd', function () {
  var w = makeWorld({ key: KEY });
  eq(w.post({ key: 'fout', scans: [scan('a', A, 'A03')] }), { ok: false, error: 'unauthorized' });
  eq(w.sheet(), null);
});
test('de placeholder-sleutel werkt nooit', function () {
  var w = makeWorld({});
  eq(w.post({ key: 'VERVANG-DIT-DOOR-EEN-EIGEN-SLEUTEL', ping: true }).ok, false);
});
test('ping schrijft niets', function () {
  var w = makeWorld({ key: KEY });
  eq(w.post({ key: KEY, ping: true }), { ok: true, pong: true });
  eq(w.sheet(), null);
});
test('nieuw tabblad krijgt 7 kopjes, incl. Doel-SSCC', function () {
  var w = makeWorld({ key: KEY });
  w.post({ key: KEY, scans: [] });
  eq(w.sheet().rows[0], ['Datum & uur', 'Pallet-SSCC', 'Palletplaats', 'ScanID', 'Toestel', 'Ontvangen', 'Doel-SSCC']);
  eq(w.sheet().frozen, 1);
});
test('bestaand tabblad van vóór 1.7.0 krijgt alleen kopje G erbij', function () {
  var w = makeWorld({ key: KEY, scans: [OLD_HEADERS.slice(), [46000, A, 'A03', 'oud1', 'KEY1', 46000]] });
  w.post({ key: KEY, scans: [] });
  eq(w.sheet().rows[0], OLD_HEADERS.concat(['Doel-SSCC']));
  eq(w.sheet().rows[1], [46000, A, 'A03', 'oud1', 'KEY1', 46000]); // oude rij ongemoeid
});
test('gewone scan: rij met 7 kolommen, G leeg, SSCC als tekst', function () {
  var w = makeWorld({ key: KEY });
  var r = w.post({ key: KEY, scans: [scan('a', A, 'A03')] });
  eq(r.ok, true); eq(r.written, ['a']); eq(r.rejected, []);
  var row = w.sheet().rows[1];
  eq(row.length, 7); eq(row[1], A); eq(typeof row[1], 'string'); eq(row[2], 'A03'); eq(row[3], 'a'); eq(row[4], 'KEY1'); eq(row[6], '');
  eq(w.sheet().formats['2,2'], '@'); eq(w.sheet().formats['2,7'], '@');
});
test('datum in kolom A is Belgische kloktijd als Sheets-getal', function () {
  var w = makeWorld({ key: KEY });
  w.post({ key: KEY, scans: [scan('a', A, 'A03', TS)] });
  var serial = w.sheet().rows[1][0];
  var wall = Date.UTC(2026, 10, 6, 10, 30, 0); // 10:30 Brussel (CET)
  eq(Math.abs(serial - (wall - Date.UTC(1899, 11, 30)) / 86400000) < 1e-9, true);
});
test('combineren: doel-SSCC komt in kolom G als tekst', function () {
  var w = makeWorld({ key: KEY });
  var r = w.post({ key: KEY, scans: [scan('c1', P1, 'Samengevoegd met 0862', TS, { to: P2 })] });
  eq(r.written, ['c1']);
  var row = w.sheet().rows[1];
  eq(row[1], P1); eq(row[2], 'Samengevoegd met 0862'); eq(row[6], P2); eq(typeof row[6], 'string');
});
test('combineren: ongeldige of gelijke doel-SSCC wordt geweigerd', function () {
  var w = makeWorld({ key: KEY });
  var r = w.post({ key: KEY, scans: [
    scan('c1', P1, 'Samengevoegd met 0862', TS, { to: '154199802502008621' }),
    scan('c2', P1, 'Samengevoegd met 0404', TS, { to: P1 }),
    scan('c3', P1, 'Samengevoegd met 0862', TS, { to: 12345 }),
    scan('c4', P1, 'A03', TS, { to: '' })
  ] });
  eq(r.written, ['c4']);
  eq(r.rejected.map(function (x) { return x.id + ':' + x.reason; }), ['c1:doel-SSCC ongeldig', 'c2:doelpallet is dezelfde pallet', 'c3:doel-SSCC ongeldig']);
});
test('ongeldige scans worden geweigerd, de rest geschreven', function () {
  var w = makeWorld({ key: KEY });
  var r = w.post({ key: KEY, scans: [scan('a', A, 'A03'), scan('b', '340123451234567890', 'A03'), scan('c', B, '=SUM(1)'), scan('d', B, 'TEE'), { id: 'e' }] });
  eq(r.written, ['a', 'd']);
  eq(r.rejected.map(function (x) { return x.reason; }), ['SSCC ongeldig', 'palletplaats ongeldig', 'tijdstip ongeldig']);
  eq(w.sheet().getLastRow(), 3);
});
test('dubbele ScanID geeft geen dubbele rij, ook over verzendingen heen', function () {
  var w = makeWorld({ key: KEY });
  w.post({ key: KEY, scans: [scan('a', A, 'A03'), scan('b', B, 'B48')] });
  var r = w.post({ key: KEY, scans: [scan('b', B, 'B48'), scan('c', A, 'Klaar')] });
  eq(r.written, ['c']); eq(r.duplicates, ['b']);
  eq(w.sheet().getLastRow(), 4);
});
test('volgorde van de rijen is de volgorde van de scans', function () {
  var w = makeWorld({ key: KEY });
  w.post({ key: KEY, scans: [scan('1', A, 'A03'), scan('2', A, 'Uitgenomen'), scan('3', B, 'C13')] });
  eq(w.sheet().rows.slice(1).map(function (r) { return r[3]; }), ['1', '2', '3']);
});
test('te veel scans in één verzending', function () {
  var w = makeWorld({ key: KEY });
  var many = []; for (var i = 0; i < 201; i++) many.push(scan('s' + i, A, 'A03'));
  eq(w.post({ key: KEY, scans: many }), { ok: false, error: 'too_many' });
});
test('vergrendeling bezet: busy, niets geschreven', function () {
  var w = makeWorld({ key: KEY, locked: true });
  eq(w.post({ key: KEY, scans: [scan('a', A, 'A03')] }), { ok: false, error: 'busy' });
});
test('toestelnaam wordt opgeschoond', function () {
  var w = makeWorld({ key: KEY });
  w.post({ key: KEY, scans: [scan('a', A, 'A03', TS, { dev: '=HEF<truck>1' })] });
  eq(w.sheet().rows[1][4], 'HEFtruck1');
});
test('doGet toont alleen dat het script draait', function () {
  var w = makeWorld({ key: KEY });
  eq(w.ctx.doGet().text, 'Palletscan: het script is actief.');
});

var ok = 0;
results.forEach(function (r) { if (r.ok) { ok++; console.log('  ok    ' + r.name); } else console.log('  FOUT  ' + r.name + '\n        ' + r.detail); });
console.log('\n' + ok + ' van ' + results.length + ' tests geslaagd.');
process.exit(ok === results.length ? 0 : 1);
