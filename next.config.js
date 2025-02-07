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
        destination: 'https://proactiveindia-e5f7bnc3gzedbzg4.centralindia-01.azurewebsites.net/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
