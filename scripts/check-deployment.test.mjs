import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentProblems } from './check-deployment.mjs';

const fixture = {
  NEXT_PUBLIC_APP_URL: 'https://app.example.com', NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_fictional_fixture', SUPABASE_SERVICE_ROLE_KEY: 'fixture-only',
  GROQ_API_KEY: 'fixture-only', RESEND_API_KEY: 'fixture-only', RESEND_WEBHOOK_SECRET: 'fixture-only',
  PUBLIC_REQUEST_SIGNING_SECRET: 'fixture-only-not-a-secret-1234567890',
  SUPPORT_EMAIL: 'support@example.com', RESEND_FROM_EMAIL: 'BrushQuote <quotes@example.com>',
};
test('accepts configuration shape without claiming provider verification', () => assert.deepEqual(deploymentProblems(fixture), []));
test('rejects local deployment origins and service-role browser keys', () => {
  const key = `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;
  const errors = deploymentProblems({ ...fixture, NEXT_PUBLIC_APP_URL: 'http://localhost:3000', NEXT_PUBLIC_SUPABASE_ANON_KEY: key });
  assert.equal(errors.length, 2); assert.ok(errors.every(error => !error.includes(key)));
});
test('blocks test sender, missing contact, weak signing and unverified forwarded headers', () => {
  assert.equal(deploymentProblems({ ...fixture, SUPPORT_EMAIL: '', RESEND_FROM_EMAIL: 'Test <onboarding@resend.dev>', PUBLIC_REQUEST_SIGNING_SECRET: 'short', PUBLIC_REQUEST_IP_HEADER: 'x-forwarded-for' }).length, 4);
});
test('rejects credentials or paths embedded in deployment origins', () => {
  assert.equal(deploymentProblems({ ...fixture, NEXT_PUBLIC_APP_URL: 'https://user:password@example.com', NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co/rest' }).length, 2);
});
