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
  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.addStyleTag({
  content: `
    table, th, td { border: 1px solid #ccc !important; }
    .katex-display, .katex { background: white !important; }
  `,
});

// KaTeX fonts and SVGs
await page.addStyleTag({ url: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css' });

// optional: wait for MathJax if you use it
await page.waitForFunction(() => (window as any).MathJax?.typesetPromise != null
  ? (window as any).MathJax.typesetPromise()
  : true);
  // Optional: tweak styles to remove scrollbars
  await page.addStyleTag({
    content: `body { overflow: hidden !important; }`,
  });

  // Generate PDF (A4, portrait)
  const pdfBuffer = await page.pdf({
    format: 'a4',
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