import AIChat from '@/components/AIChat'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function AIConsultantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: consultant } = await supabase
    .from('AIConsultant')
    .select('*')
    .eq('id', id)
    .single()

  if (!consultant) return notFound()

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border flex items-center gap-4">
          <img
            src={consultant.avatar}
            alt={consultant.name}
            className="w-16 h-16 rounded-full border-2 border-purple-200"
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{consultant.name}</h1>
            <p className="text-sm text-purple-600 font-medium capitalize">
              {consultant.category?.toLowerCase()}
            </p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{consultant.bio}</p>
          </div>
          <div className="text-right">
            <div className="text-yellow-500 text-sm">⭐ {consultant.rating}</div>
            <div className="text-xs text-gray-400">
              {consultant.totalConsultations}+ chats
            </div>
          </div>
        </div>
      </div>

      <AIChat
        consultantId={id}
        consultantName={consultant.name}
        consultantAvatar={consultant.avatar}
      />
    </div>
  )
}