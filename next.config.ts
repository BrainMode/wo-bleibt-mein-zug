import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // db-vendo-client ist eine reine Node-Library (kein Bundling in RSC/Edge nötig).
  serverExternalPackages: ['db-vendo-client'],
};

export default nextConfig;
