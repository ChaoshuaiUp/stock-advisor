// 综合评分主函数
import type { Signal, SignalDetail, StockAnalysis } from '@/types';
import {
  calcTrendStrength,
  calcRSIScore,
  calcMomentum,
  calcValuationScore,
  calcVolumeScore,
} from './indicators';

/**
 * 根据个股分析数据计算综合信号
 */
export function calculateSignal(analysis: StockAnalysis): Signal {
  const { indicators, valuation } = analysis;

  const trendScore = calcTrendStrength({
    ma5: indicators.ma5,
    ma10: indicators.ma10,
    ma20: indicators.ma20,
    ma60: indicators.ma60,
    currentPrice: analysis.stock.currentPrice,
  });

  const momentumScore = calcMomentum({
    dif: indicators.macd.dif,
    dea: indicators.macd.dea,
    bar: indicators.macd.bar,
    prevBar: indicators.macd.history.length >= 2
      ? indicators.macd.history[indicators.macd.history.length - 2]?.bar ?? 0
      : 0,
  });

  const rsiScore = calcRSIScore(indicators.rsi14);
  const valuationScore = calcValuationScore(valuation.pePercentile);
  const volumeScore = calcVolumeScore({
    volumeRatio: indicators.volumeRatio,
    currentPrice: analysis.stock.currentPrice,
    prevPrice: indicators.prevPrice,
  });

  const totalScore =
    trendScore * 0.30 +
    momentumScore * 0.25 +
    rsiScore * 0.20 +
    valuationScore * 0.15 +
    volumeScore * 0.10;

  const score = Math.round(totalScore * 10) / 10;

  const level: Signal['level'] = score >= 4.0 ? 'buy' : score >= 2.5 ? 'hold' : 'sell';

  const labelMap: Record<string, string> = {
    buy: '建议买入',
    hold: '谨慎持有',
    sell: '卖出/观望',
  };

  const colorMap: Record<string, Signal['color']> = {
    buy: 'green',
    hold: 'yellow',
    sell: 'red',
  };

  const details: SignalDetail[] = [
    { name: '趋势强度', score: Math.round(trendScore * 10) / 10, weight: 0.30 },
    { name: '动量信号', score: Math.round(momentumScore * 10) / 10, weight: 0.25 },
    { name: '超买超卖', score: Math.round(rsiScore * 10) / 10, weight: 0.20 },
    { name: '估值水位', score: Math.round(valuationScore * 10) / 10, weight: 0.15 },
    { name: '量价配合', score: Math.round(volumeScore * 10) / 10, weight: 0.10 },
  ];

  return {
    score,
    level,
    label: labelMap[level],
    color: colorMap[level],
    details,
  };
}

/**
 * 生成通俗解读文案
 */
export function generateAdvice(signal: Signal, stockName: string, priceZone: StockAnalysis['priceZone']): string {
  const { level, score } = signal;

  if (level === 'buy') {
    const positionText = priceZone.position === 'in'
      ? `当前价格已在合理买入区间内，可以考虑分批建仓`
      : priceZone.position === 'below'
        ? `当前价格低于建议买入价，是不错的低吸机会`
        : `当前价格略高于建议买入价，可以等回调再入场`;

    return `${stockName}目前的多项技术指标呈现积极信号，综合评分${score}分。${positionText}。短期均线形成支撑，趋势偏强，适合中长线投资者关注。`;
  }

  if (level === 'hold') {
    return `${stockName}目前的走势方向不够明确，综合评分${score}分。已持有的建议继续持有观望，等待更明确的信号再行动。未入场的建议耐心等待，不要急于追涨。`;
  }

  return `${stockName}目前的技术面偏弱，综合评分仅${score}分。趋势走弱，估值偏高，此时入场风险较大。已持有的建议考虑减仓止损，未持有的建议继续观望。`;
}
