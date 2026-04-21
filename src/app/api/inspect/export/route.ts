import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// ---- helpers ----

const SEVERITY_MAP: Record<string, string> = {
  mild: '輕微',
  moderate: '中度',
  severe: '嚴重',
  critical: '緊急',
};

const STATUS_MAP: Record<string, string> = {
  '待處理': '待處理',
  '處理中': '處理中',
  '已完成': '已完成',
};

function fmtSeverity(s: string | null) {
  if (!s) return '';
  return SEVERITY_MAP[s] || s;
}

// ---- PDF generation (raw spec, no external lib) ----

function escPdf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Build a minimal PDF containing a table of inspection reports.
 * Uses raw PDF operators – no external library needed.
 * Embeds NotoSansCJK or falls back to Helvetica if CJK font unavailable.
 * For practical CJK support we generate an HTML page the user can print to PDF.
 */
function buildPdfBytes(rows: any[]): Buffer {
  // Because generating CJK-capable PDF without a library is extremely complex,
  // we generate a well-formatted HTML document that renders as a printable report.
  // The client can use window.print() or the browser's "Print to PDF".
  // This endpoint returns it with content-type application/pdf alternative.
  // Actually — let's build a real minimal PDF with ASCII content and use
  // a simple approach: generate the PDF as HTML with print styles.
  // The caller will get format=pdf → we return an HTML page designed for printing.
  throw new Error('Use format=html-pdf instead');
}

function buildHtmlReport(rows: any[]): string {
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  const tableRows = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.manhole_no || ''}</td>
      <td>${r.location || ''}</td>
      <td>${r.area || ''}</td>
      <td>${r.cause || ''}</td>
      <td>${fmtSeverity(r.severity)}</td>
      <td>${r.notes || ''}</td>
      <td>${r.reporter || ''}</td>
      <td>${r.created_at || ''}</td>
      <td>${STATUS_MAP[r.status] || r.status || ''}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>污水塞管巡檢通報表</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif; font-size: 11px; color: #222; padding: 16px; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
  .meta { text-align: center; font-size: 11px; color: #666; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; font-size: 10px; }
  th { background: #e0e0e0; font-weight: bold; }
  tr:nth-child(even) { background: #f9f9f9; }
  @media print {
    body { padding: 0; }
    button, .no-print { display: none !important; }
  }
  .actions { text-align: center; margin-bottom: 12px; }
  .actions button { padding: 8px 24px; font-size: 14px; cursor: pointer; border: 1px solid #333; border-radius: 4px; background: #1976d2; color: #fff; }
</style>
</head>
<body>
  <div class="actions no-print">
    <button onclick="window.print()">列印 / 儲存 PDF</button>
  </div>
  <h1>污水塞管巡檢通報表</h1>
  <div class="meta">匯出時間：${now}　｜　共 ${rows.length} 筆</div>
  <table>
    <thead>
      <tr>
        <th style="width:30px">序</th>
        <th>人孔編號</th>
        <th>位置</th>
        <th>區域</th>
        <th>塞管原因</th>
        <th>嚴重程度</th>
        <th>備註</th>
        <th>通報人</th>
        <th>通報時間</th>
        <th>狀態</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`;
}

// ---- main handler ----

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const format = params.get('format') || 'xlsx'; // xlsx | pdf
  const status = params.get('status') || '';
  const dateFrom = params.get('date_from') || '';
  const dateTo = params.get('date_to') || '';
  const area = params.get('area') || '';

  try {
    const db = await getDb();

    // Ensure table exists
    await db.run(`CREATE TABLE IF NOT EXISTS inspect_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manhole_no TEXT,
      manhole_id INTEGER,
      lat REAL,
      lng REAL,
      location TEXT,
      area TEXT,
      system_type TEXT DEFAULT '污水',
      cause TEXT,
      severity TEXT,
      notes TEXT,
      photos TEXT,
      reporter TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      status TEXT DEFAULT '待處理'
    )`);

    let sql = 'SELECT * FROM inspect_reports WHERE 1=1';
    const sqlParams: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      sqlParams.push(status);
    }
    if (area) {
      sql += ' AND area = ?';
      sqlParams.push(area);
    }
    if (dateFrom) {
      sql += ' AND created_at >= ?';
      sqlParams.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND created_at <= ?';
      sqlParams.push(dateTo + ' 23:59:59');
    }

    sql += ' ORDER BY created_at DESC';
    const rows = await db.all(sql, sqlParams);

    // ---- XLSX ----
    if (format === 'xlsx') {
      const data = rows.map((r: any, i: number) => ({
        '序號': i + 1,
        '人孔編號': r.manhole_no || '',
        '位置': r.location || '',
        '區域': r.area || '',
        '塞管原因': r.cause || '',
        '嚴重程度': fmtSeverity(r.severity),
        '備註': r.notes || '',
        '通報人': r.reporter || '',
        '通報時間': r.created_at || '',
        '狀態': r.status || '',
        '緯度': r.lat,
        '經度': r.lng,
      }));

      const ws = XLSX.utils.json_to_sheet(data);

      // Column widths
      ws['!cols'] = [
        { wch: 5 },   // 序號
        { wch: 14 },  // 人孔編號
        { wch: 24 },  // 位置
        { wch: 10 },  // 區域
        { wch: 14 },  // 塞管原因
        { wch: 10 },  // 嚴重程度
        { wch: 24 },  // 備註
        { wch: 10 },  // 通報人
        { wch: 18 },  // 通報時間
        { wch: 8 },   // 狀態
        { wch: 12 },  // 緯度
        { wch: 12 },  // 經度
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '巡檢通報');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="inspect_reports_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
      });
    }

    // ---- PDF (printable HTML) ----
    if (format === 'pdf') {
      const html = buildHtmlReport(rows);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format. Use xlsx or pdf.' }, { status: 400 });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed', details: String(error) }, { status: 500 });
  }
}
