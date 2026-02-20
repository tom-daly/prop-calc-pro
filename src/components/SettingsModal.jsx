import React, { useState, useEffect } from 'react'
import styles from './SettingsModal.module.css'
import { loadSettings, saveSettings as persistSettings } from '../utils/persistence'

export default function SettingsModal() {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')

  useEffect(() => {
    const handler = () => {
      const settings = loadSettings()
      setKey(settings.openaiKey)
      setModel(settings.openaiModel)
      setOpen(true)
    }
    document.addEventListener('openSettings', handler)
    return () => document.removeEventListener('openSettings', handler)
  }, [])

  if (!open) return null

  const handleSave = () => {
    persistSettings(key.trim(), model)
    setOpen(false)
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3>⚙️ Settings</h3>
          <button onClick={() => setOpen(false)} className={styles.close}>×</button>
        </div>
        <div>
          <label className={styles.label}>OpenAI API Key</label>
          <input type="password" className={styles.settingsInput} placeholder="sk-..." value={key} onChange={e => setKey(e.target.value)} />
          <p className={styles.note}>Your API key is stored locally in your browser and never sent anywhere except OpenAI.</p>

          <label className={styles.label}>Model</label>
          <select className={styles.settingsInput} value={model} onChange={e => setModel(e.target.value)}>
            <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
            <option value="gpt-4o">GPT-4o (Smarter)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnSave} onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  )
}
