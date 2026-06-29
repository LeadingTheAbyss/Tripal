import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
  }

  try {
    const cacheKey = `appState:${name}`;
    
    // 1. Try fetching from Redis Cache first
    const cachedState = await redis.get(cacheKey);
    if (cachedState) {
      console.log(`[Cache Hit] Serving appState for ${name} from Upstash Redis`);
      // Upstash parses JSON automatically if it was stored as JSON, but we'll return it as is if it's already an object, or parse if string.
      const parsedValue = typeof cachedState === 'string' ? JSON.parse(cachedState) : cachedState;
      return NextResponse.json({ value: parsedValue });
    }

    console.log(`[Cache Miss] Fetching appState for ${name} from PostgreSQL`);
    // 2. Fetch from Database if not in cache
    const appState = await prisma.appState.findUnique({
      where: { storeName: name },
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

    const appState = await prisma.appState.upsert({
      where: { storeName: name },
      update: { stateJson: value },
      create: {
        storeName: name,
        stateJson: value,
      },
    });

    // Invalidate Redis Cache to prevent stale data!
    const cacheKey = `appState:${name}`;
    await redis.del(cacheKey);
    console.log(`[Cache Invalidated] Deleted ${cacheKey} after POST update`);

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
    await prisma.appState.delete({
      where: { storeName: name },
    });

    // Invalidate Redis Cache to prevent serving a deleted state
    const cacheKey = `appState:${name}`;
    await redis.del(cacheKey);
    console.log(`[Cache Invalidated] Deleted ${cacheKey} after DELETE`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting state:', error);
    return NextResponse.json({ error: 'Failed to delete state' }, { status: 500 });
  }
}
