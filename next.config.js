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
        destination: 'https://victimvoice-csbwapewd2e8fpe2.centralindia-01.azurewebsites.net/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
