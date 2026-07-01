/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint errors during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during production builds (type-check separately)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Enable React strict mode for better development warnings
  reactStrictMode: true,

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: "AI Multi-Agent Workspace",
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
  },

  // Image domains for avatars/assets
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
