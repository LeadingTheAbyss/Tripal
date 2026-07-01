import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const passengers = await prisma.savedPassenger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ passengers });
  } catch (error) {
    console.error('Error fetching passengers:', error);
    return NextResponse.json({ error: 'Failed to fetch passengers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, age, gender, city } = body;

    if (!name || !age || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert to handle unique constraint on [userId, name]
    const passenger = await prisma.savedPassenger.upsert({
      where: {
        userId_name: {
          userId,
          name,
        }
      },
      update: {
        age,
        gender,
        city,
      },
      create: {
        userId,
        name,
        age,
        gender,
        city,
      }
    });

    return NextResponse.json({ passenger });
  } catch (error) {
    console.error('Error saving passenger:', error);
    return NextResponse.json({ error: 'Failed to save passenger' }, { status: 500 });
  }
}
