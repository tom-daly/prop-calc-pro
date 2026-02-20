import React, { useState, useEffect, useRef } from 'react'
import styles from './AiChatModal.module.css'
import usePropertyStore from '../store/usePropertyStore'
import { loadSettings } from '../utils/persistence'
import { escapeHtml, formatAiResponse } from '../utils/format'

export default function AiChatModal() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'system', content: 'I have access to your current deal numbers. Ask me anything about the analysis, risks, or how to improve the deal.' }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const handler = () => {
      const settings = loadSettings()
      if (!settings.openaiKey) {
        alert('Please configure your OpenAI API key in Settings first.')
        document.dispatchEvent(new CustomEvent('openSettings'))
        return
      }
      setOpen(true)
    }
    document.addEventListener('openAiChat', handler)
    return () => document.removeEventListener('openAiChat', handler)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!open) return null

  const getDealSummary = () => {
    const state = usePropertyStore.getState()
    const { inputs, currentMode, results } = state
    if (!results) return 'No calculation results available.'

    return `PROPERTY: ${inputs.propertyName}
Address: ${inputs.propertyAddress || 'Not specified'}
Mode: ${currentMode.toUpperCase()}
Purchase Price: $${(parseFloat(inputs.purchasePrice) || 0).toLocaleString()}
Exit ARV: $${(parseFloat(inputs.exitArv) || 0).toLocaleString()}
DSCR: ${results.dscrRatio?.toFixed(2)}
Cap Rate: ${results.capRate?.toFixed(2)}%
Monthly Cash Flow: $${Math.round(results.displayMonthlyCF || 0).toLocaleString()}
Cash-on-Cash: ${results.cashOnCash?.toFixed(2)}%
Total Expenses: $${Math.round(results.totalExpenses || 0).toLocaleString()}/yr`
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setSending(true)

    const settings = loadSettings()
    let history = [...chatHistory]
    if (history.length === 0) {
      history.push({
        role: 'system',
        content: `You are a helpful real estate investment advisor. Be concise but thorough. Use numbers from the deal when relevant. Here is the current deal data:\n${getDealSummary()}`
      })
    }
    history.push({ role: 'user', content: msg })

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.openaiKey}` },
        body: JSON.stringify({ model: settings.openaiModel, messages: history, max_tokens: 1000 })
      })
      const data = await response.json()
      if (data.error) {
        setMessages(prev => [...prev, { role: 'error', content: data.error.message }])
      } else {
        const reply = data.choices[0].message.content
        history.push({ role: 'assistant', content: reply })
        setChatHistory(history)
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', content: err.message }])
    }
    setSending(false)
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3>🤖 AI Deal Advisor</h3>
          <button onClick={() => setOpen(false)} className={styles.close}>×</button>
        </div>
        <div className={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.message} ${styles[m.role]}`}>
              <div className={styles.bubble}
                dangerouslySetInnerHTML={m.role === 'assistant' ? { __html: formatAiResponse(m.content) } : undefined}>
                {m.role !== 'assistant' ? m.content : undefined}
              </div>
            </div>
          ))}
          {sending && <div className={`${styles.message} ${styles.assistant}`}><div className={`${styles.bubble} ${styles.typing}`}>Thinking...</div></div>}
          <div ref={messagesEndRef} />
        </div>
        <div className={styles.inputArea}>
          <input type="text" value={input} placeholder="Ask about this deal..."
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage() }} />
          <button onClick={sendMessage} disabled={sending}>Send</button>
        </div>
      </div>
    </div>
  )
}
