import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { createClient, Client } from '@libsql/client';
import path from 'path';

let db: any = null;

/**
 * Turso (libSQL) 兼容層
 * 模擬 sqlite 模組的 API (all, get, run, exec)
 */
class LibsqlWrapper {
  constructor(private client: Client) {}

  async all(sql: string, params: any[] = []) {
    const result = await this.client.execute({ sql, args: params });
    return result.rows;
  }

  async get(sql: string, params: any[] = []) {
    const result = await this.client.execute({ sql, args: params });
    return result.rows[0] || null;
  }

  async run(sql: string, params: any[] = []) {
    const result = await this.client.execute({ sql, args: params });
    return {
      lastID: Number(result.lastInsertRowid),
      changes: result.rowsAffected,
    };
  }

  async exec(sql: string) {
    // libSQL 不支援單次執行多條分號分隔的 SQL，
    // 但如果只是簡單的建表語句，可以嘗試拆分或單獨執行。
    const statements = sql.split(';').filter(s => s.trim());
    for (const s of statements) {
      await this.client.execute(s);
    }
  }
}

export async function getDb(): Promise<any> {
  if (db) {
    return db;
  }

  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && authToken) {
    console.log('🌐 Using Turso (libSQL) database');
    const client = createClient({
      url,
      authToken,
    });
    db = new LibsqlWrapper(client);
    return db;
  }

  console.log('📂 Using local SQLite database');
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'sewerage.db');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Ensure tables exist locally
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
      personnel_id INTEGER,
      bbox_min_x REAL,
      bbox_min_y REAL,
      bbox_max_x REAL,
      bbox_max_y REAL,
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
      area TEXT,
      system_type TEXT DEFAULT '污水'
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
      area TEXT,
      system_type TEXT DEFAULT '污水'
    );
    
    CREATE TABLE IF NOT EXISTS flood_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      location TEXT,
      description TEXT,
      source TEXT,
      severity TEXT,
      x REAL,
      y REAL
    );

  `);

  return db;
}
