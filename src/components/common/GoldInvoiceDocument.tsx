import React from'react';
import { Transaction, BuybackItem } from'../../types';
import { formatIDR } from'../../utils/formatters';

interface GoldInvoiceDocumentProps {
  receipt: Transaction | BuybackItem;
  type?:'sale' |'buyback';
  id?: string;
}

export const GoldInvoiceDocument: React.FC<GoldInvoiceDocumentProps> = ({
  receipt,
  type ='sale',
  id,
}) => {
  const isBuyback = type ==='buyback';
  const buybackData = isBuyback ? (receipt as BuybackItem) : null;
  const saleData = !isBuyback ? (receipt as Transaction) : null;

  const invoiceNo = receipt.invoiceNo;
  const customerName = receipt.customerName;
  const customerPhone = isBuyback ? buybackData?.customerPhone :'081234567890';
  const dateStr = isBuyback
    ? buybackData?.date
    : `${saleData?.dateStr ||''} ${saleData?.timeStr ||''}`.trim() ||'11 Nov 2026, 14:30';

  const totalAmount = isBuyback ? buybackData?.totalBayar || 0 : saleData?.grandTotal || 0;
  const subtotalAmount = isBuyback
    ? (buybackData?.beratBersih || 0) * (buybackData?.hargaPerGram || 0)
    : saleData?.subtotal || 0;
  const diskonOrPotongan = isBuyback ? buybackData?.biayaLebur || 0 : 0;

  const isVoid = receipt.status === 'void';

  return (
    <div
      id={id}
      className="relative bg-white text-gray-900 font-sans p-4 sm:p-7 md:p-8 rounded-lg border border-gray-200 w-full max-w-3xl mx-auto overflow-hidden leading-normal select-none"
      style={{ minHeight:'560px' }}
    >
      {/* ========================================================= */}
      {/* CENTER WATERMARK (Identik seperti di foto nota emas resmi) */}
      {/* ========================================================= */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="flex flex-col items-center opacity-[0.08] transform -rotate-12 scale-125">
          {/* Watermark Crown Logo */}
          <svg className="w-56 h-56 text-[#a17822]" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="20" cy="20" r="5" />
            <circle cx="35" cy="12" r="5" />
            <circle cx="50" cy="8" r="6" />
            <circle cx="65" cy="12" r="5" />
            <circle cx="80" cy="20" r="5" />
            <path d="M 16 30 L 22 68 L 78 68 L 84 30 L 65 50 L 50 25 L 35 50 Z" />
            <rect x="22" y="74" width="56" height="8" rx="2" />
          </svg>
          <span className="text-3xl font-black tracking-widest uppercase mt-2 text-[#a17822]">
            e.paper GOLD
          </span>
          <span className="text-sm font-bold tracking-[0.25em] text-[#a17822]">
            AUTHENTIC BOUTIQUE STORE
          </span>
        </div>
      </div>

      {isVoid && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="border-4 border-red-600/45 text-red-600/45 px-8 py-3 rounded-lg transform -rotate-12 text-center">
            <span className="text-5xl font-black tracking-[0.25em] uppercase block">VOID</span>
            {receipt.voidReason && (
              <span className="text-xs font-bold tracking-wider uppercase block mt-1">
                {receipt.voidReason}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content wrapper relative to stay above watermark */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* ========================================================= */}
        {/* HEADER SECTION (Logo kiri, Barcode & No Faktur kanan)     */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b border-gray-300">
          {/* Left: Brand & Customer Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {/* Crown Icon Emblem */}
              <div className="text-[#a17822] shrink-0">
                <svg className="w-12 h-12" viewBox="0 0 100 100" fill="currentColor">
                  <circle cx="20" cy="20" r="5" />
                  <circle cx="35" cy="12" r="5" />
                  <circle cx="50" cy="8" r="6" />
                  <circle cx="65" cy="12" r="5" />
                  <circle cx="80" cy="20" r="5" />
                  <path d="M 16 30 L 22 68 L 78 68 L 84 30 L 65 50 L 50 25 L 35 50 Z" />
                  <rect x="22" y="74" width="56" height="8" rx="2" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#8c671b] leading-none uppercase">
                  e.paper
                </h1>
                <span className="text-xs font-extrabold tracking-[0.3em] text-[#9a7420] uppercase block mt-0.5">
                  GOLD & JEWELLERY
                </span>
              </div>
            </div>

            {/* Customer Metadata */}
            <div className="text-xs space-y-0.5 pt-1 text-gray-800">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-gray-500 font-normal">No. Pelanggan :</span>
                <span className="font-mono text-gray-900 font-extrabold">N{invoiceNo.replace(/[^0-9]/g,'').slice(-8) ||'26813770'}</span>
                <span className="text-gray-900 font-bold ml-1">{customerName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-700">
                <span className="text-gray-500">Telp/HP</span>
                <span>:</span>
                <span className="font-mono">{customerPhone}</span>
              </div>
            </div>
          </div>

          {/* Right: Barcode & Invoice Meta */}
          <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1">
            {/* Barcode Graphic */}
            <div className="h-8 w-48 flex items-center justify-between gap-[2px] bg-white p-1 rounded border border-gray-200">
              {[2, 1, 3, 1, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 3, 2, 1, 3, 2, 4, 1, 2].map((w, idx) => (
                <div key={idx} className="h-full bg-black rounded-xs" style={{ width: `${w * 1.5}px` }} />
              ))}
            </div>
            <div className="font-mono text-xs font-black tracking-wider text-gray-900 mt-1">
              {isBuyback ? invoiceNo : `NS.${invoiceNo.replace(/[^0-9]/g, '') || '525001.260700036'}`}
            </div>
            <div className="text-xs text-gray-600 font-medium">{dateStr}</div>
            <div className="text-xs font-bold text-gray-700">
              e.paper G-WALK Citraland &bull; Grand Indonesia
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TABLE SECTION (Jumlah, Nama Barang, Kdr, Gr, Harga)       */}
        {/* ========================================================= */}
        <div className="my-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-t-2 border-b-2 border-gray-900 text-gray-900 font-black uppercase text-xs">
                <th className="py-2 px-2 text-center w-16">Jumlah</th>
                <th className="py-2 px-3 text-left">Nama Barang</th>
                <th className="py-2 px-3 text-center w-24">Kdr.</th>
                <th className="py-2 px-3 text-center w-20">Gr.</th>
                <th className="py-2 px-3 text-right w-32">Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {isBuyback && buybackData ? (
                buybackData.items && buybackData.items.length > 0 ? (
                  buybackData.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/20">
                      <td className="py-2.5 px-2 text-center font-bold">1</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{it.brandType}</div>
                        <div className="text-xs text-gray-500 font-normal">
                          {it.category} &bull; {it.kondisi}
                          {it.serialNumber ? ` &bull; Seri: ${it.serialNumber}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{it.kadar}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {it.berat.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-gray-900">
                        {formatIDR(it.subtotal).replace('Rp', '').trim()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="hover:bg-amber-50/20">
                    <td className="py-2.5 px-2 text-center font-bold">1</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-gray-900">{buybackData.itemType} (Buyback)</div>
                      <div className="text-xs text-gray-500 font-normal">
                        Kondisi: {buybackData.kondisi} &bull; Potongan batu: {buybackData.potonganBatu.toFixed(2)}g
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{buybackData.kadar}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {buybackData.beratBersih.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-gray-900">
                      {formatIDR(subtotalAmount).replace('Rp', '').trim()}
                    </td>
                  </tr>
                )
              ) : (
                saleData?.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/20">
                    <td className="py-2.5 px-2 text-center font-bold">{it.qty}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-gray-900">{it.name}</div>
                      <div className="text-xs text-gray-500 font-mono">SKU: {it.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {it.name.includes('24K') ? '999.9' : it.name.includes('22K') ? '916' : '750 (18K)'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{it.berat.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-gray-900">
                      {formatIDR(it.subtotal).replace('Rp', '').trim()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="border-b-2 border-gray-900 mt-0.5" />
        </div>

        {/* ========================================================= */}
        {/* MIDDLE SECTION: Legal stamp + QR kiri, Total Bar kanan    */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-2 items-center">
          {/* Left Column (7 cols): Thumb Photo & QR */}
          <div className="md:col-span-7 flex items-center gap-3">
            {/* Small Product Thumbnail */}
            <div className="w-16 h-16 rounded-md border border-gray-300 p-1 bg-white shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={
                  isBuyback
                    ? buybackData?.fotoEmas ||
                      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=150&q=80'
                    : saleData?.items[0]?.image ||
                      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=150&q=80'
                }
                alt="Product"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>

            {/* Digital QR Code */}
            <div className="p-1.5 bg-white border border-gray-800 rounded-lg shrink-0">
              <svg className="w-14 h-14" viewBox="0 0 100 100" fill="none">
                <rect x="5" y="5" width="28" height="28" rx="2" fill="#111827" />
                <rect x="9" y="9" width="20" height="20" rx="1" fill="white" />
                <rect x="13" y="13" width="12" height="12" fill="#111827" />

                <rect x="67" y="5" width="28" height="28" rx="2" fill="#111827" />
                <rect x="71" y="9" width="20" height="20" rx="1" fill="white" />
                <rect x="75" y="13" width="12" height="12" fill="#111827" />

                <rect x="5" y="67" width="28" height="28" rx="2" fill="#111827" />
                <rect x="9" y="71" width="20" height="20" rx="1" fill="white" />
                <rect x="13" y="75" width="12" height="12" fill="#111827" />

                <rect x="38" y="10" width="8" height="8" fill="#111827" />
                <rect x="48" y="22" width="10" height="6" fill="#111827" />
                <rect x="10" y="40" width="8" height="12" fill="#111827" />
                <rect x="38" y="38" width="24" height="24" rx="3" fill="#a17822" />
                <rect x="68" y="40" width="14" height="8" fill="#111827" />
                <rect x="68" y="68" width="20" height="10" fill="#111827" />
                <rect x="38" y="75" width="12" height="10" fill="#111827" />
              </svg>
            </div>
          </div>

          {/* Right Column (5 cols): Ongkos, Diskon, Pajak PPh 22, Yellow Highlighted Total */}
          <div className="md:col-span-5 space-y-1.5 text-xs text-right">
            <div className="flex justify-between text-gray-700">
              <span className="font-semibold">Ongkos / Biaya</span>
              <span className="font-mono font-bold">
                {diskonOrPotongan > 0 ? formatIDR(diskonOrPotongan).replace('Rp', '').trim() : '0'}
              </span>
            </div>
            {isBuyback && buybackData?.pph22 && buybackData.pph22 > 0 ? (
              <div className="flex justify-between text-rose-700">
                <span className="font-semibold">Pajak PPh Pasal 22</span>
                <span className="font-mono font-bold">
                  - {formatIDR(buybackData.pph22).replace('Rp', '').trim()}
                </span>
              </div>
            ) : null}

            {/* SOLID YELLOW/GOLD HIGHLIGHT TOTAL BAR (Sama persis seperti di foto) */}
            <div className="bg-[#d4a017] text-gray-950 px-4 py-2 rounded font-black flex justify-between items-center">
              <span className="text-sm uppercase tracking-widest">{isBuyback ? 'TOTAL DITERIMA' : 'TOTAL'}</span>
              <span className="text-base font-mono">
                {formatIDR(totalAmount).replace('Rp', '').trim()}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM SECTION: Perhatian Kiri, Tanda Tangan Kanan        */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-3 border-t border-gray-300 mt-2 text-xs">
          {/* Left: Perhatian / Ketentuan */}
          <div className="md:col-span-7 space-y-1 text-gray-600 leading-relaxed">
            <p className="font-black text-gray-900 uppercase tracking-wide">Perhatian :</p>
            <ol className="list-decimal pl-3 space-y-0.5">
              <li>Jika hendak jual atau tukar barang, harus membawa surat ini. Jika tidak, kami tidak dapat melayani. MOHON PENGERTIANNYA.</li>
              <li>Barang dari e.paper Group kami terima kembali dengan potongan yang sudah ditentukan resmi.</li>
              <li>Terima jual beli emas batangan, logam mulia, dan perhiasan bersertifikat.</li>
              <li>Jika hendak menjual kembali, wajib membawa surat ini dan sertifikat resmi produk.</li>
              <li>Jika jual/tukar barang ada kerusakan/cacat, mata hilang, dsb., maka akan dikenakan potongan tambahan mengikuti kondisi perhiasan.</li>
              <li>Jika barang pesanan khusus (custom order), batu, dan ongkos lebur tidak dapat dikembalikan lagi.</li>
            </ol>
          </div>

          {/* Right: Signatures (Customer & Gold Advisor) */}
          <div className="md:col-span-5 flex flex-col justify-between">
            <p className="text-center font-bold text-gray-800 text-xs mb-2">Hormat Kami,</p>
            <div className="grid grid-cols-2 gap-4 text-center">
              {/* Customer Signature Box */}
              <div className="flex flex-col items-center justify-end">
                {buybackData?.ttdNasabah ? (
                  <div className="h-14 w-full flex items-center justify-center overflow-hidden">
                    <img
                      src={buybackData.ttdNasabah}
                      alt="TTD Nasabah"
                      className="max-h-14 max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-14 w-full" />
                )}
                <div className="border-t border-gray-400 w-full pt-1">
                  <p className="font-bold text-gray-900 text-xs">{customerName}</p>
                  <p className="text-xs text-gray-500 font-medium">Customer (Penjual)</p>
                </div>
              </div>

              {/* Gold Advisor Signature Box */}
              <div className="flex flex-col items-center justify-end">
                {buybackData?.ttdPetugas ? (
                  <div className="h-14 w-full flex items-center justify-center overflow-hidden">
                    <img
                      src={buybackData.ttdPetugas}
                      alt="TTD Petugas"
                      className="max-h-14 max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-14 w-full" />
                )}
                <div className="border-t border-gray-400 w-full pt-1">
                  <p className="font-bold text-gray-900 text-xs">{buybackData?.cashierName || 'Admin Kasir'}</p>
                  <p className="text-xs text-gray-500 font-medium">Gold Advisor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
