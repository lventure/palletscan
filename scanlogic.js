/*
 * Palletscan – scanlogica
 * Zuivere functies zonder scherm of netwerk: een scan ontleden en valideren,
 * en beslissen wat er met de scan moet gebeuren. Dit bestand wordt gebruikt
 * door index.html én door de tests (tests/run.js en tests/index.html).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ScanLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULTS = {
    locationPrefix: 'LOC',
    locationPattern: '^[A-Z][0-9]{2}$',          // één letter + twee cijfers, bv. A03
    allowBareLocation: true,
    barcodeUitgenomen: 'CMDUIT',
    barcodeVerzonden: 'CMDVERZ',
    barcodeKlaar: 'CMDKLAAR',
    barcodeAnnuleren: 'CMDESC',
    textUitgenomen: 'Uitgenomen',
    textVerzonden: 'Verzonden',
    textKlaar: 'Klaar'
  };

  function withDefaults(cfg) {
    var out = {}, k;
    for (k in DEFAULTS) out[k] = DEFAULTS[k];
    if (cfg) for (k in cfg) if (cfg[k] !== undefined && cfg[k] !== null) out[k] = cfg[k];
    return out;
  }

  /* Ruwe invoer opschonen: stuurtekens (o.a. GS/FNC1), witruimte en een
     eventuele AIM symbology identifier vooraan (bv. "]C1", "]d2", "]Q3"). */
  function clean(raw) {
    var s = String(raw === null || raw === undefined ? '' : raw);
    s = s.replace(/[\u0000-\u001F\u007F]/g, '');
    s = s.replace(/\s+/g, '');
    s = s.replace(/^\][A-Za-z][0-9A-Za-z]/, '');
    return s;
  }

  /* GS1-controlecijfer (modulo 10) over alle cijfers behalve het laatste.
     Vanaf rechts wisselen de gewichten 3, 1, 3, 1, ... */
  function gs1CheckDigit(digitsWithoutCheck) {
    var sum = 0, weight = 3, i;
    for (i = digitsWithoutCheck.length - 1; i >= 0; i--) {
      sum += (digitsWithoutCheck.charCodeAt(i) - 48) * weight;
      weight = weight === 3 ? 1 : 3;
    }
    return (10 - (sum % 10)) % 10;
  }

  function isValidSscc(s) {
    if (!/^[0-9]{18}$/.test(s)) return false;
    return gs1CheckDigit(s.slice(0, 17)) === s.charCodeAt(17) - 48;
  }

  function err(code, message, detail) {
    return { type: 'error', code: code, message: message, detail: detail || '' };
  }

  /*
   * Eén scan (of getypte regel) ontleden.
   * Resultaat is één van:
   *   { type: 'sscc',     sscc: '18 cijfers' }
   *   { type: 'location', location: 'A03' }
   *   { type: 'command',  command: 'UITGENOMEN' | 'VERZONDEN' | 'KLAAR' | 'ANNULEREN' }
   *   { type: 'error',    code, message, detail }
   */
  function parseScan(raw, cfg) {
    var c = withDefaults(cfg);
    var s = clean(raw);
    if (!s) return err('empty', 'Lege invoer');
    var upper = s.toUpperCase();
    var shown = s.length > 30 ? s.slice(0, 30) + '…' : s;

    // 1. Commando-barcodes (reserve voor de functietoetsen)
    if (c.barcodeUitgenomen && upper === String(c.barcodeUitgenomen).toUpperCase()) return { type: 'command', command: 'UITGENOMEN' };
    if (c.barcodeVerzonden && upper === String(c.barcodeVerzonden).toUpperCase()) return { type: 'command', command: 'VERZONDEN' };
    if (c.barcodeKlaar && upper === String(c.barcodeKlaar).toUpperCase()) return { type: 'command', command: 'KLAAR' };
    if (c.barcodeAnnuleren && upper === String(c.barcodeAnnuleren).toUpperCase()) return { type: 'command', command: 'ANNULEREN' };

    var pattern = new RegExp(c.locationPattern);

    // 2. Locatie met prefix (de barcode op het rek)
    var prefix = String(c.locationPrefix || '').toUpperCase();
    if (prefix && upper.indexOf(prefix) === 0) {
      var loc = upper.slice(prefix.length);
      if (!pattern.test(loc)) return err('bad_location', 'Ongeldige locatie', 'Gelezen: ' + shown);
      return { type: 'location', location: loc };
    }

    // 3. SSCC: "(00)" + 18 cijfers, "00" + 18 cijfers, of 18 cijfers
    var paren = /^\(00\)([0-9]*)$/.exec(s);
    var digits = null;
    if (paren) {
      digits = paren[1];
      if (digits.length !== 18) return err('sscc_length', 'SSCC moet 18 cijfers zijn', 'Gelezen: ' + digits.length + ' cijfers');
    } else if (/^[0-9]+$/.test(s)) {
      if (s.length === 20 && s.slice(0, 2) === '00') digits = s.slice(2);
      else if (s.length === 18) digits = s;
      else if (!(c.allowBareLocation && pattern.test(upper))) {
        return err('not_sscc', 'Geen SSCC', 'Gelezen: ' + s.length + ' cijfers. Scan de barcode met (00).');
      }
    }
    if (digits !== null) {
      if (!isValidSscc(digits)) return err('sscc_check', 'SSCC ongeldig: controlecijfer fout', 'Gelezen: ' + digits);
      return { type: 'sscc', sscc: digits };
    }

    // 4. Getypte locatie zonder prefix (alleen als ze op het locatiepatroon past)
    if (c.allowBareLocation && pattern.test(upper)) return { type: 'location', location: upper };

    return err('unknown', 'Onbekende barcode', 'Gelezen: ' + shown);
  }

  function tail(sscc) { return '…' + String(sscc).slice(-6); }

  /*
   * Beslissen wat er gebeurt, gegeven de open pallet (SSCC of null) en een
   * ontlede scan. Resultaat is één van:
   *   { do: 'open',   sscc }
   *   { do: 'write',  sscc, target }      target = locatie, "Uitgenomen", "Verzonden" of "Klaar"
   *   { do: 'cancel', sscc }
   *   { do: 'ignore' }                    niets doen (bv. dezelfde pallet opnieuw gescand)
   *   { do: 'error',  message, detail }
   */
  function decide(openSscc, parsed, cfg) {
    var c = withDefaults(cfg);
    if (!parsed || parsed.type === 'error') {
      return { do: 'error', message: parsed ? parsed.message : 'Onbekende invoer', detail: parsed ? parsed.detail : '' };
    }
    if (parsed.type === 'sscc') {
      if (!openSscc) return { do: 'open', sscc: parsed.sscc };
      if (openSscc === parsed.sscc) return { do: 'ignore' };
      return { do: 'error', message: 'Er staat nog een pallet open', detail: 'Geef pallet ' + tail(openSscc) + ' eerst een plaats of status, of annuleer.' };
    }
    if (parsed.type === 'location') {
      if (!openSscc) return { do: 'error', message: 'Eerst pallet scannen', detail: 'Locatie ' + parsed.location + ' is niet weggeschreven.' };
      return { do: 'write', sscc: openSscc, target: parsed.location };
    }
    if (parsed.type === 'command') {
      if (parsed.command === 'ANNULEREN') return openSscc ? { do: 'cancel', sscc: openSscc } : { do: 'ignore' };
      if (!openSscc) return { do: 'error', message: 'Eerst pallet scannen', detail: 'Er staat geen pallet open.' };
      if (parsed.command === 'UITGENOMEN') return { do: 'write', sscc: openSscc, target: c.textUitgenomen };
      if (parsed.command === 'VERZONDEN') return { do: 'write', sscc: openSscc, target: c.textVerzonden };
      if (parsed.command === 'KLAAR') return { do: 'write', sscc: openSscc, target: c.textKlaar };
    }
    return { do: 'error', message: 'Onbekende invoer', detail: '' };
  }

  return {
    DEFAULTS: DEFAULTS,
    clean: clean,
    gs1CheckDigit: gs1CheckDigit,
    isValidSscc: isValidSscc,
    parseScan: parseScan,
    decide: decide
  };
});
