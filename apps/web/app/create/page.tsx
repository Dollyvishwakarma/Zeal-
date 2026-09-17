"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Input } from "@zeal/ui";

export default function CreatePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image");
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("content", caption);
    formData.append("tags", tags);

    try {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to create post");
      }
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto px-4 py-6"
    >
      <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white mb-6">
        Create Post
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="border-2 border-dashed border-[#E1C5E7] dark:border-gray-700 rounded-2xl p-8 text-center hover:border-[#9D7DC5] transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <div className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-8">
              <ImageIcon className="w-16 h-16 mx-auto text-[#B8A1D9]" />
              <p className="mt-2 text-[#B8A1D9]">Click to upload an image</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full px-4 py-3 border border-[#E1C5E7] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#9D7DC5] outline-none resize-none bg-white dark:bg-gray-800 text-[#5E4B8B] dark:text-white placeholder:text-[#B8A1D9]"
          rows={3}
        />

        <Input
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-4 py-3 border border-[#E1C5E7] dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#9D7DC5] outline-none bg-white dark:bg-gray-800 text-[#5E4B8B] dark:text-white placeholder:text-[#B8A1D9]"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          disabled={!file || loading}
          className="w-full py-3 bg-[#9D7DC5] text-white rounded-xl font-medium hover:bg-[#533AFD] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Publishing...</>
          ) : (
            "Publish"
          )}
        </Button>
      </form>
    </motion.div>
  );
}
