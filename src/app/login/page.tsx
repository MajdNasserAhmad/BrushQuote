import { AuthPage } from '@/features/auth/auth-page';
export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const params = await searchParams; return <AuthPage mode="login" verificationError={params.error === 'verification'} />; }
