/**
 * Seed script: imports personnel from 業務分配表 and GIS pipeline/manhole data from Excel files
 */
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'sewerage.db');
const GIS_BASE = '/Users/fly/Downloads/下水道科/2.汙水下水道/1-3 污水--竣工資料(圖、GIS)';

async function main() {
  // Remove old DB to start fresh
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Removed old database.');
  }

  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      responsibilities TEXT NOT NULL,
      phone_ext TEXT,
      deputy TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress_percent INTEGER DEFAULT 0,
      contractor TEXT,
      start_date DATE,
      end_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_name TEXT NOT NULL,
      phone TEXT,
      address TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      resolution_notes TEXT,
      reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS pipelines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sewer_no TEXT,
      upstream_node TEXT,
      downstream_node TEXT,
      pipe_type TEXT,
      material TEXT,
      diameter TEXT,
      length REAL,
      slope REAL,
      upstream_elevation REAL,
      downstream_elevation REAL,
      project_id TEXT,
      project_name TEXT,
      contractor TEXT,
      completion_date TEXT,
      source_file TEXT,
      area TEXT
    );
    CREATE TABLE IF NOT EXISTS manholes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manhole_no TEXT,
      x REAL,
      y REAL,
      manhole_type TEXT,
      location TEXT,
      ground_level REAL,
      depth REAL,
      project_id TEXT,
      project_name TEXT,
      contractor TEXT,
      completion_date TEXT,
      source_file TEXT,
      area TEXT
    );
  `);

  // =====================================================
  // 1. SEED PERSONNEL (from 業務分配表 115.01.01 image)
  // =====================================================
  console.log('\n=== Seeding Personnel ===');
  const personnelData = [
    {
      name: '邱昶笙', title: '技正', deputy: '謝輝彥',
      responsibilities: '一、污水使用費專案(含用戶資訊管理台帳系統)\n二、「新竹縣污水下水道系統建設推動計畫」及「新竹縣關西地區污水下水道規劃報告」\n三、竹北污水下水道第三期實施計畫\n四、污水使用費徵圍議金辦法訂定發布\n五、竹北三期一標(工程發包決標)\n六、其他交辦事項\n綜合業務：竹北二期3、4標查核(採購法101停權、監察院)、採購法及下水道相關法規等業務辦理、科長第一職務代理人'
    },
    {
      name: '謝輝彥', title: '技士', deputy: '彭亦蓁',
      responsibilities: '一、芎林鄉污水下水道規劃重新檢討\n二、竹東水資功能提升案\n三、竹東三期一標\n四、竹東三期二標\n五、其他交辦事項\n綜合業務：芎林(含五鄉)、斯馬庫斯污水事宜、竹東污水下水道第三期實施計畫、竹東系統綜合性來文收辦、竹北二期3、4標查核(審計室)、科長第二職務代理人'
    },
    {
      name: '林孟融', title: '技士', deputy: '邱昶笙',
      responsibilities: '一、竹北二期九標\n二、竹北水資中心代操作維護案\n三、污水使用費函價業務\n四、其他交辦事項\n綜合業務：下水道關連附排收費、污水年度評鑑、竹北水資中心綜合性業務'
    },
    {
      name: '劉純瑩', title: '約用專案人員', deputy: '林美玟',
      responsibilities: '一、專用下水道工程審查\n二、經費、總務相關業務\n三、其他交辦事項\n綜合業務：經費等相關業務及來文收辦、約用人員相關業務'
    },
    {
      name: '彭亦蓁', title: '約用專案人員', deputy: '謝輝彥',
      responsibilities: '一、竹東二期管線第一、二標後續工程訴訟案協商\n二、新豐鄉河頂自辦重劃區污水處理廠維護案\n三、其他交辦事項\n綜合業務：圖資查詢、工程查核及工程品質等相關來文收辦、用戶排水設備會簽及專用下水道會簽、資訊科管線單位窗口、健康城市、節能減碳專案窗口、性平感委口'
    },
    {
      name: '黃美蘭', title: '約用專案人員', deputy: '',
      responsibilities: '一、協助竹北及竹東水資中心代操作維護案\n二、其他交辦事項'
    },
    {
      name: '林美玟', title: '約用專案人員', deputy: '劉純瑩',
      responsibilities: '一、污水下水道設施維護及檢修(開口契約)\n二、污水下水道已到達地區公共管線延伸工程(開口契約)\n三、專用下水道審查(竹東、芎林、橫山、寶山、北埔、峨眉)\n四、其他交辦事項\n綜合業務：芎林、新埔、王銘堂、馬三等公辦重劃區污水管線維護、竹北中正、成壹自辦重劃區污水設備(含遞水設備)'
    },
    {
      name: '林博文', title: '約用專案人員', deputy: '邱昶笙',
      responsibilities: '一、竹北二期六標\n二、竹北二期八標\n三、竹北水資二期擴建計畫\n四、其他交辦事項\n綜合業務：再生水窗口'
    },
    {
      name: '劉致宏', title: '約用專案人員', deputy: '林博文',
      responsibilities: '一、竹北二期七標\n二、污水下水道已到達地區用戶納管申請案(竹東)\n三、新豐鄉建興路雨水下水道工程\n四、竹北市嘉豐街雨水下水道工程\n五、全縣雨水下水道水位計監測設置案(原李貞宜業務)\n六、雨水下水道設施工程維護開口契約(原李貞宜業務)\n七、竹東水資用地取得案(原李貞宜業務)\n八、其他交辦事項\n綜合業務：竹北系統綜合性業務辦理、相關土地財產業務、防災業務、前瞻計畫窗口、湖口污水下水道建設計畫、新豐污水下水道建設計畫'
    },
    {
      name: '陳侑琪', title: '約用專案人員', deputy: '林孟融',
      responsibilities: '一、竹東水資中心代操作維護案\n二、污水下水道已到達地區用戶納管申請案(竹北、竹東)\n三、用戶排水設備承裝商登記\n四、竹北二期九標(協辦)\n五、其他交辦事項\n綜合業務：竹東水資中心綜合性業務、持權發還等相關窗口、區域聯防計畫窗口'
    },
    {
      name: '黃悅香', title: '技工', deputy: '',
      responsibilities: '一、污水下水道用戶資料建置\n二、各項報表填報(施政計畫、縣務會議)\n三、污水使用費專案\n四、協助各項考核資料準備工作及協助各承辦業務資料整理\n五、其他交辦事項\n綜合業務：議會質詢及縣長施政報告及業務報告等相關業務彙整、相關機關及綜合性來文收辦、通期公文、審計部來文及其他列管事項備催、上課、訓練、講習等相關來文收辦'
    },
    {
      name: '別科支援', title: '約用人員', deputy: '',
      responsibilities: '一、公文收發\n綜合業務：科內環境整理、協助資料查詢、繕打、登錄、統計相關事宜、其他交辦事項'
    },
    {
      name: '任景詮', title: '約用人員', deputy: '',
      responsibilities: '一、協助公文收發\n二、科內環境整理\n三、協助資料查詢、繕打、登錄、統計相關事宜\n四、其他交辦事項'
    }
  ];

  const stmtP = await db.prepare('INSERT INTO personnel (name, title, responsibilities, deputy) VALUES (?, ?, ?, ?)');
  for (const p of personnelData) {
    await stmtP.run(p.name, p.title, p.responsibilities, p.deputy);
  }
  await stmtP.finalize();
  console.log(`Inserted ${personnelData.length} personnel records.`);

  // =====================================================
  // 2. SEED PROJECTS (extracted from personnel assignments)
  // =====================================================
  console.log('\n=== Seeding Projects ===');
  const projectsData = [
    { name: '竹北污水下水道第三期實施計畫', type: '汙水', status: '辦理中', progress: 15, contractor: '' },
    { name: '竹北二期六標', type: '汙水', status: '辦理中', progress: 60, contractor: '' },
    { name: '竹北二期七標', type: '汙水', status: '辦理中', progress: 55, contractor: '' },
    { name: '竹北二期八標', type: '汙水', status: '辦理中', progress: 50, contractor: '' },
    { name: '竹北二期九標', type: '汙水', status: '辦理中', progress: 40, contractor: '' },
    { name: '竹北三期一標(工程發包決標)', type: '汙水', status: '辦理中', progress: 10, contractor: '' },
    { name: '竹北水資中心代操作維護案', type: '汙水', status: '辦理中', progress: 70, contractor: '' },
    { name: '竹北水資二期擴建計畫', type: '汙水', status: '辦理中', progress: 20, contractor: '' },
    { name: '竹東三期一標', type: '汙水', status: '辦理中', progress: 30, contractor: '' },
    { name: '竹東三期二標', type: '汙水', status: '辦理中', progress: 25, contractor: '' },
    { name: '竹東水資中心代操作維護案', type: '汙水', status: '辦理中', progress: 65, contractor: '' },
    { name: '竹東水資功能提升案', type: '汙水', status: '辦理中', progress: 35, contractor: '' },
    { name: '竹東水資用地取得案', type: '汙水', status: '辦理中', progress: 25, contractor: '' },
    { name: '芎林鄉污水下水道規劃重新檢討', type: '汙水', status: '辦理中', progress: 20, contractor: '' },
    { name: '新竹縣污水下水道系統建設推動計畫', type: '汙水', status: '辦理中', progress: 45, contractor: '' },
    { name: '新竹縣關西地區污水下水道規劃', type: '汙水', status: '辦理中', progress: 15, contractor: '' },
    { name: '新豐鄉河頂自辦重劃區污水處理廠維護案', type: '汙水', status: '辦理中', progress: 75, contractor: '' },
    { name: '污水下水道設施維護及檢修(開口契約)', type: '汙水', status: '辦理中', progress: 80, contractor: '' },
    { name: '污水下水道已到達地區公共管線延伸工程(開口契約)', type: '汙水', status: '辦理中', progress: 60, contractor: '' },
    { name: '污水使用費專案(含用戶資訊管理台帳系統)', type: '汙水', status: '辦理中', progress: 50, contractor: '' },
    { name: '全縣雨水下水道水位計監測設置案', type: '雨水', status: '辦理中', progress: 40, contractor: '' },
    { name: '雨水下水道設施工程維護開口契約', type: '雨水', status: '辦理中', progress: 60, contractor: '' },
    { name: '新豐鄉建興路雨水下水道工程', type: '雨水', status: '辦理中', progress: 35, contractor: '' },
    { name: '竹北市嘉豐街雨水下水道工程', type: '雨水', status: '辦理中', progress: 30, contractor: '' },
    { name: '湖口污水下水道建設計畫', type: '汙水', status: '辦理中', progress: 10, contractor: '' },
    { name: '新豐污水下水道建設計畫', type: '汙水', status: '辦理中', progress: 10, contractor: '' },
    { name: '竹東二期管線第一、二標後續工程訴訟案', type: '汙水', status: '辦理中', progress: 50, contractor: '' },
    { name: '專用下水道工程審查', type: '其他', status: '辦理中', progress: 50, contractor: '' },
  ];

  const stmtPr = await db.prepare('INSERT INTO projects (name, type, status, progress_percent, contractor) VALUES (?, ?, ?, ?, ?)');
  for (const proj of projectsData) {
    await stmtPr.run(proj.name, proj.type, proj.status, proj.progress, proj.contractor);
  }
  await stmtPr.finalize();
  console.log(`Inserted ${projectsData.length} project records.`);

  // =====================================================
  // 3. IMPORT GIS PIPELINE & MANHOLE DATA FROM EXCEL FILES
  // =====================================================
  console.log('\n=== Importing GIS Pipeline & Manhole Data ===');

  // Collect all .xls and .xlsx files under GIS directory
  const gisFiles = [];
  function collectFiles(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          collectFiles(fullPath);
        } else if (/\.(xls|xlsx)$/i.test(entry.name) && !entry.name.startsWith('~')) {
          gisFiles.push(fullPath);
        }
      }
    } catch (e) {
      // skip inaccessible dirs
    }
  }
  collectFiles(GIS_BASE);
  console.log(`Found ${gisFiles.length} GIS Excel files to process.`);

  let totalPipelines = 0;
  let totalManholes = 0;

  const stmtPipe = await db.prepare(`INSERT INTO pipelines 
    (sewer_no, upstream_node, downstream_node, pipe_type, material, diameter, length, slope, 
     upstream_elevation, downstream_elevation, project_id, project_name, contractor, completion_date, source_file, area)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const stmtMH = await db.prepare(`INSERT INTO manholes 
    (manhole_no, x, y, manhole_type, location, ground_level, depth, 
     project_id, project_name, contractor, completion_date, source_file, area)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  // Determine area from file path
  function getArea(fp) {
    if (fp.includes('竹北一期')) return '竹北一期';
    if (fp.includes('竹北二期')) return '竹北二期';
    if (fp.includes('竹東二期')) return '竹東二期';
    if (fp.includes('台泥')) return '竹東(台泥重劃區)';
    return '其他';
  }

  for (const fp of gisFiles) {
    const area = getArea(fp);
    const fname = path.basename(fp);

    try {
      const wb = XLSX.readFile(fp);

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) continue;

        const header = rows[0].map(h => String(h || '').trim());
        
        // Skip English header row if present
        let dataStartIdx = 1;
        const secondRow = rows[1] ? rows[1].map(h => String(h || '').trim()) : [];
        if (secondRow.some(v => /^[A-Z_]+$/.test(v))) {
          dataStartIdx = 2;
        }

        // Detect if this is a pipeline sheet (has 管線編號/連接管編號/SEWER_NO column)
        const isPipelineSheet = header.some(h => 
          h.includes('管線編號') || h.includes('連接管編號') || h === 'SEWER_NO'
        );

        // Detect if this is a manhole sheet (has 陰井編號/MH_NO/CB_NO column)
        const isManholeSheet = header.some(h => 
          h.includes('陰井編號') || h.includes('人孔編號') || h === 'MH_NO' || h === 'CB_NO'
        );

        if (isPipelineSheet) {
          // Find column indices
          const col = (names) => {
            for (const n of names) {
              const idx = header.findIndex(h => h.includes(n) || h === n);
              if (idx >= 0) return idx;
            }
            return -1;
          };
          const iSewerNo = col(['管線編號', '連接管編號', 'SEWER_NO']);
          const iUpstream = col(['上游人孔', '上游陰井', 'UMH_NO', 'UCB_NO']);
          const iDownstream = col(['下游人孔', '下游陰井', 'DMH_NO', 'DCB_NO']);
          const iType = col(['管線型態', 'SEWER_TP', '管線類別']);
          const iMaterial = col(['管線材質', '下水道材質', 'P_METERL']);
          const iDiameter = col(['管徑', 'DIA']);
          const iLength = col(['管線長度', 'SEWER_LH']);
          const iSlope = col(['坡度', 'SLOPE']);
          const iUpElev = col(['上游管底', 'UIE']);
          const iDownElev = col(['下游管底', 'DIE']);
          const iProjId = col(['工程編號', 'CONS_ID', 'PROJE_ID']);
          const iProjName = col(['工程名稱', 'CONS_TIT', 'PROJECT']);
          const iContractor = col(['施工廠商', '承包廠商', 'CONS_COM', 'CONSTR']);
          const iDate = col(['竣工日期', 'CON_DATE', 'COMPDATE']);

          for (let i = dataStartIdx; i < rows.length; i++) {
            const r = rows[i];
            if (!r || !r[iSewerNo]) continue;
            await stmtPipe.run(
              r[iSewerNo] || '', r[iUpstream] || '', r[iDownstream] || '',
              r[iType] || '', r[iMaterial] || '', r[iDiameter] || '',
              parseFloat(r[iLength]) || null, parseFloat(r[iSlope]) || null,
              parseFloat(r[iUpElev]) || null, parseFloat(r[iDownElev]) || null,
              r[iProjId] || '', r[iProjName] || '', r[iContractor] || '', 
              r[iDate] ? String(r[iDate]) : '', fname, area
            );
            totalPipelines++;
          }
        } else if (isManholeSheet) {
          const col = (names) => {
            for (const n of names) {
              const idx = header.findIndex(h => h.includes(n) || h === n);
              if (idx >= 0) return idx;
            }
            return -1;
          };
          const iNo = col(['陰井編號', '人孔編號', 'MH_NO', 'CB_NO']);
          const iX = col(['X', '陰井中心X', 'X座標']);
          const iY = col(['Y', '陰井中心Y', 'Y座標']);
          const iType = col(['陰井型式', 'MH_TYPE', 'CB_TYPE']);
          const iLoc = col(['陰井位置', 'MH_POSI', '位置']);
          const iGL = col(['地面高程', 'G_LEVEL']);
          const iDepth = col(['陰井深度', 'MH_HT', 'CB_HT']);
          const iProjId = col(['工程編號', 'CONS_ID', 'PROJE_ID']);
          const iProjName = col(['工程名稱', 'CONS_TIT', 'PROJECT']);
          const iContractor = col(['施工廠商', '承包廠商', 'CONS_COM', 'CONSTR']);
          const iDate = col(['竣工日期', 'CON_DATE', 'COMPDATE']);

          for (let i = dataStartIdx; i < rows.length; i++) {
            const r = rows[i];
            if (!r || !r[iNo]) continue;
            await stmtMH.run(
              r[iNo] || '', parseFloat(r[iX]) || null, parseFloat(r[iY]) || null,
              r[iType] || '', r[iLoc] || '', parseFloat(r[iGL]) || null,
              parseFloat(r[iDepth]) || null,
              r[iProjId] || '', r[iProjName] || '', r[iContractor] || '',
              r[iDate] ? String(r[iDate]) : '', fname, area
            );
            totalManholes++;
          }
        }
      }
      console.log(`  ✓ ${fname}`);
    } catch (e) {
      console.log(`  ✗ ${fname}: ${e.message}`);
    }
  }

  await stmtPipe.finalize();
  await stmtMH.finalize();

  console.log(`\n=== Import Summary ===`);
  console.log(`Personnel: ${personnelData.length} records`);
  console.log(`Projects:  ${projectsData.length} records`);
  console.log(`Pipelines: ${totalPipelines} records`);
  console.log(`Manholes:  ${totalManholes} records`);

  await db.close();
  console.log('\nDone! Database seeded at:', DB_PATH);
}

main().catch(err => { console.error(err); process.exit(1); });
