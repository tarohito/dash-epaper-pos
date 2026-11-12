# e.paper - Kasir POS Perhiasan & Logam Mulia

Aplikasi Point of Sale (POS) dan manajemen inventaris berbasis web yang dirancang khusus untuk toko perhiasan, logam mulia, dan butik emas. Dilengkapi alur penjualan kasir, transaksi pembelian kembali (*buyback*), serta cetak nota/surat resmi perhiasan berstandar industri.

---

## Fitur Utama

- **Kasir Penjualan (POS)**
  - Pencarian cepat nama produk, kadar karat, dan barcode scanner SKU.
  - Perhitungan otomatis subtotal, PPN (11%), dan total pembayaran.
  - Kalkulasi uang tunai diterima dan kembalian secara otomatis dengan format ribuan.
  - Verifikasi transaksi non-tunai (EDC Debit, Transfer Bank, QRIS).

- **Pembelian Kembali (Buyback)**
  - Penimbangan gramasi emas (berat kotor, potongan batu, berat bersih).
  - Pilihan preset kadar emas (24K, 22K, 18K, 17K, 16K, 10K, dll.) dan penyesuaian harga harian per gram.
  - Kalkulasi potongan biaya lebur dan metode pencairan dana (tunai / transfer).

- **Cetak Nota & Sertifikat Kepemilikan Emas**
  - Desain dokumen nota resmi A5 Landscape dengan watermark pengaman di tengah.
  - Rincian tabel barang: Jumlah, Nama Barang, Kadar Karat, Gramasi, dan Harga.
  - Dilengkapi kode barcode, QR code digital, ketentuan jual/tukar, dan area tanda tangan customer serta advisor.
  - Siap cetak langsung ke printer laser, inkjet, maupun dot matrix (*print-friendly*).

- **Manajemen Inventaris & Transaksi**
  - Katalog barang dan stok produk terorganisir per kategori (Cincin, Gelang, Kalung, Anting, Liontin, Bros).
  - Tambah produk dan kategori baru secara dinamis.
  - Riwayat transaksi harian dan filter status pembayaran.

---

## Teknologi

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Icons & UI**: Lucide React, Tippy.js
- **Tooling**: Vite, Bun / Node.js

---

## Memulai Proyek

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 18+) atau [Bun](https://bun.sh/)

### Instalasi & Menjalankan

1. Clone repositori:
   ```bash
   git clone https://github.com/tarohito/dash-epaper-pos.git
   cd dash-epaper-pos
   ```

2. Pasang dependensi:
   ```bash
   bun install
   # atau
   npm install
   ```

3. Jalankan server pengembangan lokal:
   ```bash
   bun run dev
   # atau
   npm run dev
   ```

4. Buka di peramban:
   ```
   http://localhost:3000
   ```

### Build Produksi

```bash
bun run build
# atau
npm run build
```

---

## Lisensi

Proyek ini dilisensikan di bawah lisensi pribadi / internal untuk operasional kasir perhiasan e.paper.
