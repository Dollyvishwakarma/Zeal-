'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function EditProfileForm({
  initialName,
  email,
  username,
}: {
  initialName: string
  email: string
  username: string
}) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not logged in')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('User')
      .update({ name })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/profile')
        router.refresh()
      }, 1000)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Display Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 cursor-not-allowed"
        />
        <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Username
        </label>
        <input
          type="text"
          value={username}
          disabled
          className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 cursor-not-allowed"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> Profile updated successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </button>
    </form>
  )
}