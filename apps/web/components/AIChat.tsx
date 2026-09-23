'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

type Props = {
  consultantId: string
  consultantName: string
  consultantAvatar?: string
}

export default function AIChat({ consultantId, consultantName, consultantAvatar }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          consultantId,
          sessionId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get response')
      if (data.sessionId) setSessionId(data.sessionId)

      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch (err: any) {
      setError(err.message)
      setMessages([...newMessages, { role: 'assistant', content: `⚠️ ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="max-w-2xl mx-auto border rounded-xl flex flex-col h-[650px] bg-white shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center gap-3">
        <img
          src={consultantAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(consultantName)}&background=9D7DC5&color=fff`}
          alt={consultantName}
          className="w-10 h-10 rounded-full border-2 border-white/30"
        />
        <div>
          <div className="font-bold">{consultantName}</div>
          <div className="text-xs text-purple-100">● Online</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-12">
            <div className="text-4xl mb-2">💬</div>
            <p>Start a conversation with {consultantName}</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : 'bg-white border text-gray-800 rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border p-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="bg-red-50 border-t border-red-200 text-red-700 text-xs px-4 py-2">
          {error}
        </div>
      )}

      <div className="p-3 border-t bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type your message..."
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}