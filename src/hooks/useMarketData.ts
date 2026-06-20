/**
 * 大盘数据 hook（实时指数 + 行业板块）
 * 
 * 优先级：
 *   1. 尝试从代理服务拉实时大盘数据
 *   2. 若不可用，降级到 mock 数据
 */
import { useState, useEffect } from 'react';
import type { MarketTemperature, Sector } from '@/types';
import { calculateMarketTemperature } from '@/engine/marketTemp';
import { SECTORS } from '@/data/marketNews';
import { fetchMarketData, checkProxyHealth } from '@/services/stockApi';

export interface MarketDataState {
  temperature: MarketTemperature;
  sectors: Sector[];
  breadth: {
    advance: number;
    decline: number;
    flat: number;
    advancePercent: number;
    declinePercent: number;
    flatPercent: number;
  };
  smartMoney: Array<{ name: string; flow: number; code: string }>;
  indexes: Array<{ code: string; name: string; price: number; change: number; changeAmount: number }>;
  isLive: boolean;
  loading: boolean;
}

// 默认 mock 数据
const DEFAULT_STATE: MarketDataState = {
  temperature: calculateMarketTemperature({
    indexChange: 0.85,
    volumeRatio: 1.15,
    advanceCount: 2356,
    declineCount: 1520,
    northboundFlow: 35.2,
    limitUpCount: 42,
    csi300PePercentile: 45,
  }),
  sectors: SECTORS,
  breadth: {
    advance: 2356, decline: 1520, flat: 324,
    advancePercent: 56, declinePercent: 36, flatPercent: 8,
  },
  smartMoney: [
    { name: '贵州茅台', flow: 12.5, code: '600519' },
    { name: '宁德时代', flow: 8.3, code: '300750' },
    { name: '隆基绿能', flow: 5.1, code: '601012' },
    { name: '中芯国际', flow: 4.7, code: '688981' },
    { name: '比亚迪', flow: -2.1, code: '002594' },
  ],
  indexes: [
    { code: '000001', name: '上证指数', price: 3350.0, change: 0.85, changeAmount: 28.2 },
    { code: '000300', name: '沪深300', price: 4082.0, change: 0.72, changeAmount: 29.1 },
    { code: '399006', name: '创业板指', price: 2185.0, change: 1.12, changeAmount: 24.2 },
  ],
  isLive: false,
  loading: true,
};

export function useMarketData(): MarketDataState {
  const [state, setState] = useState<MarketDataState>(DEFAULT_STATE);

  useEffect(() => {
    const loadData = async () => {
      // 先快速检查代理是否在线
      const proxyOnline = await checkProxyHealth();

      if (!proxyOnline) {
        setState(prev => ({ ...prev, loading: false, isLive: false }));
        return;
      }

      try {
        const marketData = await fetchMarketData();
        if (!marketData) {
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        const { indexes: rawIndexes, sectors: rawSectors } = marketData;

        // 解析上证涨跌（用于温度计）
        const shanghaiIdx = rawIndexes.find(idx => idx.code === '000001');
        const indexChange = shanghaiIdx?.change ?? 0.85;

        // 重新计算大盘温度（用实时数据）
        const temperature = calculateMarketTemperature({
          indexChange,
          volumeRatio: 1.1,          // 成交量比暂用估算（API未提供）
          advanceCount: 2500,         // 涨跌家数暂用估算
          declineCount: 1600,
          northboundFlow: 20,         // 北向数据东财已断供
          limitUpCount: 30,
          csi300PePercentile: 45,
        });

        // 转换行业板块格式
        const sectors: Sector[] = rawSectors.map(s => ({
          name: s.name,
          change: s.change,
        }));

        // 更新指数数据
        const indexes = rawIndexes.map(idx => ({
          code: idx.code,
          name: idx.name,
          price: idx.price,
          change: idx.change,
          changeAmount: idx.changeAmount,
        }));

        setState(prev => ({
          ...prev,
          temperature,
          sectors: sectors.length > 0 ? sectors : SECTORS,
          indexes,
          isLive: true,
          loading: false,
        }));
      } catch (err) {
        console.warn('[useMarketData] 加载实时大盘数据失败，使用 mock:', err);
        setState(prev => ({ ...prev, loading: false, isLive: false }));
      }
    };

    loadData();

    // 每5分钟刷新一次大盘数据
    const timer = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return state;
}
