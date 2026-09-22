'use client'

import Link from 'next/link'

type Consultant = {
  id: string
  name?: string
  username?: string
  avatar?: string
  category: string
  bio?: string
  perMinuteRate?: number
  physicalRate?: number
  rating?: number
  isVerified?: boolean
  isActive?: boolean
  specialties?: string[]
  languages?: string[]
  isAI?: boolean
}

export default function ConsultantCard({ consultant }: { consultant: Consultant }) {
  const {
    id, name, username, avatar, category, bio,
    perMinuteRate, physicalRate, rating,
    isVerified, specialties, languages, isAI
  } = consultant

  const displayName = name || username || 'Consultant'
  const avatarUrl = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=9D7DC5&color=fff&size=200`

  return (
    <div className="border rounded-lg p-4 shadow hover:shadow-lg transition bg-white flex flex-col">
      {/* AI Badge */}
      {isAI && (
        <span className="self-start text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mb-2">
          🤖 AI Consultant
        </span>
      )}
      {!isAI && isVerified && (
        <span className="self-start text-xs bg-green-100 text-green-700 px-2 py-1 rounded mb-2">
          ✓ Verified
        </span>
      )}

      {/* Avatar */}
      <img
        src={avatarUrl}
        alt={displayName}
        className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-purple-200"
      />

      {/* Name */}
      <h3 className="text-lg font-bold text-center mt-3">{displayName}</h3>

      {/* Category */}
      <p className="text-sm text-gray-600 text-center capitalize">
        {category?.toLowerCase().replace('_', ' ')}
      </p>

      {/* Rating */}
      {rating !== undefined && rating > 0 && (
        <p className="text-center text-yellow-600 text-sm mt-1">
          ⭐ {rating.toFixed(1)}
        </p>
      )}

      {/* Bio */}
      {bio && (
        <p className="text-xs text-gray-500 text-center mt-2 line-clamp-2">
          {bio}
        </p>
      )}

      {/* Specialties */}
      {specialties && specialties.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center mt-2">
          {specialties.slice(0, 3).map((s, i) => (
            <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Pricing */}
      <div className="text-center text-sm mt-3">
        {isAI ? (
          <span className="text-green-600 font-semibold">Free</span>
        ) : (
          <>
            {perMinuteRate ? (
              <p className="text-gray-700">💬 ₹{perMinuteRate}/min</p>
            ) : null}
            {physicalRate ? (
              <p className="text-gray-700">🏥 ₹{physicalRate} (physical)</p>
            ) : null}
          </>
        )}
      </div>

      {/* CTA */}
      <Link
        href={isAI ? `/ai-consultant/${id}` : `/booking/${id}`}
        className="block mt-4 bg-purple-600 hover:bg-purple-700 text-white text-center py-2 rounded transition"
      >
        {isAI ? 'Chat Now' : 'Book Now'}
      </Link>
    </div>
  )
}