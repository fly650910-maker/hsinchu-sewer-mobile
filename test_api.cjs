const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function test() {
  const db = await open({ filename: path.join(__dirname, 'sewerage.db'), driver: sqlite3.Database });
  console.log('Opened');

  try {
    const res1 = await db.get(`SELECT COUNT(*) as count FROM projects WHERE status != '已完成'`);
    console.log('1 OK');
    const res2 = await db.get(`SELECT COUNT(*) as count FROM complaints WHERE status = '待處理'`);
    console.log('2 OK');
    const res3 = await db.get(`SELECT COUNT(*) as count FROM pipelines`);
    console.log('3 OK');
    const res4 = await db.all(`SELECT status, COUNT(*) as value FROM projects GROUP BY status`);
    console.log('4 OK');
    const res5 = await db.all(`SELECT name, status FROM projects WHERE status != '已完成' ORDER BY id DESC LIMIT 4`);
    console.log('5 OK');
    const res6 = await db.all(`
      SELECT p.name, p.status, p.contractor, p.personnel_id, 
             u.name as personnel_name 
      FROM projects p 
      LEFT JOIN personnel u ON p.personnel_id = u.id 
      WHERE p.status != '已完成' 
      ORDER BY p.id ASC 
      LIMIT 6
    `);
    console.log('6 OK', res6);
  } catch(e) {
    console.log('ERROR:', e.message);
  }
}
test();
