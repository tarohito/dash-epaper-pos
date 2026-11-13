import React, { useLayoutEffect, useRef, useState } from 'react';
import { formatIDR } from '../../utils/formatters';

interface MoneyAmountProps {
  value: number;
  className?: string;
  /**
   * Optional maximum font size in px for auto-fit calculation.
   * Default: 24 (matches text-2xl KPI numbers)
   */
  maxFontPx?: number;
  /**
   * Minimum font size in px before wrapping fallback kicks in.
   * Default: 12
   */
  minFontPx?: number;
}

/**
 * Renders formatted IDR amounts at full target size (`maxFontPx`) whenever they fit inside
 * the card/container. Only when a long amount (ratusan juta / miliaran) would overflow
 * does it shrink just enough (in 0.5px steps) so no digit overflows or leaves excessive gap.
 */
export const MoneyAmount: React.FC<MoneyAmountProps> = ({
  value,
  className = 'font-bold font-mono text-gray-900 tracking-tight tabular-nums',
  maxFontPx = 24,
  minFontPx = 12,
}) => {
  const formatted = formatIDR(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fittedFontPx, setFittedFontPx] = useState<number>(maxFontPx);
  const [allowWrap, setAllowWrap] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const recalc = () => {
      const availableWidth = container.clientWidth;
      if (availableWidth <= 0) return;

      // Match responsive KPI heading scale (text-xl on mobile, text-2xl on sm+)
      const baseSize =
        maxFontPx >= 24 && typeof window !== 'undefined' && window.innerWidth < 640
          ? 20
          : maxFontPx;

      // Measure natural width at full target size without any shrinking
      textEl.style.whiteSpace = 'nowrap';
      textEl.style.fontSize = `${baseSize}px`;

      const naturalWidth = textEl.scrollWidth;
      if (naturalWidth <= availableWidth) {
        setFittedFontPx(baseSize);
        setAllowWrap(false);
        return;
      }

      // Shrink only as little as necessary to fit availableWidth (0.5px precision)
      let nextSize = Math.min(
        baseSize,
        Math.max(minFontPx, Math.floor(((baseSize * availableWidth) / naturalWidth) * 2) / 2)
      );

      // Step up if a 0.5px larger font still fits without overflowing
      while (nextSize + 0.5 <= baseSize) {
        textEl.style.fontSize = `${nextSize + 0.5}px`;
        if (textEl.scrollWidth <= availableWidth) {
          nextSize += 0.5;
        } else {
          break;
        }
      }

      // Guard against sub-pixel overflow by stepping down 0.5px only if needed
      textEl.style.fontSize = `${nextSize}px`;
      while (nextSize > minFontPx && textEl.scrollWidth > availableWidth) {
        nextSize = Math.max(minFontPx, nextSize - 0.5);
        textEl.style.fontSize = `${nextSize}px`;
      }

      if (textEl.scrollWidth > availableWidth && nextSize <= minFontPx) {
        setFittedFontPx(minFontPx);
        setAllowWrap(true);
      } else {
        setFittedFontPx(nextSize);
        setAllowWrap(false);
      }
    };

    recalc();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => recalc());
      observer.observe(container);
    }

    window.addEventListener('resize', recalc);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [formatted, maxFontPx, minFontPx]);

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden" title={formatted}>
      <span
        ref={textRef}
        style={{ fontSize: `${fittedFontPx}px` }}
        className={`inline-block max-w-full leading-tight ${
          allowWrap ? 'whitespace-normal break-words' : 'whitespace-nowrap'
        } ${className}`}
      >
        {formatted}
      </span>
    </div>
  );
};
