"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/SupabaseAuthProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Avatar, AvatarImage, AvatarFallback } from "@zeal/ui";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  bio: z.string().max(160, "Bio must be under 160 characters").optional(),
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock user data – replace with API call
  const mockUser = {
    username: user?.user_metadata?.username || "spiritual_seeker",
    bio: user?.user_metadata?.bio || "Exploring spirituality and wellness.",
    email: user?.email || "user@example.com",
    name: user?.user_metadata?.full_name || "Seeker",
    avatar: user?.user_metadata?.avatar_url || "https://ui-avatars.com/api/?name=Seeker&background=9D7DC5&color=fff",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: mockUser.username,
      bio: mockUser.bio,
      email: mockUser.email,
      name: mockUser.name,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      // In production: PUT /api/users/profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // simulate
      router.push("/profile");
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      // In production: upload to Cloudflare R2
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12 text-[#B8A1D9]">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center py-12 text-[#B8A1D9]">Please log in to edit your profile.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-4 py-6"
    >
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#9D7DC5] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to profile
      </button>

      <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white mb-6">Edit Profile</h1>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E1C5E7] dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-[#E1C5E7]">
                <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : mockUser.avatar} alt="Avatar" />
                <AvatarFallback>{mockUser.username?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-[#9D7DC5] rounded-full text-white hover:bg-[#533AFD] transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-[#5E4B8B] dark:text-white">Profile Photo</p>
              <p className="text-xs text-[#B8A1D9] dark:text-gray-400">Click the camera icon to upload</p>
            </div>
          </div>

          <Input
            label="Username"
            {...register("username")}
            error={errors.username?.message}
          />

          <Input
            label="Full Name"
            {...register("name")}
            error={errors.name?.message}
          />

          <Input
            label="Email"
            type="email"
            {...register("email")}
            error={errors.email?.message}
            disabled
          />

          <div>
            <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-1">Bio</label>
            <textarea
              {...register("bio")}
              rows={4}
              className="w-full rounded-xl border border-[#E1C5E7] dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-[#5E4B8B] dark:text-white focus:ring-2 focus:ring-[#9D7DC5] outline-none resize-none"
              placeholder="Tell us about yourself..."
            />
            {errors.bio && <p className="text-sm text-red-500 mt-1">{errors.bio.message}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
