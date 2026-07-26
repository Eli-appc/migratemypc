# MigrateMyPC - Project Summary for Claude

## Project Overview
A Windows desktop application built with **Electron + Node.js** that migrates installed programs, settings, license info, and data folders from an old PC to a new one via USB drive.

**Location:** `C:\dev\migratemypc`
**GitHub:** `https://github.com/Eli-appc/migratemypc`
**Language:** English UI only (Hebrew was removed)

---

## Commands

- `npm start` — launch the Electron app (`electron .`). This is a desktop app; there is no build step, dev server, or test suite.
- Changes to `main.js`/`preload.js` require a **full restart** to take effect.
- Changes to `index.html`/`i18n.js` take effect on reload (Ctrl+R), but restart is more reliable.
- No linter, formatter, or test runner is configured.

---

## Tech Stack
- **Electron** (desktop app framework)
- **Node.js / CommonJS** (`"type": "commonjs"` in package.json)
- **PowerShell** (for Registry scanning and winget)
- **Robocopy** (for file copying)
- **winget** (Windows Package Manager for auto-install on new PC)
- **Editor:** Antigravity IDE

---

## File Structure
```
C:\dev\migratemypc\
├── main.js           # Electron main process - all IPC handlers
├── preload.js        # Bridge between main and renderer (contextBridge)
├── index.html        # UI - all tabs, CSS, and JavaScript (no framework)
├── i18n.js           # Translation system (English only)
├── scanner.js        # Scans installed programs via PowerShell
├── programs-db.js    # Database of known programs with license type and data folders
├── storage.js        # Load/save programs-data.json to disk
├── package.json
└── .gitignore
```

**Data saved by the app:**
- `~/MigrateMyPC/programs-data.json` — user-entered license info, installer paths, notes, and custom folders list

---

## Architecture

### main.js
Electron main process. Creates the `BrowserWindow` and registers all `ipcMain.handle` endpoints:

| Handler | Description |
|---|---|
| `scan-programs` | Runs scanner.js |
| `load-data` | Reads programs-data.json |
| `save-data` | Writes programs-data.json |
| `browse-file` | Opens file dialog (exe/msi/msix) |
| `browse-folder` | Opens folder dialog (multi-select) |
| `get-folder-size` | Recursively calculates folder size |
| `start-export` | Full export pipeline to USB |

`start-export` is the biggest handler — drives the whole export pipeline inline in `main.js`.

### preload.js
The only bridge between renderer and main. Exposes `window.electronAPI` via `contextBridge`. Any new IPC call needs a matching entry here.

### scanner.js
Enumerates installed programs by generating a PowerShell script (temp `.ps1` file) that reads the `Uninstall` registry keys (`HKLM`/`HKLM WOW6432Node`/`HKCU`), then runs it with `execSync`.

**Important:** The script writes its JSON result to a temp output file and `scanner.js` reads that file back — it does **not** capture PowerShell's stdout directly. This is required to avoid encoding issues with non-ASCII program names. Keep this file-based round-trip if you touch this function.

Results are filtered through `SKIP_PATTERNS` (updates, redistributables, drivers, etc.), deduped by name, then enriched via `programs-db.js`.

### programs-db.js
Static lookup table (`PROGRAMS_DB`) matched by regex against the program's display name. Supplies:
- `licenseType`: `'free'` / `'account'` / `'serial'`
- `hint`: What to do after reinstalling
- `dataFolders`: AppData paths with env-style placeholders (`%APPDATA%`, `%LOCALAPPDATA%`, `%USERPROFILE%`, `%PROGRAMDATA%`), wildcards supported
- `notes`: Special migration warnings (e.g. PostgreSQL needs pg_dump)

**Programs with full profiles:**
- Android Studio, Antigravity IDE, Brother iPrint&Scan
- DaVinci Resolve, Foxit PDF Reader, FreeCAD
- Git (including .gitconfig and .ssh), Oracle VirtualBox
- OrcaSlicer, PrusaSlicer, Ultimaker Cura (3D printer profiles!)
- PostgreSQL (pg_dump warning), XAMPP (phpMyAdmin export warning)
- Twingate, Discord, Notepad++, OBS, and 30+ more

### storage.js
Persists user-entered per-program data (license info, installer path, notes) plus the custom folders list as JSON at `~/MigrateMyPC/programs-data.json`.

### index.html
The entire renderer: markup, styles, and all client logic in inline `<script>`/`<style>` tags (no separate JS/CSS files, no framework).

Key renderer-side state:
- `lastPrograms` — last scan result
- `programsData` — per-program user-entered data keyed by program id
- `foldersData` — custom folders list

Key functions:
- `renderAll()` — re-renders all UI text (must be called after language change)
- `renderTable(programs)` — renders installed-programs table
- `renderFolders()` — renders custom folders tab
- `startScan()` — triggers scan via IPC
- `selectExportFolder()` → `showExportSummary()` → `startExport()` — export flow

### i18n.js
Translation table + `t(key, vars)` lookup, exposed as `window.i18n`. Currently only `en` translations are populated. `getLang()` always returns `'en'`. Uses `typeof renderAll === 'function'` guard in `setLang()` to avoid load-order issues.

**Important:** Any new user-facing string must go through `window.i18n.t(...)` and be added to i18n.js — the codebase has repeatedly regressed by reintroducing hardcoded strings.

---

## UI Structure (index.html)
4 tabs in the toolbar:
1. **📦 Installed Programs** — scan, list with License column (🔐🔑🆓❓), side panel per program
2. **📁 Custom Folders** — select folders to backup, auto-calculates size
3. **🚀 Export** — exports everything to USB
4. **+** — placeholder for future tabs

**Side Panel** (opens on row click):
- Program name, version, publisher (read-only)
- License type dropdown (None/Free, Serial, Username+Password, Subscription)
- Serial / Username / Password fields (shown based on license type)
- Installer file browser (real Windows dialog)
- Notes textarea
- Hint box (green) — auto-detected tip per program
- Warning box (yellow) — special migration notes
- Data folders box (blue) — shows which AppData folders will be backed up

---

## Export Pipeline (start-export in main.js)

Given a destination folder and the renderer's in-memory state, produces a `MigrateMyPC_Export/` folder:

```
MigrateMyPC_Export/
├── manifest.json          # Full program list + all user-entered data
├── winget-packages.json   # winget import file for auto-installing on new PC
├── installers/            # Copied installer .exe/.msi files
├── appdata/               # Backed up app settings per program
│   ├── OrcaSlicer/        # All printer profiles!
│   ├── PrusaSlicer/
│   ├── Git/               # .gitconfig + .ssh keys
│   └── ...13 more
├── custom_folders/        # User-selected folders, compressed as .zip
│   └── Downloads.zip
└── README.txt             # Instructions for new PC
```

**winget export:** Writes a `.ps1` script to temp folder and runs it via PowerShell to handle paths with spaces. Uses `--ignore-unavailable` flag.

Progress/results are returned as `{ success, exportPath, log }` (or `{ success: false, error }`) — not streamed. The renderer shows everything after `startExport()` resolves.

---

## What Still Needs to Be Built

1. **Import screen** — the most important missing piece. On new PC:
   - Select the `MigrateMyPC_Export` folder
   - Show program list from manifest.json
   - Run `winget import winget-packages.json --ignore-unavailable` to auto-install
   - Restore appdata folders to correct locations
   - Show which programs need manual install (not in winget)
   - Show license info / hints per program

2. **"Not Responding" during export** — export runs on main thread, blocking UI. Should move heavy operations to a background worker or use async/streaming file operations.

3. **PostgreSQL special handling** — pg_dump instructions / automation
4. **XAMPP special handling** — phpMyAdmin export instructions
5. **Summary screen** — how many programs Ready/Partial/Pending

---

## Known Issues / Notes
- `dialogStrings(lang)` was replaced with `dialogStrings('en')` — remove `dialogStrings` function entirely when cleaning up
- i18n.js still has Hebrew translations object — can be removed (keeping only `en`)
- Robocopy exit codes 1-7 are success (not errors) — handle this if checking robocopy return codes
- VirtualBox VMs can be tens of GB — consider warning user before backing up

---

## Development Notes
- User has no prior coding experience — explain everything step by step
- Use Ctrl+H (find & replace) for code changes in Antigravity IDE
- ESET antivirus may flag the app — add exclusion for `C:\dev\migratemypc`
- User's son (15) also contributes — downloads ZIP from GitHub and works in VS Code
- Test exports in `G:\test` or desktop folder before USB
- Always `git add . && git commit && git push` after major milestones