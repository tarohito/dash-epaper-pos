import React, { useEffect, useRef, useState } from 'react';
import { Product } from '../../types';
import { formatIDR } from '../../utils/formatters';
import {
  BarcodeLabelFormat,
  createQrCodeDataUrl,
  renderCode128ToSvg,
} from '../../utils/barcode';

interface JewelryBarcodeTagProps {
  product: Pick<Product, 'sku' | 'name' | 'berat' | 'harga' | 'category'>;
  format?: BarcodeLabelFormat;
  storeName?: string;
  compact?: boolean;
}

export const JewelryBarcodeTag: React.FC<JewelryBarcodeTagProps> = ({
  product,
  format = 'hybrid',
  storeName = 'TOKO MAS SEJAHTERA',
  compact = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [code128Valid, setCode128Valid] = useState(true);

  const skuValue = (product.sku || '').trim() || 'SKU-000';

  useEffect(() => {
    if (format === 'qr') return;
    const ok = renderCode128ToSvg(svgRef.current, skuValue, {
      height: compact ? 26 : format === 'butterfly' ? 24 : 32,
      barWidth: compact ? 1.2 : format === 'butterfly' ? 1.15 : 1.45,
      fontSize: compact ? 9 : 10,
      displayValue: true,
    });
    setCode128Valid(ok);
  }, [skuValue, format, compact]);

  useEffect(() => {
    if (format === 'code128') return;
    let active = true;
    const qrSize = format === 'qr' ? 112 : format === 'butterfly' ? 68 : 72;
    createQrCodeDataUrl(skuValue, qrSize)
      .then(url => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [skuValue, format]);

  if (format === 'qr') {
    return (
      <div className="bg-white border border-gray-300 rounded-md p-2.5 flex items-center gap-2.5 w-[210px] text-gray-900">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR ${skuValue}`} className="w-16 h-16 shrink-0" />
        ) : (
          <div className="w-16 h-16 bg-gray-100 rounded shrink-0" />
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[9px] font-bold text-gray-500 uppercase truncate">{storeName}</p>
          <p className="text-[11px] font-bold text-gray-900 truncate mt-0.5">{product.name || 'Produk Emas'}</p>
          <p className="text-[10px] font-mono font-bold text-orange-700 mt-0.5">{skuValue}</p>
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-gray-800 mt-1 pt-1 border-t border-gray-200">
            <span>{product.berat.toFixed(2)}g</span>
            <span>{formatIDR(product.harga)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (format === 'butterfly') {
    return (
      <div className="bg-white border border-gray-300 rounded-md p-2 w-[265px] text-gray-900">
        <div className="grid grid-cols-2 divide-x divide-dashed divide-gray-300 gap-2 items-center">
          {/* Sisi Kiri: Info Perhiasan + QR */}
          <div className="pr-1.5 flex items-center gap-1.5 min-w-0">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR ${skuValue}`} className="w-11 h-11 shrink-0" />
            ) : (
              <div className="w-11 h-11 bg-gray-100 rounded shrink-0" />
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[8px] font-bold text-gray-500 uppercase truncate">{product.category}</p>
              <p className="text-[10px] font-bold text-gray-900 truncate">{product.name || 'Item'}</p>
              <p className="text-[10px] font-mono font-bold text-gray-900 mt-0.5">{product.berat.toFixed(2)} gr</p>
              <p className="text-[9px] font-mono font-bold text-orange-700">{formatIDR(product.harga)}</p>
            </div>
          </div>

          {/* Sisi Kanan: Code 128 Barcode */}
          <div className="pl-1.5 flex flex-col items-center justify-center overflow-hidden">
            {code128Valid ? (
              <svg ref={svgRef} className="max-w-full h-auto" />
            ) : (
              <span className="text-[10px] font-mono font-bold text-red-600">{skuValue}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (format === 'code128') {
    return (
      <div className="bg-white border border-gray-300 rounded-md p-2.5 w-[225px] text-gray-900 flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-[9px] font-bold text-gray-600 uppercase mb-0.5">
          <span className="truncate max-w-[130px]">{storeName}</span>
          <span className="font-mono text-gray-900">{product.berat.toFixed(2)}g</span>
        </div>
        <p className="w-full text-[11px] font-bold text-gray-900 truncate text-center mb-1">
          {product.name || 'Produk Perhiasan'}
        </p>
        {code128Valid ? (
          <svg ref={svgRef} className="max-w-full h-auto" />
        ) : (
          <span className="text-xs font-mono text-red-600 py-2">Karakter SKU tidak valid Code 128</span>
        )}
        <div className="w-full flex items-center justify-between text-[10px] font-mono font-bold text-gray-800 mt-1 pt-1 border-t border-gray-200">
          <span>{product.category}</span>
          <span>{formatIDR(product.harga)}</span>
        </div>
      </div>
    );
  }

  // Default: 'hybrid' (Standar Terbaik: Code 128 + QR Code dalam 1 stiker)
  return (
    <div className="bg-white border border-gray-300 rounded-md p-2.5 w-[250px] text-gray-900">
      <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-gray-200">
        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide truncate">
          {storeName}
        </span>
        <span className="text-[10px] font-mono font-bold text-gray-900 shrink-0">
          {product.berat.toFixed(2)} gr &bull; {formatIDR(product.harga)}
        </span>
      </div>
      <p className="text-[11px] font-bold text-gray-900 truncate mb-1">
        {product.name || 'Produk Perhiasan Emas'}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex justify-center overflow-hidden">
          {code128Valid ? (
            <svg ref={svgRef} className="max-w-full h-auto" />
          ) : (
            <span className="text-[10px] font-mono font-bold text-red-600">{skuValue}</span>
          )}
        </div>
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt={`QR ${skuValue}`}
            className="w-12 h-12 shrink-0 border border-gray-200 rounded-xs p-0.5 bg-white"
          />
        )}
      </div>
    </div>
  );
};
