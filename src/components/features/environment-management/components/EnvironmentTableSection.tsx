import { Plus, Loader2, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import type { Environment, EnvCode } from '@/services/environment';

export interface EnvironmentTableSectionProps {
  environments: Environment[];
  loading: boolean;
  total: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onAdd: () => void;
  onEdit: (env: Environment) => void;
  onDelete: (id: string) => void;
  onDetail: (env: Environment) => void;
  getEnvCodeColor: (code: EnvCode) => string;
}

const COL_COUNT = 10;

export function EnvironmentTableSection({
  environments,
  loading,
  total,
  pageSize,
  currentPage,
  onPageChange,
  onAdd,
  onEdit,
  onDelete,
  onDetail,
  getEnvCodeColor,
}: EnvironmentTableSectionProps) {
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 overflow-auto min-h-0">
        <div className="border-0 border-b border-gray-100">
          <Table>
            <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
              <TableRow className="hover:bg-transparent border-none h-11">
                <TableHead scope="col" className="w-[80px] font-medium text-gray-500">环境ID</TableHead>
                <TableHead scope="col" className="font-medium text-gray-500">环境名称</TableHead>
                <TableHead scope="col" className="font-medium text-gray-500">类型</TableHead>
                <TableHead scope="col" className="font-medium text-gray-500">环境Code</TableHead>
                <TableHead scope="col" className="min-w-[140px] max-w-[200px] font-medium text-gray-500">域名</TableHead>
                <TableHead scope="col" className="font-medium text-gray-500">创建时间</TableHead>
                <TableHead scope="col" className="font-medium text-gray-500">更新时间</TableHead>
                <TableHead scope="col" className="font-medium text-gray-500">创建人</TableHead>
                <TableHead scope="col" className="font-medium text-gray-500">更新人</TableHead>
                <TableHead scope="col" className="text-right font-medium text-gray-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableCell colSpan={COL_COUNT} className="h-32 text-center text-gray-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> 加载中...
                    </span>
                  </TableCell>
                </TableRow>
              ) : environments.length === 0 ? (
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableCell colSpan={COL_COUNT} className="h-32 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <span>暂无环境配置</span>
                      <Button onClick={onAdd} variant="outline" size="sm" className="rounded-xl">
                        <Plus className="w-4 h-4 mr-1" /> 添加环境
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                environments.map((env) => (
                  <TableRow
                    key={env.id}
                    className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11 cursor-pointer"
                    onClick={() => onDetail(env)}
                  >
                    <TableCell className="font-mono text-xs text-gray-600">{env.id ?? '-'}</TableCell>
                    <TableCell className="font-medium">{env.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{env.engineType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getEnvCodeColor(env.envCode)}>{env.envCode}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 max-w-[200px] truncate" title={env.domain || undefined}>
                      {env.domain || '-'}
                    </TableCell>
                    <TableCell className="text-gray-500 whitespace-nowrap">
                      {env.createdAt ? new Date(env.createdAt).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell className="text-gray-500 whitespace-nowrap">
                      {env.updatedAt ? new Date(env.updatedAt).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell className="text-gray-500">{env.createUser ?? '-'}</TableCell>
                    <TableCell className="text-gray-500">{env.updateUser ?? '-'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => onEdit(env)} title="编辑">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => env.id && onDelete(env.id)}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <UnifiedPagination
        total={total}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={onPageChange}
        unitLabel="条"
        hideWhenEmpty={false}
      />
    </div>
  );
}
