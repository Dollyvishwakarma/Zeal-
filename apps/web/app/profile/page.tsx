import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, Mail, Shield, Edit, LogOut } from 'lucide-react'
import { signOutAction } from '@/actions/auth'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectedFrom=/profile')

  const { data: profile } = await supabase
    .from('User')
    .select('id, name, email, username, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          My Profile
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage your account information
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-purple-600 to-indigo-700" />

        <div className="px-6 pb-6 -mt-12">
          <div className="w-24 h-24 rounded-full bg-purple-600 border-4 border-white dark:border-slate-900 flex items-center justify-center text-white text-3xl font-bold">
            {profile?.name?.[0]?.toUpperCase() || 'U'}
          </div>

          <div className="mt-6 space-y-5">
            <div className="flex items-center gap-3">
              <User size={18} className="text-purple-600" />
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {profile?.name || 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail size={18} className="text-purple-600" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {profile?.email || user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield size={18} className="text-purple-600" />
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="font-medium text-slate-900 dark:text-white capitalize">
                  {profile?.role?.toLowerCase() || 'user'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/profile/edit"
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-purple-700"
            >
              <Edit size={14} />
              Edit Profile
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-full border border-slate-300 dark:border-white/10 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Dashboard
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-sm font-medium hover:bg-rose-500/20"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}