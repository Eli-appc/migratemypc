const PROGRAMS_DB = [

  // ═══════════════════════════════════════════
  // תוכנות עם פרופיל נתונים מלא
  // ═══════════════════════════════════════════

  {
    match: /android studio/i,
    licenseType: 'free',
    hint: 'Free - download from developer.android.com',
    dataFolders: [
      '%APPDATA%\\Google\\AndroidStudio*',
      '%USERPROFILE%\\.android',
      '%USERPROFILE%\\AndroidStudioProjects'
    ],
    notes: 'Includes SDK settings, AVD emulators, and project templates'
  },

  {
    match: /antigravity/i,
    licenseType: 'account',
    hint: 'Sign in with your Antigravity account after installation',
    dataFolders: [
      '%APPDATA%\\Antigravity',
      '%LOCALAPPDATA%\\Antigravity'
    ],
    notes: 'Settings and workspace configuration'
  },

  {
    match: /brother.*print|iprint.*scan/i,
    licenseType: 'free',
    hint: 'Free - download from support.brother.com for your model',
    dataFolders: [],
    notes: 'Reinstall driver for your specific Brother model - no data to migrate'
  },

  {
    match: /davinci resolve/i,
    licenseType: 'free',
    hint: 'Free version at blackmagicdesign.com - activate with same account',
    dataFolders: [
      '%APPDATA%\\Blackmagic Design\\DaVinci Resolve',
      '%PROGRAMDATA%\\Blackmagic Design\\DaVinci Resolve'
    ],
    notes: 'Includes color presets, keyboard shortcuts, and preferences. Projects are stored in database - export them manually first'
  },

  {
    match: /foxit.*pdf|foxit.*reader/i,
    licenseType: 'free',
    hint: 'Free - download from foxit.com',
    dataFolders: [
      '%APPDATA%\\Foxit Software\\Foxit PDF Reader'
    ],
    notes: 'Includes stamps, signatures, and preferences'
  },

  {
    match: /freecad/i,
    licenseType: 'free',
    hint: 'Free - download from freecad.org',
    dataFolders: [
      '%APPDATA%\\FreeCAD'
    ],
    notes: 'Includes macros, preferences, and custom workbenches'
  },

  {
    match: /^git$/i,
    licenseType: 'free',
    hint: 'Free - download from git-scm.com',
    dataFolders: [
      '%USERPROFILE%\\.gitconfig',
      '%USERPROFILE%\\.ssh'
    ],
    notes: 'Critical: includes global git config, SSH keys, and credentials'
  },

  {
    match: /virtualbox/i,
    licenseType: 'free',
    hint: 'Free - download from virtualbox.org',
    dataFolders: [
      '%USERPROFILE%\\VirtualBox VMs',
      '%USERPROFILE%\\.VirtualBox'
    ],
    notes: 'WARNING: VM files can be very large (tens of GB). Consider exporting only the .vbox config files and keeping VMs on external drive'
  },

  {
    match: /orcaslicer/i,
    licenseType: 'free',
    hint: 'Free - download from github.com/SoftFever/OrcaSlicer',
    dataFolders: [
      '%APPDATA%\\OrcaSlicer'
    ],
    notes: 'Critical: includes all printer profiles, filament settings, and calibration data'
  },

  {
    match: /postgresql/i,
    licenseType: 'free',
    hint: 'Free - download from postgresql.org - use same version',
    dataFolders: [],
    registryKeys: [],
    notes: 'WARNING: Database files cannot simply be copied. Use pg_dump to export your databases before migration, then pg_restore on the new machine'
  },

  {
    match: /prusaslicer/i,
    licenseType: 'free',
    hint: 'Free - download from prusa3d.com',
    dataFolders: [
      '%APPDATA%\\PrusaSlicer'
    ],
    notes: 'Critical: includes all printer profiles, filament presets, and print settings'
  },

  {
    match: /tap-windows|twingate/i,
    licenseType: 'account',
    hint: 'Sign in with your Twingate account after installation',
    dataFolders: [
      '%APPDATA%\\Twingate'
    ],
    notes: 'VPN client - reinstall and sign in to your network'
  },

  {
    match: /ultimaker cura|cura/i,
    licenseType: 'free',
    hint: 'Free - download from ultimaker.com/software/ultimaker-cura',
    dataFolders: [
      '%APPDATA%\\cura'
    ],
    notes: 'Critical: includes all printer profiles, material settings, and plugin configurations'
  },

  {
    match: /xampp/i,
    licenseType: 'free',
    hint: 'Free - download from apachefriends.org',
    dataFolders: [],
    notes: 'WARNING: Do not copy XAMPP folder directly. Export MySQL databases with phpMyAdmin first, then reinstall XAMPP and import. Copy your project files from htdocs separately'
  },

  // ═══════════════════════════════════════════
  // תוכנות נפוצות נוספות
  // ═══════════════════════════════════════════

  { match: /microsoft 365/i, licenseType: 'account', hint: 'Sign in with your Microsoft account after installation', dataFolders: [] },
  { match: /office 365/i, licenseType: 'account', hint: 'Sign in with your Microsoft account after installation', dataFolders: [] },
  { match: /adobe/i, licenseType: 'account', hint: 'Sign in with your Adobe ID after installation', dataFolders: [] },
  { match: /dropbox/i, licenseType: 'account', hint: 'Sign in with your Dropbox account after installation', dataFolders: ['%USERPROFILE%\\Dropbox'] },
  { match: /spotify/i, licenseType: 'account', hint: 'Sign in with your Spotify account after installation', dataFolders: [] },
  { match: /zoom/i, licenseType: 'account', hint: 'Sign in with your Zoom account after installation', dataFolders: [] },
  { match: /discord/i, licenseType: 'account', hint: 'Sign in with your Discord account after installation', dataFolders: ['%APPDATA%\\discord'] },
  { match: /steam/i, licenseType: 'account', hint: 'Sign in with your Steam account after installation', dataFolders: [] },
  { match: /battle\.net/i, licenseType: 'account', hint: 'Sign in with your Battle.net account after installation', dataFolders: [] },
  { match: /epic games/i, licenseType: 'account', hint: 'Sign in with your Epic Games account after installation', dataFolders: [] },
  { match: /slack/i, licenseType: 'account', hint: 'Sign in with your Slack account after installation', dataFolders: [] },
  { match: /aida64/i, licenseType: 'serial', hint: 'You will need your AIDA64 license key', dataFolders: [] },
  { match: /winrar/i, licenseType: 'serial', hint: 'You will need your WinRAR license key', dataFolders: [] },
  { match: /google chrome/i, licenseType: 'account', hint: 'Sign in with your Google account to restore bookmarks and settings', dataFolders: [] },
  { match: /mozilla firefox/i, licenseType: 'account', hint: 'Sign in with your Firefox account to restore bookmarks', dataFolders: [] },
  { match: /vlc/i, licenseType: 'free', hint: 'Free - download from videolan.org', dataFolders: [] },
  { match: /^7-zip/i, licenseType: 'free', hint: 'Free - download from 7-zip.org', dataFolders: [] },
  { match: /notepad\+\+/i, licenseType: 'free', hint: 'Free - download from notepad-plus-plus.org', dataFolders: ['%APPDATA%\\Notepad++'] },
  { match: /obs studio/i, licenseType: 'free', hint: 'Free - download from obsproject.com', dataFolders: ['%APPDATA%\\obs-studio'] },
]

function detectLicenseType(programName) {
  for (const entry of PROGRAMS_DB) {
    if (entry.match.test(programName)) {
      return {
        licenseType: entry.licenseType,
        hint: entry.hint,
        dataFolders: entry.dataFolders || [],
        notes: entry.notes || ''
      }
    }
  }
  return null
}

module.exports = { detectLicenseType, PROGRAMS_DB }