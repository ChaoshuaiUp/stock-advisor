/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 三色信号灯系统
        'signal-buy': { DEFAULT: '#16a34a', light: '#dcfce7', dark: '#15803d' },
        'signal-hold': { DEFAULT: '#ca8a04', light: '#fef9c3', dark: '#a16207' },
        'signal-sell': { DEFAULT: '#dc2626', light: '#fee2e2', dark: '#b91c1c' },
        // 大盘温度计
        'temp-cold': '#3b82f6',
        'temp-cool': '#22c55e',
        'temp-warm': '#eab308',
        'temp-hot': '#ef4444',
        // 涨跌色（中国市场：红涨绿跌）
        'up': '#dc2626',
        'down': '#16a34a',
        // 基础颜色
        'surface': '#ffffff',
        'surface-alt': '#f8fafc',
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'pulse-buy': 'pulseBuy 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-sell': 'pulseSell 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        pulseBuy: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(22, 163, 74, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(22, 163, 74, 0)' },
        },
        pulseSell: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(220, 38, 38, 0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'card': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
