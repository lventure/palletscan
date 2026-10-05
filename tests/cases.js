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
    // De barcode op het rek bevat alleen de palletplaats: één letter + twee cijfers (A03, B48, C13, D94).
    test('locatie: letter + twee cijfers', function () { eq(loc('A03'), 'A03'); eq(loc('B48'), 'B48'); eq(loc('C13'), 'C13'); eq(loc('D94'), 'D94'); eq(loc('A04'), 'A04'); });
    test('locatie: kleine letters worden hoofdletters', function () { eq(loc('a03'), 'A03'); eq(loc('d94'), 'D94'); });
    test('locatie: met ]C0 / ]C1 en witruimte', function () { eq(loc(']C0A03'), 'A03'); eq(loc(']C1A03'), 'A03'); eq(loc(' A03\r'), 'A03'); eq(loc('A 03'), 'A03'); });
    test('locatie: resultaat is tekst en behoudt de voorloopnul', function () { eq(typeof loc('A03'), 'string'); eq(loc('A00'), 'A00'); eq(loc('A04').length, 3); });
    test('locatie: elke letter mag, ook L, O en C', function () { eq(loc('L07'), 'L07'); eq(loc('O15'), 'O15'); eq(loc('C13'), 'C13'); eq(loc('Z99'), 'Z99'); });
    test('locatie: de oude barcode met LOC ervoor wordt niet meer aanvaard', function () {
      eq(errCode('LOCA03'), 'unknown'); eq(errCode('LOC'), 'unknown'); eq(errCode('locA04'), 'unknown');
    });
    test('locatie: ongeldig formaat -> fout', function () {
      eq(errCode('A3'), 'unknown'); eq(errCode('A123'), 'unknown'); eq(errCode('AB3'), 'unknown'); eq(errCode('03A'), 'unknown');
      eq(errCode('ABC'), 'unknown'); eq(errCode('A-03'), 'unknown'); eq(errCode('A.03'), 'unknown'); eq(errCode('3.12'), 'unknown');
      eq(errCode('A03A03'), 'unknown'); eq(errCode('Ä03'), 'unknown'); eq(errCode('312'), 'not_sscc');
    });
    test('locatie: een SSCC wordt nooit als locatie gelezen en omgekeerd', function () {
      eq(L.parseScan(A).type, 'sscc'); eq(L.parseScan('00' + A).type, 'sscc'); eq(L.parseScan('A03').type, 'location');
      eq(L.isValidSscc('A03'), false);
    });
    test('locatie: een commando-barcode is geen locatie', function () { eq(L.parseScan('CMDUIT').type, 'status'); eq(L.parseScan('CMDESC').type, 'command'); eq(errCode('CMD'), 'unknown'); });
    test('locatie: patroon beperken tot de bestaande rijen (A tot D)', function () {
      var cfg = { locationPattern: '^[A-D][0-9]{2}$' };
      eq(loc('D94', cfg), 'D94'); eq(loc('a04', cfg), 'A04'); eq(errCode('E03', cfg), 'unknown');
    });
    test('locatie: ander patroon via configuratie', function () {
      var cfg = { locationPattern: '^[A-Z]-[0-9]{2}-[0-9]$' };
      eq(loc('A-01-2', cfg), 'A-01-2'); eq(loc('a-01-2', cfg), 'A-01-2'); eq(errCode('A03', cfg), 'unknown');
    });
    test('locatie: het oude formaat X.XX kan via configuratie', function () {
      var cfg = { locationPattern: '^[0-9]{1,2}\\.[0-9]{2}$' };
      eq(loc('3.12', cfg), '3.12'); eq(loc('12.05', cfg), '12.05'); eq(errCode('A03', cfg), 'unknown');
    });
    test('locatie: een patroon met alleen cijfers botst niet met een SSCC', function () {
      var cfg = { locationPattern: '^[0-9]{3}$' };
      eq(loc('312', cfg), '312'); eq(sscc(A, cfg), A); eq(sscc('00' + A, cfg), A); eq(errCode('3120', cfg), 'not_sscc');
    });

    // ---------- Vaste bestemmingen (sneltoetsen) ----------
    test('bestemming: commando-barcodes', function () {
      eq(L.parseScan('CMDUIT'), { type: 'status', target: 'Uitgenomen' });
      eq(L.parseScan('cmdverz'), { type: 'status', target: 'Verzonden' });
      eq(L.parseScan('CMDGANG'), { type: 'status', target: 'Gang' });
      eq(L.parseScan(']C0CMDTEE'), { type: 'status', target: 'TEE' });
      eq(L.parseScan(']C1CMDESC'), { type: 'command', command: 'ANNULEREN' });
    });
    test('bestemming: de naam zelf scannen of typen werkt ook', function () {
      eq(L.parseScan('TEE'), { type: 'status', target: 'TEE' });
      eq(L.parseScan('tee'), { type: 'status', target: 'TEE' });
      eq(L.parseScan('gang'), { type: 'status', target: 'Gang' });
      eq(L.parseScan(' Uitgenomen\r'), { type: 'status', target: 'Uitgenomen' });
    });
    test('bestemming: "Klaar" bestaat niet meer', function () { eq(errCode('CMDKLAAR'), 'unknown'); eq(errCode('Klaar'), 'unknown'); });
    test('bestemming: bijna-namen zijn geen bestemming', function () { eq(errCode('TE'), 'unknown'); eq(errCode('TEEE'), 'unknown'); eq(errCode('GANGEN'), 'unknown'); eq(errCode('CMD'), 'unknown'); });
    test('bestemming: lijst instelbaar (toevoegen, hernoemen, weghalen)', function () {
      var cfg = { statuses: [{ text: 'Kade 2', barcode: 'CMDKADE' }, { text: 'Blok', barcode: '' }] };
      eq(L.parseScan('CMDKADE', cfg), { type: 'status', target: 'Kade 2' });
      eq(L.parseScan('kade2', cfg), { type: 'status', target: 'Kade 2' });
      eq(L.parseScan('BLOK', cfg), { type: 'status', target: 'Blok' });
      eq(errCode('CMDTEE', cfg), 'unknown'); eq(errCode('TEE', cfg), 'unknown');
      eq(loc('A03', cfg), 'A03'); eq(sscc(A, cfg), A);
    });
    test('bestemming: lege lijst of lege regels geven geen fout', function () {
      eq(errCode('CMDUIT', { statuses: [] }), 'unknown');
      eq(L.parseScan('CMDTEE', { statuses: [null, {}, { text: '' }, { text: 'TEE', barcode: 'CMDTEE' }] }), { type: 'status', target: 'TEE' });
    });
    test('bestemming: een SSCC of locatie wordt nooit als bestemming gelezen', function () {
      eq(L.parseScan(A).type, 'sscc'); eq(L.parseScan('A03').type, 'location'); eq(L.parseScan('T33').type, 'location');
    });

    // ---------- Scanflow ----------
    function step(open, raw) { return L.decide(open, L.parseScan(raw)); }
    test('flow: SSCC zonder open pallet opent de pallet', function () { eq(step(null, '00' + A), { do: 'open', sscc: A }); });
    test('flow: locatie met open pallet schrijft weg', function () { eq(step(A, 'A03'), { do: 'write', sscc: A, target: 'A03' }); eq(step(A, 'a04'), { do: 'write', sscc: A, target: 'A04' }); });
    test('flow: bestemming met open pallet schrijft de naam weg', function () {
      eq(L.decide(A, { type: 'status', target: 'Uitgenomen' }), { do: 'write', sscc: A, target: 'Uitgenomen' });
      eq(L.decide(A, { type: 'status', target: 'Verzonden' }), { do: 'write', sscc: A, target: 'Verzonden' });
      eq(L.decide(A, { type: 'status', target: 'Gang' }), { do: 'write', sscc: A, target: 'Gang' });
      eq(L.decide(A, { type: 'status', target: 'TEE' }), { do: 'write', sscc: A, target: 'TEE' });
    });
    test('flow: commando-barcode of getypte naam met open pallet', function () {
      eq(step(A, 'CMDGANG'), { do: 'write', sscc: A, target: 'Gang' });
      eq(step(A, 'CMDTEE'), { do: 'write', sscc: A, target: 'TEE' });
      eq(step(A, 'tee'), { do: 'write', sscc: A, target: 'TEE' });
    });
    test('flow: Esc met open pallet annuleert, zonder open pallet gebeurt niets', function () {
      eq(L.decide(A, { type: 'command', command: 'ANNULEREN' }), { do: 'cancel', sscc: A });
      eq(L.decide(null, { type: 'command', command: 'ANNULEREN' }), { do: 'ignore' });
      eq(step(A, 'CMDESC'), { do: 'cancel', sscc: A });
    });
    test('flow: tweede SSCC met open pallet wordt geblokkeerd', function () { eq(step(A, C).do, 'error'); });
    test('flow: dezelfde SSCC opnieuw scannen doet niets', function () { eq(step(A, '00' + A), { do: 'ignore' }); });
    test('flow: locatie zonder open pallet -> fout', function () { eq(step(null, 'A03').do, 'error'); eq(step(null, 'd94').do, 'error'); });
    test('flow: bestemming zonder open pallet -> fout', function () {
      eq(L.decide(null, { type: 'status', target: 'Uitgenomen' }).do, 'error');
      eq(L.decide(null, { type: 'status', target: 'TEE' }).do, 'error');
      eq(step(null, 'CMDGANG').do, 'error'); eq(step(null, 'TEE').do, 'error');
    });
    test('flow: ongeldige scan is altijd een fout, met of zonder open pallet', function () {
      eq(step(null, '340123451234567890').do, 'error'); eq(step(A, '5412345678908').do, 'error'); eq(step(A, 'A3').do, 'error'); eq(step(A, 'LOCA03').do, 'error');
      eq(step(A, 'CMDKLAAR').do, 'error');
    });

    return results;
  };
});
