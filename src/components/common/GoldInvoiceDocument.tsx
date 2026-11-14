import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gem } from 'lucide-react';
import { Transaction, TransactionItem, BuybackItem, Tenant, StoreSettings } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { createQrCodeDataUrl, renderCode128ToSvg } from '../../utils/barcode';

export type ReceiptPaperSize = 'a5' | 'a6';

interface GoldInvoiceDocumentProps {
  receipt: Transaction | BuybackItem;
  type?: 'sale' | 'buyback';
  id?: string;
  activeTenant?: Tenant;
  storeSettings?: StoreSettings;
  paperSize?: ReceiptPaperSize;
}

const FINENESS_MAP: Record<string, string> = {
  '24K': '999.9 (24K)',
  '23K': '958 (23K)',
  '22K': '916 (22K)',
  '21K': '875 (21K)',
  '20K': '833 (20K)',
  '18K': '750 (18K)',
  '17K': '700 (17K)',
  '16K': '667 (16K)',
  '14K': '585 (14K)',
  '10K': '417 (10K)',
  '9K': '375 (9K)',
  '8K': '333 (8K)',
};

function detectSaleItemKadar(item: TransactionItem): string {
  const combined = `${item.name} ${item.sku} ${item.category ?? ''}`.toUpperCase();

  const karatMatch = combined.match(/\b(24K|23K|22K|21K|20K|18K|17K|16K|14K|10K|9K|8K)\b/);
  if (karatMatch) {
    return FINENESS_MAP[karatMatch[1]] ?? karatMatch[1];
  }

  const finenessMatch = combined.match(/\b(999\.?9?|958|916|875|833|750|700|585|417|375|333)\b/);
  if (finenessMatch) {
    return finenessMatch[1];
  }

  if (
    combined.includes('LOGAM MULIA') ||
    combined.includes('ANTAM') ||
    combined.includes('UBS') ||
    combined.includes('GALERI 24') ||
    combined.includes('BATANGAN')
  ) {
    return '999.9 (24K)';
  }

  return item.category || '-';
}

function getSalePaymentMethodLabel(tx: Transaction): string {
  switch (tx.paymentMethod) {
    case 'cash':
      return 'Tunai';
    case 'debit':
      return tx.paymentDetails.debitBank
        ? `Debit EDC (${tx.paymentDetails.debitBank})`
        : 'Debit EDC';
    case 'transfer':
      return tx.paymentDetails.transferBank
        ? `Transfer (${tx.paymentDetails.transferBank})`
        : 'Transfer Bank';
    case 'qris':
      return 'QRIS';
    default:
      return tx.paymentMethod;
  }
}

function getSalePaymentReferenceLine(tx: Transaction): string {
  const d = tx.paymentDetails || {};
  switch (tx.paymentMethod) {
    case 'cash': {
      const received = d.cashReceived ?? tx.grandTotal;
      const change = d.cashChange ?? Math.max(0, received - tx.grandTotal);
      return `Bayar ${formatIDR(received)} • Kembali ${formatIDR(change)}`;
    }
    case 'debit': {
      const parts: string[] = [];
      if (d.debitCardLast4) parts.push(`•••• ${d.debitCardLast4}`);
      if (d.debitApprovalCode) parts.push(`Appr: ${d.debitApprovalCode}`);
      return parts.join(' • ') || 'EDC Lunas';
    }
    case 'transfer': {
      const parts: string[] = [];
      if (d.transferAccountNo) parts.push(`Rek: ${d.transferAccountNo}`);
      if (d.transferRef) parts.push(`Ref: ${d.transferRef}`);
      return parts.join(' • ') || 'Transfer Terverifikasi';
    }
    case 'qris': {
      const parts: string[] = [];
      if (d.qrisRrn) parts.push(`RRN: ${d.qrisRrn}`);
      if (d.qrisNmid) parts.push(`NMID: ${d.qrisNmid}`);
      return parts.join(' • ') || 'QRIS Terverifikasi';
    }
    default:
      return '';
  }
}

export const GoldInvoiceDocument: React.FC<GoldInvoiceDocumentProps> = ({
  receipt,
  type = 'sale',
  id,
  activeTenant,
  storeSettings,
  paperSize = 'a5',
}) => {
  const isBuyback = type === 'buyback';
  const isA6 = paperSize === 'a6';
  const buybackData = isBuyback ? (receipt as BuybackItem) : null;
  const saleData = !isBuyback ? (receipt as Transaction) : null;

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [thumbBroken, setThumbBroken] = useState(false);

  const invoiceNo = receipt.invoiceNo || '-';
  const customerName = receipt.customerName || 'Pelanggan Umum';
  const customerMemberCode = isBuyback
    ? buybackData?.customerMemberCode
    : saleData?.customerMemberCode;
  const customerPhone = isBuyback
    ? buybackData?.customerPhone || '-'
    : saleData?.customerPhone || '-';
  const customerAddress = isBuyback
    ? buybackData?.customerAddress
    : saleData?.customerAddress;

  const dateStr = isBuyback
    ? [buybackData?.date, buybackData?.timeStr].filter(Boolean).join(' • ') || '-'
    : [saleData?.dateStr, saleData?.timeStr].filter(Boolean).join(', ') || '-';

  const storeName = activeTenant?.name || 'Toko Emas';
  const branchDisplay = isBuyback
    ? buybackData?.branchName ||
      (activeTenant ? `${activeTenant.name} • ${activeTenant.branchName}` : storeName)
    : activeTenant
    ? `${activeTenant.name} • ${activeTenant.branchName}`
    : storeName;
  const storeAddressLine = [activeTenant?.address, activeTenant?.city]
    .filter(Boolean)
    .join(', ');

  const totalAmount = isBuyback
    ? buybackData?.totalBayar || 0
    : saleData?.grandTotal || 0;
  const subtotalAmount = isBuyback
    ? buybackData?.totalKotor ??
      (buybackData?.beratBersih || 0) * (buybackData?.hargaPerGram || 0)
    : saleData?.subtotal || 0;
  const biayaLeburOrPotongan = isBuyback
    ? (buybackData?.potonganBiaya ?? buybackData?.biayaLebur ?? 0)
    : 0;
  const saleTaxAmount = !isBuyback ? saleData?.tax || 0 : 0;

  const thumbSrc = useMemo(() => {
    if (isBuyback) {
      return buybackData?.fotoEmas || '';
    }
    return saleData?.items.find(it => Boolean(it.image))?.image || '';
  }, [isBuyback, buybackData?.fotoEmas, saleData?.items]);

  useEffect(() => {
    setThumbBroken(false);
  }, [thumbSrc, invoiceNo]);

  useEffect(() => {
    renderCode128ToSvg(barcodeSvgRef.current, invoiceNo, {
      height: isA6 ? 22 : 26,
      barWidth: isA6 ? 1.15 : 1.3,
      fontSize: 9,
      displayValue: false,
    });
  }, [invoiceNo, isA6]);

  const qrPayload = useMemo(() => {
    const docTag = isBuyback ? 'BUYBACK' : 'SALE';
    const tenantTag = activeTenant?.code || 'STORE';
    return `${tenantTag}|${docTag}|${invoiceNo}|${customerName}|${totalAmount}`;
  }, [isBuyback, activeTenant?.code, invoiceNo, customerName, totalAmount]);

  useEffect(() => {
    let cancelled = false;
    createQrCodeDataUrl(qrPayload, 112)
      .then(url => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  const isVoid = receipt.status === 'void';

  return (
    <div
      id={id}
      data-paper={paperSize}
      className={`gold-invoice-sheet relative bg-white text-gray-900 font-sans rounded-lg border border-gray-200 w-full mx-auto leading-snug select-none ${
        isA6
          ? 'max-w-[460px] p-3 sm:p-4 text-[10px]'
          : 'max-w-[680px] p-4 sm:p-5 text-[11px]'
      }`}
    >
      {/* CENTER WATERMARK */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden rounded-lg">
        <div className="flex flex-col items-center opacity-[0.06] transform -rotate-12 text-center">
          <svg
            className={isA6 ? 'w-32 h-32 text-[#a17822]' : 'w-44 h-44 text-[#a17822]'}
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <circle cx="20" cy="20" r="5" />
            <circle cx="35" cy="12" r="5" />
            <circle cx="50" cy="8" r="6" />
            <circle cx="65" cy="12" r="5" />
            <circle cx="80" cy="20" r="5" />
            <path d="M 16 30 L 22 68 L 78 68 L 84 30 L 65 50 L 50 25 L 35 50 Z" />
            <rect x="22" y="74" width="56" height="8" rx="2" />
          </svg>
          <span
            className={`font-black tracking-widest uppercase mt-1 text-[#a17822] ${
              isA6 ? 'text-xl' : 'text-2xl'
            }`}
          >
            {storeName}
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] text-[#a17822] uppercase mt-0.5">
            {storeSettings?.receiptTagline || 'GOLD & JEWELLERY'}
          </span>
        </div>
      </div>

      {isVoid && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="border-4 border-red-600/50 text-red-600/50 px-6 py-2.5 rounded-lg transform -rotate-12 text-center bg-white/70">
            <span className="text-4xl font-black tracking-[0.25em] uppercase block">VOID</span>
            {receipt.voidReason && (
              <span className="text-[10px] font-bold tracking-wider uppercase block mt-0.5">
                {receipt.voidReason}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col">
        {/* HEADER SECTION (2-column compact for A5 & A6) */}
        <div
          className={`flex items-start justify-between gap-3 border-b border-gray-300 ${
            isA6 ? 'pb-2.5' : 'pb-3'
          }`}
        >
          {/* Left: Brand & Customer Info */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="text-[#a17822] shrink-0">
                <svg
                  className={isA6 ? 'w-8 h-8' : 'w-10 h-10'}
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  <circle cx="20" cy="20" r="5" />
                  <circle cx="35" cy="12" r="5" />
                  <circle cx="50" cy="8" r="6" />
                  <circle cx="65" cy="12" r="5" />
                  <circle cx="80" cy="20" r="5" />
                  <path d="M 16 30 L 22 68 L 78 68 L 84 30 L 65 50 L 50 25 L 35 50 Z" />
                  <rect x="22" y="74" width="56" height="8" rx="2" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1
                  className={`font-black tracking-tight text-[#8c671b] leading-none uppercase truncate ${
                    isA6 ? 'text-sm' : 'text-lg'
                  }`}
                >
                  {storeName}
                </h1>
                <span
                  className={`font-extrabold tracking-[0.18em] text-[#9a7420] uppercase block mt-0.5 ${
                    isA6 ? 'text-[9px]' : 'text-[10px]'
                  }`}
                >
                  {storeSettings?.receiptTagline || 'GOLD & JEWELLERY'}
                </span>
                {(storeAddressLine || activeTenant?.phone) && (
                  <p className="text-[9.5px] text-gray-500 mt-0.5 leading-tight">
                    {[storeAddressLine, activeTenant?.phone ? `Telp. ${activeTenant.phone}` : '']
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </div>
            </div>

            {/* Customer Metadata */}
            <div className="space-y-0.5 pt-0.5 text-gray-800 text-[10.5px] leading-tight">
              <div className="flex items-baseline flex-wrap gap-x-1 gap-y-0.5">
                <span className="text-gray-500">Pelanggan:</span>
                <span className="font-mono text-gray-900 font-bold">
                  {customerMemberCode || 'Umum'}
                </span>
                <span className="text-gray-900 font-bold">&bull; {customerName}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-700">
                <span className="text-gray-500">Telp/HP:</span>
                <span className="font-mono">{customerPhone}</span>
              </div>
              {customerAddress && (
                <div className="flex items-start gap-1 text-gray-700">
                  <span className="text-gray-500 shrink-0">Alamat:</span>
                  <span className="text-gray-700 line-clamp-2">{customerAddress}</span>
                </div>
              )}
              {isBuyback && buybackData?.customerNik && (
                <div className="flex items-center gap-1 text-gray-700">
                  <span className="text-gray-500">NIK KTP:</span>
                  <span className="font-mono">{buybackData.customerNik}</span>
                </div>
              )}
              {isBuyback && buybackData?.sourceNote && buybackData.sourceNote !== '-' && (
                <div className="flex items-center gap-1 text-gray-700">
                  <span className="text-gray-500">Asal Nota:</span>
                  <span className="font-mono font-semibold">{buybackData.sourceNote}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Barcode & Exact Invoice Meta */}
          <div className="flex flex-col items-end text-right space-y-0.5 shrink-0">
            <div className="bg-white px-1 py-0.5 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
              <svg
                ref={barcodeSvgRef}
                className={isA6 ? 'w-[122px] h-auto block' : 'w-[162px] h-auto block'}
              />
            </div>
            <div
              className={`font-mono font-black tracking-wider text-gray-900 pt-0.5 ${
                isA6 ? 'text-[10px]' : 'text-xs'
              }`}
            >
              {invoiceNo}
            </div>
            <div className="text-[10px] text-gray-600 font-medium tabular-nums">{dateStr}</div>
            <div className="text-[10px] font-bold text-gray-700 max-w-[190px] truncate">
              {branchDisplay}
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className={`${isA6 ? 'my-2.5' : 'my-3'} shrink-0`}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="border-t-2 border-b-2 border-gray-900 text-gray-900 font-black uppercase text-[10px]">
                <th className="py-1.5 px-1 text-center w-10">Jml</th>
                <th className="py-1.5 px-1.5 text-left">Nama Barang</th>
                <th className="py-1.5 px-1.5 text-center w-20">Kdr.</th>
                <th className="py-1.5 px-1.5 text-center w-12">Gr.</th>
                <th className="py-1.5 px-1.5 text-right w-24">Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {isBuyback && buybackData ? (
                buybackData.items && buybackData.items.length > 0 ? (
                  buybackData.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-1.5 px-1 text-center font-bold">1</td>
                      <td className="py-1.5 px-1.5">
                        <div className="font-bold text-gray-900 leading-tight">{it.brandType}</div>
                        <div className="text-[9.5px] text-gray-500 font-normal leading-tight mt-0.5">
                          {it.category} &bull; {it.kondisi}
                          {it.serialNumber ? ` • Seri: ${it.serialNumber}` : ''}
                          {it.certYear ? ` (${it.certYear})` : ''}
                          {it.hargaPerGram > 0 ? ` • ${formatIDR(it.hargaPerGram)}/g` : ''}
                        </div>
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-mono font-bold whitespace-nowrap">
                        {it.kadar}
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-mono font-bold whitespace-nowrap">
                        {it.berat.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-mono font-black text-gray-900 whitespace-nowrap">
                        {formatIDR(it.subtotal).replace('Rp', '').trim()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-1.5 px-1 text-center font-bold">1</td>
                    <td className="py-1.5 px-1.5">
                      <div className="font-bold text-gray-900 leading-tight">
                        {buybackData.itemType} (Buyback)
                      </div>
                      <div className="text-[9.5px] text-gray-500 font-normal leading-tight mt-0.5">
                        {buybackData.kondisi} &bull; Kotor: {buybackData.beratKotor.toFixed(2)}g
                        {buybackData.potonganBatu > 0
                          ? ` • Pot. batu: ${buybackData.potonganBatu.toFixed(2)}g`
                          : ''}
                        {buybackData.hargaPerGram > 0
                          ? ` • ${formatIDR(buybackData.hargaPerGram)}/g`
                          : ''}
                      </div>
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono font-bold whitespace-nowrap">
                      {buybackData.kadar}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono font-bold whitespace-nowrap">
                      {buybackData.beratBersih.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-1.5 text-right font-mono font-black text-gray-900 whitespace-nowrap">
                      {formatIDR(subtotalAmount).replace('Rp', '').trim()}
                    </td>
                  </tr>
                )
              ) : saleData?.items && saleData.items.length > 0 ? (
                saleData.items.map((it, idx) => {
                  const lineTotalWeight = it.berat * it.qty;
                  return (
                    <tr key={`${it.id}-${idx}`}>
                      <td className="py-1.5 px-1 text-center font-bold">{it.qty}</td>
                      <td className="py-1.5 px-1.5">
                        <div className="font-bold text-gray-900 leading-tight">{it.name}</div>
                        <div className="text-[9.5px] text-gray-500 font-mono leading-tight mt-0.5">
                          SKU: {it.sku}
                          {it.qty > 1
                            ? ` • ${it.berat.toFixed(2)}g/pcs × ${formatIDR(it.harga)}`
                            : ''}
                        </div>
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-mono font-bold whitespace-nowrap">
                        {detectSaleItemKadar(it)}
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-mono font-bold whitespace-nowrap">
                        {lineTotalWeight.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-mono font-black text-gray-900 whitespace-nowrap">
                        {formatIDR(it.subtotal).replace('Rp', '').trim()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-3 px-2 text-center text-xs text-gray-400">
                    Rincian item tidak tersedia pada nota ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-b-2 border-gray-900 mt-0.5" />
        </div>

        {/* MIDDLE SECTION: Photo + Real QR + Payment Metadata left, Totals right */}
        <div className="grid grid-cols-12 gap-3 my-1.5 items-center shrink-0">
          {/* Left Column (7 cols): Thumb Photo, QR Code, Payment Details */}
          <div className="col-span-7 flex items-center gap-2 min-w-0">
            <div
              className={`rounded border border-gray-300 p-0.5 bg-white shrink-0 flex items-center justify-center overflow-hidden ${
                isA6 ? 'w-11 h-11' : 'w-13 h-13'
              }`}
            >
              {thumbSrc && !thumbBroken ? (
                <img
                  src={thumbSrc}
                  alt={isBuyback ? 'Foto Emas Buyback' : saleData?.items[0]?.name || 'Produk'}
                  onError={() => setThumbBroken(true)}
                  className="w-full h-full object-cover rounded-xs"
                />
              ) : (
                <div className="w-full h-full rounded-xs bg-amber-50/60 border border-amber-200/70 flex flex-col items-center justify-center text-[#9a7420]">
                  <Gem size={isA6 ? 15 : 18} strokeWidth={1.8} />
                  <span className="text-[7.5px] font-bold uppercase tracking-wider mt-0.5">
                    Emas
                  </span>
                </div>
              )}
            </div>

            <div
              className={`p-0.5 bg-white border border-gray-800 rounded shrink-0 flex items-center justify-center ${
                isA6 ? 'w-11 h-11' : 'w-13 h-13'
              }`}
            >
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR ${invoiceNo}`} className="w-full h-full object-contain" />
              ) : (
                <span className="text-[8px] font-mono text-gray-400 text-center leading-tight">
                  QR
                </span>
              )}
            </div>

            <div className="text-[10px] text-gray-700 space-y-0.5 min-w-0 leading-tight">
              <div className="font-bold text-gray-900 truncate">
                {isBuyback ? 'Pencairan' : 'Bayar'}:{' '}
                <span>
                  {isBuyback && buybackData
                    ? buybackData.paymentMethod === 'transfer'
                      ? `Transfer${buybackData.bankName ? ` (${buybackData.bankName})` : ''}`
                      : 'Tunai Kasir'
                    : saleData
                    ? getSalePaymentMethodLabel(saleData)
                    : '-'}
                </span>
              </div>
              {isBuyback && buybackData ? (
                buybackData.paymentMethod === 'transfer' && buybackData.accountNo ? (
                  <p className="text-[9.5px] font-mono text-gray-600 truncate">
                    Rek: {buybackData.accountNo}
                  </p>
                ) : (
                  <p className="text-[9.5px] text-gray-500">
                    Berat bersih: {buybackData.beratBersih.toFixed(2)} gr
                  </p>
                )
              ) : saleData ? (
                <p className="text-[9.5px] font-mono text-gray-600 truncate">
                  {getSalePaymentReferenceLine(saleData)}
                </p>
              ) : null}
              {!isBuyback && saleData && (
                <p className="text-[9.5px] text-gray-500">
                  Total: {saleData.totalQty} pcs &bull; {saleData.totalBerat.toFixed(2)} gr
                </p>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Subtotal, Tax/Fee, Yellow Highlighted Total */}
          <div className="col-span-5 space-y-1 text-[10.5px] text-right">
            <div className="flex justify-between gap-2 text-gray-700">
              <span className="font-semibold truncate">
                {isBuyback ? 'Nilai Kotor' : 'Subtotal'}
              </span>
              <span className="font-mono font-bold whitespace-nowrap">
                {formatIDR(subtotalAmount).replace('Rp', '').trim()}
              </span>
            </div>

            {isBuyback ? (
              <>
                <div className="flex justify-between gap-2 text-gray-700">
                  <span className="font-semibold truncate">Biaya Lebur</span>
                  <span className="font-mono font-bold whitespace-nowrap">
                    {biayaLeburOrPotongan > 0
                      ? `- ${formatIDR(biayaLeburOrPotongan).replace('Rp', '').trim()}`
                      : '0'}
                  </span>
                </div>
                {buybackData?.pph22 && buybackData.pph22 > 0 ? (
                  <div className="flex justify-between gap-2 text-rose-700">
                    <span className="font-semibold truncate">PPh 22</span>
                    <span className="font-mono font-bold whitespace-nowrap">
                      - {formatIDR(buybackData.pph22).replace('Rp', '').trim()}
                    </span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex justify-between gap-2 text-gray-700">
                <span className="font-semibold truncate">
                  {saleTaxAmount > 0 ? `PPN (${storeSettings?.ppnPercent ?? 11}%)` : 'PPN'}
                </span>
                <span className="font-mono font-bold whitespace-nowrap">
                  {saleTaxAmount > 0 ? formatIDR(saleTaxAmount).replace('Rp', '').trim() : '0'}
                </span>
              </div>
            )}

            <div className="bg-[#d4a017] text-gray-950 px-2.5 py-1.5 rounded font-black flex justify-between items-center gap-2">
              <span className={`uppercase tracking-wider ${isA6 ? 'text-[10px]' : 'text-xs'}`}>
                {isBuyback ? 'TOTAL DITERIMA' : 'TOTAL'}
              </span>
              <span className={`font-mono whitespace-nowrap ${isA6 ? 'text-xs' : 'text-sm'}`}>
                {formatIDR(totalAmount).replace('Rp', '').trim()}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Perhatian Kiri, Tanda Tangan Kanan */}
        <div
          className={`grid grid-cols-12 gap-3 pt-2 border-t border-gray-300 mt-2 shrink-0 ${
            isA6 ? 'text-[8.5px]' : 'text-[9.5px]'
          }`}
        >
          {/* Left: Perhatian / Ketentuan */}
          <div className="col-span-7 space-y-0.5 text-gray-600 leading-snug">
            <p className="font-black text-gray-900 uppercase tracking-wide">Perhatian :</p>
            <ol className="list-decimal pl-3 space-y-0.5">
              <li>Wajib membawa surat ini saat jual kembali atau tukar tambah barang.</li>
              <li>Barang dari {storeName} diterima kembali sesuai ketentuan harga &amp; potongan toko.</li>
              <li>Jika rusak/cacat atau mata hilang dikenakan potongan tambahan sesuai kondisi.</li>
              <li>Pesanan khusus (custom order), batu, dan ongkos lebur tidak dapat dikembalikan.</li>
            </ol>
            {storeSettings?.receiptFooterNote && (
              <p className="mt-1 pt-1 border-t border-gray-200 font-semibold text-gray-800">
                {storeSettings.receiptFooterNote}
              </p>
            )}
          </div>

          {/* Right: Signatures (2 roles cleanly) */}
          <div className="col-span-5 flex flex-col justify-start">
            <p className="text-center font-bold text-gray-800 text-[10px] mb-1">Hormat Kami,</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              {/* Customer Signature Box */}
              <div className="flex flex-col items-center justify-end">
                {isBuyback && buybackData?.ttdNasabah ? (
                  <div className={`${isA6 ? 'h-9' : 'h-12'} w-full flex items-center justify-center overflow-hidden`}>
                    <img
                      src={buybackData.ttdNasabah}
                      alt="TTD Customer"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className={`${isA6 ? 'h-9' : 'h-12'} w-full`} />
                )}
                <div className="border-t border-gray-500 w-full pt-1">
                  <p className="text-[10px] text-gray-800 font-semibold leading-tight">
                    {isBuyback ? 'Customer (Penjual)' : 'Customer (Pembeli)'}
                  </p>
                </div>
              </div>

              {/* Gold Advisor / Cashier Signature Box */}
              <div className="flex flex-col items-center justify-end">
                {isBuyback && buybackData?.ttdPetugas ? (
                  <div className={`${isA6 ? 'h-9' : 'h-12'} w-full flex items-center justify-center overflow-hidden`}>
                    <img
                      src={buybackData.ttdPetugas}
                      alt="TTD Kasir"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className={`${isA6 ? 'h-9' : 'h-12'} w-full`} />
                )}
                <div className="border-t border-gray-500 w-full pt-1">
                  <p className="text-[10px] text-gray-800 font-semibold leading-tight">
                    Kasir / Gold Advisor
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
