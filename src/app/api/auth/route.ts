import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body;
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }

    const payload = decodeJwt(token);
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const email = payload.email;
    const name = payload.name || 'User';
    const picture = payload.picture || null;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          picture,
        }
      });
    }

    // Create a new session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      }
    });

    // Track daily login
    const today = new Date().toISOString().split('T')[0];
    await prisma.dailyUserStat.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        }
      },
      update: {
        loginCount: { increment: 1 }
      },
      create: {
        userId: user.id,
        date: today,
        loginCount: 1,
      }
    });

    // Set cookie
    const response = NextResponse.json({ user });
    response.cookies.set('planbro_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
