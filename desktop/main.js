// Khalij Farsi desktop: the same app as the web and Android versions, plus on-device speech recognition.
const { app, BrowserWindow, protocol, net, ipcMain, session, systemPreferences, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const whisper = require("./whisper");

// Serve the app from app:// rather than file:// so fetch() of its own audio and data files works.
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);
const ROOT = path.join(__dirname, "app");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 860, minWidth: 420, minHeight: 600,
    title: "Khalij Farsi", backgroundColor: "#eef3f1",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.removeMenu?.();
  win.loadURL("app://khalij/index.html");
  // Links to websites open in the real browser; the app window never navigates away.
  const external = (url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); };
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("app://")) { e.preventDefault(); external(url); } });
}

app.whenReady().then(() => {
  protocol.handle("app", async (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, "") || "index.html";
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT + path.sep)) return new Response("Not found", { status: 404 });
    try { return await net.fetch(pathToFileURL(file).toString()); }
    catch { return new Response("Not found", { status: 404 }); }
  });

  // Microphone only; no camera, location or anything else.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb, details) =>
    cb(permission === "media" && (details.mediaTypes || []).every((t) => t === "audio")));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === "media");

  ipcMain.handle("khalij:info", () => whisper.info());
  ipcMain.handle("khalij:mic", async () =>
    process.platform === "darwin" ? systemPreferences.askForMediaAccess("microphone") : true);
  ipcMain.handle("khalij:download", (e, id) => whisper.downloadModel(id, (p) => e.sender.send("khalij:progress", p)));
  ipcMain.handle("khalij:cancel", () => whisper.cancelDownload());
  ipcMain.handle("khalij:delete", (_e, id) => whisper.deleteModel(id));
  ipcMain.handle("khalij:use", (_e, id) => whisper.useModel(id));
  ipcMain.handle("khalij:transcribe", (_e, wav) => whisper.transcribe(wav));

  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
