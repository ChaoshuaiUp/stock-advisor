// 个股分析页（核心页面）
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Wifi, WifiOff, BarChart2 } from 'lucide-react';
import { useStockAnalysis } from '@/hooks/useStockAnalysis';
import SignalLight from '@/components/SignalLight';
import PriceZone from '@/components/PriceZone';
import PlainTextAdvice from '@/components/PlainTextAdvice';
import { formatPrice } from '@/utils/format';
import { calcMA, calcMACD, calcRSI } from '@/engine/indicators';
import KLineChart from '@/components/charts/KLineChart';
import MacdChart from '@/components/charts/MacdChart';
import RsiChart from '@/components/charts/RsiChart';
import { useAppContext, useCompareList } from '@/context/AppContext';

// 最近查看（与搜索页共享逻辑）
// 存储格式: { code, name, market }[]，支持非预设股票
const RECENT_KEY = 'stock_recent_viewed';

export interface RecentStock {
  code: string;
  name: string;
  market: string;
}

function addRecentViewed(stock: RecentStock) {
  try {
    const recent: RecentStock[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const updated = [stock, ...recent.filter(s => s.code !== stock.code)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export default function StockDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { dispatch } = useAppContext();
  const compareList = useCompareList();
  const { analysis, loading, isLive, error } = useStockAnalysis(code || '');
  const [showTech, setShowTech] = useState(false);
  const [showValuation, setShowValuation] = useState(false);
  const [chartType, setChartType] = useState<'kline' | 'macd' | 'rsi'>('kline');

  // 分析完成后记录最近查看（带名称）
  useEffect(() => {
    if (analysis?.stock) {
      addRecentViewed({
        code: analysis.stock.code,
        name: analysis.stock.name,
        market: analysis.stock.market,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.stock?.code]);

  // 从分析结果中获取 K 线和指标数据（已包含实时或 mock K 线）
  const chartData = useMemo(() => {
    if (!analysis) return null;
    const klines = analysis.indicators.klineData;
    if (klines.length === 0) return null;

    const closes = klines.map(k => k.close);
    const ma5 = calcMA(closes, 5);
    const ma10 = calcMA(closes, 10);
    const ma20 = calcMA(closes, 20);
    const ma60 = calcMA(closes, 60);
    const { dif, dea, bar } = calcMACD(closes);
    const rsi = calcRSI(closes, 14);

    return { klines, closes, ma5, ma10, ma20, ma60, dif, dea, bar, rsi };
  }, [analysis]);

  // 加载中
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4 pt-4">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (!analysis || !code) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="text-5xl mb-4">📭</div>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {error ? '获取数据失败' : `暂无 ${code} 的分析数据`}
        </h2>
        <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
          {error || '请确认代码是否正确，或稍后重试'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            返回搜索
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm font-medium bg-blue-600 rounded-lg hover:bg-blue-700 text-white transition-colors"
          >
            回到首页
          </button>
        </div>
      </div>
    );
  }

  const { stock, signal, priceZone, valuation, advice } = analysis;
  const isUp = stock.change > 0;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* 头部 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-1.5 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> 返回
          </button>
          <div className="flex items-center gap-2">
            {/* 加入对比按钮 */}
            {code && (
              <button
                onClick={() => {
                  dispatch({ type: 'ADD_TO_COMPARE', payload: code });
                  navigate('/compare');
                }}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${
                  compareList.includes(code)
                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20 text-green-600 cursor-default'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                {compareList.includes(code) ? '已在对比' : '加入对比'}
              </button>
            )}
            {/* 数据源标识 */}
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              isLive
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isLive ? '实时行情' : '演示数据'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stock.name}</h1>
            <span className="text-sm text-slate-400">{stock.code} · {stock.market}</span>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
              ¥{formatPrice(stock.currentPrice)}
            </div>
            <div className={`text-lg font-medium ${isUp ? 'text-up' : 'text-down'}`}>
              {isUp ? '+' : ''}{stock.changeAmount.toFixed(2)} ({isUp ? '+' : ''}{stock.change.toFixed(2)}%) {isUp ? '↑' : '↓'}
            </div>
          </div>
        </div>

        <div className="flex gap-6 mt-2 text-[13px] text-slate-400">
          <span>昨收 {formatPrice(stock.prevClose)}</span>
          <span>今开 {formatPrice(stock.openPrice)}</span>
          <span>最高 {formatPrice(stock.highPrice)}</span>
          <span>最低 {formatPrice(stock.lowPrice)}</span>
          <span>成交 {stock.volume}亿</span>
        </div>
      </div>

      {/* 信号灯（核心组件） */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card mb-4">
        <SignalLight signal={signal} />
      </div>

      {/* 买入价位 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card mb-4">
        <PriceZone priceZone={priceZone} signal={signal} type="buy" />
      </div>

      {/* 卖出价位 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card mb-4">
        <PriceZone priceZone={priceZone} signal={signal} type="sell" />
      </div>

      {/* 通俗解读 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card mb-4 p-4">
        <PlainTextAdvice text={advice} signal={signal} />
      </div>

      {/* 评分维度 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card p-5 mb-4">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          评分维度
        </div>
        <div className="space-y-2.5">
          {signal.details.map(detail => (
            <div key={detail.name} className="flex items-center gap-3">
              <span className="text-[13px] text-slate-500 w-10">{detail.name}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-600 ease-out"
                  style={{
                    width: `${(detail.score / 5) * 100}%`,
                    background: detail.score >= 4 ? '#16a34a' : detail.score >= 2.5 ? '#ca8a04' : '#dc2626',
                  }}
                />
              </div>
              <span className="text-sm font-semibold font-mono text-slate-700 dark:text-slate-300 w-7 text-right">
                {detail.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 技术指标分析（可展开） */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card mb-4 overflow-hidden">
        <button
          onClick={() => setShowTech(!showTech)}
          className="w-full flex justify-between items-center px-5 py-4 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          aria-expanded={showTech}
        >
          <span className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">
            📊 技术指标分析
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-250 ${showTech ? 'rotate-180' : ''}`} />
        </button>

        {showTech && chartData && (
          <div className="px-5 pb-5 animate-slide-up">
            {/* 图表类型切换 */}
            <div className="flex gap-2 mb-4">
              {(['kline', 'macd', 'rsi'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    chartType === t
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200'
                      : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {t === 'kline' ? 'K线图' : t === 'macd' ? 'MACD' : 'RSI'}
                </button>
              ))}
            </div>

            {/* 图表 */}
            {chartType === 'kline' && (
              <KLineChart
                klines={chartData.klines}
                ma5={chartData.ma5}
                ma10={chartData.ma10}
                ma20={chartData.ma20}
                ma60={chartData.ma60}
              />
            )}
            {chartType === 'macd' && (
              <MacdChart
                klines={chartData.klines}
                dif={chartData.dif}
                dea={chartData.dea}
                bar={chartData.bar}
              />
            )}
            {chartType === 'rsi' && (
              <RsiChart
                klines={chartData.klines}
                rsi={chartData.rsi}
              />
            )}
          </div>
        )}
      </div>

      {/* 估值分析（可展开） */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card mb-4 overflow-hidden">
        <button
          onClick={() => setShowValuation(!showValuation)}
          className="w-full flex justify-between items-center px-5 py-4 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          aria-expanded={showValuation}
        >
          <span className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">
            📈 估值分析
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-250 ${showValuation ? 'rotate-180' : ''}`} />
        </button>

        {showValuation && (
          <div className="px-5 pb-5 animate-slide-up">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'PE (市盈率)', value: valuation.pe, sub: `行业平均: ${valuation.industryAvgPE} · 历史分位 ${valuation.pePercentile}%` },
                { label: 'PB (市净率)', value: valuation.pb, sub: `行业平均: ${valuation.industryAvgPB}` },
                { label: 'ROE (净资产收益率)', value: `${valuation.roe}%`, sub: `行业平均: ${(valuation.industryAvgPE * 0.58).toFixed(1)}%` },
                { label: '股息率', value: `${valuation.dividendYield}%`, sub: `行业平均: ${(valuation.dividendYield * 0.67).toFixed(1)}%` },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-400">{item.label}</div>
                  <div className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{item.value}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
