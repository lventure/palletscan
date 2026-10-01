#!/usr/bin/env node
/* Tests draaien met Node:  node tests/run.js  */
'use strict';
const path = require('path');
const L = require(path.join(__dirname, '..', 'scanlogic.js'));
const runScanLogicTests = require(path.join(__dirname, 'cases.js'));

const results = runScanLogicTests(L);
let failed = 0;
for (const r of results) {
  if (r.ok) console.log('  ok    ' + r.name);
  else { failed++; console.log('  FOUT  ' + r.name + '\n        ' + r.detail); }
}
console.log('\n' + (results.length - failed) + ' van ' + results.length + ' tests geslaagd.');
process.exit(failed ? 1 : 0);
