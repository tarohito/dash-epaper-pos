import React, { memo } from 'react';
import { Product } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = memo(({ product, onAddToCart }) => {
  const isOutOfStock = product.stok <= 0;

  return (
    <div
      onClick={() => {
        if (!isOutOfStock) {
          onAddToCart(product);
        }
      }}
      className={`bg-white border rounded-xl transition-all duration-200 group flex flex-col justify-between relative overflow-hidden active:scale-[0.98] select-none ${
        isOutOfStock
          ? 'border-gray-200 opacity-60 cursor-not-allowed bg-gray-50/50'
          : 'border-gray-200 cursor-pointer hover:border-orange-500 shadow-xs hover:shadow-md'
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Product Image (1:1 Aspect Ratio) */}
        <div className="w-full aspect-square relative overflow-hidden bg-gray-50 flex items-center justify-center">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-transform duration-300 ${
              !isOutOfStock ? 'group-hover:scale-105' : 'grayscale-40'
            }`}
          />
          {/* Category & Promo Badge */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            <span className="text-xs font-semibold px-2 py-0.5 bg-white/95 backdrop-blur-xs text-orange-600 rounded-md border border-orange-100 shadow-2xs">
              {product.category}
            </span>
            {product.isPromo && (
              <span className="text-xs font-bold px-1.5 py-0.5 bg-yellow-400 text-gray-950 rounded-md shadow-2xs">
                {product.promoLabel || 'PROMO'}
              </span>
            )}
          </div>
          {/* Stock Badge */}
          <div className="absolute top-2 right-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs shadow-2xs ${
                isOutOfStock
                  ? 'bg-red-600 text-white'
                  : product.stok <= 5
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-50/95 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isOutOfStock ? 'Habis' : `Stok: ${product.stok}`}
            </span>
          </div>
        </div>

        {/* Product Details: Simple Name, Direct Price, then Weight below it */}
        <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
          <h3
            className={`text-xs sm:text-sm font-semibold leading-snug line-clamp-2 ${
              isOutOfStock ? 'text-gray-400' : 'text-gray-900 group-hover:text-orange-600 transition-colors'
            }`}
            title={product.name}
          >
            {product.name}
          </h3>

          <div className="mt-1.5 sm:mt-2 flex flex-col gap-0.5">
            {/* Harga Langsung */}
            <div
              className={`text-sm sm:text-base font-bold font-mono tabular-nums tracking-tight leading-tight ${
                isOutOfStock ? 'text-gray-400' : 'text-orange-600'
              }`}
            >
              {formatIDR(product.harga)}
            </div>

            {/* Dibawahnya Berat */}
            <div className="text-xs text-gray-500 font-medium leading-tight">
              Berat : <span className="font-semibold text-gray-700 font-mono">{product.berat.toFixed(2)} g</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
