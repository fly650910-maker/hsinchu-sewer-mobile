import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const manhole_no = searchParams.get('manhole_no');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDb();

    let query = 'SELECT * FROM inspect_reports WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (manhole_no) {
      query += ' AND manhole_no LIKE ?';
      params.push(`%${manhole_no}%`);
    }

    if (date_from) {
      query += ' AND created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND created_at <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const reports = await db.all(query, params);

    // Parse photos for each report
    const parsedReports = reports.map((report: any) => ({
      ...report,
      photos: report.photos ? JSON.parse(report.photos) : []
    }));

    return NextResponse.json({
      reports: parsedReports,
      total: reports.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Failed to fetch inspection reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspection reports' },
      { status: 500 }
    );
  }
}
