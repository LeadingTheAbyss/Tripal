import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
  }

  try {
    const appState = await prisma.appState.findUnique({
      where: { storeName: name },
    });

    if (!appState) {
      return NextResponse.json({ value: null });
    }

    return NextResponse.json({ value: appState.stateJson });
  } catch (error) {
    console.error('Error fetching state from DB:', error);
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

    return NextResponse.json({ success: true, id: appState.id });
  } catch (error) {
    console.error('Error saving state to DB:', error);
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting state from DB:', error);
    return NextResponse.json({ error: 'Failed to delete state' }, { status: 500 });
  }
}
