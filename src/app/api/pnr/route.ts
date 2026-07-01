import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { trackApiCall } from '@/lib/metrics';

const prisma = new PrismaClient();
const CACHE_HOURS = 12;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnr = searchParams.get('pnr');

  if (!pnr || pnr.length !== 10) {
    return NextResponse.json({ success: false, message: 'Valid 10-digit PNR is required' }, { status: 400 });
  }

  try {
    // 1. Check Cache
    const cachedPnr = await prisma.pnrCache.findUnique({
      where: { pnrNumber: pnr }
    });

    if (cachedPnr) {
      const hoursSinceUpdate = (Date.now() - new Date(cachedPnr.updatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < CACHE_HOURS) {
        console.log(`[PNR] Returning cached data for ${pnr}`);
        await trackApiCall('/api/pnr (cached)');
        return NextResponse.json({ success: true, cached: true, data: cachedPnr.data });
      }
    }

    // 2. Fetch from RapidAPI if no cache or expired
    console.log(`[PNR] Fetching fresh data from RapidAPI for ${pnr}`);
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'RAPIDAPI_KEY is not configured on the server.' }, { status: 500 });
    }

    const url = `https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/${pnr}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'irctc-indian-railway-pnr-status.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`RapidAPI responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(data, { status: 400 });
    }

    // 3. Save to Cache
    await prisma.pnrCache.upsert({
      where: { pnrNumber: pnr },
      update: {
        data: data.data as any,
      },
      create: {
        pnrNumber: pnr,
        data: data.data as any,
      }
    });

    await trackApiCall('/api/pnr (fetch)');
    return NextResponse.json({ success: true, cached: false, data: data.data });

  } catch (error: any) {
    console.error(`[PNR Error]: ${error.message}`);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch PNR status' }, { status: 500 });
  }
}
