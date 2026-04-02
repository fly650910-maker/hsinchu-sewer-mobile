const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'sewerage.db');
const GIS_STORM_BASE = '/Users/fly/Downloads/下水道科/3.雨水下水道';

async function main() {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  console.log('--- 1. Database Migration ---');
  try {
    // Add system_type column if not exists
    await db.exec(`ALTER TABLE pipelines ADD COLUMN system_type TEXT DEFAULT '污水';`);
    console.log('Added system_type to pipelines');
  } catch(e) { console.log('pipelines.system_type might already exist.'); }
  
  try {
    await db.exec(`ALTER TABLE manholes ADD COLUMN system_type TEXT DEFAULT '污水';`);
    console.log('Added system_type to manholes');
  } catch(e) { console.log('manholes.system_type might already exist.'); }

  // Set default to existing rows just in case
  await db.exec(`UPDATE pipelines SET system_type = '污水' WHERE system_type IS NULL;`);
  await db.exec(`UPDATE manholes SET system_type = '污水' WHERE system_type IS NULL;`);

  console.log('--- 2. Collecting Stormwater GIS Data ---');
  const gisFiles = [];
  function collectFiles(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          collectFiles(fullPath);
        } else if (/\.(xls|xlsx)$/i.test(entry.name) && !entry.name.startsWith('~') && !entry.name.includes('數量預算') && !entry.name.includes('經費')) {
          gisFiles.push(fullPath);
        }
      }
    } catch (e) {}
  }
  collectFiles(GIS_STORM_BASE);
  console.log(`Found ${gisFiles.length} potential Stormwater Excel files.`);

  let newPipes = 0;
  let newManholes = 0;

  const stmtPipe = await db.prepare(`INSERT INTO pipelines 
    (sewer_no, upstream_node, downstream_node, pipe_type, material, diameter, length, slope, 
     upstream_elevation, downstream_elevation, project_id, project_name, contractor, completion_date, source_file, area, system_type)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, '雨水')`);

  const stmtMH = await db.prepare(`INSERT INTO manholes 
    (manhole_no, x, y, manhole_type, location, ground_level, depth, 
     project_id, project_name, contractor, completion_date, source_file, area, system_type)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, '雨水')`);

  function getArea(fp) {
    if (fp.includes('新埔')) return '新埔鎮';
    if (fp.includes('關西')) return '關西鎮';
    if (fp.includes('北埔')) return '北埔鄉';
    if (fp.includes('竹北')) return '竹北市';
    if (fp.includes('竹東')) return '竹東鎮';
    return '其他(雨水)';
  }

  for (const fp of gisFiles) {
    const area = getArea(fp);
    const fname = path.basename(fp);
    
    try {
      const wb = XLSX.readFile(fp);
      
      // Process Pipe sheet (804020101)
      if (wb.SheetNames.includes('804020101')) {
        const wsP = wb.Sheets['804020101'];
        const rowsP = XLSX.utils.sheet_to_json(wsP, { header: 1 });
        if (rowsP.length >= 3) {
          // Row 0 is English keys, Row 1 is Chinese headers, Data starts at Row 2.
          const headers = rowsP[1]; 
          const iNo = headers.indexOf('雨水下水道編號');
          const iUp = headers.indexOf('上游人孔編號');
          const iDn = headers.indexOf('下游人孔編號');
          const iType = headers.indexOf('雨水下水道型式');
          const iMat = headers.indexOf('雨水下水道材質');
          const iLen = headers.indexOf('雨水下水道長度(m)');
          const iSlp = headers.indexOf('雨水下水道坡度');
          const iUpe = headers.indexOf('上游管底高程');
          const iDne = headers.indexOf('下游管底高程');

          // Often diameter in stormwater is width x height box culvert, we can take width
          const iWid = headers.indexOf('雨水下水道寬度(m)');

          if (iNo > -1) {
            for (let i = 2; i < rowsP.length; i++) {
              const r = rowsP[i];
              if (!r || !r[iNo]) continue;
              
              const diamStr = iWid > -1 ? String(r[iWid] || '') : '';
              await stmtPipe.run(
                String(r[iNo]), String(r[iUp]||''), String(r[iDn]||''),
                String(r[iType]||''), String(r[iMat]||''), diamStr,
                parseFloat(r[iLen]) || null, parseFloat(r[iSlp]) || null,
                parseFloat(r[iUpe]) || null, parseFloat(r[iDne]) || null,
                '', '', '', '', fname, area
              );
              newPipes++;
            }
          }
        }
      }

      // Process Manhole sheet (804020201)
      if (wb.SheetNames.includes('804020201')) {
        const wsM = wb.Sheets['804020201'];
        const rowsM = XLSX.utils.sheet_to_json(wsM, { header: 1 });
        if (rowsM.length >= 3) {
          const headers = rowsM[1];
          const iNo = headers.indexOf('人孔編號');
          const iX = headers.indexOf('X坐標');
          const iY = headers.indexOf('Y坐標');
          const iType = headers.indexOf('人孔蓋型式');
          const iLoc = headers.indexOf('道路名稱');
          const iDep = headers.indexOf('人孔深度(,m)') > -1 ? headers.indexOf('人孔深度(,m)') : headers.indexOf('人孔深度(m)');
          const iTop = headers.indexOf('人孔頂高程');

          // Also check for 804020202 (sometimes they put it in 02)
          if (iNo > -1) {
            for (let i = 2; i < rowsM.length; i++) {
              const r = rowsM[i];
              if (!r || !r[iNo]) continue;
              // X and Y might not be numeric in bad sheets
              let x = parseFloat(r[iX]);
              let y = parseFloat(r[iY]);
              
              if (!isNaN(x) && !isNaN(y)) {
                await stmtMH.run(
                  String(r[iNo]), x, y, String(r[iType]||'人孔'), String(r[iLoc]||''),
                  parseFloat(r[iTop]) || null, parseFloat(r[iDep]) || null,
                  '', '', '', '', fname, area
                );
                newManholes++;
              }
            }
          }
        }
      }

      // Check alternatives if 202 is the main manhole sheet instead of 201
      if (wb.SheetNames.includes('804020202')) {
        const wsM = wb.Sheets['804020202'];
        const rowsM = XLSX.utils.sheet_to_json(wsM, { header: 1 });
        if (rowsM.length >= 3) {
          const headers = rowsM[1];
          const iNo = headers.indexOf('人孔編號');
          const iX = headers.indexOf('X坐標');
          const iY = headers.indexOf('Y坐標');
          const iType = headers.indexOf('人孔種類') > -1 ? headers.indexOf('人孔種類') : headers.indexOf('人孔蓋型式');
          const iLoc = headers.indexOf('道路名稱');
          const iDep = headers.indexOf('人孔深度(,m)') > -1 ? headers.indexOf('人孔深度(,m)') : headers.indexOf('人孔深度(m)');
          const iTop = headers.indexOf('人孔頂高程');

          if (iNo > -1) {
            for (let i = 2; i < rowsM.length; i++) {
              const r = rowsM[i];
              if (!r || !r[iNo]) continue;
              let x = parseFloat(r[iX]); let y = parseFloat(r[iY]);
              if (!isNaN(x) && !isNaN(y)) {
                await stmtMH.run(
                  String(r[iNo]), x, y, String(r[iType]||'人孔'), String(r[iLoc]||''),
                  parseFloat(r[iTop]) || null, parseFloat(r[iDep]) || null,
                  '', '', '', '', fname, area
                );
                newManholes++;
              }
            }
          }
        }
      }

    } catch (e) {
      console.log(`Failed reading ${fname}:`, e.message);
    }
  }

  await stmtPipe.finalize();
  await stmtMH.finalize();

  console.log(`\nImported Stormwater (雨水): ${newPipes} pipes, ${newManholes} manholes.`);
  await db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
