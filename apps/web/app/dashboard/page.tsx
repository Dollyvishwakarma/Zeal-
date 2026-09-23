import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MessageCircle, User as UserIcon, Sparkles, ArrowRight, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectedFrom=/dashboard')

  // User profile
  const { data: profile } = await supabase
    .from('User')
    .select('id, name, email, username, role')
    .eq('id', user.id)
    .single()

  // Bookings
  const { data: bookings } = await supabase
    .from('Booking')
    .select('*')
    .eq('userId', user.id)
    .order('createdAt', { ascending: false })
    .limit(10)

  const totalBookings = bookings?.length || 0
  const upcomingBookings = bookings?.filter(
    (b: any) => b.status === 'CONFIRMED' || b.status === 'PENDING'
  ) || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Welcome back, {profile?.name || 'User'} 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here is your dashboard overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Calendar size={16} />
            <span className="text-xs font-medium">Bookings</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {totalBookings}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <MessageCircle size={16} />
            <span className="text-xs font-medium">Chats</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <span className="text-xs font-medium">Wallet</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">₹0</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <Sparkles size={16} />
            <span className="text-xs font-medium">Sparks</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/experts"
            className="group bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl p-5 hover:shadow-xl transition-shadow"
          >
            <UserIcon size={24} className="mb-3" />
            <h3 className="font-bold mb-1">Find Experts</h3>
            <p className="text-xs text-purple-100 mb-3">
              Browse human + AI consultants
            </p>
            <span className="text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
              Explore <ArrowRight size={12} />
            </span>
          </Link>

          <Link
            href="/chat"
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-5 hover:shadow-lg transition-shadow"
          >
            <MessageCircle size={24} className="mb-3 text-blue-600" />
            <h3 className="font-bold mb-1 text-slate-900 dark:text-white">
              Start Chatting
            </h3>
            <p className="text-xs text-slate-500 mb-3">Talk to AI consultants</p>
            <span className="text-xs flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all">
              Chat now <ArrowRight size={12} />
            </span>
          </Link>

          <Link
            href="/wallet"
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-5 hover:shadow-lg transition-shadow"
          >
            <span className="text-2xl mb-3 block">💰</span>
            <h3 className="font-bold mb-1 text-slate-900 dark:text-white">
              Wallet
            </h3>
            <p className="text-xs text-slate-500 mb-3">Add funds & view history</p>
            <span className="text-xs flex items-center gap-1 text-emerald-600 group-hover:gap-2 transition-all">
              Open <ArrowRight size={12} />
            </span>
          </Link>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Upcoming Bookings
          </h2>
          <Link
            href="/bookings"
            className="text-sm text-purple-600 hover:underline"
          >
            View all
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
            <Clock size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              No upcoming bookings yet
            </p>
            <Link
              href="/experts"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-purple-700"
            >
              Book a consultant <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((booking: any) => (
              <div
                key={booking.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-white/10"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {booking.status}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(booking.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-bold text-purple-600">
                    ₹{booking.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}