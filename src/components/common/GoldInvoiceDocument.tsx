import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gem } from 'lucide-react';
import {
  BuybackItem,
  ReceiptLogoPreset,
  ReceiptPaperSize,
  ReceiptTheme,
  StoreSettings,
  Tenant,
  Transaction,
  TransactionItem,
} from '../../types';
import { formatIDR } from '../../utils/formatters';
import { createQrCodeDataUrl, renderCode128ToSvg } from '../../utils/barcode';

export type { ReceiptPaperSize };

interface GoldInvoiceDocumentProps {
  receipt: Transaction | BuybackItem;
  type?: 'sale' | 'buyback';
  id?: string;
  activeTenant?: Tenant;
  storeSettings?: StoreSettings;
  paperSize?: ReceiptPaperSize;
}

const DEFAULT_TERMS_LINES = [
  'Wajib membawa surat ini saat jual kembali atau tukar tambah barang.',
  'Barang dari {TOKO} diterima kembali sesuai ketentuan harga & potongan toko.',
  'Jika rusak/cacat atau mata hilang dikenakan potongan tambahan sesuai kondisi.',
  'Pesanan khusus (custom order), batu, dan ongkos lebur tidak dapat dikembalikan.',
];

interface ThemePalette {
  brandText: string;
  taglineText: string;
  emblemText: string;
  monogramBg: string;
  monogramText: string;
  docTitleBar: string;
  totalBox: string;
  fallbackThumbBg: string;
  fallbackThumbBorder: string;
  fallbackThumbText: string;
}

const RECEIPT_THEMES: Record<ReceiptTheme, ThemePalette> = {
  classic_gold: {
    brandText: 'text-[#8c671b]',
    taglineText: 'text-[#9a7420]',
    emblemText: 'text-[#a17822]',
    monogramBg: 'bg-[#8c671b]',
    monogramText: 'text-amber-50',
    docTitleBar: 'bg-amber-50/90 text-[#8c671b] border-amber-200/90',
    totalBox: 'bg-[#d4a017] text-gray-950',
    fallbackThumbBg: 'bg-amber-50/60',
    fallbackThumbBorder: 'border-amber-200/70',
    fallbackThumbText: 'text-[#9a7420]',
  },
  royal_emerald: {
    brandText: 'text-emerald-800',
    taglineText: 'text-emerald-700',
    emblemText: 'text-emerald-700',
    monogramBg: 'bg-emerald-800',
    monogramText: 'text-emerald-50',
    docTitleBar: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    totalBox: 'bg-emerald-700 text-white',
    fallbackThumbBg: 'bg-emerald-50/70',
    fallbackThumbBorder: 'border-emerald-200',
    fallbackThumbText: 'text-emerald-700',
  },
  midnight_navy: {
    brandText: 'text-slate-900',
    taglineText: 'text-slate-600',
    emblemText: 'text-slate-700',
    monogramBg: 'bg-slate-900',
    monogramText: 'text-slate-50',
    docTitleBar: 'bg-slate-100 text-slate-800 border-slate-300',
    totalBox: 'bg-slate-900 text-white',
    fallbackThumbBg: 'bg-slate-100',
    fallbackThumbBorder: 'border-slate-300',
    fallbackThumbText: 'text-slate-700',
  },
  rose_gold: {
    brandText: 'text-rose-900',
    taglineText: 'text-rose-700',
    emblemText: 'text-rose-700',
    monogramBg: 'bg-rose-800',
    monogramText: 'text-rose-50',
    docTitleBar: 'bg-rose-50 text-rose-800 border-rose-200',
    totalBox: 'bg-rose-700 text-white',
    fallbackThumbBg: 'bg-rose-50/70',
    fallbackThumbBorder: 'border-rose-200',
    fallbackThumbText: 'text-rose-700',
  },
  monochrome: {
    brandText: 'text-gray-950',
    taglineText: 'text-gray-700',
    emblemText: 'text-gray-800',
    monogramBg: 'bg-gray-950',
    monogramText: 'text-white',
    docTitleBar: 'bg-gray-100 text-gray-900 border-gray-400',
    totalBox: 'bg-gray-950 text-white',
    fallbackThumbBg: 'bg-gray-100',
    fallbackThumbBorder: 'border-gray-300',
    fallbackThumbText: 'text-gray-700',
  },
};

function getWatermarkOpacityClass(percent: number): string {
  if (percent <= 3) return 'opacity-[0.03]';
  if (percent <= 5) return 'opacity-[0.05]';
  if (percent <= 7) return 'opacity-[0.07]';
  if (percent <= 10) return 'opacity-[0.10]';
  if (percent <= 14) return 'opacity-[0.14]';
  return 'opacity-[0.18]';
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

const CrownGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
    <circle cx="20" cy="20" r="5" />
    <circle cx="35" cy="12" r="5" />
    <circle cx="50" cy="8" r="6" />
    <circle cx="65" cy="12" r="5" />
    <circle cx="80" cy="20" r="5" />
    <path d="M 16 30 L 22 68 L 78 68 L 84 30 L 65 50 L 50 25 L 35 50 Z" />
    <rect x="22" y="74" width="56" height="8" rx="2" />
  </svg>
);

const DiamondGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinejoin="round" aria-hidden="true">
    <polygon points="24,18 76,18 92,40 50,86 8,40" fill="currentColor" fillOpacity="0.14" />
    <polygon points="24,18 76,18 92,40 50,86 8,40" />
    <line x1="8" y1="40" x2="92" y2="40" />
    <polyline points="24,18 36,40 50,86 64,40 76,18" />
    <line x1="50" y1="18" x2="50" y2="40" />
  </svg>
);

export const GoldInvoiceDocument: React.FC<GoldInvoiceDocumentProps> = ({
  receipt,
  type = 'sale',
  id,
  activeTenant,
  storeSettings,
  paperSize,
}) => {
  const effectivePaperSize: ReceiptPaperSize =
    paperSize || storeSettings?.receiptDefaultPaperSize || 'a5';
  const isBuyback = type === 'buyback';
  const isA6 = effectivePaperSize === 'a6';
  const isThermal80 = effectivePaperSize === '80mm';
  const buybackData = isBuyback ? (receipt as BuybackItem) : null;
  const saleData = !isBuyback ? (receipt as Transaction) : null;

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [thumbBroken, setThumbBroken] = useState(false);
  const [customLogoBroken, setCustomLogoBroken] = useState(false);

  const themeKey: ReceiptTheme = storeSettings?.receiptTheme || 'classic_gold';
  const palette = RECEIPT_THEMES[themeKey] || RECEIPT_THEMES.classic_gold;
  const logoPreset: ReceiptLogoPreset = storeSettings?.receiptLogoPreset || 'crown';
  const customLogoUrl = storeSettings?.receiptCustomLogoUrl || '';

  const showWatermark = storeSettings?.receiptShowWatermark ?? true;
  const watermarkOpacityClass = getWatermarkOpacityClass(storeSettings?.receiptWatermarkOpacity ?? 6);
  const showStoreAddress = storeSettings?.receiptShowStoreAddress ?? true;
  const showBarcode = storeSettings?.receiptShowBarcode ?? true;
  const showQrCode = storeSettings?.receiptShowQrCode ?? true;
  const showPhoto = storeSettings?.receiptShowPhoto ?? true;
  const showItemSku = storeSettings?.receiptShowItemSku ?? true;
  const showTaxLine = storeSettings?.receiptShowTaxLine ?? true;
  const showCashierName = storeSettings?.receiptShowCashierName ?? true;
  const showTerms = storeSettings?.receiptShowTerms ?? true;
  const showSignatures = storeSettings?.receiptShowSignatures ?? true;

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
  const cashierName = isBuyback ? buybackData?.cashierName : saleData?.cashier;

  const dateStr = isBuyback
    ? [buybackData?.date, buybackData?.timeStr].filter(Boolean).join(' • ') || '-'
    : [saleData?.dateStr, saleData?.timeStr].filter(Boolean).join(', ') || '-';

  const storeName = activeTenant?.name || 'Toko Emas';
  const storeMonogram = useMemo(() => {
    if (activeTenant?.logoInitial) return activeTenant.logoInitial.slice(0, 2).toUpperCase();
    const parts = storeName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return storeName.slice(0, 2).toUpperCase() || 'TE';
  }, [activeTenant?.logoInitial, storeName]);

  const branchDisplay = isBuyback
    ? buybackData?.branchName ||
      (activeTenant ? `${activeTenant.name} • ${activeTenant.branchName}` : storeName)
    : activeTenant
    ? `${activeTenant.name} • ${activeTenant.branchName}`
    : storeName;
  const storeAddressLine = [activeTenant?.address, activeTenant?.city]
    .filter(Boolean)
    .join(', ');

  const docTitle = isBuyback
    ? storeSettings?.receiptBuybackTitle ?? 'SURAT PEMBELIAN KEMBALI (BUYBACK)'
    : storeSettings?.receiptSaleTitle ?? 'FAKTUR PENJUALAN EMAS';

  const termsTitle = storeSettings?.receiptTermsTitle || 'Perhatian :';
  const termsLines = useMemo(() => {
    const raw = storeSettings?.receiptTermsText?.trim();
    const lines = raw
      ? raw
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
      : DEFAULT_TERMS_LINES;
    return lines.map(line => line.replace(/\{TOKO\}/gi, storeName));
  }, [storeSettings?.receiptTermsText, storeName]);

  const signatureGreeting = storeSettings?.receiptSignatureGreeting || 'Hormat Kami,';
  const customerSignLabel = storeSettings?.receiptCustomerSignLabel?.trim() || 'Customer';
  const cashierSignLabel = storeSettings?.receiptCashierSignLabel?.trim() || 'Kasir / Gold Advisor';
  const formattedCustomerSignLabel = isBuyback
    ? `${customerSignLabel} (Penjual)`
    : `${customerSignLabel} (Pembeli)`;

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
    setCustomLogoBroken(false);
  }, [customLogoUrl]);

  useEffect(() => {
    if (!showBarcode) return;
    renderCode128ToSvg(barcodeSvgRef.current, invoiceNo, {
      height: isThermal80 ? 20 : isA6 ? 22 : 26,
      barWidth: isThermal80 ? 1.1 : isA6 ? 1.15 : 1.3,
      fontSize: 9,
      displayValue: false,
    });
  }, [invoiceNo, isA6, isThermal80, showBarcode]);

  const qrPayload = useMemo(() => {
    const docTag = isBuyback ? 'BUYBACK' : 'SALE';
    const tenantTag = activeTenant?.code || 'STORE';
    return `${tenantTag}|${docTag}|${invoiceNo}|${customerName}|${totalAmount}`;
  }, [isBuyback, activeTenant?.code, invoiceNo, customerName, totalAmount]);

  useEffect(() => {
    if (!showQrCode) return;
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
  }, [qrPayload, showQrCode]);

  const isVoid = receipt.status === 'void';

  const renderBrandLogo = (sizeClass: string, isWatermark = false) => {
    if (logoPreset === 'none') {
      return isWatermark ? <CrownGlyph className={sizeClass} /> : null;
    }
    if (logoPreset === 'custom' && customLogoUrl && !customLogoBroken) {
      return (
        <img
          src={customLogoUrl}
          alt={storeName}
          onError={() => {
            if (!isWatermark) setCustomLogoBroken(true);
          }}
          className={`${sizeClass} object-contain`}
        />
      );
    }
    if (logoPreset === 'diamond') {
      return <DiamondGlyph className={sizeClass} />;
    }
    if (logoPreset === 'monogram') {
      return (
        <div
          className={`${sizeClass} rounded-lg ${palette.monogramBg} ${palette.monogramText} flex items-center justify-center font-black tracking-tight`}
        >
          <span className={isWatermark ? 'text-4xl' : isThermal80 ? 'text-xs' : isA6 ? 'text-xs' : 'text-sm'}>
            {storeMonogram}
          </span>
        </div>
      );
    }
    return <CrownGlyph className={sizeClass} />;
  };

  return (
    <div
      id={id}
      data-paper={effectivePaperSize}
      className={`gold-invoice-sheet relative bg-white text-gray-900 font-sans rounded-lg border border-gray-200 w-full mx-auto leading-snug select-none ${
        isThermal80
          ? 'max-w-[320px] p-3 text-[10px]'
          : isA6
          ? 'max-w-[460px] p-3 sm:p-4 text-[10px]'
          : 'max-w-[680px] p-4 sm:p-5 text-[11px]'
      }`}
    >
      {/* CENTER WATERMARK */}
      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden rounded-lg">
          <div className={`flex flex-col items-center ${watermarkOpacityClass} transform -rotate-12 text-center`}>
            <div className={palette.emblemText}>
              {renderBrandLogo(
                isThermal80 ? 'w-24 h-24' : isA6 ? 'w-32 h-32' : 'w-44 h-44',
                true
              )}
            </div>
            <span
              className={`font-black tracking-widest uppercase mt-1 ${palette.emblemText} ${
                isThermal80 ? 'text-base' : isA6 ? 'text-xl' : 'text-2xl'
              }`}
            >
              {storeName}
            </span>
            <span className={`text-[10px] font-bold tracking-[0.2em] ${palette.emblemText} uppercase mt-0.5`}>
              {storeSettings?.receiptTagline || 'GOLD & JEWELLERY'}
            </span>
          </div>
        </div>
      )}

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
        {/* OPTIONAL DOCUMENT TYPE TITLE BAR */}
        {docTitle.trim().length > 0 && (
          <div
            className={`mb-2 px-2.5 py-1 rounded border text-center font-black uppercase tracking-[0.16em] ${
              palette.docTitleBar
            } ${isThermal80 ? 'text-[9px]' : 'text-[9.5px]'}`}
          >
            {docTitle}
          </div>
        )}

        {/* HEADER SECTION */}
        {isThermal80 ? (
          /* Thermal 80mm Stacked Header */
          <div className="space-y-2 border-b border-dashed border-gray-400 pb-2.5">
            <div className="flex flex-col items-center text-center">
              {logoPreset !== 'none' && (
                <div className={`${palette.emblemText} mb-1`}>
                  {renderBrandLogo('w-8 h-8')}
                </div>
              )}
              <h1 className={`font-black tracking-tight ${palette.brandText} text-sm uppercase`}>
                {storeName}
              </h1>
              <span className={`font-extrabold tracking-[0.16em] ${palette.taglineText} uppercase text-[8.5px] mt-0.5`}>
                {storeSettings?.receiptTagline || 'GOLD & JEWELLERY'}
              </span>
              {showStoreAddress && (storeAddressLine || activeTenant?.phone) && (
                <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                  {[storeAddressLine, activeTenant?.phone ? `Telp. ${activeTenant.phone}` : '']
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              )}
              {storeSettings?.receiptHeaderExtra && (
                <p className="text-[8.5px] text-gray-600 font-medium mt-0.5">
                  {storeSettings.receiptHeaderExtra}
                </p>
              )}
            </div>

            {showBarcode && (
              <div className="flex flex-col items-center pt-1">
                <div className="bg-white px-1 py-0.5 rounded border border-gray-200">
                  <svg ref={barcodeSvgRef} className="w-[140px] h-auto block" />
                </div>
              </div>
            )}

            <div className="space-y-0.5 text-[9.5px] text-gray-800 pt-1 border-t border-dashed border-gray-300">
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">No. Nota</span>
                <span className="font-mono font-bold text-gray-900">{invoiceNo}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Tanggal</span>
                <span className="tabular-nums text-gray-700">{dateStr}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Cabang</span>
                <span className="font-semibold text-gray-800 truncate">{branchDisplay}</span>
              </div>
              {showCashierName && cashierName && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Kasir</span>
                  <span className="font-semibold text-gray-800">{cashierName}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Pelanggan</span>
                <span className="font-bold text-gray-900 text-right">
                  {customerMemberCode ? `${customerMemberCode} • ` : ''}
                  {customerName}
                </span>
              </div>
              {customerPhone && customerPhone !== '-' && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Telp/HP</span>
                  <span className="font-mono text-gray-700">{customerPhone}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Standard 2-column A5 & A6 Header */
          <div
            className={`flex items-start justify-between gap-3 border-b border-gray-300 ${
              isA6 ? 'pb-2.5' : 'pb-3'
            }`}
          >
            {/* Left: Brand & Customer Info */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                {logoPreset !== 'none' && (
                  <div className={`${palette.emblemText} shrink-0`}>
                    {renderBrandLogo(isA6 ? 'w-8 h-8' : 'w-10 h-10')}
                  </div>
                )}
                <div className="min-w-0">
                  <h1
                    className={`font-black tracking-tight ${palette.brandText} leading-none uppercase truncate ${
                      isA6 ? 'text-sm' : 'text-lg'
                    }`}
                  >
                    {storeName}
                  </h1>
                  <span
                    className={`font-extrabold tracking-[0.18em] ${palette.taglineText} uppercase block mt-0.5 ${
                      isA6 ? 'text-[9px]' : 'text-[10px]'
                    }`}
                  >
                    {storeSettings?.receiptTagline || 'GOLD & JEWELLERY'}
                  </span>
                  {showStoreAddress && (storeAddressLine || activeTenant?.phone) && (
                    <p className="text-[9.5px] text-gray-500 mt-0.5 leading-tight">
                      {[storeAddressLine, activeTenant?.phone ? `Telp. ${activeTenant.phone}` : '']
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  )}
                  {storeSettings?.receiptHeaderExtra && (
                    <p className="text-[9px] text-gray-600 font-medium mt-0.5 leading-tight">
                      {storeSettings.receiptHeaderExtra}
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
              {showBarcode && (
                <div className="bg-white px-1 py-0.5 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                  <svg
                    ref={barcodeSvgRef}
                    className={isA6 ? 'w-[122px] h-auto block' : 'w-[162px] h-auto block'}
                  />
                </div>
              )}
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
              {showCashierName && cashierName && (
                <div className="text-[9.5px] text-gray-500">
                  Kasir: <span className="font-semibold text-gray-700">{cashierName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TABLE SECTION */}
        <div className={`${isThermal80 || isA6 ? 'my-2.5' : 'my-3'} shrink-0`}>
          <table className={`w-full border-collapse ${isThermal80 ? 'text-[9.5px]' : 'text-[10.5px]'}`}>
            <thead>
              <tr
                className={`border-t-2 border-b-2 border-gray-900 text-gray-900 font-black uppercase ${
                  isThermal80 ? 'text-[9px]' : 'text-[10px]'
                }`}
              >
                <th className="py-1.5 px-1 text-center w-8">Jml</th>
                <th className="py-1.5 px-1 text-left">Nama Barang</th>
                {!isThermal80 && <th className="py-1.5 px-1.5 text-center w-20">Kdr.</th>}
                <th className="py-1.5 px-1 text-center w-11">Gr.</th>
                <th className="py-1.5 px-1 text-right w-20">Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {isBuyback && buybackData ? (
                buybackData.items && buybackData.items.length > 0 ? (
                  buybackData.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-1.5 px-1 text-center font-bold">1</td>
                      <td className="py-1.5 px-1">
                        <div className="font-bold text-gray-900 leading-tight">{it.brandType}</div>
                        <div className="text-[9px] text-gray-500 font-normal leading-tight mt-0.5">
                          {isThermal80 ? `${it.kadar} • ` : ''}
                          {it.category} &bull; {it.kondisi}
                          {showItemSku && it.serialNumber ? ` • Seri: ${it.serialNumber}` : ''}
                          {showItemSku && it.certYear ? ` (${it.certYear})` : ''}
                          {it.hargaPerGram > 0 ? ` • ${formatIDR(it.hargaPerGram)}/g` : ''}
                        </div>
                      </td>
                      {!isThermal80 && (
                        <td className="py-1.5 px-1.5 text-center font-mono font-bold whitespace-nowrap">
                          {it.kadar}
                        </td>
                      )}
                      <td className="py-1.5 px-1 text-center font-mono font-bold whitespace-nowrap tabular-nums">
                        {it.berat.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-black text-gray-900 whitespace-nowrap tabular-nums">
                        {formatIDR(it.subtotal).replace('Rp', '').trim()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-1.5 px-1 text-center font-bold">1</td>
                    <td className="py-1.5 px-1">
                      <div className="font-bold text-gray-900 leading-tight">
                        {buybackData.itemType} (Buyback)
                      </div>
                      <div className="text-[9px] text-gray-500 font-normal leading-tight mt-0.5">
                        {isThermal80 ? `${buybackData.kadar} • ` : ''}
                        {buybackData.kondisi} &bull; Kotor: {buybackData.beratKotor.toFixed(2)}g
                        {buybackData.potonganBatu > 0
                          ? ` • Pot. batu: ${buybackData.potonganBatu.toFixed(2)}g`
                          : ''}
                        {buybackData.hargaPerGram > 0
                          ? ` • ${formatIDR(buybackData.hargaPerGram)}/g`
                          : ''}
                      </div>
                    </td>
                    {!isThermal80 && (
                      <td className="py-1.5 px-1.5 text-center font-mono font-bold whitespace-nowrap">
                        {buybackData.kadar}
                      </td>
                    )}
                    <td className="py-1.5 px-1 text-center font-mono font-bold whitespace-nowrap tabular-nums">
                      {buybackData.beratBersih.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-1 text-right font-mono font-black text-gray-900 whitespace-nowrap tabular-nums">
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
                      <td className="py-1.5 px-1">
                        <div className="font-bold text-gray-900 leading-tight">{it.name}</div>
                        {(showItemSku || isThermal80) && (
                          <div className="text-[9px] text-gray-500 font-mono leading-tight mt-0.5">
                            {isThermal80 ? `${detectSaleItemKadar(it)}` : ''}
                            {isThermal80 && showItemSku ? ' • ' : ''}
                            {showItemSku ? `SKU: ${it.sku}` : ''}
                            {it.qty > 1
                              ? ` • ${it.berat.toFixed(2)}g × ${formatIDR(it.harga)}`
                              : ''}
                          </div>
                        )}
                      </td>
                      {!isThermal80 && (
                        <td className="py-1.5 px-1.5 text-center font-mono font-bold whitespace-nowrap">
                          {detectSaleItemKadar(it)}
                        </td>
                      )}
                      <td className="py-1.5 px-1 text-center font-mono font-bold whitespace-nowrap tabular-nums">
                        {lineTotalWeight.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-black text-gray-900 whitespace-nowrap tabular-nums">
                        {formatIDR(it.subtotal).replace('Rp', '').trim()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isThermal80 ? 4 : 5} className="py-3 px-2 text-center text-xs text-gray-400">
                    Rincian item tidak tersedia pada nota ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-b-2 border-gray-900 mt-0.5" />
        </div>

        {/* MIDDLE SECTION: Photo + Real QR + Payment Metadata, Totals */}
        <div
          className={
            isThermal80
              ? 'space-y-2.5 my-1.5 shrink-0'
              : 'grid grid-cols-12 gap-3 my-1.5 items-center shrink-0'
          }
        >
          {/* Totals on top for Thermal 80mm, Right Column for A5/A6 */}
          <div className={isThermal80 ? 'space-y-1 text-[10px]' : 'col-span-5 col-start-8 order-2 space-y-1 text-[10.5px] text-right'}>
            <div className="flex justify-between gap-2 text-gray-700">
              <span className="font-semibold truncate">
                {isBuyback ? 'Nilai Kotor' : 'Subtotal'}
              </span>
              <span className="font-mono font-bold whitespace-nowrap tabular-nums">
                {formatIDR(subtotalAmount).replace('Rp', '').trim()}
              </span>
            </div>

            {isBuyback ? (
              <>
                <div className="flex justify-between gap-2 text-gray-700">
                  <span className="font-semibold truncate">Biaya Lebur</span>
                  <span className="font-mono font-bold whitespace-nowrap tabular-nums">
                    {biayaLeburOrPotongan > 0
                      ? `- ${formatIDR(biayaLeburOrPotongan).replace('Rp', '').trim()}`
                      : '0'}
                  </span>
                </div>
                {buybackData?.pph22 && buybackData.pph22 > 0 ? (
                  <div className="flex justify-between gap-2 text-rose-700">
                    <span className="font-semibold truncate">PPh 22</span>
                    <span className="font-mono font-bold whitespace-nowrap tabular-nums">
                      - {formatIDR(buybackData.pph22).replace('Rp', '').trim()}
                    </span>
                  </div>
                ) : null}
              </>
            ) : showTaxLine ? (
              <div className="flex justify-between gap-2 text-gray-700">
                <span className="font-semibold truncate">
                  {saleTaxAmount > 0 ? `PPN (${storeSettings?.ppnPercent ?? 11}%)` : 'PPN'}
                </span>
                <span className="font-mono font-bold whitespace-nowrap tabular-nums">
                  {saleTaxAmount > 0 ? formatIDR(saleTaxAmount).replace('Rp', '').trim() : '0'}
                </span>
              </div>
            ) : null}

            <div
              className={`${palette.totalBox} px-2.5 py-1.5 rounded font-black flex justify-between items-center gap-2`}
            >
              <span className={`uppercase tracking-wider ${isA6 || isThermal80 ? 'text-[10px]' : 'text-xs'}`}>
                {isBuyback ? 'TOTAL DITERIMA' : 'TOTAL'}
              </span>
              <span className={`font-mono whitespace-nowrap tabular-nums ${isA6 || isThermal80 ? 'text-xs' : 'text-sm'}`}>
                {formatIDR(totalAmount).replace('Rp', '').trim()}
              </span>
            </div>
          </div>

          {/* Left Column (A5/A6) / Secondary Info (Thermal 80mm): Thumb Photo, QR Code, Payment Details */}
          <div className={isThermal80 ? 'flex items-center gap-2 pt-1.5 border-t border-dashed border-gray-300' : 'col-span-7 col-start-1 order-1 flex items-center gap-2 min-w-0'}>
            {showPhoto && (
              <div
                className={`rounded border border-gray-300 p-0.5 bg-white shrink-0 flex items-center justify-center overflow-hidden ${
                  isThermal80 || isA6 ? 'w-11 h-11' : 'w-13 h-13'
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
                  <div
                    className={`w-full h-full rounded-xs ${palette.fallbackThumbBg} border ${palette.fallbackThumbBorder} flex flex-col items-center justify-center ${palette.fallbackThumbText}`}
                  >
                    <Gem size={isA6 || isThermal80 ? 15 : 18} strokeWidth={1.8} />
                    <span className="text-[7.5px] font-bold uppercase tracking-wider mt-0.5">
                      Emas
                    </span>
                  </div>
                )}
              </div>
            )}

            {showQrCode && (
              <div
                className={`p-0.5 bg-white border border-gray-800 rounded shrink-0 flex items-center justify-center ${
                  isThermal80 || isA6 ? 'w-11 h-11' : 'w-13 h-13'
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
            )}

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
        </div>

        {/* BOTTOM SECTION: Terms & Signatures */}
        {(showTerms || Boolean(storeSettings?.receiptFooterNote) || showSignatures) && (
          <div
            className={`${
              isThermal80
                ? 'space-y-3 pt-2 border-t border-dashed border-gray-400 mt-2 text-[8.5px]'
                : `grid grid-cols-12 gap-3 pt-2 border-t border-gray-300 mt-2 ${
                    isA6 ? 'text-[8.5px]' : 'text-[9.5px]'
                  }`
            } shrink-0`}
          >
            {/* Terms & Footer Note */}
            {(showTerms || Boolean(storeSettings?.receiptFooterNote)) && (
              <div
                className={`${
                  isThermal80
                    ? 'space-y-1 text-gray-600 leading-snug'
                    : `${showSignatures ? 'col-span-7' : 'col-span-12'} space-y-0.5 text-gray-600 leading-snug`
                }`}
              >
                {showTerms && termsLines.length > 0 && (
                  <>
                    <p className="font-black text-gray-900 uppercase tracking-wide">{termsTitle}</p>
                    <ol className="list-decimal pl-3 space-y-0.5">
                      {termsLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ol>
                  </>
                )}
                {storeSettings?.receiptFooterNote && (
                  <p
                    className={`${
                      showTerms && termsLines.length > 0 ? 'mt-1 pt-1 border-t border-gray-200' : ''
                    } font-semibold text-gray-800 whitespace-pre-line`}
                  >
                    {storeSettings.receiptFooterNote}
                  </p>
                )}
              </div>
            )}

            {/* Signatures */}
            {showSignatures && (
              <div
                className={`${
                  isThermal80
                    ? 'flex flex-col pt-1'
                    : `${
                        showTerms || Boolean(storeSettings?.receiptFooterNote)
                          ? 'col-span-5'
                          : 'col-span-12'
                      } flex flex-col justify-start`
                }`}
              >
                <p className="text-center font-bold text-gray-800 text-[10px] mb-1">
                  {signatureGreeting}
                </p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {/* Customer Signature Box */}
                  <div className="flex flex-col items-center justify-end">
                    {isBuyback && buybackData?.ttdNasabah ? (
                      <div
                        className={`${
                          isThermal80 || isA6 ? 'h-9' : 'h-12'
                        } w-full flex items-center justify-center overflow-hidden`}
                      >
                        <img
                          src={buybackData.ttdNasabah}
                          alt="TTD Customer"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className={`${isThermal80 || isA6 ? 'h-9' : 'h-12'} w-full`} />
                    )}
                    <div className="border-t border-gray-500 w-full pt-1">
                      <p className="text-[9.5px] text-gray-800 font-semibold leading-tight">
                        {formattedCustomerSignLabel}
                      </p>
                    </div>
                  </div>

                  {/* Gold Advisor / Cashier Signature Box */}
                  <div className="flex flex-col items-center justify-end">
                    {isBuyback && buybackData?.ttdPetugas ? (
                      <div
                        className={`${
                          isThermal80 || isA6 ? 'h-9' : 'h-12'
                        } w-full flex items-center justify-center overflow-hidden`}
                      >
                        <img
                          src={buybackData.ttdPetugas}
                          alt="TTD Kasir"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className={`${isThermal80 || isA6 ? 'h-9' : 'h-12'} w-full`} />
                    )}
                    <div className="border-t border-gray-500 w-full pt-1">
                      <p className="text-[9.5px] text-gray-800 font-semibold leading-tight">
                        {cashierSignLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
