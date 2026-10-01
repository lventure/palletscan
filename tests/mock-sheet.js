/*
 * Nagebootste Google Sheet + Apps Script-omgeving voor de tests.
 * De nagebootste Sheet doet zoals de echte: tekst die op een getal lijkt wordt
 * een getal, TENZIJ de cel vooraf als tekst ("@") is opgemaakt.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

function makeWorld() {
  const sheets = {};
  let lockHeld = false;
  function makeSheet(name) {
    const cells = [], formats = [];
    let maxRows = 3;
    const sheet = {
      cells, formats, frozen: 0,
      getName: () => name,
      getLastRow: () => { for (let r = cells.length - 1; r >= 0; r--) if (cells[r] && cells[r].some(v => v !== '' && v !== undefined)) return r + 1; return 0; },
      getMaxRows: () => maxRows,
      insertRowsAfter: (after, n) => { maxRows += n; },
      setFrozenRows: n => { sheet.frozen = n; },
      getRange: (row, col, nr, nc) => {
        if (row + nr - 1 > maxRows) throw new Error('buiten de Sheet: rij ' + (row + nr - 1) + ' > ' + maxRows);
        if (!lockHeld && row > 1) throw new Error('schrijven/lezen zonder slot');
        const range = {
          setNumberFormat: f => { for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) { (formats[row - 1 + r] = formats[row - 1 + r] || [])[col - 1 + c] = f; } return range; },
          setFontWeight: () => range,
          getValues: () => Array.from({ length: nr }, (_, r) => Array.from({ length: nc }, (_, c) => (cells[row - 1 + r] || [])[col - 1 + c] ?? '')),
          setValues: vals => {
            for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
              let v = vals[r][c];
              const f = (formats[row - 1 + r] || [])[col - 1 + c];
              if (typeof v === 'string' && f !== '@' && /^-?\d+(\.\d+)?$/.test(v)) v = Number(v); // gedrag van Sheets
              (cells[row - 1 + r] = cells[row - 1 + r] || [])[col - 1 + c] = v;
            }
            return range;
          }
        };
        return range;
      }
    };
    return sheet;
  }
  const ss = {
    getSheetByName: n => sheets[n] || null,
    insertSheet: n => (sheets[n] = makeSheet(n)),
    getNumSheets: () => Object.keys(sheets).length
  };
  sheets['Stock'] = makeSheet('Stock'); // een ander tabblad dat onaangeroerd moet blijven
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush: () => {} },
    LockService: { getScriptLock: () => ({ tryLock: () => { lockHeld = true; return true; }, releaseLock: () => { lockHeld = false; } }) },
    Utilities: {
      formatDate: (date, tz, fmt) => {
        if (fmt !== 'yyyy,M,d,H,m,s') throw new Error('onverwacht formaat ' + fmt);
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(date).map(x => [x.type, x.value]));
        return [p.year, p.month, p.day, p.hour, p.minute, p.second].map(Number).join(',');
      }
    },
    ContentService: { MimeType: { JSON: 'json', TEXT: 'text' }, createTextOutput: t => ({ text: t, setMimeType() { return this; } }) },
    Logger: { log: () => {} }
  };
  vm.createContext(ctx);
  let code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  code = code.replace("'VERVANG-DIT-DOOR-EEN-EIGEN-SLEUTEL'", "'test-sleutel'");
  vm.runInContext(code, ctx);
  const post = body => JSON.parse(ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).text);
  return { ctx, sheets, post };
}

module.exports = { makeWorld };
