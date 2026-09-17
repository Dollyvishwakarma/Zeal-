"use client";

import { getServiceHref } from "@/lib/services";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Sparkles, Brain, Heart, Star, Briefcase, Leaf,
  Users, Shield, Eye, Moon, Feather, Compass, Cloud, Crown, Gem, Hand,
  MessageCircle, Award, Smile, Coffee, Book, Music, Camera, Home, Trees,
  Mountain, Waves, Rainbow, Infinity, Droplet, Wind, Sun, Globe
} from "lucide-react";
import { ServiceCard } from "./ServiceCard";

const CATEGORIES = [
  { id: "astrology", icon: Sparkles, name: "Astrology & Divination", description: "Vedic, Western, Chinese – birth charts, horoscopes, compatibility.", services: ["Vedic Astrology", "Western Astrology", "Birth Chart/Kundli", "Compatibility", "Horoscopes"], count: 12 },
  { id: "tarot", icon: Star, name: "Tarot & Oracle", description: "Tarot readings for guidance, clarity, and self‑reflection.", services: ["Rider‑Waite Tarot", "Lenormand", "Osho Zen", "Angel Cards", "Oracle Cards"], count: 6 },
  { id: "numerology", icon: Gem, name: "Numerology", description: "Discover your life path, destiny, and soul purpose through numbers.", services: ["Life Path Number", "Destiny Number", "Name Analysis", "Phone Decoding"], count: 5 },
  { id: "palmistry", icon: Hand, name: "Palmistry", description: "Read your life, love, and fortune through the lines on your palms.", services: ["Life Line", "Heart Line", "Head Line", "Fate Line", "Marriage Line"], count: 6 },
  { id: "psychic", icon: Eye, name: "Psychic Mediumship", description: "Connect with spirit guides, ancestors, and loved ones who have passed.", services: ["Spirit Communication", "Evidential Mediumship", "Channeling", "Ancestral Mediumship"], count: 5 },
  { id: "clairvoyance", icon: Moon, name: "Clairvoyance & Intuition", description: "Empathic, intuitive readings for deep insight.", services: ["Clairsentience", "Empathic Reading", "Remote Viewing", "Precognition"], count: 5 },
  { id: "dreams", icon: Cloud, name: "Dream Analysis", description: "Understand the hidden messages in your dreams.", services: ["Dream Interpretation", "Lucid Dreaming", "Symbolism", "Recurring Dreams"], count: 5 },
  { id: "angels", icon: Feather, name: "Angel & Spirit Guides", description: "Connect with your guardian angels and spirit guides.", services: ["Angel Readings", "Spirit Guide Communication", "Guardian Angel Guidance"], count: 4 },
  { id: "aura", icon: Rainbow, name: "Aura Reading & Cleansing", description: "Read and cleanse your energy field for balance.", services: ["Aura Reading", "Chakra Balancing", "Aura Cleansing", "Energy Clearing"], count: 5 },
  { id: "cartomancy", icon: Crown, name: "Cartomancy & Divination", description: "Divination using playing cards, runes, pendulums.", services: ["Playing Card Divination", "Rune Casting", "Pendulum Reading", "Crystal Ball"], count: 5 },
  { id: "past-life", icon: Compass, name: "Past Life & Soul Purpose", description: "Explore your past lives, karma, and soul's true purpose.", services: ["Past Life Regression", "Karmic Reading", "Soul Purpose", "Twin Flame Guidance"], count: 5 },
  { id: "shadow-work", icon: Shield, name: "Shadow Work & Ancestral Healing", description: "Heal generational trauma and integrate your shadow.", services: ["Shadow Integration", "Ancestral Healing", "Family Constellations", "Generational Trauma"], count: 5 },
  { id: "therapy", icon: Brain, name: "Mental Health & Therapy", description: "Licensed therapy for anxiety, depression, trauma, relationships.", services: ["Individual Therapy", "Couples Therapy", "CBT", "DBT", "EMDR", "Grief Counseling"], count: 7 },
  { id: "psychiatry", icon: Shield, name: "Psychiatry & Medication", description: "Psychiatric evaluations and medication management.", services: ["Medication Management", "Psychiatric Evaluation", "ADHD Assessment", "Mood Disorders"], count: 4 },
  { id: "life-coaching", icon: Users, name: "Life & Career Coaching", description: "Achieve personal and professional goals with expert coaching.", services: ["Life Coaching", "Career Coaching", "Executive Coaching", "Leadership Coaching"], count: 5 },
  { id: "wellness", icon: Leaf, name: "Wellness & Holistic Health", description: "Holistic health for mind, body, and spirit.", services: ["Naturopathy", "Ayurveda", "TCM", "Acupuncture", "Nutrition Counseling", "Yoga Therapy"], count: 7 },
  { id: "energy-healing", icon: Sun, name: "Energy Healing & Reiki", description: "Energy healing, Reiki, pranic healing, chakra balancing.", services: ["Reiki", "Pranic Healing", "Therapeutic Touch", "Crystal Healing", "Sound Healing"], count: 5 },
  { id: "professional-advice", icon: Briefcase, name: "Professional & Expert Advice", description: "Get answers from verified experts in law, finance, tech.", services: ["Legal Advice", "Tech Support", "Financial Advice", "Real Estate", "Home Improvement"], count: 6 },
  { id: "spiritual-commerce", icon: Award, name: "Spiritual Commerce", description: "Ritual kits, crystals, and spiritual products.", services: ["Energized Crystals", "Ritual Kits", "Pooja Services", "Ayurvedic Blends"], count: 5 },
  { id: "sound-healing", icon: Music, name: "Sound Healing & Vibrational Medicine", description: "Healing through sound vibrations and singing bowls.", services: ["Singing Bowls", "Tuning Forks", "Sound Baths", "Vibrational Healing"], count: 5 },
  { id: "yoga", icon: Mountain, name: "Yoga & Movement Therapy", description: "Therapeutic yoga, movement, and somatic healing.", services: ["Hatha Yoga", "Vinyasa", "Kundalini", "Yoga Therapy", "Somatic Movement"], count: 5 },
  { id: "meditation", icon: Moon, name: "Meditation & Mindfulness", description: "Guided meditation, mindfulness, and breathwork.", services: ["Guided Meditation", "Mindfulness", "Breathwork", "Visualization", "Body Scan"], count: 5 },
  { id: "hypnotherapy", icon: Eye, name: "Hypnotherapy & Hypnosis", description: "Hypnosis for habit change, phobia treatment, regression.", services: ["Clinical Hypnotherapy", "Past Life Hypnosis", "Habit Change", "Phobia Treatment"], count: 5 },
  { id: "feng-shui", icon: Home, name: "Feng Shui & Vastu", description: "Space harmonisation for balance, prosperity, and well‑being.", services: ["Feng Shui", "Vastu Shastra", "Space Clearing", "Element Balancing"], count: 5 },
  { id: "pet-psychic", icon: Heart, name: "Pet Psychic & Animal Communication", description: "Connect with your pets and understand their needs.", services: ["Animal Communication", "Pet Telepathy", "Pet Behavior Insight", "Lost Pet Guidance"], count: 4 },
  { id: "oracle", icon: Star, name: "Oracle & Divination Systems", description: "Ancient divination systems for guidance and insight.", services: ["I Ching", "Qimen Dunjia", "Purple Star Astrology", "Mayan Tzolk'in"], count: 5 },
  { id: "face-reading", icon: Smile, name: "Face Reading & Physiognomy", description: "Read personality and destiny through facial features.", services: ["Physiognomy", "Face Reading", "Character Analysis"], count: 3 },
  { id: "business-coaching", icon: Briefcase, name: "Business & Entrepreneurship Coaching", description: "Start, scale, and grow your business.", services: ["Startup Coaching", "Business Planning", "Marketing Strategy", "Scale‑up Planning"], count: 5 },
  { id: "health-coaching", icon: Leaf, name: "Health & Nutrition Coaching", description: "Personalised health plans and nutrition guidance.", services: ["Health Coaching", "Nutrition Counseling", "Weight Management", "Disease Prevention"], count: 5 },
  { id: "relationship-coaching", icon: Heart, name: "Relationship & Dating Coaching", description: "Navigate relationships, dating, breakups, and marriage.", services: ["Dating Advice", "Relationship Coaching", "Breakup Support", "Marriage Counseling"], count: 5 },
  { id: "spiritual-coaching", icon: Star, name: "Spiritual Coaching", description: "Deepen your spirituality and connect with your higher self.", services: ["Spiritual Growth", "Soul Purpose", "Spiritual Mentorship", "Awakening Support"], count: 4 },
  { id: "functional-medicine", icon: Droplet, name: "Functional Medicine", description: "Root‑cause approach to health and chronic disease.", services: ["Root‑Cause Healing", "Chronic Disease", "Gut Health", "Hormone Balancing"], count: 5 },
  { id: "tantra", icon: Infinity, name: "Tantra & Sacred Sexuality", description: "Sacred sexuality, intimacy, and spiritual connection.", services: ["Tantric Guidance", "Sacred Sexuality", "Intimacy Coaching", "Energy Exchange"], count: 4 },
  { id: "aromatherapy", icon: Wind, name: "Aromatherapy & Herbal Therapy", description: "Healing through essential oils and herbal remedies.", services: ["Essential Oils", "Herbal Consultations", "Plant Medicine", "Natural Remedies"], count: 4 },
  { id: "naturopathy", icon: Leaf, name: "Naturopathy", description: "Natural and holistic approaches to health and healing.", services: ["Natural Medicine", "Lifestyle Medicine", "Herbal Remedies", "Detox Protocols"], count: 4 },
  { id: "acupuncture", icon: Moon, name: "Acupuncture & TCM", description: "Traditional Chinese Medicine for health and balance.", services: ["Acupuncture", "TCM Herbs", "Qigong", "Tuina Massage"], count: 4 },
  { id: "chiropractic", icon: Compass, name: "Chiropractic & Physical Health", description: "Spinal adjustment, posture correction, and pain relief.", services: ["Chiropractic Adjustment", "Posture Correction", "Pain Management", "Wellness Care"], count: 4 },
  { id: "massage", icon: Sparkles, name: "Massage Therapy", description: "Therapeutic massage for relaxation and healing.", services: ["Swedish Massage", "Deep Tissue", "Hot Stone", "Myofascial Release"], count: 4 },
];

// Map category IDs to service routes (we'll assume the route is /services/[service-id])
// For this demo, we'll generate a route from the service name.
const getServiceRoute = (categoryId: string, serviceName: string) => {
  const slug = serviceName.toLowerCase().replace(/ /g, "-");
  return `/services/${slug}`;
};

export function CategoryAccordion() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = CATEGORIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.services.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="🔍 Search categories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-3 rounded-xl glass border border-[#E1C5E7]/30 focus:ring-2 focus:ring-[#9D7DC5] outline-none text-[#5E4B8B] dark:text-white placeholder:text-[#B8A1D9]"
      />
      <div className="space-y-3">
        {filtered.map((category) => {
          const isExpanded = expandedId === category.id;
          const Icon = category.icon;

          return (
            <div
              key={category.id}
              className="glass-card-3d overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              {/* ── Header ── */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : category.id)}
                className="w-full p-4 flex items-center gap-4 text-left transition-colors hover:bg-white/5"
              >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#9D7DC5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#5E4B8B] dark:text-white">
                      {category.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#9D7DC5]/10 text-[#9D7DC5]">
                      {category.count} services
                    </span>
                  </div>
                  <p className="text-sm text-[#B8A1D9] truncate">
                    {category.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#B8A1D9]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#B8A1D9]" />
                  )}
                </div>
              </button>

              {/* ── Expanded Content ── */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                      transition: {
                        height: { type: "spring", stiffness: 120, damping: 18 },
                        opacity: { duration: 0.3, ease: "easeOut" },
                      },
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                      transition: {
                        height: { type: "spring", stiffness: 120, damping: 18 },
                        opacity: { duration: 0.2, ease: "easeIn" },
                      },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-[#E1C5E7]/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {category.services.map((serviceName, idx) => {
                          // Map service name to icon (simplified – use emoji or first letter)
                          // For a real implementation, you'd have an icon map.
                          const iconEmoji = serviceName.includes("Astrology") ? "🌟" :
                                            serviceName.includes("Tarot") ? "🔮" :
                                            serviceName.includes("Numerology") ? "🔢" :
                                            serviceName.includes("Palmistry") ? "🖐️" :
                                            serviceName.includes("Psychic") ? "👁️" :
                                            serviceName.includes("Mediumship") ? "👻" :
                                            serviceName.includes("Dream") ? "💭" :
                                            serviceName.includes("Angel") ? "👼" :
                                            serviceName.includes("Aura") ? "🌈" :
                                            serviceName.includes("Cartomancy") ? "🃏" :
                                            serviceName.includes("Past Life") ? "🔄" :
                                            serviceName.includes("Shadow") ? "🌑" :
                                            serviceName.includes("Therapy") ? "🧠" :
                                            serviceName.includes("Psychiatry") ? "💊" :
                                            serviceName.includes("Coaching") ? "🎯" :
                                            serviceName.includes("Wellness") ? "🌿" :
                                            serviceName.includes("Energy") ? "⚡" :
                                            serviceName.includes("Reiki") ? "🤲" :
                                            serviceName.includes("Advice") ? "💼" :
                                            serviceName.includes("Commerce") ? "🛒" :
                                            serviceName.includes("Sound") ? "🎵" :
                                            serviceName.includes("Yoga") ? "🧘" :
                                            serviceName.includes("Meditation") ? "🧘" :
                                            serviceName.includes("Hypnotherapy") ? "💤" :
                                            serviceName.includes("Feng Shui") ? "🏠" :
                                            serviceName.includes("Pet") ? "🐾" :
                                            serviceName.includes("Oracle") ? "🔮" :
                                            serviceName.includes("Face") ? "😊" :
                                            serviceName.includes("Business") ? "📈" :
                                            serviceName.includes("Health") ? "🍎" :
                                            serviceName.includes("Relationship") ? "💕" :
                                            serviceName.includes("Spiritual") ? "✨" :
                                            serviceName.includes("Functional") ? "🧬" :
                                            serviceName.includes("Tantra") ? "🌀" :
                                            serviceName.includes("Aromatherapy") ? "🌹" :
                                            serviceName.includes("Naturopathy") ? "🌱" :
                                            serviceName.includes("Acupuncture") ? "📌" :
                                            serviceName.includes("Chiropractic") ? "💪" :
                                            serviceName.includes("Massage") ? "💆" : "✨";

                          // Create a short description based on service name
                          const desc = `Expert ${serviceName} guidance`;

                          return (
                            <ServiceCard
                              key={`${category.id}-${serviceName}`}
                              id={`${category.id}-${serviceName}`}
                              name={serviceName}
                              icon={iconEmoji}
                              description={desc}
                              route={getServiceHref(category.id, serviceName)}
                              index={idx}
                            />
                          );
                        })}
                      </div>
                      {/* Optional: View All button */}
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => window.location.href = `/explore?category=${category.id}`}
                          className="text-sm text-[#9D7DC5] hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                          View all {category.name} services →
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ZEAL_CATEGORY_ENHANCED
