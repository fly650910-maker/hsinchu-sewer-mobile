import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const minLat = parseFloat(params.get('min_lat') || '24.6')
  const maxLat = parseFloat(params.get('max_lat') || '25.1')
  const minLng = parseFloat(params.get('min_lng') || '120.7')
  const maxLng = parseFloat(params.get('max_lng') || '121.3')

  try {
    const db = await getDb()
    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sedimentation_survey'"
    ) as any
    if (!tableExists) return NextResponse.json({ records: [], total: 0 })

    const rows = await db.all(`
      SELECT id, p_no, district, us_mh, ds_mh,
             us_lat, us_lng, ds_lat, ds_lng,
             sedi_dh, fd_depth, cls, count, inv_date, memo
      FROM sedimentation_survey
      WHERE (us_lat BETWEEN ? AND ? AND us_lng BETWEEN ? AND ?)
         OR (ds_lat BETWEEN ? AND ? AND ds_lng BETWEEN ? AND ?)
      ORDER BY cls DESC, sedi_dh DESC
    `, [minLat, maxLat, minLng, maxLng, minLat, maxLat, minLng, maxLng]) as any[]

    const records = rows.map((r: any) => ({
      id: r.id,
      p_no: r.p_no,
      district: r.district,
      us_mh: r.us_mh,
      ds_mh: r.ds_mh,
      coords: [[r.us_lat, r.us_lng], [r.ds_lat, r.ds_lng]] as [[number, number], [number, number]],
      sedi_dh: r.sedi_dh,
      fd_depth: r.fd_depth,
      cls: r.cls,
      count: r.count,
      inv_date: r.inv_date || '',
      memo: r.memo || '',
    }))

    return NextResponse.json({ records, total: records.length })
  } catch (err) {
    console.error('sedimentation-survey API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
