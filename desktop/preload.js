// The only bridge between the web app and the computer: speech recognition and model management, nothing else.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("khalijDesktop", {
  info: () => ipcRenderer.invoke("khalij:info"),
  micAccess: () => ipcRenderer.invoke("khalij:mic"),
  downloadModel: (id) => ipcRenderer.invoke("khalij:download", id),
  cancelDownload: () => ipcRenderer.invoke("khalij:cancel"),
  deleteModel: (id) => ipcRenderer.invoke("khalij:delete", id),
  useModel: (id) => ipcRenderer.invoke("khalij:use", id),
  transcribe: (wav) => ipcRenderer.invoke("khalij:transcribe", wav),
  onProgress: (fn) => {
    const handler = (_e, p) => fn(p);
    ipcRenderer.on("khalij:progress", handler);
    return () => ipcRenderer.removeListener("khalij:progress", handler);
  },
});
