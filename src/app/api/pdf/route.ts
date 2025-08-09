// src/app/api/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  const { html } = await req.json(); // markdown already rendered to HTML

  // Launch headless Chrome
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // Set content & wait for fonts / images
  await page.setContent(html, { waitUntil: 'networkidle2' });

  // Optional: tweak styles to remove scrollbars
  await page.addStyleTag({
    content: `body { overflow: hidden !important; }`,
  });

  // Generate PDF (A4, portrait)
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
  });

  await browser.close();

  // Return PDF to client
  return new NextResponse(Buffer.from(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="document-${Date.now()}.pdf"`,
    },
  });
}