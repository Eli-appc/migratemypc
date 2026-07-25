const translations = {
  he: {
    appName: 'MigrateMyPC',
    tabPrograms: '📦 תוכנות מותקנות',
    tabFolders: '📁 תיקיות מותאמות',
    scanTitle: 'סריקת תוכנות מותקנות',
    scanDesc: 'לחץ על הכפתור כדי לסרוק את כל התוכנות המותקנות על המחשב הזה, לראות את הנפח שלהן ומה נדרש להכין לפני המעבר למחשב החדש.',
    scanBtn: '🔍 התחל סריקה',
    scanning: 'סורק תוכנות מותקנות, אנא המתן...',
    foundPrograms: 'נמצאו {count} תוכנות מותקנות',
    noPrograms: 'לא נמצאו תוכנות',
    colName: 'שם התוכנה',
    colVersion: 'גרסה',
    colPublisher: 'יצרן',
    colSize: 'נפח',
    colStatus: 'סטטוס',
    statusPending: '⚪ ממתין',
    clickToScan: 'לחץ על "התחל סריקה" כדי לראות את רשימת התוכנות',
    foldersTitle: 'תיקיות מותאמות אישית',
    foldersDesc: 'בחר תיקיות ספציפיות מהמחשב שלך שתרצה לגבות ולהעביר למחשב החדש.',
    foldersBtn: '📁 בחר תיקייה',
    noFolders: 'לא נבחרו תיקיות עדיין',
    comingSoon: 'אפשרויות נוספות יתווספו בעתיד',
    scanError: 'שגיאה בסריקה',
    unknown: 'Unknown',
    foldersAddBtn: '📁 Add Folder',
    foldersCalculating: 'Calculating size...',
    foldersRemove: 'Remove',
    foldersNote: 'Note',
    foldersNotePlaceholder: 'Why is this folder important...',
    foldersDuplicate: 'Folder already in list',
    foldersTotal: 'Total to backup',
    foldersAddBtn: '📁 הוסף תיקייה',
    foldersCalculating: 'מחשב נפח...',
    foldersRemove: 'הסר',
    foldersNote: 'הערה',
    foldersNotePlaceholder: 'למה התיקייה הזו חשובה...',
    foldersDuplicate: 'התיקייה כבר נמצאת ברשימה',
    foldersTotal: 'סה"כ לגיבוי'
  },
  en: {
    appName: 'MigrateMyPC',
    tabPrograms: '📦 Installed Programs',
    tabFolders: '📁 Custom Folders',
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
    statusPending: '⚪ Pending',
    clickToScan: 'Click "Start Scan" to see the list of programs',
    foldersTitle: 'Custom Folders',
    foldersDesc: 'Select specific folders from your computer that you want to back up and transfer to the new computer.',
    foldersBtn: '📁 Select Folder',
    noFolders: 'No folders selected yet',
    comingSoon: 'More options will be added in the future',
    scanError: 'Scan error',
    unknown: 'Unknown'
  }
}

let currentLang = 'he'

function t(key, vars = {}) {
  let text = translations[currentLang][key] || translations['he'][key] || key
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{${k}}`, v)
  }
  return text
}

function setLang(lang) {
  currentLang = lang
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
  renderAll()
}

function getLang() {
  return currentLang
}

window.i18n = { t, setLang, getLang }