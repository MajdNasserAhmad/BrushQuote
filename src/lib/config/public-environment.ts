/** Public configuration only. Never import a server credential into this module. */
export type PublicEnvironment =
  | { configured: true; supabaseUrl: string; supabaseKey: string; appUrl: string }
  | { configured: false; message: string };

function origin(value: string | undefined, allowLocal: boolean): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return undefined;
    if (url.protocol !== 'https:' && !(allowLocal && local && url.protocol === 'http:')) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function parsePublicEnvironment(input: {
  supabaseUrl?: string;
  supabaseKey?: string;
  appUrl?: string;
}): PublicEnvironment {
  const supabaseUrl = origin(input.supabaseUrl, true);
  const appUrl = origin(input.appUrl, true);
  const key = input.supabaseKey?.trim();
  if (!supabaseUrl || !appUrl || !key) {
    return { configured: false, message: 'Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and NEXT_PUBLIC_APP_URL.' };
  }
  // Defense in depth: reject obvious secret keys and legacy service-role JWTs.
  // This does not verify signatures; authentication belongs to Supabase.
  if (key.startsWith('sb_secret_')) return { configured: false, message: 'Use a Supabase public anon or publishable key.' };
  if (!key.startsWith('sb_publishable_')) {
    try {
      const segment = key.split('.')[1];
      if (!segment) throw new Error('Invalid public key');
      const payload: unknown = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload || typeof payload !== 'object' || !('role' in payload) || payload.role !== 'anon') {
        return { configured: false, message: 'Use a Supabase public anon or publishable key.' };
      }
    } catch {
      return { configured: false, message: 'Use a Supabase public anon or publishable key.' };
    }
  }
  return { configured: true, supabaseUrl, supabaseKey: key, appUrl };
}
