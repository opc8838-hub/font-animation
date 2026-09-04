const assert = require('node:assert/strict');
const path = require('node:path');
require(path.resolve(__dirname,'../../../../site/ribbonink-sequence.js'));
const exit = globalThis.RibbonInkSequence.textExit;
assert.deepEqual(exit(0),{sx:1,sy:1,dx:0,alpha:1});
assert.equal(exit(1).alpha,0);
let previous=exit(0);
for(let i=1;i<=100;i++){
  const next=exit(i/100);
  assert.ok(next.alpha<=previous.alpha&&next.dx>=previous.dx&&next.sy>0);
  previous=next;
}
console.log('PASS: single-page text exit reuses deterministic rightward elastic collapse geometry');
