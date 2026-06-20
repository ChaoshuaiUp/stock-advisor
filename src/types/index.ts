// ===== 股票基础信息 =====
export interface Stock {
  code: string;           // 600519
  name: string;           // 贵州茅台
  pinyin: string;         // guizhoumaotai
  pinyinShort: string;   // gzmt (首字母缩写)
  industry: string;       // 白酒
  market: 'SH' | 'SZ';   // 上海/深圳
  currentPrice: number;   // 1523.50
  change: number;         // +1.23 (百分比)
  changeAmount: number;   // +18.50 (金额)
  prevClose: number;      // 昨收
  openPrice: number;      // 今开
  highPrice: number;      // 最高
  lowPrice: number;       // 最低
  volume: number;         // 成交额(亿)
}

// ===== K 线数据 =====
export interface KLine {
  date: string;       // 2024-01-15
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;      // 成交量
  turnover: number;    // 成交额
}

// ===== 信号 =====
export interface SignalDetail {
  name: string;       // 趋势强度
  score: number;      // 0-5
  weight: number;    // 0.30
}

export interface Signal {
  score: number;          // 0-5 综合评分
  level: 'buy' | 'hold' | 'sell';
  label: string;          // "建议买入" / "谨慎持有" / "卖出/观望"
  color: 'green' | 'yellow' | 'red';
  details: SignalDetail[];
}

// ===== 买卖价位 =====
export interface PriceZone {
  currentPrice: number;
  buyLower: number;
  buyUpper: number;
  sellLower: number;
  sellUpper: number;
  upsidePercent: number;  // 潜在收益百分比
  position: 'below' | 'in' | 'above'; // 当前价相对买入区的位置
}

// ===== 布林带 =====
export interface Bollinger {
  upper: number;
  middle: number;
  lower: number;
}

// ===== MACD 结果 =====
export interface MacdData {
  date: string;
  dif: number;
  dea: number;
  bar: number;
}

// ===== 技术指标 =====
export interface Indicators {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  macd: {
    dif: number;
    dea: number;
    bar: number;
    history: MacdData[];
  };
  rsi14: number;
  bollinger: Bollinger;
  volumeRatio: number;  // 量比
  klineData: KLine[];   // K 线序列数据（用于图表）
  prevPrice: number;    // 前一日收盘价
}

// ===== 估值 =====
export interface Valuation {
  pe: number;
  pb: number;
  pePercentile: number;  // PE 历史分位
  roe: number;
  dividendYield: number;
  industryAvgPE: number;
  industryAvgPB: number;
  revenueGrowth: number;   // 营收增速
  profitGrowth: number;    // 利润增速
  debtRatio: number;       // 负债率
  ytdChange: number;      // 年初至今涨跌
  oneMonthChange: number; // 近1月涨跌
}

// ===== 个股完整分析 =====
export interface StockAnalysis {
  stock: Stock;
  signal: Signal;
  priceZone: PriceZone;
  indicators: Indicators;
  valuation: Valuation;
  advice: string;         // 通俗解读文案
}

// ===== 大盘温度计 =====
export interface MarketTemperature {
  score: number;           // 0-100
  level: 'cold' | 'cool' | 'warm' | 'hot';
  label: string;          // "正常偏热"
  color: string;          // 对应温度色
  advice: string;         // 一句话建议
  details: {
    indexChange: number;      // 上证涨跌
    volumeRatio: number;      // 成交量比
    advanceDeclineRatio: number; // 涨跌家数比
    northboundFlow: number;   // 北向资金(亿)
    limitUpCount: number;     // 涨停家数
    csi300PePercentile: number; // 沪深300 PE分位
  };
}

// ===== 行业板块 =====
export interface Sector {
  name: string;
  change: number;  // 涨跌幅百分比
}

// ===== 市场新闻 =====
export interface MarketNews {
  id: string;
  title: string;
  source: string;
  time: string;
  impact: 'positive' | 'negative' | 'neutral';
}

// ===== App 全局状态 =====
export interface AppState {
  stocks: Stock[];
  selectedStock: Stock | null;
  analysisCache: Record<string, StockAnalysis>;
  compareList: string[];  // 对比列表中的股票代码（最多4只）
}

export type AppAction =
  | { type: 'SELECT_STOCK'; payload: Stock }
  | { type: 'LOAD_ANALYSIS'; payload: { code: string; analysis: StockAnalysis } }
  | { type: 'ADD_TO_COMPARE'; payload: string }
  | { type: 'REMOVE_FROM_COMPARE'; payload: string }
  | { type: 'SET_STOCKS'; payload: Stock[] };
