/**
 * LogManagementPage Component
 * 日志管理主页面
 */

import { useState, useEffect, useMemo } from 'react';
import { LogFilterPanel } from './LogFilterPanel';
import { LogTable } from './LogTable';
import { VirtualizedLogTable } from './VirtualizedLogTable';
import { useLogQuery } from '@/hooks/log/useLogQuery';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import type { LogFilters } from '@/types/log';

// 虚拟化阈值 - 当日志数量超过此值时使用虚拟化表格
const VIRTUALIZATION_THRESHOLD = 50;

interface LogManagementPageProps {
  projectId: string;
}

export type { LogManagementPageProps };

export function LogManagementPage({ projectId }: LogManagementPageProps) {
  const { hasPermission, isCheckingPermission } = usePermissionCheck(projectId);
  
  const {
    logs,
    loading,
    total,
    current,
    pageSize,
    filters,
    sortField,
    sortOrder,
    setFilters,
    setPage,
    setPageSize,
    setSort,
    refresh,
  } = useLogQuery(projectId);

  const [localFilters, setLocalFilters] = useState<LogFilters>(filters);

  // 决定是否使用虚拟化表格
  const useVirtualization = useMemo(() => {
    return logs.length > VIRTUALIZATION_THRESHOLD;
  }, [logs.length]);

  // 选择合适的表格组件
  const TableComponent = useVirtualization ? VirtualizedLogTable : LogTable;

  // 处理筛选条件变化（本地状态）
  const handleFiltersChange = (newFilters: LogFilters) => {
    setLocalFilters(newFilters);
  };

  // 处理查询按钮点击
  const handleSearch = () => {
    setFilters(localFilters);
    setPage(1); // 重置到第一页
  };

  // 键盘导航支持
  useKeyboardNavigation({
    onEnter: () => {
      // 如果焦点在筛选面板，触发查询
      const activeElement = document.activeElement;
      if (activeElement?.closest('[role="search"]')) {
        handleSearch();
      }
    },
    enabled: true,
  });

  // 快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + R: 刷新
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refresh();
      }
      // Ctrl/Cmd + F: 聚焦到搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('#operation-name');
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [refresh]);

  // 权限检查中
  if (isCheckingPermission) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <span className="text-4xl">🔍</span>
          </div>
          <p className="text-gray-500">正在检查权限...</p>
        </div>
      </div>
    );
  }

  // 无权限
  if (hasPermission === false) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-6">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertTitle>权限不足</AlertTitle>
          <AlertDescription>
            您没有访问操作日志的权限。只有系统管理员和项目管理员可以查看操作日志。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="flex flex-col h-full bg-gray-50" role="main" aria-label="操作日志管理">
      {/* 页面标题 */}
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">操作日志</h1>
        <p className="mt-1 text-sm text-gray-500">查看和管理系统操作日志</p>
      </header>

      {/* 筛选面板 */}
      <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-6 py-4">
        <LogFilterPanel
          filters={localFilters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
        />
      </div>

      {/* 日志表格 */}
      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm min-h-[400px] overflow-hidden">
          <TableComponent
          logs={logs}
          loading={loading}
          total={total}
          current={current}
          pageSize={pageSize}
          sortField={sortField}
          sortOrder={sortOrder}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSort={setSort}
        />
        </div>
      </div>
    </main>
  );
}
