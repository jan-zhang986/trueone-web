/**
 * 系统设置-日志 列表与筛选（迁移自 AegisOne 系统设置-日志）
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, ShieldCheck, Building2, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { systemLogService } from '@/services/setting/log';
import type { LogItem, OptionsItem } from '@/types/setting/log';
import { cn } from '@/utils/cn';

const DEFAULT_PAGE_SIZE = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 20, 30, 50];

const OPERATE_TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'ADD', label: '新增' },
  { value: 'DELETE', label: '删除' },
  { value: 'UPDATE', label: '更新' },
  { value: 'EXECUTE', label: '执行' },
  { value: 'IMPORT', label: '导入' },
  { value: 'EXPORT', label: '导出' },
  { value: 'LOGIN', label: '登录' },
  { value: 'LOGOUT', label: '登出' },
  { value: 'SHARE', label: '分享' },
  { value: 'COPY', label: '复制' },
  { value: 'REVIEW', label: '评审' },
  { value: 'RESTORE', label: '恢复' },
  { value: 'RECOVER', label: '恢复' },
  { value: 'ASSOCIATE', label: '关联' },
  { value: 'DISASSOCIATE', label: '取消关联' },
  { value: 'ARCHIVED', label: '归档' },
  { value: 'DEBUG', label: '调试' },
  { value: 'STOP', label: '停止' },
  { value: 'RERUN', label: '重跑' },
  { value: 'SELECT', label: '选择' },
];

function getDefaultTimeRange(): [number, number] {
  const end = Date.now();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  return [start.getTime(), end];
}

function formatLogTime(ts: number): string {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getTypeLabel(value: string): string {
  return OPERATE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value ?? '-';
}

/** 从行数据中解析操作结果（兼容 status/result/operationStatus/state、大小写、数字等），展示完整 */
function getOperationResultLabel(row: LogItem): string {
  const rawRow = row as LogItem & Record<string, unknown>;
  const raw = rawRow.status ?? rawRow.result ?? rawRow.operationStatus ?? rawRow.state;
  if (raw === undefined || raw === null) return '无';
  const str = String(raw).trim();
  if (str === '') return '无';
  const s = str.toUpperCase();
  if (s === 'SUCCESS' || s === '1' || s === 'TRUE') return '成功';
  if (s === 'FAILED' || s === 'FAILURE' || s === '0' || s === 'FALSE') return '失败';
  if (raw === true) return '成功';
  if (raw === false) return '失败';
  // 单字符、纯标点等视为无效，避免只显示“一点”或“-”
  if (str.length <= 1 && /^[.\-·\s]$/.test(str)) return '无';
  return str;
}

export function SystemLogView() {
  const [[startTime, endTime], setTimeRange] = useState<[number, number]>(getDefaultTimeRange);
  const [operUser, setOperUser] = useState('');
  const [type, setType] = useState('');
  const [content, setContent] = useState('');
  const [orgList, setOrgList] = useState<OptionsItem[]>([]);
  const [projList, setProjList] = useState<OptionsItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  const [selectedProjId, setSelectedProjId] = useState<string>('all');
  const [list, setList] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  // 初始化加载组织与项目选项列表
  useEffect(() => {
    systemLogService
      .getSystemLogOptions()
      .then((res) => {
        setOrgList(res.organizationList || []);
        setProjList(res.projectList || []);
      })
      .catch(() => {
        // 静默容错
      });
  }, []);

  const loadList = useCallback(async (pageNum: number = page) => {
    setLoading(true);
    try {
      const res = await systemLogService.getSystemLogList({
        current: pageNum,
        pageSize,
        operUser: operUser || undefined,
        type: type || undefined,
        content: content.trim() || undefined,
        startTime,
        endTime: endTime + 1000, // 含结束秒
        level: selectedProjId !== 'all' ? 'PROJECT' : selectedOrgId !== 'all' ? 'ORGANIZATION' : 'SYSTEM',
        organizationIds: selectedOrgId !== 'all' ? [selectedOrgId] : undefined,
        projectIds: selectedProjId !== 'all' ? [selectedProjId] : undefined,
        keyword: '',
        filter: {},
        combine: {},
        sort: {},
        sortString: '',
      });
      setList(res.list ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载日志失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, operUser, type, content, startTime, endTime, selectedOrgId, selectedProjId]);

  useEffect(() => {
    loadList(page);
  }, [loadList, page]);

  const handleSearch = () => {
    setPage(1);
    loadList(1); // 当前已是第 1 页时也触发一次请求
  };

  const handleReset = () => {
    setTimeRange(getDefaultTimeRange());
    setOperUser('');
    setType('');
    setContent('');
    setSelectedOrgId('all');
    setSelectedProjId('all');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* 搜索栏：紧凑布局并支持组织/项目范围检索 */}
          <div
            className={cn(
              'flex flex-wrap items-end gap-3 rounded-xl border border-gray-200/80 bg-gray-50/60 p-4',
              'focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-200'
            )}
          >
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
              {/* 所属组织范围 */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">所属组织</Label>
                <Select
                  value={selectedOrgId}
                  onValueChange={(val) => {
                    setSelectedOrgId(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[140px] bg-white border-gray-200 text-sm">
                    <SelectValue placeholder="全部组织" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部组织</SelectItem>
                    {orgList.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 所属项目范围 */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">所属项目</Label>
                <Select
                  value={selectedProjId}
                  onValueChange={(val) => {
                    setSelectedProjId(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[140px] bg-white border-gray-200 text-sm">
                    <SelectValue placeholder="全部项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部项目</SelectItem>
                    {projList.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 操作人 */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">操作人</Label>
                <Input
                  placeholder="用户名/邮箱"
                  value={operUser}
                  onChange={(e) => setOperUser(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-9 w-[130px] bg-white border-gray-200 text-sm"
                />
              </div>

              {/* 操作类型 */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">操作类型</Label>
                <Select value={type || 'all'} onValueChange={(v) => setType(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 w-[110px] bg-white border-gray-200 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {OPERATE_TYPE_OPTIONS.filter((opt) => opt.value && opt.value !== 'all').map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 操作内容/模块 */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">操作名称</Label>
                <Input
                  placeholder="用例/环境/菜单名"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  maxLength={255}
                  className="h-9 w-[150px] bg-white border-gray-200 text-sm"
                />
              </div>

              {/* 时间范围 */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">时间范围</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="datetime-local"
                    className="h-9 w-[165px] text-xs bg-white border-gray-200"
                    value={new Date(startTime).toISOString().slice(0, 16)}
                    onChange={(e) => {
                      const v = e.target.value ? new Date(e.target.value).getTime() : startTime;
                      setTimeRange(([, end]) => [v, end]);
                    }}
                  />
                  <span className="text-muted-foreground text-xs">至</span>
                  <Input
                    type="datetime-local"
                    className="h-9 w-[165px] text-xs bg-white border-gray-200"
                    value={new Date(endTime).toISOString().slice(0, 16)}
                    onChange={(e) => {
                      const v = e.target.value ? new Date(e.target.value).getTime() : endTime;
                      setTimeRange(([start]) => [start, v]);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={handleSearch} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 font-medium">
                <Search className="h-4 w-4 mr-1.5" />
                查询
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} className="h-9 px-4 font-medium border-gray-200 hover:bg-gray-100">
                <RotateCcw className="h-4 w-4 mr-1.5" />
                重置
              </Button>
            </div>
          </div>

      <div>
        <div className="p-4 flex flex-col gap-0">
          <div className="overflow-auto max-h-[calc(100vh-20rem)] min-h-[320px] border border-gray-200 rounded-lg">
            <Table>
              <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <TableRow className="hover:bg-transparent border-none h-11">
                  <TableHead className="w-[100px] font-medium text-gray-500">操作人</TableHead>
                  <TableHead className="w-[120px] font-medium text-gray-500">操作范围</TableHead>
                  <TableHead className="w-[120px] font-medium text-gray-500">操作对象</TableHead>
                  <TableHead className="w-[80px] font-medium text-gray-500">操作类型</TableHead>
                  <TableHead className="min-w-[180px] font-medium text-gray-500">操作名称</TableHead>
                  <TableHead className="w-[90px] font-medium text-gray-500 text-center">执行结果</TableHead>
                  <TableHead className="w-[160px] font-medium text-gray-500">操作时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody key={`log-tbody-${list.length}-${list[0]?.id ?? ''}`}>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                        加载中...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      暂无日志，可调整筛选条件后重试
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((row, index) => {
                    const resultLabel = getOperationResultLabel(row);
                    const isSuccess = resultLabel === '成功';
                    const isFailed = resultLabel === '失败';
                    return (
                      <TableRow
                        key={row.id || `log-${index}`}
                        className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11"
                      >
                        <TableCell className="font-medium text-gray-900">{row.userName || '-'}</TableCell>
                        <TableCell title={`${row.organizationName || ''}${row.projectName ? `/${row.projectName}` : ''}`}>
                          <span className="truncate block max-w-[120px] text-gray-700">
                            {row.organizationId === 'SYSTEM'
                              ? '系统'
                              : `${row.organizationName || ''}${row.projectName ? `/${row.projectName}` : ''}` || '-'}
                          </span>
                        </TableCell>
                        <TableCell title={row.module} className="max-w-[120px] truncate text-gray-700">
                          {row.module || '-'}
                        </TableCell>
                        <TableCell className="text-gray-700">{getTypeLabel(row.type || '')}</TableCell>
                        <TableCell title={row.content} className="max-w-[280px] truncate text-gray-700">
                          {row.content || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            title={resultLabel}
                            className={cn(
                              'inline-flex items-center justify-center min-w-[52px] px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap',
                              isSuccess && 'bg-emerald-50 text-emerald-700',
                              isFailed && 'bg-red-50 text-red-700',
                              resultLabel === '无' && 'bg-gray-100 text-gray-400',
                              !isSuccess && !isFailed && resultLabel !== '无' && 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {resultLabel}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-gray-600">
                          {formatLogTime(row.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <UnifiedPagination
            total={total}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            unitLabel="条"
            hideWhenEmpty={false}
            className="border-t border-gray-100"
          />
        </div>
      </div>
    </div >
  );
}
