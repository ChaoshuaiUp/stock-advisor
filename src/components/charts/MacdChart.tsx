// MACD 图
import ReactECharts from 'echarts-for-react';
import type { KLine } from '@/types';

interface MacdChartProps {
  klines: KLine[];
  dif: number[];
  dea: number[];
  bar: number[];
}

export default function MacdChart({ klines, dif, dea, bar }: MacdChartProps) {
  const dates = klines.map(k => k.date);

  const option = {
    backgroundColor: 'transparent',
    animation: true,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#0f172a', fontSize: 12 },
    },
    legend: {
      data: ['DIF', 'DEA', 'MACD柱'],
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
      scale: true,
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    dataZoom: [
      { type: 'inside', start: 50, end: 100 },
    ],
    series: [
      {
        name: 'DIF',
        type: 'line',
        data: dif.map(v => isNaN(v) ? null : Math.round(v * 100) / 100),
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#FFA500' },
        itemStyle: { color: '#FFA500' },
      },
      {
        name: 'DEA',
        type: 'line',
        data: dea.map(v => isNaN(v) ? null : Math.round(v * 100) / 100),
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#45B7D1' },
        itemStyle: { color: '#45B7D1' },
      },
      {
        name: 'MACD柱',
        type: 'bar',
        data: bar.map(v => isNaN(v) ? null : Math.round(v * 100) / 100),
        itemStyle: {
          color: function (params: { value: number }) {
            return params.value >= 0 ? '#dc2626' : '#16a34a';
          },
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 300, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
