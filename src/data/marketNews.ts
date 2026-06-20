// 市场资讯 Mock 数据
import type { MarketNews, Sector } from '@/types';

export const MARKET_NEWS: MarketNews[] = [
  {
    id: '1',
    title: '央行宣布降准0.5个百分点，释放长期资金约1万亿',
    source: '央行官网',
    time: '10:30',
    impact: 'positive',
  },
  {
    id: '2',
    title: '新能源板块获北向资金连续3日净流入',
    source: '证券时报',
    time: '11:15',
    impact: 'positive',
  },
  {
    id: '3',
    title: '美联储暗示年内可能再加息一次',
    source: '华尔街日报',
    time: '09:00',
    impact: 'negative',
  },
];

export const SECTORS: Sector[] = [
  { name: 'AI 人工智能', change: 3.2 },
  { name: '半导体', change: 2.1 },
  { name: '白酒', change: 1.5 },
  { name: '医药', change: 0.8 },
  { name: '新能源', change: -0.8 },
  { name: '房地产', change: -1.5 },
  { name: '保险', change: -2.1 },
  { name: '银行', change: -0.3 },
];
