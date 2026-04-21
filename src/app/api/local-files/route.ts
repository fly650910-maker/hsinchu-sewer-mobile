import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const fileQuery = req.nextUrl.searchParams.get('file');
  if (!fileQuery) {
    return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 });
  }

  // 自動偵測：sewerage-system 的上一層就是下水道科根目錄
  const sewerageBase = process.env.SEWERAGE_BASE_DIR || path.resolve(process.cwd(), '..');
  const baseDirs = [
    `${sewerageBase}/2.汙水下水道/1-3 污水--竣工資料(圖、GIS)/其他地區/中正重劃區管線圖`,
    `${sewerageBase}/2.汙水下水道/1-3 污水--竣工資料(圖、GIS)/其他地區/重劃區竣工圖`,
    `${sewerageBase}/2.汙水下水道/1-3 污水--竣工資料(圖、GIS)/竹北-華興社區區段徵收`,
    `${sewerageBase}/2.汙水下水道/gis/新竹縣污水下水道第一期圖資/竹北市`,
    `${sewerageBase}/2.汙水下水道/gis/新竹縣污水下水道第二期圖資/重劃區竣工圖/非都市土地`,
    `${sewerageBase}/2.汙水下水道/gis/新竹縣污水下水道第二期圖資/重劃區竣工圖/非都市土地/中正重劃區管線圖`,
    `${sewerageBase}/2.汙水下水道/gis/新竹縣污水下水道第二期圖資/重劃區竣工圖/都市計畫區`,
    `${sewerageBase}/2.汙水下水道/gis/新竹縣污水下水道第二期圖資/重劃區竣工圖/都市計畫區/竹北`,
    `${sewerageBase}/2.汙水下水道/gis/新竹縣污水下水道第二期圖資/重劃區竣工圖/都市計畫區/台泥污水-SP`,
    `${sewerageBase}/3.雨水下水道/新竹縣各鄉鎮雨水下水道圖資`
  ];

  let targetPath = null;
  for (const dir of baseDirs) {
    const fullPath = path.join(dir, fileQuery);
    if (fs.existsSync(fullPath)) {
      targetPath = fullPath;
      break;
    }
  }

  if (!targetPath) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const stat = fs.statSync(targetPath);
    const fileStream = fs.createReadStream(targetPath) as any;
    
    const ext = path.extname(targetPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.dwg' || ext === '.rar') contentType = 'application/octet-stream';

    const headers = new Headers();
    headers.set('Content-Length', stat.size.toString());
    headers.set('Content-Type', contentType);
    
    if (ext !== '.pdf') {
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileQuery)}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileQuery)}"`);
    }

    return new NextResponse(fileStream, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error reading local file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
