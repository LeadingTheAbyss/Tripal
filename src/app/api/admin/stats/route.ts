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
    // API Calls All Time (Sum of lifetime specific metrics)
    const apiMetricsAggr = await prisma.user.aggregate({
      _sum: {
        apiCallsFlights: true,
        apiCallsTrains: true,
        apiCallsBusses: true,
        apiCallsHotels: true,
        apiCallsPlaces: true,
      }
    });
    
    const totalApiCallsAllTime = 
      (apiMetricsAggr._sum.apiCallsFlights || 0) +
      (apiMetricsAggr._sum.apiCallsTrains || 0) +
      (apiMetricsAggr._sum.apiCallsBusses || 0) +
      (apiMetricsAggr._sum.apiCallsHotels || 0) +
      (apiMetricsAggr._sum.apiCallsPlaces || 0);

    // API calls today and yesterday for trend
    const now = new Date();
    const nowIST = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const todayStr = `${nowIST.getFullYear()}-${String(nowIST.getMonth()+1).padStart(2,'0')}-${String(nowIST.getDate()).padStart(2,'0')}`;
    
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayIST = new Date(yesterdayDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const yesterdayStr = `${yesterdayIST.getFullYear()}-${String(yesterdayIST.getMonth()+1).padStart(2,'0')}-${String(yesterdayIST.getDate()).padStart(2,'0')}`;

    let totalApiCallsToday = 0;
    let apiCallsYesterday = 0;

    if (prisma.dailyUserStat) {
      const dailyStatsAggr = await prisma.dailyUserStat.groupBy({
        by: ['date'],
        where: {
          date: { in: [todayStr, yesterdayStr] }
        },
        _sum: { apiCalls: true }
      });

      totalApiCallsToday = dailyStatsAggr.find(d => d.date === todayStr)?._sum.apiCalls || 0;
      apiCallsYesterday = dailyStatsAggr.find(d => d.date === yesterdayStr)?._sum.apiCalls || 0;
    }


    
    const apiBreakdown = {
      "Flights": apiMetricsAggr._sum.apiCallsFlights || 0,
      "Trains": apiMetricsAggr._sum.apiCallsTrains || 0,
      "Buses": apiMetricsAggr._sum.apiCallsBusses || 0,
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
        totalApiCallsAllTime,
        totalApiCallsToday,
        apiCallsYesterday,
        apiBreakdown
      },
      users
    });
  } catch (error) {
    console.error('Admin stats endpoint error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
