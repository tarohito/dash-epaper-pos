import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Product } from '../../types';

interface ScanFeedbackToastProps {
  feedback: {
    product: Product;
    time: string;
  } | null;
}

export const ScanFeedbackToast: React.FC<ScanFeedbackToastProps> = ({ feedback }) => {
  if (!feedback) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-950/95 backdrop-blur-md text-white px-5 py-3.5 rounded-md flex items-center gap-3.5 border border-emerald-500/50 animate-in fade-in slide-in-from-bottom-4 duration-150">
      <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
        <CheckCircle2 size={20} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-white">Auto-Scan Sukses!</span>
          <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded">
            {feedback.product.sku}
          </span>
          <span className="text-xs text-gray-400 font-mono">{feedback.time}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-300 font-medium mt-0.5">
          {feedback.product.name} ({feedback.product.berat.toFixed(2)}g) ditambahkan ke pesanan
        </p>
      </div>
    </div>
  );
};
