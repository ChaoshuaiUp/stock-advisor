// RSI 图
import ReactECharts from 'echarts-for-react';
import type { KLine } from '@/types';

interface RsiChartProps {
  klines: KLine[];
  rsi: number[];
}

export default function RsiChart({ klines, rsi }: RsiChartProps) {
  const dates = klines.map(k => k.date);
  const rsiData = rsi.map(v => isNaN(v) ? null : Math.round(v * 100) / 100);

  const option = {
    backgroundColor: 'transparent',
    animation: true,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#0f172a', fontSize: 12 },
    },
    legend: {
      data: ['RSI(14)'],
      top: 0,
      textStyle: { fontSize: 11, color: '#94a3b8' },
    },
    grid: {
      left: '8%', right: '3%', top: '12%', bottom: '15%',
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: true,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    yAxis: {
      min: 0,
      max: 100,
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    dataZoom: [
      { type: 'inside', start: 50, end: 100 },
    ],
    series: [
      {
        name: 'RSI(14)',
        type: 'line',
        data: rsiData,
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#6366f1' },
        itemStyle: { color: '#6366f1' },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 1 },
          data: [
            {
              yAxis: 70,
              lineStyle: { color: '#dc2626' },
              label: { formatter: '超买 70', fontSize: 10, color: '#dc2626' },
            },
            {
              yAxis: 30,
              lineStyle: { color: '#16a34a' },
              label: { formatter: '超卖 30', fontSize: 10, color: '#16a34a' },
            },
          ],
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99, 102, 241, 0.15)' },
              { offset: 1, color: 'rgba(99, 102, 241, 0)' },
            ],
          },
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 250, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
