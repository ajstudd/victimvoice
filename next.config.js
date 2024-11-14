/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },

  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: 'https://victim-voice-api.onrender.com/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
