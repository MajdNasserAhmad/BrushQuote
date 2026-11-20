import { AuthPage } from '@/features/auth/auth-page';
export const metadata = { title: 'Create account' };
export const dynamic = 'force-dynamic';
export default function Register() { return <AuthPage mode="register" />; }
