import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { parsePublicEnvironment } from '@/lib/config/public-environment';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Authenticated HTML and auth callbacks must never be cached across users.
  response.headers.set('Cache-Control', 'private, no-store');
  const env = parsePublicEnvironment({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, appUrl: process.env.NEXT_PUBLIC_APP_URL });
  if (!env.configured) return response;
  const supabase = createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, headers) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        response.headers.set('Cache-Control', 'private, no-store');
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}
export const config = { matcher: ['/login', '/register', '/forgot-password', '/reset-password', '/auth/:path*', '/onboarding', '/dashboard/:path*'] };
