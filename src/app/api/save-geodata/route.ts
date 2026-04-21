import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const filePath = join(process.cwd(), 'geodata_tmp.json')
  writeFileSync(filePath, body.data)
  return NextResponse.json({ ok: true, path: filePath, len: body.data.length })
}
