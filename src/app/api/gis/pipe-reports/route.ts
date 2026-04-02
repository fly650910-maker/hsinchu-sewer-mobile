import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const issueType = searchParams.get('type') || 'all'
    const year = searchParams.get('year') || 'all'

    const db = await getDb()

    // 檢查表是否存在
    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pipe_reports'"
    )
    if (!tableExists) {
      return NextResponse.json({ reports: [], total: 0, stats: {} })
    }

    let sql = `SELECT id, report_date, address, issue_type, resolution, year, sheet, lat, lng
               FROM pipe_reports WHERE geocoded = 1`
    const params: any[] = []

    if (issueType !== 'all') {
      sql += ` AND issue_type LIKE ?`
      params.push(`%${issueType}%`)
    }
    if (year !== 'all') {
      sql += ` AND year = ?`
      params.push(year)
    }

    sql += ` ORDER BY report_date DESC`

    const rows = await db.all(sql, params) as Array<{
      id: number
      report_date: string
      address: string
      issue_type: string
      resolution: string
      year: string
      sheet: string
      lat: number
      lng: number
    }>

    // 統計各類型數量
    const statsRows = await db.all(
      `SELECT issue_type, COUNT(*) as count FROM pipe_reports GROUP BY issue_type ORDER BY count DESC LIMIT 10`
    ) as Array<{ issue_type: string; count: number }>

    const stats: Record<string, number> = {}
    statsRows.forEach(r => { stats[r.issue_type] = r.count })

    return NextResponse.json({
      reports: rows,
      total: rows.length,
      stats,
    })
  } catch (error) {
    console.error('pipe-reports API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
