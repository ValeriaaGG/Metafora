import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, Home, Bell, PieChart, CreditCard, Plus, X, Check, ArrowUpRight, ArrowDownRight, Calendar, Target, Sparkles, Heart, Trash2, Edit2, Filter, Search, ChevronRight, ChevronDown, AlertCircle, DollarSign, BarChart3, Settings, Moon, Sun, Gift, ArrowLeftRight, Banknote, Eye, EyeOff, Upload } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

// ====== STORAGE SHIM ======
// Replaces window.storage (Claude artifact API) with localStorage so the app
// works standalone in any browser. Same async interface so existing code works.
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const value = localStorage.getItem(key);
        return value !== null ? { value } : null;
      } catch (e) {
        return null;
      }
    },
    set: async (key, value) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },
  };
}

const DEFAULT_CARDS = [
  { id: 'bbva-deb', name: 'Bancomer Débito', bank: 'BBVA', type: 'debito', color: '#004481', cutoffDay: null, paymentDay: null, initialBalance: 0 },
  { id: 'bbva-cre', name: 'Bancomer Crédito', bank: 'BBVA', type: 'credito', color: '#004481', cutoffDay: 8, paymentDay: 28, initialBalance: 0 },
  { id: 'banamex-deb', name: 'Banamex Débito', bank: 'Banamex', type: 'debito', color: '#E4002B', cutoffDay: null, paymentDay: null, initialBalance: 0 },
  { id: 'banamex-cre1', name: 'Banamex Crédito 1', bank: 'Banamex', type: 'credito', color: '#E4002B', cutoffDay: 1, paymentDay: 23, initialBalance: 0 },
  { id: 'banamex-cre2', name: 'Banamex Crédito 2', bank: 'Banamex', type: 'credito', color: '#E4002B', cutoffDay: 1, paymentDay: 8, initialBalance: 0 },
  { id: 'revolut-deb', name: 'Revolut Débito', bank: 'Revolut', type: 'debito', color: '#0075EB', cutoffDay: null, paymentDay: null, initialBalance: 0 },
  { id: 'fedor-cuenta', name: 'Cuenta de Fedor', bank: 'Fedor', type: 'fedor', color: '#8B5CF6', cutoffDay: null, paymentDay: null, initialBalance: 0 },
];

const CATEGORIES = [
  { id: 'renta', name: 'Renta y servicios', icon: '🏠', color: '#8B5CF6' },
  { id: 'hogar', name: 'Hogar', icon: '🧹', color: '#06B6D4' },
  { id: 'familia', name: 'Familia', icon: '👨‍👩‍👧', color: '#EC4899' },
  { id: 'transporte', name: 'Transporte', icon: '🚗', color: '#F59E0B' },
  { id: 'comida', name: 'Comida y restaurantes', icon: '🍔', color: '#EF4444' },
  { id: 'super', name: 'Supermercado', icon: '🛒', color: '#10B981' },
  { id: 'salud', name: 'Salud', icon: '💊', color: '#14B8A6' },
  { id: 'educacion', name: 'Educación', icon: '📚', color: '#6366F1' },
  { id: 'entretenimiento', name: 'Entretenimiento', icon: '🎟️', color: '#F97316' },
  { id: 'suscripciones', name: 'Suscripciones', icon: '📺', color: '#A855F7' },
  { id: 'cuidado', name: 'Cuidado personal', icon: '💄', color: '#F472B6' },
  { id: 'ropa', name: 'Ropa y accesorios', icon: '👗', color: '#FB7185' },
  { id: 'hobbies', name: 'Hobbies', icon: '🎮', color: '#3B82F6' },
  { id: 'seguros', name: 'Seguros y comisiones', icon: '💳', color: '#64748B' },
  { id: 'mascotas', name: 'Mascotas', icon: '🐾', color: '#84CC16' },
  { id: 'negocio', name: 'Negocio', icon: '💼', color: '#0EA5E9' },
  { id: 'otros', name: 'Otros', icon: '📦', color: '#94A3B8' },
];

const RESPONSIBLES = [
  { id: 'fedor', name: 'Fedor', color: '#8B5CF6', isPrimary: true },
  { id: 'papas', name: 'Papás', color: '#EC4899', isMonthly: true, monthlyAmount: 50000 },
  { id: 'yo', name: 'Yo', color: '#10B981', isPersonal: true },
];

const DEFAULT_DATA = {
  cards: DEFAULT_CARDS,
  transactions: [],
  transfers: [],
  customResponsibles: [],
  parentsTransfers: [],
  parentsExtraDebts: [],
  fedorPayments: [],
  otherPayments: {},
  cardPayments: {},
  investments: [],
  cash: 0,
  theme: 'dark',
  initialBalances: {
    fedor: 0,
    fedorDate: null,
    fedorNote: '',
    parentsStartDate: null,
    parentsInitialBalance: 0,
    others: {},
  },
  _migratedV2: false,
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getMonthKey = (date) => {
  if (!date) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m] = date.split('-');
    return `${y}-${m}`;
  }
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthName = (monthKey) => {
  const [y, m] = monthKey.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
};

const countMonthlyCommitments = (startDate, endDate = new Date()) => {
  if (!startDate) return 0;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(0, months);
};

function buildCleanData() {
  const cards = JSON.parse(JSON.stringify(DEFAULT_CARDS));
  const initials = {
    'bbva-deb': 44882.20,
    'bbva-cre': 0,
    'banamex-deb': 23025.05,
    'banamex-cre1': 0,
    'banamex-cre2': 35107.23,
    'revolut-deb': 15352.15,
    'fedor-cuenta': 0,
  };
  cards.forEach(c => { c.initialBalance = initials[c.id] !== undefined ? initials[c.id] : 0; });

  const transactions = [
    { id: 'g-totalplay', type: 'gasto', isTransfer: true, card: 'fedor-cuenta', amount: 1725, concept: 'Total Play', date: '2026-05-01', category: 'renta', responsible: 'papas', responsibleName: null, paidWith: 'fedor', incomeTarget: null, incomeTargetName: null },
    { id: 'g-amazon', type: 'gasto', isTransfer: false, card: 'fedor-cuenta', amount: 1633.85, concept: 'Amazon', date: '2026-05-01', category: 'familia', responsible: 'papas', responsibleName: null, paidWith: 'fedor', incomeTarget: null, incomeTargetName: null },
    { id: 'g-gstorage', type: 'gasto', isTransfer: false, card: 'bbva-deb', amount: 350, concept: 'Google Storage', date: '2026-05-01', category: 'suscripciones', responsible: 'papas', responsibleName: null, paidWith: 'mia', incomeTarget: null, incomeTargetName: null },
    { id: 'g-vix', type: 'gasto', isTransfer: false, card: 'bbva-deb', amount: 748, concept: 'VIX', date: '2026-05-01', category: 'suscripciones', responsible: 'papas', responsibleName: null, paidWith: 'mia', incomeTarget: null, incomeTargetName: null },
    { id: 'g-walmart', type: 'gasto', isTransfer: false, card: 'fedor-cuenta', amount: 374, concept: 'Walmart', date: '2026-05-01', category: 'super', responsible: 'papas', responsibleName: null, paidWith: 'fedor', incomeTarget: null, incomeTargetName: null },
  ];

  const investments = [
    { id: 'inv-gbm', name: 'GBM SmartCash', type: 'Fondos', amount: 13449.89, currentValue: 14445.47, date: '2026-04-28' },
    { id: 'inv-lilly', name: 'ELI LILLY', type: 'Acciones', amount: 16884, currentValue: 15093.83, date: '2026-04-28' },
    { id: 'inv-nvidia', name: 'NVIDIA', type: 'Acciones', amount: 20737.94, currentValue: 30124.03, date: '2026-04-28' },
    { id: 'inv-google', name: 'Google', type: 'Acciones', amount: 19695.90, currentValue: 30447.25, date: '2026-04-28' },
  ];

  return {
    ...DEFAULT_DATA,
    cards,
    transactions,
    transfers: [],
    customResponsibles: [],
    parentsTransfers: [],
    parentsExtraDebts: [],
    fedorPayments: [],
    otherPayments: {},
    cardPayments: {},
    investments,
    cash: 0,
    theme: 'dark',
    initialBalances: {
      fedor: 187937.97,
      fedorDate: '2026-05-18',
      fedorNote: 'Saldo inicial verificado (Excel)',
      parentsStartDate: '2026-05-01',
      parentsInitialBalance: 25000,
      others: {},
    },
    _migratedV2: true,
    _cleanLoadV3: true,
  };
}

export default function FinanzasApp() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('dashboard');
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(getMonthKey());
  const [saveStatus, setSaveStatus] = useState('saved');
  const [privacyMode, setPrivacyMode] = useState(true);
  const [importMessage, setImportMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get('app-data');
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          if (parsed._cleanLoadV3) {
            setData({ ...DEFAULT_DATA, ...parsed });
          } else {
            setData(buildCleanData());
          }
        } else {
          setData(buildCleanData());
        }
      } catch (e) {
        setData(buildCleanData());
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveStatus('saving');
    const saveWithRetry = async (attempt = 1) => {
      try {
        const result = await window.storage.set('app-data', JSON.stringify(data));
        if (result) {
          setSaveStatus('saved');
        } else {
          throw new Error('Storage set returned null');
        }
      } catch (e) {
        if (attempt < 3) {
          setTimeout(() => saveWithRetry(attempt + 1), 1000 * attempt);
        } else {
          setSaveStatus('error');
        }
      }
    };
    const timeoutId = setTimeout(() => saveWithRetry(), 300);
    return () => clearTimeout(timeoutId);
  }, [data, loaded]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  const isDark = data.theme === 'dark';

  const allResponsibles = useMemo(() => {
    return [...RESPONSIBLES, ...data.customResponsibles];
  }, [data.customResponsibles]);

  const cardBalances = useMemo(() => {
    const balances = {};
    data.cards.forEach(c => { balances[c.id] = c.initialBalance || 0; });
    data.transactions.forEach(t => {
      if (!balances.hasOwnProperty(t.card)) return;
      const card = data.cards.find(c => c.id === t.card);
      if (!card) return;
      if (card.type === 'credito') {
        if (t.type === 'gasto') balances[t.card] += t.amount;
        if (t.type === 'ingreso') balances[t.card] -= t.amount;
      } else {
        if (t.type === 'gasto') balances[t.card] -= t.amount;
        if (t.type === 'ingreso') balances[t.card] += t.amount;
      }
    });
    (data.fedorPayments || []).forEach(p => {
      const toCard = p.toCard || 'bbva-deb';
      if (balances.hasOwnProperty(toCard)) balances[toCard] += p.amount;
    });
    (data.parentsTransfers || []).forEach(t => {
      const fromCard = t.fromCard || 'bbva-deb';
      if (balances.hasOwnProperty(fromCard)) balances[fromCard] -= t.amount;
    });
    Object.keys(data.cardPayments || {}).forEach(cardId => {
      (data.cardPayments[cardId] || []).forEach(p => {
        const fromCard = p.fromCard || 'bbva-deb';
        if (balances.hasOwnProperty(fromCard)) balances[fromCard] -= p.amount;
        if (balances.hasOwnProperty(cardId)) balances[cardId] -= p.amount;
      });
    });
    (data.transfers || []).forEach(t => {
      if (balances.hasOwnProperty(t.fromCard)) balances[t.fromCard] -= t.amount;
      if (balances.hasOwnProperty(t.toCard)) balances[t.toCard] += t.amount;
    });
    return balances;
  }, [data.cards, data.transactions, data.fedorPayments, data.parentsTransfers, data.cardPayments, data.transfers]);

  const debitTotal = useMemo(() => {
    return data.cards.filter(c => c.type === 'debito').reduce((sum, c) => sum + (cardBalances[c.id] || 0), 0);
  }, [data.cards, cardBalances]);

  const creditDebtTotal = useMemo(() => {
    return data.cards.filter(c => c.type === 'credito').reduce((sum, c) => sum + (cardBalances[c.id] || 0), 0);
  }, [data.cards, cardBalances]);

  const parentsBalance = useMemo(() => {
    const startDate = data.initialBalances?.parentsStartDate;
    const initialBalance = data.initialBalances?.parentsInitialBalance || 0;
    const monthlyAmount = 50000;
    const monthsCount = countMonthlyCommitments(startDate);
    const totalCommitments = monthsCount * monthlyAmount;
    const paidByMe = data.transactions.filter(t => t.type === 'gasto' && t.responsible === 'papas' && t.paidWith === 'mia').reduce((sum, t) => sum + t.amount, 0);
    const paidByFedor = data.transactions.filter(t => t.type === 'gasto' && t.responsible === 'papas' && t.paidWith === 'fedor').reduce((sum, t) => sum + t.amount, 0);
    const transferred = (data.parentsTransfers || []).reduce((sum, t) => sum + t.amount, 0);
    const extraDebts = (data.parentsExtraDebts || []).reduce((sum, e) => sum + e.amount, 0);
    const pending = initialBalance + totalCommitments + extraDebts - paidByMe - paidByFedor - transferred;
    return {
      initialBalance, totalCommitments, monthsCount, paidByMe, paidByFedor,
      transferred, extraDebts,
      pending: Math.max(0, pending),
      pendingRaw: pending,
      fedorOwesForParents: totalCommitments + initialBalance + extraDebts - paidByFedor,
    };
  }, [data.transactions, data.parentsTransfers, data.parentsExtraDebts, data.initialBalances]);

  const fedorBalance = useMemo(() => {
    const initial = data.initialBalances?.fedor || 0;
    const gastos = data.transactions.filter(t => t.type === 'gasto' && t.responsible === 'fedor').reduce((sum, t) => sum + t.amount, 0);
    const ingresosAFedor = data.transactions.filter(t => t.type === 'ingreso' && t.incomeTarget === 'fedor').reduce((sum, t) => sum + t.amount, 0);
    const abonos = (data.fedorPayments || []).reduce((sum, p) => sum + p.amount, 0);
    return initial + gastos - abonos - ingresosAFedor;
  }, [data.transactions, data.fedorPayments, data.initialBalances]);

  const totalFedorOwes = useMemo(() => fedorBalance + parentsBalance.fedorOwesForParents, [fedorBalance, parentsBalance]);

  const personalSavings = useMemo(() => debitTotal - creditDebtTotal - parentsBalance.pendingRaw, [debitTotal, creditDebtTotal, parentsBalance]);

  const investmentsTotal = useMemo(() => (data.investments || []).reduce((s, i) => s + (i.currentValue || i.amount || 0), 0), [data.investments]);

  const patrimonio = useMemo(() => personalSavings + totalFedorOwes + (data.cash || 0) + investmentsTotal, [personalSavings, totalFedorOwes, data.cash, investmentsTotal]);

  const otherBalances = useMemo(() => {
    const balances = {};
    Object.entries(data.initialBalances?.others || {}).forEach(([name, amount]) => {
      if (amount && amount !== 0) balances[name] = { owes: amount, paid: 0, transactions: [], hasInitial: true };
    });
    data.transactions.forEach(t => {
      if (t.type === 'gasto' && t.responsible === 'otra' && t.responsibleName) {
        const name = t.responsibleName.trim();
        if (!balances[name]) balances[name] = { owes: 0, paid: 0, transactions: [] };
        balances[name].owes += t.amount;
        balances[name].transactions.push(t);
      }
      if (t.type === 'ingreso' && t.incomeTarget === 'otra' && t.incomeTargetName) {
        const name = t.incomeTargetName.trim();
        if (!balances[name]) balances[name] = { owes: 0, paid: 0, transactions: [] };
        balances[name].owes -= t.amount;
      }
    });
    Object.keys(data.otherPayments || {}).forEach(name => {
      if (balances[name]) {
        const totalPaid = (data.otherPayments[name] || []).reduce((s, p) => s + p.amount, 0);
        balances[name].paid = totalPaid;
        balances[name].owes -= totalPaid;
      }
    });
    return balances;
  }, [data.transactions, data.otherPayments, data.initialBalances]);

  const monthSpending = useMemo(() => {
    const txs = data.transactions.filter(t => t.type === 'gasto' && getMonthKey(t.date) === currentMonth);
    const total = txs.reduce((sum, t) => sum + t.amount, 0);
    const byCategory = {};
    txs.forEach(t => { const cat = t.category || 'otros'; byCategory[cat] = (byCategory[cat] || 0) + t.amount; });
    return { total, byCategory, count: txs.length };
  }, [data.transactions, currentMonth]);

  const subscriptions = useMemo(() => data.transactions.filter(t => t.type === 'gasto' && t.category === 'suscripciones'), [data.transactions]);

  const upcomingPayments = useMemo(() => {
    const today = new Date();
    return data.cards.filter(c => c.type === 'credito' && c.paymentDay).map(c => {
      const day = c.paymentDay;
      let payDate = new Date(today.getFullYear(), today.getMonth(), day);
      if (payDate < today) payDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
      const daysUntil = Math.ceil((payDate - today) / (1000 * 60 * 60 * 24));
      return { card: c, payDate, daysUntil };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
  }, [data.cards]);

  const addTransaction = (tx) => setData(d => ({ ...d, transactions: [...d.transactions, { ...tx, id: Date.now().toString() }] }));
  const updateTransaction = (id, updates) => setData(d => ({ ...d, transactions: d.transactions.map(t => t.id === id ? { ...t, ...updates } : t) }));
  const deleteTransaction = (id) => setData(d => ({ ...d, transactions: d.transactions.filter(t => t.id !== id) }));
  const addFedorPayment = (amount, date, note, toCard) => setData(d => ({ ...d, fedorPayments: [...(d.fedorPayments || []), { id: Date.now().toString(), amount: parseFloat(amount), date, note, toCard: toCard || 'bbva-deb' }] }));
  const removeFedorPayment = (id) => setData(d => ({ ...d, fedorPayments: (d.fedorPayments || []).filter(p => p.id !== id) }));
  const addParentsTransfer = (amount, date, note, fromCard) => setData(d => ({ ...d, parentsTransfers: [...(d.parentsTransfers || []), { id: Date.now().toString(), amount: parseFloat(amount), date, note, fromCard: fromCard || 'bbva-deb' }] }));
  const removeParentsTransfer = (id) => setData(d => ({ ...d, parentsTransfers: (d.parentsTransfers || []).filter(t => t.id !== id) }));
  const addParentsExtraDebt = (amount, date, concept) => setData(d => ({ ...d, parentsExtraDebts: [...(d.parentsExtraDebts || []), { id: Date.now().toString(), amount: parseFloat(amount), date, concept }] }));
  const removeParentsExtraDebt = (id) => setData(d => ({ ...d, parentsExtraDebts: (d.parentsExtraDebts || []).filter(e => e.id !== id) }));
  const addOtherPayment = (name, amount, date) => setData(d => ({ ...d, otherPayments: { ...d.otherPayments, [name]: [...(d.otherPayments[name] || []), { id: Date.now().toString(), amount: parseFloat(amount), date }] } }));
  const addCardPayment = (cardId, amount, date, note, fromCard) => setData(d => ({ ...d, cardPayments: { ...d.cardPayments, [cardId]: [...(d.cardPayments?.[cardId] || []), { id: Date.now().toString(), amount: parseFloat(amount), date, note, fromCard: fromCard || 'bbva-deb' }] } }));
  const removeCardPayment = (cardId, paymentId) => setData(d => ({ ...d, cardPayments: { ...d.cardPayments, [cardId]: (d.cardPayments?.[cardId] || []).filter(p => p.id !== paymentId) } }));
  const addTransfer = (fromCard, toCard, amount, date, note) => setData(d => ({ ...d, transfers: [...(d.transfers || []), { id: Date.now().toString(), fromCard, toCard, amount: parseFloat(amount), date, note }] }));
  const removeTransfer = (id) => setData(d => ({ ...d, transfers: (d.transfers || []).filter(t => t.id !== id) }));
  const setFedorInitialBalance = (amount, date, note) => setData(d => ({ ...d, initialBalances: { ...(d.initialBalances || {}), fedor: parseFloat(amount) || 0, fedorDate: date || null, fedorNote: note || '' } }));
  const setParentsConfig = (startDate, initialBalance) => setData(d => ({ ...d, initialBalances: { ...(d.initialBalances || {}), parentsStartDate: startDate || null, parentsInitialBalance: parseFloat(initialBalance) || 0 } }));
  const setCardInitialBalance = (cardId, amount) => setData(d => ({ ...d, cards: d.cards.map(c => c.id === cardId ? { ...c, initialBalance: parseFloat(amount) || 0 } : c) }));
  const setCash = (amount) => setData(d => ({ ...d, cash: parseFloat(amount) || 0 }));
  const toggleTheme = () => setData(d => ({ ...d, theme: d.theme === 'dark' ? 'light' : 'dark' }));

  const exportData = () => {
    const exportObj = { ...data, _exportedAt: new Date().toISOString(), _version: '2.0' };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mis-finanzas-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== 'object') throw new Error('Archivo inválido');
        const merged = { ...DEFAULT_DATA, ...parsed, _cleanLoadV3: true };
        setData(merged);
        setImportMessage({ type: 'success', text: `Datos importados correctamente desde "${file.name}"` });
        setTimeout(() => setImportMessage(null), 5000);
      } catch (err) {
        setImportMessage({ type: 'error', text: `Error al importar: ${err.message}` });
        setTimeout(() => setImportMessage(null), 5000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-violet-400 text-xl">Cargando...</div>
      </div>
    );
  }

  const bgMain = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const bgCardHover = isDark ? 'hover:bg-slate-900/80' : 'hover:bg-slate-100';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen ${bgMain} ${textPrimary} transition-colors`}>
      {isDark && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        </div>
      )}
      <div className="relative max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Mis Finanzas</h1>
              <p className={`text-xs ${textSecondary}`}>Dashboard Personal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${
              saveStatus === 'saved' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
              : saveStatus === 'saving' ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
              : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
            }`}>
              {saveStatus === 'saved' && <><Check className="w-3.5 h-3.5" /><span>Guardado</span></>}
              {saveStatus === 'saving' && <><div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div><span>Guardando...</span></>}
              {saveStatus === 'error' && <><AlertCircle className="w-3.5 h-3.5" /><span>Error</span></>}
            </div>
            <label className={`cursor-pointer p-2.5 rounded-xl ${bgCard} border ${bgCardHover} transition-all`} title="Importar backup JSON">
              <Upload className="w-4 h-4" />
              <input type="file" accept="application/json,.json" onChange={importData} className="hidden" />
            </label>
            <button onClick={exportData} className={`p-2.5 rounded-xl ${bgCard} border ${bgCardHover} transition-all`} title="Descargar backup">
              <ArrowDownRight className="w-4 h-4" />
            </button>
            <button onClick={toggleTheme} className={`p-2.5 rounded-xl ${bgCard} border ${bgCardHover} transition-all`}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowAddTx(true)} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-violet-500/30 transition-all hover:scale-105">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva transacción</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>
        </header>

        {importMessage && (
          <div className={`mb-4 p-4 rounded-xl border ${
            importMessage.type === 'success'
              ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
              : (isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
          } flex items-center gap-2 text-sm font-medium`}>
            {importMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {importMessage.text}
          </div>
        )}

        <nav className={`flex gap-1 mb-8 p-1.5 ${bgCard} border rounded-2xl overflow-x-auto`}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'transactions', label: 'Transacciones', icon: Wallet },
            { id: 'fedor', label: 'Fedor', icon: Heart },
            { id: 'parents', label: 'Papás', icon: Users },
            { id: 'others', label: 'Otras Personas', icon: Users },
            { id: 'analysis', label: 'Análisis', icon: PieChart },
            { id: 'cards', label: 'Tarjetas', icon: CreditCard },
            { id: 'savings', label: 'Mi Ahorro', icon: Target },
          ].map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  active ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                  : `${textSecondary} hover:${textPrimary} ${bgCardHover}`
                }`}>
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {view === 'dashboard' && (
          <DashboardView data={data} isDark={isDark} fedorBalance={fedorBalance} totalFedorOwes={totalFedorOwes}
            parentsBalance={parentsBalance} monthSpending={monthSpending} personalSavings={personalSavings}
            patrimonio={patrimonio} upcomingPayments={upcomingPayments} otherBalances={otherBalances}
            currentMonth={currentMonth} setView={setView} cardBalances={cardBalances}
            privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} />
        )}
        {view === 'transactions' && (
          <TransactionsView data={data} isDark={isDark} allResponsibles={allResponsibles}
            onEdit={(tx) => { setEditingTx(tx); setShowAddTx(true); }} onDelete={deleteTransaction} />
        )}
        {view === 'fedor' && (
          <FedorView data={data} isDark={isDark} fedorBalance={fedorBalance} totalFedorOwes={totalFedorOwes}
            parentsBalance={parentsBalance} onAddPayment={addFedorPayment} onRemovePayment={removeFedorPayment}
            onSetInitialBalance={setFedorInitialBalance} />
        )}
        {view === 'parents' && (
          <ParentsView data={data} isDark={isDark} parentsBalance={parentsBalance}
            onAddTransfer={addParentsTransfer} onRemoveTransfer={removeParentsTransfer}
            onAddExtraDebt={addParentsExtraDebt} onRemoveExtraDebt={removeParentsExtraDebt}
            onSetConfig={setParentsConfig} />
        )}
        {view === 'others' && (
          <OthersView data={data} isDark={isDark} otherBalances={otherBalances} onAddPayment={addOtherPayment} />
        )}
        {view === 'analysis' && (
          <AnalysisView data={data} isDark={isDark} monthSpending={monthSpending} subscriptions={subscriptions} currentMonth={currentMonth} />
        )}
        {view === 'cards' && (
          <CardsView data={data} isDark={isDark} setData={setData} upcomingPayments={upcomingPayments}
            cardBalances={cardBalances} onAddCardPayment={addCardPayment} onRemoveCardPayment={removeCardPayment}
            onSetCardInitial={setCardInitialBalance} onAddTransfer={addTransfer} onRemoveTransfer={removeTransfer} />
        )}
        {view === 'savings' && (
          <SavingsView data={data} isDark={isDark} personalSavings={personalSavings} totalFedorOwes={totalFedorOwes}
            patrimonio={patrimonio} debitTotal={debitTotal} creditDebtTotal={creditDebtTotal}
            parentsBalance={parentsBalance} investmentsTotal={investmentsTotal} setData={setData}
            onSetCash={setCash} cardBalances={cardBalances}
            privacyMode={privacyMode} setPrivacyMode={setPrivacyMode} />
        )}

        {showAddTx && (
          <TransactionModal data={data} isDark={isDark} allResponsibles={allResponsibles} editingTx={editingTx}
            onClose={() => { setShowAddTx(false); setEditingTx(null); }}
            onSave={(tx) => {
              if (editingTx) updateTransaction(editingTx.id, tx);
              else addTransaction(tx);
              setShowAddTx(false);
              setEditingTx(null);
            }} />
        )}
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ isDark, title, item, onCancel, onConfirm }) {
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl max-w-md w-full p-6 shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className={`text-sm ${textSecondary} mb-2`}>Esta acción no se puede deshacer. Se eliminará:</p>
        <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} mb-4`}>{item}</div>
        <div className="flex gap-2">
          <button onClick={onCancel} className={`flex-1 py-2.5 rounded-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} font-medium`}>Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function hiddenValue(value, privacyMode) {
  return privacyMode ? '••••••' : value;
}

function StatCard({ isDark, title, value, subtitle, icon: Icon, gradient, onClick, highlight }) {
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  return (
    <button onClick={onClick} className={`text-left ${bgCard} border rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl group ${highlight ? 'ring-2 ring-violet-500/30' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <ChevronRight className={`w-4 h-4 ${textSecondary} opacity-0 group-hover:opacity-100 transition-opacity`} />
      </div>
      <p className={`text-xs ${textSecondary} mb-1`}>{title}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className={`text-xs ${textSecondary} mt-1`}>{subtitle}</p>
    </button>
  );
}

function DashboardView({ data, isDark, fedorBalance, totalFedorOwes, parentsBalance, monthSpending, personalSavings, patrimonio, upcomingPayments, otherBalances, currentMonth, setView, cardBalances, privacyMode, setPrivacyMode }) {
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const categoryData = Object.entries(monthSpending.byCategory)
    .map(([catId, amount]) => {
      const cat = CATEGORIES.find(c => c.id === catId) || { name: catId, color: '#94A3B8', icon: '📦' };
      return { name: cat.name, value: amount, color: cat.color, icon: cat.icon };
    })
    .sort((a, b) => b.value - a.value).slice(0, 6);

  const last6Months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      const total = data.transactions.filter(t => t.type === 'gasto' && getMonthKey(t.date) === key).reduce((sum, t) => sum + t.amount, 0);
      result.push({ mes: d.toLocaleDateString('es-MX', { month: 'short' }), gastos: total });
    }
    return result;
  }, [data.transactions]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl shadow-violet-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Patrimonio total</span>
            </div>
            <button onClick={() => setPrivacyMode(!privacyMode)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title={privacyMode ? 'Mostrar' : 'Ocultar'}>
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-5xl font-bold tracking-tight">{hiddenValue(formatMoney(patrimonio), privacyMode)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isDark={isDark} title="Fedor me debe" value={formatMoney(totalFedorOwes)}
          subtitle="Balance + papás" icon={Heart} gradient="from-violet-500 to-purple-600" onClick={() => setView('fedor')} highlight />
        <StatCard isDark={isDark} title="Pendiente a papás" value={formatMoney(parentsBalance.pending)}
          subtitle={`${parentsBalance.monthsCount} meses acumulados`} icon={Users} gradient="from-pink-500 to-rose-600" onClick={() => setView('parents')} />
        <StatCard isDark={isDark} title="Gastos del mes" value={formatMoney(monthSpending.total)}
          subtitle={`${monthSpending.count} transacciones`} icon={TrendingDown} gradient="from-orange-500 to-red-600" onClick={() => setView('analysis')} />
        <StatCard isDark={isDark} title="Ahorro personal" value={privacyMode ? '••••••' : formatMoney(personalSavings)}
          subtitle="Cuentas − deudas" icon={Target} gradient="from-emerald-500 to-teal-600" onClick={() => setView('savings')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${bgCard} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Gastos últimos 6 meses</h3>
              <p className={`text-xs ${textSecondary} mt-1`}>Tendencia mensual</p>
            </div>
            <BarChart3 className={`w-5 h-5 ${textSecondary}`} />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={last6Months}>
              <defs>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
              <XAxis dataKey="mes" stroke={isDark ? '#64748b' : '#475569'} fontSize={12} />
              <YAxis stroke={isDark ? '#64748b' : '#475569'} fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, borderRadius: '12px' }} formatter={(v) => formatMoney(v)} />
              <Area type="monotone" dataKey="gastos" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorGastos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`${bgCard} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Top categorías</h3>
              <p className={`text-xs ${textSecondary} mt-1`}>{getMonthName(currentMonth)}</p>
            </div>
            <PieChart className={`w-5 h-5 ${textSecondary}`} />
          </div>
          {categoryData.length > 0 ? (
            <div className="space-y-3">
              {categoryData.map((cat, i) => {
                const pct = (cat.value / monthSpending.total) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-xs font-medium truncate">{cat.name}</span>
                      </div>
                      <span className="text-xs font-semibold">{formatMoney(cat.value)}</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className={`text-center py-8 ${textSecondary} text-sm`}>Sin gastos este mes</div>}
        </div>
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-violet-400" />
          Saldos de mis cuentas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.cards.filter(c => c.type === 'debito').map(card => (
            <div key={card.id} className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: card.color }}></div>
                <p className={`text-xs ${textSecondary} truncate`}>{card.name}</p>
              </div>
              <p className={`text-base font-bold ${(cardBalances[card.id] || 0) < 0 ? 'text-red-400' : ''}`}>
                {formatMoney(cardBalances[card.id] || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${bgCard} border rounded-2xl p-6`}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            Próximos pagos
          </h3>
          {upcomingPayments.length > 0 ? (
            <div className="space-y-3">
              {upcomingPayments.slice(0, 4).map((p, i) => {
                const urgent = p.daysUntil <= 3;
                const warning = p.daysUntil <= 7;
                return (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${
                    urgent ? 'bg-red-500/10 border border-red-500/20' : warning ? 'bg-amber-500/10 border border-amber-500/20' : isDark ? 'bg-slate-800/50' : 'bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.card.color + '20' }}>
                        <CreditCard className="w-4 h-4" style={{ color: p.card.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.card.name}</p>
                        <p className={`text-xs ${textSecondary}`}>{formatDate(p.payDate)}</p>
                      </div>
                    </div>
                    <div className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      urgent ? 'bg-red-500/20 text-red-400' : warning ? 'bg-amber-500/20 text-amber-400' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {p.daysUntil === 0 ? 'Hoy' : p.daysUntil === 1 ? 'Mañana' : `${p.daysUntil} días`}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className={`text-center py-8 ${textSecondary} text-sm`}>No hay pagos configurados</div>}
        </div>

        <div className={`${bgCard} border rounded-2xl p-6`}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-500" />
            Personas que me deben
          </h3>
          {Object.keys(otherBalances).filter(n => otherBalances[n].owes > 0).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(otherBalances).filter(([_, b]) => b.owes > 0).sort(([_, a], [__, b]) => b.owes - a.owes).slice(0, 4).map(([name, balance]) => (
                <div key={name} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-semibold text-sm">{name[0].toUpperCase()}</div>
                    <p className="text-sm font-medium">{name}</p>
                  </div>
                  <p className="text-sm font-semibold text-pink-400">{formatMoney(balance.owes)}</p>
                </div>
              ))}
            </div>
          ) : <div className={`text-center py-8 ${textSecondary} text-sm`}>Nadie te debe nada por ahora ✨</div>}
        </div>
      </div>
    </div>
  );
}

function TransactionsView({ data, isDark, allResponsibles, onEdit, onDelete }) {
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300';
  const [filter, setFilter] = useState({ type: 'todos', card: 'todas', search: '', categories: [], dateFrom: '', dateTo: '', datePreset: 'todos' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);

  const usedCategories = useMemo(() => {
    const set = new Set();
    data.transactions.forEach(t => { if (t.category) set.add(t.category); });
    return CATEGORIES.filter(c => set.has(c.id));
  }, [data.transactions]);

  const filtered = useMemo(() => {
    return [...data.transactions].filter(t => {
      if (filter.type !== 'todos' && t.type !== filter.type) return false;
      if (filter.card !== 'todas' && t.card !== filter.card) return false;
      if (filter.categories.length > 0) {
        if (!t.category || !filter.categories.includes(t.category)) return false;
      }
      if (filter.dateFrom && t.date < filter.dateFrom) return false;
      if (filter.dateTo && t.date > filter.dateTo) return false;
      if (filter.search) {
        const s = filter.search.toLowerCase();
        if (!(t.concept || '').toLowerCase().includes(s) && !(t.responsibleName || '').toLowerCase().includes(s)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.transactions, filter]);

  const filterTotals = useMemo(() => {
    const gastos = filtered.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
    const ingresos = filtered.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
    return { gastos, ingresos, count: filtered.length, neto: ingresos - gastos };
  }, [filtered]);

  const toggleCategory = (catId) => {
    setFilter(f => ({ ...f, categories: f.categories.includes(catId) ? f.categories.filter(c => c !== catId) : [...f.categories, catId] }));
  };

  const applyDatePreset = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let from = '', to = '';
    if (preset === 'hoy') { from = todayStr; to = todayStr; }
    else if (preset === '7dias') { const d = new Date(); d.setDate(d.getDate() - 7); from = d.toISOString().split('T')[0]; to = todayStr; }
    else if (preset === '30dias') { const d = new Date(); d.setDate(d.getDate() - 30); from = d.toISOString().split('T')[0]; to = todayStr; }
    else if (preset === 'mesActual') { const d = new Date(today.getFullYear(), today.getMonth(), 1); from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; to = todayStr; }
    else if (preset === 'mesAnterior') { const start = new Date(today.getFullYear(), today.getMonth() - 1, 1); const end = new Date(today.getFullYear(), today.getMonth(), 0); from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`; to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`; }
    else if (preset === 'anioActual') { from = `${today.getFullYear()}-01-01`; to = todayStr; }
    setFilter(f => ({ ...f, dateFrom: from, dateTo: to, datePreset: preset }));
  };

  const hasActiveFilter = filter.type !== 'todos' || filter.card !== 'todas' || filter.search || filter.categories.length > 0 || filter.dateFrom || filter.dateTo;

  return (
    <div className="space-y-6">
      <div className={`${bgCard} border rounded-2xl p-4 space-y-3`}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input type="text" placeholder="Buscar por concepto o persona..." value={filter.search}
              onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${inputBg} border outline-none focus:border-violet-500`} />
          </div>
          <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
            className={`px-4 py-2.5 rounded-xl ${inputBg} border outline-none focus:border-violet-500`}>
            <option value="todos">Todos</option>
            <option value="gasto">Gastos</option>
            <option value="ingreso">Ingresos</option>
          </select>
          <select value={filter.card} onChange={e => setFilter(f => ({ ...f, card: e.target.value }))}
            className={`px-4 py-2.5 rounded-xl ${inputBg} border outline-none focus:border-violet-500`}>
            <option value="todas">Todas las tarjetas</option>
            {data.cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className={`px-4 py-2.5 rounded-xl border outline-none flex items-center gap-2 transition-all ${
              filter.categories.length > 0 ? 'border-violet-500 bg-violet-500/10 text-violet-400' : `${inputBg} hover:border-violet-500/50`
            }`}>
            <Filter className="w-4 h-4" />
            <span>Categorías</span>
            {filter.categories.length > 0 && <span className="bg-violet-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">{filter.categories.length}</span>}
          </button>
          <button onClick={() => setShowDateFilter(!showDateFilter)}
            className={`px-4 py-2.5 rounded-xl border outline-none flex items-center gap-2 transition-all ${
              filter.dateFrom || filter.dateTo ? 'border-violet-500 bg-violet-500/10 text-violet-400' : `${inputBg} hover:border-violet-500/50`
            }`}>
            <Calendar className="w-4 h-4" />
            <span>Fechas</span>
          </button>
        </div>

        {showDateFilter && (
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} space-y-3`}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold ${textSecondary}`}>Filtrar por rango de fechas</p>
              {(filter.dateFrom || filter.dateTo) && (
                <button onClick={() => setFilter(f => ({ ...f, dateFrom: '', dateTo: '', datePreset: 'todos' }))} className="text-xs text-violet-400">Limpiar</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'hoy', label: 'Hoy' }, { id: '7dias', label: 'Últimos 7 días' }, { id: '30dias', label: 'Últimos 30 días' },
                { id: 'mesActual', label: 'Este mes' }, { id: 'mesAnterior', label: 'Mes anterior' }, { id: 'anioActual', label: 'Este año' },
              ].map(preset => (
                <button key={preset.id} onClick={() => applyDatePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter.datePreset === preset.id ? 'bg-violet-500 text-white' : `${isDark ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-200 text-slate-700'}`
                  }`}>
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: isDark ? '#334155' : '#cbd5e1' }}>
              <div>
                <label className={`text-xs ${textSecondary} block mb-1`}>Desde</label>
                <input type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value, datePreset: 'custom' }))}
                  className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-violet-500 text-sm`} />
              </div>
              <div>
                <label className={`text-xs ${textSecondary} block mb-1`}>Hasta</label>
                <input type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value, datePreset: 'custom' }))}
                  className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-violet-500 text-sm`} />
              </div>
            </div>
          </div>
        )}

        {showCategoryFilter && (
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} space-y-3`}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold ${textSecondary}`}>Filtrar por categoría</p>
              <div className="flex gap-2">
                <button onClick={() => setFilter(f => ({ ...f, categories: usedCategories.map(c => c.id) }))} className="text-xs text-violet-400">Todas</button>
                <span className={textSecondary}>•</span>
                <button onClick={() => setFilter(f => ({ ...f, categories: [] }))} className="text-xs text-violet-400">Limpiar</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(usedCategories.length > 0 ? usedCategories : CATEGORIES).map(cat => {
                const checked = filter.categories.includes(cat.id);
                return (
                  <label key={cat.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    checked ? 'border-violet-500 bg-violet-500/10' : `${isDark ? 'border-slate-700' : 'border-slate-200'}`
                  }`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleCategory(cat.id)} className="w-4 h-4 accent-violet-500" />
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-xs font-medium truncate">{cat.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {hasActiveFilter && (
          <button onClick={() => setFilter({ type: 'todos', card: 'todas', search: '', categories: [], dateFrom: '', dateTo: '', datePreset: 'todos' })}
            className={`text-xs ${textSecondary} hover:text-violet-400 flex items-center gap-1`}>
            <X className="w-3 h-3" />Limpiar todos los filtros
          </button>
        )}
      </div>

      {filtered.length > 0 && (
        <div className={`${bgCard} border rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-semibold">Resumen {hasActiveFilter ? 'del filtro' : 'total'}</p>
            </div>
            <p className={`text-xs ${textSecondary}`}>{filterTotals.count} {filterTotals.count === 1 ? 'transacción' : 'transacciones'}</p>
          </div>
          {filter.categories.length > 0 || filter.type === 'gasto' ? (
            <div className={`p-3 rounded-xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>Total gastos</p>
              <p className="text-2xl font-bold text-red-400">{formatMoney(filterTotals.gastos)}</p>
            </div>
          ) : filter.type === 'ingreso' ? (
            <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>Total ingresos</p>
              <p className="text-2xl font-bold text-emerald-400">{formatMoney(filterTotals.ingresos)}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                <p className={`text-xs ${textSecondary} mb-1`}>Total gastos</p>
                <p className="text-lg md:text-xl font-bold text-red-400">{formatMoney(filterTotals.gastos)}</p>
              </div>
              <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <p className={`text-xs ${textSecondary} mb-1`}>Total ingresos</p>
                <p className="text-lg md:text-xl font-bold text-emerald-400">{formatMoney(filterTotals.ingresos)}</p>
              </div>
              <div className={`p-3 rounded-xl col-span-2 md:col-span-1 ${filterTotals.neto >= 0 ? (isDark ? 'bg-violet-500/10' : 'bg-violet-50') : (isDark ? 'bg-amber-500/10' : 'bg-amber-50')}`}>
                <p className={`text-xs ${textSecondary} mb-1`}>Balance neto</p>
                <p className={`text-lg md:text-xl font-bold ${filterTotals.neto >= 0 ? 'text-violet-400' : 'text-amber-400'}`}>
                  {filterTotals.neto >= 0 ? '+' : ''}{formatMoney(filterTotals.neto)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`${bgCard} border rounded-2xl overflow-hidden`}>
        {filtered.length === 0 ? (
          <div className={`p-12 text-center ${textSecondary}`}>
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{hasActiveFilter ? 'No hay transacciones que coincidan' : 'No hay transacciones todavía'}</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            {filtered.map(tx => {
              const card = data.cards.find(c => c.id === tx.card);
              const cat = CATEGORIES.find(c => c.id === tx.category);
              const resp = allResponsibles.find(r => r.id === tx.responsible);
              const isExpense = tx.type === 'gasto';
              return (
                <div key={tx.id} className={`p-4 flex items-center gap-4 ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} transition-colors`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isExpense ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                    {cat ? cat.icon : (isExpense ? '💸' : '💰')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{tx.concept || 'Sin descripción'}</p>
                      {tx.isTransfer && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">TRANSFER</span>}
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${textSecondary} mt-0.5 flex-wrap`}>
                      {card && <span>{card.name}</span>}
                      <span>•</span>
                      <span>{formatDate(tx.date)}</span>
                      {cat && <><span>•</span><span>{cat.name}</span></>}
                      {isExpense && resp && (
                        <><span>•</span><span style={{ color: resp.color }}>{resp.name}{tx.responsibleName ? `: ${tx.responsibleName}` : ''}</span></>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isExpense ? '-' : '+'}{formatMoney(tx.amount)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(tx)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(tx)} className="p-2 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDeleteModal isDark={isDark} title="¿Eliminar transacción?"
          item={<><p className="font-medium">{confirmDelete.concept}</p><p className={`text-sm ${textSecondary}`}>{formatDate(confirmDelete.date)} • {formatMoney(confirmDelete.amount)}</p></>}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }} />
      )}
    </div>
  );
}

function FedorView({ data, isDark, fedorBalance, totalFedorOwes, parentsBalance, onAddPayment, onRemovePayment, onSetInitialBalance }) {
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300';
  const debitCards = data.cards.filter(c => c.type === 'debito');
  const [showAdd, setShowAdd] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentToCard, setPaymentToCard] = useState('bbva-deb');
  const [showInitial, setShowInitial] = useState(false);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState(null);
  const initialBalance = data.initialBalances?.fedor || 0;
  const initialDate = data.initialBalances?.fedorDate || '';
  const initialNote = data.initialBalances?.fedorNote || '';
  const [tempInitial, setTempInitial] = useState(initialBalance.toString());
  const [tempInitialDate, setTempInitialDate] = useState(initialDate);
  const [tempInitialNote, setTempInitialNote] = useState(initialNote);

  const fedorTransactions = useMemo(() => {
    return data.transactions.filter(t =>
      (t.type === 'gasto' && t.responsible === 'fedor') || (t.type === 'ingreso' && t.incomeTarget === 'fedor')
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.transactions]);

  const totalGastosFedor = fedorTransactions.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
  const totalAbonos = (data.fedorPayments || []).reduce((s, p) => s + p.amount, 0);

  const handleAdd = () => {
    if (!paymentAmount) return;
    onAddPayment(paymentAmount, paymentDate, paymentNote, paymentToCard);
    setPaymentAmount(''); setPaymentNote(''); setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl shadow-violet-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Balance total con Fedor</span>
          </div>
          <p className="text-5xl font-bold tracking-tight">{formatMoney(totalFedorOwes)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`${bgCard} border rounded-2xl p-4`}>
          <p className={`text-xs ${textSecondary} mb-1`}>Gastos a su cargo</p>
          <p className="text-xl font-bold text-red-400">{formatMoney(totalGastosFedor)}</p>
        </div>
        <div className={`${bgCard} border rounded-2xl p-4`}>
          <p className={`text-xs ${textSecondary} mb-1`}>Total abonado</p>
          <p className="text-xl font-bold text-emerald-400">{formatMoney(totalAbonos)}</p>
        </div>
        <div className={`${bgCard} border rounded-2xl p-4`}>
          <p className={`text-xs ${textSecondary} mb-1`}>Compromiso papás</p>
          <p className="text-xl font-bold text-pink-400">{formatMoney(parentsBalance.fedorOwesForParents)}</p>
        </div>
        <div className={`${bgCard} border rounded-2xl p-4`}>
          <p className={`text-xs ${textSecondary} mb-1`}>Transacciones</p>
          <p className="text-xl font-bold">{fedorTransactions.length}</p>
        </div>
      </div>

      <div className={`${bgCard} border rounded-2xl p-6 ${initialBalance !== 0 ? 'ring-1 ring-violet-500/30' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold">Saldo inicial</h3>
              <p className={`text-xs ${textSecondary}`}>Lo que Fedor te debía al empezar</p>
            </div>
          </div>
          <button onClick={() => { setTempInitial(initialBalance.toString()); setTempInitialDate(initialDate); setTempInitialNote(initialNote); setShowInitial(!showInitial); }}
            className={`text-xs ${textSecondary} hover:text-violet-400 flex items-center gap-1`}>
            <Edit2 className="w-3.5 h-3.5" />{initialBalance !== 0 ? 'Editar' : 'Configurar'}
          </button>
        </div>
        {initialBalance !== 0 && !showInitial && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            <div>
              <p className="text-xl font-bold text-violet-400">{formatMoney(initialBalance)}</p>
              {initialDate && <p className={`text-xs ${textSecondary}`}>Al {formatDate(initialDate)}{initialNote && ` • ${initialNote}`}</p>}
            </div>
          </div>
        )}
        {showInitial && (
          <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} space-y-3`}>
            <div>
              <label className={`text-xs ${textSecondary} block mb-1`}>Cantidad</label>
              <input type="number" step="0.01" value={tempInitial} onChange={e => setTempInitial(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-violet-500`} />
            </div>
            <div>
              <label className={`text-xs ${textSecondary} block mb-1`}>Fecha</label>
              <input type="date" value={tempInitialDate} onChange={e => setTempInitialDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-violet-500`} />
            </div>
            <div>
              <label className={`text-xs ${textSecondary} block mb-1`}>Nota</label>
              <input type="text" value={tempInitialNote} onChange={e => setTempInitialNote(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-violet-500`} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onSetInitialBalance(tempInitial, tempInitialDate, tempInitialNote); setShowInitial(false); }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-medium">Guardar</button>
              <button onClick={() => setShowInitial(false)} className={`px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Abonos / Transferencias recibidas</h3>
            <p className={`text-xs ${textSecondary} mt-0.5`}>Cuando Fedor te transfiere — el dinero entra a la cuenta que elijas</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />Registrar abono
          </button>
        </div>
        {showAdd && (
          <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} grid grid-cols-1 md:grid-cols-2 gap-3`}>
            <input type="number" placeholder="Cantidad" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-violet-500`} />
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-violet-500`} />
            <div>
              <label className={`text-xs ${textSecondary} block mb-1`}>¿A qué cuenta entró?</label>
              <select value={paymentToCard} onChange={e => setPaymentToCard(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-violet-500`}>
                {debitCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Nota (opcional)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-violet-500`} />
            <button onClick={handleAdd} className="md:col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium">Guardar</button>
          </div>
        )}
        {(data.fedorPayments || []).length > 0 ? (
          <div className="space-y-2">
            {[...(data.fedorPayments || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => {
              const toCard = data.cards.find(c => c.id === (p.toCard || 'bbva-deb'));
              return (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Abono recibido</p>
                      <p className={`text-xs ${textSecondary}`}>{formatDate(p.date)} • {toCard?.name}{p.note && ` • ${p.note}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-emerald-400">+{formatMoney(p.amount)}</p>
                    <button onClick={() => setConfirmDeletePayment(p)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className={`text-center py-6 ${textSecondary} text-sm`}>Aún no has registrado abonos</div>}
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <h3 className="font-semibold mb-4">Historial de gastos a cargo de Fedor</h3>
        {fedorTransactions.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {fedorTransactions.slice(0, 50).map(tx => {
              const cat = CATEGORIES.find(c => c.id === tx.category);
              const card = data.cards.find(c => c.id === tx.card);
              const isExpense = tx.type === 'gasto';
              return (
                <div key={tx.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: (cat?.color || '#94A3B8') + '20' }}>
                    {cat?.icon || '💸'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.concept}</p>
                    <p className={`text-xs ${textSecondary}`}>{card?.name} • {formatDate(tx.date)}</p>
                  </div>
                  <p className={`text-sm font-semibold ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isExpense ? '-' : '+'}{formatMoney(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : <div className={`text-center py-6 ${textSecondary} text-sm`}>Sin transacciones a cargo de Fedor aún</div>}
      </div>

      {confirmDeletePayment && (
        <ConfirmDeleteModal isDark={isDark} title="¿Eliminar este abono?"
          item={<><p className="font-medium">Abono recibido</p><p className={`text-sm ${textSecondary}`}>{formatDate(confirmDeletePayment.date)} • {formatMoney(confirmDeletePayment.amount)}</p></>}
          onCancel={() => setConfirmDeletePayment(null)}
          onConfirm={() => { onRemovePayment(confirmDeletePayment.id); setConfirmDeletePayment(null); }} />
      )}
    </div>
  );
}

function ParentsView({ data, isDark, parentsBalance, onAddTransfer, onRemoveTransfer, onAddExtraDebt, onRemoveExtraDebt, onSetConfig }) {
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300';
  const debitCards = data.cards.filter(c => c.type === 'debito');
  const [showConfig, setShowConfig] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(data.initialBalances?.parentsStartDate || '2026-03-01');
  const [tempInitial, setTempInitial] = useState((data.initialBalances?.parentsInitialBalance || 0).toString());
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNote, setTransferNote] = useState('');
  const [transferFromCard, setTransferFromCard] = useState('bbva-deb');
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDate, setDebtDate] = useState(new Date().toISOString().split('T')[0]);
  const [debtConcept, setDebtConcept] = useState('');
  const [filterMonth, setFilterMonth] = useState('todos');
  const [confirmDeleteTransfer, setConfirmDeleteTransfer] = useState(null);
  const [confirmDeleteDebt, setConfirmDeleteDebt] = useState(null);

  const allParentsTxs = useMemo(() => {
    return data.transactions.filter(t => t.responsible === 'papas').sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.transactions]);

  const filteredTxs = useMemo(() => {
    if (filterMonth === 'todos') return allParentsTxs;
    return allParentsTxs.filter(t => getMonthKey(t.date) === filterMonth);
  }, [allParentsTxs, filterMonth]);

  const monthOptions = useMemo(() => {
    const options = new Set();
    allParentsTxs.forEach(t => options.add(getMonthKey(t.date)));
    return [...options].sort().reverse();
  }, [allParentsTxs]);

  const handleAddTransfer = () => {
    if (!transferAmount) return;
    onAddTransfer(transferAmount, transferDate, transferNote, transferFromCard);
    setTransferAmount(''); setTransferNote(''); setShowAddTransfer(false);
  };

  const handleAddDebt = () => {
    if (!debtAmount || !debtConcept) return;
    onAddExtraDebt(debtAmount, debtDate, debtConcept);
    setDebtAmount(''); setDebtConcept(''); setShowAddDebt(false);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-red-600 p-8 text-white shadow-2xl shadow-pink-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Pendiente acumulado a transferir</span>
          </div>
          <p className="text-5xl font-bold tracking-tight mb-2">{formatMoney(parentsBalance.pending)}</p>
          <p className="text-sm opacity-90">{parentsBalance.monthsCount} {parentsBalance.monthsCount === 1 ? 'mes' : 'meses'} ({formatMoney(parentsBalance.totalCommitments)} total)</p>
        </div>
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Settings className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h3 className="font-semibold">Configuración del compromiso</h3>
              <p className={`text-xs ${textSecondary}`}>
                {data.initialBalances?.parentsStartDate ? `Desde ${formatDate(data.initialBalances.parentsStartDate)} • $50,000/mes` : 'Sin configurar'}
              </p>
            </div>
          </div>
          <button onClick={() => setShowConfig(!showConfig)} className={`text-xs ${textSecondary} hover:text-pink-400 flex items-center gap-1`}>
            <Edit2 className="w-3.5 h-3.5" />{showConfig ? 'Cerrar' : 'Configurar'}
          </button>
        </div>
        {showConfig && (
          <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} space-y-3`}>
            <div>
              <label className={`text-xs ${textSecondary} block mb-1`}>Fecha desde la cual cuenta el compromiso</label>
              <input type="date" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-pink-500`} />
            </div>
            <div>
              <label className={`text-xs ${textSecondary} block mb-1`}>Saldo inicial extra (opcional)</label>
              <input type="number" step="0.01" value={tempInitial} onChange={e => setTempInitial(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-pink-500`} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onSetConfig(tempStartDate, tempInitial); setShowConfig(false); }}
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg font-medium">Guardar</button>
              <button onClick={() => setShowConfig(false)} className={`px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <h3 className="font-semibold mb-4">Desglose del balance</h3>
        <div className="space-y-3">
          {parentsBalance.initialBalance > 0 && (
            <div className="flex items-center justify-between py-2">
              <p className="text-sm font-medium">Saldo inicial</p>
              <p className="text-base font-bold">{formatMoney(parentsBalance.initialBalance)}</p>
            </div>
          )}
          <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            <div>
              <p className="text-sm font-medium">Compromisos mensuales</p>
              <p className={`text-xs ${textSecondary}`}>$50,000 × {parentsBalance.monthsCount} meses</p>
            </div>
            <p className="text-base font-bold">+{formatMoney(parentsBalance.totalCommitments)}</p>
          </div>
          {parentsBalance.extraDebts > 0 && (
            <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              <p className="text-sm font-medium">Gastos que ellos pagaron por mí</p>
              <p className="text-base font-bold text-amber-400">+{formatMoney(parentsBalance.extraDebts)}</p>
            </div>
          )}
          <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            <div>
              <p className="text-sm font-medium">Pagado con cuenta de Fedor</p>
              <p className={`text-xs ${textSecondary}`}>Reduce lo que debes a papás Y lo que Fedor te debe</p>
            </div>
            <p className="text-base font-bold text-violet-400">-{formatMoney(parentsBalance.paidByFedor)}</p>
          </div>
          <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            <div>
              <p className="text-sm font-medium">Pagado con tus tarjetas</p>
              <p className={`text-xs ${textSecondary}`}>Solo reduce lo que debes a papás</p>
            </div>
            <p className="text-base font-bold text-blue-400">-{formatMoney(parentsBalance.paidByMe)}</p>
          </div>
          <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            <div>
              <p className="text-sm font-medium">Transferencias directas a papás</p>
              <p className={`text-xs ${textSecondary}`}>Sale de tu cuenta de débito</p>
            </div>
            <p className="text-base font-bold text-emerald-400">-{formatMoney(parentsBalance.transferred)}</p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t-2" style={{ borderColor: isDark ? '#334155' : '#cbd5e1' }}>
            <p className="text-sm font-bold">Pendiente total</p>
            <p className="text-2xl font-bold text-pink-400">{formatMoney(parentsBalance.pending)}</p>
          </div>
        </div>
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Transferencias a papás</h3>
            <p className={`text-xs ${textSecondary} mt-0.5`}>Cada envío sale de la cuenta que elijas</p>
          </div>
          <button onClick={() => setShowAddTransfer(!showAddTransfer)} className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />Registrar transferencia
          </button>
        </div>
        {showAddTransfer && (
          <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} grid grid-cols-1 md:grid-cols-2 gap-3`}>
            <input type="number" placeholder="Cantidad" value={transferAmount} onChange={e => setTransferAmount(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-pink-500`} />
            <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-pink-500`} />
            <div>
              <label className={`text-xs ${textSecondary} block mb-1`}>¿Desde qué cuenta?</label>
              <select value={transferFromCard} onChange={e => setTransferFromCard(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-pink-500`}>
                {debitCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Nota (opcional)" value={transferNote} onChange={e => setTransferNote(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-pink-500`} />
            <button onClick={handleAddTransfer} className="md:col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium">Guardar</button>
          </div>
        )}
        {(data.parentsTransfers || []).length > 0 ? (
          <div className="space-y-2">
            {[...(data.parentsTransfers || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => {
              const fromCard = data.cards.find(c => c.id === (t.fromCard || 'bbva-deb'));
              return (
                <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Transferencia a papás</p>
                      <p className={`text-xs ${textSecondary}`}>{formatDate(t.date)} • desde {fromCard?.name}{t.note && ` • ${t.note}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-emerald-400">-{formatMoney(t.amount)}</p>
                    <button onClick={() => setConfirmDeleteTransfer(t)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className={`text-center py-6 ${textSecondary} text-sm`}>Aún no has registrado transferencias</div>}
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="font-semibold">Gastos que ellos pagaron por mí</h3>
              <p className={`text-xs ${textSecondary} mt-0.5`}>Suma a tu deuda con ellos</p>
            </div>
          </div>
          <button onClick={() => setShowAddDebt(!showAddDebt)} className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />Registrar
          </button>
        </div>
        {showAddDebt && (
          <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} grid grid-cols-1 md:grid-cols-4 gap-3`}>
            <input type="text" placeholder="Concepto" value={debtConcept} onChange={e => setDebtConcept(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-amber-500`} />
            <input type="number" placeholder="Cantidad" value={debtAmount} onChange={e => setDebtAmount(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-amber-500`} />
            <input type="date" value={debtDate} onChange={e => setDebtDate(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-amber-500`} />
            <button onClick={handleAddDebt} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium">Guardar</button>
          </div>
        )}
        {(data.parentsExtraDebts || []).length > 0 ? (
          <div className="space-y-2">
            {[...(data.parentsExtraDebts || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
              <div key={e.id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Gift className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{e.concept}</p>
                    <p className={`text-xs ${textSecondary}`}>{formatDate(e.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-amber-400">+{formatMoney(e.amount)}</p>
                  <button onClick={() => setConfirmDeleteDebt(e)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <div className={`text-center py-6 ${textSecondary} text-sm`}>No has registrado este tipo de gastos</div>}
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Gastos a cargo de papás</h3>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className={`px-3 py-1.5 rounded-lg ${inputBg} border outline-none focus:border-pink-500 text-sm`}>
            <option value="todos">Todos los meses</option>
            {monthOptions.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
          </select>
        </div>
        {filteredTxs.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredTxs.map(tx => {
              const cat = CATEGORIES.find(c => c.id === tx.category);
              const card = data.cards.find(c => c.id === tx.card);
              return (
                <div key={tx.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: (cat?.color || '#94A3B8') + '20' }}>
                    {cat?.icon || '💸'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.concept}</p>
                    <div className={`flex items-center gap-2 text-xs ${textSecondary} flex-wrap`}>
                      <span>{card?.name}</span><span>•</span><span>{formatDate(tx.date)}</span><span>•</span>
                      <span className={tx.paidWith === 'fedor' ? 'text-violet-400' : 'text-blue-400'}>
                        {tx.paidWith === 'fedor' ? '💜 Cuenta de Fedor' : '💙 Tu cuenta'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-red-400">-{formatMoney(tx.amount)}</p>
                </div>
              );
            })}
          </div>
        ) : <div className={`text-center py-6 ${textSecondary} text-sm`}>Sin gastos de papás registrados</div>}
      </div>

      {confirmDeleteTransfer && (
        <ConfirmDeleteModal isDark={isDark} title="¿Eliminar esta transferencia?"
          item={<><p className="font-medium">Transferencia a papás</p><p className={`text-sm ${textSecondary}`}>{formatDate(confirmDeleteTransfer.date)} • {formatMoney(confirmDeleteTransfer.amount)}</p></>}
          onCancel={() => setConfirmDeleteTransfer(null)}
          onConfirm={() => { onRemoveTransfer(confirmDeleteTransfer.id); setConfirmDeleteTransfer(null); }} />
      )}
      {confirmDeleteDebt && (
        <ConfirmDeleteModal isDark={isDark} title="¿Eliminar este gasto?"
          item={<><p className="font-medium">{confirmDeleteDebt.concept}</p><p className={`text-sm ${textSecondary}`}>{formatDate(confirmDeleteDebt.date)} • {formatMoney(confirmDeleteDebt.amount)}</p></>}
          onCancel={() => setConfirmDeleteDebt(null)}
          onConfirm={() => { onRemoveExtraDebt(confirmDeleteDebt.id); setConfirmDeleteDebt(null); }} />
      )}
    </div>
  );
}

function OthersView({ data, isDark, otherBalances, onAddPayment }) {
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300';
  const [activePerson, setActivePerson] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAdd = (name) => {
    if (!paymentAmount) return;
    onAddPayment(name, paymentAmount, paymentDate);
    setPaymentAmount(''); setActivePerson(null);
  };

  const sortedPeople = Object.entries(otherBalances).sort(([_, a], [__, b]) => b.owes - a.owes);

  return (
    <div className="space-y-6">
      {sortedPeople.length === 0 ? (
        <div className={`${bgCard} border rounded-2xl p-12 text-center`}>
          <Users className={`w-12 h-12 mx-auto mb-3 ${textSecondary} opacity-50`} />
          <p className={textSecondary}>No hay otras personas registradas todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPeople.map(([name, balance]) => {
            const txs = (balance.transactions || []).sort((a, b) => new Date(b.date) - new Date(a.date));
            const payments = data.otherPayments?.[name] || [];
            const owes = balance.owes;
            return (
              <div key={name} className={`${bgCard} border rounded-2xl p-5`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg">
                    {name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{name}</p>
                    <p className={`text-xs ${textSecondary}`}>{txs.length} transacciones</p>
                  </div>
                </div>
                <div className={`p-3 rounded-xl mb-3 ${owes > 0 ? 'bg-pink-500/10' : owes < 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                  <p className={`text-xs ${textSecondary} mb-1`}>{owes > 0 ? 'Te debe' : owes < 0 ? 'Le debes' : 'Saldado'}</p>
                  <p className={`text-2xl font-bold ${owes > 0 ? 'text-pink-400' : owes < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatMoney(Math.abs(owes))}
                  </p>
                </div>
                {activePerson === name ? (
                  <div className="space-y-2">
                    <input type="number" placeholder="Cantidad pagada" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-pink-500 text-sm`} />
                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-pink-500 text-sm`} />
                    <div className="flex gap-2">
                      <button onClick={() => handleAdd(name)} className="flex-1 bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium">Guardar</button>
                      <button onClick={() => setActivePerson(null)} className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setActivePerson(name); setPaymentAmount(''); }}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-2 rounded-xl text-sm font-medium hover:scale-[1.02] transition-transform">
                    Registrar pago recibido
                  </button>
                )}
                {payments.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <p className={`text-xs ${textSecondary} mb-2`}>Pagos recibidos:</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {payments.map(p => (
                        <div key={p.id} className="flex justify-between text-xs">
                          <span className={textSecondary}>{formatDate(p.date)}</span>
                          <span className="text-emerald-400 font-medium">+{formatMoney(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {txs.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <p className={`text-xs ${textSecondary} mb-2`}>Últimos gastos:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {txs.slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex justify-between text-xs gap-2">
                          <span className="truncate flex-1">{tx.concept}</span>
                          <span className="text-red-400 font-medium flex-shrink-0">{formatMoney(tx.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalysisView({ data, isDark, monthSpending, subscriptions, currentMonth }) {
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const categoryData = Object.entries(monthSpending.byCategory)
    .map(([catId, amount]) => {
      const cat = CATEGORIES.find(c => c.id === catId) || { name: catId, color: '#94A3B8', icon: '📦' };
      return { name: cat.name, value: amount, color: cat.color, icon: cat.icon };
    }).sort((a, b) => b.value - a.value);

  const monthSubscriptions = subscriptions.filter(t => getMonthKey(t.date) === currentMonth);
  const totalSubs = monthSubscriptions.reduce((s, t) => s + t.amount, 0);

  const last12Months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      const txs = data.transactions.filter(t => getMonthKey(t.date) === key);
      const gastos = txs.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
      const ingresos = txs.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
      result.push({ mes: d.toLocaleDateString('es-MX', { month: 'short' }), gastos, ingresos });
    }
    return result;
  }, [data.transactions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${bgCard} border rounded-2xl p-5`}>
          <p className={`text-xs ${textSecondary} mb-1`}>Gastos del mes</p>
          <p className="text-2xl font-bold">{formatMoney(monthSpending.total)}</p>
          <p className={`text-xs ${textSecondary} mt-1`}>{getMonthName(currentMonth)}</p>
        </div>
        <div className={`${bgCard} border rounded-2xl p-5`}>
          <p className={`text-xs ${textSecondary} mb-1`}>Suscripciones</p>
          <p className="text-2xl font-bold">{formatMoney(totalSubs)}</p>
          <p className={`text-xs ${textSecondary} mt-1`}>{monthSubscriptions.length} activas este mes</p>
        </div>
        <div className={`${bgCard} border rounded-2xl p-5`}>
          <p className={`text-xs ${textSecondary} mb-1`}>Categorías usadas</p>
          <p className="text-2xl font-bold">{categoryData.length}</p>
          <p className={`text-xs ${textSecondary} mt-1`}>de {CATEGORIES.length} disponibles</p>
        </div>
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <h3 className="font-semibold mb-4">Gastos vs Ingresos — Últimos 12 meses</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={last12Months}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
            <XAxis dataKey="mes" stroke={isDark ? '#64748b' : '#475569'} fontSize={12} />
            <YAxis stroke={isDark ? '#64748b' : '#475569'} fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, borderRadius: '12px' }} formatter={(v) => formatMoney(v)} />
            <Legend />
            <Bar dataKey="gastos" fill="#EF4444" radius={[8, 8, 0, 0]} />
            <Bar dataKey="ingresos" fill="#10B981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${bgCard} border rounded-2xl p-6`}>
          <h3 className="font-semibold mb-4">Distribución de gastos — {getMonthName(currentMonth)}</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, borderRadius: '12px' }} formatter={(v) => formatMoney(v)} />
              </RePieChart>
            </ResponsiveContainer>
          ) : <div className={`text-center py-12 ${textSecondary}`}>Sin datos del mes</div>}
        </div>

        <div className={`${bgCard} border rounded-2xl p-6`}>
          <h3 className="font-semibold mb-4">Detalle por categoría</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {categoryData.map((cat, i) => {
              const pct = ((cat.value / monthSpending.total) * 100).toFixed(1);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className={`text-xs ${textSecondary}`}>{pct}%</span>
                    </div>
                    <span className="text-sm font-semibold">{formatMoney(cat.value)}</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              );
            })}
            {categoryData.length === 0 && <div className={`text-center py-8 ${textSecondary}`}>Sin gastos este mes</div>}
          </div>
        </div>
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <h3 className="font-semibold mb-4 flex items-center gap-2">📺 Suscripciones detectadas</h3>
        {monthSubscriptions.length > 0 ? (
          <div className="space-y-2">
            {monthSubscriptions.map(s => {
              const card = data.cards.find(c => c.id === s.card);
              return (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">📺</div>
                    <div>
                      <p className="text-sm font-medium">{s.concept}</p>
                      <p className={`text-xs ${textSecondary}`}>{card?.name} • {formatDate(s.date)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatMoney(s.amount)}</p>
                </div>
              );
            })}
            <div className="pt-3 mt-3 border-t flex justify-between items-center" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              <span className="text-sm font-semibold">Total mensual</span>
              <span className="text-lg font-bold text-purple-400">{formatMoney(totalSubs)}</span>
            </div>
          </div>
        ) : <div className={`text-center py-6 ${textSecondary} text-sm`}>No hay suscripciones registradas este mes</div>}
      </div>
    </div>
  );
}

function CardsView({ data, isDark, setData, upcomingPayments, cardBalances, onAddCardPayment, onRemoveCardPayment, onSetCardInitial, onAddTransfer, onRemoveTransfer }) {
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300';
  const debitCards = data.cards.filter(c => c.type === 'debito');
  const [editing, setEditing] = useState(null);
  const [editingInitial, setEditingInitial] = useState(null);
  const [tempInitial, setTempInitial] = useState('');
  const [activePaymentCard, setActivePaymentCard] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentFromCard, setPaymentFromCard] = useState('bbva-deb');
  const [showHistory, setShowHistory] = useState(null);
  const [confirmDeleteCardPayment, setConfirmDeleteCardPayment] = useState(null);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [tFrom, setTFrom] = useState('bbva-deb');
  const [tTo, setTTo] = useState('banamex-deb');
  const [tAmount, setTAmount] = useState('');
  const [tDate, setTDate] = useState(new Date().toISOString().split('T')[0]);
  const [tNote, setTNote] = useState('');
  const [confirmDeleteTransfer, setConfirmDeleteTransfer] = useState(null);

  const updateCard = (id, updates) => {
    setData(d => ({ ...d, cards: d.cards.map(c => c.id === id ? { ...c, ...updates } : c) }));
  };

  const cardStats = useMemo(() => {
    const stats = {};
    data.cards.forEach(c => {
      const txs = data.transactions.filter(t => t.card === c.id);
      const gastos = txs.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
      const ingresos = txs.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
      const totalPaid = (data.cardPayments?.[c.id] || []).reduce((s, p) => s + p.amount, 0);
      stats[c.id] = { gastos, ingresos, count: txs.length, totalPaid };
    });
    return stats;
  }, [data.cards, data.transactions, data.cardPayments]);

  const cardsByBank = useMemo(() => {
    const groups = {};
    data.cards.forEach(card => {
      const bank = card.bank || 'Otro';
      if (!groups[bank]) groups[bank] = [];
      groups[bank].push(card);
    });
    return groups;
  }, [data.cards]);

  const handleAddPayment = (cardId) => {
    if (!paymentAmount) return;
    onAddCardPayment(cardId, paymentAmount, paymentDate, paymentNote, paymentFromCard);
    setPaymentAmount(''); setPaymentNote(''); setActivePaymentCard(null);
  };

  const handleAddTransfer = () => {
    if (!tAmount || tFrom === tTo) return;
    onAddTransfer(tFrom, tTo, tAmount, tDate, tNote);
    setTAmount(''); setTNote(''); setShowTransferForm(false);
  };

  const renderCard = (card) => {
    const stats = cardStats[card.id] || { gastos: 0, ingresos: 0, count: 0, totalPaid: 0 };
    const isEditing = editing === card.id;
    const upcoming = upcomingPayments.find(p => p.card.id === card.id);
    const isCredit = card.type === 'credito';
    const cardPaymentsList = data.cardPayments?.[card.id] || [];
    const isPaying = activePaymentCard === card.id;
    const isShowingHistory = showHistory === card.id;
    const balance = cardBalances[card.id] || 0;
    const isEditingInit = editingInitial === card.id;

    return (
      <div key={card.id} className="relative overflow-hidden rounded-2xl shadow-xl group hover:scale-[1.01] transition-transform">
        <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)` }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider">{card.bank}</p>
                <p className="text-lg font-bold">{card.name}</p>
              </div>
              {card.type === 'fedor' ? <Heart className="w-6 h-6 opacity-80" /> : <CreditCard className="w-6 h-6 opacity-80" />}
            </div>
            <div className="mb-2">
              <p className="text-xs opacity-80">{isCredit ? 'Deuda actual' : 'Saldo actual'}</p>
              <p className="text-2xl font-bold">{formatMoney(balance)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs opacity-80 capitalize">{card.type === 'fedor' ? 'Cuenta de Fedor' : card.type}</p>
              {isCredit && card.paymentDay && (
                <p className="text-xs opacity-80">Pago día {card.paymentDay}</p>
              )}
            </div>
          </div>
        </div>
        <div className={`p-4 ${bgCard} border-x border-b rounded-b-2xl space-y-3`}>
          <div className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
            {isEditingInit ? (
              <div className="space-y-2">
                <label className={`text-xs ${textSecondary}`}>Saldo inicial</label>
                <input type="number" step="0.01" value={tempInitial} onChange={e => setTempInitial(e.target.value)}
                  className={`w-full px-2 py-1.5 rounded ${inputBg} border outline-none focus:border-violet-500 text-sm`} />
                <div className="flex gap-2">
                  <button onClick={() => { onSetCardInitial(card.id, tempInitial); setEditingInitial(null); }}
                    className="flex-1 bg-emerald-500 text-white py-1.5 rounded text-xs font-medium">Guardar</button>
                  <button onClick={() => setEditingInitial(null)} className={`px-3 py-1.5 rounded text-xs ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${textSecondary}`}>Saldo inicial</p>
                  <p className="text-sm font-semibold">{formatMoney(card.initialBalance || 0)}</p>
                </div>
                <button onClick={() => { setEditingInitial(card.id); setTempInitial((card.initialBalance || 0).toString()); }}
                  className={`p-1.5 rounded-lg ${textSecondary} hover:text-violet-400`}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {isCredit ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className={`text-xs ${textSecondary}`}>Cargos</p>
                <p className="text-sm font-bold text-red-400">{formatMoney(stats.gastos)}</p>
              </div>
              <div>
                <p className={`text-xs ${textSecondary}`}>Pagos a TDC</p>
                <p className="text-sm font-bold text-emerald-400">{formatMoney(stats.totalPaid)}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className={`text-xs ${textSecondary}`}>Gastos</p>
                <p className="text-sm font-bold text-red-400">{formatMoney(stats.gastos)}</p>
              </div>
              <div>
                <p className={`text-xs ${textSecondary}`}>Ingresos</p>
                <p className="text-sm font-bold text-emerald-400">{formatMoney(stats.ingresos)}</p>
              </div>
            </div>
          )}

          {upcoming && (
            <div className={`p-2.5 rounded-lg flex items-center justify-between text-xs ${
              upcoming.daysUntil <= 3 ? 'bg-red-500/10 text-red-400' : upcoming.daysUntil <= 7 ? 'bg-amber-500/10 text-amber-400' : isDark ? 'bg-slate-800' : 'bg-slate-100'
            }`}>
              <span>Próximo pago</span>
              <span className="font-semibold">{upcoming.daysUntil === 0 ? 'Hoy' : upcoming.daysUntil === 1 ? 'Mañana' : `${upcoming.daysUntil} días`}</span>
            </div>
          )}

          {isCredit && !isPaying && (
            <button onClick={() => { setActivePaymentCard(card.id); setPaymentAmount(''); setPaymentNote(''); setPaymentDate(new Date().toISOString().split('T')[0]); setPaymentFromCard(card.bank === 'BBVA' ? 'bbva-deb' : card.bank === 'Banamex' ? 'banamex-deb' : 'bbva-deb'); }}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-xl text-sm font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />Registrar pago a TDC
            </button>
          )}

          {isPaying && (
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} space-y-2`}>
              <p className="text-xs font-semibold">Registrar pago a TDC</p>
              <input type="number" step="0.01" placeholder="Cantidad pagada" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500 text-sm`} />
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500 text-sm`} />
              <div>
                <label className={`text-xs ${textSecondary} block mb-1`}>¿Desde qué cuenta pagas?</label>
                <select value={paymentFromCard} onChange={e => setPaymentFromCard(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500 text-sm`}>
                  {debitCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Nota (opcional)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500 text-sm`} />
              <div className="flex gap-2">
                <button onClick={() => handleAddPayment(card.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Guardar</button>
                <button onClick={() => setActivePaymentCard(null)} className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>Cancelar</button>
              </div>
            </div>
          )}

          {isCredit && cardPaymentsList.length > 0 && (
            <button onClick={() => setShowHistory(isShowingHistory ? null : card.id)}
              className={`w-full text-xs ${textSecondary} hover:text-emerald-400 py-1 flex items-center justify-center gap-1`}>
              {isShowingHistory ? '▲ Ocultar' : '▼ Ver'} historial ({cardPaymentsList.length})
            </button>
          )}

          {isShowingHistory && cardPaymentsList.length > 0 && (
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'} space-y-2 max-h-48 overflow-y-auto`}>
              {[...cardPaymentsList].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => {
                const fromCard = data.cards.find(c => c.id === (p.fromCard || 'bbva-deb'));
                return (
                  <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-white'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-emerald-400">{formatMoney(p.amount)}</p>
                      <p className={`text-[10px] ${textSecondary}`}>{formatDate(p.date)} • desde {fromCard?.name}{p.note && ` • ${p.note}`}</p>
                    </div>
                    <button onClick={() => setConfirmDeleteCardPayment({ cardId: card.id, payment: p })}
                      className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {isCredit && (
            <button onClick={() => setEditing(isEditing ? null : card.id)} className={`w-full text-xs ${textSecondary} hover:text-violet-400 py-1`}>
              {isEditing ? 'Cancelar' : 'Configurar fechas'}
            </button>
          )}

          {isEditing && (
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              <div>
                <label className={`text-xs ${textSecondary} block mb-1`}>Día de corte</label>
                <input type="number" min="1" max="31" value={card.cutoffDay || ''} onChange={e => updateCard(card.id, { cutoffDay: parseInt(e.target.value) || null })}
                  className={`w-full px-3 py-1.5 rounded-lg ${inputBg} border outline-none focus:border-violet-500 text-sm`} />
              </div>
              <div>
                <label className={`text-xs ${textSecondary} block mb-1`}>Día de pago</label>
                <input type="number" min="1" max="31" value={card.paymentDay || ''} onChange={e => updateCard(card.id, { paymentDay: parseInt(e.target.value) || null })}
                  className={`w-full px-3 py-1.5 rounded-lg ${inputBg} border outline-none focus:border-violet-500 text-sm`} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const bankOrder = ['BBVA', 'Banamex', 'Revolut', 'Fedor'];
  const sortedBanks = Object.keys(cardsByBank).sort((a, b) => {
    const ia = bankOrder.indexOf(a), ib = bankOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="space-y-8">
      <div className={`${bgCard} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Transferencias entre mis cuentas</h3>
              <p className={`text-xs ${textSecondary}`}>Mover dinero entre tus cuentas — no afecta tu patrimonio</p>
            </div>
          </div>
          <button onClick={() => setShowTransferForm(!showTransferForm)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />Nueva transferencia
          </button>
        </div>
        {showTransferForm && (
          <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} grid grid-cols-1 md:grid-cols-2 gap-3`}>
            <div>
              <label className={`text-xs ${textSecondary} block mb-1`}>Desde</label>
              <select value={tFrom} onChange={e => setTFrom(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-blue-500`}>
                {debitCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs ${textSecondary} block mb-1`}>Hacia</label>
              <select value={tTo} onChange={e => setTTo(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-blue-500`}>
                {debitCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <input type="number" placeholder="Cantidad" value={tAmount} onChange={e => setTAmount(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-blue-500`} />
            <input type="date" value={tDate} onChange={e => setTDate(e.target.value)}
              className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-blue-500`} />
            <input type="text" placeholder="Nota (opcional)" value={tNote} onChange={e => setTNote(e.target.value)}
              className={`md:col-span-2 px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-blue-500`} />
            {tFrom === tTo && <p className="md:col-span-2 text-xs text-red-400">El origen y destino no pueden ser la misma cuenta</p>}
            <button onClick={handleAddTransfer} disabled={tFrom === tTo}
              className="md:col-span-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg font-medium">Guardar</button>
          </div>
        )}

        {(data.transfers || []).length > 0 && (
          <div className="mt-4 space-y-2">
            {[...(data.transfers || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => {
              const from = data.cards.find(c => c.id === t.fromCard);
              const to = data.cards.find(c => c.id === t.toCard);
              return (
                <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{from?.name} → {to?.name}</p>
                      <p className={`text-xs ${textSecondary}`}>{formatDate(t.date)}{t.note && ` • ${t.note}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{formatMoney(t.amount)}</p>
                    <button onClick={() => setConfirmDeleteTransfer(t)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sortedBanks.map(bank => {
        const bankCards = cardsByBank[bank];
        const bankColor = bankCards[0]?.color || '#94A3B8';
        return (
          <div key={bank}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bankColor }}></div>
              <h3 className="font-semibold text-lg">{bank}</h3>
              <span className={`text-xs ${textSecondary}`}>{bankCards.length} {bankCards.length === 1 ? 'tarjeta' : 'tarjetas'}</span>
              <div className="flex-1 h-px ml-2" style={{ backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankCards.map(renderCard)}
            </div>
          </div>
        );
      })}

      {confirmDeleteCardPayment && (
        <ConfirmDeleteModal isDark={isDark} title="¿Eliminar este pago?"
          item={<><p className="font-medium">Pago a tarjeta</p><p className={`text-sm ${textSecondary}`}>{formatDate(confirmDeleteCardPayment.payment.date)} • {formatMoney(confirmDeleteCardPayment.payment.amount)}</p></>}
          onCancel={() => setConfirmDeleteCardPayment(null)}
          onConfirm={() => { onRemoveCardPayment(confirmDeleteCardPayment.cardId, confirmDeleteCardPayment.payment.id); setConfirmDeleteCardPayment(null); }} />
      )}
      {confirmDeleteTransfer && (
        <ConfirmDeleteModal isDark={isDark} title="¿Eliminar esta transferencia?"
          item={<><p className="font-medium">Transferencia entre cuentas</p><p className={`text-sm ${textSecondary}`}>{formatDate(confirmDeleteTransfer.date)} • {formatMoney(confirmDeleteTransfer.amount)}</p></>}
          onCancel={() => setConfirmDeleteTransfer(null)}
          onConfirm={() => { onRemoveTransfer(confirmDeleteTransfer.id); setConfirmDeleteTransfer(null); }} />
      )}
    </div>
  );
}

function SavingsView({ data, isDark, personalSavings, totalFedorOwes, patrimonio, debitTotal, creditDebtTotal, parentsBalance, investmentsTotal, setData, onSetCash, cardBalances, privacyMode, setPrivacyMode }) {
  const bgCard = isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300';
  const [showAddInv, setShowAddInv] = useState(false);
  const [invName, setInvName] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invCurrent, setInvCurrent] = useState('');
  const [invType, setInvType] = useState('CETES');
  const [confirmDeleteInv, setConfirmDeleteInv] = useState(null);
  const [editingInv, setEditingInv] = useState(null);
  const [editInvName, setEditInvName] = useState('');
  const [editInvType, setEditInvType] = useState('CETES');
  const [editInvAmount, setEditInvAmount] = useState('');
  const [editInvCurrent, setEditInvCurrent] = useState('');
  const [editingCash, setEditingCash] = useState(false);
  const [tempCash, setTempCash] = useState((data.cash || 0).toString());
  const [showInvestments, setShowInvestments] = useState(false);

  const PV = (val) => privacyMode ? '••••••' : val;

  const totalInvested = (data.investments || []).reduce((s, i) => s + (i.amount || 0), 0);
  const totalCurrent = investmentsTotal;
  const totalGain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100) : 0;

  const addInvestment = () => {
    if (!invName || !invAmount) return;
    const newInv = { id: Date.now().toString(), name: invName, type: invType, amount: parseFloat(invAmount), currentValue: parseFloat(invCurrent || invAmount), date: new Date().toISOString().split('T')[0] };
    setData(d => ({ ...d, investments: [...(d.investments || []), newInv] }));
    setInvName(''); setInvAmount(''); setInvCurrent(''); setShowAddInv(false);
  };

  const updateInvestment = (id, currentValue) => {
    setData(d => ({ ...d, investments: d.investments.map(i => i.id === id ? { ...i, currentValue: parseFloat(currentValue) || 0 } : i) }));
  };

  const saveEditInvestment = () => {
    if (!editInvName || !editInvAmount) return;
    setData(d => ({ ...d, investments: d.investments.map(i => i.id === editingInv ? {
      ...i, name: editInvName, type: editInvType,
      amount: parseFloat(editInvAmount) || 0,
      currentValue: parseFloat(editInvCurrent) || 0,
    } : i) }));
    setEditingInv(null);
  };

  const deleteInvestment = (id) => setData(d => ({ ...d, investments: d.investments.filter(i => i.id !== id) }));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-8 text-white shadow-2xl shadow-emerald-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Mi patrimonio total</span>
            </div>
            <button onClick={() => setPrivacyMode(!privacyMode)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title={privacyMode ? 'Mostrar' : 'Ocultar'}>
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-5xl font-bold tracking-tight mb-4">{PV(formatMoney(patrimonio))}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/20">
            <div>
              <p className="text-xs opacity-80 mb-0.5">Ahorro personal</p>
              <p className="text-base font-bold">{PV(formatMoney(personalSavings))}</p>
            </div>
            <div>
              <p className="text-xs opacity-80 mb-0.5">Por cobrar Fedor</p>
              <p className="text-base font-bold">{formatMoney(totalFedorOwes)}</p>
            </div>
            <div>
              <p className="text-xs opacity-80 mb-0.5">Inversiones</p>
              <p className="text-base font-bold">{PV(formatMoney(totalCurrent))}</p>
            </div>
            <div>
              <p className="text-xs opacity-80 mb-0.5">Efectivo</p>
              <p className="text-base font-bold">{PV(formatMoney(data.cash || 0))}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <h3 className="font-semibold mb-4">¿Cómo se compone mi ahorro personal?</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <p className="text-sm font-medium">Suma de cuentas de débito</p>
            <p className="text-base font-bold text-emerald-400">+{PV(formatMoney(debitTotal))}</p>
          </div>
          <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            <p className="text-sm font-medium">Deuda de tarjetas de crédito</p>
            <p className="text-base font-bold text-red-400">-{PV(formatMoney(creditDebtTotal))}</p>
          </div>
          <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            <p className="text-sm font-medium">Deuda con papás (compromiso)</p>
            <p className="text-base font-bold text-red-400">-{PV(formatMoney(parentsBalance.pendingRaw))}</p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t-2" style={{ borderColor: isDark ? '#334155' : '#cbd5e1' }}>
            <p className="text-sm font-bold">Ahorro personal</p>
            <p className="text-2xl font-bold text-emerald-400">{PV(formatMoney(personalSavings))}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-2" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          {data.cards.filter(c => c.type === 'debito').map(c => (
            <div key={c.id} className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
              <p className={`text-xs ${textSecondary} truncate`}>{c.name}</p>
              <p className={`text-sm font-bold ${(cardBalances[c.id] || 0) < 0 ? 'text-red-400' : ''}`}>{PV(formatMoney(cardBalances[c.id] || 0))}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold">Efectivo</h3>
              <p className={`text-xs ${textSecondary}`}>Dinero en efectivo que tienes</p>
            </div>
          </div>
          {editingCash ? (
            <div className="flex gap-2">
              <input type="number" step="0.01" value={tempCash} onChange={e => setTempCash(e.target.value)}
                className={`w-32 px-3 py-1.5 rounded-lg ${inputBg} border outline-none focus:border-green-500 text-sm`} />
              <button onClick={() => { onSetCash(tempCash); setEditingCash(false); }}
                className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm">✓</button>
            </div>
          ) : (
            <button onClick={() => { setEditingCash(true); setTempCash((data.cash || 0).toString()); }}
              className="text-base font-bold flex items-center gap-2">
              {PV(formatMoney(data.cash || 0))}
              <Edit2 className="w-3.5 h-3.5 opacity-50" />
            </button>
          )}
        </div>
      </div>

      <div className={`${bgCard} border rounded-2xl p-6`}>
        <button onClick={() => setShowInvestments(!showInvestments)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Mis Inversiones</h3>
              <p className={`text-xs ${textSecondary}`}>
                {(data.investments || []).length} {(data.investments || []).length === 1 ? 'inversión' : 'inversiones'}
                {' • '}Actual: {PV(formatMoney(totalCurrent))}
                {' • '}
                <span className={totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {totalGain >= 0 ? '+' : ''}{PV(formatMoney(totalGain))}
                </span>
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 ${textSecondary} transition-transform ${showInvestments ? 'rotate-180' : ''}`} />
        </button>
        {showInvestments && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            <div className="flex items-center justify-between mb-4">
              <p className={`text-xs ${textSecondary}`}>Seguimiento de tu portafolio</p>
              <button onClick={() => setShowAddInv(!showAddInv)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />Agregar
              </button>
            </div>

            {(data.investments || []).length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${textSecondary}`}>Invertido</p>
                  <p className="text-base font-bold">{PV(formatMoney(totalInvested))}</p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${textSecondary}`}>Actual</p>
                  <p className="text-base font-bold">{PV(formatMoney(totalCurrent))}</p>
                </div>
                <div className={`p-3 rounded-xl ${totalGain >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  <p className={`text-xs ${textSecondary}`}>Ganancia</p>
                  <p className={`text-base font-bold ${totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalGain >= 0 ? '+' : ''}{PV(formatMoney(totalGain))} {!privacyMode && `(${gainPct.toFixed(1)}%)`}
                  </p>
                </div>
              </div>
            )}

            {showAddInv && (
              <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} space-y-2`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input type="text" placeholder="Nombre" value={invName} onChange={e => setInvName(e.target.value)}
                    className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500`} />
                  <select value={invType} onChange={e => setInvType(e.target.value)}
                    className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500`}>
                    <option value="CETES">CETES</option>
                    <option value="Acciones">Acciones</option>
                    <option value="Fondos">Fondos de inversión</option>
                    <option value="Cripto">Crypto</option>
                    <option value="ETF">ETF</option>
                    <option value="Otro">Otro</option>
                  </select>
                  <input type="number" placeholder="Monto invertido" value={invAmount} onChange={e => setInvAmount(e.target.value)}
                    className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500`} />
                  <input type="number" placeholder="Valor actual (opcional)" value={invCurrent} onChange={e => setInvCurrent(e.target.value)}
                    className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500`} />
                </div>
                <button onClick={addInvestment} className="w-full bg-emerald-500 text-white py-2 rounded-lg font-medium">Guardar inversión</button>
              </div>
            )}

            {(data.investments || []).length > 0 ? (
              <div className="space-y-2">
                {data.investments.map(inv => {
                  const gain = (inv.currentValue || inv.amount) - inv.amount;
                  const pct = inv.amount > 0 ? (gain / inv.amount) * 100 : 0;
                  const isEditingThis = editingInv === inv.id;
                  if (isEditingThis) {
                    return (
                      <div key={inv.id} className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} space-y-2`}>
                        <p className="text-xs font-semibold">Editar inversión</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input type="text" placeholder="Nombre" value={editInvName} onChange={e => setEditInvName(e.target.value)}
                            className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500`} />
                          <select value={editInvType} onChange={e => setEditInvType(e.target.value)}
                            className={`px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500`}>
                            <option value="CETES">CETES</option>
                            <option value="Acciones">Acciones</option>
                            <option value="Fondos">Fondos de inversión</option>
                            <option value="Cripto">Crypto</option>
                            <option value="ETF">ETF</option>
                            <option value="Otro">Otro</option>
                          </select>
                          <div>
                            <label className={`text-xs ${textSecondary} block mb-1`}>Monto invertido</label>
                            <input type="number" step="0.01" value={editInvAmount} onChange={e => setEditInvAmount(e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500`} />
                          </div>
                          <div>
                            <label className={`text-xs ${textSecondary} block mb-1`}>Valor actual</label>
                            <input type="number" step="0.01" value={editInvCurrent} onChange={e => setEditInvCurrent(e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg ${inputBg} border outline-none focus:border-emerald-500`} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEditInvestment} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Guardar cambios</button>
                          <button onClick={() => setEditingInv(null)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>Cancelar</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={inv.id} className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{inv.name}</p>
                          <p className={`text-xs ${textSecondary}`}>{inv.type} • desde {formatDate(inv.date)}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => {
                            setEditingInv(inv.id);
                            setEditInvName(inv.name);
                            setEditInvType(inv.type);
                            setEditInvAmount((inv.amount || 0).toString());
                            setEditInvCurrent((inv.currentValue || inv.amount || 0).toString());
                          }} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDeleteInv(inv)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className={`text-xs ${textSecondary}`}>Invertido</p>
                          <p className="text-sm font-semibold">{PV(formatMoney(inv.amount))}</p>
                        </div>
                        <div>
                          <p className={`text-xs ${textSecondary}`}>Actual</p>
                          {privacyMode ? (
                            <p className="text-sm font-semibold">••••••</p>
                          ) : (
                            <input type="number" defaultValue={inv.currentValue || inv.amount} onBlur={e => updateInvestment(inv.id, e.target.value)}
                              className={`w-full px-2 py-1 rounded ${inputBg} border outline-none focus:border-emerald-500 text-sm font-semibold`} />
                          )}
                        </div>
                        <div>
                          <p className={`text-xs ${textSecondary}`}>Rendimiento</p>
                          <p className={`text-sm font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {gain >= 0 ? '+' : ''}{pct.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className={`text-center py-6 ${textSecondary} text-sm`}>No has agregado inversiones aún</div>}
          </div>
        )}
      </div>

      {confirmDeleteInv && (
        <ConfirmDeleteModal isDark={isDark} title="¿Eliminar esta inversión?"
          item={<><p className="font-medium">{confirmDeleteInv.name}</p><p className={`text-sm ${textSecondary}`}>{confirmDeleteInv.type} • {formatMoney(confirmDeleteInv.amount)}</p></>}
          onCancel={() => setConfirmDeleteInv(null)}
          onConfirm={() => { deleteInvestment(confirmDeleteInv.id); setConfirmDeleteInv(null); }} />
      )}
    </div>
  );
}

function TransactionModal({ data, isDark, allResponsibles, editingTx, onClose, onSave }) {
  const bgCard = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300';
  const [type, setType] = useState(editingTx?.type || 'gasto');
  const [isTransfer, setIsTransfer] = useState(editingTx?.isTransfer || false);
  const [paidByFedor, setPaidByFedor] = useState(editingTx?.card === 'fedor-cuenta' || editingTx?.paidWith === 'fedor');
  const [card, setCard] = useState(editingTx?.card || data.cards.filter(c => c.type !== 'fedor')[0]?.id);
  const [amount, setAmount] = useState(editingTx?.amount?.toString() || '');
  const [concept, setConcept] = useState(editingTx?.concept || '');
  const [date, setDate] = useState(editingTx?.date || new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(editingTx?.category || 'otros');
  const [responsible, setResponsible] = useState(editingTx?.responsible || 'fedor');
  const [responsibleName, setResponsibleName] = useState(editingTx?.responsibleName || '');
  const [incomeTarget, setIncomeTarget] = useState(editingTx?.incomeTarget || 'yo');
  const [incomeTargetName, setIncomeTargetName] = useState(editingTx?.incomeTargetName || '');

  const myCards = data.cards.filter(c => c.type !== 'fedor');

  const handleSubmit = () => {
    if (!amount || !concept) {
      alert('Por favor completa al menos la cantidad y el concepto');
      return;
    }
    const finalCard = paidByFedor ? 'fedor-cuenta' : card;
    const tx = {
      type, isTransfer, card: finalCard, amount: parseFloat(amount), concept, date,
      category: type === 'gasto' ? category : null,
      responsible: type === 'gasto' ? responsible : null,
      responsibleName: type === 'gasto' && responsible === 'otra' ? responsibleName : null,
      paidWith: type === 'gasto' && responsible === 'papas' ? (paidByFedor ? 'fedor' : 'mia') : null,
      incomeTarget: type === 'ingreso' ? incomeTarget : null,
      incomeTargetName: type === 'ingreso' && incomeTarget === 'otra' ? incomeTargetName : null,
    };
    onSave(tx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className={`${bgCard} border rounded-3xl w-full max-w-2xl my-8 shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{editingTx ? 'Editar transacción' : 'Nueva transacción'}</h2>
            <button onClick={onClose} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setType('gasto')}
              className={`p-3 rounded-xl border-2 transition-all ${type === 'gasto' ? 'border-red-500 bg-red-500/10 text-red-400' : `${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-600'}`}`}>
              <ArrowUpRight className="w-5 h-5 mx-auto mb-1" />
              <p className="text-sm font-semibold">Gasto</p>
            </button>
            <button onClick={() => setType('ingreso')}
              className={`p-3 rounded-xl border-2 transition-all ${type === 'ingreso' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : `${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-600'}`}`}>
              <ArrowDownRight className="w-5 h-5 mx-auto mb-1" />
              <p className="text-sm font-semibold">Ingreso</p>
            </button>
          </div>

          {type === 'gasto' && (
            <label className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} cursor-pointer`}>
              <input type="checkbox" checked={isTransfer} onChange={e => setIsTransfer(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">Es una transferencia (no compra directa)</span>
            </label>
          )}

          {type === 'gasto' && (
            <label className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
              paidByFedor ? 'bg-violet-500/10 border-2 border-violet-500' : `${isDark ? 'bg-slate-800/50 border-2 border-transparent' : 'bg-slate-50 border-2 border-transparent'}`
            }`}>
              <input type="checkbox" checked={paidByFedor} onChange={e => setPaidByFedor(e.target.checked)} className="w-4 h-4" />
              <Heart className={`w-4 h-4 ${paidByFedor ? 'text-violet-400' : textSecondary}`} />
              <span className="text-sm">Pagado con cuenta de Fedor (no con mis tarjetas)</span>
            </label>
          )}

          <div>
            <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Cantidad</label>
            <div className="relative">
              <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
              <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl ${inputBg} border outline-none focus:border-violet-500 text-lg font-semibold`} />
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Concepto</label>
            <input type="text" placeholder="¿En qué fue?" value={concept} onChange={e => setConcept(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl ${inputBg} border outline-none focus:border-violet-500`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paidByFedor && type === 'gasto' ? (
              <div>
                <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Cuenta</label>
                <div className={`px-4 py-2.5 rounded-xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'} border border-violet-500/30 flex items-center gap-2`}>
                  <Heart className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-violet-400">Cuenta de Fedor</span>
                </div>
              </div>
            ) : (
              <div>
                <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Tarjeta / Cuenta</label>
                <select value={card} onChange={e => setCard(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl ${inputBg} border outline-none focus:border-violet-500`}>
                  {myCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl ${inputBg} border outline-none focus:border-violet-500`} />
            </div>
          </div>

          {type === 'gasto' && (
            <>
              <div>
                <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Categoría</label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-xl border-2 transition-all text-center ${
                        category === cat.id ? 'border-violet-500 bg-violet-500/10' : `${isDark ? 'border-slate-700' : 'border-slate-200'}`
                      }`}>
                      <div className="text-xl mb-0.5">{cat.icon}</div>
                      <p className="text-[10px] font-medium leading-tight">{cat.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>¿Quién es responsable del gasto?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'fedor', name: 'Fedor', emoji: '💜' },
                    { id: 'papas', name: 'Papás', emoji: '👨‍👩‍👧' },
                    { id: 'yo', name: 'Yo', emoji: '🙋‍♀️' },
                    { id: 'otra', name: 'Otra persona', emoji: '👤' },
                  ].map(r => (
                    <button key={r.id} onClick={() => setResponsible(r.id)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        responsible === r.id ? 'border-violet-500 bg-violet-500/10' : `${isDark ? 'border-slate-700' : 'border-slate-200'}`
                      }`}>
                      <div className="text-xl mb-1">{r.emoji}</div>
                      <p className="text-xs font-semibold">{r.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {responsible === 'otra' && (
                <div>
                  <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Nombre de la persona</label>
                  <input type="text" placeholder="Ej. Mariana, Stefi..." value={responsibleName} onChange={e => setResponsibleName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl ${inputBg} border outline-none focus:border-violet-500`} />
                </div>
              )}

              {responsible === 'papas' && (
                <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'} border ${paidByFedor ? 'border-violet-500/30' : 'border-blue-500/30'}`}>
                  <p className="text-xs font-medium mb-1">{paidByFedor ? '💜 Pagado con cuenta de Fedor' : '💙 Pagado con tu cuenta'}</p>
                  <p className={`text-xs ${textSecondary}`}>
                    {paidByFedor ? 'Reduce lo que debes a papás Y lo que Fedor te debe' : 'Solo reduce lo que debes a papás'}
                  </p>
                </div>
              )}
            </>
          )}

          {type === 'ingreso' && (
            <>
              <div>
                <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>¿A qué balance va?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'yo', name: 'Mi ahorro', emoji: '🐷' },
                    { id: 'fedor', name: 'Balance Fedor', emoji: '💜' },
                    { id: 'papas', name: 'Balance Papás', emoji: '👨‍👩‍👧' },
                    { id: 'otra', name: 'Otra persona', emoji: '👤' },
                  ].map(r => (
                    <button key={r.id} onClick={() => setIncomeTarget(r.id)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        incomeTarget === r.id ? 'border-emerald-500 bg-emerald-500/10' : `${isDark ? 'border-slate-700' : 'border-slate-200'}`
                      }`}>
                      <div className="text-xl mb-1">{r.emoji}</div>
                      <p className="text-xs font-semibold">{r.name}</p>
                    </button>
                  ))}
                </div>
                {incomeTarget === 'fedor' && (
                  <p className={`text-xs ${textSecondary} mt-2`}>
                    💡 Si Fedor te transfirió para cubrir el balance, mejor regístralo como "Abono" en la sección Fedor
                  </p>
                )}
              </div>

              {incomeTarget === 'otra' && (
                <div>
                  <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>¿De quién?</label>
                  <input type="text" placeholder="Ej. Mariana, Stefi..." value={incomeTargetName} onChange={e => setIncomeTargetName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl ${inputBg} border outline-none focus:border-emerald-500`} />
                </div>
              )}
            </>
          )}
        </div>
        <div className="p-6 border-t flex gap-2" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          <button onClick={onClose}
            className={`flex-1 px-4 py-3 rounded-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} font-medium transition-colors`}>
            Cancelar
          </button>
          <button onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:scale-[1.02] transition-transform shadow-lg shadow-violet-500/30">
            {editingTx ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
