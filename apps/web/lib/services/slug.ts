// Slug utilities for service URLs
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function unslugify(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Map category IDs (from CategoryAccordion) to Prisma ConsultantCategory
export const CATEGORY_ID_TO_PRISMA: Record<string, string> = {
  astrology: "ASTROLOGER",
  tarot: "TAROT",
  numerology: "NUMEROLOGIST",
  palmistry: "PALMIST",
  psychic: "SPIRITUAL_GUIDE",
  clairvoyance: "SPIRITUAL_GUIDE",
  dreams: "SPIRITUAL_GUIDE",
  angels: "SPIRITUAL_GUIDE",
  aura: "HEALER",
  cartomancy: "TAROT",
  "past-life": "HEALER",
  "shadow-work": "PSYCHOLOGIST",
  therapy: "PSYCHOLOGIST",
  psychiatry: "PSYCHOLOGIST",
  "life-coaching": "LIFE_COACH",
  wellness: "HEALER",
  "energy-healing": "REIKI",
  "professional-advice": "LIFE_COACH",
  "spiritual-commerce": "SPIRITUAL_GUIDE",
  "sound-healing": "HEALER",
  yoga: "YOGA_INSTRUCTOR",
  meditation: "SPIRITUAL_GUIDE",
  hypnotherapy: "PSYCHOLOGIST",
  "feng-shui": "VASTU",
  "pet-psychic": "SPIRITUAL_GUIDE",
  oracle: "TAROT",
  "face-reading": "PALMIST",
  "business-coaching": "LIFE_COACH",
  "health-coaching": "LIFE_COACH",
  "relationship-coaching": "LIFE_COACH",
  "spiritual-coaching": "SPIRITUAL_GUIDE",
  "functional-medicine": "HEALER",
  tantra: "SPIRITUAL_GUIDE",
  aromatherapy: "HEALER",
  naturopathy: "HEALER",
  acupuncture: "HEALER",
  chiropractic: "HEALER",
  massage: "HEALER",
};

// Category display names (for breadcrumbs and hero)
export const CATEGORY_ID_TO_NAME: Record<string, string> = {
  astrology: "Astrology & Divination",
  tarot: "Tarot & Oracle",
  numerology: "Numerology",
  palmistry: "Palmistry",
  psychic: "Psychic Mediumship",
  clairvoyance: "Clairvoyance & Intuition",
  dreams: "Dream Analysis",
  angels: "Angel & Spirit Guides",
  aura: "Aura Reading & Cleansing",
  cartomancy: "Cartomancy & Divination",
  "past-life": "Past Life & Soul Purpose",
  "shadow-work": "Shadow Work & Ancestral Healing",
  therapy: "Mental Health & Therapy",
  psychiatry: "Psychiatry & Medication",
  "life-coaching": "Life & Career Coaching",
  wellness: "Wellness & Holistic Health",
  "energy-healing": "Energy Healing & Reiki",
  "professional-advice": "Professional & Expert Advice",
  "spiritual-commerce": "Spiritual Commerce",
  "sound-healing": "Sound Healing & Vibrational Medicine",
  yoga: "Yoga & Movement Therapy",
  meditation: "Meditation & Mindfulness",
  hypnotherapy: "Hypnotherapy & Hypnosis",
  "feng-shui": "Feng Shui & Vastu",
  "pet-psychic": "Pet Psychic & Animal Communication",
  oracle: "Oracle & Divination Systems",
  "face-reading": "Face Reading & Physiognomy",
  "business-coaching": "Business & Entrepreneurship Coaching",
  "health-coaching": "Health & Nutrition Coaching",
  "relationship-coaching": "Relationship & Dating Coaching",
  "spiritual-coaching": "Spiritual Coaching",
  "functional-medicine": "Functional Medicine",
  tantra: "Tantra & Sacred Sexuality",
  aromatherapy: "Aromatherapy & Herbal Therapy",
  naturopathy: "Naturopathy",
  acupuncture: "Acupuncture & TCM",
  chiropractic: "Chiropractic & Physical Health",
  massage: "Massage Therapy",
};

// BATCH_F1_APPLIED
