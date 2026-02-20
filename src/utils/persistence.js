const STORAGE_PREFIX = 'propcalc_'
const WORKING_KEY = 'propcalc_working'

export function getStorageKey(propertyId) {
  return STORAGE_PREFIX + propertyId
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getAllProperties() {
  const properties = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith(STORAGE_PREFIX) && key !== WORKING_KEY) {
      try {
        const data = JSON.parse(localStorage.getItem(key))
        if (data && data.name) {
          properties.push({ id: key.replace(STORAGE_PREFIX, ''), ...data })
        }
      } catch (e) {
        console.error('Error parsing property:', key, e)
      }
    }
  }
  return properties.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
}

export function saveToStorage(propertyId, data) {
  localStorage.setItem(getStorageKey(propertyId), JSON.stringify(data))
}

export function loadFromStorage(propertyId) {
  const raw = localStorage.getItem(getStorageKey(propertyId))
  return raw ? JSON.parse(raw) : null
}

export function deleteFromStorage(propertyId) {
  localStorage.removeItem(getStorageKey(propertyId))
}

export function saveWorkingState(state) {
  localStorage.setItem(WORKING_KEY, JSON.stringify(state))
}

export function restoreWorkingState() {
  const saved = localStorage.getItem(WORKING_KEY)
  return saved ? JSON.parse(saved) : null
}

export function clearWorkingState() {
  localStorage.removeItem(WORKING_KEY)
}

export function exportToFile(data) {
  data.exportedAt = new Date().toISOString()
  data.version = '1.0'
  const filename = (data.name || 'property').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json'
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.inputs && !data.name) {
          reject(new Error('Invalid file format'))
          return
        }
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsText(file)
  })
}

// Settings storage
export function loadSettings() {
  return {
    openaiKey: localStorage.getItem('propcalc_openai_key') || '',
    openaiModel: localStorage.getItem('propcalc_openai_model') || 'gpt-4o-mini',
  }
}

export function saveSettings(key, model) {
  localStorage.setItem('propcalc_openai_key', key)
  localStorage.setItem('propcalc_openai_model', model)
}
