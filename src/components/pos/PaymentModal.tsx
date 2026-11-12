import React, { useState } from'react';
import {
  X,
  User,
  Banknote,
  CreditCard,
  Building2,
  QrCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CheckCheck,
  Copy,
  Gem,
  Zap,
} from'lucide-react';
import { CartItem } from'../../types';
import { formatIDR, formatNumber } from'../../utils/formatters';
import { BANK_ACCOUNTS, BankKey } from'../../constants/bankAccounts';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  onConfirmPayment: (paymentData: {
    method:'cash' |'debit' |'transfer' |'qris';
    cashReceived?: number;
    debitBank?: string;
    debitCardLast4?: string;
    debitApprovalCode?: string;
    transferBank?: string;
    transferRef?: string;
  }) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cart,
  subtotal,
  tax,
  grandTotal,
  customerName,
  onCustomerNameChange,
  onConfirmPayment,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' |'debit' |'transfer' |'qris'>('cash');
  const [cashReceived, setCashReceived] = useState<number | string>(grandTotal);
  const [debitBank, setDebitBank] = useState<BankKey>('BCA');
  const [debitCardLast4, setDebitCardLast4] = useState('');
  const [debitApprovalCode, setDebitApprovalCode] = useState(() => `AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
  const [transferBank, setTransferBank] = useState<BankKey>('BCA');
  const [transferRef, setTransferRef] = useState('');
  const [isQrisConfirmed, setIsQrisConfirmed] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch {}
  };

  const handleConfirm = () => {
    const numericCash = typeof cashReceived ==='string' ? parseFloat(cashReceived.replace(/[^0-9]/g,'')) || 0 : cashReceived;
    if (paymentMethod ==='cash' && numericCash < grandTotal) {
      alert(`Nominal pembayaran tunai kurang dari total tagihan (${formatIDR(grandTotal)}).`);
      return;
    }

    onConfirmPayment({
      method: paymentMethod,
      cashReceived: paymentMethod ==='cash' ? numericCash : undefined,
      debitBank: paymentMethod ==='debit' ? debitBank : undefined,
      debitCardLast4: paymentMethod ==='debit' ? debitCardLast4 ||'4921' : undefined,
      debitApprovalCode: paymentMethod ==='debit' ? debitApprovalCode ||'AUTH-829104' : undefined,
      transferBank: paymentMethod ==='transfer' ? transferBank : undefined,
      transferRef: paymentMethod ==='transfer' ? transferRef || `TRF-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">Pembayaran Transaksi</h3>
            <p className="text-xs text-gray-500 mt-0.5">Pilih metode bayar dan selesaikan transaksi kasir</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Total Tagihan Banner */}
          <div className="bg-gradient-to-br from-orange-400 to-red-500 p-4 sm:p-5 rounded-lg text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xs">
            <div>
              <span className="text-xs text-orange-100 font-semibold uppercase tracking-wider block">
                Total Pembayaran
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight font-mono">{formatIDR(grandTotal)}</div>
              <div className="text-xs text-white/90 mt-1 font-medium font-mono">
                {cart.reduce((a, b) => a + b.qty, 0)} Item &bull; Total Berat: {cart.reduce((a, b) => a + b.berat * b.qty, 0).toFixed(2)} g
              </div>
            </div>
            <div className="text-left sm:text-right text-white/95 text-xs sm:text-sm shrink-0 font-medium space-y-1 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-white/20">
              <div>Subtotal: <span className="font-mono">{formatIDR(subtotal)}</span></div>
              <div className="text-xs text-orange-100">PPN (11%): <span className="font-mono">{formatIDR(tax)}</span></div>
            </div>
          </div>

          {/* Customer Name Input */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
              Nama Pelanggan
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={customerName}
                onChange={e => onCustomerNameChange(e.target.value)}
                placeholder="Pelanggan Umum..."
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white font-medium"
              />
            </div>
          </div>

          {/* 4 Payment Methods Selector Tabs */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Metode Pembayaran</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  id: 'cash',
                  title: 'Tunai (Cash)',
                  subtitle: 'Uang Pas / Tunai',
                  icon: Banknote,
                  activeCard: 'border-teal-600 bg-teal-50/30 ring-1 ring-teal-600',
                  iconColor: 'text-teal-600',
                  indicator: 'bg-teal-600',
                },
                {
                  id: 'debit',
                  title: 'Debit EDC',
                  subtitle: 'Kartu Chip / PIN',
                  icon: CreditCard,
                  activeCard: 'border-teal-600 bg-teal-50/30 ring-1 ring-teal-600',
                  iconColor: 'text-teal-600',
                  indicator: 'bg-teal-600',
                },
                {
                  id: 'transfer',
                  title: 'Transfer Bank',
                  subtitle: 'BCA / Mandiri / BRI',
                  icon: Building2,
                  activeCard: 'border-teal-600 bg-teal-50/30 ring-1 ring-teal-600',
                  iconColor: 'text-teal-600',
                  indicator: 'bg-teal-600',
                },
                {
                  id: 'qris',
                  title: 'QRIS Instant',
                  subtitle: 'GPN & E-Wallet',
                  icon: QrCode,
                  activeCard: 'border-teal-600 bg-teal-50/30 ring-1 ring-teal-600',
                  iconColor: 'text-teal-600',
                  indicator: 'bg-teal-600',
                },
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = paymentMethod === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(tab.id as any);
                      if (tab.id === 'cash') {
                        setCashReceived(grandTotal);
                      }
                    }}
                    className={`p-3 rounded-md border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between h-[80px] relative ${
                      isSelected
                        ? tab.activeCard
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-teal-100 ' + tab.iconColor : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? 'border-transparent ' + tab.indicator : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-xs sm:text-sm leading-tight ${
                          isSelected ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
                        }`}
                      >
                        {tab.title}
                      </div>
                      <div className="text-xs text-gray-400 font-medium leading-tight mt-0.5 truncate">
                        {tab.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: CASH / TUNAI */}
          {paymentMethod === 'cash' && (
            <div className="p-4 bg-gray-50/50 rounded-md border border-gray-200 space-y-3">
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1.5">
                  Uang Tunai Diterima
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-base">Rp</span>
                  <input
                    type="text"
                    value={cashReceived !== '' ? formatNumber(cashReceived) : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setCashReceived(raw ? parseInt(raw, 10) : '');
                    }}
                    placeholder={formatNumber(grandTotal)}
                    className="w-full pl-11 pr-4 py-2.5 text-xl sm:text-2xl font-bold text-gray-900 bg-white border border-gray-200 rounded-md outline-none focus:border-teal-500 font-mono tracking-tight"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setCashReceived(grandTotal)}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  Uang Pas
                </button>
                {[
                  Math.ceil(grandTotal / 50000) * 50000,
                  Math.ceil(grandTotal / 100000) * 100000,
                  Math.ceil(grandTotal / 500000) * 500000,
                  Math.ceil(grandTotal / 1000000) * 1000000,
                  grandTotal + 100000,
                ]
                  .filter((v, idx, arr) => v > grandTotal && arr.indexOf(v) === idx)
                  .slice(0, 3)
                  .map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashReceived(val)}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-md text-xs sm:text-sm font-semibold text-gray-700 transition-colors cursor-pointer font-mono"
                    >
                      {formatIDR(val)}
                    </button>
                  ))}
              </div>

              {/* Change Calculation */}
              {(() => {
                const numCash = typeof cashReceived === 'string' ? parseFloat(cashReceived) || 0 : cashReceived;
                const change = numCash - grandTotal;
                return (
                  <div
                    className={`p-3.5 rounded-md border flex items-center justify-between ${
                      change >= 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-semibold text-gray-600">
                      {change >= 0 ? 'Kembalian' : 'Kekurangan Bayar'}
                    </span>
                    <span
                      className={`text-xl font-bold font-mono ${
                        change >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatIDR(Math.abs(change))}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: DEBIT / EDC CARD */}
          {paymentMethod === 'debit' && (
            <div className="p-4 bg-gray-50/50 rounded-md border border-gray-200 space-y-3">
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1.5">Mesin Terminal EDC</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['BCA', 'Mandiri', 'BRI', 'BNI'] as const).map(bank => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setDebitBank(bank)}
                      className={`py-2 px-2.5 text-xs sm:text-sm font-semibold rounded-md border transition-all cursor-pointer text-center ${
                        debitBank === bank
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      EDC {bank}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1">4 Digit Terakhir Kartu</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={debitCardLast4}
                    onChange={e => setDebitCardLast4(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="8821"
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-teal-500 tracking-wider"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1">No. Approval EDC (Struk Fisik)</label>
                  <input
                    type="text"
                    value={debitApprovalCode}
                    onChange={e => setDebitApprovalCode(e.target.value)}
                    placeholder="AUTH-938210"
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-md text-xs text-amber-900 leading-normal flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Verifikasi Kasir:</strong> Gesek kartu di terminal EDC fisik toko, pastikan struk fisik EDC telah keluar, lalu masukkan nomor approval di atas.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSFER BANK */}
          {paymentMethod === 'transfer' && (
            <div className="p-4 bg-gray-50/50 rounded-md border border-gray-200 space-y-3">
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1.5">Bank Tujuan Transfer Toko</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['BCA', 'Mandiri', 'BRI', 'BNI'] as const).map(bank => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setTransferBank(bank)}
                      className={`py-2 px-2.5 text-xs sm:text-sm font-semibold rounded-md border transition-all cursor-pointer text-center ${
                        transferBank === bank
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-md border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Rekening Resmi Toko ({transferBank}):</span>
                  <p className="text-base font-bold text-gray-900 font-mono tracking-wider mt-0.5">
                    {BANK_ACCOUNTS[transferBank].accountNo}
                  </p>
                  <p className="text-xs text-gray-500">{BANK_ACCOUNTS[transferBank].holder}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(BANK_ACCOUNTS[transferBank].accountNo, 'rekening')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-teal-50 text-gray-700 hover:text-teal-700 border border-gray-200 text-xs sm:text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copyFeedback === 'rekening' ? (
                    <CheckCheck size={15} className="text-emerald-600" />
                  ) : (
                    <Copy size={15} />
                  )}
                  {copyFeedback === 'rekening' ? 'Tersalin' : 'Salin'}
                </button>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1">
                  Catatan / No. Referensi Transfer Pelanggan
                </label>
                <input
                  type="text"
                  value={transferRef}
                  onChange={e => setTransferRef(e.target.value)}
                  placeholder="Cth: Ref TRF-839210 / Atas Nama Pengirim"
                  className="w-full px-3 py-2 text-sm font-mono font-medium bg-white border border-gray-200 rounded-md outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-md text-xs text-amber-900 leading-normal flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Verifikasi Kasir:</strong> Cek mutasi rekening toko/m-Banking terlebih dahulu untuk memastikan dana dari pelanggan sudah masuk.
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: QRIS */}
          {paymentMethod === 'qris' && (
            <div className="p-4 bg-gray-50/50 rounded-md border border-gray-200 flex flex-col items-center">
              <div className="bg-white p-4 rounded-md border border-gray-200 max-w-xs w-full flex flex-col items-center text-center shadow-xs">
                <div className="w-full flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                  <span className="font-bold text-gray-900 tracking-tight text-xs sm:text-sm">QRIS GPN</span>
                  <span className="text-xs bg-gray-100 text-gray-700 font-mono px-2 py-0.5 rounded">
                    NMID: ID102003928192
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-gray-800">e.paper</p>
                <p className="text-xs text-gray-400">Toko Perhiasan & Logam Mulia</p>

                {/* Simulated QR Code SVG */}
                <div className="my-2.5 p-2 bg-white border border-gray-900 rounded-md relative">
                  <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="5" width="28" height="28" rx="4" fill="#111827" />
                    <rect x="9" y="9" width="20" height="20" rx="2" fill="white" />
                    <rect x="13" y="13" width="12" height="12" rx="1" fill="#111827" />
                    <rect x="67" y="5" width="28" height="28" rx="4" fill="#111827" />
                    <rect x="71" y="9" width="20" height="20" rx="2" fill="white" />
                    <rect x="75" y="13" width="12" height="12" rx="1" fill="#111827" />
                    <rect x="5" y="67" width="28" height="28" rx="4" fill="#111827" />
                    <rect x="9" y="71" width="20" height="20" rx="2" fill="white" />
                    <rect x="13" y="75" width="12" height="12" rx="1" fill="#111827" />
                    <rect x="38" y="8" width="8" height="8" fill="#111827" />
                    <rect x="50" y="8" width="6" height="6" fill="#111827" />
                    <rect x="38" y="20" width="6" height="6" fill="#111827" />
                    <rect x="48" y="20" width="12" height="6" fill="#111827" />
                    <rect x="8" y="38" width="6" height="12" fill="#111827" />
                    <rect x="18" y="38" width="8" height="6" fill="#111827" />
                    <rect x="28" y="38" width="6" height="6" fill="#111827" />
                    <rect x="38" y="38" width="24" height="24" rx="4" fill="#ea580c" />
                    <rect x="66" y="38" width="8" height="8" fill="#111827" />
                    <rect x="78" y="38" width="14" height="6" fill="#111827" />
                    <rect x="66" y="50" width="12" height="12" fill="#111827" />
                    <rect x="82" y="50" width="10" height="8" fill="#111827" />
                    <rect x="38" y="66" width="10" height="10" fill="#111827" />
                    <rect x="52" y="66" width="8" height="6" fill="#111827" />
                    <rect x="66" y="66" width="26" height="8" fill="#111827" />
                    <rect x="38" y="80" width="6" height="12" fill="#111827" />
                    <rect x="48" y="82" width="14" height="10" fill="#111827" />
                    <rect x="66" y="78" width="10" height="14" fill="#111827" />
                    <rect x="80" y="78" width="12" height="14" fill="#111827" />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-white flex items-center justify-center border border-orange-200">
                    <Gem size={14} className="text-orange-500" />
                  </div>
                </div>

                <div className="w-full bg-gray-50 p-2.5 rounded-md border border-gray-100 mb-2.5 text-center">
                  <span className="text-xs text-gray-500 font-medium block">Nominal Pas:</span>
                  <p className="text-base font-bold text-gray-900 font-mono">{formatIDR(grandTotal)}</p>
                </div>

                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-md text-xs text-amber-900 leading-normal text-left flex items-center gap-1.5 w-full">
                  <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                  <span>Minta pelanggan scan QRIS & periksa notifikasi masuk di aplikasi merchant.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:px-5 sm:py-3.5 bg-gray-50/80 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-10 px-5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm rounded-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <CheckCircle2 size={17} />
            Konfirmasi Pembayaran ({formatIDR(grandTotal)})
          </button>
        </div>
      </div>
    </div>
  );
};
