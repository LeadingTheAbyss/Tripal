import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const ADMIN_EMAILS = [
  'kartikeykumarsingh27jun2006@gmail.com',
  'growwayushh@gmail.com',
  'aawasthiapoorv@gmail.com'
];

export async function GET(
  req: Request,
  context: { params: any }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = params.id;
    const cookieStore = await cookies();
    const token = cookieStore.get('planbro_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the last 30 days of telemetry
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];

    let stats: any[] = [];
    if (prisma.dailyUserStat) {
      stats = await prisma.dailyUserStat.findMany({
        where: {
          userId: id,
          date: {
            gte: dateString
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch user telemetry' }, { status: 500 });
  }
}
