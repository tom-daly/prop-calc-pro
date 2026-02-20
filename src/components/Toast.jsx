import React from 'react'
import styles from './Toast.module.css'
import usePropertyStore from '../store/usePropertyStore'

export default function Toast() {
  const message = usePropertyStore(s => s.toastMessage)
  const visible = usePropertyStore(s => s.toastVisible)

  if (!visible) return null

  return (
    <div className={styles.toast}>
      {message}
    </div>
  )
}
