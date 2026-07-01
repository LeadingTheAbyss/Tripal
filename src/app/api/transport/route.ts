import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { trackApiCall } from '@/lib/metrics';

const PYTHON_API_URL = 'http://127.0.0.1:8001/api';

const ADMIN_EMAILS = [
  'kartikeykumarsingh27jun2006@gmail.com',
  'growwayushh@gmail.com',
  'aawasthiapoorv@gmail.com'
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    const destination = searchParams.get('destination');
    const mode = searchParams.get('mode') || 'all';

    if (!source || !destination) {
      return NextResponse.json({ error: 'Source and destination are required' }, { status: 400 });
    }

    // 1. Authenticate user
    const cookieStore = await cookies();
    const token = cookieStore.get('planbro_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in to search for transport' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized: Session expired' }, { status: 401 });
    }

    const user = session.user;

    // 2. Check & Update Rate Limit
    const now = new Date();
    const lastCallDate = new Date(user.lastApiCallDate);
    
    let currentCalls = user.apiCalls;
    let flightsCalls = user.apiCallsFlights || 0;
    let trainsCalls = user.apiCallsTrains || 0;
    let bussesCalls = user.apiCallsBusses || 0;
    
    // Reset counter if it's a new day
    if (
      now.getFullYear() !== lastCallDate.getFullYear() ||
      now.getMonth() !== lastCallDate.getMonth() ||
      now.getDate() !== lastCallDate.getDate()
    ) {
      currentCalls = 0;
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email);

    if (!isAdmin && currentCalls >= 45) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: You have reached your 45 API calls limit for today.' }, 
        { status: 429 }
      );
    }

    if (mode === 'flights' || mode === 'all') flightsCalls++;
    if (mode === 'trains' || mode === 'all') trainsCalls++;
    if (mode === 'busses' || mode === 'all') bussesCalls++;

    // Update user call count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        apiCalls: currentCalls + 1,
        apiCallsFlights: flightsCalls,
        apiCallsTrains: trainsCalls,
        apiCallsBusses: bussesCalls,
        lastApiCallDate: now
      }
    });

    // 3. Proxy to Python Backend
    const response = await fetch(`${PYTHON_API_URL}/transport?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&mode=${mode}`);
    
    if (!response.ok) {
      throw new Error(`Python API responded with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Track granular API metric
    await trackApiCall('/api/transport');

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
  } catch (error) {
    console.error('Transport proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch transport options' }, { status: 500 });
  }
}
