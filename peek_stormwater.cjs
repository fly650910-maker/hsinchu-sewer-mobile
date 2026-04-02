const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
  '/Users/fly/Downloads/下水道科/3.雨水下水道/新竹縣雨水下水道系統重新檢討規劃參考資料（2-3）/新竹縣新埔鎮都市計畫區內雨水下水道/總結報告核定稿/雨水下水道GIS待匯入資料(空白樣版)_new.xls',
  '/Users/fly/Downloads/下水道科/3.雨水下水道/新竹縣雨水下水道系統重新檢討規劃參考資料（3-3）/新竹縣雨水下水道系統重新檢討規劃參考資料（3-3）/新竹縣關西鎮都市計畫區內雨水下水道檢討規劃/GIS資料/雨水下水道GIS待匯入資料.xls'
];

for (const fp of files) {
  if (!fs.existsSync(fp)) continue;
  console.log(`\n========== FILE: ${path.basename(fp)} ==========`);
  try {
    const wb = XLSX.readFile(fp);
    console.log('Sheets:', wb.SheetNames);
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      console.log(`\n--- Sheet: ${name} (${data.length} rows) ---`);
      for (let i = 0; i < Math.min(4, data.length); i++) {
        console.log(JSON.stringify(data[i]));
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}
