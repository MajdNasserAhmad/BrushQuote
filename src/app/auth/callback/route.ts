import { NextResponse, type NextRequest } from 'next/server';
import { publicEnvironment } from '@/lib/config/server-environment';
import { createSupabaseServer } from '@/lib/supabase/server';
import { authDestination } from '@/lib/auth/redirect';
export async function GET(request: NextRequest) {
  const env = publicEnvironment();
  const origin = env.configured ? env.appUrl : request.nextUrl.origin;
  const fail = () => NextResponse.redirect(new URL('/login?error=verification', origin), { headers: { 'Cache-Control': 'private, no-store' } });
  if (!env.configured) return fail();
  const code = request.nextUrl.searchParams.get('code');
  if (!code || code.length > 4096) return fail();
  try {
    const supabase = await createSupabaseServer(true);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail();
    const flow = request.nextUrl.searchParams.get('flow') === 'recovery' ? 'recovery' : 'sign-in';
    return NextResponse.redirect(new URL(authDestination(request.nextUrl.searchParams.get('next'), flow), origin), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return fail(); }
}
