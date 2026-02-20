export function fmt(n) {
  return '$' + Math.round(n).toLocaleString()
}

export function fmtPct(n) {
  return n.toFixed(2) + '%'
}

export function fmtCompact(n) {
  if (!n || n <= 0) return '---'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  return '$' + Math.round(n / 1e3) + 'k'
}

export function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function formatAiResponse(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}
