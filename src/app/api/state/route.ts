import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { cookies } from 'next/headers';

async function getUserId() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('planbro_session')?.value;
    if (!token) return null;
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) return null;
    return session.userId;
  } catch (e) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
  }

  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ value: null });

    const scopedName = `${userId}:${name}`;
    const cacheKey = `appState:${scopedName}`;
    
    // 1. Try fetching from Redis Cache first
    const cachedState = await redis.get(cacheKey);
    if (cachedState) {
      console.log(`[Cache Hit] Serving appState for ${scopedName} from Upstash Redis`);
      const parsedValue = typeof cachedState === 'string' ? JSON.parse(cachedState) : cachedState;
      return NextResponse.json({ value: parsedValue });
    }

    console.log(`[Cache Miss] Fetching appState for ${scopedName} from PostgreSQL`);
    // 2. Fetch from Database if not in cache
    const appState = await prisma.appState.findUnique({
      where: { storeName: scopedName },
    });

    if (!appState) {
      return NextResponse.json({ value: null });
    }

    // 3. Store in Redis Cache with a 10-minute TTL (600 seconds)
    await redis.set(cacheKey, JSON.stringify(appState.stateJson), { ex: 600 });

    return NextResponse.json({ value: appState.stateJson });
  } catch (error) {
    console.error('Error fetching state:', error);
    return NextResponse.json({ error: 'Failed to fetch state' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, value } = await request.json();

    if (!name || !value) {
      return NextResponse.json({ error: 'Store name and value are required' }, { status: 400 });
    }

    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const scopedName = `${userId}:${name}`;

    const appState = await prisma.appState.upsert({
      where: { storeName: scopedName },
      update: { stateJson: value },
      create: {
        storeName: scopedName,
        stateJson: value,
      },
    });

    // Invalidate Redis Cache
    const cacheKey = `appState:${scopedName}`;
    await redis.del(cacheKey);

    return NextResponse.json({ success: true, id: appState.id });
  } catch (error) {
    console.error('Error saving state:', error);
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
  }

  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const scopedName = `${userId}:${name}`;

    await prisma.appState.delete({
      where: { storeName: scopedName },
    });

    // Invalidate Redis Cache
    const cacheKey = `appState:${scopedName}`;
    await redis.del(cacheKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting state:', error);
    return NextResponse.json({ error: 'Failed to delete state' }, { status: 500 });
  }
}
