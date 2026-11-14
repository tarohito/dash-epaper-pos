import express from 'express';
import compression from 'compression';
import path from 'path';
import type {
  BroadcastRecipientStatus,
  BuybackCreatePayload,
  Customer,
  PaymentDetails,
  Product,
  PromoBroadcastCreatePayload,
  PromoCampaign,
  ShiftClosingCreatePayload,
  StoreSettingsUpdatePayload,
  Tenant,
  Transaction,
  TransactionItem,
  UserAccount,
  UserCreatePayload,
  UserRole,
  UserUpdatePayload,
} from './src/types/index.ts';
import {
  authenticateUser,
  cancelPendingPromoBroadcastRecipients,
  createPromoBroadcastBatch,
  createSession,
  createShiftClosing,
  createUserAccount,
  db,
  deleteSession,
  deleteUserAccount,
  generateNextMemberCode,
  getAccessibleTenantsForUser,
  getActivePromos,
  getAllCategories,
  getBroadcastAudienceCustomers,
  getBuybackById,
  getCategoriesWithStats,
  getDailyBroadcastSentCount,
  getDashboardSummary,
  getLiveShiftSummary,
  getPromoBroadcastById,
  getSessionContext,
  getStoreSettings,
  getTransactionById,
  isTenantAllowedForUser,
  listPromoBroadcasts,
  lookupProductByCode,
  queryBuybacks,
  queryCustomers,
  queryProducts,
  queryPromos,
  queryShiftClosings,
  queryTransactions,
  queryUsers,
  seedInitialDataIfEmpty,
  updatePromoBroadcastRecipientStatus,
  updateSessionTenant,
  updateStoreSettings,
  updateUserAccount,
} from './server/db.ts';

// Seed SQLite on startup if empty
seedInitialDataIfEmpty();

const app = express();
app.use(compression());
app.use(express.json({ limit: '15mb' }));

interface AuthContext {
  token: string;
  user: UserAccount;
  activeTenantId: string;
}

type AuthenticatedRequest = express.Request & { auth?: AuthContext };

function extractTokenFromRequest(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader === 'string' && cookieHeader.length > 0) {
    for (const part of cookieHeader.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k === 'epaper_session') {
        const val = decodeURIComponent(rest.join('=')).trim();
        if (val) return val;
      }
    }
  }
  return null;
}

function getAuth(req: express.Request): AuthContext {
  return (req as AuthenticatedRequest).auth!;
}

const requireAuth: express.RequestHandler = (req, res, next) => {
  const token = extractTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Silakan login terlebih dahulu untuk mengakses aplikasi.' });
    return;
  }
  const ctx = getSessionContext(token);
  if (!ctx) {
    res.status(401).json({ error: 'Sesi login telah berakhir atau tidak valid. Silakan login kembali.' });
    return;
  }
  (req as AuthenticatedRequest).auth = ctx;
  next();
};

function requireRoles(...roles: UserRole[]): express.RequestHandler {
  return (req, res, next) => {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Autentikasi diperlukan.' });
      return;
    }
    if (!roles.includes(auth.user.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki izin peran untuk melakukan tindakan ini.' });
      return;
    }
    next();
  };
}

// ============================================================
// AUTHENTICATION ROUTES (PUBLIC LOGIN / LOGOUT)
// ============================================================
app.post('/api/auth/login', (req, res) => {
  try {
    const body = (req.body ?? {}) as { identifier?: string; username?: string; password?: string };
    const identifier = String(body.identifier ?? body.username ?? '').trim();
    const password = String(body.password ?? '');

    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email dan kata sandi wajib diisi.' });
      return;
    }

    const user = authenticateUser(identifier, password);
    if (!user) {
      res.status(401).json({ error: 'Username/email atau kata sandi salah, atau akun tidak aktif.' });
      return;
    }

    const { token, activeTenantId } = createSession(user);
    const tenants = getAccessibleTenantsForUser(user);

    res.setHeader(
      'Set-Cookie',
      `epaper_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );
    res.json({
      token,
      user,
      tenants,
      activeTenantId,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memproses login.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const token = extractTokenFromRequest(req);
    if (token) {
      deleteSession(token);
    }
    res.setHeader('Set-Cookie', 'epaper_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal logout.' });
  }
});

// Require valid authenticated session for all remaining /api endpoints
app.use('/api', requireAuth);

app.get('/api/auth/me', (req, res) => {
  const auth = getAuth(req);
  res.json({
    user: auth.user,
    tenants: getAccessibleTenantsForUser(auth.user),
    activeTenantId: auth.activeTenantId,
  });
});

// ============================================================
// BOOTSTRAP (LIGHTWEIGHT SHELL DATA ONLY)
// ============================================================
app.get('/api/bootstrap', (req, res) => {
  try {
    const auth = getAuth(req);
    res.json({
      user: auth.user,
      categories: getAllCategories(),
      tenants: getAccessibleTenantsForUser(auth.user),
      activeTenantId: auth.activeTenantId,
      activePromos: getActivePromos(auth.activeTenantId),
      storeSettings: getStoreSettings(auth.activeTenantId),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat data awal dari SQLite.' });
  }
});

// ============================================================
// USER MANAGEMENT CRUD (OWNER ONLY)
// ============================================================
app.get('/api/users', requireRoles('owner'), (req, res) => {
  try {
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const role = String(req.query.role ?? 'all');
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryUsers({ page, pageSize, search, role, sortBy, sortDir }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.' });
  }
});

app.post('/api/users', requireRoles('owner'), (req, res) => {
  try {
    const payload = req.body as UserCreatePayload;
    const created = createUserAccount(payload);
    res.status(201).json(created);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal membuat akun pengguna.';
    const status = msg.includes('sudah digunakan') ? 409 : 400;
    res.status(status).json({ error: msg });
  }
});

app.put('/api/users/:id', requireRoles('owner'), (req, res) => {
  try {
    const auth = getAuth(req);
    const updated = updateUserAccount(String(req.params.id), req.body as UserUpdatePayload, auth.user.id);
    res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal memperbarui akun pengguna.';
    const status = msg.includes('tidak ditemukan') ? 404 : msg.includes('sudah digunakan') ? 409 : 400;
    res.status(status).json({ error: msg });
  }
});

app.delete('/api/users/:id', requireRoles('owner'), (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = String(req.params.id);
    deleteUserAccount(userId, auth.user.id);
    res.json({ deletedId: userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menghapus akun pengguna.';
    const status = msg.includes('tidak ditemukan') ? 404 : 400;
    res.status(status).json({ error: msg });
  }
});

// ============================================================
// DASHBOARD SUMMARY (SERVER-SIDE AGGREGATION)
// ============================================================
app.get('/api/dashboard/summary', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const period = req.query.period === 'BULAN' ? 'BULAN' : 'HARI';
    res.json(getDashboardSummary(period, activeTenantId));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat ringkasan dasbor.' });
  }
});

// ============================================================
// PRODUCTS CRUD & PAGINATION & BARCODE LOOKUP
// ============================================================
app.get('/api/products/lookup', (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const code = String(req.query.code ?? '');
    const product = lookupProductByCode(code, activeTenantId);
    if (!product) {
      res.status(404).json({ error: 'Produk dengan kode/SKU tersebut tidak ditemukan.' });
      return;
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal mencari produk.' });
  }
});

app.get('/api/products', (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const category = String(req.query.category ?? 'Semua');
    const promoOnly = req.query.promoOnly === 'true' || req.query.promoOnly === '1';
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryProducts({ page, pageSize, search, category, promoOnly, sortBy, sortDir, tenantId: activeTenantId }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat produk.' });
  }
});

app.post('/api/products', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const tenantId = getAuth(req).activeTenantId;
    const body = req.body as Partial<Product>;
    const sku = (body.sku ?? '').trim().toUpperCase();
    const name = (body.name ?? '').trim();
    const category = (body.category ?? '').trim() || 'Cincin';
    const berat = Number(body.berat);
    const harga = Math.round(Number(body.harga));
    const stok = Math.max(0, Math.round(Number(body.stok ?? 0)));
    const image =
      (body.image ?? '').trim() ||
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80';

    if (!sku || !name) {
      res.status(400).json({ error: 'SKU dan nama produk wajib diisi.' });
      return;
    }
    if (!Number.isFinite(berat) || berat <= 0) {
      res.status(400).json({ error: 'Berat produk harus lebih dari 0 gram.' });
      return;
    }
    if (!Number.isFinite(harga) || harga <= 0) {
      res.status(400).json({ error: 'Harga jual produk harus lebih dari Rp 0.' });
      return;
    }

    const existingSku = db
      .prepare('SELECT id FROM products WHERE tenantId = ? AND LOWER(sku) = LOWER(?)')
      .get(tenantId, sku);
    if (existingSku) {
      res.status(409).json({ error: `SKU "${sku}" sudah digunakan produk lain di outlet ini.` });
      return;
    }

    const createTx = db.transaction(() => {
      db.prepare('INSERT OR IGNORE INTO categories (name, sortOrder) VALUES (?, 99)').run(category);
      const info = db
        .prepare('INSERT INTO products (tenantId, sku, name, berat, harga, stok, category, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(tenantId, sku, name, berat, harga, stok, category, image);
      return db
        .prepare('SELECT id, sku, name, berat, harga, stok, category, image FROM products WHERE id = ?')
        .get(info.lastInsertRowid) as Product;
    });

    const created = createTx();
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan produk.' });
  }
});

app.put('/api/products/:id', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const tenantId = getAuth(req).activeTenantId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'ID produk tidak valid.' });
      return;
    }
    const existing = db
      .prepare('SELECT * FROM products WHERE id = ? AND tenantId = ?')
      .get(id, tenantId) as Product | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Produk tidak ditemukan di outlet aktif.' });
      return;
    }

    const body = req.body as Partial<Product>;
    const sku = (body.sku ?? existing.sku).trim().toUpperCase();
    const name = (body.name ?? existing.name).trim();
    const category = (body.category ?? existing.category).trim() || existing.category;
    const berat = body.berat !== undefined ? Number(body.berat) : existing.berat;
    const harga = body.harga !== undefined ? Math.round(Number(body.harga)) : existing.harga;
    const stok = body.stok !== undefined ? Math.max(0, Math.round(Number(body.stok))) : existing.stok;
    const image = (body.image ?? existing.image).trim() || existing.image;

    if (!sku || !name || !Number.isFinite(berat) || berat <= 0 || !Number.isFinite(harga) || harga <= 0) {
      res.status(400).json({ error: 'Data produk tidak lengkap atau tidak valid.' });
      return;
    }

    const duplicateSku = db
      .prepare('SELECT id FROM products WHERE tenantId = ? AND LOWER(sku) = LOWER(?) AND id != ?')
      .get(tenantId, sku, id);
    if (duplicateSku) {
      res.status(409).json({ error: `SKU "${sku}" sudah digunakan produk lain di outlet ini.` });
      return;
    }

    const updateTx = db.transaction(() => {
      db.prepare('INSERT OR IGNORE INTO categories (name, sortOrder) VALUES (?, 99)').run(category);
      db.prepare(
        'UPDATE products SET sku = ?, name = ?, berat = ?, harga = ?, stok = ?, category = ?, image = ? WHERE id = ? AND tenantId = ?'
      ).run(sku, name, berat, harga, stok, category, image, id, tenantId);
      return db
        .prepare('SELECT id, sku, name, berat, harga, stok, category, image FROM products WHERE id = ?')
        .get(id) as Product;
    });

    const updated = updateTx();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui produk.' });
  }
});

app.delete('/api/products/:id', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const tenantId = getAuth(req).activeTenantId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'ID produk tidak valid.' });
      return;
    }
    const usedCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM transaction_items WHERE productId = ?').get(id) as { cnt: number }
    ).cnt;
    if (usedCount > 0) {
      res.status(409).json({
        error: `Produk tidak dapat dihapus karena sudah tercatat pada ${usedCount} item transaksi penjualan. Atur stok menjadi 0 jika tidak dijual lagi.`,
      });
      return;
    }
    const result = db.prepare('DELETE FROM products WHERE id = ? AND tenantId = ?').run(id, tenantId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Produk tidak ditemukan di outlet aktif.' });
      return;
    }
    res.json({ deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghapus produk.' });
  }
});

// ============================================================
// CATEGORIES CRUD
// ============================================================
app.get('/api/categories', (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    if (req.query.withStats === 'true' || req.query.withStats === '1') {
      res.json(getCategoriesWithStats(activeTenantId));
      return;
    }
    res.json(getAllCategories());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat kategori.' });
  }
});

app.post('/api/categories', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const name = String((req.body as { name?: string }).name ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      return;
    }
    const existing = db.prepare('SELECT name FROM categories WHERE LOWER(name) = LOWER(?)').get(name);
    if (existing) {
      res.status(409).json({ error: `Kategori "${name}" sudah ada.` });
      return;
    }
    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sortOrder), 0) as m FROM categories').get() as { m: number }).m;
    db.prepare('INSERT INTO categories (name, sortOrder) VALUES (?, ?)').run(name, maxOrder + 1);
    res.status(201).json({ name, categories: getAllCategories() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menambah kategori.' });
  }
});

app.put('/api/categories/:oldName', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const oldName = decodeURIComponent(String(req.params.oldName)).trim();
    const newName = String((req.body as { name?: string }).name ?? '').trim();
    if (!newName) {
      res.status(400).json({ error: 'Nama kategori baru wajib diisi.' });
      return;
    }
    const existing = db.prepare('SELECT name, sortOrder FROM categories WHERE name = ?').get(oldName) as
      | { name: string; sortOrder: number }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      return;
    }
    if (oldName.toLowerCase() !== newName.toLowerCase()) {
      const clash = db.prepare('SELECT name FROM categories WHERE LOWER(name) = LOWER(?)').get(newName);
      if (clash) {
        res.status(409).json({ error: `Kategori "${newName}" sudah terdaftar.` });
        return;
      }
    }

    const renameTx = db.transaction(() => {
      db.prepare('UPDATE categories SET name = ? WHERE name = ?').run(newName, oldName);
      db.prepare('UPDATE products SET category = ? WHERE category = ?').run(newName, oldName);
    });
    renameTx();

    res.json({
      oldName,
      newName,
      categories: getAllCategories(),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal mengubah kategori.' });
  }
});

app.delete('/api/categories/:name', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const name = decodeURIComponent(String(req.params.name)).trim();
    const usedCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM products WHERE category = ?').get(name) as { cnt: number }
    ).cnt;
    if (usedCount > 0) {
      res.status(409).json({
        error: `Kategori "${name}" masih digunakan oleh ${usedCount} barang. Ubah kategori barang terkait terlebih dahulu.`,
      });
      return;
    }
    const result = db.prepare('DELETE FROM categories WHERE name = ?').run(name);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      return;
    }
    res.json({ deletedName: name, categories: getAllCategories() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghapus kategori.' });
  }
});

// ============================================================
// TRANSACTIONS CRUD (KASIR POS + HALAMAN TRANSAKSI)
// ============================================================
app.get('/api/transactions', (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const method = String(req.query.method ?? 'semua');
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryTransactions({ page, pageSize, search, method, sortBy, sortDir, tenantId: activeTenantId }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat transaksi.' });
  }
});

app.get('/api/transactions/:id', (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const tx = getTransactionById(req.params.id, activeTenantId);
    if (!tx) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan di outlet aktif.' });
      return;
    }
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat detail transaksi.' });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const auth = getAuth(req);
    const tenantId = auth.activeTenantId;
    const body = req.body as {
      cashier?: string;
      customerId?: string;
      customerName?: string;
      items?: Array<{ id: number; qty: number }>;
      paymentMethod?: 'cash' | 'debit' | 'transfer' | 'qris';
      paymentDetails?: PaymentDetails;
    };

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: 'Keranjang transaksi kosong.' });
      return;
    }

    const paymentMethod = body.paymentMethod ?? 'cash';
    const cashier = auth.user.fullName || (body.cashier ?? '').trim() || 'Kasir';
    let resolvedCustomerId = (body.customerId ?? '').trim() || undefined;
    let customerName = (body.customerName ?? '').trim() || 'Pelanggan Umum';

    if (resolvedCustomerId) {
      const cust = db
        .prepare('SELECT id, name FROM customers WHERE id = ?')
        .get(resolvedCustomerId) as { id: string; name: string } | undefined;
      if (cust) {
        resolvedCustomerId = cust.id;
        if (customerName === 'Pelanggan Umum') {
          customerName = cust.name;
        }
      } else {
        resolvedCustomerId = undefined;
      }
    }

    const checkoutTx = db.transaction(() => {
      const resolvedItems: TransactionItem[] = [];
      let subtotal = 0;
      let totalQty = 0;
      let totalBerat = 0;

      for (const reqItem of body.items!) {
        const prod = db
          .prepare('SELECT id, sku, name, berat, harga, stok, category, image FROM products WHERE id = ? AND tenantId = ?')
          .get(reqItem.id, tenantId) as Product | undefined;

        if (!prod) {
          throw new Error(`Produk ID ${reqItem.id} tidak ditemukan di outlet aktif.`);
        }
        const qty = Math.round(Number(reqItem.qty));
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error(`Jumlah untuk ${prod.name} tidak valid.`);
        }
        if (prod.stok < qty) {
          throw new Error(`Stok "${prod.name}" tidak mencukupi (tersedia ${prod.stok} pcs, diminta ${qty} pcs).`);
        }

        const itemSubtotal = prod.harga * qty;
        subtotal += itemSubtotal;
        totalQty += qty;
        totalBerat += prod.berat * qty;

        resolvedItems.push({
          id: prod.id,
          sku: prod.sku,
          name: prod.name,
          berat: prod.berat,
          harga: prod.harga,
          qty,
          subtotal: itemSubtotal,
          image: prod.image,
        });

        db.prepare('UPDATE products SET stok = stok - ? WHERE id = ? AND tenantId = ?').run(qty, prod.id, tenantId);
      }

      const storeSettings = getStoreSettings(tenantId);
      const tax = storeSettings.enablePpn ? Math.round(subtotal * (storeSettings.ppnPercent / 100)) : 0;
      const grandTotal = subtotal + tax;
      const now = new Date();
      const dateNum = now.toISOString().slice(0, 10).replace(/-/g, '');
      const todayCount = (
        db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE invoiceNo LIKE ?').get(`TRX-${dateNum}-%`) as {
          cnt: number;
        }
      ).cnt;

      let seq = todayCount + 1;
      let invoiceNo = `TRX-${dateNum}-${String(seq).padStart(3, '0')}`;
      while (db.prepare('SELECT id FROM transactions WHERE invoiceNo = ?').get(invoiceNo)) {
        seq += 1;
        invoiceNo = `TRX-${dateNum}-${String(seq).padStart(3, '0')}`;
      }

      const txId = `${invoiceNo}-${Date.now().toString().slice(-4)}`;
      const dateTime = now.toISOString();
      const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const rawDetails = body.paymentDetails ?? {};
      const paymentDetails: PaymentDetails = {
        ...rawDetails,
        cashChange:
          paymentMethod === 'cash' && rawDetails.cashReceived !== undefined
            ? Math.max(0, rawDetails.cashReceived - grandTotal)
            : rawDetails.cashChange,
        qrisNmid: paymentMethod === 'qris' ? rawDetails.qrisNmid || 'ID102003928192' : rawDetails.qrisNmid,
        qrisRrn:
          paymentMethod === 'qris' ? rawDetails.qrisRrn || `RRN${Date.now().toString().slice(-8)}` : rawDetails.qrisRrn,
      };

      const newTx: Transaction = {
        id: txId,
        invoiceNo,
        dateTime,
        dateStr,
        timeStr,
        cashier,
        customerId: resolvedCustomerId,
        customerName,
        items: resolvedItems,
        totalQty,
        totalBerat: parseFloat(totalBerat.toFixed(2)),
        subtotal,
        tax,
        grandTotal,
        paymentMethod,
        paymentDetails,
      };

      db.prepare(
        `INSERT INTO transactions (id, tenantId, invoiceNo, dateTime, dateStr, timeStr, cashier, customerId, customerName, totalQty, totalBerat, subtotal, tax, grandTotal, paymentMethod, paymentDetailsJson)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        newTx.id,
        tenantId,
        newTx.invoiceNo,
        newTx.dateTime,
        newTx.dateStr,
        newTx.timeStr,
        newTx.cashier,
        newTx.customerId ?? null,
        newTx.customerName,
        newTx.totalQty,
        newTx.totalBerat,
        newTx.subtotal,
        newTx.tax,
        newTx.grandTotal,
        newTx.paymentMethod,
        JSON.stringify(newTx.paymentDetails)
      );

      const insertItem = db.prepare(
        `INSERT INTO transaction_items (transactionId, productId, sku, name, berat, harga, qty, subtotal, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const it of resolvedItems) {
        insertItem.run(newTx.id, it.id, it.sku, it.name, it.berat, it.harga, it.qty, it.subtotal, it.image ?? null);
      }

      return {
        transaction: newTx,
      };
    });

    const result = checkoutTx();
    const enriched = getTransactionById(result.transaction.id, tenantId) ?? result.transaction;
    res.status(201).json({ transaction: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses transaksi.';
    const status = msg.includes('tidak mencukupi') || msg.includes('tidak ditemukan') ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

app.put('/api/transactions/:id', (_req, res) => {
  res.status(403).json({
    error: 'Transaksi penjualan yang sudah lunas tidak boleh diubah sesuai standar audit POS. Gunakan Void Transaksi jika terjadi kesalahan.',
  });
});

app.delete('/api/transactions/:id', (_req, res) => {
  res.status(403).json({
    error: 'Nota penjualan tidak boleh dihapus permanen agar nomor faktur & laporan kas tetap valid. Gunakan Void Transaksi.',
  });
});

app.post('/api/transactions/:id/void', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const tenantId = getAuth(req).activeTenantId;
    const { id } = req.params;
    const body = (req.body ?? {}) as { reason?: string; restoreStock?: boolean };
    const reason = (body.reason ?? '').trim();
    if (!reason) {
      res.status(400).json({ error: 'Alasan pembatalan (void) wajib diisi demi jejak audit POS.' });
      return;
    }
    const restoreStock = body.restoreStock !== false;

    const existing = db
      .prepare("SELECT id, COALESCE(status, 'completed') AS status FROM transactions WHERE id = ? AND tenantId = ?")
      .get(id, tenantId) as { id: string; status: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan di outlet aktif.' });
      return;
    }
    if (existing.status === 'void') {
      res.status(409).json({ error: 'Transaksi ini sudah berstatus VOID.' });
      return;
    }

    const voidedAt = new Date().toISOString();
    const voidTx = db.transaction(() => {
      db.prepare("UPDATE transactions SET status = 'void', voidReason = ?, voidedAt = ? WHERE id = ? AND tenantId = ?").run(
        reason,
        voidedAt,
        id,
        tenantId
      );

      if (restoreStock) {
        const items = db
          .prepare('SELECT productId, qty FROM transaction_items WHERE transactionId = ?')
          .all(id) as Array<{ productId: number; qty: number }>;
        const restoreStmt = db.prepare('UPDATE products SET stok = stok + ? WHERE id = ? AND tenantId = ?');
        for (const it of items) {
          restoreStmt.run(it.qty, it.productId, tenantId);
        }
      }
    });

    voidTx();
    const updated = getTransactionById(String(id));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal melakukan void transaksi.' });
  }
});

// ============================================================
// BUYBACKS CRUD (PAGINATED LIGHTWEIGHT LIST + ON-DEMAND DETAIL)
// ============================================================
app.get('/api/buybacks', (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const method = String(req.query.method ?? 'all');
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryBuybacks({ page, pageSize, search, method, sortBy, sortDir, tenantId: activeTenantId }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat data buyback.' });
  }
});

app.get('/api/buybacks/:id', (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const item = getBuybackById(req.params.id, activeTenantId);
    if (!item) {
      res.status(404).json({ error: 'Data buyback tidak ditemukan di outlet aktif.' });
      return;
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat detail buyback.' });
  }
});

app.post('/api/buybacks', (req, res) => {
  try {
    const auth = getAuth(req);
    const tenantId = auth.activeTenantId;
    const activeTenantRow = db
      .prepare('SELECT branchName FROM tenants WHERE id = ?')
      .get(tenantId) as { branchName: string } | undefined;
    const body = req.body as BuybackCreatePayload;
    if (!body.customerName?.trim() || !body.customerPhone?.trim()) {
      res.status(400).json({ error: 'Nama dan nomor HP nasabah wajib diisi.' });
      return;
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const datePrefix = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const existingCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM buybacks WHERE invoiceNo LIKE ?').get(`BB-${datePrefix}-%`) as {
        cnt: number;
      }
    ).cnt;

    let seq = existingCount + 1;
    let invoiceNo = `BB-${datePrefix}-${seq.toString().padStart(3, '0')}`;
    while (db.prepare('SELECT id FROM buybacks WHERE invoiceNo = ?').get(invoiceNo)) {
      seq += 1;
      invoiceNo = `BB-${datePrefix}-${seq.toString().padStart(3, '0')}`;
    }

    const dateStr =
      now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const id = `bb-${Date.now()}`;
    const cleanName = body.customerName.trim();
    const cleanPhone = body.customerPhone.trim();
    const cleanNik = body.customerNik?.trim() || null;
    const cleanAddress = body.customerAddress?.trim() || null;

    const saveTx = db.transaction(() => {
      let resolvedCustomerId: string | null = (body.customerId ?? '').trim() || null;

      if (resolvedCustomerId) {
        const linked = db
          .prepare('SELECT id, nik, address FROM customers WHERE id = ?')
          .get(resolvedCustomerId) as { id: string; nik: string | null; address: string | null } | undefined;
        if (linked) {
          if ((!linked.nik && cleanNik) || (!linked.address && cleanAddress)) {
            db.prepare('UPDATE customers SET nik = COALESCE(nik, ?), address = COALESCE(address, ?) WHERE id = ?').run(
              cleanNik,
              cleanAddress,
              linked.id
            );
          }
        } else {
          resolvedCustomerId = null;
        }
      }

      if (!resolvedCustomerId && body.saveToCustomerMaster !== false) {
        let matched: { id: string; nik: string | null; address: string | null } | undefined;
        if (cleanNik) {
          matched = db
            .prepare('SELECT id, nik, address FROM customers WHERE nik = ? LIMIT 1')
            .get(cleanNik) as { id: string; nik: string | null; address: string | null } | undefined;
          if (!matched) {
            matched = db
              .prepare(
                "SELECT id, nik, address FROM customers WHERE (nik IS NULL OR TRIM(nik) = '') AND (phone = ? OR LOWER(name) = LOWER(?)) LIMIT 1"
              )
              .get(cleanPhone, cleanName) as
              | { id: string; nik: string | null; address: string | null }
              | undefined;
          }
        } else {
          matched = db
            .prepare('SELECT id, nik, address FROM customers WHERE phone = ? OR LOWER(name) = LOWER(?) LIMIT 1')
            .get(cleanPhone, cleanName) as { id: string; nik: string | null; address: string | null } | undefined;
        }

        if (matched) {
          resolvedCustomerId = matched.id;
          if ((!matched.nik && cleanNik) || (!matched.address && cleanAddress)) {
            db.prepare('UPDATE customers SET nik = COALESCE(nik, ?), address = COALESCE(address, ?) WHERE id = ?').run(
              cleanNik,
              cleanAddress,
              matched.id
            );
          }
        } else {
          const newCustId = `CUST-${Date.now()}`;
          const memberCode = generateNextMemberCode();
          db.prepare(
            `INSERT INTO customers (id, memberCode, name, phone, nik, type, address, preferredKadar, notes, createdAt, totalSpent, totalTransactions)
             VALUES (?, ?, ?, ?, ?, 'Reguler', ?, ?, 'Terdaftar otomatis via Buyback', ?, 0, 0)`
          ).run(
            newCustId,
            memberCode,
            cleanName,
            cleanPhone,
            cleanNik,
            cleanAddress,
            body.kadar || '24K (99.9%)',
            now.toISOString().slice(0, 10)
          );
          resolvedCustomerId = newCustId;
        }
      }

      db.prepare(
        `INSERT INTO buybacks (
          id, tenantId, invoiceNo, date, createdAt, timeStr, branchName, cashierName,
          customerId, customerName, customerPhone, customerNik, customerNpwp, customerAddress,
          sourceNote, itemType, kadar, beratKotor, potonganBatu, beratBersih,
          hargaPerGram, biayaLebur, kondisi, totalKotor, potonganBiaya, pph22,
          totalBayar, paymentMethod, bankName, accountNo, accountHolder,
          catatan, fotoKtp, fotoEmas, ttdNasabah, ttdPetugas, isAgreedLegal, itemsJson
        ) VALUES (
          @id, @tenantId, @invoiceNo, @date, @createdAt, @timeStr, @branchName, @cashierName,
          @customerId, @customerName, @customerPhone, @customerNik, @customerNpwp, @customerAddress,
          @sourceNote, @itemType, @kadar, @beratKotor, @potonganBatu, @beratBersih,
          @hargaPerGram, @biayaLebur, @kondisi, @totalKotor, @potonganBiaya, @pph22,
          @totalBayar, @paymentMethod, @bankName, @accountNo, @accountHolder,
          @catatan, @fotoKtp, @fotoEmas, @ttdNasabah, @ttdPetugas, @isAgreedLegal, @itemsJson
        )`
      ).run({
        id,
        tenantId,
        invoiceNo,
        date: dateStr,
        createdAt: now.toISOString(),
        timeStr: body.timeStr ?? null,
        branchName: body.branchName?.trim() || activeTenantRow?.branchName || null,
        cashierName: auth.user.fullName || body.cashierName || null,
        customerId: resolvedCustomerId,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerNik: cleanNik,
        customerNpwp: body.customerNpwp ?? null,
        customerAddress: cleanAddress,
        sourceNote: body.sourceNote || '-',
        itemType: body.itemType,
        kadar: body.kadar,
        beratKotor: Number(body.beratKotor) || 0,
        potonganBatu: Number(body.potonganBatu) || 0,
        beratBersih: Number(body.beratBersih) || 0,
        hargaPerGram: Math.round(Number(body.hargaPerGram) || 0),
        biayaLebur: Math.round(Number(body.biayaLebur) || 0),
        kondisi: body.kondisi || 'Baik / Utuh',
        totalKotor: body.totalKotor !== undefined ? Math.round(Number(body.totalKotor)) : null,
        potonganBiaya: body.potonganBiaya !== undefined ? Math.round(Number(body.potonganBiaya)) : null,
        pph22: body.pph22 !== undefined ? Math.round(Number(body.pph22)) : null,
        totalBayar: Math.round(Number(body.totalBayar) || 0),
        paymentMethod: body.paymentMethod,
        bankName: body.bankName ?? null,
        accountNo: body.accountNo ?? null,
        accountHolder: body.accountHolder ?? null,
        catatan: body.catatan ?? null,
        fotoKtp: body.fotoKtp ?? null,
        fotoEmas: body.fotoEmas ?? null,
        ttdNasabah: body.ttdNasabah ?? null,
        ttdPetugas: body.ttdPetugas ?? null,
        isAgreedLegal: body.isAgreedLegal ? 1 : 0,
        itemsJson: body.items ? JSON.stringify(body.items) : null,
      });
    });

    saveTx();
    const created = getBuybackById(id, tenantId);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan transaksi buyback.' });
  }
});

app.put('/api/buybacks/:id', (_req, res) => {
  res.status(403).json({
    error: 'Nota buyback yang sudah dibayarkan tidak boleh diubah demi menjaga validitas tanda tangan & kas keluar. Gunakan Void Buyback jika terjadi kesalahan.',
  });
});

app.delete('/api/buybacks/:id', (_req, res) => {
  res.status(403).json({
    error: 'Nota buyback tidak boleh dihapus permanen demi jejak audit KTP & pencairan dana. Gunakan Void Buyback.',
  });
});

app.post('/api/buybacks/:id/void', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const tenantId = getAuth(req).activeTenantId;
    const { id } = req.params;
    const body = (req.body ?? {}) as { reason?: string };
    const reason = (body.reason ?? '').trim();
    if (!reason) {
      res.status(400).json({ error: 'Alasan pembatalan (void) wajib diisi demi jejak audit buyback.' });
      return;
    }

    const row = db
      .prepare('SELECT id, COALESCE(status, \'completed\') as status FROM buybacks WHERE id = ? AND tenantId = ?')
      .get(id, tenantId) as { id: string; status: string } | undefined;
    if (!row) {
      res.status(404).json({ error: 'Data buyback tidak ditemukan di outlet aktif.' });
      return;
    }
    if (row.status === 'void') {
      res.status(409).json({ error: 'Nota buyback ini sudah berstatus VOID.' });
      return;
    }

    const voidedAt = new Date().toISOString();
    db.prepare("UPDATE buybacks SET status = 'void', voidReason = ?, voidedAt = ? WHERE id = ? AND tenantId = ?").run(
      reason,
      voidedAt,
      id,
      tenantId
    );

    const updated = getBuybackById(String(id), tenantId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal melakukan void buyback.' });
  }
});

// ============================================================
// CUSTOMERS CRUD (PAGINATED)
// ============================================================
app.get('/api/customers', (req, res) => {
  try {
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const type = String(req.query.type ?? 'semua');
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryCustomers({ page, pageSize, search, type, sortBy, sortDir }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat pelanggan.' });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const c = req.body as Customer;
    if (!c.name?.trim() || !c.phone?.trim()) {
      res.status(400).json({ error: 'Nama dan nomor HP pelanggan wajib diisi.' });
      return;
    }
    const cleanNik = (c.nik ?? '').trim().replace(/[^0-9]/g, '');
    if (cleanNik.length !== 16) {
      res.status(400).json({
        error: 'NIK / No. KTP wajib diisi tepat 16 digit angka sebagai identitas unik pelanggan.',
      });
      return;
    }
    const existingByNik = db
      .prepare('SELECT id, name, memberCode FROM customers WHERE nik = ? LIMIT 1')
      .get(cleanNik) as { id: string; name: string; memberCode: string } | undefined;
    if (existingByNik) {
      res.status(409).json({
        error: `NIK ${cleanNik} sudah terdaftar atas nama "${existingByNik.name}" (${existingByNik.memberCode}).`,
      });
      return;
    }

    const id = c.id || `CUST-${Date.now()}`;
    const rawCode = (c.memberCode ?? '').trim().toUpperCase();
    const memberCode = !rawCode || rawCode === 'AUTO' ? generateNextMemberCode() : rawCode;
    db.prepare(
      `INSERT INTO customers (id, memberCode, name, phone, nik, npwp, type, address, preferredKadar, goldColor, ringSize, braceletSize, birthDate, notes, createdAt, totalSpent, totalTransactions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      memberCode,
      c.name.trim(),
      c.phone.trim(),
      cleanNik,
      c.npwp ?? null,
      c.type || 'Reguler',
      c.address ?? null,
      c.preferredKadar ?? null,
      c.goldColor ?? null,
      c.ringSize ?? null,
      c.braceletSize ?? null,
      c.birthDate ?? null,
      c.notes ?? null,
      c.createdAt || new Date().toISOString().slice(0, 10),
      c.totalSpent ?? 0,
      c.totalTransactions ?? 0
    );
    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer;
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menambah pelanggan.' });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Pelanggan tidak ditemukan.' });
      return;
    }
    const c = req.body as Partial<Customer>;
    const rawIncomingNik = c.nik !== undefined ? c.nik : existing.nik ?? '';
    const cleanNik = String(rawIncomingNik ?? '').trim().replace(/[^0-9]/g, '');
    if (cleanNik.length !== 16) {
      res.status(400).json({
        error: 'NIK / No. KTP wajib diisi tepat 16 digit angka sebagai identitas unik pelanggan.',
      });
      return;
    }
    const dupNik = db
      .prepare('SELECT id, name, memberCode FROM customers WHERE nik = ? AND id != ? LIMIT 1')
      .get(cleanNik, id) as { id: string; name: string; memberCode: string } | undefined;
    if (dupNik) {
      res.status(409).json({
        error: `NIK ${cleanNik} sudah digunakan oleh pelanggan lain ("${dupNik.name}" - ${dupNik.memberCode}).`,
      });
      return;
    }

    db.prepare(
      `UPDATE customers SET name = ?, phone = ?, nik = ?, npwp = ?, type = ?, address = ?, preferredKadar = ?, goldColor = ?, ringSize = ?, braceletSize = ?, birthDate = ?, notes = ? WHERE id = ?`
    ).run(
      (c.name ?? existing.name).trim(),
      (c.phone ?? existing.phone).trim(),
      cleanNik,
      c.npwp !== undefined ? c.npwp : existing.npwp ?? null,
      c.type ?? existing.type,
      c.address !== undefined ? c.address : existing.address ?? null,
      c.preferredKadar !== undefined ? c.preferredKadar : existing.preferredKadar ?? null,
      c.goldColor !== undefined ? c.goldColor : existing.goldColor ?? null,
      c.ringSize !== undefined ? c.ringSize : existing.ringSize ?? null,
      c.braceletSize !== undefined ? c.braceletSize : existing.braceletSize ?? null,
      c.birthDate !== undefined ? c.birthDate : existing.birthDate ?? null,
      c.notes !== undefined ? c.notes : existing.notes ?? null,
      id
    );
    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui pelanggan.' });
  }
});

app.delete('/api/customers/:id', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const existing = db
      .prepare('SELECT id, name, totalTransactions FROM customers WHERE id = ?')
      .get(req.params.id) as { id: string; name: string; totalTransactions: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Pelanggan tidak ditemukan.' });
      return;
    }

    const txCnt = (
      db
        .prepare('SELECT COUNT(*) as cnt FROM transactions WHERE customerId = ? OR (customerId IS NULL AND LOWER(customerName) = LOWER(?))')
        .get(existing.id, existing.name) as {
        cnt: number;
      }
    ).cnt;
    const bbCnt = (
      db
        .prepare('SELECT COUNT(*) as cnt FROM buybacks WHERE customerId = ? OR (customerId IS NULL AND LOWER(customerName) = LOWER(?))')
        .get(existing.id, existing.name) as {
        cnt: number;
      }
    ).cnt;

    if ((existing.totalTransactions || 0) + txCnt + bbCnt > 0) {
      res.status(409).json({
        error: `Pelanggan "${existing.name}" tidak dapat dihapus karena sudah memiliki riwayat transaksi atau buyback.`,
      });
      return;
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghapus pelanggan.' });
  }
});

// ============================================================
// PROMOS CRUD & WHATSAPP BROADCAST
// ============================================================
function getWhatsappGatewayConfig() {
  const url = (process.env.WHATSAPP_GATEWAY_URL ?? '').trim();
  const token = (process.env.WHATSAPP_API_TOKEN ?? '').trim();
  const provider = (process.env.WHATSAPP_GATEWAY_PROVIDER ?? 'webhook').trim().toLowerCase();
  const providerLabel =
    provider === 'fonnte'
      ? 'Fonnte WhatsApp Gateway'
      : provider === 'wablas'
      ? 'Wablas WhatsApp Gateway'
      : 'WhatsApp Gateway Webhook';

  return {
    gatewayConfigured: Boolean(url),
    url,
    token,
    provider,
    providerLabel,
  };
}

async function sendViaWhatsappGateway(
  cfg: ReturnType<typeof getWhatsappGatewayConfig>,
  waPhone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.url) {
    return { ok: false, error: 'WHATSAPP_GATEWAY_URL belum dikonfigurasi di server.' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let bodyPayload: Record<string, unknown>;

  if (cfg.provider === 'fonnte') {
    if (cfg.token) headers.Authorization = cfg.token;
    bodyPayload = { target: waPhone, message, countryCode: '62' };
  } else if (cfg.provider === 'wablas') {
    if (cfg.token) headers.Authorization = cfg.token;
    bodyPayload = { phone: waPhone, message };
  } else {
    if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
    bodyPayload = { phone: waPhone, message, channel: 'whatsapp' };
  }

  try {
    const response = await fetch(cfg.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });
    const parsed = (await response.json().catch(() => ({}))) as {
      status?: boolean;
      reason?: string;
      message?: string;
      error?: string;
    };
    if (!response.ok || parsed.status === false) {
      return {
        ok: false,
        error: parsed.reason || parsed.error || parsed.message || `Gateway HTTP ${response.status}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal menghubungi WhatsApp Gateway.',
    };
  }
}

const activeGatewayJobs = new Map<string, { cancelled: boolean }>();

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBroadcastSafeLimits() {
  const dailySafeLimit = Math.max(10, Number(process.env.WHATSAPP_DAILY_SAFE_LIMIT) || 50);
  const maxBatchSize = Math.max(10, Number(process.env.WHATSAPP_MAX_BATCH_SIZE) || 50);
  return {
    dailySafeLimit,
    maxBatchSize,
    defaultDelayMinSec: 8,
    defaultDelayMaxSec: 15,
  };
}

app.get('/api/promos/broadcast-config', requireRoles('owner', 'branch_manager'), (req, res) => {
  const { activeTenantId } = getAuth(req);
  const cfg = getWhatsappGatewayConfig();
  const limits = getBroadcastSafeLimits();
  res.json({
    gatewayConfigured: cfg.gatewayConfigured,
    providerLabel: cfg.providerLabel,
    dailySafeLimit: limits.dailySafeLimit,
    dailySentCount: getDailyBroadcastSentCount(activeTenantId),
    maxBatchSize: limits.maxBatchSize,
    defaultDelayMinSec: limits.defaultDelayMinSec,
    defaultDelayMaxSec: limits.defaultDelayMaxSec,
  });
});

app.get('/api/promos/broadcast-audience', requireRoles('owner', 'branch_manager'), (_req, res) => {
  try {
    res.json(getBroadcastAudienceCustomers());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat daftar nomor WA pelanggan.' });
  }
});

app.get('/api/promos/broadcasts', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const items = listPromoBroadcasts(activeTenantId).map(b => ({
      ...b,
      isJobRunning: activeGatewayJobs.has(b.id),
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat riwayat broadcast promo.' });
  }
});

app.get('/api/promos/broadcasts/:broadcastId', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const broadcastId = String(req.params.broadcastId);
    const record = getPromoBroadcastById(broadcastId, activeTenantId);
    if (!record) {
      res.status(404).json({ error: 'Riwayat broadcast tidak ditemukan di outlet aktif.' });
      return;
    }
    res.json({
      ...record,
      isJobRunning: activeGatewayJobs.has(record.id),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat detail broadcast.' });
  }
});

app.post('/api/promos/broadcasts/:broadcastId/cancel', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const broadcastId = String(req.params.broadcastId);
    const job = activeGatewayJobs.get(broadcastId);
    if (job) {
      job.cancelled = true;
    }
    const updated = cancelPendingPromoBroadcastRecipients(broadcastId, activeTenantId);
    if (!updated) {
      res.status(404).json({ error: 'Riwayat broadcast tidak ditemukan di outlet aktif.' });
      return;
    }
    res.json({
      ...updated,
      isJobRunning: false,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghentikan antrean broadcast.' });
  }
});

app.patch(
  '/api/promos/broadcasts/:broadcastId/recipients/:recipientId',
  requireRoles('owner', 'branch_manager'),
  (req, res) => {
    try {
      const { activeTenantId } = getAuth(req);
      const body = (req.body ?? {}) as { status?: BroadcastRecipientStatus; errorMessage?: string };
      const status = body.status;
      if (status !== 'pending' && status !== 'sent' && status !== 'failed') {
        res.status(400).json({ error: 'Status penerima tidak valid.' });
        return;
      }
      const updated = updatePromoBroadcastRecipientStatus({
        broadcastId: String(req.params.broadcastId),
        recipientId: String(req.params.recipientId),
        tenantId: activeTenantId,
        status,
        errorMessage: body.errorMessage,
      });
      if (!updated) {
        res.status(404).json({ error: 'Data penerima broadcast tidak ditemukan.' });
        return;
      }
      res.json({
        ...updated,
        isJobRunning: activeGatewayJobs.has(updated.id),
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui status pengiriman.' });
    }
  }
);

app.post('/api/promos/:id/broadcast', requireRoles('owner', 'branch_manager'), async (req, res) => {
  try {
    const auth = getAuth(req);
    const tenantId = auth.activeTenantId;
    const promoId = String(req.params.id);
    const promoRow = db.prepare('SELECT * FROM promos WHERE id = ? AND tenantId = ?').get(promoId, tenantId) as
      | {
          id: string;
          name: string;
          code: string;
          discountPercent: number;
          startDate: string;
          endDate: string;
          minPurchase: number | null;
        }
      | undefined;

    if (!promoRow) {
      res.status(404).json({ error: 'Promo tidak ditemukan di outlet aktif.' });
      return;
    }

    const body = (req.body ?? {}) as Partial<PromoBroadcastCreatePayload>;
    const audienceMode = body.audienceMode ?? 'all';
    const deliveryMode = body.deliveryMode === 'gateway' ? 'gateway' : 'wa_me';
    const messageTemplate = (body.messageTemplate ?? '').trim();
    if (!messageTemplate) {
      res.status(400).json({ error: 'Isi pesan promo tidak boleh kosong.' });
      return;
    }

    const allAudience = getBroadcastAudienceCustomers();
    let targets = allAudience;
    if (audienceMode === 'segment') {
      if (!body.audienceSegment) {
        res.status(400).json({ error: 'Segmen pelanggan wajib dipilih.' });
        return;
      }
      targets = allAudience.filter(c => c.type === body.audienceSegment);
    } else if (audienceMode === 'selected') {
      const idSet = new Set(Array.isArray(body.customerIds) ? body.customerIds : []);
      if (idSet.size === 0) {
        res.status(400).json({ error: 'Pilih minimal 1 pelanggan tujuan broadcast.' });
        return;
      }
      targets = allAudience.filter(c => idSet.has(c.id));
    }

    if (body.activeBuyersOnly) {
      targets = targets.filter(c => c.hasTransacted);
    }

    if (targets.length === 0) {
      res.status(400).json({
        error: body.activeBuyersOnly
          ? 'Tidak ada pelanggan aktif (pernah transaksi) dengan nomor WhatsApp valid pada target yang dipilih.'
          : 'Tidak ada pelanggan dengan nomor WhatsApp valid pada target yang dipilih.',
      });
      return;
    }

    const limits = getBroadcastSafeLimits();
    const dailySentCount = getDailyBroadcastSentCount(tenantId);

    const gatewayCfg = getWhatsappGatewayConfig();
    if (deliveryMode === 'gateway') {
      if (!gatewayCfg.gatewayConfigured) {
        res.status(400).json({
          error:
            'WhatsApp Gateway server belum dikonfigurasi (WHATSAPP_GATEWAY_URL kosong). Gunakan mode Antrean WA Web (wa.me).',
        });
        return;
      }
      if (targets.length > limits.maxBatchSize) {
        res.status(400).json({
          error: `Mode Aman membatasi maksimal ${limits.maxBatchSize} penerima per batch (target saat ini: ${targets.length}). Bagi pengiriman menjadi beberapa batch kecil.`,
        });
        return;
      }
      if (dailySentCount + targets.length > limits.dailySafeLimit) {
        const remaining = Math.max(0, limits.dailySafeLimit - dailySentCount);
        res.status(400).json({
          error: `Melebihi kuota aman harian (${limits.dailySafeLimit} pesan/hari). Sisa kuota hari ini: ${remaining} pesan.`,
        });
        return;
      }
    }

    const tenantRow = db.prepare('SELECT name FROM tenants WHERE id = ?').get(tenantId) as
      | { name: string }
      | undefined;

    const batch = createPromoBroadcastBatch({
      tenantId,
      promo: {
        id: promoRow.id,
        name: promoRow.name,
        code: promoRow.code,
        discountPercent: promoRow.discountPercent,
        startDate: promoRow.startDate,
        endDate: promoRow.endDate,
        minPurchase: promoRow.minPurchase ?? undefined,
      },
      storeName: tenantRow?.name || 'Toko Mas',
      audienceMode,
      audienceSegment: body.audienceSegment,
      customers: targets,
      deliveryMode,
      messageTemplate,
      createdBy: auth.user.fullName,
    });

    if (deliveryMode === 'gateway' && batch.recipients) {
      const rawMin = Number(body.delayMinSec);
      const rawMax = Number(body.delayMaxSec);
      const delayMinSec = Number.isFinite(rawMin)
        ? Math.max(5, Math.min(30, Math.round(rawMin)))
        : limits.defaultDelayMinSec;
      const delayMaxSec = Number.isFinite(rawMax)
        ? Math.max(delayMinSec, Math.min(60, Math.round(rawMax)))
        : Math.max(delayMinSec, limits.defaultDelayMaxSec);

      const jobState = { cancelled: false };
      activeGatewayJobs.set(batch.id, jobState);

      res.status(201).json({
        ...batch,
        isJobRunning: true,
      });

      const recipientsSnapshot = [...batch.recipients];
      void (async () => {
        try {
          for (let i = 0; i < recipientsSnapshot.length; i += 1) {
            if (jobState.cancelled) break;

            const rec = recipientsSnapshot[i];
            const result = await sendViaWhatsappGateway(gatewayCfg, rec.waPhone, rec.personalizedMessage);
            updatePromoBroadcastRecipientStatus({
              broadcastId: batch.id,
              recipientId: rec.id,
              tenantId,
              status: result.ok ? 'sent' : 'failed',
              errorMessage: result.error,
            });

            if (jobState.cancelled) break;

            if (i < recipientsSnapshot.length - 1) {
              const randomDelaySec =
                delayMinSec + Math.random() * Math.max(0, delayMaxSec - delayMinSec);
              await sleep(Math.round(randomDelaySec * 1000));
            }
          }
          if (jobState.cancelled) {
            cancelPendingPromoBroadcastRecipients(batch.id, tenantId);
          }
        } catch (err) {
          console.error('[Broadcast Gateway Job] Error:', err);
        } finally {
          activeGatewayJobs.delete(batch.id);
        }
      })();
      return;
    }

    res.status(201).json({
      ...batch,
      isJobRunning: false,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal membuat broadcast promo.' });
  }
});

app.get('/api/promos', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const { activeTenantId } = getAuth(req);
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const status = String(req.query.status ?? 'all');
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryPromos({ page, pageSize, search, status, sortBy, sortDir, tenantId: activeTenantId }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat promo.' });
  }
});

app.post('/api/promos', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const tenantId = getAuth(req).activeTenantId;
    const p = req.body as PromoCampaign;
    if (!p.name?.trim() || !p.code?.trim()) {
      res.status(400).json({ error: 'Nama dan kode promo wajib diisi.' });
      return;
    }
    const cleanCode = p.code.trim().toUpperCase();
    const dupCode = db
      .prepare('SELECT id FROM promos WHERE tenantId = ? AND LOWER(code) = LOWER(?)')
      .get(tenantId, cleanCode);
    if (dupCode) {
      res.status(409).json({ error: `Kode promo "${cleanCode}" sudah digunakan di outlet ini.` });
      return;
    }
    const id = p.id || `PRM-${Date.now()}`;
    db.prepare(
      `INSERT INTO promos (id, tenantId, name, code, discountPercent, label, startDate, endDate, productIdsJson, isActive, minPurchase, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      tenantId,
      p.name.trim(),
      cleanCode,
      Number(p.discountPercent) || 0,
      p.label || `Diskon ${p.discountPercent}%`,
      p.startDate,
      p.endDate,
      JSON.stringify(p.productIds ?? []),
      p.isActive ? 1 : 0,
      p.minPurchase ?? null,
      p.description ?? null
    );
    const createdRow = db.prepare('SELECT * FROM promos WHERE id = ?').get(id) as {
      id: string;
      name: string;
      code: string;
      discountPercent: number;
      label: string;
      startDate: string;
      endDate: string;
      productIdsJson: string;
      isActive: number;
      minPurchase: number | null;
      description: string | null;
    };
    res.status(201).json({
      id: createdRow.id,
      name: createdRow.name,
      code: createdRow.code,
      discountPercent: createdRow.discountPercent,
      label: createdRow.label,
      startDate: createdRow.startDate,
      endDate: createdRow.endDate,
      productIds: JSON.parse(createdRow.productIdsJson || '[]'),
      isActive: Boolean(createdRow.isActive),
      minPurchase: createdRow.minPurchase ?? undefined,
      description: createdRow.description ?? undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal membuat promo.' });
  }
});

app.put('/api/promos/:id', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const tenantId = getAuth(req).activeTenantId;
    const { id } = req.params;
    const existingRow = db.prepare('SELECT * FROM promos WHERE id = ? AND tenantId = ?').get(id, tenantId) as
      | {
          id: string;
          name: string;
          code: string;
          discountPercent: number;
          label: string;
          startDate: string;
          endDate: string;
          productIdsJson: string;
          isActive: number;
          minPurchase: number | null;
          description: string | null;
        }
      | undefined;
    if (!existingRow) {
      res.status(404).json({ error: 'Promo tidak ditemukan di outlet aktif.' });
      return;
    }
    const p = req.body as Partial<PromoCampaign>;
    const cleanCode = (p.code ?? existingRow.code).trim().toUpperCase();
    const dupCode = db
      .prepare('SELECT id FROM promos WHERE tenantId = ? AND LOWER(code) = LOWER(?) AND id != ?')
      .get(tenantId, cleanCode, id);
    if (dupCode) {
      res.status(409).json({ error: `Kode promo "${cleanCode}" sudah digunakan di outlet ini.` });
      return;
    }
    const existingProductIds = JSON.parse(existingRow.productIdsJson || '[]') as number[];
    db.prepare(
      `UPDATE promos SET name = ?, code = ?, discountPercent = ?, label = ?, startDate = ?, endDate = ?, productIdsJson = ?, isActive = ?, minPurchase = ?, description = ? WHERE id = ? AND tenantId = ?`
    ).run(
      (p.name ?? existingRow.name).trim(),
      cleanCode,
      p.discountPercent !== undefined ? Number(p.discountPercent) : existingRow.discountPercent,
      p.label ?? existingRow.label,
      p.startDate ?? existingRow.startDate,
      p.endDate ?? existingRow.endDate,
      JSON.stringify(p.productIds ?? existingProductIds),
      (p.isActive !== undefined ? p.isActive : Boolean(existingRow.isActive)) ? 1 : 0,
      p.minPurchase !== undefined ? p.minPurchase : existingRow.minPurchase ?? null,
      p.description !== undefined ? p.description : existingRow.description ?? null,
      id,
      tenantId
    );
    const updatedRow = db.prepare('SELECT * FROM promos WHERE id = ?').get(id) as typeof existingRow;
    res.json({
      id: updatedRow.id,
      name: updatedRow.name,
      code: updatedRow.code,
      discountPercent: updatedRow.discountPercent,
      label: updatedRow.label,
      startDate: updatedRow.startDate,
      endDate: updatedRow.endDate,
      productIds: JSON.parse(updatedRow.productIdsJson || '[]'),
      isActive: Boolean(updatedRow.isActive),
      minPurchase: updatedRow.minPurchase ?? undefined,
      description: updatedRow.description ?? undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui promo.' });
  }
});

app.patch('/api/promos/:id/toggle', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const tenantId = getAuth(req).activeTenantId;
    const { id } = req.params;
    const existing = db
      .prepare('SELECT isActive FROM promos WHERE id = ? AND tenantId = ?')
      .get(id, tenantId) as { isActive: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Promo tidak ditemukan di outlet aktif.' });
      return;
    }
    const nextState = existing.isActive ? 0 : 1;
    db.prepare('UPDATE promos SET isActive = ? WHERE id = ? AND tenantId = ?').run(nextState, id, tenantId);
    const updatedRow = db.prepare('SELECT * FROM promos WHERE id = ?').get(id) as {
      id: string;
      name: string;
      code: string;
      discountPercent: number;
      label: string;
      startDate: string;
      endDate: string;
      productIdsJson: string;
      isActive: number;
      minPurchase: number | null;
      description: string | null;
    };
    res.json({
      id: updatedRow.id,
      name: updatedRow.name,
      code: updatedRow.code,
      discountPercent: updatedRow.discountPercent,
      label: updatedRow.label,
      startDate: updatedRow.startDate,
      endDate: updatedRow.endDate,
      productIds: JSON.parse(updatedRow.productIdsJson || '[]'),
      isActive: Boolean(updatedRow.isActive),
      minPurchase: updatedRow.minPurchase ?? undefined,
      description: updatedRow.description ?? undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal mengubah status promo.' });
  }
});

app.delete('/api/promos/:id', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const tenantId = getAuth(req).activeTenantId;
    const result = db.prepare('DELETE FROM promos WHERE id = ? AND tenantId = ?').run(req.params.id, tenantId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Promo tidak ditemukan di outlet aktif.' });
      return;
    }
    res.json({ deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghapus promo.' });
  }
});

// ============================================================
// TENANTS CRUD
// ============================================================
app.get('/api/tenants', (req, res) => {
  const auth = getAuth(req);
  res.json(getAccessibleTenantsForUser(auth.user));
});

app.post('/api/tenants', requireRoles('owner'), (req, res) => {
  try {
    const auth = getAuth(req);
    const t = req.body as Tenant;
    if (!t.name?.trim() || !t.code?.trim() || !t.branchName?.trim()) {
      res.status(400).json({ error: 'Nama toko, kode outlet, dan nama cabang wajib diisi.' });
      return;
    }
    const cleanCode = t.code.trim().toUpperCase();
    const dupCode = db
      .prepare('SELECT id, name FROM tenants WHERE LOWER(code) = LOWER(?)')
      .get(cleanCode) as { id: string; name: string } | undefined;
    if (dupCode) {
      res.status(409).json({ error: `Kode outlet "${cleanCode}" sudah terdaftar pada "${dupCode.name}".` });
      return;
    }

    const newTenant: Tenant = {
      ...t,
      name: t.name.trim(),
      code: cleanCode,
      branchName: t.branchName.trim(),
      productCount: 0,
    };
    const insertTx = db.transaction(() => {
      db.prepare(
        `INSERT INTO tenants (id, name, code, branchName, address, city, plan, cashierCount, productCount, phone, email, slug, logoInitial, databaseSchema, status)
         VALUES (@id, @name, @code, @branchName, @address, @city, @plan, @cashierCount, @productCount, @phone, @email, @slug, @logoInitial, @databaseSchema, @status)`
      ).run(newTenant);
      updateSessionTenant(auth.token, newTenant.id);
    });
    insertTx();
    res.status(201).json(newTenant);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal mendaftarkan outlet.' });
  }
});

app.patch('/api/tenants/active', (req, res) => {
  try {
    const auth = getAuth(req);
    const tenantId = String((req.body as { tenantId?: string }).tenantId ?? '').trim();
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId wajib diisi.' });
      return;
    }
    const exists = db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId) as { id: string } | undefined;
    if (!exists) {
      res.status(404).json({ error: 'Outlet tidak ditemukan.' });
      return;
    }
    if (!isTenantAllowedForUser(auth.user, tenantId)) {
      res.status(403).json({ error: 'Akun Anda tidak memiliki hak akses ke outlet tersebut.' });
      return;
    }
    updateSessionTenant(auth.token, tenantId);
    res.json({ activeTenantId: tenantId });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memilih outlet aktif.' });
  }
});

// ============================================================
// STORE SETTINGS & SHIFT CLOSING (TAHAP 3)
// ============================================================
app.get('/api/settings', (req, res) => {
  try {
    const auth = getAuth(req);
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(auth.activeTenantId) as Tenant | undefined;
    res.json({
      tenant: tenant ?? null,
      storeSettings: getStoreSettings(auth.activeTenantId),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat pengaturan toko.' });
  }
});

app.put('/api/settings', requireRoles('owner', 'branch_manager'), (req, res) => {
  try {
    const auth = getAuth(req);
    const result = updateStoreSettings(
      auth.activeTenantId,
      req.body as StoreSettingsUpdatePayload,
      auth.user.fullName
    );
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan toko.';
    res.status(400).json({ error: msg });
  }
});

app.get('/api/shifts/summary', (req, res) => {
  try {
    const auth = getAuth(req);
    const date = String(req.query.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const requestedScope = req.query.scope === 'my' ? 'my' : 'outlet';
    const effectiveScope: 'my' | 'outlet' = auth.user.role === 'cashier' ? 'my' : requestedScope;

    res.json(
      getLiveShiftSummary({
        tenantId: auth.activeTenantId,
        date,
        scope: effectiveScope,
        cashierName: auth.user.fullName,
        cashierId: auth.user.id,
      })
    );
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat ringkasan shift kasir.' });
  }
});

app.get('/api/shifts', (req, res) => {
  try {
    const auth = getAuth(req);
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const varianceFilter = String(req.query.varianceFilter ?? 'all');
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';

    res.json(
      queryShiftClosings({
        tenantId: auth.activeTenantId,
        page,
        pageSize,
        search,
        varianceFilter,
        cashierId: auth.user.role === 'cashier' ? auth.user.id : undefined,
        sortBy,
        sortDir,
      })
    );
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat riwayat tutup kasir.' });
  }
});

app.post('/api/shifts/close', (req, res) => {
  try {
    const auth = getAuth(req);
    const created = createShiftClosing({
      tenantId: auth.activeTenantId,
      user: auth.user,
      payload: req.body as ShiftClosingCreatePayload,
    });
    res.status(201).json(created);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan laporan tutup kasir.';
    res.status(400).json({ error: msg });
  }
});

// Unknown /api routes return JSON 404
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
