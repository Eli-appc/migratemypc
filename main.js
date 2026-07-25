const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { scanInstalledPrograms } = require('./scanner')

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

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})