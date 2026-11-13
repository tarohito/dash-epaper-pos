import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Barcode,
  Volume2,
  VolumeX,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Product } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { posApi } from '../../services/api';
import { extractBarcodeValue } from '../../utils/barcode';
import { useToast } from '../../contexts/ToastContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCode: (code: string) => Promise<Product | null>;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  scanCount: number;
  totalCartQty: number;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanCode,
  isSoundEnabled,
  onToggleSound,
  scanCount,
  totalCartQty,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [sampleProducts, setSampleProducts] = useState<Product[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'not-found'>('idle');
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { showToast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const lastDecodedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  useEffect(() => {
    if (isOpen) {
      setInputVal('');
      setScanStatus('idle');
      setCameraError(null);
      const timer = setTimeout(() => inputRef.current?.focus(), 80);

      const controller = new AbortController();
      setIsLoadingSamples(true);
      posApi
        .getProducts({ page: 1, pageSize: 24 }, controller.signal)
        .then(res => {
          setSampleProducts(res.items);
          setTotalAvailable(res.totalAllProducts);
          setIsLoadingSamples(false);
        })
        .catch(err => {
          if ((err as Error).name !== 'AbortError') {
            showToast('error', err instanceof Error ? err.message : 'Gagal memuat daftar SKU.');
          }
          setIsLoadingSamples(false);
        });

      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    } else {
      setIsCameraActive(false);
      setCameraError(null);
      setLastScannedProduct(null);
    }
  }, [isOpen]);

  const handleProcessScan = useCallback(
    async (codeToScan: string) => {
      const cleaned = extractBarcodeValue(codeToScan);
      if (!cleaned) {
        showToast('warning', 'Masukkan atau scan kode barcode / SKU produk terlebih dahulu.');
        inputRef.current?.focus();
        return;
      }
      if (isScanning) return;

      setIsScanning(true);
      try {
        const matched = await onScanCode(cleaned);
        if (matched) {
          setLastScannedProduct(matched);
          setScanStatus('success');
          setInputVal('');
          setTimeout(() => {
            setScanStatus('idle');
          }, 2200);
        } else {
          setScanStatus('not-found');
          setTimeout(() => {
            setScanStatus('idle');
          }, 2500);
        }
      } finally {
        setIsScanning(false);
        inputRef.current?.focus();
      }
    },
    [isScanning, onScanCode, showToast]
  );

  // Live Multi-Format Camera Decoder (Code 128, QR Code, EAN-13, Code 39, DataMatrix)
  useEffect(() => {
    let cancelled = false;

    const stopScanner = () => {
      if (scannerControlsRef.current) {
        try {
          scannerControlsRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
        scannerControlsRef.current = null;
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    };

    if (!isOpen || !isCameraActive) {
      stopScanner();
      return;
    }

    setCameraError(null);
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.CODE_39,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.UPC_A,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 180,
      delayBetweenScanSuccess: 1200,
    });

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoEl,
        result => {
          if (cancelled || !result) return;
          const rawText = result.getText();
          const extracted = extractBarcodeValue(rawText);
          if (!extracted) return;

          const now = Date.now();
          if (
            lastDecodedRef.current.code === extracted &&
            now - lastDecodedRef.current.time < 1600
          ) {
            return;
          }
          lastDecodedRef.current = { code: extracted, time: now };
          void handleProcessScan(extracted);
        }
      )
      .then(controls => {
        if (cancelled) {
          controls.stop();
        } else {
          scannerControlsRef.current = controls;
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError(
            'Kamera tidak tersedia atau izin kamera ditolak. Gunakan scanner fisik USB atau ketik SKU.'
          );
          setIsCameraActive(false);
        }
      });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen, isCameraActive, handleProcessScan]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleProcessScan(inputVal);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-none">
                Scan Barcode Produk
              </h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Code 128 &amp; QR Siap
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dukung scanner fisik &amp; kamera web (Code 128, QR Code, EAN-13, Code 39)
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                isSoundEnabled
                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}
              title={isSoundEnabled ? 'Suara beep aktif' : 'Suara beep nonaktif'}
            >
              {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Tutup modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Main Input Field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Kode Barcode (Code 128 / QR / SKU)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan atau masukkan SKU (contoh: 16-164 / 22K-CN-418)..."
                  value={inputVal}
                  onChange={e => {
                    const val = e.target.value;
                    setInputVal(val);
                    const matched = sampleProducts.find(
                      p => p.sku.toLowerCase() === val.trim().toLowerCase()
                    );
                    if (matched) {
                      void handleProcessScan(val);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-semibold rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-white transition-colors"
                />
              </div>

              <button
                type="button"
                disabled={isScanning}
                onClick={() => void handleProcessScan(inputVal)}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-xs rounded-md transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
              >
                {isScanning && <Loader2 size={13} className="animate-spin" />}
                <span>Scan</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`p-2.5 rounded-md border text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
                  isCameraActive
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                title={isCameraActive ? 'Matikan Kamera' : 'Nyalakan Kamera Scanner'}
              >
                <Camera size={16} />
              </button>
            </div>
          </div>

          {cameraError && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle size={15} className="shrink-0 text-amber-600" />
              <span>{cameraError}</span>
            </div>
          )}

          {isCameraActive && (
            <div className="relative w-full h-48 bg-black rounded-md overflow-hidden border border-gray-200">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-28 border-2 border-orange-500 rounded-md bg-orange-500/10 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-x-0 h-0.5 bg-orange-400 animate-laser" />
                  <p className="text-[11px] text-white font-medium bg-black/65 px-2.5 py-1 rounded">
                    Arahkan ke Code 128 / QR Code
                  </p>
                </div>
              </div>
            </div>
          )}

          {scanStatus === 'success' && lastScannedProduct && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-emerald-900 truncate">
                    {lastScannedProduct.name}
                  </p>
                  <p className="text-xs text-emerald-700 font-mono">
                    SKU: {lastScannedProduct.sku} • {formatIDR(lastScannedProduct.harga)}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded border border-emerald-200 shrink-0">
                +1 Masuk Keranjang
              </span>
            </div>
          )}

          {scanStatus === 'not-found' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2.5 text-red-800 text-xs sm:text-sm animate-in fade-in duration-150">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>SKU barcode tidak ditemukan dalam katalog perhiasan.</span>
            </div>
          )}

          {scanStatus === 'idle' && lastScannedProduct && (
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={lastScannedProduct.image}
                  alt={lastScannedProduct.name}
                  className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-medium uppercase">Scan Terakhir</p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                    {lastScannedProduct.name}
                  </p>
                </div>
              </div>
              <span className="text-xs sm:text-sm font-bold font-mono text-orange-600 shrink-0">
                {formatIDR(lastScannedProduct.harga)}
              </span>
            </div>
          )}

          {/* Quick SKU Test Chips */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                Klik Cepat untuk Simulasi Scan:
              </span>
              <span className="text-xs text-gray-400 font-medium font-mono">
                {totalAvailable} SKU tersedia
              </span>
            </div>

            {isLoadingSamples ? (
              <div className="py-6 flex items-center justify-center text-xs text-gray-400 gap-2">
                <Loader2 size={14} className="animate-spin text-orange-500" />
                <span>Memuat daftar SKU...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {sampleProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void handleProcessScan(p.sku)}
                    className="p-2 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded text-left transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-100/70 px-1.5 py-0.5 rounded">
                        {p.sku}
                      </span>
                      <span className="text-xs font-semibold text-gray-800 truncate group-hover:text-orange-600">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold font-mono text-gray-500 shrink-0">
                      {p.berat.toFixed(2)}g
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <div className="text-xs sm:text-sm text-gray-600">
            Keranjang saat ini:{' '}
            <span className="font-bold text-orange-600 font-mono">{totalCartQty} item</span>
            {scanCount > 0 && (
              <span className="text-gray-400 text-xs ml-1.5 font-mono">({scanCount}x di-scan sesi ini)</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.98]"
          >
            <Check size={16} />
            <span>Selesai Scan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
