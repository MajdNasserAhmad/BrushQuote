import { NextResponse, type NextRequest } from 'next/server';
import { publicEnvironment } from '@/lib/config/server-environment';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const env = publicEnvironment();
  const origin = env.configured ? env.appUrl : request.nextUrl.origin;
  const target = (path: string) => NextResponse.redirect(new URL(path, origin), { headers: { 'Cache-Control': 'private, no-store' } });
  const type = request.nextUrl.searchParams.get('type');
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  if (!env.configured || !token_hash || token_hash.length > 4096 || (type !== 'signup' && type !== 'recovery')) return target('/login?error=verification');
  try {
    const supabase = await createSupabaseServer(true);
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) return target('/login?error=verification');
    return target(type === 'recovery' ? '/reset-password' : '/onboarding');
  } catch { return target('/login?error=verification'); }
}
