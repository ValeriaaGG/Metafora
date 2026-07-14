import { neon } from '@neondatabase/serverless';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.STORAGE_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_POSTGRES_URL;

// Count months between start date and today, inclusive.
function countMonthlyCommitments(startDate) {
  if (!startDate) return 0;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date();
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(0, months);
}

// Replicates the totalFedorOwes calculation from the app (App.jsx).
function computeTotalFedorOwes(data) {
  if (!data) return 0;
  const txs = data.transactions || [];
  const fedorPayments = data.fedorPayments || [];
  const parentsExtraDebts = data.parentsExtraDebts || [];
  const initialBalances = data.initialBalances || {};

  // Fedor's personal balance
  const initialFedor = initialBalances.fedor || 0;
  const gastosFedor = txs.filter(t => t.type === 'gasto' && t.responsible === 'fedor').reduce((s, t) => s + t.amount, 0);
  const ingresosFedor = txs.filter(t => t.type === 'ingreso' && t.incomeTarget === 'fedor').reduce((s, t) => s + t.amount, 0);
  const abonos = fedorPayments.reduce((s, p) => s + p.amount, 0);
  const fedorBalance = initialFedor + gastosFedor - abonos - ingresosFedor;

  // Fedor's share of the parents commitment
  const monthsCount = countMonthlyCommitments(initialBalances.parentsStartDate);
  const totalCommitments = monthsCount * 50000;
  const parentsInitial = initialBalances.parentsInitialBalance || 0;
  const extraDebts = parentsExtraDebts.reduce((s, e) => s + e.amount, 0);
  const paidByFedor = txs.filter(t => t.type === 'gasto' && t.responsible === 'papas' && t.paidWith === 'fedor').reduce((s, t) => s + t.amount, 0);
  const fedorOwesForParents = totalCommitments + parentsInitial + extraDebts - paidByFedor;

  return fedorBalance + fedorOwesForParents;
}

export default async function handler(req, res) {
  const token = req.query.token || req.headers['x-fedor-token'];
  const expected = process.env.FEDOR_TOKEN;

  if (!expected) {
    return res.status(500).json({ error: 'Server misconfigured: FEDOR_TOKEN not set' });
  }
  if (!connectionString) {
    return res.status(500).json({ error: 'Server misconfigured: no database connection string' });
  }
  if (!token || token !== expected) {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }

  try {
    const sql = neon(connectionString);
    const rows = await sql`SELECT data, updated_at FROM user_data WHERE id = 1`;
    if (!rows[0]) {
      return res.status(200).json({ amount: 0, updatedAt: null });
    }
    const amount = computeTotalFedorOwes(rows[0].data);
    return res.status(200).json({
      amount,
      updatedAt: rows[0].updated_at,
    });
  } catch (e) {
    console.error('API /api/fedor error:', e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
