// 大盘温度计算
import type { MarketTemperature } from '@/types';

export function calculateMarketTemperature(params: {
  indexChange: number;         // 上证指数涨跌幅 (%)
  volumeRatio: number;         // 相对20日均量比
  advanceCount: number;        // 上涨家数
  declineCount: number;         // 下跌家数
  northboundFlow: number;       // 北向资金净流入(亿)
  limitUpCount: number;         // 涨停家数
  csi300PePercentile: number;   // 沪深300 PE分位 (%)
}): MarketTemperature {
  const {
    indexChange,
    volumeRatio,
    advanceCount,
    declineCount,
    northboundFlow,
    limitUpCount,
    csi300PePercentile,
  } = params;

  // 各维度归一化到 0-100
  const indexScore = Math.min(100, Math.max(0, (indexChange + 5) / 10 * 100));
  const volumeScore = Math.min(100, Math.max(0, (volumeRatio - 0.5) / 1.5 * 100));
  const adRatio = declineCount > 0 ? advanceCount / declineCount : advanceCount > 0 ? 5 : 1;
  const adScore = Math.min(100, Math.max(0, (adRatio - 0.2) / 4.8 * 100));
  const northScore = Math.min(100, Math.max(0, (northboundFlow + 100) / 200 * 100));
  const limitScore = Math.min(100, Math.max(0, limitUpCount / 100 * 100));
  const peScore = Math.min(100, Math.max(0, csi300PePercentile));

  const score = Math.round(
    indexScore * 0.25 +
    volumeScore * 0.20 +
    adScore * 0.20 +
    northScore * 0.15 +
    limitScore * 0.10 +
    peScore * 0.10
  );

  let level: MarketTemperature['level'];
  let label: string;
  let color: string;
  let advice: string;

  if (score <= 30) {
    level = 'cold';
    label = '市场冷清';
    color = '#3b82f6';
    advice = '市场恐慌蔓延，但好股票可能被错杀。机会往往在别人恐惧时降临，可以关注优质标的。';
  } else if (score <= 50) {
    level = 'cool';
    label = '正常偏冷';
    color = '#22c55e';
    advice = '市场情绪谨慎，估值合理偏低位，适合分批建仓，稳健参与。';
  } else if (score <= 70) {
    level = 'warm';
    label = '正常偏热';
    color = '#eab308';
    advice = '市场情绪适中偏热，持有为主，追高需谨慎。注意控制仓位。';
  } else {
    level = 'hot';
    label = '过热预警';
    color = '#ef4444';
    advice = '市场情绪高涨，全民炒股模式开启！风险正在积累，考虑减仓锁定利润。';
  }

  return {
    score,
    level,
    label,
    color,
    advice,
    details: {
      indexChange,
      volumeRatio,
      advanceDeclineRatio: declineCount > 0 ? advanceCount / declineCount : advanceCount,
      northboundFlow,
      limitUpCount,
      csi300PePercentile,
    },
  };
}
