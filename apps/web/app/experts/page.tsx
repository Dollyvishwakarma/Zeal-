import ConsultantCard from '@/components/ConsultantCard'

type Consultant = any

async function getConsultants() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/consultants`, {
      cache: 'no-store',
    })
    if (!res.ok) return { human: [], ai: [] }
    return await res.json()
  } catch {
    return { human: [], ai: [] }
  }
}

export default async function ExpertsPage() {
  const { human = [], ai = [] } = await getConsultants()

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-purple-700">Our Experts</h1>
        <p className="text-gray-600 mt-2">
          Connect with verified human consultants or chat with our 24/7 AI consultants
        </p>
      </div>

      {/* AI Consultants Section */}
      {ai.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🤖 AI Consultants
            <span className="text-sm font-normal text-gray-500">
              (Available 24/7)
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ai.map((c: Consultant) => (
              <ConsultantCard key={c.id} consultant={{ ...c, isAI: true }} />
            ))}
          </div>
        </section>
      )}

      {/* Human Consultants Section */}
      {human.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            👤 Human Consultants
            <span className="text-sm font-normal text-gray-500">
              (Verified experts)
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {human.map((c: Consultant) => (
              <ConsultantCard key={c.id} consultant={{ ...c, isAI: false }} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {human.length === 0 && ai.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No consultants available yet.</p>
        </div>
      )}
    </div>
  )
}