// 多股对比页（实时数据版）
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, RefreshCw, Wifi, WifiOff, ChevronRight,
  TrendingUp, TrendingDown, Minus, Search, Star,
  BarChart2, Loader2, AlertCircle,
} from 'lucide-react';
import { useAppContext, useCompareList } from '@/context/AppContext';
import { ALL_STOCKS } from '@/data/stocks';
import { useCompareAnalysis, type CompareItem } from '@/hooks/useCompareAnalysis';
import { fetchQuotes, searchStocks, type SearchResult } from '@/services/stockApi';
import { formatPrice, formatPercent } from '@/utils/format';
import type { Signal, StockAnalysis } from '@/types';

// ── 实时搜索框组件（与搜索页逻辑对齐）──────────────────────────────────────────
function StockSearchBox({
  existingCodes,
  onAdd,
  placeholder = '搜索股票名称、代码或拼音…',
}: {
  existingCodes: string[];
  onAdd: (code: string, name: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [focused, setFocused] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 热门快捷添加（排除已在列表的）
  const HOT_STOCKS = ALL_STOCKS.filter(s => !existingCodes.includes(s.code)).slice(0, 8);

  // ① 防抖：query 变化 → 350ms 后更新 debouncedQuery
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // ② 搜索执行：与搜索页逻辑完全一致
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      setSearchError('');
      return;
    }

    const isCode = /^\d{6}$/.test(q);
    setSearching(true);
    setSearchError('');

    if (isCode) {
      // 精确代码查询（同搜索页）
      fetchQuotes([q]).then(data => {
        setSearching(false);
        const quote = data[q];
        if (quote && quote.price > 0) {
          const market = q.startsWith('6') || q.startsWith('9') ? 'SH' : 'SZ';
          setResults([{
            code: q,
            name: quote.name,
            market,
            type: 'A股',
            pinyin: '',
            price: quote.price,
            change: quote.change,
            changeAmount: quote.changeAmount,
          }]);
        } else {
          setResults([]);
          setSearchError(`未找到代码 ${q} 对应的股票`);
        }
      }).catch(() => {
        setSearching(false);
        setSearchError('查询失败，请检查网络连接');
      });
    } else {
      // 关键词搜索：本地预设 + 远程接口合并
      const localMatched = ALL_STOCKS.filter(
        s => !existingCodes.includes(s.code) && (
          s.name.includes(q) ||
          s.code.includes(q) ||
          s.pinyin?.toLowerCase().includes(q.toLowerCase()) ||
          s.pinyinShort?.toLowerCase().includes(q.toLowerCase())
        )
      );

      searchStocks(q).then(remote => {
        setSearching(false);
        const localCodes = new Set(localMatched.map(s => s.code));
        const remoteExtra = remote
          .filter(r => !localCodes.has(r.code))
          .slice(0, 10);

        const merged: SearchResult[] = [
          ...localMatched.map(s => ({
            code: s.code,
            name: s.name,
            market: s.market,
            type: 'A股',
            pinyin: s.pinyin || '',
            price: s.currentPrice,
            change: s.change,
            changeAmount: s.changeAmount,
          })),
          ...remoteExtra,
        ];
        setResults(merged);
      }).catch(() => {
        setSearching(false);
        setSearchError('网络搜索暂不可用，已显示本地匹配');
        setResults(localMatched.map(s => ({
          code: s.code,
          name: s.name,
          market: s.market,
          type: 'A股',
          pinyin: s.pinyin || '',
          price: s.currentPrice,
          change: s.change,
          changeAmount: s.changeAmount,
        })));
      });
    }
  }, [debouncedQuery, existingCodes]);

  const handleSelect = useCallback((r: SearchResult) => {
    if (existingCodes.includes(r.code)) return;
    onAdd(r.code, r.name);
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setSearchError('');
    inputRef.current?.blur();
    setFocused(false);
  }, [existingCodes, onAdd]);

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setSearchError('');
    inputRef.current?.focus();
  };

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasQuery = query.trim().length > 0;
  const isDebouncePending = query !== debouncedQuery;
  const isLoading = searching || isDebouncePending;
  const showDropdown = focused && (
    results.length > 0 ||
    (!query && HOT_STOCKS.length > 0) ||
    (hasQuery && !isLoading && results.length === 0) ||
    (hasQuery && isLoading) ||
    searchError !== ''
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 搜索输入框 */}
      <div className={`flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl transition-all duration-200 ${
        focused
          ? 'border-blue-400 dark:border-blue-500 shadow-sm shadow-blue-100 dark:shadow-blue-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}>
        {isLoading && hasQuery ? (
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
        ) : (
          <Search className={`w-4 h-4 shrink-0 transition-colors ${focused ? 'text-blue-400' : 'text-slate-400'}`} />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none"
        />
        {hasQuery && (
          <button
            onMouseDown={e => { e.preventDefault(); handleClear(); }}
            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 下拉结果面板 */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {/* 搜索结果 */}
          {results.length > 0 && (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
              {results.map(r => {
                const alreadyIn = existingCodes.includes(r.code);
                const isUp = r.change > 0;
                const isDown = r.change < 0;
                const mktLabel = r.code.startsWith('6') || r.code.startsWith('9') ? 'SH' : r.code.startsWith('8') ? 'BJ' : 'SZ';

                return (
                  <button
                    key={r.code}
                    onMouseDown={e => { e.preventDefault(); if (!alreadyIn) handleSelect(r); }}
                    disabled={alreadyIn}
                    className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left ${
                      alreadyIn
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                        : 'hover:bg-blue-50 dark:hover:bg-blue-900/10 active:bg-blue-100 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* 市场标签 */}
                      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-mono font-semibold ${
                        mktLabel === 'SH'
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                          : mktLabel === 'SZ'
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {mktLabel}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {r.name}
                          </span>
                          {alreadyIn && (
                            <span className="text-xs text-slate-400 shrink-0">已添加</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{r.code}</span>
                      </div>
                    </div>

                    {/* 实时价格 */}
                    {r.price > 0 && (
                      <div className="text-right shrink-0 ml-3">
                        <div className={`text-sm font-bold font-mono ${
                          isUp ? 'text-up' : isDown ? 'text-down' : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          ¥{r.price.toFixed(2)}
                        </div>
                        <div className={`text-xs font-mono flex items-center justify-end gap-0.5 ${
                          isUp ? 'text-up' : isDown ? 'text-down' : 'text-slate-400'
                        }`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {r.change > 0 ? '+' : ''}{r.change.toFixed(2)}%
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 搜索中骨架屏 */}
          {hasQuery && isLoading && results.length === 0 && (
            <div className="p-3 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-1 animate-pulse">
                  <div className="w-8 h-5 bg-slate-100 dark:bg-slate-800 rounded shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="text-right space-y-1">
                    <div className="h-4 w-14 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
                    <div className="h-3 w-10 bg-slate-100 dark:bg-slate-800 rounded ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 错误提示 */}
          {searchError && (
            <div className="flex items-center gap-2 mx-3 my-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {searchError}
            </div>
          )}

          {/* 无结果 */}
          {hasQuery && !isLoading && results.length === 0 && !searchError && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-400">未找到「{debouncedQuery}」相关股票</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                {/^\d+$/.test(debouncedQuery) && debouncedQuery.length !== 6
                  ? '股票代码须为6位数字'
                  : '尝试输入股票代码或公司名称'}
              </p>
            </div>
          )}

          {/* 热门快捷选（无输入时展示）*/}
          {!hasQuery && HOT_STOCKS.length > 0 && (
            <div className="p-3">
              <p className="text-xs text-slate-400 font-medium mb-2 px-1">热门股票快速添加</p>
              <div className="flex flex-wrap gap-1.5">
                {HOT_STOCKS.map(s => (
                  <button
                    key={s.code}
                    onMouseDown={e => { e.preventDefault(); handleSelect({ code: s.code, name: s.name, market: s.market, type: 'A股', pinyin: s.pinyin || '', price: s.currentPrice, change: s.change, changeAmount: s.changeAmount }); }}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-1 text-slate-400 font-mono">{s.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 信号徽章 ──────────────────────────────────────────────────────────────────
function SignalBadge({ level, score }: { level: Signal['level']; score: number }) {
  const cfg = {
    buy:  { bg: 'bg-signal-buy-light dark:bg-green-900/30', text: 'text-signal-buy', dot: 'bg-signal-buy', label: '买入' },
    hold: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-signal-hold', dot: 'bg-signal-hold', label: '持有' },
    sell: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-signal-sell', dot: 'bg-signal-sell', label: '卖出' },
  }[level];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot} ${level !== 'hold' ? 'animate-pulse' : ''}`} />
      <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
      <span className={`text-xs font-mono ${cfg.text} opacity-80`}>{score.toFixed(1)}</span>
    </div>
  );
}

// ── 骨架占位单元格 ─────────────────────────────────────────────────────────────
function SkeletonCell() {
  return <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto" />;
}

// ── 雷达图（SVG 手绘）────────────────────────────────────────────────────────
const RADAR_LABELS = ['趋势强度', '成交量', 'RSI强度', '估值吸引力', '价位空间'];
const RADAR_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];

function RadarChart({ items }: {
  items: Array<{ name: string; scores: number[]; color: string; isLoading: boolean }>
}) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 75;
  const labels = RADAR_LABELS;
  const n = labels.length;

  const angleOf = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pointOf = (i: number, ratio: number) => {
    const a = angleOf(i);
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) };
  };

  // 网格
  const gridLines = [0.25, 0.5, 0.75, 1.0].map(ratio => {
    const pts = labels.map((_, i) => pointOf(i, ratio));
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
  });

  // 轴线
  const axes = labels.map((_, i) => {
    const end = pointOf(i, 1);
    return `M${cx},${cy} L${end.x},${end.y}`;
  });

  // 标签位置
  const labelPts = labels.map((lbl, i) => {
    const pt = pointOf(i, 1.25);
    return { x: pt.x, y: pt.y, lbl };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs mx-auto">
      {/* 网格 */}
      {gridLines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-700" />
      ))}
      {/* 轴线 */}
      {axes.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="0.5" className="text-slate-300 dark:text-slate-600" />
      ))}
      {/* 数据多边形 */}
      {items.map((item, ii) => {
        if (item.isLoading) return null;
        const pts = item.scores.map((s, i) => pointOf(i, Math.min(1, s / 5)));
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
        return (
          <g key={ii}>
            <path d={d} fill={item.color} fillOpacity={0.15} stroke={item.color} strokeWidth={1.5} />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill={item.color} />
            ))}
          </g>
        );
      })}
      {/* 标签 */}
      {labelPts.map(({ x, y, lbl }, i) => (
        <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central"
          fontSize="9" className="fill-slate-500 dark:fill-slate-400">
          {lbl}
        </text>
      ))}
    </svg>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────

export default function Compare() {
  const { dispatch } = useAppContext();
  const compareList = useCompareList();
  const navigate = useNavigate();

  // 默认展示两只示例股票（列表为空时）
  const effectiveList = compareList.length === 0
    ? ['600519', '000858']
    : compareList;

  const { items, isLoading, isAnyLive, reload } = useCompareAnalysis(effectiveList);

  // 有分析数据的条目
  const validItems = items.filter(i => i.analysis !== null);
  const loadedItems = items.filter(i => !i.loading);

  // 添加股票到对比列表
  const handleAdd = (code: string) => {
    dispatch({ type: 'ADD_TO_COMPARE', payload: code });
  };

  // 移除
  const handleRemove = (code: string) => {
    if (compareList.length === 0) {
      const other = effectiveList.find(c => c !== code);
      if (other) dispatch({ type: 'ADD_TO_COMPARE', payload: other });
    } else {
      dispatch({ type: 'REMOVE_FROM_COMPARE', payload: code });
    }
  };

  // 从雷达图维度提取评分
  function getRadarScores(analysis: StockAnalysis) {
    const { signal, indicators, valuation, priceZone } = analysis;
    const trendDetail = signal.details.find((d: { name: string; score: number }) => d.name.includes('趋势')) ?? { score: signal.score };
    const volDetail   = signal.details.find((d: { name: string; score: number }) => d.name.includes('成交') || d.name.includes('量')) ?? { score: 2.5 };

    const rsiScore = Math.max(0, 5 - Math.abs(indicators.rsi14 - 50) / 10);
    const valScore = Math.max(0, Math.min(5, 5 - (valuation.pe - 10) / 10));
    const spaceScore = Math.min(5, priceZone.upsidePercent / 5);

    return [
      trendDetail.score ?? signal.score,
      volDetail.score ?? 2.5,
      rsiScore,
      valScore,
      spaceScore,
    ];
  }

  const radarItems = items.map((item, idx) => ({
    name: item.analysis?.stock.name || item.code,
    scores: item.analysis ? getRadarScores(item.analysis) : [0, 0, 0, 0, 0],
    color: RADAR_COLORS[idx % RADAR_COLORS.length],
    isLoading: item.loading,
  }));

  const canAddMore = items.length < 4;

  return (
    <div className="animate-fade-in space-y-4">
      {/* ── 顶部：标题 + 股票标签 + 刷新 ────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 页面图标+标题 */}
        <div className="flex items-center gap-2 mr-1">
          <BarChart2 className="w-5 h-5 text-blue-500" />
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-200">多股对比</h1>
        </div>

        {/* 股票标签组 */}
        <div className="flex items-center gap-2 flex-wrap">
          {items.map((item, idx) => {
            const dotColors = ['bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500'];
            const dotColor = dotColors[idx % 4];
            return (
              <div
                key={item.code}
                onClick={() => navigate(`/stock/${item.code}`)}
                className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-all ${
                  item.loading
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400'
                    : item.analysis
                      ? 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 text-slate-700 dark:text-slate-300'
                      : 'border-red-200 bg-red-50 dark:bg-red-900/20 text-red-500'
                }`}
              >
                {item.loading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                ) : (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.analysis ? dotColor : 'bg-red-400'}`} />
                )}
                <span className="max-w-[80px] truncate">{item.analysis?.stock.name || item.code}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleRemove(item.code); }}
                  className="ml-0.5 p-0.5 text-slate-400 hover:text-red-500 transition-colors rounded-full shrink-0"
                  title="移除"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {items.length >= 4 && (
            <span className="text-xs text-slate-400 pl-1">最多4只</span>
          )}
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center gap-2 ml-auto">
          <span className={`hidden sm:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isAnyLive
              ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            {isAnyLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isAnyLive ? '实时行情' : '演示数据'}
          </span>
          <button
            onClick={reload}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="刷新数据"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* ── 实时搜索区域（始终显示，可直接输入添加）─────────────────────────── */}
      {canAddMore && (
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <StockSearchBox
                existingCodes={effectiveList}
                onAdd={handleAdd}
                placeholder={`搜索股票添加到对比（还可加 ${4 - items.length} 只）…`}
              />
            </div>
            <span className="text-xs text-slate-400 shrink-0 hidden sm:block">
              支持名称 / 代码 / 拼音
            </span>
          </div>
        </div>
      )}

      {/* ── 空状态引导 ────────────────────────────────────────────────────────── */}
      {loadedItems.length < 2 && !isLoading && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="text-5xl mb-3">📊</div>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
            再添加 {2 - loadedItems.length} 只股票即可开始对比
          </h2>
          <p className="text-sm text-slate-400 mb-0">在上方搜索框搜索任意 A 股并点击添加</p>
        </div>
      )}

      {validItems.length >= 1 && (
        <>
          {/* ── 综合信号卡片组 ────────────────────────────────────────────────── */}
          <div className={`grid gap-3 ${validItems.length === 2 ? 'grid-cols-2' : validItems.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {items.map((item, idx) => {
              const borderColor = [
                'border-t-green-500', 'border-t-blue-500',
                'border-t-amber-500', 'border-t-purple-500',
              ][idx % 4];

              return (
                <div
                  key={item.code}
                  onClick={() => navigate(`/stock/${item.code}`)}
                  className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all group border-t-4 ${borderColor}`}
                >
                  {item.loading ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                  ) : item.analysis ? (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                            {item.analysis.stock.name}
                          </h3>
                          <span className="text-xs text-slate-400 font-mono">{item.code}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors mt-0.5" />
                      </div>
                      <div className="mb-3">
                        <SignalBadge level={item.analysis.signal.level} score={item.analysis.signal.score} />
                      </div>
                      {/* 价格 */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                          ¥{formatPrice(item.analysis.stock.currentPrice)}
                        </span>
                        <span className={`text-sm font-medium ${
                          item.analysis.stock.change > 0 ? 'text-up' :
                          item.analysis.stock.change < 0 ? 'text-down' : 'text-slate-400'
                        }`}>
                          {item.analysis.stock.change > 0 ? '+' : ''}{item.analysis.stock.change.toFixed(2)}%
                        </span>
                      </div>
                      {item.isLive && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-500 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          实时
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-slate-400">数据不可用</p>
                      <p className="text-xs text-red-400 mt-1">{item.error}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── 雷达图对比 ─────────────────────────────────────────────────────── */}
          {validItems.length >= 2 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                综合能力雷达对比
              </h2>
              <p className="text-xs text-slate-400 mb-3">数值越大越好，5维度综合呈现</p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* 雷达图 */}
                <div className="w-52 shrink-0">
                  <RadarChart items={radarItems} />
                </div>

                {/* 图例 + 维度得分 */}
                <div className="flex-1 w-full">
                  <div className="space-y-2">
                    {RADAR_LABELS.map((label, li) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-16 shrink-0">{label}</span>
                        <div className="flex-1 flex gap-2">
                          {items.map((item, ii) => {
                            const score = item.analysis ? getRadarScores(item.analysis)[li] : 0;
                            const color = RADAR_COLORS[ii % RADAR_COLORS.length];
                            return (
                              <div key={ii} className="flex-1 flex flex-col items-center gap-1">
                                {li === 0 && (
                                  <span className="text-xs text-slate-400 truncate w-full text-center">
                                    {item.analysis?.stock.name || item.code}
                                  </span>
                                )}
                                {item.loading ? (
                                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                                ) : (
                                  <div className="relative w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-700"
                                      style={{ width: `${(score / 5) * 100}%`, backgroundColor: color }}
                                    />
                                  </div>
                                )}
                                <span className="text-xs font-mono" style={{ color }}>
                                  {item.loading ? '--' : score.toFixed(1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 图例 */}
                  <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {items.map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: RADAR_COLORS[idx % RADAR_COLORS.length] }} />
                        {item.analysis?.stock.name || item.code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 详细数据对比表格 ─────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card overflow-x-auto">
            <table className="w-full border-collapse min-w-[480px]">
              <thead>
                <tr>
                  <th className="p-3 text-left text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase tracking-wide w-28">
                    指标
                  </th>
                  {items.map((item, idx) => {
                    const dotColor = ['bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500'][idx % 4];
                    return (
                      <th key={item.code} className="p-3 text-center text-sm bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.loading ? item.code : (item.analysis?.stock.name || item.code)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.code}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* 综合信号 */}
                <TableRow label="综合信号" highlight>
                  {items.map((item) => (
                    <td key={item.code} className="p-3 text-center">
                      {item.loading ? <SkeletonCell /> : item.analysis ? (
                        <SignalBadge level={item.analysis.signal.level} score={item.analysis.signal.score} />
                      ) : <span className="text-xs text-slate-400">–</span>}
                    </td>
                  ))}
                </TableRow>

                {/* 当前价格 */}
                <TableRow label="当前价格">
                  {items.map((item) => (
                    <td key={item.code} className="p-3 text-center text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
                      {item.loading ? <SkeletonCell /> : item.analysis ? (
                        <>
                          <div>¥{formatPrice(item.analysis.stock.currentPrice)}</div>
                          <div className={`text-xs mt-0.5 ${
                            item.analysis.stock.change > 0 ? 'text-up' :
                            item.analysis.stock.change < 0 ? 'text-down' : 'text-slate-400'
                          }`}>
                            {item.analysis.stock.change > 0 ? <TrendingUp className="inline w-3 h-3 mr-0.5" /> :
                            item.analysis.stock.change < 0 ? <TrendingDown className="inline w-3 h-3 mr-0.5" /> :
                            <Minus className="inline w-3 h-3 mr-0.5" />}
                            {item.analysis.stock.change > 0 ? '+' : ''}{item.analysis.stock.change.toFixed(2)}%
                          </div>
                        </>
                      ) : <span className="text-xs text-slate-400">–</span>}
                    </td>
                  ))}
                </TableRow>

                {/* 买入区间 */}
                <TableRow label="买入区间">
                  {items.map((item) => (
                    <td key={item.code} className="p-3 text-center text-sm font-mono text-signal-buy">
                      {item.loading ? <SkeletonCell /> : item.analysis ? (
                        `¥${formatPrice(item.analysis.priceZone.buyLower)} – ${formatPrice(item.analysis.priceZone.buyUpper)}`
                      ) : '–'}
                    </td>
                  ))}
                </TableRow>

                {/* 卖出区间 */}
                <TableRow label="卖出区间">
                  {items.map((item) => (
                    <td key={item.code} className="p-3 text-center text-sm font-mono text-signal-sell">
                      {item.loading ? <SkeletonCell /> : item.analysis ? (
                        `¥${formatPrice(item.analysis.priceZone.sellLower)} – ${formatPrice(item.analysis.priceZone.sellUpper)}`
                      ) : '–'}
                    </td>
                  ))}
                </TableRow>

                {/* 潜在收益 */}
                <CompareRow
                  label="潜在收益"
                  items={items}
                  getValue={(a) => ({ text: `+${a.priceZone.upsidePercent.toFixed(1)}%`, score: a.priceZone.upsidePercent })}
                  className="text-signal-buy font-semibold"
                />

                {/* RSI */}
                <CompareRow
                  label="RSI(14)"
                  items={items}
                  getValue={(a) => {
                    const v = a.indicators.rsi14;
                    const isGood = v >= 40 && v <= 60;
                    return {
                      text: v.toFixed(1),
                      score: -(Math.abs(v - 50)),
                      className: isGood ? 'text-signal-buy' : v > 70 ? 'text-signal-sell' : v < 30 ? 'text-signal-buy' : 'text-slate-600',
                    };
                  }}
                />

                {/* MACD */}
                <TableRow label="MACD(Bar)">
                  {items.map((item) => {
                    const v = item.analysis?.indicators.macd.bar;
                    const isPos = (v ?? 0) > 0;
                    return (
                      <td key={item.code} className="p-3 text-center text-sm font-mono">
                        {item.loading ? <SkeletonCell /> : v !== undefined ? (
                          <span className={isPos ? 'text-up' : 'text-down'}>
                            {isPos ? '+' : ''}{v.toFixed(3)}
                          </span>
                        ) : '–'}
                      </td>
                    );
                  })}
                </TableRow>

                {/* 量比 */}
                <CompareRow
                  label="量比"
                  items={items}
                  getValue={(a) => ({ text: `${a.indicators.volumeRatio.toFixed(2)}x`, score: a.indicators.volumeRatio })}
                />

                {/* PE */}
                <CompareRow
                  label="PE(TTM)"
                  items={items}
                  getValue={(a) => ({
                    text: a.valuation.pe > 0 ? a.valuation.pe.toFixed(1) : '亏损',
                    score: -(a.valuation.pe > 0 ? a.valuation.pe : 9999),
                    className: a.valuation.pe > 0 && a.valuation.pe < 20 ? 'text-signal-buy' : a.valuation.pe > 60 ? 'text-signal-sell' : '',
                  })}
                />

                {/* PB */}
                <CompareRow
                  label="PB"
                  items={items}
                  getValue={(a) => ({
                    text: a.valuation.pb.toFixed(2),
                    score: -a.valuation.pb,
                    className: a.valuation.pb < 2 ? 'text-signal-buy' : a.valuation.pb > 5 ? 'text-signal-sell' : '',
                  })}
                />

                {/* ROE */}
                <CompareRow
                  label="ROE"
                  items={items}
                  getValue={(a) => ({
                    text: `${a.valuation.roe.toFixed(1)}%`,
                    score: a.valuation.roe,
                    className: a.valuation.roe > 15 ? 'text-signal-buy' : '',
                  })}
                />

                {/* 年初至今 */}
                <TableRow label="年初至今">
                  {items.map((item) => {
                    const v = item.analysis?.valuation.ytdChange ?? 0;
                    return (
                      <td key={item.code} className="p-3 text-center text-sm font-mono">
                        {item.loading ? <SkeletonCell /> : item.analysis ? (
                          <span className={v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-slate-400'}>
                            {v > 0 ? '+' : ''}{formatPercent(v, 1)}
                          </span>
                        ) : '–'}
                      </td>
                    );
                  })}
                </TableRow>

                {/* 近1月 */}
                <TableRow label="近1月涨跌" highlight>
                  {items.map((item) => {
                    const v = item.analysis?.valuation.oneMonthChange ?? 0;
                    return (
                      <td key={item.code} className="p-3 text-center text-sm font-mono">
                        {item.loading ? <SkeletonCell /> : item.analysis ? (
                          <span className={v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-slate-400'}>
                            {v > 0 ? '+' : ''}{formatPercent(v, 1)}
                          </span>
                        ) : '–'}
                      </td>
                    );
                  })}
                </TableRow>
              </tbody>
            </table>
          </div>

          {/* ── AI 一句话点评（汇总）───────────────────────────────────────────── */}
          {validItems.length >= 2 && !isLoading && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🤖</span>
                <span className="text-sm font-semibold text-slate-200">AI 对比小结</span>
              </div>
              <div className="space-y-2">
                {validItems.map((item) => (
                  <div key={item.code} className="flex gap-3">
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                      item.analysis!.signal.level === 'buy'
                        ? 'bg-signal-buy/20 text-signal-buy'
                        : item.analysis!.signal.level === 'sell'
                          ? 'bg-signal-sell/20 text-signal-sell'
                          : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {item.analysis!.stock.name}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.analysis!.advice}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── 辅助表格行组件 ────────────────────────────────────────────────────────────

function TableRow({
  label,
  children,
  highlight = false,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <tr className={`border-t border-slate-100 dark:border-slate-800 ${highlight ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
      <td className="p-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap">
        {label}
      </td>
      {children}
    </tr>
  );
}

// 自动高亮最佳值的行
function CompareRow({
  label,
  items,
  getValue,
  className: extraClass = '',
}: {
  label: string;
  items: CompareItem[];
  getValue: (a: StockAnalysis) => { text: string; score: number; className?: string };
  className?: string;
}) {
  const values = items.map(item => item.analysis ? getValue(item.analysis) : null);
  const scores = values.map(v => v?.score ?? -Infinity);
  const maxScore = Math.max(...scores.filter(s => s !== -Infinity));
  const hasWinner = scores.filter(s => s === maxScore).length === 1;

  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="p-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap">
        {label}
      </td>
      {items.map((item, idx) => {
        const val = values[idx];
        const isWinner = hasWinner && val?.score === maxScore;
        return (
          <td
            key={item.code}
            className={`p-3 text-center text-sm font-mono ${
              isWinner ? 'bg-signal-buy-light dark:bg-green-900/10' : ''
            }`}
          >
            {item.loading ? (
              <SkeletonCell />
            ) : val ? (
              <span className={val.className || extraClass}>
                {val.text}
                {isWinner && <span className="ml-1 text-signal-buy text-xs">★</span>}
              </span>
            ) : '–'}
          </td>
        );
      })}
    </tr>
  );
}
