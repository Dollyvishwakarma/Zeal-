import { NextResponse } from "next/server";
import { redis } from "@/lib/cache";

const CATEGORIES = [
  { id: "astrology", name: "Astrology & Divination", count: 12 },
  { id: "tarot", name: "Tarot & Oracle", count: 6 },
  { id: "numerology", name: "Numerology", count: 5 },
  { id: "palmistry", name: "Palmistry", count: 6 },
  { id: "psychic", name: "Psychic Mediumship", count: 5 },
  { id: "clairvoyance", name: "Clairvoyance & Intuition", count: 5 },
  { id: "dreams", name: "Dream Analysis", count: 5 },
  { id: "angels", name: "Angel & Spirit Guides", count: 4 },
  { id: "aura", name: "Aura Reading & Cleansing", count: 5 },
  { id: "cartomancy", name: "Cartomancy & Divination", count: 5 },
  { id: "past-life", name: "Past Life & Soul Purpose", count: 5 },
  { id: "shadow-work", name: "Shadow Work & Ancestral Healing", count: 5 },
  { id: "therapy", name: "Mental Health & Therapy", count: 7 },
  { id: "psychiatry", name: "Psychiatry & Medication", count: 4 },
  { id: "life-coaching", name: "Life & Career Coaching", count: 5 },
  { id: "wellness", name: "Wellness & Holistic Health", count: 7 },
  { id: "energy-healing", name: "Energy Healing & Reiki", count: 5 },
  { id: "professional-advice", name: "Professional & Expert Advice", count: 6 },
  { id: "spiritual-commerce", name: "Spiritual Commerce", count: 5 },
  { id: "sound-healing", name: "Sound Healing & Vibrational Medicine", count: 5 },
  { id: "yoga", name: "Yoga & Movement Therapy", count: 5 },
  { id: "meditation", name: "Meditation & Mindfulness", count: 5 },
  { id: "hypnotherapy", name: "Hypnotherapy & Hypnosis", count: 5 },
  { id: "feng-shui", name: "Feng Shui & Vastu", count: 5 },
  { id: "pet-psychic", name: "Pet Psychic & Animal Communication", count: 4 },
  { id: "oracle", name: "Oracle & Divination Systems", count: 5 },
  { id: "face-reading", name: "Face Reading & Physiognomy", count: 3 },
  { id: "business-coaching", name: "Business & Entrepreneurship Coaching", count: 5 },
  { id: "health-coaching", name: "Health & Nutrition Coaching", count: 5 },
  { id: "relationship-coaching", name: "Relationship & Dating Coaching", count: 5 },
  { id: "spiritual-coaching", name: "Spiritual Coaching", count: 4 },
  { id: "functional-medicine", name: "Functional Medicine", count: 5 },
  { id: "tantra", name: "Tantra & Sacred Sexuality", count: 4 },
  { id: "aromatherapy", name: "Aromatherapy & Herbal Therapy", count: 4 },
  { id: "naturopathy", name: "Naturopathy", count: 4 },
  { id: "acupuncture", name: "Acupuncture & TCM", count: 4 },
  { id: "chiropractic", name: "Chiropractic & Physical Health", count: 4 },
  { id: "massage", name: "Massage Therapy", count: 4 },
];

export const GET = async () => {
  await redis.setex("zeal:categories", 3600, JSON.stringify(CATEGORIES));
  return NextResponse.json(CATEGORIES);
};

// ZEAL_HUB_2_APPLIED
