import { AuthPage } from '@/features/auth/auth-page';
export const metadata = { title: 'Reset your password' };
export const dynamic = 'force-dynamic';
export default function ForgotPassword() { return <AuthPage mode="forgot-password" />; }
