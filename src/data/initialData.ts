import { Product, Transaction, BuybackItem, PromoCampaign } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 1, sku: '16-164', name: 'Cincin Emas Polos 18K', berat: 1.57, harga: 2670000, stok: 12, category: 'Cincin', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80', isPromo: true, promoDiscountPercent: 10, promoLabel: 'Diskon 10%' },
  { id: 2, sku: '13-092', name: 'Gelang Rantai 24K', berat: 9.48, harga: 17800000, stok: 5, category: 'Gelang', image: 'https://images.unsplash.com/photo-1611591475711-d0b16f39e38d?auto=format&fit=crop&w=300&q=80', isPromo: true, promoDiscountPercent: 5, promoLabel: 'Diskon 5%' },
  { id: 3, sku: '12-001', name: 'Kalung Liontin Berlian', berat: 3.20, harga: 8500000, stok: 3, category: 'Kalung', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80', isPromo: true, promoDiscountPercent: 15, promoLabel: 'Diskon 15%' },
  { id: 4, sku: '15-220', name: 'Anting Mutiara Air Tawar', berat: 2.10, harga: 4200000, stok: 8, category: 'Anting', image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=300&q=80', isPromo: true, promoDiscountPercent: 8, promoLabel: 'Diskon 8%' },
  { id: 5, sku: '16-180', name: 'Cincin Kawin Berlian', berat: 4.50, harga: 12500000, stok: 2, category: 'Cincin', image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=300&q=80' },
  { id: 6, sku: '17-005', name: 'Liontin Salib Emas Putih', berat: 1.80, harga: 3100000, stok: 15, category: 'Liontin', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=300&q=80' },
  { id: 7, sku: '11-304', name: 'Bros Kebaya Emas Kuning', berat: 5.40, harga: 6800000, stok: 4, category: 'Bros', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&q=80', isPromo: true, promoDiscountPercent: 12, promoLabel: 'Diskon 12%' },
  { id: 8, sku: '18-022', name: 'Gelang Keroncong 22K', berat: 15.00, harga: 28500000, stok: 2, category: 'Gelang', image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=300&q=80' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-20250518-001',
    invoiceNo: 'TRX-20250518-001',
    dateTime: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    dateStr: new Date(Date.now() - 3600000 * 2.5).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeStr: new Date(Date.now() - 3600000 * 2.5).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    cashier: 'Administrator Kasir (Shift 1)',
    customerName: 'Ibu Ratna Dewi',
    items: [
      { id: 1, sku: '16-164', name: 'Cincin Emas Polos 18K', berat: 1.57, harga: 2670000, qty: 1, subtotal: 2670000 }
    ],
    totalQty: 1,
    totalBerat: 1.57,
    subtotal: 2670000,
    tax: 293700,
    grandTotal: 2963700,
    paymentMethod: 'qris',
    paymentDetails: {
      qrisNmid: 'ID102003928192',
      qrisRrn: '998273618293'
    }
  },
  {
    id: 'TRX-20250518-002',
    invoiceNo: 'TRX-20250518-002',
    dateTime: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    dateStr: new Date(Date.now() - 3600000 * 1.2).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeStr: new Date(Date.now() - 3600000 * 1.2).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    cashier: 'Administrator Kasir (Shift 1)',
    customerName: 'Bpk. Hendra Wijaya',
    items: [
      { id: 4, sku: '15-220', name: 'Anting Mutiara Air Tawar', berat: 2.10, harga: 4200000, qty: 1, subtotal: 4200000 }
    ],
    totalQty: 1,
    totalBerat: 2.10,
    subtotal: 4200000,
    tax: 462000,
    grandTotal: 4662000,
    paymentMethod: 'debit',
    paymentDetails: {
      debitBank: 'BCA',
      debitCardLast4: '8821',
      debitApprovalCode: 'AUTH-592814'
    }
  }
];

export const INITIAL_BUYBACKS: BuybackItem[] = [
  {
    id: 'bb-1',
    invoiceNo: 'BB-20261111-001',
    date: '11 Nov 2026, 10:20',
    customerName: 'Hj. Siti Rahmah',
    customerPhone: '081234567890',
    sourceNote: 'TRX-20261015-089',
    itemType: 'Kalung Emas Rantai',
    kadar: '22K (91.6%)',
    beratKotor: 10.20,
    potonganBatu: 0,
    beratBersih: 10.20,
    hargaPerGram: 1120000,
    biayaLebur: 50000,
    kondisi: 'Mulus (Lengkap Surat)',
    totalBayar: 11374000,
    paymentMethod: 'transfer',
    bankName: 'BCA',
    accountNo: '8820192811'
  },
  {
    id: 'bb-2',
    invoiceNo: 'BB-20261111-002',
    date: '11 Nov 2026, 14:45',
    customerName: 'Budi Santoso',
    customerPhone: '081987654321',
    sourceNote: '-',
    itemType: 'Cincin Kawin Pria',
    kadar: '18K (75.0%)',
    beratKotor: 4.80,
    potonganBatu: 0.30,
    beratBersih: 4.50,
    hargaPerGram: 930000,
    biayaLebur: 80000,
    kondisi: 'Patah Ringan (Tanpa Surat)',
    totalBayar: 4105000,
    paymentMethod: 'cash'
  }
];

export const INITIAL_PROMOS: PromoCampaign[] = [
  {
    id: 'PRM-001',
    name: 'Promo Kilau Emas 18K',
    code: 'KILAU10',
    discountPercent: 10,
    label: 'Diskon 10%',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    productIds: [1],
    isActive: true,
    minPurchase: 2000000,
    description: 'Potongan harga spesial 10% untuk cincin emas polos 18K.'
  },
  {
    id: 'PRM-002',
    name: 'Diskon Eksklusif Berlian',
    code: 'DIAMOND15',
    discountPercent: 15,
    label: 'Diskon 15%',
    startDate: '2026-11-05',
    endDate: '2026-11-25',
    productIds: [3],
    isActive: true,
    minPurchase: 5000000,
    description: 'Diskon perhiasan bertatahkan berlian murni bersertifikat.'
  },
  {
    id: 'PRM-003',
    name: 'Festival Gelang Rantai 24K',
    code: 'GELANG5',
    discountPercent: 5,
    label: 'Diskon 5%',
    startDate: '2026-11-10',
    endDate: '2026-11-20',
    productIds: [2],
    isActive: true,
    minPurchase: 10000000,
    description: 'Cashback potongan langsung pembelian emas murni 24 karat.'
  },
  {
    id: 'PRM-004',
    name: 'Promo Mutiara & Anting Elegan',
    code: 'PEARL8',
    discountPercent: 8,
    label: 'Diskon 8%',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    productIds: [4],
    isActive: true,
    description: 'Sentuhan kemewahan mutiara air tawar dengan harga spesial.'
  },
  {
    id: 'PRM-005',
    name: 'Spesial Bros Kebaya Pesta',
    code: 'BROS12',
    discountPercent: 12,
    label: 'Diskon 12%',
    startDate: '2026-11-08',
    endDate: '2026-11-22',
    productIds: [7],
    isActive: true,
    description: 'Aksesoris kebaya emas kuning untuk acara pesta dan pernikahan.'
  }
];
