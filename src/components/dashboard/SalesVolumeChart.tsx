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

export const SalesVolumeChart: React.FC<SalesVolumeChartProps> = ({
  period,
  labels,
  salesData,
  trxData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart<'line'> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const areaGradient = ctx.createLinearGradient(0, 0, 0, 260);
    areaGradient.addColorStop(0, 'rgba(249, 115, 22, 0.16)');
    areaGradient.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

    const maxSales = Math.max(...salesData, 0);
    const maxTrx = Math.max(...trxData, 0);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: period === 'HARI' ? 'Total penjualan per jam' : 'Total penjualan per hari',
            data: salesData,
            yAxisID: 'ySales',
            borderColor: '#ea580c',
            backgroundColor: areaGradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.32,
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
            data: trxData,
            yAxisID: 'yTrx',
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderWidth: 2.25,
            fill: false,
            tension: 0.32,
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
        animation: {
          duration: 350,
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
                const value = Number(item.parsed.y ?? 0);
                if (item.datasetIndex === 0) {
                  return ` Penjualan: ${formatIDR(value)}`;
                }
                return ` Transaksi: ${value} nota`;
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
            suggestedMax: maxSales > 0 ? undefined : 1000000,
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
            suggestedMax: maxTrx > 0 ? Math.max(4, Math.ceil(maxTrx * 1.25)) : 4,
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
    };

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [period, labels, salesData, trxData]);

  return (
    <div>
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
