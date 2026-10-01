#!/usr/bin/env node
/*
 * Test van apps-script/Code.gs tegen een nagebootste Google Sheet.
 * Draaien met:  node tests/run-appsscript.js
 */
'use strict';

const { makeWorld } = require('./mock-sheet.js');

let failed = 0, total = 0;
function test(name, fn) {
  total++;
  try { fn(); console.log('  ok    ' + name); }
  catch (e) { failed++; console.log('  FOUT  ' + name + '\n        ' + (e && e.message)); }
}
function eq(a, b, label) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((label ? label + ': ' : '') + 'verwacht ' + y + ', kreeg ' + x); }

const A = '340123451234567895', B = '006141411234567890';
// 30/09/2026 14:00:00 Belgische zomertijd = 12:00:00 UTC
const TS = Date.UTC(2026, 8, 30, 12, 0, 0);
const scan = (id, sscc, loc, ts) => ({ id, ts: ts || TS, sscc, loc, dev: 'MC1' });
const serialToText = n => new Date(Math.round(n * 86400000) + Date.UTC(1899, 11, 30)).toISOString().slice(0, 19).replace('T', ' ');

test('verkeerde sleutel wordt geweigerd en schrijft niets', () => {
  const w = makeWorld();
  eq(w.post({ key: 'fout', scans: [scan('a', A, '3.12')] }), { ok: false, error: 'unauthorized' });
  eq(w.post({ scans: [scan('a', A, '3.12')] }).error, 'unauthorized');
  eq(w.sheets['Scans'], undefined);
});
test('niet-vervangen standaardsleutel wordt altijd geweigerd', () => {
  const w = makeWorld();
  w.ctx.SHARED_KEY = 'VERVANG-DIT-DOOR-EEN-EIGEN-SLEUTEL';
  eq(w.post({ key: 'VERVANG-DIT-DOOR-EEN-EIGEN-SLEUTEL', ping: true }).error, 'unauthorized');
});
test('ping schrijft niets', () => {
  const w = makeWorld();
  eq(w.post({ key: 'test-sleutel', ping: true }), { ok: true, pong: true });
  eq(w.sheets['Scans'], undefined);
});
test('tabblad Scans wordt aangemaakt met kopregel; ander tabblad blijft onaangeroerd', () => {
  const w = makeWorld();
  const r = w.post({ key: 'test-sleutel', scans: [scan('a', A, '3.12')] });
  eq(r, { ok: true, written: ['a'], duplicates: [], rejected: [] });
  eq(w.sheets['Scans'].cells[0], ['Datum & uur', 'Pallet-SSCC', 'Palletplaats', 'ScanID', 'Toestel', 'Ontvangen']);
  eq(w.sheets['Stock'].cells.length, 0);
});
test('SSCC en palletplaats blijven tekst (geen precisieverlies, "3.10" blijft "3.10")', () => {
  const w = makeWorld();
  w.post({ key: 'test-sleutel', scans: [scan('a', B, '3.10')] });
  const row = w.sheets['Scans'].cells[1];
  eq(row[1], B); eq(typeof row[1], 'string');
  eq(row[2], '3.10'); eq(typeof row[2], 'string');
  eq(row[3], 'a'); eq(row[4], 'MC1');
});
test('datum is een echte datum-tijdwaarde in Belgische tijd (zomer en winter)', () => {
  const w = makeWorld();
  w.post({ key: 'test-sleutel', scans: [scan('z', A, '3.12', TS), scan('w', A, 'Verzonden', Date.UTC(2026, 0, 15, 12, 0, 0))] });
  const c = w.sheets['Scans'].cells;
  eq(typeof c[1][0], 'number');
  eq(serialToText(c[1][0]), '2026-09-30 14:00:00', 'zomertijd');
  eq(serialToText(c[2][0]), '2026-01-15 13:00:00', 'wintertijd');
  eq(typeof c[1][5], 'number');
});
test('herhaalde verzending geeft geen dubbele rij', () => {
  const w = makeWorld();
  w.post({ key: 'test-sleutel', scans: [scan('a', A, '3.12')] });
  const r = w.post({ key: 'test-sleutel', scans: [scan('a', A, '3.12'), scan('b', A, 'Uitgenomen')] });
  eq(r, { ok: true, written: ['b'], duplicates: ['a'], rejected: [] });
  eq(w.sheets['Scans'].getLastRow(), 3);
});
test('dubbele ScanID binnen één verzending wordt één rij', () => {
  const w = makeWorld();
  const r = w.post({ key: 'test-sleutel', scans: [scan('a', A, '3.12'), scan('a', A, '3.12')] });
  eq(r.written, ['a']); eq(r.duplicates, ['a']); eq(w.sheets['Scans'].getLastRow(), 2);
});
test('rijen worden onderaan toegevoegd, in volgorde, bestaande rijen blijven gelijk', () => {
  const w = makeWorld();
  w.post({ key: 'test-sleutel', scans: [scan('a', A, '1.01'), scan('b', A, '1.02')] });
  const before = JSON.stringify(w.sheets['Scans'].cells.slice(0, 3));
  w.post({ key: 'test-sleutel', scans: [scan('c', B, '1.03'), scan('d', B, 'Verzonden'), scan('e', B, '1.05')] });
  eq(JSON.stringify(w.sheets['Scans'].cells.slice(0, 3)), before);
  eq(w.sheets['Scans'].cells.slice(1).map(r => r[3]), ['a', 'b', 'c', 'd', 'e']);
});
test('ongeldige scan wordt geweigerd zonder de rest te blokkeren', () => {
  const w = makeWorld();
  const r = w.post({ key: 'test-sleutel', scans: [scan('a', '340123451234567890', '3.12'), scan('b', A, ''), { id: 'c', ts: 'x', sscc: A, loc: '1.01' }, scan('d', A, '3.12'), { id: 'e', ts: 1e20, sscc: A, loc: '1.01' }] });
  eq(r.written, ['d']);
  eq(r.rejected.map(x => x.id), ['a', 'b', 'c', 'e']);
  eq(w.sheets['Scans'].getLastRow(), 2);
});
test('onleesbaar bericht geeft een nette fout', () => {
  const w = makeWorld();
  eq(w.post('dit is geen json').ok, false);
});
test('een plaats of toestelnaam kan nooit een formule worden', () => {
  const w = makeWorld();
  const r = w.post({ key: 'test-sleutel', scans: [scan('a', A, '=1+1'), scan('b', A, '+32475'), scan('c', A, '-1'), { id: 'd', ts: TS, sscc: A, loc: 'A-01/2', dev: '=HYPERLINK("x")' }] });
  eq(r.written, ['d']); eq(r.rejected.map(x => x.id), ['a', 'b', 'c']);
  eq(w.sheets['Scans'].cells[1][2], 'A-01/2'); eq(w.sheets['Scans'].cells[1][4], 'HYPERLINKx');
  eq(w.sheets['Scans'].formats[1][2], '@');
});
test('ScanID met een vreemde naam wordt niet als dubbel gezien', () => {
  const w = makeWorld();
  const r = w.post({ key: 'test-sleutel', scans: [scan('constructor', A, '1.01'), scan('toString', A, '1.02'), scan('__proto__', A, '1.03')] });
  eq(r.written, ['constructor', 'toString', '__proto__']); eq(r.duplicates, []);
});

console.log('\n' + (total - failed) + ' van ' + total + ' tests geslaagd.');
process.exit(failed ? 1 : 0);
