import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();

    // 1. KPI Stats
    const totalProjectsRes = await db.get(`SELECT COUNT(*) as count FROM projects WHERE status != '已完成'`);
    const totalProjects = totalProjectsRes?.count || 0;

    const pendingBlockagesRes = await db.get(`SELECT COUNT(*) as count FROM complaints WHERE status = '待處理'`);
    const pendingBlockages = pendingBlockagesRes?.count || 0;

    // We don't have households in DB, so let's use total pipelines as a metric
    const totalPipelinesRes = await db.get(`SELECT COUNT(*) as count FROM pipelines`);
    const totalPipelines = totalPipelinesRes?.count || 0;
    
    // 2. Chart Data: Project Status Distribution
    const statusDist = await db.all(`SELECT status, COUNT(*) as value FROM projects GROUP BY status`);
    const chartData = statusDist.map((s: any) => ({
      name: s.status || '未分類',
      value: s.value
    }));

    // 3. Reminders (Approaching milestones - just fetch recent/ongoing projects as mock reminders)
    const reminders = await db.all(`SELECT name, status FROM projects WHERE status != '已完成' ORDER BY id DESC LIMIT 4`);
    
    // 4. Critical Projects (Ongoing projects table)
    const criticalProjects = await db.all(`
      SELECT p.name, p.status, p.contractor, p.personnel_id, 
             u.name as personnel_name 
      FROM projects p 
      LEFT JOIN personnel u ON p.personnel_id = u.id 
      WHERE p.status != '已完成' 
      ORDER BY p.id ASC 
      LIMIT 6
    `);

    // 5. Flood Risk Prediction (New AI Feature)
    const currentMonth = new Date().getMonth() + 1;
    
    let weatherData = null;
    try {
      const fs = require('fs');
      const path = require('path');
      const weatherPath = path.join(process.cwd(), 'weather_risk.json');
      if (fs.existsSync(weatherPath)) {
        weatherData = JSON.parse(fs.readFileSync(weatherPath, 'utf8'));
      }
    } catch (e) {}

    const floodRisk = {
      month: currentMonth,
      level: (weatherData?.max_pop >= 70) ? '極高 (強降雨預警)' : [5, 6].includes(currentMonth) ? '高 (梅雨季)' : [7, 8, 9].includes(currentMonth) ? '高 (颱風季)' : '低',
      weather: weatherData,
      recentEvents: await db.all(`SELECT date, location, severity FROM flood_events ORDER BY date DESC LIMIT 3`)
    };

    return NextResponse.json({
      stats: {
        activeProjects: totalProjects,
        pendingBlockages: pendingBlockages,
        totalPipelines: totalPipelines
      },
      chartData,
      reminders,
      criticalProjects,
      floodRisk
    });

  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
