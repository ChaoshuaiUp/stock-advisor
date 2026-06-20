// 信号颜色映射工具
import type { Signal } from '@/types';

export function getSignalColor(signal: Signal): {
  bg: string;
  text: string;
  border: string;
  ring: string;
  light: string;
} {
  switch (signal.level) {
    case 'buy':
      return {
        bg: 'bg-signal-buy',
        text: 'text-signal-buy',
        border: 'border-signal-buy',
        ring: 'ring-signal-buy/40',
        light: 'bg-signal-buy-light',
      };
    case 'hold':
      return {
        bg: 'bg-signal-hold',
        text: 'text-signal-hold',
        border: 'border-signal-hold',
        ring: 'ring-signal-hold/40',
        light: 'bg-signal-hold-light',
      };
    case 'sell':
      return {
        bg: 'bg-signal-sell',
        text: 'text-signal-sell',
        border: 'border-signal-sell',
        ring: 'ring-signal-sell/40',
        light: 'bg-signal-sell-light',
      };
  }
}

export function getSignalGradient(level: Signal['level']): string {
  switch (level) {
    case 'buy': return 'from-green-400 to-green-700';
    case 'hold': return 'from-yellow-400 to-yellow-700';
    case 'sell': return 'from-red-400 to-red-700';
  }
}

export function getSignalAnimation(level: Signal['level']): string {
  switch (level) {
    case 'buy': return 'animate-pulse-buy';
    case 'sell': return 'animate-pulse-sell';
    case 'hold': return ''; // 持有不动画，降低紧迫感
  }
}
