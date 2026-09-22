import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Consultants fetch karo
    const { data: human } = await supabase.from('Consultant').select('*')

    // 2. Unke User details fetch karo
    let humanWithUser = human || []
    if (human && human.length > 0) {
      const userIds = human.map((c: any) => c.userId).filter(Boolean)
      const { data: users } = await supabase
        .from('User')
        .select('id, name, username, avatar')
        .in('id', userIds)

      const userMap = new Map((users || []).map((u: any) => [u.id, u]))
      humanWithUser = human.map((c: any) => {
        const u = userMap.get(c.userId)
        return {
          ...c,
          name: u?.name || u?.username || 'Consultant',
          username: u?.username,
          avatar: u?.avatar,
        }
      })
    }

    // 3. AI Consultants fetch karo
    const { data: ai } = await supabase
      .from('AIConsultant')
      .select('*')
      .eq('isActive', true)

    return NextResponse.json({
      human: humanWithUser,
      ai: ai || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}