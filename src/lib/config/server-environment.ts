import 'server-only';
import { parsePublicEnvironment } from './public-environment';
export function publicEnvironment() {
  return parsePublicEnvironment({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
}
