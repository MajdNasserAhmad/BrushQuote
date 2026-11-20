import { AuthPage } from '@/features/auth/auth-page';
import { requireUser } from '@/lib/auth/session';
export const metadata = { title: 'Choose a new password' };
export const dynamic = 'force-dynamic';
export default async function ResetPassword() { await requireUser(); return <AuthPage mode="reset-password" />; }
