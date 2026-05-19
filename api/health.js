import { neon } from '@neondatabase/serverless';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.STORAGE_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_POSTGRES_URL;

export default async function handler(req, res) {
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    STORAGE_DATABASE_URL: !!process.env.STORAGE_DATABASE_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    STORAGE_POSTGRES_URL: !!process.env.STORAGE_POSTGRES_URL,
    APP_PASSWORD: !!process.env.APP_PASSWORD,
  };

  if (!connectionString) {
    return res.status(500).json({
      ok: false,
      stage: 'env',
      error: 'No Postgres connection string found in env',
      envCheck,
    });
  }

  try {
    const sql = neon(connectionString);
    const rows = await sql`SELECT 1 AS ping, NOW() AS server_time`;
    return res.status(200).json({
      ok: true,
      ping: rows[0]?.ping,
      serverTime: rows[0]?.server_time,
      envCheck,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      stage: 'query',
      error: e.message,
      envCheck,
    });
  }
}
