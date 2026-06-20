/**
 * 个股分析数据 hook（实时行情 + 计算引擎）
 *
 * 优先级：
 *   1. 尝试从代理服务拉实时行情和 K 线
 *   2. 若代理服务不可用（本地未启动/离线），降级到 mock 数据
 *
 * 支持范围：
 *   - ALL_STOCKS 预设股票：有完整 mock 数据兜底
 *   - 任意 A 股代码：纯实时模式，若拉不到行情则返回 null
 *
 * 返回：{ analysis, loading, isLive, error }
 */
import { useState, useEffect, useRef } from 'react';
import type { StockAnalysis, Stock } from '@/types';
import { ALL_STOCKS, VALUATION_DATA } from '@/data/stocks';
import { getIndicatorsSnapshot } from '@/data/mockGenerator';
import { calculateSignal, generateAdvice } from '@/engine/signal';
import { calculatePriceZone } from '@/engine/priceZone';
import { fetchQuotes, fetchKLine } from '@/services/stockApi';
import type { KLineBar } from '@/services/stockApi';
import { calcMA, calcMACD, calcRSI, calcBollinger } from '@/engine/indicators';
import type { KLine } from '@/types';

// ── K线转换工具 ──────────────────────────────────────────────────────────────
function mapKLineBars(bars: KLineBar[]): KLine[] {
  return bars.map(b => ({
    date: b.date,
    open: b.open,
    close: b.close,
    high: b.high,
    low: b.low,
    volume: b.volume,
    turnover: b.turnover,
  }));
}

// ── 从 K 线序列计算指标快照 ──────────────────────────────────────────────────
function buildIndicators(klines: KLine[]) {
  if (klines.length === 0) return null;

  const closes = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);

  const ma5Arr = calcMA(closes, 5);
  const ma10Arr = calcMA(closes, 10);
  const ma20Arr = calcMA(closes, 20);
  const ma60Arr = calcMA(closes, 60);

  const { latestDif, latestDea, latestBar, dif, dea, bar } = calcMACD(closes);
  const rsiArr = calcRSI(closes, 14);
  const { latest: bollinger } = calcBollinger(closes);

  const lastIdx = closes.length - 1;

  const macdHistory = klines
    .map((k, i) => ({
      date: k.date,
      dif: Math.round((dif[i] || 0) * 100) / 100,
      dea: Math.round((dea[i] || 0) * 100) / 100,
      bar: Math.round((bar[i] || 0) * 100) / 100,
    }))
    .filter(h => !isNaN(h.dif));

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
      history: macdHistory,
    },
    rsi14: rsiArr[lastIdx] || 50,
    bollinger,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    prevPrice: closes[lastIdx - 1] || closes[lastIdx],
    klineData: klines,
  };
}

// ── 根据代码判断市场 ──────────────────────────────────────────────────────────
function detectMarket(code: string): 'SH' | 'SZ' {
  return (code.startsWith('6') || code.startsWith('9')) ? 'SH' : 'SZ';
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface StockAnalysisState {
  analysis: StockAnalysis | null;
  loading: boolean;
  isLive: boolean;    // true=实时数据，false=mock数据
  error: string | null;
}

export function useStockAnalysis(code: string): StockAnalysisState {
  const [state, setState] = useState<StockAnalysisState>({
    analysis: null,
    loading: true,
    isLive: false,
    error: null,
  });

  // 防止竞态（切换股票时取消上一次）
  const abortRef = useRef<boolean>(false);

  useEffect(() => {
    if (!code || !/^\d{6}$/.test(code)) {
      setState({ analysis: null, loading: false, isLive: false, error: '无效的股票代码' });
      return;
    }

    abortRef.current = false;
    setState(prev => ({ ...prev, loading: true, error: null }));

    // 判断是否预设股票
    const presetStock = ALL_STOCKS.find(s => s.code === code);
    const valuationData = VALUATION_DATA[code];

    const loadData = async () => {
      let klines: KLine[] = [];
      let isLive = false;

      // ── Step 1: 拉实时行情 ────────────────────────────────────────────────
      let liveQuote: {
        name: string;
        price: number;
        change: number;
        changeAmount: number;
        prevClose: number;
        open: number;
        high: number;
        low: number;
        volumeYi: number;
        peTtm: number;
        pb: number;
      } | null = null;

      try {
        const quotes = await fetchQuotes([code]);
        const q = quotes[code];
        if (q && q.price > 0) {
          liveQuote = q;
          isLive = true;
        }
      } catch {
        // 静默降级
      }

      if (abortRef.current) return;

      // ── Step 2: 非预设股票且拉不到行情 → 报错 ───────────────────────────
      if (!presetStock && !liveQuote) {
        setState({
          analysis: null,
          loading: false,
          isLive: false,
          error: `未能获取到代码 ${code} 的行情数据，请确认代码是否正确，或稍后重试`,
        });
        return;
      }

      // ── Step 3: 构造 Stock 对象 ──────────────────────────────────────────
      // 预设股票用预设数据做兜底，非预设全走实时
      const stock: Stock = presetStock
        ? {
            ...presetStock,
            // 若有实时行情，更新价格字段
            ...(liveQuote ? {
              currentPrice: liveQuote.price,
              change: liveQuote.change,
              changeAmount: liveQuote.changeAmount,
              prevClose: liveQuote.prevClose,
              openPrice: liveQuote.open,
              highPrice: liveQuote.high,
              lowPrice: liveQuote.low,
              volume: liveQuote.volumeYi,
            } : {}),
          }
        : {
            // 非预设股票：完全来自实时行情
            code,
            name: liveQuote!.name,
            pinyin: '',
            pinyinShort: '',
            industry: '未知',
            market: detectMarket(code),
            currentPrice: liveQuote!.price,
            change: liveQuote!.change,
            changeAmount: liveQuote!.changeAmount,
            prevClose: liveQuote!.prevClose,
            openPrice: liveQuote!.open,
            highPrice: liveQuote!.high,
            lowPrice: liveQuote!.low,
            volume: liveQuote!.volumeYi,
          };

      if (abortRef.current) return;

      // ── Step 4: 拉 K 线 ──────────────────────────────────────────────────
      try {
        const bars = await fetchKLine(code, 120);
        if (bars.length > 20) {
          klines = mapKLineBars(bars);
        }
      } catch {
        // 静默降级
      }

      if (abortRef.current) return;

      // ── Step 5: K 线降级 ─────────────────────────────────────────────────
      // 预设股票：有 mock 兜底；非预设股票：K线不足时用空数组做基础分析
      let indicators = klines.length > 20
        ? buildIndicators(klines)
        : presetStock
          ? getIndicatorsSnapshot(code)
          : buildFallbackIndicators(stock.currentPrice, stock.prevClose);

      if (!indicators) {
        setState({ analysis: null, loading: false, isLive, error: '指标计算失败' });
        return;
      }

      // 实时 K 线日中修正最后一根收盘价
      if (isLive && klines.length > 0) {
        const lastKline = klines[klines.length - 1];
        const today = new Date().toISOString().split('T')[0];
        if (lastKline.date === today) {
          lastKline.close = stock.currentPrice;
        }
      }

      // ── Step 6: 估值数据 ─────────────────────────────────────────────────
      // 预设股票用 VALUATION_DATA，非预设用实时 PE/PB（部分字段为估算）
      const valuation = valuationData
        ? { ...valuationData }
        : {
            pe: liveQuote?.peTtm || 30,
            pb: liveQuote?.pb || 2,
            pePercentile: 50,
            roe: 15,
            dividendYield: 1,
            industryAvgPE: (liveQuote?.peTtm || 30) * 1.1,
            industryAvgPB: (liveQuote?.pb || 2) * 1.1,
            revenueGrowth: 10,
            profitGrowth: 10,
            debtRatio: 40,
            ytdChange: 0,
            oneMonthChange: 0,
          };

      // ── Step 7: 计算信号和价位 ───────────────────────────────────────────
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

      const priceZone = calculatePriceZone(indicators, stock);
      tempAnalysis.priceZone = priceZone;

      const signal = calculateSignal(tempAnalysis);
      tempAnalysis.signal = signal;

      const advice = generateAdvice(signal, stock.name, priceZone);
      tempAnalysis.advice = advice;

      if (!abortRef.current) {
        setState({ analysis: tempAnalysis, loading: false, isLive, error: null });
      }
    };

    loadData();

    return () => {
      abortRef.current = true;
    };
  }, [code]);

  return state;
}

// ── 无 K 线时的最简指标构造（仅用价格估算）────────────────────────────────────
// 适用于无历史数据的非预设股票，让分析引擎能正常运行
function buildFallbackIndicators(currentPrice: number, prevClose: number) {
  // 用当前价构造一段平稳的伪历史（60天），让 MA/RSI 等有计算基础
  const fakeCount = 65;
  const fakeCloses: number[] = [];
  // 以前收为基准，轻微随机波动模拟历史
  let p = prevClose > 0 ? prevClose : currentPrice;
  for (let i = 0; i < fakeCount; i++) {
    const noise = (Math.random() - 0.48) * p * 0.008;
    p = Math.max(p + noise, 0.01);
    fakeCloses.push(p);
  }
  // 最后一根用当前价
  fakeCloses[fakeCloses.length - 1] = currentPrice;

  const fakeKlines: KLine[] = fakeCloses.map((c, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (fakeCount - 1 - i));
    return {
      date: d.toISOString().split('T')[0],
      open: c,
      close: c,
      high: c * 1.005,
      low: c * 0.995,
      volume: 10000,
      turnover: c * 10000,
    };
  });

  return buildIndicators(fakeKlines);
}
