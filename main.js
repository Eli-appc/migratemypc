const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { scanInstalledPrograms } = require('./scanner')
const { loadData, saveData } = require('./storage')

const DIALOG_STRINGS = {
  he: {
    chooseFolder: 'בחר תיקייה לגיבוי',
    chooseInstaller: 'בחר קובץ התקנה',
    installerFilterName: 'קבצי התקנה',
    allFilesFilterName: 'כל הקבצים'
  },
  en: {
    chooseFolder: 'Choose folder to back up',
    chooseInstaller: 'Choose installer file',
    installerFilterName: 'Installer files',
    allFilesFilterName: 'All files'
  }
}

function dialogStrings(lang) {
  return DIALOG_STRINGS[lang] || DIALOG_STRINGS.he
}

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

ipcMain.handle('start-export', async (event, exportFolder, data) => {
const os = require('os')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const log = []

try {
    // יצירת תיקיית הייצוא
    const exportPath = path.join(exportFolder, 'MigrateMyPC_Export')
    if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath, { recursive: true })

    // 1. שמירת manifest
    const manifest = {
      exportDate: new Date().toISOString(),
      computerName: require('os').hostname(),
      programs: data.programs,
      programsData: data.programsData,
      foldersData: data.foldersData
    }
    fs.writeFileSync(
      path.join(exportPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    )
    log.push('Saved program list and settings (manifest.json)')

    // 2. winget export
    try {
      const wingetPath = path.join(exportPath, 'winget-packages.json')
      // חיפוש winget במיקומים אפשריים
      const wingetLocations = [
        'winget',
        'C:\\Program Files\\WindowsApps\\Microsoft.DesktopAppInstaller_*\\winget.exe',
        process.env.LOCALAPPDATA + '\\Microsoft\\WindowsApps\\winget.exe'
      ]
      
      let wingetCmd = null
      for (const loc of wingetLocations) {
        try {
          execSync(`"${loc}" --version`, { windowsHide: true, stdio: 'ignore' })
          wingetCmd = loc
          break
        } catch {}
      }

      // כתיבת סקריפט זמני
      const wingetScript = `winget export -o "${wingetPath.replace(/\\/g, '\\\\')}" --ignore-unavailable`
      const wingetScriptPath = path.join(os.tmpdir(), 'migratemypc_winget.ps1')
      fs.writeFileSync(wingetScriptPath, wingetScript, 'utf8')
      execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${wingetScriptPath}"`,
        { windowsHide: true, timeout: 60000 }
      )
      try { fs.unlinkSync(wingetScriptPath) } catch {}
      log.push('Saved winget package list (winget-packages.json)')
    } catch (e) {
      log.push('winget export skipped: ' + e.message.substring(0, 50))
    }

    // 3. העתקת קבצי התקנה
    const installersPath = path.join(exportPath, 'installers')
    let installersCopied = 0
    for (const [id, saved] of Object.entries(data.programsData)) {
      if (saved.installer && fs.existsSync(saved.installer)) {
        if (!fs.existsSync(installersPath)) fs.mkdirSync(installersPath)
        const fileName = path.basename(saved.installer)
        fs.copyFileSync(saved.installer, path.join(installersPath, fileName))
        installersCopied++
      }
    }
    if (installersCopied > 0) log.push(`Copied ${installersCopied} installer files`)

    // 4. העתקת תיקיות נתונים של תוכנות
    const appDataPath = path.join(exportPath, 'appdata')
    let appDataCopied = 0
    for (const program of data.programs) {
      if (!program.detectedDataFolders || program.detectedDataFolders.length === 0) continue
      for (const folder of program.detectedDataFolders) {
        const expanded = folder
          .replace(/%APPDATA%/gi, process.env.APPDATA)
          .replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA)
          .replace(/%USERPROFILE%/gi, process.env.USERPROFILE)
          .replace(/%PROGRAMDATA%/gi, process.env.PROGRAMDATA)

        // טיפול בתבנית עם * (למשל AndroidStudio*)
        const hasWildcard = expanded.includes('*')
        const baseDir = hasWildcard ? path.dirname(expanded) : expanded
        const pattern = hasWildcard ? path.basename(expanded).replace('*', '') : null

        try {
          let foldersToProcess = []
          if (hasWildcard && fs.existsSync(baseDir)) {
            const entries = fs.readdirSync(baseDir)
            foldersToProcess = entries
              .filter(e => e.startsWith(pattern))
              .map(e => path.join(baseDir, e))
          } else if (fs.existsSync(baseDir)) {
            foldersToProcess = [baseDir]
          }

          for (const src of foldersToProcess) {
            const stat = fs.statSync(src)
            const safeName = program.name.replace(/[<>:"/\\|?*]/g, '_')
            const dest = path.join(appDataPath, safeName, path.basename(src))
            if (stat.isDirectory()) {
              execSync(`robocopy "${src}" "${dest}" /E /NFL /NDL /NJH /NJS /nc /ns /np`, { windowsHide: true })
            } else {
              if (!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest), { recursive: true })
              fs.copyFileSync(src, dest)
            }
            appDataCopied++
          }
        } catch {}
      }
    }
    if (appDataCopied > 0) log.push(`Backed up app data for ${appDataCopied} locations`)

    // 5. דחיסת תיקיות מותאמות אישית
    const customFoldersPath = path.join(exportPath, 'custom_folders')
    let foldersCopied = 0
    for (const folder of data.foldersData) {
      if (!folder.path || !fs.existsSync(folder.path)) continue
      if (!fs.existsSync(customFoldersPath)) fs.mkdirSync(customFoldersPath)
      const folderName = path.basename(folder.path)
      const zipPath = path.join(customFoldersPath, folderName + '.zip')
      try {
        execSync(
          `powershell -NoProfile -Command "Compress-Archive -Path '${folder.path}' -DestinationPath '${zipPath}' -Force"`,
          { windowsHide: true, timeout: 300000 }
        )
        foldersCopied++
      } catch {}
    }
    if (foldersCopied > 0) log.push(`Compressed ${foldersCopied} custom folders`)

    // 6. קובץ README
    const readme = `MigrateMyPC Export
==================
Date: ${new Date().toLocaleString()}
Computer: ${require('os').hostname()}

Contents:
- manifest.json: Program list and license info
- winget-packages.json: Run "winget import winget-packages.json" to reinstall programs
- installers/: Installer files
- appdata/: App settings and data
- custom_folders/: Your selected folders (compressed)

To restore on new PC:
1. Install MigrateMyPC
2. Open the app and click "Import"
3. Select this MigrateMyPC_Export folder
`
    fs.writeFileSync(path.join(exportPath, 'README.txt'), readme, 'utf8')

    return { success: true, exportPath, log }

  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('browse-folder', async (event) => {
  const { dialog } = require('electron')
  const strings = dialogStrings('en')
  const result = await dialog.showOpenDialog({
    title: strings.chooseFolder,
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

ipcMain.handle('browse-file', async (event, lang) => {
  const { dialog } = require('electron')
  const strings = dialogStrings('en')
  const result = await dialog.showOpenDialog({
    title: strings.chooseInstaller,
    filters: [
      { name: strings.installerFilterName, extensions: ['exe', 'msi', 'msix', 'appx'] },
      { name: strings.allFilesFilterName, extensions: ['*'] }
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