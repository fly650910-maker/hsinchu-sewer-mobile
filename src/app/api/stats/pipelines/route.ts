import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();

    // 各管區長度統計
    const rows = await db.all(`
      SELECT
        area,
        system_type,
        COUNT(*) as pipe_count,
        ROUND(SUM(length) / 1000.0, 2) as total_km,
        ROUND(AVG(length), 1) as avg_m,
        COUNT(DISTINCT material) as material_types
      FROM pipelines
      WHERE length IS NOT NULL AND length > 0
      GROUP BY area, system_type
      ORDER BY SUM(length) DESC
    `);

    // 全縣總計
    const summary = await db.get(`
      SELECT
        COUNT(*) as total_pipes,
        ROUND(SUM(length) / 1000.0, 2) as total_km,
        COUNT(DISTINCT area) as area_count,
        COUNT(DISTINCT material) as material_count,
        ROUND(AVG(length), 1) as avg_length_m
      FROM pipelines
      WHERE length IS NOT NULL AND length > 0
    `);

    // 管材統計
    const materials = await db.all(`
      SELECT material, COUNT(*) as cnt, ROUND(SUM(length)/1000.0, 2) as km
      FROM pipelines
      WHERE length IS NOT NULL AND material IS NOT NULL AND material != ''
      GROUP BY material
      ORDER BY SUM(length) DESC
      LIMIT 10
    `);

    // 管徑分佈
    const diameters = await db.all(`
      SELECT
        CASE
          WHEN CAST(diameter AS INTEGER) <= 200 THEN '200mm以下(小管)'
          WHEN CAST(diameter AS INTEGER) <= 400 THEN '201-400mm(中管)'
          WHEN CAST(diameter AS INTEGER) <= 800 THEN '401-800mm(大管)'
          ELSE '800mm以上(幹管)'
        END as range,
        COUNT(*) as cnt,
        ROUND(SUM(length)/1000.0, 2) as km
      FROM pipelines
      WHERE length IS NOT NULL AND diameter IS NOT NULL AND diameter != ''
      GROUP BY range
      ORDER BY cnt DESC
    `);

    return NextResponse.json({ rows, summary, materials, diameters });
  } catch (e: any) {
    console.error('Stats API error:', e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
