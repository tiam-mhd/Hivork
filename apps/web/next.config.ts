import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@hivork/contracts', '@hivork/i18n', '@hivork/theme', '@hivork/ui'],
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
