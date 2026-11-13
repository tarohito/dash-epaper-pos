import React from'react';
import { Settings2 } from'lucide-react';

interface FallbackViewProps {
  title: string;
  onBackToPos: () => void;
}

export const FallbackView: React.FC<FallbackViewProps> = ({ title, onBackToPos }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
      <div className="bg-white p-12 rounded-lg border border-gray-200 flex flex-col items-center text-center max-w-md">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
          <Settings2 size={32} className="text-orange-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm">
          Halaman modul <span className="font-semibold text-gray-700">{title}</span> saat ini siap digunakan atau
          kembali ke Kasir POS.
        </p>
        <button
          type="button"
          onClick={onBackToPos}
          className="mt-8 px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-md hover:bg-orange-600 transition-colors cursor-pointer"
        >
          Kembali ke Kasir POS (Penjualan)
        </button>
      </div>
    </div>
  );
};
