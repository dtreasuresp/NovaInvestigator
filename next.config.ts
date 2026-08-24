import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH ?? '',

  allowedDevOrigins: ['10.2.0.2', '10.*.*.*', '192.168.*.*', 'localhost', '127.0.0.1'],
  serverExternalPackages: ['@sparticuz/chromium'],
  outputFileTracingIncludes: {
    '/api/generar-pdf': [
      './node_modules/@sparticuz/chromium/bin/**/*',
      './node_modules/@sparticuz/chromium/build/**/*'
    ]
  },
  typescript: {
    ignoreBuildErrors: true
  },
  turbopack: {
    root: import.meta.dirname
  },
  redirects: async () => {
    return [
      {
        source: '/apps/users',
        destination: '/apps/users/list',
        permanent: true
      },
      {
        source: '/dashboard',
        destination: '/dashboard/investigations',
        permanent: true
      }
    ]
  }
}

export default nextConfig
