/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@zeal/database", "@zeal/ui", "@zeal/types", "@zeal/utils"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return [
      { source: "/auth/login",             destination: "/login",              permanent: true },
      { source: "/auth/register",          destination: "/register",           permanent: true },
      { source: "/ai-consultants",         destination: "/ai-astrologers",     permanent: true },
      { source: "/services/palmistry",     destination: "/services",           permanent: false },
      { source: "/services/matchmaking",   destination: "/services",           permanent: false },
      { source: "/consultant/white-label", destination: "/consultant/settings", permanent: false },
      { source: "/zeal",                   destination: "/",                   permanent: false },
      { source: "/quests",                 destination: "/sparks",             permanent: false },
      { source: "/referral",              destination: "/sparks",             permanent: false },
      { source: "/bazaar",                 destination: "/explore",            permanent: false },
    ];
  },
  turbopack: { root: __dirname },
};

nextConfig.headers = async () => [
  { source: "/(.*)", headers: securityHeaders },
];

module.exports = nextConfig;
