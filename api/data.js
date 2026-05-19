import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS user_data (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  tableReady = true;
}

export default async function handler(req, res) {
  const password = req.headers['x-app-password'];
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return res.status(500).json({ error: 'Server misconfigured: APP_PASSWORD not set' });
  }
  if (!password || password !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM user_data WHERE id = 1`;
      return res.status(200).json({ data: rows[0]?.data ?? null });
    }

    if (req.method === 'PUT') {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid body' });
      }
      await sql`
        INSERT INTO user_data (id, data, updated_at)
        VALUES (1, ${JSON.stringify(body)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('API /api/data error:', e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
