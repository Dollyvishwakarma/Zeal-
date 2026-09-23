import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { message, consultantId, sessionId } = await req.json()

    if (!message || !consultantId) {
      return NextResponse.json(
        { error: 'message and consultantId required' },
        { status: 400 }
      )
    }

    const { data: consultant, error: cErr } = await supabase
      .from('AIConsultant')
      .select('*')
      .eq('id', consultantId)
      .single()

    if (cErr || !consultant) {
      return NextResponse.json({ error: 'Consultant not found' }, { status: 404 })
    }

    let currentSessionId = sessionId
    if (!currentSessionId && user) {
      const { data: session } = await supabase
        .from('AIChatSessions')
        .insert({
          user_id: user.id,
          consultant_id: consultantId,
          consultant_name: consultant.name,
        })
        .select()
        .single()
      currentSessionId = session?.id
    }

    let history: { role: 'user' | 'assistant'; content: string }[] = []
    if (currentSessionId) {
      const { data: msgs } = await supabase
        .from('AIChatMessages')
        .select('role, content')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: true })
        .limit(20)
      history = (msgs || []) as any
    }

    const systemPrompt = `You are ${consultant.name}, an AI ${consultant.category} consultant on Zeal platform.

Bio: ${consultant.bio || 'A helpful AI consultant'}
Specialties: ${(consultant.specialties || []).join(', ') || 'General'}
Persona: ${consultant.persona || 'helpful, empathetic'}

Instructions:
- Be warm, empathetic, and human-like
- Ask follow-up questions
- Give practical advice
- Keep responses under 150 words
- Never reveal you are an AI`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
      model: consultant.model || 'llama-3.3-70b-versatile',
      temperature: 0.85,
      max_tokens: 400,
    })

    const reply = completion.choices[0]?.message?.content || 'Sorry, try again.'

    if (currentSessionId) {
      await supabase.from('AIChatMessages').insert([
        { session_id: currentSessionId, role: 'user', content: message },
        { session_id: currentSessionId, role: 'assistant', content: reply },
      ])
    }

    return NextResponse.json({ reply, sessionId: currentSessionId })
  } catch (err: any) {
    console.error('[ai-chat] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
