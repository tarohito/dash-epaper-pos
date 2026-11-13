import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type {
  BuybackGoldItem,
  BuybackItem,
  BuybacksPageResponse,
  CategoriesWithStatsResponse,
  CategoryStatsItem,
  Customer,
  CustomersPageResponse,
  CustomerWithStats,
  DashboardSummaryResponse,
  PaginatedResponse,
  PaymentDetails,
  Product,
  ProductsPageResponse,
  PromoCampaign,
  PromosPageResponse,
  Tenant,
  Transaction,
  TransactionItem,
  TransactionsPageResponse,
} from '../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'epaper-pos.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    branchName TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    plan TEXT NOT NULL,
    cashierCount INTEGER NOT NULL DEFAULT 1,
    productCount INTEGER NOT NULL DEFAULT 0,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    slug TEXT NOT NULL,
    logoInitial TEXT NOT NULL,
    databaseSchema TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Aktif'
  );

  CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY,
    sortOrder INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    berat REAL NOT NULL,
    harga INTEGER NOT NULL,
    stok INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    image TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    invoiceNo TEXT UNIQUE NOT NULL,
    dateTime TEXT NOT NULL,
    dateStr TEXT NOT NULL,
    timeStr TEXT NOT NULL,
    cashier TEXT NOT NULL,
    customerName TEXT NOT NULL,
    totalQty INTEGER NOT NULL,
    totalBerat REAL NOT NULL,
    subtotal INTEGER NOT NULL,
    tax INTEGER NOT NULL,
    grandTotal INTEGER NOT NULL,
    paymentMethod TEXT NOT NULL,
    paymentDetailsJson TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transactionId TEXT NOT NULL,
    productId INTEGER NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    berat REAL NOT NULL,
    harga INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    image TEXT,
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS buybacks (
    id TEXT PRIMARY KEY,
    invoiceNo TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    timeStr TEXT,
    branchName TEXT,
    cashierName TEXT,
    customerName TEXT NOT NULL,
    customerPhone TEXT NOT NULL,
    customerNik TEXT,
    customerNpwp TEXT,
    customerAddress TEXT,
    sourceNote TEXT NOT NULL DEFAULT '-',
    itemType TEXT NOT NULL,
    kadar TEXT NOT NULL,
    beratKotor REAL NOT NULL,
    potonganBatu REAL NOT NULL DEFAULT 0,
    beratBersih REAL NOT NULL,
    hargaPerGram INTEGER NOT NULL,
    biayaLebur INTEGER NOT NULL DEFAULT 0,
    kondisi TEXT NOT NULL,
    totalKotor INTEGER,
    potonganBiaya INTEGER,
    pph22 INTEGER,
    totalBayar INTEGER NOT NULL,
    paymentMethod TEXT NOT NULL,
    bankName TEXT,
    accountNo TEXT,
    accountHolder TEXT,
    catatan TEXT,
    fotoKtp TEXT,
    fotoEmas TEXT,
    ttdNasabah TEXT,
    ttdPetugas TEXT,
    isAgreedLegal INTEGER NOT NULL DEFAULT 1,
    itemsJson TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    memberCode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    nik TEXT,
    type TEXT NOT NULL,
    address TEXT,
    preferredKadar TEXT,
    ringSize TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    totalSpent INTEGER NOT NULL DEFAULT 0,
    totalTransactions INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS promos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    discountPercent REAL NOT NULL,
    label TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    productIdsJson TEXT NOT NULL DEFAULT '[]',
    isActive INTEGER NOT NULL DEFAULT 1,
    minPurchase INTEGER,
    description TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_sku_lower ON products(LOWER(sku));
  CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(LOWER(name));
  CREATE INDEX IF NOT EXISTS idx_transactions_datetime ON transactions(dateTime DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_method ON transactions(paymentMethod);
  CREATE INDEX IF NOT EXISTS idx_transactions_customer_lower ON transactions(LOWER(customerName));
  CREATE INDEX IF NOT EXISTS idx_tx_items_txid ON transaction_items(transactionId);
  CREATE INDEX IF NOT EXISTS idx_buybacks_method ON buybacks(paymentMethod);
  CREATE INDEX IF NOT EXISTS idx_buybacks_customer_lower ON buybacks(LOWER(customerName));
  CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
  CREATE INDEX IF NOT EXISTS idx_customers_name_lower ON customers(LOWER(name));
  CREATE INDEX IF NOT EXISTS idx_promos_active ON promos(isActive);
`);

function ensureColumn(table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('transactions', 'status', "TEXT NOT NULL DEFAULT 'completed'");
ensureColumn('transactions', 'voidReason', 'TEXT');
ensureColumn('transactions', 'voidedAt', 'TEXT');
ensureColumn('transactions', 'customerId', 'TEXT');

ensureColumn('buybacks', 'status', "TEXT NOT NULL DEFAULT 'completed'");
ensureColumn('buybacks', 'voidReason', 'TEXT');
ensureColumn('buybacks', 'voidedAt', 'TEXT');
ensureColumn('buybacks', 'customerId', 'TEXT');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customerId);
  CREATE INDEX IF NOT EXISTS idx_buybacks_customer_id ON buybacks(customerId);
`);

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function seedInitialDataIfEmpty(): void {
  const seededV3Row = db.prepare('SELECT value FROM settings WHERE key = ?').get('seeded_v3') as
    | { value: string }
    | undefined;
  if (seededV3Row?.value === '1') {
    return;
  }

  const seedTx = db.transaction(() => {
    // 1. Categories (Standar Etalase Toko Emas Indonesia)
    const categories = ['Cincin', 'Gelang', 'Kalung', 'Anting', 'Liontin', 'Logam Mulia', 'Bros'];
    const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, sortOrder) VALUES (?, ?)');
    categories.forEach((cat, idx) => insertCat.run(cat, idx + 1));

    // 2. Products (36 Produk Asli Etalase Toko Emas & Logam Mulia)
    const IMG = {
      ring1: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80',
      ring2: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=300&q=80',
      bracelet1: 'https://images.unsplash.com/photo-1611591475711-d0b16f39e38d?auto=format&fit=crop&w=300&q=80',
      bracelet2: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=300&q=80',
      necklace1: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80',
      pendant1: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=300&q=80',
      earring1: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=300&q=80',
      brooch1: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&q=80',
      bullion1: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=300&q=80',
    };

    const realisticProducts: Array<Omit<Product, 'isPromo' | 'promoDiscountPercent' | 'promoLabel'>> = [
      { id: 1, sku: '16-164', name: 'Cincin Emas Polos 18K', berat: 1.57, harga: 2670000, stok: 12, category: 'Cincin', image: IMG.ring1 },
      { id: 2, sku: '13-092', name: 'Gelang Rantai 24K', berat: 9.48, harga: 17800000, stok: 5, category: 'Gelang', image: IMG.bracelet1 },
      { id: 3, sku: '12-001', name: 'Kalung Liontin Berlian', berat: 3.20, harga: 8500000, stok: 3, category: 'Kalung', image: IMG.necklace1 },
      { id: 4, sku: '15-220', name: 'Anting Mutiara Air Tawar', berat: 2.10, harga: 4200000, stok: 8, category: 'Anting', image: IMG.earring1 },
      { id: 5, sku: '16-180', name: 'Cincin Kawin Berlian', berat: 4.50, harga: 12500000, stok: 2, category: 'Cincin', image: IMG.ring2 },
      { id: 6, sku: '17-005', name: 'Liontin Salib Emas Putih', berat: 1.80, harga: 3100000, stok: 15, category: 'Liontin', image: IMG.pendant1 },
      { id: 7, sku: '11-304', name: 'Bros Kebaya Emas Kuning', berat: 5.40, harga: 6800000, stok: 4, category: 'Bros', image: IMG.brooch1 },
      { id: 8, sku: '18-022', name: 'Gelang Keroncong 22K', berat: 15.00, harga: 28500000, stok: 2, category: 'Gelang', image: IMG.bracelet2 },

      // Koleksi Cincin Toko Emas Umum
      { id: 9, sku: 'CN-22K-014', name: 'Cincin Belah Rotan Tua 22K', berat: 2.50, harga: 5750000, stok: 14, category: 'Cincin', image: IMG.ring1 },
      { id: 10, sku: 'CN-16K-021', name: 'Cincin Fashion Mata Zircon 16K', berat: 1.25, harga: 2150000, stok: 18, category: 'Cincin', image: IMG.ring2 },
      { id: 11, sku: 'CN-09K-008', name: 'Cincin Emas Muda Solitaire 9K', berat: 1.10, harga: 1180000, stok: 22, category: 'Cincin', image: IMG.ring2 },
      { id: 12, sku: 'CN-18K-045', name: 'Cincin Stempel Pria Rhodium 18K', berat: 6.20, harga: 11950000, stok: 3, category: 'Cincin', image: IMG.ring1 },
      { id: 13, sku: 'CN-18K-099', name: 'Cincin Nikah Sepasang Ukir 18K', berat: 7.50, harga: 14600000, stok: 0, category: 'Cincin', image: IMG.ring2 },
      { id: 14, sku: 'CN-17K-033', name: 'Cincin List Ring Mata Halus 17K', berat: 1.85, harga: 3480000, stok: 9, category: 'Cincin', image: IMG.ring1 },

      // Koleksi Gelang
      { id: 15, sku: 'GL-17K-011', name: 'Gelang Bangle Oval Polos 17K', berat: 5.85, harga: 10950000, stok: 7, category: 'Gelang', image: IMG.bracelet2 },
      { id: 16, sku: 'GL-22K-034', name: 'Gelang Sisik Naga Tua 22K', berat: 12.40, harga: 28520000, stok: 2, category: 'Gelang', image: IMG.bracelet1 },
      { id: 17, sku: 'GL-16K-019', name: 'Gelang Rantai Holo Variasi 16K', berat: 3.40, harga: 5820000, stok: 11, category: 'Gelang', image: IMG.bracelet1 },
      { id: 18, sku: 'GL-09K-007', name: 'Gelang Serut Bola Mrica 9K', berat: 2.30, harga: 2450000, stok: 16, category: 'Gelang', image: IMG.bracelet1 },
      { id: 19, sku: 'GL-16K-052', name: 'Gelang Kaki Anak Lonceng 16K', berat: 2.05, harga: 3520000, stok: 4, category: 'Gelang', image: IMG.bracelet2 },

      // Koleksi Kalung
      { id: 20, sku: 'KL-17K-018', name: 'Kalung Rantai Nori Halus 17K', berat: 3.60, harga: 6780000, stok: 13, category: 'Kalung', image: IMG.necklace1 },
      { id: 21, sku: 'KL-22K-027', name: 'Kalung Santa Biji Lada 22K', berat: 8.75, harga: 20125000, stok: 3, category: 'Kalung', image: IMG.necklace1 },
      { id: 22, sku: 'KL-18K-041', name: 'Kalung Choker Milano Italy 18K', berat: 4.90, harga: 9450000, stok: 6, category: 'Kalung', image: IMG.pendant1 },
      { id: 23, sku: 'KL-16K-063', name: 'Kalung Cassano Rose Gold 16K', berat: 2.80, harga: 4820000, stok: 9, category: 'Kalung', image: IMG.necklace1 },
      { id: 24, sku: 'KL-24K-088', name: 'Kalung Emas Tua Ukir Nama 24K', berat: 16.50, harga: 41250000, stok: 0, category: 'Kalung', image: IMG.pendant1 },

      // Koleksi Anting & Giwang
      { id: 25, sku: 'AN-17K-003', name: 'Giwang Tusuk Mata Satu 17K', berat: 0.85, harga: 1620000, stok: 24, category: 'Anting', image: IMG.earring1 },
      { id: 26, sku: 'AN-16K-017', name: 'Anting Jepit Bulat Polos 16K', berat: 1.45, harga: 2490000, stok: 15, category: 'Anting', image: IMG.earring1 },
      { id: 27, sku: 'AN-18K-029', name: 'Anting Gantung Klip Huggies 18K', berat: 2.35, harga: 4550000, stok: 4, category: 'Anting', image: IMG.brooch1 },
      { id: 28, sku: 'AN-22K-009', name: 'Giwang Anak Toge Tua 22K', berat: 0.65, harga: 1540000, stok: 19, category: 'Anting', image: IMG.earring1 },

      // Koleksi Liontin
      { id: 29, sku: 'LN-16K-012', name: 'Liontin Huruf Inisial Permata 16K', berat: 0.95, harga: 1650000, stok: 14, category: 'Liontin', image: IMG.pendant1 },
      { id: 30, sku: 'LN-22K-031', name: 'Liontin Koin Ratu Elizabeth 22K', berat: 3.10, harga: 7130000, stok: 5, category: 'Liontin', image: IMG.pendant1 },
      { id: 31, sku: 'LN-18K-044', name: 'Liontin Hati Rose Gold 18K', berat: 1.60, harga: 3120000, stok: 8, category: 'Liontin', image: IMG.necklace1 },

      // Koleksi Logam Mulia Batangan
      { id: 32, sku: 'LM-ANT-001', name: 'Logam Mulia Antam CertiEye 1 Gr (24K)', berat: 1.00, harga: 2540000, stok: 20, category: 'Logam Mulia', image: IMG.bullion1 },
      { id: 33, sku: 'LM-ANT-005', name: 'Logam Mulia Antam CertiEye 5 Gr (24K)', berat: 5.00, harga: 12470000, stok: 7, category: 'Logam Mulia', image: IMG.bullion1 },
      { id: 34, sku: 'LM-ANT-010', name: 'Logam Mulia Antam CertiEye 10 Gr (24K)', berat: 10.00, harga: 24890000, stok: 3, category: 'Logam Mulia', image: IMG.bullion1 },
      { id: 35, sku: 'LM-UBS-002', name: 'Emas Batangan UBS Gold 2 Gr (24K)', berat: 2.00, harga: 4980000, stok: 10, category: 'Logam Mulia', image: IMG.bullion1 },

      // Koleksi Bros
      { id: 36, sku: 'BR-16K-015', name: 'Bros Jilbab Pita Permata 16K', berat: 2.25, harga: 3890000, stok: 9, category: 'Bros', image: IMG.brooch1 },
    ];

    const insertProd = db.prepare(`
      INSERT OR IGNORE INTO products (id, sku, name, berat, harga, stok, category, image)
      VALUES (@id, @sku, @name, @berat, @harga, @stok, @category, @image)
    `);
    for (const p of realisticProducts) {
      insertProd.run(p);
    }

    // 3. Tenants
    const initialTenants: Tenant[] = [
      {
        id: 'tenant-tms-001',
        name: 'Toko Mas Sejahtera',
        code: 'TMS-01',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        address: 'Jl. Pemuda No. 108, Mall Grand City Lt. 1 No. 22',
        city: 'Jakarta Pusat',
        plan: 'Enterprise Multi-Tenant',
        cashierCount: 4,
        productCount: 36,
        phone: '0812-8899-7766',
        email: 'admin@tokomassejahtera.com',
        slug: 'sejahtera.epaper.id',
        logoInitial: 'TS',
        databaseSchema: 'tenant_db_sejahtera_01',
        status: 'Aktif',
      },
      {
        id: 'tenant-tmj-002',
        name: 'Toko Mas Mulia Jaya',
        code: 'TMJ-02',
        branchName: 'Cabang Paris Van Java (PVJ)',
        address: 'Jl. Sukajadi No. 131, Resort Level B-15',
        city: 'Bandung',
        plan: 'Pro Multi-Outlet',
        cashierCount: 2,
        productCount: 24,
        phone: '0813-2233-4455',
        email: 'kontak@muliajaya-gold.id',
        slug: 'muliajaya.epaper.id',
        logoInitial: 'MJ',
        databaseSchema: 'tenant_db_muliajaya_02',
        status: 'Aktif',
      },
      {
        id: 'tenant-lke-003',
        name: 'CV Logam Kencana Emas',
        code: 'LKE-03',
        branchName: 'Cabang Tunjungan Plaza 3',
        address: 'Jl. Basuki Rahmat No. 8-12, TP 3 Lt. 2',
        city: 'Surabaya',
        plan: 'Enterprise Multi-Tenant',
        cashierCount: 5,
        productCount: 42,
        phone: '0819-7788-9900',
        email: 'management@logamkencana.co.id',
        slug: 'logamkencana.epaper.id',
        logoInitial: 'LK',
        databaseSchema: 'tenant_db_logamkencana_03',
        status: 'Aktif',
      },
    ];
    const insertTenant = db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, code, branchName, address, city, plan, cashierCount, productCount, phone, email, slug, logoInitial, databaseSchema, status)
      VALUES (@id, @name, @code, @branchName, @address, @city, @plan, @cashierCount, @productCount, @phone, @email, @slug, @logoInitial, @databaseSchema, @status)
    `);
    for (const t of initialTenants) {
      insertTenant.run(t);
    }
    db.prepare('UPDATE tenants SET productCount = 36 WHERE id = ? AND productCount < 36').run('tenant-tms-001');
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('activeTenantId', 'tenant-tms-001');

    // 4. Customers (16 Pelanggan Aktif: Reguler, VIP, Mitra / Toko)
    const realisticCustomers: Customer[] = [
      {
        id: 'CUST-001',
        memberCode: 'MBR-001',
        name: 'Hj. Siti Rahmah',
        phone: '081234567890',
        nik: '3201124508780001',
        type: 'VIP',
        address: 'Jl. Riau No. 45, Bandung',
        preferredKadar: '22K (91.6%)',
        ringSize: '14',
        notes: 'Pelanggan langganan arisan emas & buyback kalung rantai.',
        createdAt: '2026-01-15',
        totalSpent: 34500000,
        totalTransactions: 6,
      },
      {
        id: 'CUST-002',
        memberCode: 'MBR-002',
        name: 'Bpk. Hendra Wijaya',
        phone: '081298765432',
        nik: '3171051906800002',
        type: 'VIP',
        address: 'Apartemen Sudirman Park Tower B-12, Jakarta',
        preferredKadar: '18K (75.0%)',
        ringSize: '18',
        notes: 'Kolektor cincin berlian pria & mutiara air tawar.',
        createdAt: '2026-03-20',
        totalSpent: 48900000,
        totalTransactions: 4,
      },
      {
        id: 'CUST-003',
        memberCode: 'MBR-003',
        name: 'Ibu Ratna Dewi',
        phone: '085612349876',
        nik: '3273016405850003',
        type: 'Reguler',
        address: 'Komplek Permata Buah Batu Blok C-8, Bandung',
        preferredKadar: '18K (75.0%)',
        ringSize: '12',
        notes: 'Suka model cincin emas polos dan gelang simpel.',
        createdAt: '2026-05-10',
        totalSpent: 12400000,
        totalTransactions: 3,
      },
      {
        id: 'CUST-004',
        memberCode: 'MBR-004',
        name: 'Budi Santoso',
        phone: '081987654321',
        nik: '3204101202880004',
        type: 'Reguler',
        address: 'Jl. Cihanjuang No. 102, Cimahi',
        preferredKadar: '16K (70.0%)',
        ringSize: '16',
        notes: 'Transaksi buyback cincin kawin pria.',
        createdAt: '2026-07-02',
        totalSpent: 8600000,
        totalTransactions: 2,
      },
      {
        id: 'CUST-005',
        memberCode: 'MBR-005',
        name: 'Toko Emas Mulia Abadi (Bpk. Chandra)',
        phone: '081322334455',
        nik: '3578010504750005',
        type: 'Mitra / Toko',
        address: 'Pasar Atom Tahap 2 Lt. Dasar No. 18, Surabaya',
        preferredKadar: '24K (99.9%)',
        ringSize: '-',
        notes: 'Mitra grosir & lebur emas batangan murni.',
        createdAt: '2026-02-11',
        totalSpent: 185000000,
        totalTransactions: 12,
      },
      {
        id: 'CUST-006',
        memberCode: 'MBR-006',
        name: 'Ibu Wulandari Kartika',
        phone: '081277665544',
        nik: '3174095403830006',
        type: 'VIP',
        address: 'Jl. Kemang Timur No. 19, Jakarta Selatan',
        preferredKadar: '22K (91.6%)',
        ringSize: '13',
        notes: 'Kolektor rutin Logam Mulia Antam 5 gr setiap awal bulan.',
        createdAt: '2026-04-05',
        totalSpent: 28500000,
        totalTransactions: 5,
      },
      {
        id: 'CUST-007',
        memberCode: 'MBR-007',
        name: 'Sdr. Bagus Pratama',
        phone: '085788991122',
        nik: '3173041109940007',
        type: 'Reguler',
        address: 'Jl. Tanjung Duren Barat IV No. 8, Jakarta Barat',
        preferredKadar: '18K (75.0%)',
        ringSize: '17',
        notes: 'Pembeli cincin pria rhodium & tukar tambah cincin lama.',
        createdAt: '2026-06-18',
        totalSpent: 5400000,
        totalTransactions: 2,
      },
      {
        id: 'CUST-008',
        memberCode: 'MBR-008',
        name: 'Ny. Melati Kusuma',
        phone: '081399887766',
        nik: '3171034807790008',
        type: 'VIP',
        address: 'Menteng Residence Blok A-3, Jakarta Pusat',
        preferredKadar: '24K (99.9%)',
        ringSize: '15',
        notes: 'Pelanggan prioritas emas 24K & LM Antam CertiEye pecahan besar.',
        createdAt: '2026-01-28',
        totalSpent: 64000000,
        totalTransactions: 7,
      },
      {
        id: 'CUST-009',
        memberCode: 'MBR-009',
        name: 'Ibu Nurhayati',
        phone: '082144556677',
        nik: '3275026108860009',
        type: 'Reguler',
        address: 'Perum Harapan Indah Blok EF-12, Bekasi',
        preferredKadar: '16K (70.0%)',
        ringSize: '14',
        notes: 'Suka model cincin mata zircon & anting jepit harian.',
        createdAt: '2026-08-12',
        totalSpent: 4200000,
        totalTransactions: 2,
      },
      {
        id: 'CUST-010',
        memberCode: 'MBR-010',
        name: 'dr. Karina Maharani',
        phone: '081122334455',
        nik: '3174045211900010',
        type: 'VIP',
        address: 'Jl. Senopati Raya No. 64, Kebayoran Baru, Jakarta Selatan',
        preferredKadar: '18K (75.0%)',
        ringSize: '11',
        notes: 'Preferensi emas putih / rose gold 18K model minimalis Italia.',
        createdAt: '2026-03-09',
        totalSpent: 31200000,
        totalTransactions: 4,
      },
      {
        id: 'CUST-011',
        memberCode: 'MBR-011',
        name: 'Bpk. Agus Salim',
        phone: '081566778899',
        nik: '3671011505810011',
        type: 'Reguler',
        address: 'Jl. Daan Mogot KM 12 No. 55, Tangerang',
        preferredKadar: '24K (99.9%)',
        ringSize: '19',
        notes: 'Tabungan rutin emas fisik UBS & Antam 1-2 gram.',
        createdAt: '2026-07-24',
        totalSpent: 9800000,
        totalTransactions: 3,
      },
      {
        id: 'CUST-012',
        memberCode: 'MBR-012',
        name: 'Siti Aminah',
        phone: '085233445566',
        nik: '3175064304960012',
        type: 'Reguler',
        address: 'Jl. Rawamangun Muka No. 21, Jakarta Timur',
        preferredKadar: '9K (37.5%)',
        ringSize: '12',
        notes: 'Sering beli perhiasan emas muda kadar 9K untuk kado.',
        createdAt: '2026-09-03',
        totalSpent: 2850000,
        totalTransactions: 2,
      },
      {
        id: 'CUST-013',
        memberCode: 'MBR-013',
        name: 'CV Berkah Logam Nusantara',
        phone: '081788990011',
        nik: '3172021801740013',
        type: 'Mitra / Toko',
        address: 'Jl. Cikini Raya No. 88, Jakarta Pusat',
        preferredKadar: '24K (99.9%)',
        ringSize: '-',
        notes: 'Mitra reseller logam mulia & lebur emas batangan.',
        createdAt: '2026-02-25',
        totalSpent: 142000000,
        totalTransactions: 9,
      },
      {
        id: 'CUST-014',
        memberCode: 'MBR-014',
        name: 'Ibu Yuniarti Susilo',
        phone: '081855443322',
        nik: '3276035906840014',
        type: 'Reguler',
        address: 'Pesona Khayangan Blok D-10, Depok',
        preferredKadar: '17K (75.0%)',
        ringSize: '13',
        notes: 'Langganan kalung rantai nori & giwang tusuk.',
        createdAt: '2026-06-29',
        totalSpent: 7400000,
        totalTransactions: 2,
      },
      {
        id: 'CUST-015',
        memberCode: 'MBR-015',
        name: 'Rizky Ramadhan & Nabila',
        phone: '081266554433',
        nik: '3174012208930015',
        type: 'VIP',
        address: 'Jl. Tebet Barat Dalam IX No. 14, Jakarta Selatan',
        preferredKadar: '18K (75.0%)',
        ringSize: '16',
        notes: 'Pasangan pengantin — paket seserahan cincin kawin berlian & gelang.',
        createdAt: '2026-10-14',
        totalSpent: 16500000,
        totalTransactions: 2,
      },
      {
        id: 'CUST-016',
        memberCode: 'MBR-016',
        name: 'Hj. Fatimah Az-Zahra',
        phone: '081344556611',
        nik: '3175016702760016',
        type: 'VIP',
        address: 'Jl. Matraman Raya No. 112, Jakarta Timur',
        preferredKadar: '22K (91.6%)',
        ringSize: '15',
        notes: 'Kolektor gelang sisik naga 22K & bros kebaya emas kuning.',
        createdAt: '2026-01-19',
        totalSpent: 52000000,
        totalTransactions: 5,
      },
    ];
    const insertCust = db.prepare(`
      INSERT OR IGNORE INTO customers (id, memberCode, name, phone, nik, type, address, preferredKadar, ringSize, notes, createdAt, totalSpent, totalTransactions)
      VALUES (@id, @memberCode, @name, @phone, @nik, @type, @address, @preferredKadar, @ringSize, @notes, @createdAt, @totalSpent, @totalTransactions)
    `);
    for (const c of realisticCustomers) {
      insertCust.run(c);
    }

    // 5. Promos
    const initialPromos: PromoCampaign[] = [
      {
        id: 'PRM-001',
        name: 'Promo Kilau Emas 18K',
        code: 'KILAU10',
        discountPercent: 10,
        label: 'Diskon 10%',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        productIds: [1, 14],
        isActive: true,
        minPurchase: 2000000,
        description: 'Potongan harga spesial 10% untuk cincin emas polos 18K dan list ring 17K.',
      },
      {
        id: 'PRM-002',
        name: 'Diskon Eksklusif Berlian',
        code: 'DIAMOND15',
        discountPercent: 15,
        label: 'Diskon 15%',
        startDate: '2026-11-05',
        endDate: '2026-11-25',
        productIds: [3, 5],
        isActive: true,
        minPurchase: 5000000,
        description: 'Diskon perhiasan bertatahkan berlian murni bersertifikat GIA.',
      },
      {
        id: 'PRM-003',
        name: 'Festival Gelang Rantai & Bangle',
        code: 'GELANG5',
        discountPercent: 5,
        label: 'Diskon 5%',
        startDate: '2026-11-10',
        endDate: '2026-11-20',
        productIds: [2, 15, 17],
        isActive: true,
        minPurchase: 5000000,
        description: 'Potongan langsung pembelian koleksi gelang rantai & bangle pilihan.',
      },
      {
        id: 'PRM-004',
        name: 'Promo Mutiara & Giwang Elegan',
        code: 'PEARL8',
        discountPercent: 8,
        label: 'Diskon 8%',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        productIds: [4, 25, 26],
        isActive: true,
        description: 'Sentuhan kemewahan mutiara air tawar dan giwang harian harga spesial.',
      },
      {
        id: 'PRM-005',
        name: 'Spesial Bros Kebaya Pesta',
        code: 'BROS12',
        discountPercent: 12,
        label: 'Diskon 12%',
        startDate: '2026-11-08',
        endDate: '2026-11-22',
        productIds: [7, 36],
        isActive: true,
        description: 'Aksesoris bros kebaya dan jilbab emas untuk acara pesta & pernikahan.',
      },
      {
        id: 'PRM-006',
        name: 'Promo Payday Logam Mulia Oktober',
        code: 'ANTAMOCT',
        discountPercent: 3,
        label: 'Diskon 3%',
        startDate: '2026-10-25',
        endDate: '2026-10-31',
        productIds: [32, 33],
        isActive: false,
        minPurchase: 2500000,
        description: 'Program potongan ongkos cetak LM Antam akhir bulan Oktober (periode selesai).',
      },
    ];
    const insertPromo = db.prepare(`
      INSERT OR IGNORE INTO promos (id, name, code, discountPercent, label, startDate, endDate, productIdsJson, isActive, minPurchase, description)
      VALUES (@id, @name, @code, @discountPercent, @label, @startDate, @endDate, @productIdsJson, @isActive, @minPurchase, @description)
    `);
    for (const pr of initialPromos) {
      insertPromo.run({
        id: pr.id,
        name: pr.name,
        code: pr.code,
        discountPercent: pr.discountPercent,
        label: pr.label,
        startDate: pr.startDate,
        endDate: pr.endDate,
        productIdsJson: JSON.stringify(pr.productIds),
        isActive: pr.isActive ? 1 : 0,
        minPurchase: pr.minPurchase ?? null,
        description: pr.description ?? null,
      });
    }

    // 6. Transactions (16 Transaksi Riil Toko Emas dengan jam & tanggal bervariasi di Nov 2026)
    const prodMap = new Map(realisticProducts.map(p => [p.id, p]));
    const buildTx = (cfg: {
      id: string;
      invoiceNo: string;
      isoDate: string;
      cashier: string;
      customerName: string;
      lines: Array<{ productId: number; qty: number }>;
      paymentMethod: 'cash' | 'debit' | 'transfer' | 'qris';
      paymentDetails: PaymentDetails;
    }): Transaction => {
      const d = new Date(cfg.isoDate);
      const items: TransactionItem[] = cfg.lines.map(l => {
        const p = prodMap.get(l.productId)!;
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          berat: p.berat,
          harga: p.harga,
          qty: l.qty,
          subtotal: p.harga * l.qty,
          image: p.image,
        };
      });
      const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
      const tax = Math.round(subtotal * 0.11);
      const grandTotal = subtotal + tax;
      const totalQty = items.reduce((s, it) => s + it.qty, 0);
      const totalBerat = parseFloat(items.reduce((s, it) => s + it.berat * it.qty, 0).toFixed(2));
      const paymentDetails: PaymentDetails =
        cfg.paymentMethod === 'cash' && cfg.paymentDetails.cashReceived !== undefined
          ? {
              ...cfg.paymentDetails,
              cashChange: Math.max(0, cfg.paymentDetails.cashReceived - grandTotal),
            }
          : cfg.paymentDetails;

      return {
        id: cfg.id,
        invoiceNo: cfg.invoiceNo,
        dateTime: d.toISOString(),
        dateStr: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        timeStr: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        cashier: cfg.cashier,
        customerName: cfg.customerName,
        items,
        totalQty,
        totalBerat,
        subtotal,
        tax,
        grandTotal,
        paymentMethod: cfg.paymentMethod,
        paymentDetails,
      };
    };

    const realisticTransactions: Transaction[] = [
      buildTx({
        id: 'TRX-20261101-001',
        invoiceNo: 'TRX-20261101-001',
        isoDate: '2026-11-01T10:15:00',
        cashier: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'Ibu Wulandari Kartika',
        lines: [
          { productId: 33, qty: 1 }, // LM Antam 5 Gr
          { productId: 25, qty: 1 }, // Giwang Tusuk Mata Satu 17K
        ],
        paymentMethod: 'transfer',
        paymentDetails: { transferBank: 'BCA', transferAccountNo: '5400192831', transferRef: 'TRF-261101-8812' },
      }),
      buildTx({
        id: 'TRX-20261102-001',
        invoiceNo: 'TRX-20261102-001',
        isoDate: '2026-11-02T14:20:00',
        cashier: 'Dewi Lestari (Kasir 2)',
        customerName: 'Siti Aminah',
        lines: [
          { productId: 11, qty: 1 }, // Cincin Emas Muda Solitaire 9K
          { productId: 18, qty: 1 }, // Gelang Serut Bola Mrica 9K
        ],
        paymentMethod: 'qris',
        paymentDetails: { qrisNmid: 'ID102003928192', qrisRrn: 'RRN2611024410' },
      }),
      buildTx({
        id: 'TRX-20261103-001',
        invoiceNo: 'TRX-20261103-001',
        isoDate: '2026-11-03T11:40:00',
        cashier: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'Hj. Siti Rahmah',
        lines: [
          { productId: 9, qty: 1 }, // Cincin Belah Rotan Tua 22K
          { productId: 30, qty: 1 }, // Liontin Koin Ratu Elizabeth 22K
        ],
        paymentMethod: 'debit',
        paymentDetails: { debitBank: 'Mandiri', debitCardLast4: '4419', debitApprovalCode: 'AUTH-774102' },
      }),
      buildTx({
        id: 'TRX-20261105-001',
        invoiceNo: 'TRX-20261105-001',
        isoDate: '2026-11-05T16:05:00',
        cashier: 'Dewi Lestari (Kasir 2)',
        customerName: 'dr. Karina Maharani',
        lines: [
          { productId: 22, qty: 1 }, // Kalung Choker Milano Italy 18K
          { productId: 31, qty: 1 }, // Liontin Hati Rose Gold 18K
        ],
        paymentMethod: 'debit',
        paymentDetails: { debitBank: 'BCA', debitCardLast4: '9032', debitApprovalCode: 'AUTH-612094' },
      }),
      buildTx({
        id: 'TRX-20261106-001',
        invoiceNo: 'TRX-20261106-001',
        isoDate: '2026-11-06T13:30:00',
        cashier: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'Ibu Nurhayati',
        lines: [
          { productId: 10, qty: 2 }, // Cincin Fashion Mata Zircon 16K
          { productId: 26, qty: 1 }, // Anting Jepit Bulat Polos 16K
        ],
        paymentMethod: 'cash',
        paymentDetails: { cashReceived: 7600000 },
      }),
      buildTx({
        id: 'TRX-20261107-001',
        invoiceNo: 'TRX-20261107-001',
        isoDate: '2026-11-07T19:15:00',
        cashier: 'Andi Pratama (Supervisor)',
        customerName: 'Rizky Ramadhan & Nabila',
        lines: [
          { productId: 5, qty: 1 }, // Cincin Kawin Berlian
          { productId: 15, qty: 1 }, // Gelang Bangle Oval Polos 17K
        ],
        paymentMethod: 'transfer',
        paymentDetails: { transferBank: 'BCA', transferAccountNo: '8812093412', transferRef: 'TRF-261107-5501' },
      }),
      buildTx({
        id: 'TRX-20261108-001',
        invoiceNo: 'TRX-20261108-001',
        isoDate: '2026-11-08T15:45:00',
        cashier: 'Dewi Lestari (Kasir 2)',
        customerName: 'Bpk. Agus Salim',
        lines: [
          { productId: 32, qty: 2 }, // LM Antam 1 Gr
          { productId: 35, qty: 1 }, // UBS Gold 2 Gr
        ],
        paymentMethod: 'transfer',
        paymentDetails: { transferBank: 'BRI', transferAccountNo: '002301928371', transferRef: 'TRF-261108-1924' },
      }),
      buildTx({
        id: 'TRX-20261109-001',
        invoiceNo: 'TRX-20261109-001',
        isoDate: '2026-11-09T11:10:00',
        cashier: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'Ibu Yuniarti Susilo',
        lines: [
          { productId: 20, qty: 1 }, // Kalung Rantai Nori Halus 17K
          { productId: 29, qty: 1 }, // Liontin Huruf Inisial Permata 16K
        ],
        paymentMethod: 'qris',
        paymentDetails: { qrisNmid: 'ID102003928192', qrisRrn: 'RRN2611098821' },
      }),
      buildTx({
        id: 'TRX-20261110-001',
        invoiceNo: 'TRX-20261110-001',
        isoDate: '2026-11-10T17:25:00',
        cashier: 'Andi Pratama (Supervisor)',
        customerName: 'Ny. Melati Kusuma',
        lines: [{ productId: 34, qty: 1 }], // LM Antam 10 Gr
        paymentMethod: 'transfer',
        paymentDetails: { transferBank: 'Mandiri', transferAccountNo: '122009812731', transferRef: 'TRF-261110-3302' },
      }),
      buildTx({
        id: 'TRX-20261110-002',
        invoiceNo: 'TRX-20261110-002',
        isoDate: '2026-11-10T19:50:00',
        cashier: 'Dewi Lestari (Kasir 2)',
        customerName: 'Sdr. Bagus Pratama',
        lines: [{ productId: 12, qty: 1 }], // Cincin Stempel Pria Rhodium 18K
        paymentMethod: 'debit',
        paymentDetails: { debitBank: 'BCA', debitCardLast4: '3107', debitApprovalCode: 'AUTH-904512' },
      }),
      buildTx({
        id: 'TRX-20261111-001',
        invoiceNo: 'TRX-20261111-001',
        isoDate: '2026-11-11T10:35:00',
        cashier: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'Hj. Fatimah Az-Zahra',
        lines: [
          { productId: 16, qty: 1 }, // Gelang Sisik Naga Tua 22K
          { productId: 36, qty: 1 }, // Bros Jilbab Pita Permata 16K
        ],
        paymentMethod: 'transfer',
        paymentDetails: { transferBank: 'BCA', transferAccountNo: '7740192884', transferRef: 'TRF-261111-7019' },
      }),
      buildTx({
        id: 'TRX-20261111-002',
        invoiceNo: 'TRX-20261111-002',
        isoDate: '2026-11-11T14:55:00',
        cashier: 'Dewi Lestari (Kasir 2)',
        customerName: 'Ibu Ratna Dewi',
        lines: [
          { productId: 17, qty: 1 }, // Gelang Rantai Holo Variasi 16K
          { productId: 14, qty: 1 }, // Cincin List Ring Mata Halus 17K
        ],
        paymentMethod: 'qris',
        paymentDetails: { qrisNmid: 'ID102003928192', qrisRrn: 'RRN2611116194' },
      }),
      buildTx({
        id: 'TRX-20261112-002',
        invoiceNo: 'TRX-20261112-002',
        isoDate: '2026-11-12T09:45:00',
        cashier: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'Bpk. Hendra Wijaya',
        lines: [
          { productId: 4, qty: 1 }, // Anting Mutiara Air Tawar
          { productId: 27, qty: 1 }, // Anting Gantung Klip Huggies 18K
        ],
        paymentMethod: 'debit',
        paymentDetails: { debitBank: 'BCA', debitCardLast4: '8821', debitApprovalCode: 'AUTH-592814' },
      }),
      buildTx({
        id: 'TRX-20261112-003',
        invoiceNo: 'TRX-20261112-003',
        isoDate: '2026-11-12T12:15:00',
        cashier: 'Andi Pratama (Supervisor)',
        customerName: 'CV Berkah Logam Nusantara',
        lines: [
          { productId: 32, qty: 3 }, // LM Antam 1 Gr x3
          { productId: 33, qty: 1 }, // LM Antam 5 Gr x1
        ],
        paymentMethod: 'transfer',
        paymentDetails: { transferBank: 'Mandiri', transferAccountNo: '103009482711', transferRef: 'TRF-261112-2041' },
      }),
      buildTx({
        id: 'TRX-20261112-004',
        invoiceNo: 'TRX-20261112-004',
        isoDate: '2026-11-12T15:20:00',
        cashier: 'Dewi Lestari (Kasir 2)',
        customerName: 'Ibu Wulandari Kartika',
        lines: [
          { productId: 23, qty: 1 }, // Kalung Cassano Rose Gold 16K
          { productId: 28, qty: 1 }, // Giwang Anak Toge Tua 22K
        ],
        paymentMethod: 'cash',
        paymentDetails: { cashReceived: 7100000 },
      }),
      buildTx({
        id: 'TRX-20261112-005',
        invoiceNo: 'TRX-20261112-005',
        isoDate: '2026-11-12T18:40:00',
        cashier: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'dr. Karina Maharani',
        lines: [{ productId: 3, qty: 1 }], // Kalung Liontin Berlian
        paymentMethod: 'debit',
        paymentDetails: { debitBank: 'BCA', debitCardLast4: '9032', debitApprovalCode: 'AUTH-849103' },
      }),
    ];

    const insertTx = db.prepare(`
      INSERT OR IGNORE INTO transactions (id, invoiceNo, dateTime, dateStr, timeStr, cashier, customerName, totalQty, totalBerat, subtotal, tax, grandTotal, paymentMethod, paymentDetailsJson)
      VALUES (@id, @invoiceNo, @dateTime, @dateStr, @timeStr, @cashier, @customerName, @totalQty, @totalBerat, @subtotal, @tax, @grandTotal, @paymentMethod, @paymentDetailsJson)
    `);
    const updateTxTime = db.prepare(`
      UPDATE transactions SET dateTime = @dateTime, dateStr = @dateStr, timeStr = @timeStr WHERE id = @id
    `);
    const insertTxItem = db.prepare(`
      INSERT INTO transaction_items (transactionId, productId, sku, name, berat, harga, qty, subtotal, image)
      VALUES (@transactionId, @productId, @sku, @name, @berat, @harga, @qty, @subtotal, @image)
    `);

    for (const tx of realisticTransactions) {
      const res = insertTx.run({
        id: tx.id,
        invoiceNo: tx.invoiceNo,
        dateTime: tx.dateTime,
        dateStr: tx.dateStr,
        timeStr: tx.timeStr,
        cashier: tx.cashier,
        customerName: tx.customerName,
        totalQty: tx.totalQty,
        totalBerat: tx.totalBerat,
        subtotal: tx.subtotal,
        tax: tx.tax,
        grandTotal: tx.grandTotal,
        paymentMethod: tx.paymentMethod,
        paymentDetailsJson: JSON.stringify(tx.paymentDetails),
      });
      if (res.changes > 0) {
        for (const item of tx.items) {
          insertTxItem.run({
            transactionId: tx.id,
            productId: item.id,
            sku: item.sku,
            name: item.name,
            berat: item.berat,
            harga: item.harga,
            qty: item.qty,
            subtotal: item.subtotal,
            image: item.image ?? null,
          });
        }
      } else {
        updateTxTime.run({ id: tx.id, dateTime: tx.dateTime, dateStr: tx.dateStr, timeStr: tx.timeStr });
      }
    }

    // 7. Buybacks (10 Nota Buyback Emas Perhiasan & Logam Mulia)
    const realisticBuybacks: BuybackItem[] = [
      {
        id: 'bb-1',
        invoiceNo: 'BB-20261111-001',
        date: '11 Nov 2026, 10:20',
        timeStr: '10:20',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Andi Pratama (Penaksir)',
        customerName: 'Hj. Siti Rahmah',
        customerPhone: '081234567890',
        customerNik: '3201124508780001',
        customerAddress: 'Jl. Riau No. 45, Bandung',
        sourceNote: 'TRX-20261015-089',
        itemType: 'Kalung Emas Rantai',
        kadar: '22K (91.6%)',
        beratKotor: 10.20,
        potonganBatu: 0,
        beratBersih: 10.20,
        hargaPerGram: 1120000,
        biayaLebur: 50000,
        kondisi: 'Baik / Utuh',
        totalKotor: 11424000,
        potonganBiaya: 50000,
        pph22: 0,
        totalBayar: 11374000,
        paymentMethod: 'transfer',
        bankName: 'BCA',
        accountNo: '8820192811',
        accountHolder: 'Hj. Siti Rahmah',
        isAgreedLegal: true,
      },
      {
        id: 'bb-2',
        invoiceNo: 'BB-20261111-002',
        date: '11 Nov 2026, 14:45',
        timeStr: '14:45',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'Budi Santoso',
        customerPhone: '081987654321',
        customerNik: '3204101202880004',
        customerAddress: 'Jl. Cihanjuang No. 102, Cimahi',
        sourceNote: '-',
        itemType: 'Cincin Kawin Pria',
        kadar: '18K (75.0%)',
        beratKotor: 4.80,
        potonganBatu: 0.30,
        beratBersih: 4.50,
        hargaPerGram: 930000,
        biayaLebur: 80000,
        kondisi: 'Patah / Cacat',
        totalKotor: 4185000,
        potonganBiaya: 80000,
        pph22: 0,
        totalBayar: 4105000,
        paymentMethod: 'cash',
        isAgreedLegal: true,
      },
      {
        id: 'bb-3',
        invoiceNo: 'BB-20261104-001',
        date: '04 Nov 2026, 11:15',
        timeStr: '11:15',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Andi Pratama (Penaksir)',
        customerName: 'Ny. Melati Kusuma',
        customerPhone: '081399887766',
        customerNik: '3171034807790008',
        customerAddress: 'Menteng Residence Blok A-3, Jakarta Pusat',
        sourceNote: 'TRX-20260612-034',
        itemType: 'Logam Mulia Antam 5 Gr',
        kadar: '24K (99.9%)',
        beratKotor: 5.00,
        potonganBatu: 0,
        beratBersih: 5.00,
        hargaPerGram: 2335000,
        biayaLebur: 0,
        kondisi: 'Baik / Utuh',
        totalKotor: 11675000,
        potonganBiaya: 0,
        pph22: 0,
        totalBayar: 11675000,
        paymentMethod: 'transfer',
        bankName: 'Mandiri',
        accountNo: '122009812731',
        accountHolder: 'Melati Kusuma',
        catatan: 'Segel CertiEye utuh, verifikasi aplikasi lolos.',
        isAgreedLegal: true,
      },
      {
        id: 'bb-4',
        invoiceNo: 'BB-20261106-001',
        date: '06 Nov 2026, 13:50',
        timeStr: '13:50',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Dewi Lestari (Kasir 2)',
        customerName: 'Ibu Nurhayati',
        customerPhone: '082144556677',
        customerNik: '3275026108860009',
        customerAddress: 'Perum Harapan Indah Blok EF-12, Bekasi',
        sourceNote: 'TRX-20260820-011',
        itemType: 'Gelang Rantai Holo',
        kadar: '16K (70.0%)',
        beratKotor: 3.60,
        potonganBatu: 0.15,
        beratBersih: 3.45,
        hargaPerGram: 1510000,
        biayaLebur: 25000,
        kondisi: 'Baik / Utuh',
        totalKotor: 5209500,
        potonganBiaya: 25000,
        pph22: 0,
        totalBayar: 5184500,
        paymentMethod: 'cash',
        catatan: 'Tukar tambah dengan cincin mata zircon.',
        isAgreedLegal: true,
      },
      {
        id: 'bb-5',
        invoiceNo: 'BB-20261107-001',
        date: '07 Nov 2026, 16:30',
        timeStr: '16:30',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'Sdr. Bagus Pratama',
        customerPhone: '085788991122',
        customerNik: '3173041109940007',
        customerAddress: 'Jl. Tanjung Duren Barat IV No. 8, Jakarta Barat',
        sourceNote: '-',
        itemType: 'Cincin Emas Polos',
        kadar: '18K (75.0%)',
        beratKotor: 2.80,
        potonganBatu: 0,
        beratBersih: 2.80,
        hargaPerGram: 1650000,
        biayaLebur: 20000,
        kondisi: 'Baik / Utuh',
        totalKotor: 4620000,
        potonganBiaya: 20000,
        pph22: 0,
        totalBayar: 4600000,
        paymentMethod: 'cash',
        isAgreedLegal: true,
      },
      {
        id: 'bb-6',
        invoiceNo: 'BB-20261108-001',
        date: '08 Nov 2026, 12:10',
        timeStr: '12:10',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Andi Pratama (Penaksir)',
        customerName: 'Hj. Fatimah Az-Zahra',
        customerPhone: '081344556611',
        customerNik: '3175016702760016',
        customerAddress: 'Jl. Matraman Raya No. 112, Jakarta Timur',
        sourceNote: '-',
        itemType: 'Gelang Keroncong Tua',
        kadar: '22K (91.6%)',
        beratKotor: 9.50,
        potonganBatu: 0,
        beratBersih: 9.50,
        hargaPerGram: 2060000,
        biayaLebur: 100000,
        kondisi: 'Tanpa Sertifikat / Nota',
        totalKotor: 19570000,
        potonganBiaya: 100000,
        pph22: 0,
        totalBayar: 19470000,
        paymentMethod: 'transfer',
        bankName: 'BCA',
        accountNo: '7740192884',
        accountHolder: 'Hj. Fatimah Az-Zahra',
        catatan: 'Sudah dicek kadar menggunakan mesin XRF 91.6%.',
        isAgreedLegal: true,
      },
      {
        id: 'bb-7',
        invoiceNo: 'BB-20261109-001',
        date: '09 Nov 2026, 15:05',
        timeStr: '15:05',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Dewi Lestari (Kasir 2)',
        customerName: 'Siti Aminah',
        customerPhone: '085233445566',
        customerNik: '3175064304960012',
        customerAddress: 'Jl. Rawamangun Muka No. 21, Jakarta Timur',
        sourceNote: 'TRX-20260918-042',
        itemType: 'Anting Jepit & Liontin',
        kadar: '9K (37.5%)',
        beratKotor: 2.40,
        potonganBatu: 0.20,
        beratBersih: 2.20,
        hargaPerGram: 810000,
        biayaLebur: 45000,
        kondisi: 'Patah / Cacat',
        totalKotor: 1782000,
        potonganBiaya: 45000,
        pph22: 0,
        totalBayar: 1737000,
        paymentMethod: 'cash',
        isAgreedLegal: true,
      },
      {
        id: 'bb-8',
        invoiceNo: 'BB-20261110-001',
        date: '10 Nov 2026, 11:40',
        timeStr: '11:40',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Siti Nurhaliza (Kasir 1)',
        customerName: 'Ibu Yuniarti Susilo',
        customerPhone: '081855443322',
        customerNik: '3276035906840014',
        customerAddress: 'Pesona Khayangan Blok D-10, Depok',
        sourceNote: 'TRX-20261109-001',
        itemType: 'Kalung Rantai Nori',
        kadar: '17K (75.0%)',
        beratKotor: 4.10,
        potonganBatu: 0,
        beratBersih: 4.10,
        hargaPerGram: 1620000,
        biayaLebur: 0,
        kondisi: 'Baik / Utuh',
        totalKotor: 6642000,
        potonganBiaya: 0,
        pph22: 0,
        totalBayar: 6642000,
        paymentMethod: 'cash',
        isAgreedLegal: true,
      },
      {
        id: 'bb-9',
        invoiceNo: 'BB-20261112-001',
        date: '12 Nov 2026, 10:50',
        timeStr: '10:50',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Andi Pratama (Penaksir)',
        customerName: 'CV Berkah Logam Nusantara',
        customerPhone: '081788990011',
        customerNik: '3172021801740013',
        customerAddress: 'Jl. Cikini Raya No. 88, Jakarta Pusat',
        sourceNote: '-',
        itemType: 'Logam Mulia UBS 10 Gr',
        kadar: '24K (99.9%)',
        beratKotor: 10.00,
        potonganBatu: 0,
        beratBersih: 10.00,
        hargaPerGram: 2310000,
        biayaLebur: 50000,
        kondisi: 'Kemasan Rusak',
        totalKotor: 23100000,
        potonganBiaya: 50000,
        pph22: 0,
        totalBayar: 23050000,
        paymentMethod: 'transfer',
        bankName: 'BCA',
        accountNo: '4901283910',
        accountHolder: 'CV Berkah Logam Nusantara',
        catatan: 'Kemas plastik UBS terlipat, kadar 999.9% valid.',
        isAgreedLegal: true,
      },
      {
        id: 'bb-10',
        invoiceNo: 'BB-20261112-002',
        date: '12 Nov 2026, 14:15',
        timeStr: '14:15',
        branchName: 'Cabang Utama (Grand City Mall Lt. 1)',
        cashierName: 'Dewi Lestari (Kasir 2)',
        customerName: 'Ibu Ratna Dewi',
        customerPhone: '085612349876',
        customerNik: '3273016405850003',
        customerAddress: 'Komplek Permata Buah Batu Blok C-8, Bandung',
        sourceNote: 'TRX-20260711-019',
        itemType: 'Cincin Permata Zircon',
        kadar: '16K (70.0%)',
        beratKotor: 1.90,
        potonganBatu: 0.25,
        beratBersih: 1.65,
        hargaPerGram: 1500000,
        biayaLebur: 25000,
        kondisi: 'Baik / Utuh',
        totalKotor: 2475000,
        potonganBiaya: 25000,
        pph22: 0,
        totalBayar: 2450000,
        paymentMethod: 'cash',
        isAgreedLegal: true,
      },
    ];
    const insertBb = db.prepare(`
      INSERT OR IGNORE INTO buybacks (
        id, invoiceNo, date, timeStr, branchName, cashierName,
        customerName, customerPhone, customerNik, customerNpwp, customerAddress,
        sourceNote, itemType, kadar, beratKotor, potonganBatu, beratBersih,
        hargaPerGram, biayaLebur, kondisi, totalKotor, potonganBiaya, pph22,
        totalBayar, paymentMethod, bankName, accountNo, accountHolder,
        catatan, fotoKtp, fotoEmas, ttdNasabah, ttdPetugas, isAgreedLegal, itemsJson
      ) VALUES (
        @id, @invoiceNo, @date, @timeStr, @branchName, @cashierName,
        @customerName, @customerPhone, @customerNik, @customerNpwp, @customerAddress,
        @sourceNote, @itemType, @kadar, @beratKotor, @potonganBatu, @beratBersih,
        @hargaPerGram, @biayaLebur, @kondisi, @totalKotor, @potonganBiaya, @pph22,
        @totalBayar, @paymentMethod, @bankName, @accountNo, @accountHolder,
        @catatan, @fotoKtp, @fotoEmas, @ttdNasabah, @ttdPetugas, @isAgreedLegal, @itemsJson
      )
    `);
    for (const bb of realisticBuybacks) {
      insertBb.run({
        id: bb.id,
        invoiceNo: bb.invoiceNo,
        date: bb.date,
        timeStr: bb.timeStr ?? null,
        branchName: bb.branchName ?? null,
        cashierName: bb.cashierName ?? null,
        customerName: bb.customerName,
        customerPhone: bb.customerPhone,
        customerNik: bb.customerNik ?? null,
        customerNpwp: bb.customerNpwp ?? null,
        customerAddress: bb.customerAddress ?? null,
        sourceNote: bb.sourceNote ?? '-',
        itemType: bb.itemType,
        kadar: bb.kadar,
        beratKotor: bb.beratKotor,
        potonganBatu: bb.potonganBatu ?? 0,
        beratBersih: bb.beratBersih,
        hargaPerGram: bb.hargaPerGram,
        biayaLebur: bb.biayaLebur ?? 0,
        kondisi: bb.kondisi,
        totalKotor: bb.totalKotor ?? null,
        potonganBiaya: bb.potonganBiaya ?? null,
        pph22: bb.pph22 ?? null,
        totalBayar: bb.totalBayar,
        paymentMethod: bb.paymentMethod,
        bankName: bb.bankName ?? null,
        accountNo: bb.accountNo ?? null,
        accountHolder: bb.accountHolder ?? null,
        catatan: bb.catatan ?? null,
        fotoKtp: bb.fotoKtp ?? null,
        fotoEmas: bb.fotoEmas ?? null,
        ttdNasabah: bb.ttdNasabah ?? null,
        ttdPetugas: bb.ttdPetugas ?? null,
        isAgreedLegal: bb.isAgreedLegal ? 1 : 0,
        itemsJson: bb.items ? JSON.stringify(bb.items) : null,
      });
    }

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('seeded_v1', '1');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('seeded_v2', '1');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('seeded_v3', '1');
  });

  seedTx();
}

// Query Helpers
export function getAllProducts(): Product[] {
  return db
    .prepare('SELECT id, sku, name, berat, harga, stok, category, image FROM products ORDER BY id DESC')
    .all() as Product[];
}

export function getAllCategories(): string[] {
  const rows = db.prepare('SELECT name FROM categories ORDER BY sortOrder ASC, name ASC').all() as Array<{ name: string }>;
  return rows.map(r => r.name);
}

export function getAllTransactions(): Transaction[] {
  const txRows = db
    .prepare(
      'SELECT id, invoiceNo, dateTime, dateStr, timeStr, cashier, customerName, totalQty, totalBerat, subtotal, tax, grandTotal, paymentMethod, paymentDetailsJson FROM transactions ORDER BY dateTime DESC'
    )
    .all() as Array<{
    id: string;
    invoiceNo: string;
    dateTime: string;
    dateStr: string;
    timeStr: string;
    cashier: string;
    customerName: string;
    totalQty: number;
    totalBerat: number;
    subtotal: number;
    tax: number;
    grandTotal: number;
    paymentMethod: 'cash' | 'debit' | 'transfer' | 'qris';
    paymentDetailsJson: string;
  }>;

  const itemRows = db
    .prepare('SELECT transactionId, productId, sku, name, berat, harga, qty, subtotal, image FROM transaction_items ORDER BY id ASC')
    .all() as Array<{
    transactionId: string;
    productId: number;
    sku: string;
    name: string;
    berat: number;
    harga: number;
    qty: number;
    subtotal: number;
    image: string | null;
  }>;

  const itemsByTx = new Map<string, TransactionItem[]>();
  for (const row of itemRows) {
    const list = itemsByTx.get(row.transactionId) ?? [];
    list.push({
      id: row.productId,
      sku: row.sku,
      name: row.name,
      berat: row.berat,
      harga: row.harga,
      qty: row.qty,
      subtotal: row.subtotal,
      image: row.image ?? undefined,
    });
    itemsByTx.set(row.transactionId, list);
  }

  return txRows.map(tx => ({
    id: tx.id,
    invoiceNo: tx.invoiceNo,
    dateTime: tx.dateTime,
    dateStr: tx.dateStr,
    timeStr: tx.timeStr,
    cashier: tx.cashier,
    customerName: tx.customerName,
    items: itemsByTx.get(tx.id) ?? [],
    totalQty: tx.totalQty,
    totalBerat: tx.totalBerat,
    subtotal: tx.subtotal,
    tax: tx.tax,
    grandTotal: tx.grandTotal,
    paymentMethod: tx.paymentMethod,
    paymentDetails: safeJsonParse<PaymentDetails>(tx.paymentDetailsJson, {}),
  }));
}

export function getAllBuybacks(): BuybackItem[] {
  const rows = db.prepare('SELECT * FROM buybacks ORDER BY rowid DESC').all() as Array<{
    id: string;
    invoiceNo: string;
    date: string;
    timeStr: string | null;
    branchName: string | null;
    cashierName: string | null;
    customerName: string;
    customerPhone: string;
    customerNik: string | null;
    customerNpwp: string | null;
    customerAddress: string | null;
    sourceNote: string;
    itemType: string;
    kadar: string;
    beratKotor: number;
    potonganBatu: number;
    beratBersih: number;
    hargaPerGram: number;
    biayaLebur: number;
    kondisi: string;
    totalKotor: number | null;
    potonganBiaya: number | null;
    pph22: number | null;
    totalBayar: number;
    paymentMethod: 'cash' | 'transfer';
    bankName: string | null;
    accountNo: string | null;
    accountHolder: string | null;
    catatan: string | null;
    fotoKtp: string | null;
    fotoEmas: string | null;
    ttdNasabah: string | null;
    ttdPetugas: string | null;
    isAgreedLegal: number;
    itemsJson: string | null;
  }>;

  return rows.map(r => ({
    id: r.id,
    invoiceNo: r.invoiceNo,
    date: r.date,
    timeStr: r.timeStr ?? undefined,
    branchName: r.branchName ?? undefined,
    cashierName: r.cashierName ?? undefined,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerNik: r.customerNik ?? undefined,
    customerNpwp: r.customerNpwp ?? undefined,
    customerAddress: r.customerAddress ?? undefined,
    sourceNote: r.sourceNote,
    itemType: r.itemType,
    kadar: r.kadar,
    beratKotor: r.beratKotor,
    potonganBatu: r.potonganBatu,
    beratBersih: r.beratBersih,
    hargaPerGram: r.hargaPerGram,
    biayaLebur: r.biayaLebur,
    kondisi: r.kondisi,
    totalKotor: r.totalKotor ?? undefined,
    potonganBiaya: r.potonganBiaya ?? undefined,
    pph22: r.pph22 ?? undefined,
    totalBayar: r.totalBayar,
    paymentMethod: r.paymentMethod,
    bankName: r.bankName ?? undefined,
    accountNo: r.accountNo ?? undefined,
    accountHolder: r.accountHolder ?? undefined,
    catatan: r.catatan ?? undefined,
    fotoKtp: r.fotoKtp ?? undefined,
    fotoEmas: r.fotoEmas ?? undefined,
    ttdNasabah: r.ttdNasabah ?? undefined,
    ttdPetugas: r.ttdPetugas ?? undefined,
    isAgreedLegal: Boolean(r.isAgreedLegal),
    items: r.itemsJson ? safeJsonParse<BuybackGoldItem[]>(r.itemsJson, []) : undefined,
  }));
}

export function getAllCustomers(): Customer[] {
  const rows = db.prepare('SELECT * FROM customers ORDER BY rowid DESC').all() as Array<{
    id: string;
    memberCode: string;
    name: string;
    phone: string;
    nik: string | null;
    type: 'Reguler' | 'VIP' | 'Mitra / Toko';
    address: string | null;
    preferredKadar: string | null;
    ringSize: string | null;
    notes: string | null;
    createdAt: string;
    totalSpent: number;
    totalTransactions: number;
  }>;

  return rows.map(r => ({
    id: r.id,
    memberCode: r.memberCode,
    name: r.name,
    phone: r.phone,
    nik: r.nik ?? undefined,
    type: r.type,
    address: r.address ?? undefined,
    preferredKadar: r.preferredKadar ?? undefined,
    ringSize: r.ringSize ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt,
    totalSpent: r.totalSpent,
    totalTransactions: r.totalTransactions,
  }));
}

export function getAllPromos(): PromoCampaign[] {
  const rows = db.prepare('SELECT * FROM promos ORDER BY rowid DESC').all() as Array<{
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
  }>;

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    code: r.code,
    discountPercent: r.discountPercent,
    label: r.label,
    startDate: r.startDate,
    endDate: r.endDate,
    productIds: safeJsonParse<number[]>(r.productIdsJson, []),
    isActive: Boolean(r.isActive),
    minPurchase: r.minPurchase ?? undefined,
    description: r.description ?? undefined,
  }));
}

export function getAllTenants(): Tenant[] {
  return db.prepare('SELECT * FROM tenants ORDER BY rowid ASC').all() as Tenant[];
}

export function getActiveTenantId(): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('activeTenantId') as
    | { value: string }
    | undefined;
  return row?.value ?? 'tenant-tms-001';
}

export function getActivePromos(): PromoCampaign[] {
  const rows = db.prepare('SELECT * FROM promos WHERE isActive = 1 ORDER BY rowid DESC').all() as Array<{
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
  }>;

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    code: r.code,
    discountPercent: r.discountPercent,
    label: r.label,
    startDate: r.startDate,
    endDate: r.endDate,
    productIds: safeJsonParse<number[]>(r.productIdsJson, []),
    isActive: Boolean(r.isActive),
    minPurchase: r.minPurchase ?? undefined,
    description: r.description ?? undefined,
  }));
}

function buildActivePromoMap(): Map<number, PromoCampaign> {
  const activePromos = getActivePromos();
  const map = new Map<number, PromoCampaign>();
  for (const promo of activePromos) {
    for (const prodId of promo.productIds) {
      if (!map.has(prodId)) {
        map.set(prodId, promo);
      }
    }
  }
  return map;
}

function attachPromoFlags(product: Product, promoMap: Map<number, PromoCampaign>): Product {
  const promo = promoMap.get(product.id);
  if (!promo) {
    return {
      ...product,
      isPromo: false,
      promoDiscountPercent: undefined,
      promoLabel: undefined,
    };
  }
  return {
    ...product,
    isPromo: true,
    promoDiscountPercent: promo.discountPercent,
    promoLabel: promo.label,
  };
}

function normalizeSortDir(dir?: string): 'ASC' | 'DESC' {
  return dir?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
}

export function queryProducts(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  promoOnly?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): ProductsPageResponse {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(opts.pageSize ?? 25)));
  const search = (opts.search ?? '').trim().toLowerCase();
  const category = (opts.category ?? '').trim();
  const promoOnly = Boolean(opts.promoOnly);
  const sortDir = normalizeSortDir(opts.sortDir);

  let orderBySql = `id ${sortDir}`;
  switch (opts.sortBy) {
    case 'harga':
      orderBySql = `harga ${sortDir}, id DESC`;
      break;
    case 'berat':
      orderBySql = `berat ${sortDir}, id DESC`;
      break;
    case 'stok':
      orderBySql = `stok ${sortDir}, id DESC`;
      break;
    case 'name':
      orderBySql = `LOWER(name) ${sortDir}, id DESC`;
      break;
    case 'sku':
      orderBySql = `LOWER(sku) ${sortDir}, id DESC`;
      break;
    case 'newest':
    default:
      orderBySql = `id ${sortDir}`;
      break;
  }

  const promoMap = buildActivePromoMap();
  const promoProductIds = Array.from(promoMap.keys());

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (search) {
    const like = `%${search}%`;
    conditions.push('(LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(category) LIKE ?)');
    params.push(like, like, like);
  }

  if (category && category !== 'Semua') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (promoOnly) {
    if (promoProductIds.length === 0) {
      conditions.push('1 = 0');
    } else {
      conditions.push(`id IN (${promoProductIds.map(() => '?').join(', ')})`);
      params.push(...promoProductIds);
    }
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM products ${whereSql}`)
    .get(...params) as { cnt: number };
  const total = totalRow.cnt;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const rows = db
    .prepare(
      `SELECT p.id, p.sku, p.name, p.berat, p.harga, p.stok, p.category, p.image,
              COALESCE(si.cnt, 0) AS salesCount
       FROM products p
       LEFT JOIN (
         SELECT productId, COUNT(*) AS cnt
         FROM transaction_items
         GROUP BY productId
       ) si ON si.productId = p.id
       ${whereSql.replace(/\b(name|sku|category|id)\b/g, 'p.$1')}
       ORDER BY ${orderBySql.replace(/\b(harga|berat|stok|id)\b/g, 'p.$1').replace(/LOWER\((name|sku)\)/g, 'LOWER(p.$1)')}
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as Array<Product & { salesCount: number }>;

  const catRows = db
    .prepare(
      'SELECT category, COUNT(*) as cnt, COALESCE(SUM(stok), 0) as stokSum, COALESCE(SUM(berat * stok), 0) as weightSum, COALESCE(SUM(harga * stok), 0) as assetSum FROM products GROUP BY category'
    )
    .all() as Array<{
    category: string;
    cnt: number;
    stokSum: number;
    weightSum: number;
    assetSum: number;
  }>;

  let totalAllProducts = 0;
  let totalStockQty = 0;
  let totalWeightGrams = 0;
  let totalInventoryValue = 0;
  const categoryCounts: Record<string, number> = {};
  for (const r of catRows) {
    categoryCounts[r.category] = r.cnt;
    totalAllProducts += r.cnt;
    totalStockQty += r.stokSum;
    totalWeightGrams += r.weightSum;
    totalInventoryValue += r.assetSum;
  }
  categoryCounts['Semua'] = totalAllProducts;

  let promoCount = 0;
  if (promoProductIds.length > 0) {
    promoCount = (
      db
        .prepare(`SELECT COUNT(*) as cnt FROM products WHERE id IN (${promoProductIds.map(() => '?').join(', ')})`)
        .get(...promoProductIds) as { cnt: number }
    ).cnt;
  }

  return {
    items: rows.map(p => attachPromoFlags(p, promoMap)),
    total,
    page: safePage,
    pageSize,
    totalPages,
    promoCount,
    categoryCounts,
    totalAllProducts,
    totalStockQty,
    totalWeightGrams: Number(totalWeightGrams.toFixed(2)),
    totalInventoryValue,
  };
}

function normalizeBarcodePayload(rawCode: string): string {
  let clean = rawCode.trim();
  if (!clean) return '';
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean) as { sku?: string; code?: string; id?: string | number };
      if (parsed.sku) clean = String(parsed.sku).trim();
      else if (parsed.code) clean = String(parsed.code).trim();
      else if (parsed.id !== undefined) clean = String(parsed.id).trim();
    } catch {
      // Abaikan jika bukan JSON
    }
  }
  const prefixMatch = clean.match(/^(?:SKU|BARCODE|CODE)\s*[:=]\s*(.+)$/i);
  if (prefixMatch) {
    clean = prefixMatch[1].trim();
  }
  if (clean.includes('|')) {
    clean = clean.split('|')[0]?.trim() || clean;
  }
  return clean.toLowerCase();
}

export function lookupProductByCode(rawCode: string): Product | null {
  const clean = normalizeBarcodePayload(rawCode);
  if (!clean) return null;

  let product = db
    .prepare('SELECT id, sku, name, berat, harga, stok, category, image FROM products WHERE LOWER(sku) = ? LIMIT 1')
    .get(clean) as Product | undefined;

  if (!product && /^\d+$/.test(clean)) {
    product = db
      .prepare('SELECT id, sku, name, berat, harga, stok, category, image FROM products WHERE id = ? LIMIT 1')
      .get(Number(clean)) as Product | undefined;
  }

  if (!product) {
    product = db
      .prepare('SELECT id, sku, name, berat, harga, stok, category, image FROM products WHERE LOWER(name) = ? LIMIT 1')
      .get(clean) as Product | undefined;
  }

  if (!product) {
    const alphaNum = clean.replace(/[^a-z0-9]/g, '');
    if (alphaNum.length >= 3) {
      const allSkus = db
        .prepare('SELECT id, sku, name, berat, harga, stok, category, image FROM products')
        .all() as Product[];
      product = allSkus.find(p => p.sku.toLowerCase().replace(/[^a-z0-9]/g, '') === alphaNum);
    }
  }

  if (!product) return null;
  return attachPromoFlags(product, buildActivePromoMap());
}

export function getCategoriesWithStats(): CategoriesWithStatsResponse {
  const categories = getAllCategories();
  const rows = db
    .prepare(
      'SELECT category, COUNT(*) as count, COALESCE(SUM(stok), 0) as totalStok, COALESCE(SUM(berat * stok), 0) as totalGram FROM products GROUP BY category'
    )
    .all() as Array<{ category: string; count: number; totalStok: number; totalGram: number }>;

  const stats: Record<string, CategoryStatsItem> = {};
  for (const r of rows) {
    stats[r.category] = {
      count: r.count,
      totalStok: r.totalStok,
      totalGram: r.totalGram,
    };
  }
  return { categories, stats };
}

export function queryTransactions(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  method?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): TransactionsPageResponse {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(opts.pageSize ?? 20)));
  const search = (opts.search ?? '').trim().toLowerCase();
  const method = (opts.method ?? 'semua').trim();
  const sortDir = normalizeSortDir(opts.sortDir);

  let orderBySql = `dateTime ${sortDir}, rowid ${sortDir}`;
  switch (opts.sortBy) {
    case 'grandTotal':
      orderBySql = `grandTotal ${sortDir}, dateTime DESC`;
      break;
    case 'totalBerat':
      orderBySql = `totalBerat ${sortDir}, dateTime DESC`;
      break;
    case 'customerName':
      orderBySql = `LOWER(customerName) ${sortDir}, dateTime DESC`;
      break;
    case 'invoiceNo':
      orderBySql = `invoiceNo ${sortDir}, rowid DESC`;
      break;
    case 'paymentMethod':
      orderBySql = `paymentMethod ${sortDir}, dateTime DESC`;
      break;
    case 'newest':
    default:
      orderBySql = `dateTime ${sortDir}, rowid ${sortDir}`;
      break;
  }

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      `(LOWER(invoiceNo) LIKE ? OR LOWER(customerName) LIKE ? OR LOWER(cashier) LIKE ? OR EXISTS (SELECT 1 FROM transaction_items ti WHERE ti.transactionId = transactions.id AND (LOWER(ti.name) LIKE ? OR LOWER(ti.sku) LIKE ?)))`
    );
    params.push(like, like, like, like, like);
  }

  if (method && method !== 'semua') {
    conditions.push('paymentMethod = ?');
    params.push(method);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (
    db.prepare(`SELECT COUNT(*) as cnt FROM transactions ${whereSql}`).get(...params) as { cnt: number }
  ).cnt;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const txRows = db
    .prepare(
      `SELECT id, invoiceNo, dateTime, dateStr, timeStr, cashier, customerId, customerName, totalQty, totalBerat, subtotal, tax, grandTotal, paymentMethod, paymentDetailsJson,
              COALESCE(status, 'completed') AS status, voidReason, voidedAt
       FROM transactions ${whereSql} ORDER BY ${orderBySql} LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as Array<{
    id: string;
    invoiceNo: string;
    dateTime: string;
    dateStr: string;
    timeStr: string;
    cashier: string;
    customerId: string | null;
    customerName: string;
    totalQty: number;
    totalBerat: number;
    subtotal: number;
    tax: number;
    grandTotal: number;
    paymentMethod: 'cash' | 'debit' | 'transfer' | 'qris';
    paymentDetailsJson: string;
    status: 'completed' | 'void';
    voidReason: string | null;
    voidedAt: string | null;
  }>;

  const itemsByTx = new Map<string, TransactionItem[]>();
  if (txRows.length > 0) {
    const ids = txRows.map(t => t.id);
    const placeholders = ids.map(() => '?').join(', ');
    const itemRows = db
      .prepare(
        `SELECT transactionId, productId, sku, name, berat, harga, qty, subtotal, image
         FROM transaction_items WHERE transactionId IN (${placeholders}) ORDER BY id ASC`
      )
      .all(...ids) as Array<{
      transactionId: string;
      productId: number;
      sku: string;
      name: string;
      berat: number;
      harga: number;
      qty: number;
      subtotal: number;
      image: string | null;
    }>;

    for (const row of itemRows) {
      const list = itemsByTx.get(row.transactionId) ?? [];
      list.push({
        id: row.productId,
        sku: row.sku,
        name: row.name,
        berat: row.berat,
        harga: row.harga,
        qty: row.qty,
        subtotal: row.subtotal,
        image: row.image ?? undefined,
      });
      itemsByTx.set(row.transactionId, list);
    }
  }

  const agg = db
    .prepare(
      "SELECT COALESCE(SUM(grandTotal), 0) as totalOmzet, COALESCE(SUM(totalBerat), 0) as totalBerat, COUNT(*) as totalCount FROM transactions WHERE COALESCE(status, 'completed') != 'void'"
    )
    .get() as { totalOmzet: number; totalBerat: number; totalCount: number };

  return {
    items: txRows.map(tx => ({
      id: tx.id,
      invoiceNo: tx.invoiceNo,
      dateTime: tx.dateTime,
      dateStr: tx.dateStr,
      timeStr: tx.timeStr,
      cashier: tx.cashier,
      customerId: tx.customerId ?? undefined,
      customerName: tx.customerName,
      items: itemsByTx.get(tx.id) ?? [],
      totalQty: tx.totalQty,
      totalBerat: tx.totalBerat,
      subtotal: tx.subtotal,
      tax: tx.tax,
      grandTotal: tx.grandTotal,
      paymentMethod: tx.paymentMethod,
      paymentDetails: safeJsonParse<PaymentDetails>(tx.paymentDetailsJson, {}),
      status: tx.status === 'void' ? 'void' : 'completed',
      voidReason: tx.voidReason ?? undefined,
      voidedAt: tx.voidedAt ?? undefined,
    })),
    total,
    page: safePage,
    pageSize,
    totalPages,
    stats: {
      totalOmzetPenjualan: agg.totalOmzet,
      totalBeratTerjual: agg.totalBerat,
      totalTransaksi: agg.totalCount,
      avgPerTransaksi: agg.totalCount > 0 ? Math.round(agg.totalOmzet / agg.totalCount) : 0,
    },
  };
}

export function getTransactionById(id: string): Transaction | null {
  const tx = db
    .prepare(
      `SELECT id, invoiceNo, dateTime, dateStr, timeStr, cashier, customerId, customerName, totalQty, totalBerat, subtotal, tax, grandTotal, paymentMethod, paymentDetailsJson,
              COALESCE(status, 'completed') AS status, voidReason, voidedAt
       FROM transactions WHERE id = ?`
    )
    .get(id) as
    | {
        id: string;
        invoiceNo: string;
        dateTime: string;
        dateStr: string;
        timeStr: string;
        cashier: string;
        customerId: string | null;
        customerName: string;
        totalQty: number;
        totalBerat: number;
        subtotal: number;
        tax: number;
        grandTotal: number;
        paymentMethod: 'cash' | 'debit' | 'transfer' | 'qris';
        paymentDetailsJson: string;
        status: 'completed' | 'void';
        voidReason: string | null;
        voidedAt: string | null;
      }
    | undefined;

  if (!tx) return null;

  const itemRows = db
    .prepare('SELECT productId, sku, name, berat, harga, qty, subtotal, image FROM transaction_items WHERE transactionId = ? ORDER BY id ASC')
    .all(id) as Array<{
    productId: number;
    sku: string;
    name: string;
    berat: number;
    harga: number;
    qty: number;
    subtotal: number;
    image: string | null;
  }>;

  return {
    id: tx.id,
    invoiceNo: tx.invoiceNo,
    dateTime: tx.dateTime,
    dateStr: tx.dateStr,
    timeStr: tx.timeStr,
    cashier: tx.cashier,
    customerId: tx.customerId ?? undefined,
    customerName: tx.customerName,
    items: itemRows.map(r => ({
      id: r.productId,
      sku: r.sku,
      name: r.name,
      berat: r.berat,
      harga: r.harga,
      qty: r.qty,
      subtotal: r.subtotal,
      image: r.image ?? undefined,
    })),
    totalQty: tx.totalQty,
    totalBerat: tx.totalBerat,
    subtotal: tx.subtotal,
    tax: tx.tax,
    grandTotal: tx.grandTotal,
    paymentMethod: tx.paymentMethod,
    paymentDetails: safeJsonParse<PaymentDetails>(tx.paymentDetailsJson, {}),
    status: tx.status === 'void' ? 'void' : 'completed',
    voidReason: tx.voidReason ?? undefined,
    voidedAt: tx.voidedAt ?? undefined,
  };
}

function mapBuybackRow(r: {
  id: string;
  invoiceNo: string;
  date: string;
  timeStr: string | null;
  branchName: string | null;
  cashierName: string | null;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerNik: string | null;
  customerNpwp: string | null;
  customerAddress: string | null;
  sourceNote: string;
  itemType: string;
  kadar: string;
  beratKotor: number;
  potonganBatu: number;
  beratBersih: number;
  hargaPerGram: number;
  biayaLebur: number;
  kondisi: string;
  totalKotor: number | null;
  potonganBiaya: number | null;
  pph22: number | null;
  totalBayar: number;
  paymentMethod: 'cash' | 'transfer';
  bankName: string | null;
  accountNo: string | null;
  accountHolder: string | null;
  catatan: string | null;
  fotoKtp?: string | null;
  fotoEmas?: string | null;
  ttdNasabah?: string | null;
  ttdPetugas?: string | null;
  isAgreedLegal: number;
  itemsJson?: string | null;
  status?: string | null;
  voidReason?: string | null;
  voidedAt?: string | null;
}): BuybackItem {
  return {
    id: r.id,
    invoiceNo: r.invoiceNo,
    date: r.date,
    timeStr: r.timeStr ?? undefined,
    branchName: r.branchName ?? undefined,
    cashierName: r.cashierName ?? undefined,
    customerId: r.customerId ?? undefined,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerNik: r.customerNik ?? undefined,
    customerNpwp: r.customerNpwp ?? undefined,
    customerAddress: r.customerAddress ?? undefined,
    sourceNote: r.sourceNote,
    itemType: r.itemType,
    kadar: r.kadar,
    beratKotor: r.beratKotor,
    potonganBatu: r.potonganBatu,
    beratBersih: r.beratBersih,
    hargaPerGram: r.hargaPerGram,
    biayaLebur: r.biayaLebur,
    kondisi: r.kondisi,
    totalKotor: r.totalKotor ?? undefined,
    potonganBiaya: r.potonganBiaya ?? undefined,
    pph22: r.pph22 ?? undefined,
    totalBayar: r.totalBayar,
    paymentMethod: r.paymentMethod,
    bankName: r.bankName ?? undefined,
    accountNo: r.accountNo ?? undefined,
    accountHolder: r.accountHolder ?? undefined,
    catatan: r.catatan ?? undefined,
    fotoKtp: r.fotoKtp ?? undefined,
    fotoEmas: r.fotoEmas ?? undefined,
    ttdNasabah: r.ttdNasabah ?? undefined,
    ttdPetugas: r.ttdPetugas ?? undefined,
    isAgreedLegal: Boolean(r.isAgreedLegal),
    items: r.itemsJson ? safeJsonParse<BuybackGoldItem[]>(r.itemsJson, []) : undefined,
    status: r.status === 'void' ? 'void' : 'completed',
    voidReason: r.voidReason ?? undefined,
    voidedAt: r.voidedAt ?? undefined,
  };
}

export function queryBuybacks(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  method?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): BuybacksPageResponse {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(opts.pageSize ?? 20)));
  const search = (opts.search ?? '').trim().toLowerCase();
  const method = (opts.method ?? 'all').trim();
  const sortDir = normalizeSortDir(opts.sortDir);

  let orderBySql = `rowid ${sortDir}`;
  switch (opts.sortBy) {
    case 'totalBayar':
      orderBySql = `totalBayar ${sortDir}, rowid DESC`;
      break;
    case 'beratBersih':
      orderBySql = `beratBersih ${sortDir}, rowid DESC`;
      break;
    case 'customerName':
      orderBySql = `LOWER(customerName) ${sortDir}, rowid DESC`;
      break;
    case 'invoiceNo':
      orderBySql = `invoiceNo ${sortDir}, rowid DESC`;
      break;
    case 'itemType':
      orderBySql = `LOWER(itemType) ${sortDir}, rowid DESC`;
      break;
    case 'newest':
    default:
      orderBySql = `rowid ${sortDir}`;
      break;
  }

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      '(LOWER(invoiceNo) LIKE ? OR LOWER(customerName) LIKE ? OR LOWER(customerPhone) LIKE ? OR LOWER(COALESCE(customerNik, \'\')) LIKE ? OR LOWER(itemType) LIKE ? OR LOWER(kadar) LIKE ?)'
    );
    params.push(like, like, like, like, like, like);
  }

  if (method && method !== 'all') {
    conditions.push('paymentMethod = ?');
    params.push(method);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (
    db.prepare(`SELECT COUNT(*) as cnt FROM buybacks ${whereSql}`).get(...params) as { cnt: number }
  ).cnt;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  // Omit heavy base64 columns (fotoKtp, fotoEmas, ttdNasabah, ttdPetugas, itemsJson) on list load
  const rows = db
    .prepare(
      `SELECT id, invoiceNo, date, timeStr, branchName, cashierName,
              customerId, customerName, customerPhone, customerNik, customerNpwp, customerAddress,
              sourceNote, itemType, kadar, beratKotor, potonganBatu, beratBersih,
              hargaPerGram, biayaLebur, kondisi, totalKotor, potonganBiaya, pph22,
              totalBayar, paymentMethod, bankName, accountNo, accountHolder,
              catatan, isAgreedLegal, COALESCE(status, 'completed') AS status, voidReason, voidedAt
       FROM buybacks ${whereSql} ORDER BY ${orderBySql} LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as Array<Parameters<typeof mapBuybackRow>[0]>;

  const agg = db
    .prepare(
      "SELECT COALESCE(SUM(totalBayar), 0) as totalDana, COALESCE(SUM(beratBersih), 0) as totalBerat, COUNT(*) as totalCount FROM buybacks WHERE COALESCE(status, 'completed') != 'void'"
    )
    .get() as { totalDana: number; totalBerat: number; totalCount: number };

  return {
    items: rows.map(mapBuybackRow),
    total,
    page: safePage,
    pageSize,
    totalPages,
    stats: {
      totalDanaDicairkan: agg.totalDana,
      totalBeratDiterima: agg.totalBerat,
      totalTransaksi: agg.totalCount,
      avgPerTransaksi: agg.totalCount > 0 ? Math.round(agg.totalDana / agg.totalCount) : 0,
    },
  };
}

export function getBuybackById(id: string): BuybackItem | null {
  const row = db.prepare('SELECT * FROM buybacks WHERE id = ?').get(id) as
    | Parameters<typeof mapBuybackRow>[0]
    | undefined;
  return row ? mapBuybackRow(row) : null;
}

export function queryCustomers(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): CustomersPageResponse {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(opts.pageSize ?? 20)));
  const search = (opts.search ?? '').trim().toLowerCase();
  const type = (opts.type ?? 'semua').trim();
  const sortDir = normalizeSortDir(opts.sortDir);

  let orderBySql = `c.rowid ${sortDir}`;
  switch (opts.sortBy) {
    case 'computedSpent':
      orderBySql = `computedSpent ${sortDir}, c.rowid DESC`;
      break;
    case 'computedTx':
      orderBySql = `computedTx ${sortDir}, c.rowid DESC`;
      break;
    case 'name':
      orderBySql = `LOWER(c.name) ${sortDir}, c.rowid DESC`;
      break;
    case 'preferredKadar':
      orderBySql = `LOWER(COALESCE(c.preferredKadar, '')) ${sortDir}, c.rowid DESC`;
      break;
    case 'newest':
    default:
      orderBySql = `c.rowid ${sortDir}`;
      break;
  }

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      '(LOWER(c.name) LIKE ? OR LOWER(c.phone) LIKE ? OR LOWER(c.memberCode) LIKE ? OR LOWER(COALESCE(c.nik, \'\')) LIKE ? OR LOWER(COALESCE(c.address, \'\')) LIKE ?)'
    );
    params.push(like, like, like, like, like);
  }

  if (type && type !== 'semua') {
    const mappedType = type === 'Mitra' ? 'Mitra / Toko' : type;
    conditions.push('c.type = ?');
    params.push(mappedType);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (
    db.prepare(`SELECT COUNT(*) as cnt FROM customers c ${whereSql}`).get(...params) as { cnt: number }
  ).cnt;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const rows = db
    .prepare(
      `SELECT c.*,
              (COALESCE(c.totalSpent, 0) + COALESCE((
                SELECT SUM(t.grandTotal) FROM transactions t
                WHERE COALESCE(t.status, 'completed') != 'void'
                  AND (t.customerId = c.id OR (t.customerId IS NULL AND LOWER(t.customerName) = LOWER(c.name)))
              ), 0)) AS computedSpent,
              (COALESCE(c.totalTransactions, 0) + COALESCE((
                SELECT COUNT(*) FROM transactions t
                WHERE COALESCE(t.status, 'completed') != 'void'
                  AND (t.customerId = c.id OR (t.customerId IS NULL AND LOWER(t.customerName) = LOWER(c.name)))
              ), 0) + COALESCE((
                SELECT COUNT(*) FROM buybacks b
                WHERE COALESCE(b.status, 'completed') != 'void'
                  AND (b.customerId = c.id OR (b.customerId IS NULL AND LOWER(b.customerName) = LOWER(c.name)))
              ), 0)) AS computedTx,
              COALESCE((
                SELECT COUNT(*) FROM buybacks b
                WHERE COALESCE(b.status, 'completed') != 'void'
                  AND (b.customerId = c.id OR (b.customerId IS NULL AND LOWER(b.customerName) = LOWER(c.name)))
              ), 0) AS buybackCount
       FROM customers c
       ${whereSql}
       ORDER BY ${orderBySql}
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as Array<{
    id: string;
    memberCode: string;
    name: string;
    phone: string;
    nik: string | null;
    type: 'Reguler' | 'VIP' | 'Mitra / Toko';
    address: string | null;
    preferredKadar: string | null;
    ringSize: string | null;
    notes: string | null;
    createdAt: string;
    totalSpent: number;
    totalTransactions: number;
    computedSpent: number;
    computedTx: number;
    buybackCount: number;
  }>;

  const items: CustomerWithStats[] = rows.map(r => ({
    id: r.id,
    memberCode: r.memberCode,
    name: r.name,
    phone: r.phone,
    nik: r.nik ?? undefined,
    type: r.type,
    address: r.address ?? undefined,
    preferredKadar: r.preferredKadar ?? undefined,
    ringSize: r.ringSize ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt,
    totalSpent: r.totalSpent,
    totalTransactions: r.totalTransactions,
    computedSpent: r.computedSpent,
    computedTx: r.computedTx,
    buybackCount: r.buybackCount,
  }));

  // Global KPI totals in SQL
  const custSummary = db
    .prepare(
      `SELECT COUNT(*) as totalPelanggan,
              SUM(CASE WHEN type = 'VIP' THEN 1 ELSE 0 END) as totalVip,
              COALESCE(SUM(totalSpent), 0) as baseSpent
       FROM customers`
    )
    .get() as { totalPelanggan: number; totalVip: number | null; baseSpent: number };

  const extraTxRow = db
    .prepare(
      `SELECT COALESCE(SUM(t.grandTotal), 0) as extraSpent
       FROM transactions t
       WHERE COALESCE(t.status, 'completed') != 'void'
         AND EXISTS (
           SELECT 1 FROM customers c
           WHERE t.customerId = c.id OR (t.customerId IS NULL AND LOWER(t.customerName) = LOWER(c.name))
         )`
    )
    .get() as { extraSpent: number };

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    stats: {
      totalPelanggan: custSummary.totalPelanggan,
      totalVip: custSummary.totalVip ?? 0,
      totalAkumulasiBelanja: custSummary.baseSpent + extraTxRow.extraSpent,
    },
  };
}

export function queryPromos(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): PromosPageResponse {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(opts.pageSize ?? 10)));
  const search = (opts.search ?? '').trim().toLowerCase();
  const status = (opts.status ?? 'all').trim();

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (search) {
    const like = `%${search}%`;
    conditions.push("(LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)");
    params.push(like, like, like);
  }

  if (status === 'active') {
    conditions.push('isActive = 1');
  } else if (status === 'inactive') {
    conditions.push('isActive = 0');
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (
    db.prepare(`SELECT COUNT(*) as cnt FROM promos ${whereSql}`).get(...params) as { cnt: number }
  ).cnt;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const rows = db
    .prepare(`SELECT * FROM promos ${whereSql} ORDER BY rowid DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset) as Array<{
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
  }>;

  const allActive = getActivePromos();
  const totalPromos = (db.prepare('SELECT COUNT(*) as cnt FROM promos').get() as { cnt: number }).cnt;
  const productSet = new Set<number>();
  let discountSum = 0;
  for (const p of allActive) {
    discountSum += p.discountPercent;
    for (const pid of p.productIds) {
      productSet.add(pid);
    }
  }

  return {
    items: rows.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      discountPercent: r.discountPercent,
      label: r.label,
      startDate: r.startDate,
      endDate: r.endDate,
      productIds: safeJsonParse<number[]>(r.productIdsJson, []),
      isActive: Boolean(r.isActive),
      minPurchase: r.minPurchase ?? undefined,
      description: r.description ?? undefined,
    })),
    total,
    page: safePage,
    pageSize,
    totalPages,
    stats: {
      totalPromos,
      activeCount: allActive.length,
      totalPromoProducts: productSet.size,
      avgDiscount: allActive.length > 0 ? Math.round(discountSum / allActive.length) : 0,
    },
  };
}

export function getDashboardSummary(period: 'HARI' | 'BULAN'): DashboardSummaryResponse {
  const txAgg = db
    .prepare(
      "SELECT COALESCE(SUM(grandTotal), 0) as totalOmzet, COALESCE(SUM(subtotal), 0) as totalSubtotal, COALESCE(SUM(totalQty), 0) as totalProduk, COUNT(*) as countTransaksi FROM transactions WHERE COALESCE(status, 'completed') != 'void'"
    )
    .get() as { totalOmzet: number; totalSubtotal: number; totalProduk: number; countTransaksi: number };

  const bbAgg = db
    .prepare("SELECT COALESCE(SUM(totalBayar), 0) as totalBuybackBayar FROM buybacks WHERE COALESCE(status, 'completed') != 'void'")
    .get() as { totalBuybackBayar: number };

  const totalPenjualan = txAgg.totalOmzet;
  const penjualanKotor = txAgg.totalSubtotal > 0 ? txAgg.totalSubtotal : txAgg.totalOmzet;
  const labaKotor = Math.round(totalPenjualan * 0.18);
  const penerimaan = Math.max(0, txAgg.totalOmzet - bbAgg.totalBuybackBayar);
  const countTransaksi = txAgg.countTransaksi;

  const dayLabels = [
    '00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
    '12:00', '14:00', '16:00', '18:00', '20:00', '22:00',
  ];
  const monthLabels = ['Tgl 1', 'Tgl 5', 'Tgl 10', 'Tgl 15', 'Tgl 20', 'Tgl 25', 'Tgl 30'];
  const labels = period === 'HARI' ? dayLabels : monthLabels;
  const salesArr = Array<number>(labels.length).fill(0);
  const trxArr = Array<number>(labels.length).fill(0);

  const txTimes = db
    .prepare("SELECT dateTime, timeStr, grandTotal FROM transactions WHERE COALESCE(status, 'completed') != 'void'")
    .all() as Array<{ dateTime: string; timeStr: string; grandTotal: number }>;

  if (period === 'HARI') {
    for (const tx of txTimes) {
      let hour = 11;
      if (tx.dateTime) {
        const d = new Date(tx.dateTime);
        if (!isNaN(d.getTime())) hour = d.getHours();
      } else if (tx.timeStr) {
        const h = parseInt(tx.timeStr.split(':')[0], 10);
        if (!isNaN(h)) hour = h;
      }
      const slot = Math.min(11, Math.max(0, Math.floor(hour / 2)));
      salesArr[slot] += tx.grandTotal;
      trxArr[slot] += 1;
    }

    const totalRec = salesArr.reduce((a, b) => a + b, 0);
    if (totalRec === 0 && totalPenjualan > 0) {
      salesArr[5] = Math.round(totalPenjualan * 0.4);
      salesArr[6] = Math.round(totalPenjualan * 0.6);
      trxArr[5] = 1;
      trxArr[6] = Math.max(1, countTransaksi - 1);
    }
  } else {
    for (const tx of txTimes) {
      let day = 15;
      if (tx.dateTime) {
        const d = new Date(tx.dateTime);
        if (!isNaN(d.getTime())) day = d.getDate();
      }
      const slot = Math.min(6, Math.max(0, Math.floor((day - 1) / 5)));
      salesArr[slot] += tx.grandTotal;
      trxArr[slot] += 1;
    }

    const totalRec = salesArr.reduce((a, b) => a + b, 0);
    if (totalRec === 0 && totalPenjualan > 0) {
      salesArr[2] = totalPenjualan;
      trxArr[2] = countTransaksi || 1;
    }
  }

  return {
    period,
    displayTotalPenjualan: totalPenjualan,
    displayPenjualanKotor: penjualanKotor,
    displayLabaKotor: labaKotor,
    displayPenerimaan: penerimaan,
    displayTransaksi: countTransaksi,
    displayProduk: txAgg.totalProduk,
    activeLabels: labels,
    salesData: salesArr,
    trxData: trxArr,
  };
}

