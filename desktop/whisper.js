// On-device speech recognition with whisper.cpp: downloads a model once, then transcribes short recordings locally.
const { app, net } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const BASE = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";
const MODELS = {
  "large-v3-turbo-q5_0": { label: "Accurate (large-v3-turbo)", approx: "about 550 MB", note: "Best Persian accuracy. Fast on Apple Silicon; a few seconds per phrase on most PCs." },
  "small": { label: "Balanced (small)", approx: "about 470 MB", note: "Less accurate for Persian, lighter on older computers." },
  "base": { label: "Light (base)", approx: "about 140 MB", note: "Quick, but often wrong on Persian. Only for slow machines." },
};

const modelDir = () => path.join(app.getPath("userData"), "models");
const modelPath = (id) => path.join(modelDir(), `ggml-${id}.bin`);
const settingsPath = () => path.join(app.getPath("userData"), "speech.json");
const threads = () => Math.max(1, Math.min(8, (os.availableParallelism?.() ?? os.cpus().length) - 1));

function binPath() {
  const exe = process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli";
  if (app.isPackaged) return path.join(process.resourcesPath, "bin", exe);
  const tag = { darwin: "mac", win32: "win", linux: "linux" }[process.platform];
  return path.join(__dirname, "bin", `${tag}-${process.arch}`, exe);
}

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath(), "utf8")); } catch { return {}; }
}
function writeSettings(s) { fs.writeFileSync(settingsPath(), JSON.stringify(s)); }

function info() {
  const active = readSettings().model;
  return {
    platform: process.platform, arch: process.arch, threads: threads(),
    memoryGB: Math.round(os.totalmem() / 2 ** 30),
    accel: process.platform === "darwin" ? "Metal GPU" : "CPU",
    engine: fs.existsSync(binPath()),
    models: Object.entries(MODELS).map(([id, m]) => ({ id, ...m, installed: fs.existsSync(modelPath(id)) })),
    active: active && fs.existsSync(modelPath(active)) ? active : null,
  };
}

let download = null;
async function downloadModel(id, onProgress) {
  if (!MODELS[id]) throw new Error("Unknown model");
  if (download) throw new Error("A download is already running");
  fs.mkdirSync(modelDir(), { recursive: true });
  const part = modelPath(id) + ".part";
  const ctrl = new AbortController();
  download = ctrl;
  try {
    const res = await net.fetch(`${BASE}/ggml-${id}.bin`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
    const total = Number(res.headers.get("content-length")) || 0;
    const out = fs.createWriteStream(part);
    let got = 0, last = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      if (!out.write(value)) await new Promise((r) => out.once("drain", r));
      if (Date.now() - last > 250) { last = Date.now(); onProgress({ id, got, total }); }
    }
    await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
    if (total && got !== total) throw new Error("Download was incomplete. Try again.");
    fs.renameSync(part, modelPath(id));
    writeSettings({ ...readSettings(), model: id });
    onProgress({ id, got, total, done: true });
    return info();
  } catch (e) {
    fs.rmSync(part, { force: true });
    throw ctrl.signal.aborted ? new Error("Download cancelled") : e;
  } finally {
    download = null;
  }
}
function cancelDownload() { download?.abort(); }

function deleteModel(id) {
  fs.rmSync(modelPath(id), { force: true });
  const s = readSettings();
  if (s.model === id) writeSettings({ ...s, model: null });
  return info();
}
function useModel(id) {
  if (!fs.existsSync(modelPath(id))) throw new Error("That model isn't downloaded");
  writeSettings({ ...readSettings(), model: id });
  return info();
}

// wav: 16 kHz mono 16-bit WAV bytes, piped on stdin so no temporary file (or non-ASCII path) is involved.
// No prompt is given, so the recogniser can't be nudged towards hearing the expected phrase.
function transcribe(wav) {
  const id = info().active;
  if (!id) return Promise.reject(new Error("Download a speech model first"));
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(binPath(), ["-m", modelPath(id), "-f", "-", "-l", "fa", "-nt", "-np", "-t", String(threads())],
      { windowsHide: true });
    const out = [], err = [];
    const timer = setTimeout(() => { child.kill(); reject(new Error("Speech recognition took too long")); }, 120000);
    child.stdout.on("data", (d) => out.push(d));
    child.stderr.on("data", (d) => err.push(d));
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(Buffer.concat(err).toString("utf8").trim().split("\n").pop() || `whisper-cli exited with ${code}`));
      resolve({ text: Buffer.concat(out).toString("utf8").replace(/\s+/g, " ").trim(), ms: Date.now() - started, model: id });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(Buffer.from(wav));
  });
}

module.exports = { MODELS, info, downloadModel, cancelDownload, deleteModel, useModel, transcribe, binPath };
