import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditProfileForm from './EditProfileForm'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectedFrom=/profile/edit')

  const { data: profile } = await supabase
    .from('User')
    .select('id, name, email, username')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 mb-6"
      >
        <ArrowLeft size={16} />
        Back to Profile
      </Link>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Edit Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Update your account information
        </p>

        <EditProfileForm
          initialName={profile?.name || ''}
          email={profile?.email || user.email || ''}
          username={profile?.username || ''}
        />
      </div>
    </div>
  )
}