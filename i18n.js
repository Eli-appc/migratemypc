const translations = {
  en: {
    appName: 'MigrateMyPC',
    tabPrograms: '📦 Installed Programs',
    tabFolders: '📁 Custom Folders',
    moreTooltip: 'Coming soon',
    scanTitle: 'Scan Installed Programs',
    scanDesc: 'Click the button to scan all programs installed on this computer, view their size and what needs to be prepared before moving to the new computer.',
    scanBtn: '🔍 Start Scan',
    scanning: 'Scanning installed programs, please wait...',
    foundPrograms: 'Found {count} installed programs',
    noPrograms: 'No programs found',
    colName: 'Program Name',
    colVersion: 'Version',
    colPublisher: 'Publisher',
    colSize: 'Size',
    colStatus: 'Status',
    statusPending: 'Pending',
    statusReady: 'Ready',
    statusPartial: 'Partial',
    clickToScan: 'Click "Start Scan" to see the list of programs',
    foldersTitle: 'Custom Folders',
    foldersDesc: 'Select specific folders from your computer that you want to back up and transfer to the new computer.',
    foldersBtn: '📁 Select Folder',
    noFolders: 'No folders selected yet',
    comingSoon: 'More options will be added in the future',
    scanError: 'Scan error',
    unknown: 'Unknown',
    foldersAddBtn: '📁 Add Folder',
    foldersCalculating: 'Calculating size...',
    foldersRemove: 'Remove',
    foldersNote: 'Note',
    foldersNotePlaceholder: 'Why is this folder important...',
    foldersDuplicate: 'Folder already in list',
    foldersTotal: 'Total to backup',
    panelTitle: 'Program Details',
    panelLabelName: 'Program Name',
    panelLabelVersion: 'Version',
    panelLabelPublisher: 'Publisher',
    panelLabelLicense: 'License Type',
    licenseNone: 'None / Free',
    licenseSerial: 'Serial / Product Key',
    licenseAccount: 'Username and Password',
    licenseSubscription: 'Subscription (account login)',
    panelLabelSerial: 'Serial / Product Key',
    serialPlaceholder: 'XXXXX-XXXXX-XXXXX',
    panelLabelUsername: 'Username',
    panelLabelPassword: 'Password',
    panelLabelInstaller: 'Installer File',
    installerPlaceholder: 'C:\\Downloads\\setup.exe',
    browseFileBtn: '📂 Choose File',
    panelLabelNotes: 'Notes',
    notesPlaceholder: 'Free-form notes...',
    saveBtn: '💾 Save',
    closeBtn: '✕'
  }
}

const currentLang = 'en'

function t(key, vars = {}) {
  let text = translations.en[key] || key
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{${k}}`, v)
  }
  return text
}

function getLang() {
  return currentLang
}

window.i18n = { t, getLang }