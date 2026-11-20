import { describe, expect, it } from 'vitest';
import { emailDraftSchema, emailHTML, emailTypes } from '../../src/features/email/schema';
describe('email review content', () => {
  it('escapes untrusted business and message HTML while preserving line breaks', () => {
    const html = emailHTML('<img src=x>', 'Hello & welcome', '<script>alert(1)</script>\nNext line');
    expect(html).not.toContain('<script>'); expect(html).not.toContain('<img'); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('<br>Next line'); expect(html).toContain('Hello &amp; welcome');
  });
  it('bounds drafts and rejects header injection and forged fields for every template', () => {
    const draft = { customer_id: '12345678-1234-4234-8234-123456789012', quotation_id: '', job_id: '', subject: 'A reviewed message', body: 'Hello' };
    for (const template of emailTypes) expect(emailDraftSchema.safeParse({ ...draft, template }).success).toBe(true);
    expect(emailDraftSchema.safeParse({ ...draft, template: 'customer_message', subject: 'Hello\nBcc: victim@example.com' }).success).toBe(false);
    expect(emailDraftSchema.safeParse({ ...draft, template: 'customer_message', recipient: 'forged@example.com' }).success).toBe(false);
    expect(emailDraftSchema.safeParse({ ...draft, template: 'customer_message', body: 'a'.repeat(10001) }).success).toBe(false);
  });
});
