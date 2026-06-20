// 买卖价位计算
import type { PriceZone, Indicators, Stock } from '@/types';

export function calculatePriceZone(
  indicators: Indicators,
  stock: Stock
): PriceZone {
  const { ma20, ma60, bollinger } = indicators;
  const currentPrice = stock.currentPrice;

  // 买入下限 = MAX(MA60, 布林下轨, 当前价×0.92)
  const buyLower = Math.max(ma60, bollinger.lower, currentPrice * 0.92);

  // 买入上限 = MIN(MA20, 布林中轨, 当前价×1.02)
  const buyUpper = Math.min(ma20, bollinger.middle, currentPrice * 1.02);

  // 确保买入区间有效（下限 < 上限）
  const effectiveBuyUpper = Math.max(buyLower * 1.01, buyUpper);

  // 卖出下限 = MAX(布林上轨, 当前价×1.08)
  const sellLower = Math.max(bollinger.upper, currentPrice * 1.08);

  // 卖出上限 = 布林上轨 × 1.05
  const sellUpper = bollinger.upper * 1.05;

  const upsidePercent = ((sellLower - currentPrice) / currentPrice) * 100;

  const isInBuyZone = currentPrice >= buyLower && currentPrice <= effectiveBuyUpper;
  const isAboveBuyZone = currentPrice > effectiveBuyUpper;
  const position = isInBuyZone ? 'in' : isAboveBuyZone ? 'above' : 'below';

  return {
    currentPrice,
    buyLower: Math.round(buyLower * 100) / 100,
    buyUpper: Math.round(effectiveBuyUpper * 100) / 100,
    sellLower: Math.round(sellLower * 100) / 100,
    sellUpper: Math.round(sellUpper * 100) / 100,
    upsidePercent: Math.round(upsidePercent * 10) / 10,
    position,
  };
}
