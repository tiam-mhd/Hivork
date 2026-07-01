import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@hivork/contracts', '@hivork/theme', '@hivork/ui'],
  reactStrictMode: true,
};

export default nextConfig;
