import React from 'react'
import usePropertyStore from '../store/usePropertyStore'
import { MODE_LABELS } from '../utils/modes'

export default function PrintHeader() {
  const name = usePropertyStore(s => s.inputs.propertyName)
  const address = usePropertyStore(s => s.inputs.propertyAddress)
  const mode = usePropertyStore(s => s.currentMode)

  const modeLabel = MODE_LABELS[mode] || mode

  return (
    <div data-print="header" style={{ display: 'none' }}>
      <div className="print-title">{name || 'Untitled Property'}</div>
      {address && <div className="print-address">{address}</div>}
      <div className="print-branding">Prop Calc Pro &middot; {modeLabel} Analysis</div>
    </div>
  )
}
