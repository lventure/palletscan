/* Draait de tests van cases.js in Node: node tests/run.js */
'use strict';
var path = require('path');
var L = require(path.join(__dirname, '..', 'scanlogic.js'));
var run = require(path.join(__dirname, 'cases.js'));
var results = run(L);
var ok = 0;
results.forEach(function (r) {
  if (r.ok) { ok++; console.log('  ok    ' + r.name); }
  else { console.log('  FOUT  ' + r.name + '\n        ' + r.detail); }
});
console.log('\n' + ok + ' van ' + results.length + ' tests geslaagd.');
process.exit(ok === results.length ? 0 : 1);
