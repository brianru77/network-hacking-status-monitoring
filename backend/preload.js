const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getNetworkUsage: () => ipcRenderer.invoke('getNetworkUI'),
});