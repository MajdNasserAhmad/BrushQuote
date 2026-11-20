import { expect, test } from 'vitest';
import { Buffer } from 'node:buffer';
import { parsePublicEnvironment } from '../../src/lib/config/public-environment';

const valid = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseKey: 'sb_publishable_test_fixture',
  appUrl: 'http://localhost:3000',
};

test('missing credentials produce an actionable configuration state', () => {
  const result = parsePublicEnvironment({});
  expect(result.configured).toBe(false);
  if (!result.configured) expect(result.message).toContain('NEXT_PUBLIC_SUPABASE_URL');
});

test('accepts production HTTPS and local development origins', () => {
  expect(parsePublicEnvironment(valid).configured).toBe(true);
  expect(parsePublicEnvironment({ ...valid, supabaseUrl: 'http://127.0.0.1:54321' }).configured).toBe(true);
  expect(parsePublicEnvironment({ ...valid, appUrl: 'https://brushquote.example/' }).configured).toBe(true);
});

for (const appUrl of ['http://public.example', 'javascript:alert(1)', 'https://user:password@example.com', 'https://example.com/redirect', 'https://example.com?next=evil', 'https://example.com/#token']) {
  test(`rejects unsafe app origin ${appUrl}`, () => {
    expect(parsePublicEnvironment({ ...valid, appUrl }).configured).toBe(false);
  });
}

test('rejects server secrets without including them in error messages', () => {
  const secret = 'sb_secret_private_test_fixture';
  const result = parsePublicEnvironment({ ...valid, supabaseKey: secret });
  expect(result.configured).toBe(false);
  expect(JSON.stringify(result)).not.toContain(secret);
  const jwt = `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;
  expect(parsePublicEnvironment({ ...valid, supabaseKey: jwt }).configured).toBe(false);
});

test('accepts legacy anon keys but rejects malformed keys', () => {
  const jwt = `header.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.signature`;
  expect(parsePublicEnvironment({ ...valid, supabaseKey: jwt }).configured).toBe(true);
  expect(parsePublicEnvironment({ ...valid, supabaseKey: 'invalid' }).configured).toBe(false);
});

