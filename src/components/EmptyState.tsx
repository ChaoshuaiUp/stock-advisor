// 空状态组件
import { Search, BarChart3 } from 'lucide-react';

interface EmptyStateProps {
  type: 'search' | 'compare';
  onAction?: () => void;
}

export default function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === 'search') {
    return (
      <div className="text-center py-12 px-4">
        <Search className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          未找到匹配的股票
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          试试搜索"茅台"或"600519"
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12 px-4">
      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
        添加至少 2 只股票开始对比
      </h3>
      <p className="text-sm text-slate-400 mb-6">
        在搜索页找到感兴趣的股票，添加到对比列表
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-85 transition-all"
        >
          去搜索页看看 →
        </button>
      )}
    </div>
  );
}
