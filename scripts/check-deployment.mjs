import { pathToFileURL } from 'node:url';

export function deploymentProblems(env) {
  const problems = [];
  for (const key of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
    try {
      const url = new URL(env[key]);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error();
    } catch { problems.push(`${key}: set a public HTTPS origin without a path.`); }
  }
  const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let publicKeyValid = publicKey.startsWith('sb_publishable_');
  if (!publicKeyValid) {
    try { publicKeyValid = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { /* Invalid public key. */ }
  }
  if (!publicKeyValid) problems.push('NEXT_PUBLIC_SUPABASE_ANON_KEY: use a public anon/publishable key, never a service-role key.');
  for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'GROQ_API_KEY', 'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET']) {
    if (!env[key]?.trim()) problems.push(`${key}: missing server configuration.`);
  }
  if ((env.PUBLIC_REQUEST_SIGNING_SECRET || '').length < 32) problems.push('PUBLIC_REQUEST_SIGNING_SECRET: use at least 32 random characters.');
  const address = value => /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value || '');
  if (!address(env.SUPPORT_EMAIL)) problems.push('SUPPORT_EMAIL: set a valid public contact address.');
  const sender = (env.RESEND_FROM_EMAIL || '').match(/<([^<>]+)>$/)?.[1] || env.RESEND_FROM_EMAIL || '';
  if (!address(sender) || /@(?:.*\.)?resend\.dev$/i.test(sender)) problems.push('RESEND_FROM_EMAIL: use an authorized business sender, not the provider test sender.');
  if (env.PUBLIC_REQUEST_IP_HEADER?.trim()) problems.push('PUBLIC_REQUEST_IP_HEADER: leave blank until the hosting proxy header is independently verified.');
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = deploymentProblems(process.env);
  for (const problem of problems) console.error(problem);
  console.log(problems.length ? `Deployment configuration: ${problems.length} unresolved item(s).` : 'Deployment configuration shape passed.');
  console.log('This check does not verify credentials, sender ownership, SMTP delivery, migrations or webhook delivery. Complete the deployed acceptance checks in docs/DEPLOYMENT.md.');
  process.exitCode = problems.length ? 1 : 0;
}
