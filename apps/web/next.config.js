/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crucible/ui', '@crucible/shared', '@crucible/config'],
};

module.exports = nextConfig;
