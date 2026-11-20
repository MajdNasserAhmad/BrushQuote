import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { loadPortal } from '@/features/quotations/portal';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const data = await loadPortal((await params).token);
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
  if (!data) return new Response('Quotation unavailable.', { status: 404, headers });
  const pdf = await createSupabaseAdmin().storage.from('quotation-pdfs').download(data.pdf_path);
  if (pdf.error || !pdf.data) return new Response('The PDF is temporarily unavailable.', { status: 503, headers });
  return new Response(await pdf.data.arrayBuffer(), { headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${data.quote.reference.replace(/[^A-Za-z0-9-]/g, '')}.pdf"` } });
}
