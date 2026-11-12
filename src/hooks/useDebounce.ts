import { useState, useEffect } from 'react';

/**
 * useDebounce: Mencegah filter/pencarian dijalankan di setiap ketikan keyboard.
 * Sangat penting untuk dataset ribuan item agar UI tidak lag saat mengetik cepat.
 */
export function useDebounce<T>(value: T, delayMs: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
