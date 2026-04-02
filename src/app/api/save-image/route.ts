import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filename: string = body.filename;
    const data: string = body.data;
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const saveDir = path.join(homeDir, 'Downloads', '\u4e0b\u6c34\u9053\u79d1');
    fs.mkdirSync(saveDir, { recursive: true });
    const filepath = path.join(saveDir, filename);
    fs.writeFileSync(filepath, Buffer.from(data, 'base64'));
    return NextResponse.json({ ok: true, path: filepath });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
