/**
 * 系统设置-组织-日志（迁移自 AegisOne，复用 SystemLogView 逻辑）
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw } from 'lucide-react';
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
import { orgLogService } from '@/services/setting/log';
import type { LogItem } from '@/types/setting/log';

const PAGE_SIZE = 15;

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
];

function formatLogTime(ts?: number) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN');
}

/** 从行数据中解析操作结果（兼容 status/result、大小写、数字等） */
function getOperationResultLabel(row: LogItem & Record<string, unknown>): string {
  const raw = row.status ?? row.result ?? row.operationStatus ?? row.state;
  if (raw === undefined || raw === null) return '-';
  const s = String(raw).toUpperCase();
  if (s === 'SUCCESS' || s === '1' || s === 'TRUE') return '成功';
  if (s === 'FAILED' || s === 'FAILURE' || s === '0' || s === 'FALSE') return '失败';
  return raw === true ? '成功' : raw === false ? '失败' : '-';
}

function getDefaultTimeRange(): [number, number] {
  const end = Date.now();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  return [start.getTime(), end];
}

export function OrgLogView() {
  const organizationId = typeof localStorage !== 'undefined' ? localStorage.getItem('currentOrgId') ?? '' : '';
  const [[startTime, endTime], setTimeRange] = useState<[number, number]>(getDefaultTimeRange);
  const [operUser, setOperUser] = useState('');
  const [type, setType] = useState('');
  const [content, setContent] = useState('');
  const [list, setList] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [userKeyword, setUserKeyword] = useState('');

  const loadList = useCallback(async (pageNum: number = page) => {
    if (!organizationId) {
      setList([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await orgLogService.getOrgLogList({
        current: pageNum,
        pageSize: PAGE_SIZE,
        operUser: operUser || undefined,
        type: type || undefined,
        content: content.trim() || undefined,
        startTime,
        endTime: endTime + 1000, // 含结束秒，与系统日志一致
        organizationIds: [organizationId],
        level: 'ORGANIZATION',
        keyword: '',
        filter: {},
        combine: {},
        sort: {},
        sortString: '',
        module: '',
      });
      setList(res.list ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载日志列表失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [organizationId, page, operUser, type, content, startTime, endTime]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadUserOptions = useCallback(async () => {
    if (!organizationId || !userKeyword) {
      setUserOptions([]);
      return;
    }
    try {
      const users = await orgLogService.getOrgLogUsers(organizationId, userKeyword);
      setUserOptions(users.map((u) => ({ id: u.id, name: u.name, email: u.email })));
    } catch {
      setUserOptions([]);
    }
  }, [organizationId, userKeyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUserOptions();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadUserOptions]);

  const handleSearch = () => {
    setPage(1);
    loadList(1);
  };

  const handleReset = () => {
    setOperUser('');
    setType('');
    setContent('');
    setTimeRange(getDefaultTimeRange());
    setPage(1);
    setTimeout(() => {
      loadList(1);
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="space-y-4">
          {!organizationId && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 px-4 py-3 text-sm">
              当前未选择组织，无法查询组织日志。请点击顶部导航栏的组织名称选择组织后再试。
            </div>
          )}
          <div className={`rounded-lg border border-border/60 bg-muted/20 p-4 ${!organizationId ? 'opacity-60 pointer-events-none' : ''}`}>
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">查询条件</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">操作用户</Label>
                <Select value={operUser || 'all'} onValueChange={(v) => setOperUser(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="请选择操作用户" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {userOptions.filter(u => u.id).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} {u.email && `(${u.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="搜索用户"
                  value={userKeyword}
                  onChange={(e) => setUserKeyword(e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">操作类型</Label>
                <Select value={type || 'all'} onValueChange={(v) => setType(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {OPERATE_TYPE_OPTIONS.filter(opt => opt.value !== 'all').map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">操作名称</Label>
                <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="请输入操作名称" maxLength={255} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">操作时间</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    className="flex-1 h-9 text-sm"
                    value={startTime ? new Date(startTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      const ts = e.target.value ? new Date(e.target.value).getTime() : 0;
                      setTimeRange([ts, endTime]);
                    }}
                  />
                  <span className="text-muted-foreground text-xs shrink-0">至</span>
                  <Input
                    type="datetime-local"
                    className="flex-1 h-9 text-sm"
                    value={endTime ? new Date(endTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      const ts = e.target.value ? new Date(e.target.value).getTime() : Date.now();
                      setTimeRange([startTime, ts]);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-3 mt-1 border-t border-border/60">
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Search className="h-4 w-4 mr-2" /> 查询
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" /> 重置
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="p-0">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
          <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
            <TableRow className="hover:bg-transparent border-none h-11">
              <TableHead className="font-medium text-gray-500">操作时间</TableHead>
              <TableHead className="font-medium text-gray-500">操作用户</TableHead>
              <TableHead className="font-medium text-gray-500">操作类型</TableHead>
              <TableHead className="font-medium text-gray-500">操作名称</TableHead>
              <TableHead className="font-medium text-gray-500">操作对象</TableHead>
              <TableHead className="font-medium text-gray-500">操作结果</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody key={`org-log-tbody-${list.length}-${list[0]?.id ?? ''}`}>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {organizationId ? '暂无日志' : '请先选择组织'}
                </TableCell>
              </TableRow>
            ) : (
              list.map((row, index) => (
                <TableRow key={row.id || `log-${index}`} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-200 h-11">
                  <TableCell className="whitespace-nowrap">{formatLogTime(row.createdAt)}</TableCell>
                  <TableCell>{row.userName ?? '-'}</TableCell>
                  <TableCell>{row.type ?? '-'}</TableCell>
                  <TableCell>{row.content ?? '-'}</TableCell>
                  <TableCell>{row.module ?? '-'}</TableCell>
                  <TableCell>{getOperationResultLabel(row as LogItem & Record<string, unknown>)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
          </div>
        </div>
        {total > PAGE_SIZE && (
          <div className="flex justify-between items-center border-t px-6 py-4 bg-muted/30">
            <div className="text-sm text-muted-foreground">
              共 <span className="font-medium text-foreground">{total}</span> 条记录
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
              <Button variant="outline" size="sm" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
