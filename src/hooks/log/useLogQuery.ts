/**
 * useLogQuery Hook
 * 日志查询状态管理
 */

import { useState, useCallback, useEffect } from 'react';
import { getLogList } from '@/services/log';
import { errorHandler, toAppError } from '@/utils/errorHandler';
import type { OperationLog, LogFilters, OperationScope, OperationType } from '@/types/log';

export interface UseLogQueryResult {
  logs: OperationLog[];
  loading: boolean;
  total: number;
  current: number;
  pageSize: number;
  filters: LogFilters;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  setFilters: (filters: LogFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (field: string, order: 'asc' | 'desc') => void;
  refresh: () => Promise<void>;
}

export function useLogQuery(projectId: string): UseLogQueryResult {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<LogFilters>({});
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 查询日志
  const fetchLogs = useCallback(async () => {
    if (!projectId) {
      setLogs([]);
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        projectId,
        current,
        pageSize,
        sort: {
          [sortField]: sortOrder,
        },
      };

      // 添加筛选条件
      if (filters.operator) {
        params.operUser = filters.operator;
      }
      if (filters.startTime) {
        params.startTime = filters.startTime.getTime();
      }
      if (filters.endTime) {
        params.endTime = filters.endTime.getTime();
      }
      if (filters.scope) {
        params.level = filters.scope;
      }
      if (filters.type) {
        params.type = filters.type;
      }
      if (filters.module) {
        params.module = filters.module;
      }
      if (filters.content) {
        params.content = filters.content;
      }

      const result = await getLogList(params);
      setLogs(result.list);
      setTotal(result.total);
    } catch (error) {
      console.error('查询日志失败:', error);
      errorHandler.handleError(toAppError(error));
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, current, pageSize, filters, sortField, sortOrder]);

  // 设置页码
  const setPage = useCallback((page: number) => {
    setCurrent(page);
  }, []);

  // 设置每页大小
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrent(1); // 重置到第一页
  }, []);

  // 设置排序
  const setSort = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
  }, []);

  // 刷新
  const refresh = useCallback(async () => {
    await fetchLogs();
  }, [fetchLogs]);

  // 当依赖变化时自动查询
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
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
    setPageSize: handleSetPageSize,
    setSort,
    refresh,
  };
}
