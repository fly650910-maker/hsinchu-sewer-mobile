import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await getDb()

    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='flood_hotspots'"
    )

    if (!tableExists) {
      return NextResponse.json({ hotspots: [], total: 0 })
    }

    const rows = await db.all(`
      SELECT id, location, town, lat, lng, description, years, event_count, source
      FROM flood_hotspots
      WHERE lat IS NOT NULL AND lng IS NOT NULL
      ORDER BY event_count DESC
    `) as Array<{
      id: number
      location: string
      town: string
      lat: number
      lng: number
      description: string
      years: string
      event_count: number
      source: string
    }>

    return NextResponse.json({ hotspots: rows, total: rows.length })
  } catch (err) {
    console.error('flood-hotspots API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
