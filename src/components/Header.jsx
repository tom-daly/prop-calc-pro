import React, { useState } from 'react'
import styles from './Header.module.css'
import usePropertyStore from '../store/usePropertyStore'
import {
  exportToFile as doExport, importFromFile as doImport, loadFromStorage,
  getAllProperties, deleteFromStorage, generateId, saveToStorage
} from '../utils/persistence'

export default function Header() {
  const inputs = usePropertyStore(s => s.inputs)
  const setInput = usePropertyStore(s => s.setInput)
  const saveData = usePropertyStore(s => s.saveData)
  const newProperty = usePropertyStore(s => s.newProperty)
  const deleteProperty = usePropertyStore(s => s.deleteProperty)
  const duplicateProperty = usePropertyStore(s => s.duplicateProperty)
  const currentPropertyId = usePropertyStore(s => s.currentPropertyId)
  const showToast = usePropertyStore(s => s.showToast)
  const loadProperty = usePropertyStore(s => s.loadProperty)

  const [showVault, setShowVault] = useState(false)

  const handleSave = () => {
    saveData()
    showToast('Saved!')
  }

  const handleExport = () => {
    saveData()
    const data = loadFromStorage(currentPropertyId)
    if (!data) return
    doExport(data)
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const data = await doImport(file)
      data.lastModified = Date.now()
      data.name = data.name || 'Imported'
      if (data.inputs) data.inputs.propertyName = data.name
      const id = currentPropertyId || generateId()
      saveToStorage(id, data)
      loadProperty(id)
      showToast('Imported!')
    } catch (err) {
      alert('Error reading file: ' + err.message)
    }
    e.target.value = ''
  }

  const handleDelete = () => {
    if (!currentPropertyId) return
    if (!confirm('Delete this property analysis?')) return
    deleteProperty()
  }

  return (
    <header className={styles.header} data-print="hide">
      <div className={styles.leftGroup}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🏠</div>
          <span>Prop Calc Pro</span>
        </div>
        <div className={styles.vaultSelect} onClick={() => setShowVault(true)}>
          <span>📦</span>
          <span>Vault</span>
          <span>▾</span>
        </div>
      </div>
      <div className={styles.propertyInfo}>
        <input
          type="text"
          className={styles.propName}
          value={inputs.propertyName}
          placeholder="Property Name"
          onChange={e => setInput('propertyName', e.target.value)}
        />
        <input
          type="text"
          className={styles.propAddress}
          value={inputs.propertyAddress}
          placeholder="123 Main St, City, State ZIP"
          onChange={e => setInput('propertyAddress', e.target.value)}
        />
      </div>
      <div className={styles.headerActions}>
        <button className={`${styles.btn} ${styles.btnNew}`} onClick={newProperty}>+ New</button>
        <button className={`${styles.btn} ${styles.btnDuplicate}`} onClick={duplicateProperty}>📋 Duplicate</button>
        <button className={`${styles.btn} ${styles.btnSave}`} onClick={handleSave}>💾 Save</button>
        <button className={`${styles.btn} ${styles.btnPdf}`} onClick={handleExport}>📥 Export</button>
        <button className={`${styles.btn} ${styles.btnPdf}`} onClick={() => document.getElementById('importFile').click()}>📤 Import</button>
        <input type="file" id="importFile" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        <button className={`${styles.btn} ${styles.btnPdf}`} onClick={() => document.dispatchEvent(new CustomEvent('openPdfModal'))}>📄 PDF</button>
        <button className={`${styles.btn} ${styles.btnAi}`} onClick={() => document.dispatchEvent(new CustomEvent('openAiChat'))}>🤖 Ask AI</button>
        <button className={`${styles.btn} ${styles.btnPdf}`} onClick={() => document.dispatchEvent(new CustomEvent('openSettings'))}>⚙️</button>
        <button className={`${styles.btn} ${styles.btnDelete}`} onClick={handleDelete}>🗑️</button>
      </div>
      {showVault && <VaultOverlay onClose={() => setShowVault(false)} />}
    </header>
  )
}

function VaultOverlay({ onClose }) {
  const loadProperty = usePropertyStore(s => s.loadProperty)
  const showToast = usePropertyStore(s => s.showToast)
  const currentPropertyId = usePropertyStore(s => s.currentPropertyId)

  const properties = getAllProperties()

  const handleLoad = (id) => {
    loadProperty(id)
    onClose()
  }

  const handleDeleteVault = (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteFromStorage(id)
    if (currentPropertyId === id) {
      usePropertyStore.getState().newProperty()
    }
    showToast('Property deleted')
    onClose()
  }

  return (
    <div className={styles.vaultOverlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.vaultContent}>
        <div className={styles.vaultHeader}>
          <h3>📦 Property Vault</h3>
          <button onClick={onClose} className={styles.vaultClose}>×</button>
        </div>
        <div>
          {properties.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No saved properties yet.</p>
          ) : (
            properties.map(p => (
              <div key={p.id} className={styles.vaultItem}>
                <div onClick={() => handleLoad(p.id)} style={{ cursor: 'pointer', flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name || 'Untitled'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last modified: {new Date(p.lastModified).toLocaleDateString()}</div>
                </div>
                <button onClick={() => handleDeleteVault(p.id, p.name || 'Untitled')} className={styles.vaultDeleteBtn} title="Delete">🗑️</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
