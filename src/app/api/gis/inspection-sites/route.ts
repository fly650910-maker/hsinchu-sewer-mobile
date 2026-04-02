import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await getDb()

    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='inspection_sites'"
    )
    if (!tableExists) {
      return NextResponse.json({ sites: [], total: 0 })
    }

    const rows = await db.all(`
      SELECT id, seq, district, name, site_type, lat, lng, address, depth, year
      FROM inspection_sites
      ORDER BY seq
    `) as Array<{
      id: number
      seq: number
      district: string
      name: string
      site_type: string
      lat: number
      lng: number
      address: string
      depth: number | null
      year: string
    }>

    return NextResponse.json({ sites: rows, total: rows.length })
  } catch (err) {
    console.error('inspection-sites API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
