export const Role = {
  USER: "USER",
  HEALER: "HEALER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;
export type Role = typeof Role[keyof typeof Role];

export const ConsultantCategory = {
  ASTROLOGER: "astrologer",
  PSYCHOLOGIST: "psychologist",
  TAROT: "tarot",
  NUMEROLOGIST: "numerologist",
  PALMIST: "palmist",
  VASTU: "vastu",
  REIKI: "reiki",
  LIFE_COACH: "life_coach",
  HEALER: "healer",
  MOTIVATIONAL_SPEAKER: "motivational_speaker",
  SPIRITUAL_GUIDE: "spiritual_guide",
  YOGA_INSTRUCTOR: "yoga_instructor",
} as const;
export type ConsultantCategory = typeof ConsultantCategory[keyof typeof ConsultantCategory];

export const Faith = {
  HINDU: "HINDU",
  ISLAM: "ISLAM",
  CHRISTIAN: "CHRISTIAN",
  BUDDHIST: "BUDDHIST",
  JEWISH: "JEWISH",
  SIKH: "SIKH",
  OTHER: "OTHER",
} as const;
export type Faith = typeof Faith[keyof typeof Faith];
