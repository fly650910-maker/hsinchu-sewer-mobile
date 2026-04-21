import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const keyword = `%${q}%`;

  try {
    const db = await open({
      filename: path.join(process.cwd(), 'sewerage.db'),
      driver: sqlite3.Database
    });

    const results: any[] = [];

    // Search Projects
    const projects = await db.all(
      `SELECT id, name, type, status FROM projects WHERE name LIKE ?`,
      [keyword]
    );
    projects.forEach(p => results.push({ type: 'project', id: p.id, title: p.name, desc: `${p.type} - 狀態: ${p.status}`, link: '/progress' }));

    // Search Personnel
    const personnel = await db.all(
      `SELECT id, name, title, responsibilities FROM personnel WHERE name LIKE ? OR responsibilities LIKE ?`,
      [keyword, keyword]
    );
    personnel.forEach(p => results.push({ type: 'personnel', id: p.id, title: `${p.name} (${p.title})`, desc: p.responsibilities, link: '/personnel' }));

    // Search Complaints
    const complaints = await db.all(
      `SELECT id, address, description, status FROM complaints WHERE address LIKE ? OR description LIKE ?`,
      [keyword, keyword]
    );
    complaints.forEach(c => results.push({ type: 'complaint', id: c.id, title: `通報: ${c.address}`, desc: `${c.description?.substring(0, 30)}... [${c.status}]`, link: '/complaints' }));

    // Search GIS (Manholes)
    const manholes = await db.all(
      `SELECT id, manhole_no, location, project_name, system_type FROM manholes WHERE location LIKE ? LIMIT 5`,
      [keyword]
    );
    manholes.forEach(m => results.push({ type: 'gis', id: m.id, title: `人孔: ${m.manhole_no || '未知'} (${m.system_type})`, desc: `${m.location || ''} - ${m.project_name || ''}`, link: '/gis' }));

    await db.close();

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
