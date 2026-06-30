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

  // Rewrites for API calls (avoids CORS in development)
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },

  // Prevent Node.js-only packages from being bundled into the Edge Runtime.
  // @opentelemetry uses __dirname internally which is not available in Vercel Edge Runtime.
  serverExternalPackages: [
    "@opentelemetry/api",
    "@opentelemetry/core",
    "@opentelemetry/sdk-trace-base",
    "@opentelemetry/resources",
    "@opentelemetry/semantic-conventions",
    "@opentelemetry/exporter-trace-otlp-http",
    "@opentelemetry/instrumentation",
  ],

  // Webpack config: stub out __dirname for edge builds and exclude problematic packages
  webpack(config, { webpack, nextRuntime }) {
    // For the Edge runtime (middleware), stub out __dirname and Node.js globals
    if (nextRuntime === "edge") {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };

      // (Removed BannerPlugin because it was corrupting Vercel edge chunks and causing 404s.
      // The polyfill.ts file handles the __dirname ReferenceError cleanly.)
    }
    return config;
  },
};

export default nextConfig;
