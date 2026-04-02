import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || "libsql://hsinchu-sewer-db-flybutter.aws-ap-northeast-1.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzM3NDU0NTQsImlkIjoiMDE5Y2ZiNzctOGMwMS03NTdjLTgyMjAtMTM0ZmMzNGJjMWZiIiwicmlkIjoiNmJmZWNjMjktMTU4MC00OTFlLTgyMjMtN2E4YzU3NDNiYzVlIn0.cMp_T22LlouupulKltq-P8RJIF1kZ-t7DS_74DCfI3dAyFT0cxQsZXMUT7BQqV7Teci5NA4j4No6MmGMcOSzDQ";

if (!url || !authToken) {
  console.warn("Turso configuration missing. Remote DB will not work.");
}

export const client = createClient({
  url: url,
  authToken: authToken,
});

export async function getDb() {
  return {
    get: async (sql: string, ...params: any[]) => {
      const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const rs = await client.execute({ sql, args });
      return rs.rows[0] as any;
    },
    all: async (sql: string, ...params: any[]) => {
      const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const rs = await client.execute({ sql, args });
      return rs.rows as any[];
    },
    run: async (sql: string, ...params: any[]) => {
      const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const rs = await client.execute({ sql, args });
      return {
        ...rs,
        lastID: rs.lastInsertRowid ? Number(rs.lastInsertRowid) : undefined
      } as any;
    },
    exec: async (sql: string) => {
      return await client.execute(sql);
    }
  };
}
