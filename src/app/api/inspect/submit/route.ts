import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      manhole_no,
      manhole_id,
      lat,
      lng,
      location,
      area,
      system_type,
      cause,
      severity,
      notes,
      photos,
      reporter,
      status = '待處理'
    } = body;

    if (!manhole_no || !lat || !lng) {
      return NextResponse.json(
        { error: 'Missing required fields (manhole_no, lat, lng)' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // photos should be a JSON array (array of base64 strings or URLs)
    const photosJson = photos ? JSON.stringify(photos) : null;

    const result = await db.run(
      `INSERT INTO inspect_reports
       (manhole_no, manhole_id, lat, lng, location, area, system_type, cause, severity, notes, photos, reporter, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        manhole_no,
        manhole_id || null,
        lat,
        lng,
        location || null,
        area || null,
        system_type || '污水',
        cause || null,
        severity || null,
        notes || null,
        photosJson,
        reporter || null,
        status
      ]
    );

    const newReport = await db.get('SELECT * FROM inspect_reports WHERE id = ?', [result.lastID]);

    // Parse photos back to array
    if (newReport && newReport.photos) {
      newReport.photos = JSON.parse(newReport.photos);
    }

    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error('Failed to submit inspection report:', error);
    return NextResponse.json(
      { error: 'Failed to submit inspection report' },
      { status: 500 }
    );
  }
}
