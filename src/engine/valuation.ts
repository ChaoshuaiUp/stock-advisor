// 估值评分
export function calcValuationScore(pePercentile: number): number {
  if (pePercentile <= 20) return 5.0;
  if (pePercentile <= 40) return 3.5;
  if (pePercentile <= 60) return 2.5;
  if (pePercentile <= 80) return 1.5;
  return 0.5;
}
