// 股票卡片组件
import type { Stock, Signal } from '@/types';
import { formatPrice, formatChange, formatChangeAmount } from '@/utils/format';
import { useNavigate } from 'react-router-dom';

interface StockCardProps {
  stock: Stock;
  signalLevel: Signal['level'];
  signalLabel: string;
}

export default function StockCard({ stock, signalLevel, signalLabel }: StockCardProps) {
  const navigate = useNavigate();
  const isUp = stock.change > 0;

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
      onClick={() => navigate(`/stock/${stock.code}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/stock/${stock.code}`)}
    >
      {/* 左侧色条 */}
      <div className={`w-1 flex-shrink-0 ${signalColorMap[signalLevel]}`} />

      {/* 主体 */}
      <div className="flex-1 p-4 flex justify-between items-center">
        {/* 左侧信息 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {stock.name}
          </span>
          <span className="text-xs text-slate-400">
            {stock.code} · {stock.market}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md w-fit mt-1 ${signalTagMap[signalLevel]}`}>
            {signalLabel}
          </span>
        </div>

        {/* 右侧价格 */}
        <div className="text-right flex flex-col items-end gap-0.5">
          <span className="text-2xl font-semibold font-mono text-slate-900 dark:text-slate-100">
            {formatPrice(stock.currentPrice)}
          </span>
          <span className={`text-base font-medium ${isUp ? 'text-up' : 'text-down'}`}>
            {formatChangeAmount(stock.changeAmount)} ({formatChange(stock.change)})
          </span>
        </div>
      </div>
    </div>
  );
}
