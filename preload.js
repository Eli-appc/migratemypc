const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  scanPrograms: () => ipcRenderer.invoke('scan-programs'),
  browseFile: () => ipcRenderer.invoke('browse-file'),
  browseFolder: () => ipcRenderer.invoke('browse-folder'),
  getFolderSize: (path) => ipcRenderer.invoke('get-folder-size', path),
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data)
})