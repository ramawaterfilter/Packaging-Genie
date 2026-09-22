// Runs the built-in engine self-tests from index.html in Node.js (used by CI).
// Usage: node tests/run-tests.mjs
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/<script id="engine-src">([\s\S]*?)<\/script>/);
if (!match) {
  console.error('Engine script block not found in index.html');
  process.exit(1);
}
const factory = new Function(`${match[1]}\nreturn PalletEngineFactory;`)();
const Engine = factory();

const t0 = Date.now();
const res = Engine.runSelfTests(null, {});
let group = '';
for (const r of res.results) {
  if (r.group !== group) {
    group = r.group;
    console.log(`\n== ${group}`);
  }
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}\n      ${r.detail}`);
}
console.log(`\n${res.passed}/${res.total} checks passed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(res.failed ? 1 : 0);
