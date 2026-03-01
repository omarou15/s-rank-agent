/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@s-rank/shared"],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
