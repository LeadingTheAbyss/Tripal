import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const ADMIN_EMAILS = [
  'kartikeykumarsingh27jun2006@gmail.com',
  'growwayushh@gmail.com',
  'aawasthiapoorv@gmail.com'
];

export async function GET() {
  try {
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

    // Admin verified. Fetch stats.
    const totalUsers = await prisma.user.count();
    const totalTrips = await prisma.tripHistory.count();

    // API calls today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const apiCallsTodayAggr = await prisma.user.aggregate({
      _sum: {
        apiCalls: true
      },
      where: {
        lastApiCallDate: {
          gte: today
        }
      }
    });
    
    const totalApiCallsToday = apiCallsTodayAggr._sum.apiCalls || 0;

    // Fetch API Breakdown globally by summing user metrics
    const apiMetricsAggr = await prisma.user.aggregate({
      _sum: {
        apiCallsFlights: true,
        apiCallsTrains: true,
        apiCallsBusses: true,
        apiCallsHotels: true,
        apiCallsPlaces: true,
      }
    });
    
    const apiBreakdown = {
      "Flights": apiMetricsAggr._sum.apiCallsFlights || 0,
      "Trains": apiMetricsAggr._sum.apiCallsTrains || 0,
      "Busses": apiMetricsAggr._sum.apiCallsBusses || 0,
      "Hotels": apiMetricsAggr._sum.apiCallsHotels || 0,
      "Places": apiMetricsAggr._sum.apiCallsPlaces || 0,
    };

    // Fetch all users for the data table
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        apiCalls: true,
        apiCallsFlights: true,
        apiCallsTrains: true,
        apiCallsBusses: true,
        apiCallsHotels: true,
        apiCallsPlaces: true,
        lastApiCallDate: true,
        createdAt: true,
        _count: {
          select: { tripHistories: true }
        }
      }
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalTrips,
        totalApiCallsToday,
        apiBreakdown
      },
      users
    });
  } catch (error) {
    console.error('Admin stats endpoint error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
