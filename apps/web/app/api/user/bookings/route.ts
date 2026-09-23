import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: bookings, error } = await supabase
      .from('Booking')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('[user/bookings] error:', error.message)
      return NextResponse.json({ bookings: [], error: error.message })
    }

    return NextResponse.json({ bookings: bookings || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}