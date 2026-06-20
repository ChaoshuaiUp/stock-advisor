/**
 * 对比页专用 Hook：批量加载多只股票的完整分析数据
 *
 * 特性：
 * - 支持任意 A 股代码（不限于预设）
 * - 并发拉取行情+K线（Promise.allSettled）
 * - 每只股票独立的 loading/error 状态
 * - 与 useStockAnalysis 共享相同的计算引擎
 */
import { useState, useEffect, useRef } from 'react';
import type { StockAnalysis, Stock, KLine } from '@/types';
import { ALL_STOCKS, VALUATION_DATA } from '@/data/stocks';
import { getIndicatorsSnapshot } from '@/data/mockGenerator';
import { calculateSignal, generateAdvice } from '@/engine/signal';
import { calculatePriceZone } from '@/engine/priceZone';
import { fetchQuotes, fetchKLine } from '@/services/stockApi';
import type { KLineBar } from '@/services/stockApi';
import { calcMA, calcMACD, calcRSI, calcBollinger } from '@/engine/indicators';

// ── 工具函数（复用 useStockAnalysis 逻辑）─────────────────────────────────────

function mapKLineBars(bars: KLineBar[]): KLine[] {
  return bars.map(b => ({
    date: b.date, open: b.open, close: b.close,
    high: b.high, low: b.low, volume: b.volume, turnover: b.turnover,
  }));
}

function buildIndicators(klines: KLine[]) {
  if (klines.length === 0) return null;

  const closes = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);

  const ma5Arr  = calcMA(closes, 5);
  const ma10Arr = calcMA(closes, 10);
  const ma20Arr = calcMA(closes, 20);
  const ma60Arr = calcMA(closes, 60);

  const { latestDif, latestDea, latestBar, dif, dea, bar } = calcMACD(closes);
  const rsiArr = calcRSI(closes, 14);
  const { latest: bollinger } = calcBollinger(closes);

  const lastIdx = closes.length - 1;
  const macdHistory = klines.map((k, i) => ({
    date: k.date,
    dif: Math.round((dif[i] || 0) * 100) / 100,
    dea: Math.round((dea[i] || 0) * 100) / 100,
    bar: Math.round((bar[i] || 0) * 100) / 100,
  })).filter(h => !isNaN(h.dif));

  const avgVolume20 = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const volumeRatio = avgVolume20 > 0 ? volumes[lastIdx] / avgVolume20 : 1;

  return {
    ma5: ma5Arr[lastIdx] || closes[lastIdx],
    ma10: ma10Arr[lastIdx] || closes[lastIdx],
    ma20: ma20Arr[lastIdx] || closes[lastIdx],
    ma60: ma60Arr[lastIdx] || closes[lastIdx],
    macd: { dif: latestDif, dea: latestDea, bar: latestBar, history: macdHistory },
    rsi14: rsiArr[lastIdx] || 50,
    bollinger,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    prevPrice: closes[lastIdx - 1] || closes[lastIdx],
    klineData: klines,
  };
}

function buildFallbackIndicators(currentPrice: number, prevClose: number) {
  const fakeCount = 65;
  const fakeCloses: number[] = [];
  let p = prevClose > 0 ? prevClose : currentPrice;
  for (let i = 0; i < fakeCount; i++) {
    const noise = (Math.random() - 0.48) * p * 0.008;
    p = Math.max(p + noise, 0.01);
    fakeCloses.push(p);
  }
  fakeCloses[fakeCloses.length - 1] = currentPrice;

  const fakeKlines: KLine[] = fakeCloses.map((c, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (fakeCount - 1 - i));
    return { date: d.toISOString().split('T')[0], open: c, close: c, high: c*1.005, low: c*0.995, volume: 10000, turnover: c*10000 };
  });
  return buildIndicators(fakeKlines);
}

function detectMarket(code: string): 'SH' | 'SZ' {
  return (code.startsWith('6') || code.startsWith('9')) ? 'SH' : 'SZ';
}

// ── 单只股票的分析加载（内部函数）──────────────────────────────────────────────

async function loadOneStock(
  code: string,
  liveQuotes: Record<string, { name: string; price: number; change: number; changeAmount: number; prevClose: number; open: number; high: number; low: number; volumeYi: number; peTtm: number; pb: number }>
): Promise<{ analysis: StockAnalysis; isLive: boolean } | null> {
  const preset = ALL_STOCKS.find(s => s.code === code);
  const valData = VALUATION_DATA[code];
  const q = liveQuotes[code];
  const isLive = !!(q && q.price > 0);

  // 非预设且无行情 → 放弃
  if (!preset && !isLive) return null;

  const stock: Stock = preset
    ? {
        ...preset,
        ...(isLive ? {
          currentPrice: q.price,
          change: q.change,
          changeAmount: q.changeAmount,
          prevClose: q.prevClose,
          openPrice: q.open,
          highPrice: q.high,
          lowPrice: q.low,
          volume: q.volumeYi,
        } : {}),
      }
    : {
        code,
        name: q.name,
        pinyin: '',
        pinyinShort: '',
        industry: '未知',
        market: detectMarket(code),
        currentPrice: q.price,
        change: q.change,
        changeAmount: q.changeAmount,
        prevClose: q.prevClose,
        openPrice: q.open,
        highPrice: q.high,
        lowPrice: q.low,
        volume: q.volumeYi,
      };

  // 拉 K 线
  let klines: KLine[] = [];
  try {
    const bars = await fetchKLine(code, 120);
    if (bars.length > 20) klines = mapKLineBars(bars);
  } catch { /* 静默 */ }

  const indicators = klines.length > 20
    ? buildIndicators(klines)
    : preset
      ? getIndicatorsSnapshot(code)
      : buildFallbackIndicators(stock.currentPrice, stock.prevClose);

  if (!indicators) return null;

  const valuation = valData
    ? { ...valData }
    : {
        pe: q?.peTtm || 30,
        pb: q?.pb || 2,
        pePercentile: 50,
        roe: 15,
        dividendYield: 1,
        industryAvgPE: (q?.peTtm || 30) * 1.1,
        industryAvgPB: (q?.pb || 2) * 1.1,
        revenueGrowth: 10,
        profitGrowth: 10,
        debtRatio: 40,
        ytdChange: 0,
        oneMonthChange: 0,
      };

  const tempAnalysis: StockAnalysis = {
    stock,
    signal: { score: 0, level: 'hold', label: '', color: 'yellow', details: [] },
    priceZone: { currentPrice: 0, buyLower: 0, buyUpper: 0, sellLower: 0, sellUpper: 0, upsidePercent: 0, position: 'below' },
    indicators,
    valuation,
    advice: '',
  };

  tempAnalysis.priceZone = calculatePriceZone(indicators, stock);
  tempAnalysis.signal = calculateSignal(tempAnalysis);
  tempAnalysis.advice = generateAdvice(tempAnalysis.signal, stock.name, tempAnalysis.priceZone);

  return { analysis: tempAnalysis, isLive };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface CompareItem {
  code: string;
  analysis: StockAnalysis | null;
  loading: boolean;
  isLive: boolean;
  error: string | null;
}

export interface UseCompareAnalysisResult {
  items: CompareItem[];
  isLoading: boolean;   // 任意一只还在加载
  isAnyLive: boolean;   // 至少一只有实时数据
  reload: () => void;
}

export function useCompareAnalysis(codes: string[]): UseCompareAnalysisResult {
  const [items, setItems] = useState<CompareItem[]>(() =>
    codes.map(code => ({ code, analysis: null, loading: true, isLive: false, error: null }))
  );
  const abortRef = useRef(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const codeKey = codes.join(',');
    if (!codeKey) {
      setItems([]);
      return;
    }

    abortRef.current = false;

    // 初始化全部为 loading 状态
    setItems(codes.map(code => ({ code, analysis: null, loading: true, isLive: false, error: null })));

    const run = async () => {
      // 批量拉行情（一次请求所有代码）
      let liveQuotes: Record<string, Parameters<typeof loadOneStock>[1][string]> = {};
      try {
        liveQuotes = await fetchQuotes(codes) as typeof liveQuotes;
      } catch { /* 降级 */ }

      if (abortRef.current) return;

      // 并发加载各只股票的 K 线和分析
      const results = await Promise.allSettled(
        codes.map(code => loadOneStock(code, liveQuotes))
      );

      if (abortRef.current) return;

      const newItems: CompareItem[] = codes.map((code, idx) => {
        const result = results[idx];
        if (result.status === 'fulfilled' && result.value) {
          return {
            code,
            analysis: result.value.analysis,
            loading: false,
            isLive: result.value.isLive,
            error: null,
          };
        }
        return {
          code,
          analysis: null,
          loading: false,
          isLive: false,
          error: result.status === 'rejected' ? String(result.reason) : '数据不可用',
        };
      });

      setItems(newItems);
    };

    run();

    return () => {
      abortRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes.join(','), reloadTick]);

  const isLoading = items.some(i => i.loading);
  const isAnyLive = items.some(i => i.isLive);

  return {
    items,
    isLoading,
    isAnyLive,
    reload: () => setReloadTick(t => t + 1),
  };
}
