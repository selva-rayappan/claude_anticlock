import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL ?? `file:${path.resolve(__dirname, 'dev.db').replace(/\\/g, '/')}`,
  },
}

export default nextConfig
