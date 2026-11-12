export const formatIDR = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatNumber = (val: number | string): string => {
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) || 0 : val;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export const parseNumber = (val: string): number => {
  return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
};

export const formatGram = (val: number): string => {
  return `${val.toFixed(2)} g`;
};
