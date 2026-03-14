/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  webpack: (config) => {
    // pdfjs-dist tries to import the 'canvas' Node.js package — not needed in browsers
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
