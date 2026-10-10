const {contextBridge, ipcRenderer} = require("electron");

const allowedExternalProtocols = new Set(["https:", "http:", "mailto:"]);

function normalizeExternalUrl(target) {
    const parsed = new URL(target);
    if (!allowedExternalProtocols.has(parsed.protocol)) {
        throw new Error(`Unsupported external URL protocol: ${parsed.protocol}`);
    }
    return parsed.toString();
}

const api = {
    openExternal: target => ipcRenderer.invoke("edex:openExternal", normalizeExternalUrl(target)),
    saveVisualPreferences: preferences => ipcRenderer.invoke("edex:saveVisualPreferences", preferences)
};

if (process.contextIsolated) {
    contextBridge.exposeInMainWorld("edex", api);
} else {
    window.edex = api;
}
