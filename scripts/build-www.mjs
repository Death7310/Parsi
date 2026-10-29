// src/index.html is written as a claude.ai Artifact page (no <html>/<head>); wrap it into a full document for the app.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
const page = readFileSync(new URL("../src/index.html", import.meta.url), "utf8");
const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>${page}</body></html>`;
mkdirSync(new URL("../www", import.meta.url), { recursive: true });
writeFileSync(new URL("../www/index.html", import.meta.url), doc);
// bundle recorded audio so it plays offline
for (const part of ["manifest.json", "tts", "tutor"]) {
  const from = new URL(`../audio/${part}`, import.meta.url);
  if (existsSync(from)) cpSync(from, new URL(`../www/audio/${part}`, import.meta.url), { recursive: true });
}
console.log("www/ written");
