// Pulls every spoken item out of src/index.html into audio/items.json, so audio tools never drift from the app's content.
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
const html = readFileSync(new URL("../src/index.html", import.meta.url), "utf8");
const content = html.split("/* ---------- content ---------- */")[1].split("/* ---------- state & storage ---------- */")[0];
const ctx = {};
vm.runInNewContext(content + ";this.out={CHUNKS,WORDS,VOCAB,LETTERS,FRAMES};", ctx);
const { CHUNKS, WORDS, VOCAB, LETTERS, FRAMES } = ctx.out;
const items = [];
const add = (id, fa, tr, en, frame) => { if (fa && !fa.includes("___")) items.push({ id, fa: fa.replace(/\s*\.\.\.\s*/g, " ").replace(/\s*\/\s*/g, "، ").replace(/\s*ـه/g, "").trim(), tr, en, ...(frame ? { frame } : {}) }); };
CHUNKS.forEach(c => add(c.id, c.fa, c.tr, c.en));
WORDS.forEach(w => { add(w.id, w.fa, w.tr, w.en); add(w.id + "_s", w.s, w.st, `This is a ${w.en}.`); });
VOCAB.forEach(v => add(v.id, v.fa, v.tr, v.en));
LETTERS.forEach((l, i) => add("l" + String(i).padStart(2, "0"), l[4], l[5], l[6]));
// every sentence-builder combination (same rule as frameFor in the app), so builder sentences have recorded audio too
VOCAB.forEach(v => (FRAMES[v.cat] || []).forEach((f, k) => {
  const tr = /[aeiouâ]$/.test(v.tr) ? f[1].replace("___-am", "___m") : f[1];
  add(`${v.id}_f${k}`, f[0].replace("___", v.fa), tr.replace("___", v.tr), f[2].replace("___", v.en.split(" / ")[0]), { word: v.fa, wid: v.id, cat: v.cat, k });
}));
// one recording per distinct text+reading (کی is both ki "who" and key "when"); first id wins
const seen = new Set(); const uniq = items.filter(x => !seen.has(x.fa + "|" + x.tr) && seen.add(x.fa + "|" + x.tr));
writeFileSync(new URL("../audio/items.json", import.meta.url), JSON.stringify(uniq, null, 1));
console.log(`${uniq.length} items -> audio/items.json`);
