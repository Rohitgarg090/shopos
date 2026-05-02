// QR code proxy — avoids CORS issue in html2canvas PDF generation
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get('data');
  const size = searchParams.get('size') || '80';
  if (!data) return new NextResponse('Missing data', { status: 400 });

  const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=2`;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}