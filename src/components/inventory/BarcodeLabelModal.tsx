import React, { useState, useEffect } from 'react';
import { Barcode, QrCode, Layers, Printer } from 'lucide-react';
import { Product } from '../../types';
import { BarcodeLabelFormat } from '../../utils/barcode';
import { JewelryBarcodeTag } from '../common/JewelryBarcodeTag';
import { NumericInput } from '../common/NumericInput';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';

interface BarcodeLabelModalProps {
  product: Product | null;
  onClose: () => void;
}

const FORMAT_OPTIONS: Array<{
  id: BarcodeLabelFormat;
  label: string;
  desc: string;
}> = [
  {
    id: 'hybrid',
    label: 'Code 128 + QR (Hybrid)',
    desc: 'Standar terbaik: barcode linear + QR 2D sekaligus',
  },
  {
    id: 'butterfly',
    label: 'Tag Kupu-Kupu (Perhiasan)',
    desc: 'Label lipat khusus cincin, kalung, & gelang',
  },
  {
    id: 'code128',
    label: 'Code 128 Linear',
    desc: 'Barcode garis standar untuk scanner laser/USB',
  },
  {
    id: 'qr',
    label: 'QR Code Mini',
    desc: 'Tag kotak ringkas untuk kamera & scanner 2D',
  },
];

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ product, onClose }) => {
  const [format, setFormat] = useState<BarcodeLabelFormat>('hybrid');
  const [copies, setCopies] = useState<number>(1);

  useEffect(() => {
    if (product) {
      setCopies(Math.max(1, Math.min(product.stok || 1, 10)));
    }
  }, [product]);

  useEffect(() => {
    const cleanupPrint = () => {
      document.body.classList.remove('printing-barcode');
    };
    window.addEventListener('afterprint', cleanupPrint);
    return () => {
      window.removeEventListener('afterprint', cleanupPrint);
      document.body.classList.remove('printing-barcode');
    };
  }, []);

  if (!product) return null;

  const safeCopies = Math.max(1, Math.min(copies || 1, 60));

  const handlePrint = () => {
    document.body.classList.add('printing-barcode');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-barcode');
    }, 500);
  };

  return (
    <>
      <ModalShell
        isOpen={Boolean(product)}
        onClose={onClose}
        size="xl"
        title="Cetak Label Barcode"
        subtitle={`${product.name} (${product.sku})`}
        footer={
          <div className={MODAL_FOOTER_END_CLASS}>
            <button
              type="button"
              onClick={handlePrint}
              className={`${MODAL_BTN_PRIMARY_CLASS} gap-1.5`}
            >
              <Printer size={15} className="shrink-0" />
              <span>Cetak {safeCopies} Label</span>
            </button>
          </div>
        }
      >
        <div className="space-y-5">
            {/* Format Selector */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                Pilih Standar Format Label
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FORMAT_OPTIONS.map(opt => {
                  const active = format === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormat(opt.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        active
                          ? 'border-orange-500 bg-orange-50/70 ring-1 ring-orange-500'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-md shrink-0 ${
                          active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {opt.id === 'qr' ? (
                          <QrCode size={15} />
                        ) : opt.id === 'code128' ? (
                          <Barcode size={15} />
                        ) : (
                          <Layers size={15} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Copies Input */}
            <div className="flex flex-wrap items-end justify-between gap-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
              <div className="w-36">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Jumlah Label Cetak
                </label>
                <NumericInput
                  value={copies}
                  onChange={val => setCopies(Math.max(1, Math.min(val || 1, 60)))}
                  min={1}
                  max={60}
                  suffix="pcs"
                  className="w-full px-3 py-1.5 text-sm font-bold font-mono bg-white border border-gray-300 rounded-md outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCopies(1)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 hover:border-orange-300 rounded-md text-gray-700 cursor-pointer"
                >
                  1 Label
                </button>
                {product.stok > 0 && (
                  <button
                    type="button"
                    onClick={() => setCopies(Math.min(product.stok, 60))}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-gray-200 hover:border-orange-300 rounded-md text-orange-700 cursor-pointer"
                  >
                    Sesuai Stok ({Math.min(product.stok, 60)})
                  </button>
                )}
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Pratinjau Label (Siap Scan Code 128 / QR)
              </p>
              <div className="bg-gray-100 border border-dashed border-gray-300 rounded-lg p-5 flex items-center justify-center">
                <JewelryBarcodeTag product={product} format={format} />
              </div>
            </div>
        </div>
      </ModalShell>

      {/* Hidden Printable Barcode Sheet */}
      <div id="printable-barcode-sheet" className="print-only">
        <div className="flex flex-wrap gap-3 p-2">
          {Array.from({ length: safeCopies }).map((_, idx) => (
            <div key={idx} className="break-inside-avoid">
              <JewelryBarcodeTag product={product} format={format} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
