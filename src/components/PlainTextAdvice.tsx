// 通俗解读卡片
import type { Signal } from '@/types';

interface PlainTextAdviceProps {
  text: string;
  signal: Signal;
}

export default function PlainTextAdvice({ text, signal }: PlainTextAdviceProps) {
  const bgMap = {
    buy: 'bg-signal-buy-light dark:bg-green-900/30',
    hold: 'bg-signal-hold-light dark:bg-yellow-900/30',
    sell: 'bg-signal-sell-light dark:bg-red-900/30',
  };

  const quoteColorMap = {
    buy: 'text-signal-buy',
    hold: 'text-signal-hold',
    sell: 'text-signal-sell',
  };

  return (
    <div className={`relative px-5 py-5 rounded-xl overflow-hidden ${bgMap[signal.level]}`}>
      {/* 左侧引号装饰 */}
      <div
        className={`absolute top-1 left-3 text-6xl leading-none font-serif opacity-15 pointer-events-none ${quoteColorMap[signal.level]}`}
        aria-hidden="true"
      >
        &ldquo;
      </div>

      {/* 正文 */}
      <p className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 relative">
        {text}
      </p>

      {/* 署名 */}
      <p className="text-right text-xs text-slate-400 dark:text-slate-500 mt-2">
        —— 股票决策助手分析引擎
      </p>
    </div>
  );
}
