import React, { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip as ChartTooltip,
  ChartConfiguration,
  Plugin,
} from 'chart.js';
import { Info } from 'lucide-react';
import { formatCompactIDR, formatIDR } from '../../utils/formatters';
import Tooltip from '../Tooltip';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  ChartTooltip
);

interface SalesVolumeChartProps {
  period: 'HARI' | 'BULAN';
  labels: string[];
  salesData: number[];
  trxData: number[];
}

function getScrollableAncestor(el: HTMLElement | null): HTMLElement | Window {
  let current = el?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return window;
}

export const SalesVolumeChart: React.FC<SalesVolumeChartProps> = ({
  period,
  labels,
  salesData,
  trxData,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart<'line'> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const areaGradient = ctx.createLinearGradient(0, 0, 0, 260);
    areaGradient.addColorStop(0, 'rgba(249, 115, 22, 0.18)');
    areaGradient.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

    const maxSales = Math.max(...salesData, 0);
    const maxTrx = Math.max(...trxData, 0);
    const fixedSalesMax = maxSales > 0 ? Math.ceil(maxSales * 1.18) : 1000000;
    const fixedTrxMax = maxTrx > 0 ? Math.max(4, Math.ceil(maxTrx * 1.3)) : 4;

    // Find peak point index to show a gentle living pulse halo
    let peakIndex = -1;
    let peakValue = 0;
    salesData.forEach((v, idx) => {
      if (v > peakValue) {
        peakValue = v;
        peakIndex = idx;
      }
    });

    let isVisible = false;
    let isRevealing = false;
    let revealTimer: number | null = null;
    let pulseStartTime = performance.now();

    // Spring physics state for scroll-reactive wave motion
    let springOffset = 0;
    let springVelocity = 0;
    let scrollPhase = 0;
    let rafId: number | null = null;

    const livePulsePlugin: Plugin<'line'> = {
      id: 'salesLivePulse',
      afterDatasetsDraw(chart) {
        if (prefersReducedMotion || peakIndex < 0 || !isVisible || isRevealing) return;
        const meta = chart.getDatasetMeta(0);
        const point = meta?.data?.[peakIndex];
        if (!point) return;

        const { x, y } = point.getProps(['x', 'y'], true);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        const elapsed = (performance.now() - pulseStartTime) / 1000;
        const cycle = (elapsed % 2.2) / 2.2;
        const radius = 5 + cycle * 11;
        const alpha = (1 - cycle) * 0.42;

        const c = chart.ctx;
        c.save();
        c.beginPath();
        c.arc(x, y, radius, 0, Math.PI * 2);
        c.strokeStyle = `rgba(234, 88, 12, ${alpha.toFixed(3)})`;
        c.lineWidth = 2;
        c.stroke();
        c.restore();
      },
    };

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: period === 'HARI' ? 'Total penjualan per jam' : 'Total penjualan per hari',
            data: prefersReducedMotion ? [...salesData] : salesData.map(() => 0),
            yAxisID: 'ySales',
            borderColor: '#ea580c',
            backgroundColor: areaGradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.34,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#ea580c',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#ea580c',
            pointHoverBorderWidth: 2.5,
          },
          {
            label: period === 'HARI' ? 'Total transaksi per jam' : 'Total transaksi per hari',
            data: prefersReducedMotion ? [...trxData] : trxData.map(() => 0),
            yAxisID: 'yTrx',
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderWidth: 2.25,
            fill: false,
            tension: 0.34,
            pointRadius: 3,
            pointHoverRadius: 5.5,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#2563eb',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#2563eb',
            pointHoverBorderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        animation: prefersReducedMotion
          ? false
          : {
              duration: 900,
              easing: 'easeOutQuart',
            },
        animations: prefersReducedMotion
          ? undefined
          : {
              y: {
                duration: 950,
                easing: 'easeOutQuart',
                delay: ctxItem =>
                  ctxItem.type === 'data'
                    ? ctxItem.dataIndex * 50 + ctxItem.datasetIndex * 110
                    : 0,
              },
            },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: '#111827',
            borderColor: '#1f2937',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            titleColor: '#fb923c',
            titleFont: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 12,
              weight: 'bold',
            },
            bodyColor: '#f3f4f6',
            bodyFont: {
              family: "'JetBrains Mono', monospace",
              size: 12,
              weight: 500,
            },
            callbacks: {
              title: items => {
                if (!items.length) return '';
                const rawLabel = items[0].label ?? '';
                return period === 'HARI' ? `Pukul ${rawLabel}` : rawLabel;
              },
              label: item => {
                const idx = item.dataIndex;
                // Always display true exact values in tooltip even during scroll motion
                const exactValue =
                  item.datasetIndex === 0
                    ? Number(salesData[idx] ?? item.parsed.y ?? 0)
                    : Number(trxData[idx] ?? item.parsed.y ?? 0);
                if (item.datasetIndex === 0) {
                  return ` Penjualan: ${formatIDR(exactValue)}`;
                }
                return ` Transaksi: ${exactValue} nota`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            border: {
              color: '#e2e8f0',
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12,
            },
          },
          ySales: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            suggestedMax: fixedSalesMax,
            border: {
              display: false,
              dash: [3, 3],
            },
            grid: {
              color: '#f1f5f9',
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
              },
              maxTicksLimit: 5,
              callback: value => {
                const num = Number(value);
                return num === 0 ? '0' : formatCompactIDR(Math.round(num));
              },
            },
          },
          yTrx: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            suggestedMax: fixedTrxMax,
            border: {
              display: false,
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: '#60a5fa',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
              },
              precision: 0,
              maxTicksLimit: 5,
              callback: value => `${value} nota`,
            },
          },
        },
      },
      plugins: [livePulsePlugin],
    };

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    const chart = new Chart(ctx, config);
    chartInstanceRef.current = chart;

    const triggerRevealFromZero = () => {
      if (prefersReducedMotion) return;
      isRevealing = true;
      springOffset = 0;
      springVelocity = 0;
      if (revealTimer) window.clearTimeout(revealTimer);

      chart.data.datasets[0].data = salesData.map(() => 0);
      chart.data.datasets[1].data = trxData.map(() => 0);
      chart.update('none');

      requestAnimationFrame(() => {
        if (chartInstanceRef.current !== chart) return;
        chart.data.datasets[0].data = [...salesData];
        chart.data.datasets[1].data = [...trxData];
        chart.update();
      });

      const totalRevealMs = 950 + labels.length * 50 + 180;
      revealTimer = window.setTimeout(() => {
        isRevealing = false;
        pulseStartTime = performance.now();
      }, totalRevealMs);
    };

    const resetToZero = () => {
      if (prefersReducedMotion) return;
      isRevealing = false;
      springOffset = 0;
      springVelocity = 0;
      if (revealTimer) {
        window.clearTimeout(revealTimer);
        revealTimer = null;
      }
      chart.data.datasets[0].data = salesData.map(() => 0);
      chart.data.datasets[1].data = trxData.map(() => 0);
      chart.update('none');
    };

    // Continuous living loop (handles scroll-driven wave bounce + gentle peak pulse)
    let lastFrameTime = 0;
    const tick = (now: number) => {
      if (chartInstanceRef.current !== chart || !isVisible) {
        rafId = null;
        return;
      }

      const activeHover = chart.getActiveElements().length > 0;

      if (!isRevealing && !prefersReducedMotion) {
        const hasSpringMotion =
          Math.abs(springOffset) > 0.001 || Math.abs(springVelocity) > 0.001;

        if (hasSpringMotion && !activeHover) {
          // Damped harmonic spring back to exact 0 offset
          const force = -0.16 * springOffset;
          springVelocity = (springVelocity + force) * 0.78;
          springOffset += springVelocity;
          scrollPhase += 0.14;

          chart.data.datasets[0].data = salesData.map((val, i) => {
            if (val <= 0) return 0;
            const wave = 0.65 + 0.55 * Math.cos(i * 0.72 + scrollPhase);
            return Math.max(0, val * (1 + springOffset * wave));
          });
          chart.data.datasets[1].data = trxData.map((val, i) => {
            if (val <= 0) return 0;
            const wave = 0.65 + 0.55 * Math.sin(i * 0.72 + scrollPhase);
            return Math.max(0, val * (1 + springOffset * wave));
          });
          chart.update('none');
        } else if (hasSpringMotion && activeHover) {
          // Settle immediately when user inspects tooltip
          springOffset = 0;
          springVelocity = 0;
          chart.data.datasets[0].data = [...salesData];
          chart.data.datasets[1].data = [...trxData];
          chart.update('none');
        } else if (peakIndex >= 0 && now - lastFrameTime >= 32) {
          // Gentle ~30fps redraw for peak beacon halo without touching data
          lastFrameTime = now;
          chart.draw();
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    const startLoopIfNeeded = () => {
      if (prefersReducedMotion || rafId !== null || !isVisible) return;
      rafId = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    // Observe visibility so chart grows upward when scrolled into view and replays cleanly
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && !isVisible) {
            isVisible = true;
            triggerRevealFromZero();
            startLoopIfNeeded();
          } else if (!entry.isIntersecting && isVisible) {
            isVisible = false;
            stopLoop();
            resetToZero();
          }
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(container);

    // Listen to nearest scrollable container so scrolling triggers living rise/fall wave on points
    const scrollTarget = getScrollableAncestor(container);
    const readScrollTop = () =>
      scrollTarget === window
        ? window.scrollY || document.documentElement.scrollTop || 0
        : (scrollTarget as HTMLElement).scrollTop;

    let lastScrollTop = readScrollTop();
    const handleScroll = () => {
      const nextScrollTop = readScrollTop();
      const deltaY = nextScrollTop - lastScrollTop;
      lastScrollTop = nextScrollTop;

      if (!isVisible || isRevealing || prefersReducedMotion) return;
      if (chart.getActiveElements().length > 0) return;

      // Scroll down dips & rebounds; scroll up lifts & settles, proportional to each point's value
      const impulse = Math.max(-0.08, Math.min(0.08, deltaY * 0.0018));
      springVelocity = Math.max(-0.14, Math.min(0.14, springVelocity - impulse));
      startLoopIfNeeded();
    };

    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', handleScroll);
      stopLoop();
      if (revealTimer) window.clearTimeout(revealTimer);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [period, labels, salesData, trxData]);

  return (
    <div ref={containerRef}>
      <div className="relative w-full h-[230px] sm:h-[265px]">
        <canvas ref={canvasRef} aria-label="Grafik Penjualan dan Volume Transaksi" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 mt-3 pt-2 text-xs sm:text-sm font-semibold">
        <div className="flex items-center gap-2">
          <div className="flex items-center w-6 justify-center">
            <span className="w-2 h-[2px] bg-orange-600 rounded-full" />
            <span className="w-2.5 h-2.5 rounded-full border-2 border-orange-600 bg-white -ml-0.5 -mr-0.5 z-10 shrink-0" />
            <span className="w-2 h-[2px] bg-orange-600 rounded-full" />
          </div>
          <span className="text-gray-700">
            {period === 'HARI' ? 'Total penjualan per jam' : 'Total penjualan per hari'}
          </span>
          <Tooltip
            content="Nilai nominal uang (omzet rupiah) dari perhiasan emas yang terjual pada periode tersebut."
            side="top"
          >
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
              aria-label="Info Total penjualan"
            >
              <Info size={12} />
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center w-6 justify-center">
            <span className="w-2 h-[2px] bg-blue-600 rounded-full" />
            <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 bg-white -ml-0.5 -mr-0.5 z-10 shrink-0" />
            <span className="w-2 h-[2px] bg-blue-600 rounded-full" />
          </div>
          <span className="text-gray-700">
            {period === 'HARI' ? 'Total transaksi per jam' : 'Total transaksi per hari'}
          </span>
          <Tooltip
            content="Jumlah nota / struk belanja yang berhasil diselesaikan pada periode tersebut."
            side="top"
          >
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
              aria-label="Info Total transaksi"
            >
              <Info size={12} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
