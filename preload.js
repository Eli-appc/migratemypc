const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  scanPrograms: () => ipcRenderer.invoke('scan-programs'),
  browseFile: () => ipcRenderer.invoke('browse-file'),
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data)
})