/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Proxy API calls to backend
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:7210/api/:path*',
        },
      ],
    };
  },
  // Enable modern features and performance optimizations
  experimental: {
    // Enable React Server Components optimizations
    optimizePackageImports: ['recharts', 'react-markdown'],
  },
  // Enable compression and caching
  compress: true,
  // Optimize images
  images: {
    unoptimized: false,
  },
  // Enable modern build features
  typescript: {
    // Ensure type checking doesn't slow down builds
    ignoreBuildErrors: false,
  },
  // Optimize webpack bundle
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Enable production optimizations
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
