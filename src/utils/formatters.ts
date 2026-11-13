export const formatIDR = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatCompactIDR = (val: number): string => {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  const formatUnit = (num: number, unit: string) => {
    const rounded = num >= 100 ? num.toFixed(0) : num >= 10 ? num.toFixed(1) : num.toFixed(2);
    return `${sign}${rounded.replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1').replace('.', ',')} ${unit}`;
  };
  if (abs >= 1_000_000_000_000) return formatUnit(abs / 1_000_000_000_000, 'T');
  if (abs >= 1_000_000_000) return formatUnit(abs / 1_000_000_000, 'M');
  if (abs >= 1_000_000) return formatUnit(abs / 1_000_000, 'Jt');
  if (abs >= 1_000) return formatUnit(abs / 1_000, 'Rb');
  return `${sign}${abs.toLocaleString('id-ID')}`;
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
