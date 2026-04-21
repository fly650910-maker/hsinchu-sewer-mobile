import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'sewerage.db');

  try {
    const db = await getDb();

    const manholeCount = await db.get('SELECT COUNT(*) as count FROM manholes_unique');
    const pipelineCount = await db.get('SELECT COUNT(*) as count FROM pipelines_unique');
    const sampleManhole = await db.get('SELECT id, manhole_no, x, y, system_type FROM manholes_unique WHERE system_type=? LIMIT 1', ['污水']);

    return NextResponse.json({
      ok: true,
      dbPath,
      cwd: process.cwd(),
      manholes_unique: manholeCount?.count ?? 'error',
      pipelines_unique: pipelineCount?.count ?? 'error',
      sampleManhole,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      dbPath,
      cwd: process.cwd(),
      error: String(error),
    }, { status: 500 });
  }
}
