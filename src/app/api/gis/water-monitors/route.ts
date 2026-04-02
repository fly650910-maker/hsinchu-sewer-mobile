import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await getDb()

    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='water_monitors'"
    )
    if (!tableExists) {
      return NextResponse.json({ monitors: [], total: 0 })
    }

    const rows = await db.all(`
      SELECT id, seq, district, manhole_no, station_id, lng, lat, location, diameter
      FROM water_monitors
      ORDER BY seq
    `) as Array<{
      id: number
      seq: number
      district: string
      manhole_no: string
      station_id: string
      lng: number
      lat: number
      location: string
      diameter: number | null
    }>

    return NextResponse.json({ monitors: rows, total: rows.length })
  } catch (err) {
    console.error('water-monitors API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
