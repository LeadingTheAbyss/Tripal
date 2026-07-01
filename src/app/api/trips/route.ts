import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { trackApiCall } from '@/lib/metrics';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('planbro_session')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { destination, snapshot } = body;

    if (!destination || !snapshot) {
      return NextResponse.json({ error: 'Missing destination or snapshot' }, { status: 400 });
    }

    const trip = await prisma.tripHistory.create({
      data: {
        userId: session.user.id,
        destination,
        snapshot
      }
    });

    await trackApiCall('/api/trips (POST)');
    return NextResponse.json({ trip });
  } catch (error) {
    console.error('Create trip error:', error);
    return NextResponse.json({ error: 'Failed to save trip' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('planbro_session')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trips = await prisma.tripHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    await trackApiCall('/api/trips (GET)');
    return NextResponse.json({ trips });
  } catch (error) {
    console.error('Fetch trips error:', error);
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}
