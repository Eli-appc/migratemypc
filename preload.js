const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  scanPrograms: () => ipcRenderer.invoke('scan-programs')
})