// K线图 + 均线
import ReactECharts from 'echarts-for-react';
import type { KLine } from '@/types';

interface KLineChartProps {
  klines: KLine[];
  ma5: number[];
  ma10: number[];
  ma20: number[];
  ma60: number[];
}

export default function KLineChart({ klines, ma5, ma10, ma20, ma60 }: KLineChartProps) {
  const dates = klines.map(k => k.date);
  const ohlc = klines.map(k => [k.open, k.close, k.low, k.high]);
  const volumes = klines.map(k => k.volume);

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
      data: ['MA5', 'MA10', 'MA20', 'MA60'],
      top: 0,
      textStyle: { fontSize: 11, color: '#94a3b8' },
    },
    grid: [
      { left: '8%', right: '3%', top: '12%', height: '55%' },
      { left: '8%', right: '3%', top: '72%', height: '18%' },
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        gridIndex: 0,
      },
      {
        type: 'category',
        data: dates,
        gridIndex: 1,
        axisLabel: { show: false },
      },
    ],
    yAxis: [
      {
        scale: true,
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        gridIndex: 0,
      },
      {
        scale: true,
        gridIndex: 1,
        splitLine: { show: false },
        axisLabel: { show: false },
      },
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 50,
        end: 100,
      },
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: ohlc,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: '#dc2626',       // 阳线（涨）红色
          color0: '#16a34a',      // 阴线（跌）绿色
          borderColor: '#dc2626',
          borderColor0: '#16a34a',
        },
      },
      {
        name: 'MA5',
        type: 'line',
        data: ma5,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1, color: '#FF6B6B' },
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        name: 'MA10',
        type: 'line',
        data: ma10,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1, color: '#FFA500' },
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        name: 'MA20',
        type: 'line',
        data: ma20,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1, color: '#4ECDC4' },
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        name: 'MA60',
        type: 'line',
        data: ma60,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1, color: '#45B7D1' },
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        name: '成交量',
        type: 'bar',
        data: volumes,
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: function (params: { dataIndex: number }) {
            const k = klines[params.dataIndex];
            return k && k.close >= k.open ? '#dc2626' : '#16a34a';
          },
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 400, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
