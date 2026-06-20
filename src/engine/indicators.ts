// 技术指标计算（MA / MACD / RSI / 布林带）
import type { MacdData, Bollinger } from '@/types';

/**
 * 计算简单移动平均线 (SMA)
 */
export function calcMA(closes: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * 计算 EMA (指数移动平均)
 */
export function calcEMA(closes: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(closes[0]);
    } else {
      result.push(closes[i] * multiplier + result[i - 1] * (1 - multiplier));
    }
  }
  return result;
}

/**
 * 计算 MACD
 * @returns dif, dea, bar 数组, 以及最新值
 */
export function calcMACD(closes: number[], shortPeriod = 12, longPeriod = 26, signalPeriod = 9): {
  dif: number[];
  dea: number[];
  bar: number[];
  history: MacdData[];
  latestDif: number;
  latestDea: number;
  latestBar: number;
} {
  const emaShort = calcEMA(closes, shortPeriod);
  const emaLong = calcEMA(closes, longPeriod);

  const dif = emaShort.map((s, i) => {
    const l = emaLong[i];
    return isNaN(l) ? NaN : s - l;
  });

  const validDif = dif.filter(d => !isNaN(d));
  const dea = calcEMA(validDif, signalPeriod);

  // 对齐 dea 到 dif 的索引
  const deaAligned: number[] = [];
  let validIdx = 0;
  for (let i = 0; i < dif.length; i++) {
    if (isNaN(dif[i])) {
      deaAligned.push(NaN);
    } else {
      deaAligned.push(dea[validIdx] ?? NaN);
      validIdx++;
    }
  }

  const bar = dif.map((d, i) => {
    const e = deaAligned[i];
    return isNaN(d) || isNaN(e) ? NaN : 2 * (d - e);
  });

  // 构建 history（配合日期）
  const history: MacdData[] = [];
  // 不需要 date，由外部组装

  const latestDif = dif[dif.length - 1] || 0;
  const latestDea = deaAligned[deaAligned.length - 1] || 0;
  const latestBar = bar[bar.length - 1] || 0;

  return {
    dif,
    dea: deaAligned,
    bar,
    history,
    latestDif: isNaN(latestDif) ? 0 : latestDif,
    latestDea: isNaN(latestDea) ? 0 : latestDea,
    latestBar: isNaN(latestBar) ? 0 : latestBar,
  };
}

/**
 * 计算 RSI
 */
export function calcRSI(closes: number[], period = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(NaN);
      continue;
    }
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  if (gains.length < period) {
    return closes.map(() => 50); // 数据不够返回中性
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const rsiValues: number[] = [];
  rsiValues.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsiValues.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  // 对齐到原始索引
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(50); // 数据不足返回中性
    } else {
      result.push(rsiValues[i - period] ?? 50);
    }
  }

  return result;
}

/**
 * 计算布林带
 */
export function calcBollinger(closes: number[], period = 20, multiplier = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
  latest: Bollinger;
} {
  const middle = calcMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const std = Math.sqrt(slice.reduce((sum, val) => sum + Math.pow(val - middle[i], 2), 0) / period);
      upper.push(middle[i] + multiplier * std);
      lower.push(middle[i] - multiplier * std);
    }
  }

  const lastIdx = closes.length - 1;
  const latest = {
    upper: upper[lastIdx] || closes[lastIdx] * 1.05,
    middle: middle[lastIdx] || closes[lastIdx],
    lower: lower[lastIdx] || closes[lastIdx] * 0.95,
  };

  return { upper, middle, lower, latest };
}

/**
 * 趋势强度评分（权重 30%）
 */
export function calcTrendStrength(params: {
  ma5: number; ma10: number; ma20: number; ma60: number;
  currentPrice: number;
}): number {
  const { ma5, ma10, ma20, ma60, currentPrice } = params;
  const alignment = [ma5, ma10, ma20, ma60];

  const isBullishAll = ma5 > ma10 && ma10 > ma20 && ma20 > ma60 && currentPrice > ma5;
  const isBearishAll = ma5 < ma10 && ma10 < ma20 && ma20 < ma60 && currentPrice < ma5;
  const priceAboveMA = alignment.filter(ma => currentPrice > ma).length;

  if (isBullishAll) return 5.0;
  if (isBearishAll) return 0;
  if (priceAboveMA >= 3) return 3.5;
  if (priceAboveMA <= 1) return 1.5;
  return 2.5;
}

/**
 * RSI 评分（权重 20%）
 */
export function calcRSIScore(rsi14: number): number {
  if (rsi14 <= 25) return 5.0;
  if (rsi14 <= 35) return 4.0;
  if (rsi14 <= 45) return 3.5;
  if (rsi14 <= 55) return 2.5;
  if (rsi14 <= 65) return 1.5;
  if (rsi14 <= 75) return 0.75;
  return 0;
}

/**
 * MACD 动量评分（权重 25%）
 */
export function calcMomentum(params: {
  dif: number; dea: number; bar: number; prevBar: number;
}): number {
  const { dif, dea, bar, prevBar } = params;

  if (dif > dea && bar > 0 && bar > prevBar) return 5.0;  // 金叉后发散向上
  if (dif > dea && bar > 0) return 4.0;                     // 金叉但力度减弱
  if (dif > dea && bar < 0) return 3.0;                     // 金叉初期
  if (dif < dea && bar < 0) return 1.0;                     // 死叉后走弱
  return 0;                                                    // 死叉后加速向下
}

/**
 * 估值评分（权重 15%）
 */
export function calcValuationScore(pePercentile: number): number {
  if (pePercentile <= 20) return 5.0;
  if (pePercentile <= 40) return 3.5;
  if (pePercentile <= 60) return 2.5;
  if (pePercentile <= 80) return 1.5;
  return 0.5;
}

/**
 * 量价配合评分（权重 10%）
 */
export function calcVolumeScore(params: {
  volumeRatio: number; currentPrice: number; prevPrice: number;
}): number {
  const { volumeRatio, currentPrice, prevPrice } = params;
  const priceUp = currentPrice > prevPrice;

  if (priceUp && volumeRatio > 1.2) return 5.0;   // 价涨量增
  if (priceUp && volumeRatio > 1.0) return 3.5;    // 价涨量平
  if (priceUp && volumeRatio < 0.8) return 1.5;    // 价涨量缩
  if (!priceUp && volumeRatio > 1.2) return 1.0;    // 价跌量增
  if (!priceUp && volumeRatio > 1.0) return 2.0;    // 价跌量平
  if (!priceUp && volumeRatio < 0.8) return 3.0;    // 价跌量缩
  return 2.5;
}
