// Service registry – maps service slugs to Prisma query definitions
import { CATEGORY_ID_TO_PRISMA, CATEGORY_ID_TO_NAME, slugify } from "./slug";

export interface ServiceDefinition {
  categoryId: string;
  serviceSlug: string;
  category: string;      // Prisma ConsultantCategory
  categoryName: string;  // Display name
  specialties: string[]; // Match against Consultant.specialties
  displayName: string;
  icon: string;
  description: string;
}

// Raw service definitions: [categoryId, icon, [serviceNames]]
const RAW_SERVICES: Array<[string, string, string[]]> = [
  // ─── Astrology ──────────────────────────────────────────────────
  ["astrology", "🌟", ["Vedic Astrology", "Western Astrology", "Birth Chart/Kundli", "Compatibility", "Horoscopes"]],
  // ─── Tarot ──────────────────────────────────────────────────────
  ["tarot", "🔮", ["Rider-Waite Tarot", "Lenormand", "Osho Zen", "Angel Cards", "Oracle Cards"]],
  // ─── Numerology ─────────────────────────────────────────────────
  ["numerology", "🔢", ["Life Path Number", "Destiny Number", "Name Analysis", "Phone Decoding"]],
  // ─── Palmistry ──────────────────────────────────────────────────
  ["palmistry", "🖐️", ["Life Line", "Heart Line", "Head Line", "Fate Line", "Marriage Line"]],
  // ─── Psychic ────────────────────────────────────────────────────
  ["psychic", "👁️", ["Spirit Communication", "Evidential Mediumship", "Channeling", "Ancestral Mediumship"]],
  // ─── Clairvoyance ───────────────────────────────────────────────
  ["clairvoyance", "🌙", ["Clairsentience", "Empathic Reading", "Remote Viewing", "Precognition"]],
  // ─── Dreams ─────────────────────────────────────────────────────
  ["dreams", "💭", ["Dream Interpretation", "Lucid Dreaming", "Symbolism", "Recurring Dreams"]],
  // ─── Angels ─────────────────────────────────────────────────────
  ["angels", "👼", ["Angel Readings", "Spirit Guide Communication", "Guardian Angel Guidance"]],
  // ─── Aura ───────────────────────────────────────────────────────
  ["aura", "🌈", ["Aura Reading", "Chakra Balancing", "Aura Cleansing", "Energy Clearing"]],
  // ─── Cartomancy ─────────────────────────────────────────────────
  ["cartomancy", "🃏", ["Playing Card Divination", "Rune Casting", "Pendulum Reading", "Crystal Ball"]],
  // ─── Past Life ──────────────────────────────────────────────────
  ["past-life", "🔄", ["Past Life Regression", "Karmic Reading", "Soul Purpose", "Twin Flame Guidance"]],
  // ─── Shadow Work ────────────────────────────────────────────────
  ["shadow-work", "🌑", ["Shadow Integration", "Ancestral Healing", "Family Constellations", "Generational Trauma"]],
  // ─── Therapy ────────────────────────────────────────────────────
  ["therapy", "🧠", ["Individual Therapy", "Couples Therapy", "CBT", "DBT", "EMDR", "Grief Counseling"]],
  // ─── Psychiatry ─────────────────────────────────────────────────
  ["psychiatry", "💊", ["Medication Management", "Psychiatric Evaluation", "ADHD Assessment", "Mood Disorders"]],
  // ─── Life Coaching ──────────────────────────────────────────────
  ["life-coaching", "🎯", ["Life Coaching", "Career Coaching", "Executive Coaching", "Leadership Coaching"]],
  // ─── Wellness ───────────────────────────────────────────────────
  ["wellness", "🌿", ["Naturopathy", "Ayurveda", "TCM", "Acupuncture", "Nutrition Counseling", "Yoga Therapy"]],
  // ─── Energy Healing ─────────────────────────────────────────────
  ["energy-healing", "✨", ["Reiki", "Pranic Healing", "Therapeutic Touch", "Crystal Healing", "Sound Healing"]],
  // ─── Professional Advice ────────────────────────────────────────
  ["professional-advice", "💼", ["Legal Advice", "Tech Support", "Financial Advice", "Real Estate", "Home Improvement"]],
  // ─── Spiritual Commerce ─────────────────────────────────────────
  ["spiritual-commerce", "🛒", ["Energized Crystals", "Ritual Kits", "Pooja Services", "Ayurvedic Blends"]],
  // ─── Sound Healing ──────────────────────────────────────────────
  ["sound-healing", "🎵", ["Singing Bowls", "Tuning Forks", "Sound Baths", "Vibrational Healing"]],
  // ─── Yoga ───────────────────────────────────────────────────────
  ["yoga", "🧘", ["Hatha Yoga", "Vinyasa", "Kundalini", "Yoga Therapy", "Somatic Movement"]],
  // ─── Meditation ─────────────────────────────────────────────────
  ["meditation", "🧘‍♂️", ["Guided Meditation", "Mindfulness", "Breathwork", "Visualization", "Body Scan"]],
  // ─── Hypnotherapy ───────────────────────────────────────────────
  ["hypnotherapy", "💤", ["Clinical Hypnotherapy", "Past Life Hypnosis", "Habit Change", "Phobia Treatment"]],
  // ─── Feng Shui ──────────────────────────────────────────────────
  ["feng-shui", "🏠", ["Feng Shui", "Vastu Shastra", "Space Clearing", "Element Balancing"]],
  // ─── Pet Psychic ────────────────────────────────────────────────
  ["pet-psychic", "🐾", ["Animal Communication", "Pet Telepathy", "Pet Behavior Insight", "Lost Pet Guidance"]],
  // ─── Oracle ─────────────────────────────────────────────────────
  ["oracle", "🔮", ["I Ching", "Qimen Dunjia", "Purple Star Astrology", "Mayan Tzolk'in"]],
  // ─── Face Reading ───────────────────────────────────────────────
  ["face-reading", "😊", ["Physiognomy", "Face Reading", "Character Analysis"]],
  // ─── Business Coaching ──────────────────────────────────────────
  ["business-coaching", "📈", ["Startup Coaching", "Business Planning", "Marketing Strategy", "Scale-up Planning"]],
  // ─── Health Coaching ────────────────────────────────────────────
  ["health-coaching", "🍎", ["Health Coaching", "Nutrition Counseling", "Weight Management", "Disease Prevention"]],
  // ─── Relationship Coaching ──────────────────────────────────────
  ["relationship-coaching", "💕", ["Dating Advice", "Relationship Coaching", "Breakup Support", "Marriage Counseling"]],
  // ─── Spiritual Coaching ─────────────────────────────────────────
  ["spiritual-coaching", "✨", ["Spiritual Growth", "Soul Purpose", "Spiritual Mentorship", "Awakening Support"]],
  // ─── Functional Medicine ────────────────────────────────────────
  ["functional-medicine", "🧬", ["Root-Cause Healing", "Chronic Disease", "Gut Health", "Hormone Balancing"]],
  // ─── Tantra ─────────────────────────────────────────────────────
  ["tantra", "🌀", ["Tantric Guidance", "Sacred Sexuality", "Intimacy Coaching", "Energy Exchange"]],
  // ─── Aromatherapy ───────────────────────────────────────────────
  ["aromatherapy", "🌹", ["Essential Oils", "Herbal Consultations", "Plant Medicine", "Natural Remedies"]],
  // ─── Naturopathy ────────────────────────────────────────────────
  ["naturopathy", "🌱", ["Natural Medicine", "Lifestyle Medicine", "Herbal Remedies", "Detox Protocols"]],
  // ─── Acupuncture ────────────────────────────────────────────────
  ["acupuncture", "📌", ["Acupuncture", "TCM Herbs", "Qigong", "Tuina Massage"]],
  // ─── Chiropractic ───────────────────────────────────────────────
  ["chiropractic", "💪", ["Chiropractic Adjustment", "Posture Correction", "Pain Management", "Wellness Care"]],
  // ─── Massage ────────────────────────────────────────────────────
  ["massage", "💆", ["Swedish Massage", "Deep Tissue", "Hot Stone", "Myofascial Release"]],
];

// Build registry
function buildRegistry(): Record<string, ServiceDefinition> {
  const registry: Record<string, ServiceDefinition> = {};

  for (const [categoryId, icon, services] of RAW_SERVICES) {
    const prismaCategory = CATEGORY_ID_TO_PRISMA[categoryId] || "HEALER";
    const categoryName = CATEGORY_ID_TO_NAME[categoryId] || categoryId;

    for (const serviceName of services) {
      const serviceSlug = slugify(serviceName);
      const key = `${categoryId}/${serviceSlug}`;

      registry[key] = {
        categoryId,
        serviceSlug,
        category: prismaCategory,
        categoryName,
        // Try matching both the full name and the first word
        specialties: [serviceName, serviceName.split(" ")[0] || serviceName],
        displayName: serviceName,
        icon,
        description: `Consult with verified ${serviceName} experts online`,
      };
    }
  }

  return registry;
}

export const SERVICE_REGISTRY = buildRegistry();

export function getService(categoryId: string, serviceSlug: string): ServiceDefinition | null {
  return SERVICE_REGISTRY[`${categoryId}/${serviceSlug}`] || null;
}

export function getServicesByCategory(categoryId: string): ServiceDefinition[] {
  return Object.values(SERVICE_REGISTRY).filter((s) => s.categoryId === categoryId);
}

export function getServiceHref(categoryId: string, serviceName: string): string {
  return `/services/${categoryId}/${slugify(serviceName)}`;
}

// BATCH_F1_APPLIED
