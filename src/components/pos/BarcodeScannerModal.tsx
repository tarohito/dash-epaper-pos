import React, { useRef, useEffect } from 'react';
import { Barcode, Volume2, X, Camera, Zap } from 'lucide-react';
import { Product } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onScanCode: (code: string) => boolean;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  scanCount: number;
  totalCartQty: number;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onScanCode,
  isSoundEnabled,
  onToggleSound,
  scanCount,
  totalCartQty,
}) => {
  const [manualScanInput, setManualScanInput] = React.useState('');
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    } else {
      setIsCameraActive(false);
      setManualScanInput('');
    }
  }, [isOpen]);

  // Camera stream control
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && isCameraActive) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setIsCameraActive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, isCameraActive]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
              <Barcode size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                Auto-Scanner Barcode POS
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Live Active
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Mendukung hardware scanner USB/Wireless, kamera, & simulasi tag barcode
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${ isSoundEnabled ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-100 text-gray-400 border-gray-200' }`}
              title={isSoundEnabled ? 'Suara beep aktif' : 'Suara beep mati'}
            >
              <Volume2 size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Visual Viewfinder / Camera Screen */}
          <div className="relative w-full h-52 bg-gray-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-800 group">
            {isCameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6 text-gray-400 flex flex-col items-center">
                <Barcode size={48} className="text-orange-500/70 mb-2" />
                <p className="text-xs font-semibold text-gray-300">Arahkan barcode perhiasan ke sensor scanner</p>
                <p className="text-[11px] text-gray-500 mt-1">Scanner otomatis mendeteksi SKU dan memasukkannya ke keranjang</p>
              </div>
            )}

            {/* Corner Targets */}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-orange-500 pointer-events-none" />
            <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-orange-500 pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-orange-500 pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-orange-500 pointer-events-none" />

            {/* Animated Red Laser Scan Line */}
            <div className="absolute inset-x-8 h-0.5 bg-red-500 animate-laser pointer-events-none" />

            {/* Scanner HUD Overlay */}
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SENSOR READY &bull; {scanCount} ITEM DI-SCAN
            </div>
          </div>

          {/* Instant Barcode Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500" size={18} />
              <input
                ref={scanInputRef}
                type="text"
                placeholder="Scan atau ketik SKU barcode disini (cth: 16-164)..."
                value={manualScanInput}
                onChange={e => {
                  const val = e.target.value;
                  setManualScanInput(val);
                  const matched = products.find(p => p.sku.toLowerCase() === val.trim().toLowerCase());
                  if (matched) {
                    onScanCode(val);
                    setManualScanInput('');
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (onScanCode(manualScanInput)) {
                      setManualScanInput('');
                    }
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-xs font-medium"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (onScanCode(manualScanInput)) {
                  setManualScanInput('');
                }
              }}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Scan SKU
            </button>
            <button
              type="button"
              onClick={() => setIsCameraActive(!isCameraActive)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${ isCameraActive ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100' }`}
            >
              <Camera size={15} />
              {isCameraActive ? 'Tutup Kamera' : 'Buka Kamera'}
            </button>
          </div>

          {/* Quick Barcode Test Tags */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Zap size={14} className="text-orange-500" />
                Tag Barcode Cepat (Klik untuk Simulasi Scan Langsung):
              </p>
              <span className="text-[11px] text-gray-400">{products.length} SKU Emas Siap Scan</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {products.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onScanCode(p.sku)}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-orange-500 transition-all text-left group cursor-pointer relative overflow-hidden"
                >
                  <div className="h-6 w-full flex items-center justify-between gap-[2px] opacity-75 group-hover:opacity-100 transition-opacity mb-1.5 bg-gray-50 p-1 rounded">
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2].map((w, idx) => (
                      <div key={idx} className="h-full bg-gray-800 rounded-xs" style={{ width: `${w * 2}px` }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-mono font-bold text-orange-600">{p.sku}</p>
                  <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{p.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {p.berat.toFixed(2)}g &bull; {formatIDR(p.harga)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Total item di keranjang: <span className="font-bold text-orange-600">{totalCartQty} pcs</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Selesai Scan
          </button>
        </div>
      </div>
    </div>
  );
};
