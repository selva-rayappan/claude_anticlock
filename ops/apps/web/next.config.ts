import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@opsnext/shared'],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
