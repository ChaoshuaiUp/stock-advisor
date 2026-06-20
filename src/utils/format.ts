// 金额/百分比格式化工具

/**
 * 格式化价格（加千分位）
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 格式化涨跌幅
 */
export function formatChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * 格式化涨跌额
 */
export function formatChangeAmount(amount: number): string {
  const sign = amount > 0 ? '+' : '';
  return `${sign}${amount.toFixed(2)}`;
}

/**
 * 格式化大数字（亿/万）
 */
export function formatLargeNumber(num: number): string {
  if (num >= 100000000) {
    return `${(num / 100000000).toFixed(1)}亿`;
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  return num.toLocaleString();
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
