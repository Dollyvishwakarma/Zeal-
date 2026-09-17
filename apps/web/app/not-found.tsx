import Link from "next/link";
import { Home, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-bold text-[#9D7DC5] dark:text-[#9D7DC5] mb-4">404</h1>
      <h2 className="text-2xl font-bold text-[#5E4B8B] dark:text-white mb-2">Page Not Found</h2>
      <p className="text-sm text-[#B8A1D9] dark:text-gray-400 mb-6 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#533AFD]/30 transition-all"
        >
          <Home className="w-4 h-4 inline mr-2" /> Go Home
        </Link>
        <Link
          href="/explore"
          className="px-6 py-3 bg-[#F4E8F7] dark:bg-gray-800 text-[#5E4B8B] dark:text-white rounded-xl font-medium hover:bg-[#E1C5E7] dark:hover:bg-gray-700 transition-all"
        >
          <Search className="w-4 h-4 inline mr-2" /> Explore
        </Link>
      </div>
    </div>
  );
}
