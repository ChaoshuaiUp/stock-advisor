// 信号灯组件 — 产品核心视觉语言
import type { Signal } from '@/types';
import { getSignalGradient, getSignalAnimation } from '@/utils/colors';

interface SignalLightProps {
  signal: Signal;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export default function SignalLight({ signal, size = 'lg', animated = true }: SignalLightProps) {
  const gradient = getSignalGradient(signal.level);
  const animation = animated ? getSignalAnimation(signal.level) : '';

  // 尺寸映射
  const sizeMap = {
    sm: { outer: 'w-16 h-16', inner: 'w-12 h-12', label: 'text-xs', score: 'text-xs' },
    md: { outer: 'w-24 h-24', inner: 'w-[72px] h-[72px]', label: 'text-sm', score: 'text-xs' },
    lg: { outer: 'w-28 h-28', inner: 'w-[84px] h-[84px]', label: 'text-base', score: 'text-sm' },
  };

  const s = sizeMap[size];

  // 星级显示
  const stars = '★'.repeat(Math.round(signal.score)) + '☆'.repeat(5 - Math.round(signal.score));

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      {/* 信号灯外圈 */}
      <div
        className={`
          ${s.outer} rounded-full flex items-center justify-center relative
          bg-gradient-to-br ${gradient}
          ${animation}
        `}
        role="status"
        aria-label={`${signal.label}，评分${signal.score}分`}
      >
        {/* 内圈（背景色半透明白色遮罩） */}
        <div
          className={`
            ${s.inner} rounded-full bg-white/90 dark:bg-gray-900/90
            flex flex-col items-center justify-center gap-0.5 z-10
          `}
        >
          <span className={`${s.label} font-semibold ${
            signal.level === 'buy' ? 'text-signal-buy-dark' :
            signal.level === 'hold' ? 'text-signal-hold-dark' :
            'text-signal-sell-dark'
          }`}>
            {signal.label}
          </span>
        </div>
      </div>

      {/* 评分星级 */}
      <div className={`${s.score} text-slate-500 dark:text-slate-400`}>
        <span className="tracking-wider">{stars}</span>
        <span className="ml-1 font-mono font-semibold text-slate-700 dark:text-slate-300">
          {signal.score.toFixed(1)}
        </span>
        <span className="text-slate-400"> / 5</span>
      </div>
    </div>
  );
}
