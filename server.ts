import express from 'express';
import path from 'path';
import type {
  BuybackCreatePayload,
  BuybackItem,
  Customer,
  PaymentDetails,
  Product,
  PromoCampaign,
  Tenant,
  Transaction,
  TransactionItem,
} from './src/types/index.ts';
import {
  db,
  generateNextMemberCode,
  getActivePromos,
  getActiveTenantId,
  getAllCategories,
  getAllTenants,
  getBuybackById,
  getCategoriesWithStats,
  getDashboardSummary,
  getTransactionById,
  lookupProductByCode,
  queryBuybacks,
  queryCustomers,
  queryProducts,
  queryPromos,
  queryTransactions,
  seedInitialDataIfEmpty,
} from './server/db.ts';

// Seed SQLite on startup if empty
seedInitialDataIfEmpty();

const app = express();
app.use(express.json({ limit: '15mb' }));

// ============================================================
// BOOTSTRAP (LIGHTWEIGHT SHELL DATA ONLY)
// ============================================================
app.get('/api/bootstrap', (_req, res) => {
  try {
    res.json({
      categories: getAllCategories(),
      tenants: getAllTenants(),
      activeTenantId: getActiveTenantId(),
      activePromos: getActivePromos(),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat data awal dari SQLite.' });
  }
});

// ============================================================
// DASHBOARD SUMMARY (SERVER-SIDE AGGREGATION)
// ============================================================
app.get('/api/dashboard/summary', (req, res) => {
  try {
    const period = req.query.period === 'BULAN' ? 'BULAN' : 'HARI';
    res.json(getDashboardSummary(period));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat ringkasan dasbor.' });
  }
});

// ============================================================
// PRODUCTS CRUD & PAGINATION & BARCODE LOOKUP
// ============================================================
app.get('/api/products/lookup', (req, res) => {
  try {
    const code = String(req.query.code ?? '');
    const product = lookupProductByCode(code);
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
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const category = String(req.query.category ?? 'Semua');
    const promoOnly = req.query.promoOnly === 'true' || req.query.promoOnly === '1';
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryProducts({ page, pageSize, search, category, promoOnly, sortBy, sortDir }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat produk.' });
  }
});

app.post('/api/products', (req, res) => {
  try {
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

    const existingSku = db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?)').get(sku);
    if (existingSku) {
      res.status(409).json({ error: `SKU "${sku}" sudah digunakan produk lain.` });
      return;
    }

    const createTx = db.transaction(() => {
      db.prepare('INSERT OR IGNORE INTO categories (name, sortOrder) VALUES (?, 99)').run(category);
      const info = db
        .prepare('INSERT INTO products (sku, name, berat, harga, stok, category, image) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(sku, name, berat, harga, stok, category, image);
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

app.put('/api/products/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'ID produk tidak valid.' });
      return;
    }
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
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
      .prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?) AND id != ?')
      .get(sku, id);
    if (duplicateSku) {
      res.status(409).json({ error: `SKU "${sku}" sudah digunakan produk lain.` });
      return;
    }

    const updateTx = db.transaction(() => {
      db.prepare('INSERT OR IGNORE INTO categories (name, sortOrder) VALUES (?, 99)').run(category);
      db.prepare(
        'UPDATE products SET sku = ?, name = ?, berat = ?, harga = ?, stok = ?, category = ?, image = ? WHERE id = ?'
      ).run(sku, name, berat, harga, stok, category, image, id);
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

app.delete('/api/products/:id', (req, res) => {
  try {
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
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
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
    if (req.query.withStats === 'true' || req.query.withStats === '1') {
      res.json(getCategoriesWithStats());
      return;
    }
    res.json(getAllCategories());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat kategori.' });
  }
});

app.post('/api/categories', (req, res) => {
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

app.put('/api/categories/:oldName', (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.oldName).trim();
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

app.delete('/api/categories/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name).trim();
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
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const method = String(req.query.method ?? 'semua');
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryTransactions({ page, pageSize, search, method, sortBy, sortDir }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat transaksi.' });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
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
    const cashier = (body.cashier ?? '').trim() || 'Administrator Kasir (Shift 1)';
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
          .prepare('SELECT id, sku, name, berat, harga, stok, category, image FROM products WHERE id = ?')
          .get(reqItem.id) as Product | undefined;

        if (!prod) {
          throw new Error(`Produk ID ${reqItem.id} tidak ditemukan di database.`);
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

        db.prepare('UPDATE products SET stok = stok - ? WHERE id = ?').run(qty, prod.id);
      }

      const tax = Math.round(subtotal * 0.11);
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
        `INSERT INTO transactions (id, invoiceNo, dateTime, dateStr, timeStr, cashier, customerId, customerName, totalQty, totalBerat, subtotal, tax, grandTotal, paymentMethod, paymentDetailsJson)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        newTx.id,
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
    res.status(201).json(result);
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

app.post('/api/transactions/:id/void', (req, res) => {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as { reason?: string; restoreStock?: boolean };
    const reason = (body.reason ?? '').trim();
    if (!reason) {
      res.status(400).json({ error: 'Alasan pembatalan (void) wajib diisi demi jejak audit POS.' });
      return;
    }
    const restoreStock = body.restoreStock !== false;

    const existing = db
      .prepare("SELECT id, COALESCE(status, 'completed') AS status FROM transactions WHERE id = ?")
      .get(id) as { id: string; status: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }
    if (existing.status === 'void') {
      res.status(409).json({ error: 'Transaksi ini sudah berstatus VOID.' });
      return;
    }

    const voidedAt = new Date().toISOString();
    const voidTx = db.transaction(() => {
      db.prepare("UPDATE transactions SET status = 'void', voidReason = ?, voidedAt = ? WHERE id = ?").run(
        reason,
        voidedAt,
        id
      );

      if (restoreStock) {
        const items = db
          .prepare('SELECT productId, qty FROM transaction_items WHERE transactionId = ?')
          .all(id) as Array<{ productId: number; qty: number }>;
        const restoreStmt = db.prepare('UPDATE products SET stok = stok + ? WHERE id = ?');
        for (const it of items) {
          restoreStmt.run(it.qty, it.productId);
        }
      }
    });

    voidTx();
    const updated = getTransactionById(id);
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
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const method = String(req.query.method ?? 'all');
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryBuybacks({ page, pageSize, search, method, sortBy, sortDir }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat data buyback.' });
  }
});

app.get('/api/buybacks/:id', (req, res) => {
  try {
    const item = getBuybackById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Data buyback tidak ditemukan.' });
      return;
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat detail buyback.' });
  }
});

app.post('/api/buybacks', (req, res) => {
  try {
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
          id, invoiceNo, date, timeStr, branchName, cashierName,
          customerId, customerName, customerPhone, customerNik, customerNpwp, customerAddress,
          sourceNote, itemType, kadar, beratKotor, potonganBatu, beratBersih,
          hargaPerGram, biayaLebur, kondisi, totalKotor, potonganBiaya, pph22,
          totalBayar, paymentMethod, bankName, accountNo, accountHolder,
          catatan, fotoKtp, fotoEmas, ttdNasabah, ttdPetugas, isAgreedLegal, itemsJson
        ) VALUES (
          @id, @invoiceNo, @date, @timeStr, @branchName, @cashierName,
          @customerId, @customerName, @customerPhone, @customerNik, @customerNpwp, @customerAddress,
          @sourceNote, @itemType, @kadar, @beratKotor, @potonganBatu, @beratBersih,
          @hargaPerGram, @biayaLebur, @kondisi, @totalKotor, @potonganBiaya, @pph22,
          @totalBayar, @paymentMethod, @bankName, @accountNo, @accountHolder,
          @catatan, @fotoKtp, @fotoEmas, @ttdNasabah, @ttdPetugas, @isAgreedLegal, @itemsJson
        )`
      ).run({
        id,
        invoiceNo,
        date: dateStr,
        timeStr: body.timeStr ?? null,
        branchName: body.branchName ?? null,
        cashierName: body.cashierName ?? null,
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
    const created = getBuybackById(id);
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

app.post('/api/buybacks/:id/void', (req, res) => {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as { reason?: string };
    const reason = (body.reason ?? '').trim();
    if (!reason) {
      res.status(400).json({ error: 'Alasan pembatalan (void) wajib diisi demi jejak audit buyback.' });
      return;
    }

    const existing = getBuybackById(id);
    if (!existing) {
      res.status(404).json({ error: 'Data buyback tidak ditemukan.' });
      return;
    }
    if (existing.status === 'void') {
      res.status(409).json({ error: 'Nota buyback ini sudah berstatus VOID.' });
      return;
    }

    const voidedAt = new Date().toISOString();
    db.prepare("UPDATE buybacks SET status = 'void', voidReason = ?, voidedAt = ? WHERE id = ?").run(
      reason,
      voidedAt,
      id
    );

    const updated = getBuybackById(id);
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

app.delete('/api/customers/:id', (req, res) => {
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
// PROMOS CRUD (PAGINATED)
// ============================================================
app.get('/api/promos', (req, res) => {
  try {
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 10) || 10;
    const search = String(req.query.search ?? '');
    const status = String(req.query.status ?? 'all');
    const sortBy = String(req.query.sortBy ?? 'newest');
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    res.json(queryPromos({ page, pageSize, search, status, sortBy, sortDir }));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat promo.' });
  }
});

app.post('/api/promos', (req, res) => {
  try {
    const p = req.body as PromoCampaign;
    if (!p.name?.trim() || !p.code?.trim()) {
      res.status(400).json({ error: 'Nama dan kode promo wajib diisi.' });
      return;
    }
    const id = p.id || `PRM-${Date.now()}`;
    db.prepare(
      `INSERT INTO promos (id, name, code, discountPercent, label, startDate, endDate, productIdsJson, isActive, minPurchase, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      p.name.trim(),
      p.code.trim().toUpperCase(),
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

app.put('/api/promos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existingRow = db.prepare('SELECT * FROM promos WHERE id = ?').get(id) as
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
      res.status(404).json({ error: 'Promo tidak ditemukan.' });
      return;
    }
    const p = req.body as Partial<PromoCampaign>;
    const existingProductIds = JSON.parse(existingRow.productIdsJson || '[]') as number[];
    db.prepare(
      `UPDATE promos SET name = ?, code = ?, discountPercent = ?, label = ?, startDate = ?, endDate = ?, productIdsJson = ?, isActive = ?, minPurchase = ?, description = ? WHERE id = ?`
    ).run(
      (p.name ?? existingRow.name).trim(),
      (p.code ?? existingRow.code).trim().toUpperCase(),
      p.discountPercent !== undefined ? Number(p.discountPercent) : existingRow.discountPercent,
      p.label ?? existingRow.label,
      p.startDate ?? existingRow.startDate,
      p.endDate ?? existingRow.endDate,
      JSON.stringify(p.productIds ?? existingProductIds),
      (p.isActive !== undefined ? p.isActive : Boolean(existingRow.isActive)) ? 1 : 0,
      p.minPurchase !== undefined ? p.minPurchase : existingRow.minPurchase ?? null,
      p.description !== undefined ? p.description : existingRow.description ?? null,
      id
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

app.patch('/api/promos/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT isActive FROM promos WHERE id = ?').get(id) as { isActive: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Promo tidak ditemukan.' });
      return;
    }
    const nextState = existing.isActive ? 0 : 1;
    db.prepare('UPDATE promos SET isActive = ? WHERE id = ?').run(nextState, id);
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

app.delete('/api/promos/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM promos WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Promo tidak ditemukan.' });
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
app.get('/api/tenants', (_req, res) => {
  res.json(getAllTenants());
});

app.post('/api/tenants', (req, res) => {
  try {
    const t = req.body as Tenant;
    const insertTx = db.transaction(() => {
      db.prepare(
        `INSERT INTO tenants (id, name, code, branchName, address, city, plan, cashierCount, productCount, phone, email, slug, logoInitial, databaseSchema, status)
         VALUES (@id, @name, @code, @branchName, @address, @city, @plan, @cashierCount, @productCount, @phone, @email, @slug, @logoInitial, @databaseSchema, @status)`
      ).run(t);
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('activeTenantId', t.id);
    });
    insertTx();
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal mendaftarkan outlet.' });
  }
});

app.patch('/api/tenants/active', (req, res) => {
  try {
    const tenantId = String((req.body as { tenantId?: string }).tenantId ?? '');
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId wajib diisi.' });
      return;
    }
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('activeTenantId', tenantId);
    res.json({ activeTenantId: tenantId });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memilih outlet aktif.' });
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
