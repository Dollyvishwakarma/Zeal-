import type { ConsultantCategory, Faith } from "./enums";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "USER" | "HEALER" | "ADMIN" | "SUPER_ADMIN";
  sparks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsultantProfile {
  id: string;
  userId: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  category: ConsultantCategory;
  isVerified: boolean;
  isOnline: boolean;
  perMinuteRate: number;
  experience: number;
  rating: number;
  totalConsultations: number;
  sparks: number;
  languages: string[];
  specialties: string[];
  faith: Faith;
  isAI?: boolean;
  isPaid?: boolean;
}

export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  cheerCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: Date;
}

export interface SparkActivity {
  id: string;
  type: "cheer" | "comment" | "share" | "follow" | "mention";
  actor: { id: string; username: string; avatar: string };
  target?: { id: string; content: string };
  sparksEarned: number;
  createdAt: Date;
}

export interface SparkBazaarListing {
  id: string;
  userId: string;
  user: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
    sparks: number;
    role: string;
  };
  sparks: number;
  rank: number;
  tier: "bronze" | "silver" | "gold";
  isAvailable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: "daily" | "weekly";
  requirement: number;
  reward: number;
  icon: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuestProgress {
  id: string;
  userId: string;
  questId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
