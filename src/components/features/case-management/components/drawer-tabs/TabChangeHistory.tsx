/**
 * 用例详情抽屉 - 变更历史 Tab
 * 迁移自 aegis-next-server tabChangeHistory.vue
 * 说明：若后端提供「另存为版本」API（如根据变更历史 id 恢复为用例版本），可在此 Tab 增加「另存为版本」按钮与版本选择弹窗。
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { caseManagementService } from '@/services';

const TYPE_MAP: Record<string, string> = {
  ADD: '新增',
  UPDATE: '修改',
  IMPORT: '导入',
};

interface TabChangeHistoryProps {
  caseId: string | null;
  projectId: string;
}

export function TabChangeHistory({ caseId, projectId }: TabChangeHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [list, setList] = useState<any[]>([]);

  const fetchList = useCallback(() => {
    if (!caseId) return;
    setLoading(true);
    setError(false);
    caseManagementService
      .getChangeHistoryList({
        projectId,
        sourceId: caseId,
        types: ['IMPORT', 'ADD', 'UPDATE'],
        modules: 'CASE_MANAGEMENT_CASE',
        current: 1,
        pageSize: 20,
      })
      .then((res: any) => {
        const data = res?.list ?? res?.records ?? res ?? [];
        setList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setList([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [caseId, projectId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  if (!caseId) return null;
  if (loading) return <div className="py-8 text-center text-gray-500">加载中...</div>;
  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500 mb-3">加载失败，请检查网络或联系管理员</p>
        <Button variant="outline" size="sm" onClick={fetchList}>
          <RefreshCw className="w-4 h-4 mr-1.5" />重试
        </Button>
      </div>
    );
  }
  if (list.length === 0) return <div className="py-8 text-center text-gray-500">暂无变更历史</div>;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[90px]">变更编号</TableHead>
            <TableHead className="w-[100px]">变更类型</TableHead>
            <TableHead>操作人</TableHead>
            <TableHead className="w-[180px]">操作时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono">{item.id ?? '-'}</TableCell>
              <TableCell>{TYPE_MAP[item.type] ?? item.type ?? '-'}</TableCell>
              <TableCell>{item.createUserName ?? item.createUser ?? '-'}</TableCell>
              <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
