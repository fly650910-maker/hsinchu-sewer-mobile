import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('radius') || '0.003') // ~300m

    if (!lat || !lng) {
      return NextResponse.json({ reports: [] })
    }

    const db = await getDb()

    // 用邊界框快速篩選附近的通報
    const rows = await db.all(
      `SELECT id, report_date, address, issue_type, resolution, year, sheet
       FROM pipe_reports
       WHERE geocoded = 1
         AND lat BETWEEN ? AND ?
         AND lng BETWEEN ? AND ?
       ORDER BY report_date DESC
       LIMIT 20`,
      [lat - radius, lat + radius, lng - radius, lng + radius]
    ) as Array<{
      id: number
      report_date: string
      address: string
      issue_type: string
      resolution: string
      year: string
      sheet: string
    }>

    return NextResponse.json({ reports: rows, total: rows.length })
  } catch (error) {
    console.error('nearby pipe-reports error:', error)
    return NextResponse.json({ reports: [] })
  }
}
