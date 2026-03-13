export const TRADITIONAL = 'traditional'
export const BRRRR = 'dscr'
export const OFFER = 'offer'

export const MODE_LABELS = {
  [TRADITIONAL]: 'Traditional',
  [BRRRR]: 'BRRRR',
  [OFFER]: 'Creative',
}

export const MODES = [
  { key: TRADITIONAL, label: MODE_LABELS[TRADITIONAL] },
  { key: BRRRR, label: MODE_LABELS[BRRRR] },
  { key: OFFER, label: MODE_LABELS[OFFER] },
]

// Fields that must have a value for the calc to be meaningful
export const REQUIRED_FIELDS = {
  [TRADITIONAL]: [
    'purchasePrice', 'exitArv', 'downPercent', 'interestRate',
    'propTaxes', 'insurance',
  ],
  [BRRRR]: [
    'purchasePrice', 'exitArv', 'dscrLtv', 'interestRate',
    'propTaxes', 'insurance',
  ],
  [OFFER]: [
    'purchasePrice', 'exitArv',
    'propTaxes', 'insurance',
  ],
}

// Unit-level: at least one unit needs rent
export const UNIT_RENT_REQUIRED = true
