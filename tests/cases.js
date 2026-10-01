/*
 * Tests voor scanlogic.js. Draait in Node (tests/run.js) en in de browser
 * (tests/index.html). Geen testframework nodig.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.runScanLogicTests = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return function runScanLogicTests(L) {
    var results = [];
    function test(name, fn) {
      try { fn(); results.push({ name: name, ok: true }); }
      catch (e) { results.push({ name: name, ok: false, detail: String(e && e.message || e) }); }
    }
    function eq(actual, expected, label) {
      var a = JSON.stringify(actual), b = JSON.stringify(expected);
      if (a !== b) throw new Error((label ? label + ': ' : '') + 'verwacht ' + b + ', kreeg ' + a);
    }
    function sscc(raw, cfg) { var r = L.parseScan(raw, cfg); eq(r.type, 'sscc', 'type voor "' + raw + '"'); return r.sscc; }
    function loc(raw, cfg) { var r = L.parseScan(raw, cfg); eq(r.type, 'location', 'type voor "' + raw + '"'); return r.location; }
    function errCode(raw, cfg) { var r = L.parseScan(raw, cfg); eq(r.type, 'error', 'type voor "' + raw + '"'); return r.code; }

    // Geldige SSCC's. De eerste twee zijn gepubliceerde GS1-voorbeelden.
    var A = '340123451234567895';
    var B = '006141411234567890'; // begint zelf met 00: mag niet ingekort worden
    var C = '354123450000000014';

    // ---------- Controlecijfer ----------
    test('controlecijfer: GS1-voorbeeld 34012345123456789 -> 5', function () { eq(L.gs1CheckDigit('34012345123456789'), 5); });
    test('controlecijfer: GS1-voorbeeld 00614141123456789 -> 0', function () { eq(L.gs1CheckDigit('00614141123456789'), 0); });
    test('controlecijfer: 35412345000000001 -> 4', function () { eq(L.gs1CheckDigit('35412345000000001'), 4); });
    test('isValidSscc: geldig', function () { eq(L.isValidSscc(A), true); eq(L.isValidSscc(B), true); eq(L.isValidSscc(C), true); });
    test('isValidSscc: elk fout controlecijfer wordt geweigerd', function () {
      for (var d = 0; d <= 9; d++) { if (d !== 5) eq(L.isValidSscc(A.slice(0, 17) + d), false, 'cijfer ' + d); }
    });
    test('isValidSscc: één verkeerd cijfer wordt altijd gevonden', function () {
      for (var i = 0; i < 17; i++) {
        var wrong = A.slice(0, i) + ((+A[i] + 1) % 10) + A.slice(i + 1);
        eq(L.isValidSscc(wrong), false, 'positie ' + i);
      }
    });
    test('isValidSscc: verkeerde lengte of letters', function () {
      eq(L.isValidSscc(A.slice(1)), false); eq(L.isValidSscc(A + '0'), false);
      eq(L.isValidSscc('34012345123456789X'), false); eq(L.isValidSscc(''), false);
    });

    // ---------- SSCC ontleden ----------
    test('SSCC: 18 cijfers', function () { eq(sscc(A), A); });
    test('SSCC: met AI 00 (20 cijfers)', function () { eq(sscc('00' + A), A); });
    test('SSCC: met (00)', function () { eq(sscc('(00)' + A), A); });
    test('SSCC: met symbology identifier ]C1 en AI 00', function () { eq(sscc(']C100' + A), A); });
    test('SSCC: met ]C1 en (00)', function () { eq(sscc(']C1(00)' + A), A); });
    test('SSCC: met ]C1 zonder AI', function () { eq(sscc(']C1' + A), A); });
    test('SSCC: andere AIM-identifiers (]d2, ]Q3, ]e0)', function () {
      eq(sscc(']d200' + A), A); eq(sscc(']Q300' + A), A); eq(sscc(']e000' + A), A);
    });
    test('SSCC: spaties, Enter en GS-teken worden genegeerd', function () {
      eq(sscc('  00' + A + '\r\n'), A);
      eq(sscc('\u001d00' + A), A);
      eq(sscc('(00) 3 4012345 123456789 5'), A);
    });
    test('SSCC: 18 cijfers die zelf met 00 beginnen blijven 18 cijfers', function () { eq(sscc(B), B); });
    test('SSCC: 00 + SSCC die met 00 begint', function () { eq(sscc('00' + B), B); eq(sscc('(00)' + B), B); });
    test('SSCC: resultaat is tekst, geen getal', function () { eq(typeof sscc(A), 'string'); eq(sscc(B).length, 18); });
    test('SSCC: fout controlecijfer -> fout', function () {
      eq(errCode('340123451234567890'), 'sscc_check');
      eq(errCode('00340123451234567890'), 'sscc_check');
      eq(errCode('(00)340123451234567890'), 'sscc_check');
      eq(errCode(']C100340123451234567890'), 'sscc_check');
    });
    test('SSCC: verkeerde lengte -> fout', function () {
      eq(errCode('34012345123456789'), 'not_sscc');       // 17
      eq(errCode('3401234512345678950'), 'not_sscc');     // 19
      eq(errCode('(00)34012345123456789'), 'sscc_length');
      eq(errCode('(00)'), 'sscc_length');
    });
    test('SSCC: 20 cijfers zonder 00 vooraan -> fout', function () { eq(errCode('11' + A), 'not_sscc'); });
    test('SSCC: andere barcode van het palletlabel (GTIN, EAN-13) -> fout', function () {
      eq(errCode('5412345678908'), 'not_sscc');
      eq(errCode('0205412345678908150101013712'), 'not_sscc');
      eq(errCode('(02)05412345678908(37)12'), 'unknown');
    });
    test('SSCC: letters in de code -> fout', function () { eq(errCode('0034012345123456789A'), 'unknown'); });
    test('lege invoer -> fout', function () { eq(errCode(''), 'empty'); eq(errCode('   '), 'empty'); eq(errCode(null), 'empty'); });

    // ---------- Locatie ontleden ----------
    test('locatie: prefix wordt verwijderd', function () { eq(loc('LOC3.12'), '3.12'); eq(loc('LOC12.05'), '12.05'); });
    test('locatie: prefix in kleine letters', function () { eq(loc('loc3.12'), '3.12'); });
    test('locatie: met ]C1 en witruimte', function () { eq(loc(']C1LOC3.12'), '3.12'); eq(loc(' LOC3.12\r'), '3.12'); });
    test('locatie: resultaat is tekst en behoudt de nul achteraan', function () { eq(loc('LOC3.10'), '3.10'); eq(typeof loc('LOC3.10'), 'string'); });
    test('locatie: getypt zonder prefix is toegestaan als het patroon klopt', function () { eq(loc('3.12'), '3.12'); eq(loc('12.05'), '12.05'); });
    test('locatie: getypt zonder prefix kan uitgeschakeld worden', function () {
      eq(errCode('3.12', { allowBareLocation: false }), 'unknown');
      eq(loc('LOC3.12', { allowBareLocation: false }), '3.12');
    });
    test('locatie: prefix met ongeldig formaat -> fout', function () {
      eq(errCode('LOC'), 'bad_location'); eq(errCode('LOC3.1'), 'bad_location'); eq(errCode('LOC3.123'), 'bad_location');
      eq(errCode('LOC123.12'), 'bad_location'); eq(errCode('LOC3,12'), 'bad_location'); eq(errCode('LOCA.12'), 'bad_location');
      eq(errCode('LOC' + A), 'bad_location');
    });
    test('locatie: zonder prefix en ongeldig formaat -> fout', function () {
      eq(errCode('3.1'), 'unknown'); eq(errCode('3,12'), 'unknown'); eq(errCode('ABC'), 'unknown'); eq(errCode('312'), 'not_sscc');
    });
    test('locatie: een SSCC wordt nooit als locatie gelezen en omgekeerd', function () {
      eq(L.parseScan(A).type, 'sscc'); eq(L.parseScan('LOC3.12').type, 'location');
    });
    test('locatie: andere prefix en ander patroon via configuratie', function () {
      var cfg = { locationPrefix: 'P-', locationPattern: '^[A-Z]-[0-9]{2}-[0-9]$' };
      eq(loc('P-A-01-2', cfg), 'A-01-2'); eq(loc('p-a-01-2', cfg), 'A-01-2'); eq(loc('A-01-2', cfg), 'A-01-2');
      eq(errCode('LOC3.12', cfg), 'unknown');
    });
    test('locatie: lege prefix steunt alleen op het patroon', function () {
      var cfg = { locationPrefix: '' };
      eq(loc('3.12', cfg), '3.12'); eq(sscc(A, cfg), A);
    });

    // ---------- Commando-barcodes ----------
    test('commando-barcodes', function () {
      eq(L.parseScan('CMDUIT'), { type: 'command', command: 'UITGENOMEN' });
      eq(L.parseScan('cmdverz'), { type: 'command', command: 'VERZONDEN' });
      eq(L.parseScan(']C1CMDESC'), { type: 'command', command: 'ANNULEREN' });
    });

    // ---------- Scanflow ----------
    function step(open, raw) { return L.decide(open, L.parseScan(raw)); }
    test('flow: SSCC zonder open pallet opent de pallet', function () { eq(step(null, '00' + A), { do: 'open', sscc: A }); });
    test('flow: locatie met open pallet schrijft weg', function () { eq(step(A, 'LOC3.12'), { do: 'write', sscc: A, target: '3.12' }); });
    test('flow: F1 / F2 met open pallet', function () {
      eq(L.decide(A, { type: 'command', command: 'UITGENOMEN' }), { do: 'write', sscc: A, target: 'Uitgenomen' });
      eq(L.decide(A, { type: 'command', command: 'VERZONDEN' }), { do: 'write', sscc: A, target: 'Verzonden' });
    });
    test('flow: Esc met open pallet annuleert, zonder open pallet gebeurt niets', function () {
      eq(L.decide(A, { type: 'command', command: 'ANNULEREN' }), { do: 'cancel', sscc: A });
      eq(L.decide(null, { type: 'command', command: 'ANNULEREN' }), { do: 'ignore' });
    });
    test('flow: tweede SSCC met open pallet wordt geblokkeerd', function () { eq(step(A, C).do, 'error'); });
    test('flow: dezelfde SSCC opnieuw scannen doet niets', function () { eq(step(A, '00' + A), { do: 'ignore' }); });
    test('flow: locatie zonder open pallet -> fout', function () { eq(step(null, 'LOC3.12').do, 'error'); eq(step(null, '3.12').do, 'error'); });
    test('flow: F1 / F2 zonder open pallet -> fout', function () {
      eq(L.decide(null, { type: 'command', command: 'UITGENOMEN' }).do, 'error');
      eq(L.decide(null, { type: 'command', command: 'VERZONDEN' }).do, 'error');
    });
    test('flow: ongeldige scan is altijd een fout, met of zonder open pallet', function () {
      eq(step(null, '340123451234567890').do, 'error'); eq(step(A, '5412345678908').do, 'error'); eq(step(A, 'LOC99.999').do, 'error');
    });
    test('flow: statusteksten instelbaar', function () {
      eq(L.decide(A, { type: 'command', command: 'VERZONDEN' }, { textVerzonden: 'Weg' }).target, 'Weg');
    });

    return results;
  };
});
