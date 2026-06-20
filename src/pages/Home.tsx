// 首页 · 市场仪表盘
import { useNavigate } from 'react-router-dom';
import { useMarketData } from '@/hooks/useMarketData';
import { computeStockAnalysis } from '@/utils/computeAnalysis';
import { ALL_STOCKS } from '@/data/stocks';
import StockCard from '@/components/StockCard';

export default function Home() {
  const navigate = useNavigate();
  const { temperature, sectors, breadth, smartMoney, indexes, isLive } = useMarketData();

  // 为前4只股票获取信号
  const topStocks = ALL_STOCKS.slice(0, 4);

  return (
    <div className="animate-fade-in">
      {/* 指数行情条 */}
      {indexes.length > 0 && (
        <div className="flex gap-4 mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3 shadow-card overflow-x-auto">
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-green-500 shrink-0 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              实时
            </span>
          )}
          {indexes.map(idx => (
            <div key={idx.code} className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-slate-500 dark:text-slate-400">{idx.name}</span>
              <span className={`text-sm font-bold font-mono ${idx.change > 0 ? 'text-up' : idx.change < 0 ? 'text-down' : 'text-slate-600'}`}>
                {idx.price.toFixed(2)}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                idx.change > 0
                  ? 'bg-red-50 dark:bg-red-900/20 text-up'
                  : idx.change < 0
                    ? 'bg-green-50 dark:bg-green-900/20 text-down'
                    : 'bg-slate-100 text-slate-500'
              }`}>
                {idx.change > 0 ? '+' : ''}{idx.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 大盘温度计 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-card">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            大盘温度计
          </div>
          <div className="flex items-center gap-5">
            {/* SVG 半圆仪表盘 */}
            <div className="relative flex-shrink-0">
              <svg width="140" height="110" viewBox="0 0 140 110">
                <defs>
                  <linearGradient id="tempGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="33%" stopColor="#22c55e" />
                    <stop offset="66%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <path
                  d="M 15 90 A 55 55 0 0 1 125 90"
                  fill="none"
                  stroke="url(#tempGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <line
                  x1="70" y1="65" x2="70" y2="80"
                  stroke="currentColor"
                  className="text-slate-700 dark:text-slate-200"
                  strokeWidth="2"
                  strokeLinecap="round"
                  transform={`rotate(${(temperature.score / 100) * 270 - 135}, 70, 65)`}
                />
                <circle cx="70" cy="65" r="4" className="fill-slate-700 dark:fill-slate-200" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '20px' }}>
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: temperature.color }}>
                    {temperature.score}
                  </div>
                  <div className="text-xs text-slate-400">°C</div>
                </div>
              </div>
            </div>

            {/* 温度信息 */}
            <div className="flex flex-col gap-1.5">
              <div className="text-xl font-semibold" style={{ color: temperature.color }}>
                {temperature.label}
              </div>
              <div className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {temperature.advice}
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${temperature.score}%`, background: temperature.color }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 热门推荐 */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-card">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            热门推荐
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topStocks.map(stock => {
              const analysis = computeStockAnalysis(stock.code);
              return (
                <StockCard
                  key={stock.code}
                  stock={stock}
                  signalLevel={analysis?.signal.level || 'hold'}
                  signalLabel={analysis?.signal.label || '分析中'}
                />
              );
            })}
          </div>
        </div>

        {/* 行业热力图 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-card">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            行业板块热力图
          </div>
          <div className="grid grid-cols-3 gap-2">
            {sectors.map(sector => (
              <div
                key={sector.name}
                className={`p-3 rounded-lg text-center cursor-pointer transition-all duration-150 hover:scale-[1.03] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 ${
                  sector.change > 0
                    ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 text-up'
                    : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 text-down'
                }`}
                onClick={() => navigate('/search')}
              >
                <div className="text-[13px] font-medium truncate">{sector.name}</div>
                <div className="text-lg font-bold mt-0.5">
                  {sector.change > 0 ? '+' : ''}{sector.change}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 涨跌分布 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-card">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            今日涨跌分布
          </div>
          <div className="space-y-2.5 mt-2">
            {[
              { label: '上涨', count: breadth.advance, percent: breadth.advancePercent, color: 'bg-up' },
              { label: '下跌', count: breadth.decline, percent: breadth.declinePercent, color: 'bg-down' },
              { label: '平盘', count: breadth.flat, percent: breadth.flatPercent, color: 'bg-slate-400' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-sm text-slate-500 w-10 text-right">{row.label}</span>
                <span className={`text-sm font-semibold w-14 ${row.color === 'bg-up' ? 'text-up' : row.color === 'bg-down' ? 'text-down' : 'text-slate-600'}`}>
                  {row.count.toLocaleString()}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${row.color} transition-all duration-800 ease-out`} style={{ width: `${row.percent}%` }} />
                </div>
                <span className="text-xs font-medium text-slate-400 w-8">{row.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 聪明钱动向 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-card">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            聪明钱在买什么
          </div>
          <div className="space-y-3 mt-2">
            {smartMoney.map((item, idx) => (
              <div key={item.code} className="flex justify-between items-center">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {idx + 1}. {item.name}
                </span>
                <span className={`text-sm font-semibold ${item.flow > 0 ? 'text-up' : 'text-down'}`}>
                  {item.flow > 0 ? '净流入' : '净流出'} {Math.abs(item.flow).toFixed(1)}亿
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
