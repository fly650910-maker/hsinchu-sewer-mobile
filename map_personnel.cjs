const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function mapPersonnel() {
  const db = await open({
    filename: path.join(__dirname, 'sewerage.db'),
    driver: sqlite3.Database
  });

  try {
    // 1. Add column if not exists
    await db.exec(`ALTER TABLE projects ADD COLUMN personnel_id INTEGER;`).catch(() => {});

    // Dictionary of project names to specific DB personnel ID.
    // IDs: 1|邱昶笙 2|謝輝彥 3|林孟融 4|劉純瑩 5|彭亦蓁 6|黃美蘭 
    // 7|林美玟 8|林博文 9|劉致宏 10|陳侑琪 11|黃悅香
    const mapping = {
      '竹北污水下水道第三期實施計畫': 2,
      '竹北二期六標': 8,
      '竹北二期七標': 8,
      '竹北二期八標': 8,
      '竹北二期九標': 3,
      '竹北三期一標(工程發包決標)': 2,
      '竹北水資中心代操作維護案': 3,
      '竹北水資二期擴建計畫': 3,
      '竹東三期一標': 2,
      '竹東三期二標': 1,
      '竹東水資中心代操作維護案': 3,
      '竹東水資功能提升案': 3,
      '竹東水資用地取得案': 1,
      '芎林鄉污水下水道規劃重新檢討': 2,
      '新竹縣污水下水道系統建設推動計畫': 2,
      '新竹縣關西地區污水下水道規劃': 2,
      '新豐鄉河頂自辦重劃區污水處理廠維護案': 9, // originally 李貞宜 -> 劉致宏
      '污水下水道設施維護及檢修(開口契約)': 9, // replaced 李貞宜
      '污水下水道已到達地區公共管線延伸工程(開口契約)': 8,
      '污水使用費專案(含用戶資訊管理台帳系統)': 1,
      '全縣雨水下水道水位計監測設置案': 9,
      '雨水下水道設施工程維護開口契約': 9,
      '新豐鄉建興路雨水下水道工程': 9,
      '竹北市嘉豐街雨水下水道工程': 9,
      '湖口污水下水道建設計畫': 2,
      '新豐污水下水道建設計畫': 2,
      '竹東二期管線第一、二標後續工程訴訟案': 3,
      '專用下水道工程審查': 10
    };

    const stmt = await db.prepare('UPDATE projects SET personnel_id = ? WHERE name = ?');
    let count = 0;
    for (const [name, pid] of Object.entries(mapping)) {
      const res = await stmt.run(pid, name);
      if (res.changes > 0) count++;
    }
    await stmt.finalize();

    console.log(`Successfully mapped ${count} projects to their designated personnel based on the PDF.`);
  } catch(e) {
    console.error('Migration failed:', e);
  } finally {
    await db.close();
  }
}

mapPersonnel();
