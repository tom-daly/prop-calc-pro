import React from 'react'
import usePropertyStore from '../store/usePropertyStore'

export default function PrintHeader() {
  const name = usePropertyStore(s => s.inputs.propertyName)
  const address = usePropertyStore(s => s.inputs.propertyAddress)
  const mode = usePropertyStore(s => s.currentMode)

  const modeLabel = mode === 'dscr' ? 'Cash-Carry-Refi-DSCR' : mode === 'offer' ? 'Offer Analysis' : 'Traditional'

  return (
    <div data-print="header" style={{ display: 'none' }}>
      <div className="print-title">{name || 'Untitled Property'}</div>
      {address && <div className="print-address">{address}</div>}
      <div className="print-branding">PropCalc Pro &middot; {modeLabel} Analysis</div>
    </div>
  )
}
