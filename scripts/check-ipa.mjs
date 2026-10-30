// Runs the IPA letter-matching over every card (and every sentence-builder combination) and fails if any can't be matched.
// Usage: node scripts/check-ipa.mjs [--show]   (--show prints every result for review)
import { readFileSync } from "node:fs";
import vm from "node:vm";
const html = readFileSync(new URL("../src/index.html", import.meta.url), "utf8");
const between = (a, b) => html.split(a)[1].split(b)[0];
const ctx = {};
vm.runInNewContext(between("/* ---------- content ---------- */", "/* ---------- state & storage ---------- */")
  + between("/* ---------- ipa ---------- */", "/* ---------- ipa end ---------- */")
  + ";this.out={CHUNKS,WORDS,VOCAB,LETTERS,FRAMES,alignIpa,ipaString};", ctx);
const { CHUNKS, WORDS, VOCAB, LETTERS, FRAMES, alignIpa, ipaString } = ctx.out;
const items = [];
CHUNKS.forEach(c => items.push([c.id, c.fa, c.tr]));
WORDS.forEach(w => { items.push([w.id, w.fa, w.tr]); items.push(w.id + "_s", w.s, w.st) && items.push([w.id + "_s", w.s, w.st]); });
VOCAB.forEach(v => items.push([v.id, v.fa, v.tr]));
LETTERS.forEach((l, i) => items.push(["l" + i, l[4], l[5]]));
for (const v of VOCAB) for (const f of FRAMES[v.cat] || []) {
  const tr = /[aeiouâ]$/.test(v.tr) ? f[1].replace("___-am", "___m") : f[1];
  items.push([v.id + "+frame", f[0].replace("___", v.fa), tr.replace("___", v.tr)]);
}
const real = items.filter(x => Array.isArray(x));
let bad = 0;
const show = process.argv.includes("--show");
for (const [id, fa, tr] of real) {
  const al = alignIpa(fa, tr);
  if (!al) { bad++; console.log(`NO MATCH ${id.padEnd(14)} ${fa}  |  ${tr}`); continue; }
  if (show) console.log(`${id.padEnd(14)} ${ipaString(al, false).padEnd(30)} ${ipaString(al, true).padEnd(34)} ` +
    al.map(l => l.ch + "=" + (l.sounds.map(s => (s.written ? "" : "+") + s.p + (s.gem ? "ː" : "")).join("") || "∅")).join(" "));
}
console.log(`\n${real.length - bad} of ${real.length} lines matched letter by letter`);
process.exit(bad ? 1 : 0);
