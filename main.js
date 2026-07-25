const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { scanInstalledPrograms } = require('./scanner')
const { loadData, saveData } = require('./storage')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
}

// האזנה לבקשת סריקה מהממשק
ipcMain.handle('scan-programs', async () => {
  return scanInstalledPrograms()
})

ipcMain.handle('load-data', async () => {
  return loadData()
})

ipcMain.handle('save-data', async (event, data) => {
  return saveData(data)
})

ipcMain.handle('browse-folder', async (event) => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog({
    title: 'בחר תיקייה לגיבוי',
    properties: ['openDirectory', 'multiSelections']
  })
  if (result.canceled) return null
  return result.filePaths
})

ipcMain.handle('get-folder-size', async (event, folderPath) => {
  const fs = require('fs')
  const path = require('path')

  function getDirSize(dirPath) {
    let size = 0
    try {
      const items = fs.readdirSync(dirPath)
      for (const item of items) {
        const fullPath = path.join(dirPath, item)
        try {
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) {
            size += getDirSize(fullPath)
          } else {
            size += stat.size
          }
        } catch {}
      }
    } catch {}
    return size
  }

  return getDirSize(folderPath)
})

ipcMain.handle('browse-file', async (event) => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog({
    title: 'בחר קובץ התקנה',
    filters: [
      { name: 'קבצי התקנה', extensions: ['exe', 'msi', 'msix', 'appx'] },
      { name: 'כל הקבצים', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})