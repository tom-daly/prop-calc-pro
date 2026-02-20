import React from 'react'
import styles from './InputGroup.module.css'

export default function InputGroup({ label, prefix, suffix, value, onChange, type = 'number', step, placeholder, style, readOnly }) {
  return (
    <div className={styles.inputGroup} style={style}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputWrap}>
        {prefix && <span className={styles.inputPrefix}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          step={step}
          placeholder={placeholder}
          readOnly={readOnly}
          className={readOnly ? styles.readonly : undefined}
        />
        {suffix && <span className={styles.inputPrefix}>{suffix}</span>}
      </div>
    </div>
  )
}
