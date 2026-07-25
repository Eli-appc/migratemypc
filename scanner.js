const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { detectLicenseType } = require('./programs-db')

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
  if (bytes === 0) return 'Unknown'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function scanInstalledPrograms() {
  const programs = []

  const scriptPath = path.join(os.tmpdir(), 'migratemypc_scan.ps1')
  const outputPath = path.join(os.tmpdir(), 'migratemypc_scan_result.json')
  const outputPathPs = outputPath.replace(/\\/g, '\\\\')

  // \u05D4-Script writes the result directly to a UTF-8 file, to bypass PowerShell
  // stdout encoding issues (which otherwise mangle non-ASCII program names, e.g. Hebrew)
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
$json = $results | ConvertTo-Json -Depth 2
[System.IO.File]::WriteAllText('${outputPathPs}', $json, [System.Text.Encoding]::UTF8)
`

  try {
    fs.writeFileSync(scriptPath, '\uFEFF' + scriptContent, 'utf8')

    execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
    )

    if (!fs.existsSync(outputPath)) {
      return []
    }

    const result = fs.readFileSync(outputPath, 'utf8').replace(/^\uFEFF/, '')

    if (!result || result.trim() === '' || result.trim() === 'null') {
      return []
    }

    let parsed
    try {
      parsed = JSON.parse(result.trim())
    } catch (e) {
      console.error('JSON error:', e.message)
      return []
    }

    const items = Array.isArray(parsed) ? parsed : [parsed]
    console.log('Items found:', items.length)

    for (const item of items) {
      if (!item.Name || shouldSkip(item.Name)) continue
      const alreadyExists = programs.find(p => p.name === item.Name)
      if (!alreadyExists) {
        const sizeBytes = (item.Size || 0) * 1024
        const detected = detectLicenseType(item.Name)
        programs.push({
          id: Buffer.from(item.Name).toString('base64'),
          name: item.Name,
          version: item.Version || '',
          publisher: item.Publisher || '',
          sizeBytes,
          sizeDisplay: formatSize(sizeBytes),
          detectedLicenseType: detected ? detected.licenseType : null,
          detectedHint: detected ? detected.hint : null,
          detectedDataFolders: detected ? detected.dataFolders : [],
          detectedNotes: detected ? detected.notes : '',
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
    console.error('Scan error:', err.message)
  } finally {
    try { fs.unlinkSync(scriptPath) } catch {}
    try { fs.unlinkSync(outputPath) } catch {}
  }

  return programs.sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

module.exports = { scanInstalledPrograms }