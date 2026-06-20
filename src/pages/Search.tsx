// 搜索与发现页（支持实时行情搜索 + 全市场任意股票查询）
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus, Clock, X, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ALL_STOCKS } from '@/data/stocks';
import { computeStockAnalysis } from '@/utils/computeAnalysis';
import { fetchQuotes, searchStocks, type SearchResult } from '@/services/stockApi';
import { formatPrice, formatChange, formatChangeAmount } from '@/utils/format';
import type { RecentStock } from './StockDetail';
import { useAppContext, useCompareList } from '@/context/AppContext';

// ── 骨架屏 ────────────────────────────────────────────────────────────────────
function StockCardSkeleton() {
  return (
    <div className="flex items-stretch bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden animate-pulse">
      <div className="w-1 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 p-4 flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-5 w-14 bg-slate-100 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="text-right space-y-1">
          <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
          <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded ml-auto" />
        </div>
      </div>
    </div>
  );
}

// ── 搜索结果卡片 ───────────────────────────────────────────────────────────────
interface ResultCardProps {
  code: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changeAmount: number;
  signalLevel?: 'buy' | 'hold' | 'sell';
  signalLabel?: string;
  isPreset?: boolean;
  inCompare?: boolean;
  onAddCompare?: () => void;
}

function ResultCard({
  code, name, market, price, change, changeAmount,
  signalLevel = 'hold', signalLabel = '待分析', isPreset = false,
  inCompare = false, onAddCompare,
}: ResultCardProps) {
  const navigate = useNavigate();
  const isUp = change > 0;
  const isDown = change < 0;

  const signalColorMap = {
    buy: 'bg-signal-buy',
    hold: 'bg-signal-hold',
    sell: 'bg-signal-sell',
  };
  const signalTagMap = {
    buy: 'bg-signal-buy-light text-signal-buy',
    hold: 'bg-signal-hold-light text-signal-hold',
    sell: 'bg-signal-sell-light text-signal-sell',
  };

  return (
    <div
      className="flex items-stretch bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden cursor-pointer shadow-card hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-out"
      onClick={() => navigate(`/stock/${code}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/stock/${code}`)}
      aria-label={`查看 ${name}(${code}) 的分析`}
    >
      {/* 左侧色条 */}
      <div className={`w-1 flex-shrink-0 ${signalColorMap[signalLevel]}`} />

      {/* 主体 */}
      <div className="flex-1 p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center gap-2">
          {/* 左侧：名称+代码+信号标签 */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</span>
            <span className="text-xs text-slate-400">{code} · {market}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md w-fit mt-0.5 ${
              isPreset ? signalTagMap[signalLevel] : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400'
            }`}>
              {isPreset ? signalLabel : '点击查看实时分析 →'}
            </span>
          </div>

          {/* 右侧：价格+涨跌 */}
          <div className="text-right flex flex-col items-end gap-0.5 shrink-0">
            {price > 0 ? (
              <>
                <span className="text-2xl font-semibold font-mono text-slate-900 dark:text-slate-100">
                  {formatPrice(price)}
                </span>
                <span className={`text-sm font-medium flex items-center gap-0.5 ${
                  isUp ? 'text-up' : isDown ? 'text-down' : 'text-slate-500'
                }`}>
                  {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {formatChangeAmount(changeAmount)} ({formatChange(change)})
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-400 mt-2">点击获取行情</span>
            )}
          </div>
        </div>

        {/* 加入对比按钮 */}
        {onAddCompare && (
          <div className="flex justify-end">
            <button
              onClick={e => { e.stopPropagation(); if (!inCompare) onAddCompare(); }}
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                inCompare
                  ? 'border-green-200 bg-green-50 dark:bg-green-900/20 text-green-600 cursor-default'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
              title={inCompare ? '已在对比列表' : '加入对比'}
            >
              <BarChart2 className="w-3 h-3" />
              {inCompare ? '已加入对比' : '加入对比'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 热门标签 ──────────────────────────────────────────────────────────────────
const HOT_TAGS = [
  { label: '白酒', icon: '🍾' },
  { label: '新能源', icon: '⚡' },
  { label: '半导体', icon: '💾' },
  { label: '医疗器械', icon: '🏥' },
  { label: '人工智能', icon: '🤖' },
  { label: '银行', icon: '🏦' },
];

// ── 最近查看 ─────────────────────────────────────────────────────────────────
const RECENT_KEY = 'stock_recent_viewed';

function getRecentViewed(): RecentStock[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function Search() {
  const navigate = useNavigate();
  const { dispatch } = useAppContext();
  const compareList = useCompareList();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [liveQuotes, setLiveQuotes] = useState<Record<string, { price: number; change: number; changeAmount: number }>>({});
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [recentViewed, setRecentViewed] = useState<RecentStock[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加入对比
  const handleAddCompare = useCallback((code: string) => {
    dispatch({ type: 'ADD_TO_COMPARE', payload: code });
    navigate('/compare');
  }, [dispatch, navigate]);

  // 初始化：加载实时行情 + 最近查看
  useEffect(() => {
    setRecentViewed(getRecentViewed());

    const codes = ALL_STOCKS.map(s => s.code);
    fetchQuotes(codes).then(data => {
      const map: Record<string, { price: number; change: number; changeAmount: number }> = {};
      Object.entries(data).forEach(([code, q]) => {
        map[code] = { price: q.price, change: q.change, changeAmount: q.changeAmount };
      });
      if (Object.keys(map).length > 0) {
        setLiveQuotes(map);
      }
    });
  }, []);

  // 防抖处理
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  // 执行搜索
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    const isCode = /^\d{6}$/.test(q);
    setSearchLoading(true);
    setSearchError('');

    if (isCode) {
      // 精确代码查询
      fetchQuotes([q]).then(data => {
        setSearchLoading(false);
        const quote = data[q];
        if (quote && quote.price > 0) {
          const market = q.startsWith('6') || q.startsWith('9') ? 'SH' : 'SZ';
          setSearchResults([{
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
          setSearchResults([]);
          setSearchError(`未找到代码 ${q} 对应的股票`);
        }
      }).catch(() => {
        setSearchLoading(false);
        setSearchError('查询失败，请检查网络连接');
      });
    } else {
      searchStocks(q).then(results => {
        setSearchLoading(false);
        setSearchResults(results);
      }).catch(() => {
        setSearchLoading(false);
        setSearchError('搜索服务暂不可用，已显示本地匹配');
        setSearchResults([]);
      });
    }
  }, [debouncedQuery]);

  // 本地预设过滤
  const localFiltered = useMemo(() => {
    if (!query.trim()) return ALL_STOCKS;
    const q = query.trim().toLowerCase();
    return ALL_STOCKS.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.code.includes(q) ||
        s.pinyin.toLowerCase().includes(q) ||
        s.pinyinShort.toLowerCase().includes(q)
    );
  }, [query]);

  // 预设股票分析结果
  const presetAnalyses = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeStockAnalysis>> = {};
    ALL_STOCKS.forEach(s => {
      map[s.code] = computeStockAnalysis(s.code);
    });
    return map;
  }, []);

  // 搜索结果去重
  const mergedResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const existCodes = new Set(localFiltered.map(s => s.code));
    return searchResults.filter(r => !existCodes.has(r.code));
  }, [debouncedQuery, searchResults, localFiltered]);

  const handleClear = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setSearchError('');
    inputRef.current?.focus();
  }, []);

  const handleClearRecent = useCallback(() => {
    localStorage.removeItem(RECENT_KEY);
    setRecentViewed([]);
  }, []);

  const hasQuery = query.trim().length > 0;
  const isDebouncePending = query !== debouncedQuery;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* 搜索框 */}
      <div className="relative mb-5">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入股票名称、代码或拼音首字母..."
          className="w-full pl-11 pr-10 py-3 text-base border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10 transition-all shadow-card"
          autoFocus
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {(searchLoading || isDebouncePending) && hasQuery ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          ) : hasQuery ? (
            <button onClick={handleClear} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── 无搜索词状态 ─────────────────────────────────────────────── */}
      {!hasQuery && (
        <>
          {/* 热门方向 */}
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              热门方向
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {HOT_TAGS.map(tag => (
                <button
                  key={tag.label}
                  onClick={() => setQuery(tag.label)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-card hover:shadow-md transition-all duration-150"
                >
                  <span>{tag.icon}</span>
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* 最近查看 */}
          {recentViewed.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  最近查看
                </span>
                <button
                  onClick={handleClearRecent}
                  className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  清除
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recentViewed.map(item => {
                  const preset = ALL_STOCKS.find(s => s.code === item.code);
                  const live = liveQuotes[item.code];
                  const analysis = preset ? presetAnalyses[item.code] : undefined;

                  // 价格：实时 > 预设静态 > 0（非预设无实时数据时）
                  const price = live?.price ?? preset?.currentPrice ?? 0;
                  const change = live?.change ?? preset?.change ?? 0;
                  const changeAmount = live?.changeAmount ?? preset?.changeAmount ?? 0;

                  return (
                    <ResultCard
                      key={item.code}
                      code={item.code}
                      name={item.name}
                      market={item.market}
                      price={price}
                      change={change}
                      changeAmount={changeAmount}
                      signalLevel={analysis?.signal.level || 'hold'}
                      signalLabel={analysis?.signal.label || (preset ? '持有' : '点击查看分析')}
                      isPreset={!!preset}
                      inCompare={compareList.includes(item.code)}
                      onAddCompare={() => handleAddCompare(item.code)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 预设股票列表 */}
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            精选股票 ({ALL_STOCKS.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_STOCKS.map(stock => {
              const live = liveQuotes[stock.code];
              const analysis = presetAnalyses[stock.code];
              return (
                <ResultCard
                  key={stock.code}
                  code={stock.code}
                  name={stock.name}
                  market={stock.market}
                  price={live?.price ?? stock.currentPrice}
                  change={live?.change ?? stock.change}
                  changeAmount={live?.changeAmount ?? stock.changeAmount}
                  signalLevel={analysis?.signal.level || 'hold'}
                  signalLabel={analysis?.signal.label || '持有'}
                  isPreset
                  inCompare={compareList.includes(stock.code)}
                  onAddCompare={() => handleAddCompare(stock.code)}
                />
              );
            })}
          </div>
        </>
      )}

      {/* ── 有搜索词状态 ─────────────────────────────────────────────── */}
      {hasQuery && (
        <>
          {/* 本地预设匹配 */}
          {localFiltered.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                匹配股票 ({localFiltered.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {localFiltered.map(stock => {
                  const live = liveQuotes[stock.code];
                  const analysis = presetAnalyses[stock.code];
                  return (
                    <ResultCard
                      key={stock.code}
                      code={stock.code}
                      name={stock.name}
                      market={stock.market}
                      price={live?.price ?? stock.currentPrice}
                      change={live?.change ?? stock.change}
                      changeAmount={live?.changeAmount ?? stock.changeAmount}
                      signalLevel={analysis?.signal.level || 'hold'}
                      signalLabel={analysis?.signal.label || '持有'}
                      isPreset
                      inCompare={compareList.includes(stock.code)}
                      onAddCompare={() => handleAddCompare(stock.code)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 搜索中骨架屏 */}
          {(searchLoading || isDebouncePending) && localFiltered.length === 0 && (
            <div className="space-y-2.5">
              {[...Array(4)].map((_, i) => <StockCardSkeleton key={i} />)}
            </div>
          )}

          {/* 错误提示 */}
          {searchError && !searchLoading && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {searchError}
            </div>
          )}

          {/* 网络搜索额外结果 */}
          {!searchLoading && !isDebouncePending && mergedResults.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                更多结果（全市场搜索）
                <span className="ml-2 text-[10px] font-normal text-slate-400 normal-case">
                  点击任意股票查看实时分析
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {mergedResults.map(r => (
                  <ResultCard
                    key={r.code}
                    code={r.code}
                    name={r.name}
                    market={r.market}
                    price={r.price}
                    change={r.change}
                    changeAmount={r.changeAmount}
                    isPreset={false}
                    inCompare={compareList.includes(r.code)}
                    onAddCompare={() => handleAddCompare(r.code)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {!searchLoading && !isDebouncePending && localFiltered.length === 0 && mergedResults.length === 0 && !searchError && (
            <div className="text-center py-16">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">未找到匹配的股票</h3>
              <p className="text-sm text-slate-400 mb-4">
                试试直接输入6位代码，如{' '}
                <button
                  className="text-blue-500 hover:underline"
                  onClick={() => setQuery('000001')}
                >
                  000001
                </button>（平安银行）或{' '}
                <button
                  className="text-blue-500 hover:underline"
                  onClick={() => setQuery('600519')}
                >
                  600519
                </button>（贵州茅台）
              </p>
              <button
                onClick={() => navigate(`/stock/${query.trim()}`)}
                className={`px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${/^\d{6}$/.test(query.trim()) ? 'inline-flex' : 'hidden'}`}
              >
                直接查看 {query.trim()} 的分析
              </button>
            </div>
          )}

          {/* 搜索结果底部提示 */}
          {!searchLoading && !isDebouncePending && (localFiltered.length > 0 || mergedResults.length > 0) && (
            <div className="text-center mt-6 text-xs text-slate-400">
              找不到想要的？输入6位代码直接查询任意A股
            </div>
          )}
        </>
      )}
    </div>
  );
}
