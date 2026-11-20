import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  // Redirect before Proxy normalizes loopback hostnames, keeping PKCE cookies
  // and email callbacks on the configured local origin. Destination is trusted config.
  async redirects() {
    const app = process.env.NEXT_PUBLIC_APP_URL;
    const db = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (app === 'http://localhost:3000' && db === 'http://127.0.0.1:54321') {
      return ['/register', '/login', '/forgot-password'].map(source => ({ source, has: [{ type: 'host' as const, value: '127\\.0\\.0\\.1' }], missing: [{ type: 'header' as const, key: 'next-action' }], destination: `${app}${source}`, permanent: false }));
    }
    return [];
  },
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }, { source: '/quote/:path*', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }];
  },
};
export default config;
