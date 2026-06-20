/**
 * 股票行情 API Service 层
 * 
 * 通过 Vite proxy 将请求转发到本地代理服务（localhost:3001）
 * 接口文档参见 proxy-server/index.js
 */

// ── 类型定义 ────────────────────────────────────────────────────────────────

export interface QuoteData {
  code: string;
  name: string;
  price: number;
  prevClose: number;
  open: number;
  changeAmount: number;
  change: number;          // 涨跌幅 %
  high: number;
  low: number;
  volumeYi: number;       // 成交额(亿)
  turnoverPct: number;    // 换手率
  peTtm: number;
  mcapYi: number;         // 总市值(亿)
  floatMcapYi: number;    // 流通市值(亿)
  pb: number;
  limitUp: number;
  limitDown: number;
  volRatio: number;       // 量比
  peStatic: number;
  updateTime: string;
}

export interface KLineBar {
  date: string;           // YYYY-MM-DD
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
}

export interface IndexData {
  code: string;
  name: string;
  price: number;
  change: number;
  changeAmount: number;
}

export interface SectorData {
  name: string;
  change: number;
  up?: number;
  down?: number;
}

export interface MarketData {
  indexes: IndexData[];
  sectors: SectorData[];
}

// ── 配置 ────────────────────────────────────────────────────────────────────
// 开发环境：Vite 代理 /api → localhost:3001
// 生产环境：通过 VITE_API_BASE_URL 环境变量指定代理服务地址
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TIMEOUT_MS = 8000;

// ── 请求工具 ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout<T>(url: string, fallback: T): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[stockApi] HTTP ${res.status} from ${url}`);
      return fallback;
    }

    const json = await res.json();
    if (!json.success) {
      console.warn(`[stockApi] API error: ${json.error}`);
      return fallback;
    }

    return json.data as T;
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      console.warn(`[stockApi] Timeout: ${url}`);
    } else {
      console.warn(`[stockApi] Fetch error: ${(err as Error).message}`);
    }
    return fallback;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// fetchQuotes — 批量实时行情
// codes: 股票代码数组，如 ['600519', '300750']
// 返回 Record<code, QuoteData>，失败的返回 {}
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchQuotes(
  codes: string[]
): Promise<Record<string, QuoteData>> {
  if (!codes.length) return {};

  // 分批处理（腾讯API建议不超过15只/次）
  const BATCH_SIZE = 15;
  const result: Record<string, QuoteData> = {};

  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const batch = codes.slice(i, i + BATCH_SIZE);
    const url = `${BASE_URL}/quote/${batch.join(',')}`;
    const batchResult = await fetchWithTimeout<Record<string, QuoteData>>(url, {});
    Object.assign(result, batchResult);
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// fetchKLine — 日K线数据
// code: 单只股票代码
// count: 返回条数（默认120）
// 失败时返回 []
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchKLine(code: string, count = 120): Promise<KLineBar[]> {
  const url = `${BASE_URL}/kline/${code}?count=${count}`;
  return fetchWithTimeout<KLineBar[]>(url, []);
}

// ══════════════════════════════════════════════════════════════════════════════
// fetchMarketData — 大盘指数 + 行业板块
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchMarketData(): Promise<MarketData | null> {
  const url = `${BASE_URL}/market`;
  return fetchWithTimeout<MarketData | null>(url, null);
}

// ══════════════════════════════════════════════════════════════════════════════
// searchStocks — 搜索股票（东财搜索接口）
// keyword: 股票名称/代码/拼音首字母
// 返回匹配结果列表（含实时行情），失败时返回 []
// ══════════════════════════════════════════════════════════════════════════════

export interface SearchResult {
  code: string;
  name: string;
  market: string;
  type: string;
  pinyin: string;
  price: number;
  change: number;
  changeAmount: number;
}

export async function searchStocks(keyword: string): Promise<SearchResult[]> {
  if (!keyword.trim()) return [];
  const url = `${BASE_URL}/search?q=${encodeURIComponent(keyword.trim())}`;
  const result = await fetchWithTimeout<{ data: SearchResult[]; total: number } | null>(
    url,
    null
  );
  return result?.data ?? [];
}

// ══════════════════════════════════════════════════════════════════════════════
// checkProxyHealth — 检查代理服务是否在线
// ══════════════════════════════════════════════════════════════════════════════

export async function checkProxyHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
