// K线数据伪随机生成器
// 为每只股票设定"剧本"，确保演示效果覆盖三种信号状态
import type { KLine, MacdData } from '@/types';
import { calcMA, calcMACD, calcRSI, calcBollinger } from '@/engine/indicators';

// 简易伪随机数生成器（可设置种子，保证每次结果一致）
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

interface StockScript {
  code: string;
  basePrice: number;
  trend: 'bull' | 'bear' | 'sideways';
  volatility: number;
  klineCount: number;
  seed: number;
}

const SCRIPTS: StockScript[] = [
  { code: '600519', basePrice: 1500, trend: 'bull',     volatility: 0.015, klineCount: 120, seed: 519 },
  { code: '300750', basePrice: 190,  trend: 'sideways',  volatility: 0.025, klineCount: 120, seed: 750 },
  { code: '601318', basePrice: 40,   trend: 'bear',      volatility: 0.018, klineCount: 120, seed: 318 },
  { code: '000858', basePrice: 160,  trend: 'bull',      volatility: 0.022, klineCount: 120, seed: 858 },
  { code: '002594', basePrice: 250,  trend: 'sideways',  volatility: 0.028, klineCount: 120, seed: 594 },
  { code: '300760', basePrice: 280,  trend: 'bear',      volatility: 0.020, klineCount: 120, seed: 760 },
];

/**
 * 生成单只股票的 K 线数据
 */
export function generateKLineData(code: string): KLine[] {
  const script = SCRIPTS.find(s => s.code === code);
  if (!script) return [];

  const { basePrice, trend, volatility, klineCount, seed } = script;
  const random = seededRandom(seed);
  const klines: KLine[] = [];

  let prevClose = basePrice * (0.85 + random() * 0.15); // 从较低位置开始

  // 生成日期序列（120个交易日 ≈ 半年）
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - klineCount * 1.5);

  for (let i = 0; i < klineCount; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor(i * 1.5));
    const dateStr = date.toISOString().split('T')[0];

    // 趋势偏向
    let trendBias = 0;
    if (trend === 'bull') {
      trendBias = 0.002 + (i / klineCount) * 0.001; // 逐渐加速
    } else if (trend === 'bear') {
      trendBias = -0.002 - (i / klineCount) * 0.001;
    } else {
      trendBias = Math.sin(i / 15) * 0.001; // 震荡
    }

    const change = (random() - 0.48 + trendBias) * volatility;
    const open = prevClose;
    const close = prevClose * (1 + change);
    const high = Math.max(open, close) * (1 + random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - random() * volatility * 0.5);
    const volume = Math.round(5000000 + random() * 20000000);
    const turnover = Math.round(volume * (open + close) / 2 / 10000);

    klines.push({
      date: dateStr,
      open: Math.round(open * 100) / 100,
      close: Math.round(close * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      volume,
      turnover,
    });

    prevClose = close;
  }

  return klines;
}

/**
 * 获取所有 K 线数据的缓存
 */
const klineCache: Record<string, KLine[]> = {};

export function getKLineData(code: string): KLine[] {
  if (!klineCache[code]) {
    klineCache[code] = generateKLineData(code);
  }
  return klineCache[code];
}

/**
 * 获取 MACD 历史数据（配合日期）
 */
export function getMacdHistory(code: string): MacdData[] {
  const klines = getKLineData(code);
  const closes = klines.map(k => k.close);
  const { dif, dea, bar } = calcMACD(closes);

  const history: MacdData[] = [];
  for (let i = 0; i < klines.length; i++) {
    if (!isNaN(dif[i]) && !isNaN(dea[i]) && !isNaN(bar[i])) {
      history.push({
        date: klines[i].date,
        dif: Math.round(dif[i] * 100) / 100,
        dea: Math.round(dea[i] * 100) / 100,
        bar: Math.round(bar[i] * 100) / 100,
      });
    }
  }
  return history;
}

/**
 * 获取计算好的指标快照（最新值）
 */
export function getIndicatorsSnapshot(code: string) {
  const klines = getKLineData(code);
  if (klines.length === 0) return null;

  const closes = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);

  const ma5Arr = calcMA(closes, 5);
  const ma10Arr = calcMA(closes, 10);
  const ma20Arr = calcMA(closes, 20);
  const ma60Arr = calcMA(closes, 60);

  const { latestDif, latestDea, latestBar } = calcMACD(closes);
  const rsiArr = calcRSI(closes, 14);
  const { latest: bollinger } = calcBollinger(closes);

  const lastIdx = closes.length - 1;

  // 量比 = 今日成交量 / 过去20日平均成交量
  const avgVolume20 = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const volumeRatio = avgVolume20 > 0 ? volumes[lastIdx] / avgVolume20 : 1;

  return {
    ma5: ma5Arr[lastIdx] || closes[lastIdx],
    ma10: ma10Arr[lastIdx] || closes[lastIdx],
    ma20: ma20Arr[lastIdx] || closes[lastIdx],
    ma60: ma60Arr[lastIdx] || closes[lastIdx],
    macd: {
      dif: latestDif,
      dea: latestDea,
      bar: latestBar,
      history: getMacdHistory(code),
    },
    rsi14: rsiArr[lastIdx] || 50,
    bollinger,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    prevPrice: closes[lastIdx - 1] || closes[lastIdx],
    klineData: klines,
  };
}
