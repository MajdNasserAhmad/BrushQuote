// Liveness only: this does not claim database or provider readiness.
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
