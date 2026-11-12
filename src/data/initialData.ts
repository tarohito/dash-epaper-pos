import { Product, Transaction, BuybackItem } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 1, sku: '16-164', name: 'Cincin Emas Polos 18K', berat: 1.57, harga: 2670000, stok: 12, category: 'Cincin', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80' },
  { id: 2, sku: '13-092', name: 'Gelang Rantai 24K', berat: 9.48, harga: 17800000, stok: 5, category: 'Gelang', image: 'https://images.unsplash.com/photo-1611591475711-d0b16f39e38d?auto=format&fit=crop&w=300&q=80' },
  { id: 3, sku: '12-001', name: 'Kalung Liontin Berlian', berat: 3.20, harga: 8500000, stok: 3, category: 'Kalung', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80' },
  { id: 4, sku: '15-220', name: 'Anting Mutiara Air Tawar', berat: 2.10, harga: 4200000, stok: 8, category: 'Anting', image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=300&q=80' },
  { id: 5, sku: '16-180', name: 'Cincin Kawin Berlian', berat: 4.50, harga: 12500000, stok: 2, category: 'Cincin', image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=300&q=80' },
  { id: 6, sku: '17-005', name: 'Liontin Salib Emas Putih', berat: 1.80, harga: 3100000, stok: 15, category: 'Liontin', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=300&q=80' },
  { id: 7, sku: '11-304', name: 'Bros Kebaya Emas Kuning', berat: 5.40, harga: 6800000, stok: 4, category: 'Bros', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&q=80' },
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
