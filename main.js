const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { exec } = require('child_process')
const { scanInstalledPrograms } = require('./scanner')
const { loadData, saveData } = require('./storage')

// מריץ פקודה ברקע בלי להקפיא את האפליקציה, ומחזיר את קוד היציאה (0 = הצלחה)
function runCommand(command, options = {}) {
  return new Promise((resolve) => {
    exec(command, { windowsHide: true, maxBuffer: 10 * 1024 * 1024, ...options }, (error) => {
      resolve(error ? (typeof error.code === 'number' ? error.code : 1) : 0)
    })
  })
}

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
  const log = []

  // שליחת עדכון התקדמות חי למסך
  const sendProgress = (text, percent) => {
    try { event.sender.send('export-progress', { text, percent }) } catch {}
  }

  try {
    // יצירת תיקיית הייצוא
    sendProgress('Creating export folder...', 3)
    const exportPath = path.join(exportFolder, 'MigrateMyPC_Export')
    if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath, { recursive: true })

    // 1. שמירת manifest
    sendProgress('Saving program list (manifest.json)...', 6)
    const manifest = {
      exportDate: new Date().toISOString(),
      computerName: os.hostname(),
      programs: data.programs,
      programsData: data.programsData,
      foldersData: data.foldersData
    }
    await fs.promises.writeFile(
      path.join(exportPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    )
    log.push('Saved program list and settings (manifest.json)')

    // 2. winget export - רץ ברקע בלי להקפיא את החלון
    sendProgress('Exporting winget package list (can take up to a minute)...', 10)
    try {
      const wingetPath = path.join(exportPath, 'winget-packages.json')
      const wingetScript = `winget export -o "${wingetPath.replace(/\\/g, '\\\\')}" --ignore-unavailable`
      const wingetScriptPath = path.join(os.tmpdir(), 'migratemypc_winget.ps1')
      await fs.promises.writeFile(wingetScriptPath, wingetScript, 'utf8')
      await runCommand(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${wingetScriptPath}"`,
        { timeout: 120000 }
      )
      try { fs.unlinkSync(wingetScriptPath) } catch {}
      if (fs.existsSync(wingetPath)) {
        log.push('Saved winget package list (winget-packages.json)')

        // הסרת תוכנות שהוחרגו מרשימת ההתקנה של winget
        // (winget מייצא תמיד את כל מה שמותקן, אז מסננים אחרי)
        if (data.excludedNames && data.excludedNames.length > 0) {
          try {
            const wj = JSON.parse(await fs.promises.readFile(wingetPath, 'utf8'))
            const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
            // שמות קצרים מדי עלולים להתאים בטעות לחבילות לא קשורות
            const excluded = data.excludedNames.map(norm).filter(n => n.length >= 4)
            let removed = 0
            for (const src of (wj.Sources || [])) {
              const before = (src.Packages || []).length
              src.Packages = (src.Packages || []).filter(pkg => {
                const idNorm = norm(pkg.PackageIdentifier)
                return !excluded.some(e => idNorm.includes(e))
              })
              removed += before - src.Packages.length
            }
            if (removed > 0) {
              await fs.promises.writeFile(wingetPath, JSON.stringify(wj, null, 2), 'utf8')
              log.push(`Removed ${removed} excluded programs from winget install list`)
            }
          } catch {}
        }
      } else {
        log.push('winget export skipped (winget not available)')
      }
    } catch (e) {
      log.push('winget export skipped: ' + e.message.substring(0, 50))
    }

    // 3. העתקת קבצי התקנה
    sendProgress('Copying installer files...', 25)
    const installersPath = path.join(exportPath, 'installers')
    let installersCopied = 0
    for (const [id, saved] of Object.entries(data.programsData)) {
      if (saved.installer && fs.existsSync(saved.installer)) {
        if (!fs.existsSync(installersPath)) fs.mkdirSync(installersPath)
        const fileName = path.basename(saved.installer)
        await fs.promises.copyFile(saved.installer, path.join(installersPath, fileName))
        installersCopied++
      }
    }
    if (installersCopied > 0) log.push(`Copied ${installersCopied} installer files`)

    // 4. העתקת תיקיות נתונים של תוכנות - עם דיווח התקדמות לכל תוכנה
    const appDataPath = path.join(exportPath, 'appdata')
    let appDataCopied = 0
    const programsWithFolders = data.programs.filter(p =>
      p.detectedDataFolders && p.detectedDataFolders.length > 0
    )
    let programIndex = 0

    for (const program of programsWithFolders) {
      programIndex++
      const percent = 30 + Math.round((programIndex / programsWithFolders.length) * 40) // 30% -> 70%
      sendProgress(`Backing up settings: ${program.name}`, percent)

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
              // robocopy מחזיר קודים 0-7 בהצלחה
              const code = await runCommand(`robocopy "${src}" "${dest}" /E /NFL /NDL /NJH /NJS /nc /ns /np`)
              if (code <= 7) appDataCopied++
            } else {
              if (!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest), { recursive: true })
              await fs.promises.copyFile(src, dest)
              appDataCopied++
            }
          }
        } catch {}
      }
    }
    if (appDataCopied > 0) log.push(`Backed up app data for ${appDataCopied} locations`)

    // 5. דחיסת תיקיות מותאמות אישית - עם דיווח התקדמות לכל תיקייה
    const customFoldersPath = path.join(exportPath, 'custom_folders')
    let foldersCopied = 0
    const validFolders = (data.foldersData || []).filter(f => f.path && fs.existsSync(f.path))
    let folderIndex = 0

    for (const folder of validFolders) {
      folderIndex++
      const percent = 70 + Math.round((folderIndex / validFolders.length) * 25) // 70% -> 95%
      sendProgress(`Compressing folder: ${path.basename(folder.path)} (large folders take time)`, percent)

      if (!fs.existsSync(customFoldersPath)) fs.mkdirSync(customFoldersPath)
      const folderName = path.basename(folder.path)
      const zipPath = path.join(customFoldersPath, folderName + '.zip')
      const code = await runCommand(
        `powershell -NoProfile -Command "Compress-Archive -Path '${folder.path}' -DestinationPath '${zipPath}' -Force"`,
        { timeout: 600000 }
      )
      if (code === 0) foldersCopied++
    }
    if (foldersCopied > 0) log.push(`Compressed ${foldersCopied} custom folders`)

    // 6. קובץ README
    sendProgress('Finishing up...', 97)
    const readme = `MigrateMyPC Export
==================
Date: ${new Date().toLocaleString()}
Computer: ${os.hostname()}

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
    await fs.promises.writeFile(path.join(exportPath, 'README.txt'), readme, 'utf8')

    sendProgress('Done!', 100)
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

// ═══ IMPORT (on the new PC) ═══

// קריאת manifest.json מתיקיית הייצוא ובדיקה מה יש בפנים
ipcMain.handle('load-manifest', async (event, folderPath) => {
  const fs = require('fs')
  const path = require('path')

  try {
    // המשתמש יכול לבחור את MigrateMyPC_Export עצמה, או את התיקייה שמכילה אותה
    let exportPath = folderPath
    if (!fs.existsSync(path.join(exportPath, 'manifest.json'))) {
      const candidate = path.join(exportPath, 'MigrateMyPC_Export')
      if (fs.existsSync(path.join(candidate, 'manifest.json'))) {
        exportPath = candidate
      } else {
        return { success: false, error: 'manifest.json not found in this folder. Please select the MigrateMyPC_Export folder.' }
      }
    }

    const manifest = JSON.parse(fs.readFileSync(path.join(exportPath, 'manifest.json'), 'utf8'))

    // ספירת חבילות winget
    let wingetCount = 0
    const wingetFile = path.join(exportPath, 'winget-packages.json')
    if (fs.existsSync(wingetFile)) {
      try {
        const wj = JSON.parse(fs.readFileSync(wingetFile, 'utf8'))
        for (const source of (wj.Sources || [])) {
          wingetCount += (source.Packages || []).length
        }
      } catch {}
    }

    // מה עוד קיים בייצוא
    const installersDir = path.join(exportPath, 'installers')
    const appdataDir = path.join(exportPath, 'appdata')
    const zipsDir = path.join(exportPath, 'custom_folders')

    const installers = fs.existsSync(installersDir) ? fs.readdirSync(installersDir) : []
    const appdataPrograms = fs.existsSync(appdataDir) ? fs.readdirSync(appdataDir) : []
    const customZips = fs.existsSync(zipsDir)
      ? fs.readdirSync(zipsDir).filter(f => f.toLowerCase().endsWith('.zip'))
      : []

    return { success: true, exportPath, manifest, wingetCount, installers, appdataPrograms, customZips }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// פתיחת תיקייה בסייר הקבצים של Windows
ipcMain.handle('open-path', async (event, p) => {
  const { shell } = require('electron')
  return shell.openPath(p)
})

// תהליך הייבוא המלא
ipcMain.handle('start-import', async (event, exportPath, options) => {
  const os = require('os')
  const fs = require('fs')
  const path = require('path')
  const { spawn } = require('child_process')
  const log = []

  // robocopy מחזיר קודים 0-7 בהצלחה - רץ ברקע בלי להקפיא את החלון
  async function robocopyDir(src, dest) {
    const code = await runCommand(`robocopy "${src}" "${dest}" /E /NFL /NDL /NJH /NJS /nc /ns /np`)
    return code <= 7
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(exportPath, 'manifest.json'), 'utf8'))

    // 1. התקנת תוכנות דרך winget - נפתח בחלון PowerShell נפרד וגלוי
    //    כדי שהמשתמש יראה את ההתקדמות והאפליקציה לא תיתקע
    if (options.runWinget) {
      const wingetFile = path.join(exportPath, 'winget-packages.json')
      if (fs.existsSync(wingetFile)) {
        const script = [
          'Write-Host "MigrateMyPC - installing programs via winget..." -ForegroundColor Cyan',
          'Write-Host "This can take a long time. Do not close this window until it says Done." -ForegroundColor Yellow',
          'Write-Host ""',
          `winget import -i "${wingetFile}" --ignore-unavailable --accept-package-agreements --accept-source-agreements`,
          'Write-Host ""',
          'Write-Host "Done! You can close this window." -ForegroundColor Green'
        ].join('\r\n')
        const scriptPath = path.join(os.tmpdir(), 'migratemypc_winget_import.ps1')
        fs.writeFileSync(scriptPath, '\ufeff' + script, 'utf8')
        const child = spawn(
          'powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-File', scriptPath],
          { detached: true, stdio: 'ignore', windowsHide: false }
        )
        child.unref()
        log.push('winget installation started in a separate window - watch it for progress')
      } else {
        log.push('winget-packages.json not found - auto-install skipped')
      }
    }

    // 2. שחזור תיקיות הגדרות (appdata) למיקומים המקוריים
    if (options.restoreAppdata) {
      const appdataRoot = path.join(exportPath, 'appdata')
      let restored = 0

      if (fs.existsSync(appdataRoot)) {
        for (const program of (manifest.programs || [])) {
          if (!program.detectedDataFolders || program.detectedDataFolders.length === 0) continue

          const safeName = program.name.replace(/[<>:"/\\|?*]/g, '_')
          const srcRoot = path.join(appdataRoot, safeName)
          if (!fs.existsSync(srcRoot)) continue

          // בניית יעדי שחזור מהגדרות התיקיות המקוריות (עם הרחבת %APPDATA% וכו' במחשב החדש)
          const targets = program.detectedDataFolders.map(folder => {
            const expanded = folder
              .replace(/%APPDATA%/gi, process.env.APPDATA)
              .replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA)
              .replace(/%USERPROFILE%/gi, process.env.USERPROFILE)
              .replace(/%PROGRAMDATA%/gi, process.env.PROGRAMDATA)
            return {
              parentDir: path.dirname(expanded),
              base: path.basename(expanded),
              hasWildcard: expanded.includes('*')
            }
          })

          for (const item of fs.readdirSync(srcRoot)) {
            const target = targets.find(t =>
              t.hasWildcard ? item.startsWith(t.base.replace('*', '')) : item === t.base
            )
            if (!target) continue

            const src = path.join(srcRoot, item)
            const dest = path.join(target.parentDir, item)
            try {
              const stat = fs.statSync(src)
              if (stat.isDirectory()) {
                if (await robocopyDir(src, dest)) restored++
              } else {
                if (!fs.existsSync(target.parentDir)) fs.mkdirSync(target.parentDir, { recursive: true })
                await fs.promises.copyFile(src, dest)
                restored++
              }
            } catch {}
          }
        }
      }

      log.push(restored > 0
        ? `Restored app settings for ${restored} locations`
        : 'No app settings were restored (nothing matched)')
    }

    // 3. חילוץ התיקיות המותאמות אישית לשולחן העבודה (בטוח יותר מדריסת תיקיות קיימות)
    if (options.restoreFolders) {
      const zipsRoot = path.join(exportPath, 'custom_folders')
      let extracted = 0
      const destRoot = path.join(os.homedir(), 'Desktop', 'MigrateMyPC_Restored')

      if (fs.existsSync(zipsRoot)) {
        for (const zipName of fs.readdirSync(zipsRoot).filter(f => f.toLowerCase().endsWith('.zip'))) {
          const zipPath = path.join(zipsRoot, zipName)
          try {
            if (!fs.existsSync(destRoot)) fs.mkdirSync(destRoot, { recursive: true })
            const code = await runCommand(
              `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destRoot}' -Force"`,
              { timeout: 600000 }
            )
            if (code === 0) extracted++
          } catch {}
        }
      }

      log.push(extracted > 0
        ? `Extracted ${extracted} custom folders to ${destRoot}`
        : 'No custom folders found to extract')
    }

    return { success: true, log }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})