const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const SKIP_PATTERNS = [
  /^KB\d+/i,
  /microsoft visual c\+\+/i,
  /microsoft \.net/i,
  /^\.net/i,
  /directx/i,
  /windows sdk/i,
  /windows driver kit/i,
  /windows app sdk/i,
  /^microsoft update/i,
  /^update for/i,
  /^hotfix/i,
  /^security update/i,
  /webview2/i,
  /microsoft edge/i,
]

function shouldSkip(name) {
  if (!name || name.trim() === '') return true
  return SKIP_PATTERNS.some(pattern => pattern.test(name))
}

function formatSize(bytes) {
  if (bytes === 0) return 'לא ידוע'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function scanInstalledPrograms() {
  const programs = []

  // כתיבת ה-Script לקובץ זמני
  const scriptContent = `
$paths = @(
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
)
$results = @()
foreach ($path in $paths) {
  $keys = Get-ChildItem -Path $path -ErrorAction SilentlyContinue
  foreach ($key in $keys) {
    $props = Get-ItemProperty -Path $key.PSPath -ErrorAction SilentlyContinue
    $name = $props.DisplayName
    if (-not $name) { continue }
    if ($props.SystemComponent -eq 1) { continue }
    if ($props.NoRemove -eq 1) { continue }
    $results += [PSCustomObject]@{
      Name      = $name
      Version   = "$($props.DisplayVersion)"
      Publisher = "$($props.Publisher)"
      Size      = [int]($props.EstimatedSize)
    }
  }
}
$results | ConvertTo-Json -Depth 2
`

  const scriptPath = path.join(os.tmpdir(), 'migratemypc_scan.ps1')

  try {
    // כתיבת הקובץ ב-UTF-8 עם BOM כדי ש-PowerShell יקרא נכון
    fs.writeFileSync(scriptPath, '\uFEFF' + scriptContent, 'utf8')

    const result = execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
    )

    console.log('תוצאת PowerShell (100 תווים ראשונים):', result.substring(0, 100))

    if (!result || result.trim() === '' || result.trim() === 'null') {
      console.log('לא התקבלה תוצאה מ-PowerShell')
      return []
    }

    let parsed
    try {
      parsed = JSON.parse(result.trim())
    } catch (e) {
      console.error('שגיאת JSON:', e.message)
      console.log('תוצאה גולמית:', result.substring(0, 500))
      return []
    }

    const items = Array.isArray(parsed) ? parsed : [parsed]
    console.log('מספר פריטים שהתקבלו:', items.length)

    for (const item of items) {
      if (!item.Name || shouldSkip(item.Name)) continue
      const alreadyExists = programs.find(p => p.name === item.Name)
      if (!alreadyExists) {
        const sizeBytes = (item.Size || 0) * 1024
        programs.push({
          id: Buffer.from(item.Name).toString('base64'),
          name: item.Name,
          version: item.Version || '',
          publisher: item.Publisher || '',
          sizeBytes,
          sizeDisplay: formatSize(sizeBytes),
          readiness: {
            installerProvided: false,
            hasCredentials: false,
            notes: ''
          },
          migrationStatus: 'pending'
        })
      }
    }
  } catch (err) {
    console.error('שגיאה בסריקה:', err.message)
  } finally {
    try { fs.unlinkSync(scriptPath) } catch {}
  }

  return programs.sort((a, b) => a.name.localeCompare(b.name, 'he'))
}

module.exports = { scanInstalledPrograms }