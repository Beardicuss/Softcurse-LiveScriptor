import { contextBridge, ipcRenderer } from "electron";

/**
 * Expose a limited API to the renderer process.
 * Currently minimal — expand as needed for native features.
 */
contextBridge.exposeInMainWorld("electronAPI", {
    platform: process.platform,
    getVersion: () => ipcRenderer.invoke("get-app-version"),
});
