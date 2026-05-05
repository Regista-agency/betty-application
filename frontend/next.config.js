/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  allowedDevOrigins: [
    "*.preview.emergentagent.com",
    "*.preview.emergentcf.cloud",
    "*.cluster-12.preview.emergentcf.cloud",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

module.exports = nextConfig;
