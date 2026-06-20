// 买卖价位区间条组件
import type { PriceZone as PriceZoneType, Signal } from '@/types';
import { formatPrice } from '@/utils/format';

interface PriceZoneProps {
  priceZone: PriceZoneType;
  signal: Signal;
  type: 'buy' | 'sell';
}

export default function PriceZone({ priceZone, signal, type }: PriceZoneProps) {
  const isBuy = type === 'buy';

  const lower = isBuy ? priceZone.buyLower : priceZone.sellLower;
  const upper = isBuy ? priceZone.buyUpper : priceZone.sellUpper;
  const currentPrice = priceZone.currentPrice;

  // 计算价格范围（用于可视化条定位）
  const rangeMin = isBuy ? lower * 0.93 : currentPrice * 0.95;
  const rangeMax = isBuy ? upper * 1.07 : upper * 1.05;
  const totalRange = rangeMax - rangeMin;

  // 各段位置（百分比）
  const zoneStart = ((lower - rangeMin) / totalRange) * 100;
  const zoneWidth = ((upper - lower) / totalRange) * 100;
  const currentPos = ((currentPrice - rangeMin) / totalRange) * 100;

  // 位置文案
  const positionText = isBuy
    ? priceZone.position === 'in'
      ? '在合理区间内'
      : priceZone.position === 'below'
        ? '低于买入区间，低吸机会'
        : '略高于买入区间'
    : '';

  const zoneColor = isBuy ? 'bg-signal-buy' : 'bg-signal-sell/30';
  const indicatorColor = signal.level === 'buy' ? 'text-signal-buy' :
    signal.level === 'sell' ? 'text-signal-sell' : 'text-signal-hold';

  return (
    <div className="px-4 py-3">
      {/* 标题行 */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {isBuy ? '💰 建议买入价' : '📈 建议卖出价'}
        </span>
        <span className="text-sm font-semibold font-mono text-slate-900 dark:text-slate-100">
          ¥{formatPrice(lower)} — ¥{formatPrice(upper)}
        </span>
      </div>

      {/* 价格区间条 */}
      {isBuy && (
        <div className="relative py-3">
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 relative overflow-visible">
            <div
              className={`absolute h-full rounded-full ${zoneColor}`}
              style={{ left: `${zoneStart}%`, width: `${zoneWidth}%` }}
            />
          </div>
          {/* 当前价指针 */}
          <div
            className="absolute -top-1"
            style={{ left: `${Math.min(Math.max(currentPos, 2), 98)}%`, transform: 'translateX(-50%)' }}
          >
            <div className="flex flex-col items-center">
              <div className={`w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-slate-800 dark:border-b-slate-200`} />
              <div className="w-[1.5px] h-7 bg-slate-800 dark:bg-slate-200" />
              <span className={`text-xs font-semibold ${indicatorColor} whitespace-nowrap`}>
                ¥{formatPrice(currentPrice)}
              </span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {positionText}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 卖出价 - 只显示潜在收益 */}
      {!isBuy && (
        <div className="text-center py-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">潜在收益空间 </span>
          <span className="text-sm font-semibold text-up">
            +{priceZone.upsidePercent.toFixed(1)}%
          </span>
        </div>
      )}

      {/* 刻度标签（仅买入区） */}
      {isBuy && (
        <div className="flex justify-between text-[10px] text-slate-400 mt-8">
          <span>¥{formatPrice(rangeMin)}</span>
          <span>¥{formatPrice(lower)}</span>
          <span>¥{formatPrice(upper)}</span>
          <span>¥{formatPrice(rangeMax)}</span>
        </div>
      )}
    </div>
  );
}
