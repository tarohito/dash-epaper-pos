import React, { useState, useEffect } from 'react';

export interface NumericInputProps {
  value: number | string;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  allowDecimal?: boolean;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  autoFocus?: boolean;
}

/**
 * Formats a raw number or string into Indonesian locale thousand separators (dot).
 * If allowDecimal is true, preserves the decimal part (e.g. 10.25).
 */
export const formatWithThousandSeparator = (val: number | string, allowDecimal = false): string => {
  if (val === '' || val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  if (allowDecimal) {
    // Standardize comma to dot for parsing
    const normalized = str.replace(',', '.');
    const parts = normalized.split('.');
    const integerPart = parts[0].replace(/[^0-9]/g, '');
    const decimalPart = parts.length > 1 ? parts[1].replace(/[^0-9]/g, '') : null;

    if (!integerPart && decimalPart === null) return '';

    const formattedInt = integerPart
      ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(parseInt(integerPart, 10))
      : '0';

    if (decimalPart !== null) {
      return `${formattedInt},${decimalPart}`;
    }
    // If original string ends with decimal separator
    if (str.endsWith('.') || str.endsWith(',')) {
      return `${formattedInt},`;
    }
    return formattedInt;
  }

  // Integer only
  const cleanInt = str.replace(/[^0-9]/g, '');
  if (!cleanInt) return '';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(parseInt(cleanInt, 10));
};

export const parseRawNumber = (displayVal: string, allowDecimal = false): number => {
  if (!displayVal) return 0;
  if (allowDecimal) {
    // Replace dots (thousand separators) and convert comma to dot
    const clean = displayVal.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
  const clean = displayVal.replace(/[^0-9]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  className = '',
  prefix,
  suffix,
  min,
  max,
  allowDecimal = false,
  required = false,
  disabled = false,
  id,
  autoFocus = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    return formatWithThousandSeparator(value, allowDecimal);
  });

  // Sync internal displayValue when external value changes
  useEffect(() => {
    const formatted = formatWithThousandSeparator(value, allowDecimal);
    setDisplayValue(formatted);
  }, [value, allowDecimal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;

    if (allowDecimal) {
      // Allow only numbers, dot, and comma
      const filtered = inputVal.replace(/[^0-9.,]/g, '');
      const numVal = parseRawNumber(filtered, true);

      // Check min/max bounds if specified
      if (max !== undefined && numVal > max) return;

      setDisplayValue(filtered);
      onChange(numVal);
    } else {
      const cleanDigits = inputVal.replace(/[^0-9]/g, '');
      if (!cleanDigits) {
        setDisplayValue('');
        onChange(0);
        return;
      }

      const numVal = parseInt(cleanDigits, 10);
      if (max !== undefined && numVal > max) return;

      const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(numVal);
      setDisplayValue(formatted);
      onChange(numVal);
    }
  };

  const handleBlur = () => {
    // On blur, format cleanly
    const num = parseRawNumber(displayValue, allowDecimal);
    if (min !== undefined && num < min && num !== 0) {
      onChange(min);
      setDisplayValue(formatWithThousandSeparator(min, allowDecimal));
    } else {
      setDisplayValue(formatWithThousandSeparator(num, allowDecimal));
    }
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <span className="absolute left-3.5 text-xs font-bold text-gray-400 select-none pointer-events-none font-mono">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        id={id}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-9' : ''} ${className}`}
      />
      {suffix && (
        <span className="absolute right-3.5 text-xs font-semibold text-gray-400 select-none pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
};

export default NumericInput;
