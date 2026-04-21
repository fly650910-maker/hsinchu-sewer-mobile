import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('file');
  if (!filePath) return NextResponse.json({ error: 'no file param' }, { status: 400 });

  // Only allow files under src/
  if (!filePath.startsWith('src/')) {
    return NextResponse.json({ error: 'only src/ allowed' }, { status: 403 });
  }

  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const content = fs.readFileSync(fullPath);
  const b64 = content.toString('base64');
  return NextResponse.json({ path: filePath, base64: b64, size: content.length });
}
