const fs = require('fs')
const path = require('path')
const os = require('os')

const DATA_DIR = path.join(os.homedir(), 'MigrateMyPC')
const DATA_FILE = path.join(DATA_DIR, 'programs-data.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadData() {
  try {
    ensureDir()
    if (!fs.existsSync(DATA_FILE)) return {}
    const content = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

function saveData(data) {
  try {
    ensureDir()
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch {
    return false
  }
}

module.exports = { loadData, saveData }