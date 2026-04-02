import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BASE_DIR = '/Users/fly/Downloads/下水道科';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dirParam = searchParams.get('dir') || '';
    
    // Security check to ensure we don't go above BASE_DIR
    const targetPath = path.join(BASE_DIR, dirParam);
    if (!targetPath.startsWith(BASE_DIR)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const items = entries.map(entry => {
      const isDir = entry.isDirectory();
      return {
        name: entry.name,
        isDir,
        path: path.join(dirParam, entry.name).replace(/\\/g, '/'),
        size: isDir ? undefined : fs.statSync(path.join(targetPath, entry.name)).size
      };
    }).sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      currentPath: dirParam,
      items
    });
  } catch (error) {
    console.error('Failed to read directory:', error);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}
