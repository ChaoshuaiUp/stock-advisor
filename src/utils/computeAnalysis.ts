// 非 hook 版本的股票分析计算（避免在循环中调用 hook）
import type { StockAnalysis } from '@/types';
import { ALL_STOCKS, VALUATION_DATA } from '@/data/stocks';
import { getIndicatorsSnapshot } from '@/data/mockGenerator';
import { calculateSignal, generateAdvice } from '@/engine/signal';
import { calculatePriceZone } from '@/engine/priceZone';

const cache: Record<string, StockAnalysis> = {};

export function computeStockAnalysis(code: string): StockAnalysis | null {
  if (cache[code]) return cache[code];

  const stock = ALL_STOCKS.find(s => s.code === code);
  if (!stock) return null;

  const indicators = getIndicatorsSnapshot(code);
  if (!indicators) return null;

  const valuation = VALUATION_DATA[code];
  if (!valuation) return null;

  const tempAnalysis: StockAnalysis = {
    stock,
    signal: { score: 0, level: 'hold', label: '', color: 'yellow', details: [] },
    priceZone: {
      currentPrice: 0, buyLower: 0, buyUpper: 0,
      sellLower: 0, sellUpper: 0, upsidePercent: 0, position: 'below',
    },
    indicators,
    valuation,
    advice: '',
  };

  tempAnalysis.priceZone = calculatePriceZone(indicators, stock);
  tempAnalysis.signal = calculateSignal(tempAnalysis);
  tempAnalysis.advice = generateAdvice(tempAnalysis.signal, stock.name, tempAnalysis.priceZone);

  cache[code] = tempAnalysis;
  return tempAnalysis;
}
