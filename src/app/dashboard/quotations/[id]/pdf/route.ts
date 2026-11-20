import sharp from 'sharp';
import { quotationDetails } from '@/features/quotations/data';
import { workspaceData } from '@/features/crm/data';
import { renderQuotationPdf } from '@/features/quotations/pdf';
import { senderSnapshot } from '@/features/quotations/snapshot';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { quotation, items } = await quotationDetails((await params).id);
  const { supabase } = await workspaceData();
  // Issued quotations use their frozen PDF once publication is implemented.
  if (quotation.pdf_path) {
    const { data, error } = await supabase.storage.from('quotation-pdfs').download(quotation.pdf_path);
    if (error || !data) return new Response('The saved PDF could not be loaded.', { status: 503 });
    return new Response(await data.arrayBuffer(), { headers: pdfHeaders(quotation.reference) });
  }
  const sender = senderSnapshot.parse(quotation.sender_snapshot); let logo: Buffer | undefined;
  if (sender.logo_path) {
    const image = await supabase.storage.from('business-logos').download(sender.logo_path);
    if (image.error) return new Response('The company logo could not be loaded. Update the draft before downloading.', { status: 409 });
    logo = await sharp(Buffer.from(await image.data.arrayBuffer())).png().toBuffer();
  }
  return new Response(new Uint8Array(await renderQuotationPdf(quotation, items, logo)), { headers: pdfHeaders(quotation.reference) });
}
function pdfHeaders(reference: string) { return { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${reference.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }; }
