const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  scanPrograms: () => ipcRenderer.invoke('scan-programs'),
  browseFile: () => ipcRenderer.invoke('browse-file'),
  browseFolder: () => ipcRenderer.invoke('browse-folder'),
  getFolderSize: (path) => ipcRenderer.invoke('get-folder-size', path),
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  startExport: (folder, data) => ipcRenderer.invoke('start-export', folder, data),
  loadManifest: (folder) => ipcRenderer.invoke('load-manifest', folder),
  startImport: (folder, options) => ipcRenderer.invoke('start-import', folder, options),
  openPath: (p) => ipcRenderer.invoke('open-path', p)
})