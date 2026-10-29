// Builds docs/recording-sheet.md (what the tutor reads, in order) and audio/sessions.json (the same order, for split_recording.py).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const items = JSON.parse(readFileSync(new URL("../audio/items.json", import.meta.url), "utf8"));
const PER = 40;
const sessions = [];
for (let i = 0; i < items.length; i += PER) sessions.push(items.slice(i, i + PER));
writeFileSync(new URL("../audio/sessions.json", import.meta.url), JSON.stringify(sessions.map(s => s.map(x => x.id))));
let md = `# Recording sheet

For a native speaker from the coast (Bandar Abbas, Qeshm, Hormuz or Bushehr). ${items.length} items in ${sessions.length} sessions of up to ${PER}, about 5 minutes each.

## Pass A: read these in your own natural way

- Say each line the way you would say it to a friend at home. **Don't switch to a "TV" or Tehran accent.** Your own southern accent is the point of the recording.
- Leave a **2-second pause** between lines, and don't speak during the pause.
- Record each session as one file, in a quiet room, with the phone about 20 cm from your mouth.
- If you make a mistake, stop and start that session again. Don't repeat a line in the middle, because it throws off the automatic cutting.

## Pass B: the local way to say it (separate, unscripted)

After Pass A, go through the Stage 1 phrases again and ask: *اینو بندری چطوری میگید؟* (How do you say this in Bandari?). Record those answers freely. They go into the app's South notebook by hand, not through the cutting tool.

Agree in writing that the recordings are for your personal study app, and pay for the session time.
`;
sessions.forEach((s, k) => {
  md += `\n## Session ${k + 1}\n\n| # | Persian | Reading | Meaning |\n|---|---|---|---|\n`;
  s.forEach((x, i) => { md += `| ${i + 1} | ${x.fa} | ${x.tr} | ${x.en} |\n`; });
});
mkdirSync(new URL("../docs", import.meta.url), { recursive: true });
writeFileSync(new URL("../docs/recording-sheet.md", import.meta.url), md);
console.log(`docs/recording-sheet.md: ${sessions.length} sessions`);
