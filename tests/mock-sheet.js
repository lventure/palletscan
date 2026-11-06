/*
 * Nagebootste Google Sheet + Apps Script-omgeving om Code.gs in Node te
 * testen. Volgt het gedrag van Google voor wat Code.gs gebruikt: getRange,
 * getValues/setValues/setValue, setNumberFormat, getLastRow, getMaxRows,
 * insertRowsAfter, LockService, Utilities.formatDate, ContentService.
 */
'use strict';
var fs = require('fs');
var vm = require('vm');
var path = require('path');

function makeWorld(opts) {
  opts = opts || {};
  var sheets = {};
  function Sheet(name, rows) {
    this.name = name;
    this.rows = rows || [];     // array van arrays, rij 0 = rij 1 in de Sheet
    this.formats = {};          // "r,c" -> formaat
    this.maxRows = Math.max(1000, this.rows.length);
    this.frozen = 0;
  }
  Sheet.prototype.getName = function () { return this.name; };
  Sheet.prototype.getLastRow = function () {
    for (var r = this.rows.length - 1; r >= 0; r--) {
      if ((this.rows[r] || []).some(function (v) { return v !== '' && v !== null && v !== undefined; })) return r + 1;
    }
    return 0;
  };
  Sheet.prototype.getMaxRows = function () { return this.maxRows; };
  Sheet.prototype.insertRowsAfter = function (after, n) { this.maxRows += n; };
  Sheet.prototype.setFrozenRows = function (n) { this.frozen = n; };
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    var self = this; nr = nr || 1; nc = nc || 1;
    var range = {
      getValues: function () {
        var out = [];
        for (var i = 0; i < nr; i++) { var row = []; for (var j = 0; j < nc; j++) { var v = (self.rows[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); } out.push(row); }
        return out;
      },
      setValues: function (vals) {
        if (vals.length !== nr || vals.some(function (x) { return x.length !== nc; })) throw new Error('setValues: verkeerde afmetingen');
        for (var i = 0; i < nr; i++) { while (self.rows.length < r + i) self.rows.push([]); for (var j = 0; j < nc; j++) {
          var f = self.formats[(r + i) + ',' + (c + j)];
          var v = vals[i][j];
          if (f !== '@' && typeof v === 'string' && /^[0-9]+$/.test(v)) v = Number(v); // zonder tekstformaat wordt een cijferreeks een getal
          self.rows[r - 1 + i][c - 1 + j] = v;
        } }
        return range;
      },
      setValue: function (v) { return range.setValues([[v]]); },
      setNumberFormat: function (f) { for (var i = 0; i < nr; i++) for (var j = 0; j < nc; j++) self.formats[(r + i) + ',' + (c + j)] = f; return range; },
      setFontWeight: function () { return range; }
    };
    return range;
  };

  var ss = {
    getSheetByName: function (n) { return sheets[n] || null; },
    insertSheet: function (n) { sheets[n] = new Sheet(n, []); return sheets[n]; },
    getNumSheets: function () { return Object.keys(sheets).length; }
  };
  if (opts.scans) sheets['Scans'] = new Sheet('Scans', opts.scans);

  var lockHeld = false;
  var ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: function () { return ss; }, flush: function () {} },
    LockService: { getScriptLock: function () { return {
      tryLock: function () { if (lockHeld || opts.locked) return false; lockHeld = true; return true; },
      releaseLock: function () { lockHeld = false; }
    }; } },
    Utilities: { formatDate: function (date, tz, fmt) {
      // alleen 'yyyy,M,d,H,m,s' in Europe/Brussels
      var s = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(date);
      var p = {}; s.forEach(function (x) { p[x.type] = x.value; });
      return [p.year, p.month, p.day, p.hour === '24' ? '0' : p.hour, p.minute, p.second].join(',');
    } },
    ContentService: { createTextOutput: function (t) { return { text: t, setMimeType: function () { return this; } }; }, MimeType: { JSON: 'json', TEXT: 'text' } },
    Logger: { log: function () {} }
  };
  var code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  if (opts.key) code = code.replace("'VERVANG-DIT-DOOR-EEN-EIGEN-SLEUTEL'", JSON.stringify(opts.key));
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return {
    ctx: ctx,
    sheet: function () { return sheets['Scans'] || null; },
    post: function (body) { return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).text); }
  };
}
module.exports = { makeWorld: makeWorld };
