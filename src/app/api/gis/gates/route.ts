import { NextResponse } from 'next/server';
import { fetchHsinchuGates } from '@/lib/wra-iot';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const gates = await fetchHsinchuGates();
    return NextResponse.json({ gates, total: gates.length });
  } catch (error) {
    console.error('Gates API error:', error);
    return NextResponse.json({ gates: [], total: 0, error: String(error) });
  }
}
