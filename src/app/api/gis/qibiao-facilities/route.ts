import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 預先解析好的靜態 JSON（由 Python 腳本從 KMZ 生成）
const DATA_FILE = path.join(process.cwd(), 'public', 'data', 'qibiao-facilities.json')

export async function GET() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return NextResponse.json({ error: '資料檔不存在，請重新執行 KMZ 解析腳本' }, { status: 404 })
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
