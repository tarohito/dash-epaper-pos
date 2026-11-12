import React from 'react';
import { Product } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const isOutOfStock = product.stok <= 0;

  return (
    <div
      onClick={() => {
        if (!isOutOfStock) {
          onAddToCart(product);
        }
      }}
      className={`bg-white border rounded-lg transition-all duration-200 group flex flex-col justify-between relative overflow-hidden active:scale-[0.98] select-none ${
        isOutOfStock
          ? 'border-gray-200 opacity-60 cursor-not-allowed bg-gray-50/50'
          : 'border-gray-200 cursor-pointer hover:border-orange-500 shadow-xs hover:shadow-md'
      }`}
    >
      <div>
        {/* Product Image */}
        <div className="w-full h-28 sm:h-36 relative overflow-hidden bg-gray-50 flex items-center justify-center">
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              !isOutOfStock ? 'group-hover:scale-105' : 'grayscale-40'
            }`}
          />
          {/* Category & Promo Badge */}
          <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 flex flex-col gap-1 items-start">
            <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 bg-white/95 backdrop-blur-sm text-orange-600 rounded-md border border-orange-100 inline-block shadow-xs">
              {product.category}
            </span>
            {product.isPromo && (
              <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 bg-yellow-400 text-gray-950 rounded-md inline-block">
                {product.promoLabel || 'PROMO'}
              </span>
            )}
          </div>
          {/* Stock Badge */}
          <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5">
            <span
              className={`text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-md inline-block backdrop-blur-sm ${
                isOutOfStock
                  ? 'bg-red-500 text-white'
                  : product.stok <= 3
                  ? 'bg-amber-500 text-white'
                  : 'text-emerald-700 bg-white/95 border border-emerald-100 shadow-xs'
              }`}
            >
              {isOutOfStock ? 'Habis' : `Stok: ${product.stok}`}
            </span>
          </div>
        </div>

        {/* Product Name */}
        <div className="p-2.5 sm:p-3 pb-1 sm:pb-2">
          <h3
            className={`text-xs sm:text-sm font-semibold leading-snug line-clamp-2 ${
              isOutOfStock ? 'text-gray-400' : 'text-gray-900 group-hover:text-orange-600 transition-colors'
            }`}
          >
            {product.name}
          </h3>
        </div>
      </div>

      {/* Bottom Info: Weight & Price */}
      <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1.5 sm:pt-2 border-t border-gray-100 flex items-end justify-between mt-auto">
        <div>
          <div className="text-xs text-gray-400 font-medium leading-none mb-1">Berat</div>
          <div className="text-xs sm:text-sm font-bold text-gray-800 leading-none">{product.berat.toFixed(2)}g</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 font-medium leading-none mb-1">Harga</div>
          <div className={`text-xs sm:text-sm font-bold leading-none ${isOutOfStock ? 'text-gray-400' : 'text-orange-600'}`}>
            {formatIDR(product.harga)}
          </div>
        </div>
      </div>
    </div>
  );
};
