/**
 * 拨测管理 - 拨测历史（来自 spotter-aegislm plan，使用 dialing/plan API）
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';
import { dialApi } from '@/services/dial-management';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { toast } from 'sonner';
import { APP_OPTIONS } from './constants';

const PAGE_SIZE = 20;
const DIALING_TYPES = ['WEB', 'LLM-WEB', 'API', 'PLAYWRIGHT'];

/** 计划状态：与原项目一致，请求与后端用 Processing / Failure / Passed */
const PLAN_STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'Processing', label: '进行中' },
  { value: 'Failure', label: '失败' },
  { value: 'Passed', label: '通过' },
] as const;

const PLAN_STATUS_MAP: Record<string | number, string> = {
  0: '进行中',
  1: '失败',
  2: '通过',
  Processing: '进行中',
  Failure: '失败',
  Passed: '通过',
};

export function PlanView() {
  const [filters, setFilters] = useState({
    dialingType: '',
    planName: '',
    appCode: '',
    planStatus: '' as string,
  });
  const [list, setList] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadList = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        currentPage: p,
        pageSize: PAGE_SIZE,
        dialingType: filters.dialingType || undefined,
        planName: filters.planName || undefined,
        appCode: filters.appCode || undefined,
        planStatus: filters.planStatus || undefined,
      };
      const res = await dialApi.planPage(params);
      if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as any).data)) {
        setList((res as any).data);
        const totalCount = (res as any).total ?? (res as any).totalNum ?? 0;
        setTotal(totalCount);
        setPage(p);
      }
    } catch (e) {
      toast.error((e as Error).message || '加载拨测历史失败');
    } finally {
      setLoading(false);
    }
  }, [filters.dialingType, filters.planName, filters.appCode, filters.planStatus]);

  useEffect(() => {
    loadList(1);
  }, [filters.dialingType, filters.planName, filters.appCode, filters.planStatus]);

  const onSearch = () => loadList(1);
  const onReset = () => {
    setFilters({ dialingType: '', planName: '', appCode: '', planStatus: '' });
    setPage(1);
    setTimeout(() => loadList(1), 0);
  };

  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm"
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-500 font-medium">类型</span>
          <Select
            value={filters.dialingType || 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, dialingType: v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {DIALING_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-500 font-medium">名称</span>
          <Input
            className="h-9 w-[180px]"
            placeholder="请输入"
            value={filters.planName}
            onChange={(e) => setFilters((f) => ({ ...f, planName: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-500 font-medium">应用</span>
          <Select
            value={filters.appCode || 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, appCode: v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {APP_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-500 font-medium">状态</span>
          <Select
            value={filters.planStatus || 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, planStatus: v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {PLAN_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <Button type="submit">查询</Button>
          <Button type="button" variant="outline" onClick={onReset}>重置</Button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200">
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-none h-11">
              <TableHead scope="col" className="w-[100px] font-medium text-gray-500">ID</TableHead>
              <TableHead scope="col" className="min-w-[180px] font-medium text-gray-500">名称</TableHead>
              <TableHead scope="col" className="w-[100px] font-medium text-gray-500">状态</TableHead>
              <TableHead scope="col" className="w-[100px] font-medium text-gray-500">类型</TableHead>
              <TableHead scope="col" className="w-[100px] font-medium text-gray-500">应用</TableHead>
              <TableHead scope="col" className="w-[90px] font-medium text-gray-500">优先级</TableHead>
              <TableHead scope="col" className="min-w-[140px] font-medium text-gray-500">账号</TableHead>
              <TableHead scope="col" className="min-w-[160px] font-medium text-gray-500">URL</TableHead>
              <TableHead scope="col" className="min-w-[160px] font-medium text-gray-500">Actions</TableHead>
              <TableHead scope="col" className="min-w-[180px] font-medium text-gray-500">告警配置</TableHead>
              <TableHead scope="col" className="w-[160px] font-medium text-gray-500">创建时间</TableHead>
              <TableHead scope="col" className="w-[160px] font-medium text-gray-500">更新时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={12} className="text-center text-gray-400 py-12">
                  <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> 加载中...</span>
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={12} className="text-center text-gray-500 py-12">暂无数据</TableCell>
              </TableRow>
            ) : (
              list.map((row, idx) => {
                const accountFeatures = row.accountFeatures as Record<string, unknown> | undefined;
                const planActions = row.planActions as Record<string, unknown> | undefined;
                const alarmFeatures = row.alarmFeatures as Record<string, unknown> | undefined;
                const formatTime = (v: unknown) => {
                  if (v == null) return '-';
                  const t = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN;
                  return Number.isFinite(t) ? new Date(t).toLocaleString('zh-CN') : String(v);
                };
                return (
                <TableRow key={(row.id as string) ?? idx}>
                  <TableCell className="font-mono text-xs">{String(row.id ?? '-')}</TableCell>
                  <TableCell>{String(row.planName ?? '-')}</TableCell>
                  <TableCell>
                    {(() => {
                      const status = row.planStatus;
                      const label = PLAN_STATUS_MAP[String(status)] ?? PLAN_STATUS_MAP[Number(status)] ?? String(status ?? '-');
                      const isPassed = status === 2 || status === 'Passed';
                      const isFailure = status === 1 || status === 'Failure';
                      const isProcessing = status === 0 || status === 'Processing';
                      return (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            isPassed && 'bg-green-50 text-green-700',
                            isFailure && 'bg-red-50 text-red-700',
                            isProcessing && 'bg-amber-50 text-amber-700',
                            !isPassed && !isFailure && !isProcessing && 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {String(row.dialingType ?? '-')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {String(row.appCode ?? '-')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const raw = row.priority;
                      const p = typeof raw === 'string' ? Number(raw) : Number(raw);
                      const label = p === 0 ? '低' : p === 1 ? '中' : p === 2 ? '高' : '高';
                      return (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            p === 0 && 'bg-red-50 text-red-700',
                            p === 1 && 'bg-blue-50 text-blue-700',
                            (p === 2 || !Number.isFinite(p)) && 'bg-green-50 text-green-700'
                          )}
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{String(accountFeatures?.user ?? row.accountName ?? '-')}</TableCell>
                  <TableCell className="font-mono text-xs break-all">{String(row.baseUrl ?? '-')}</TableCell>
                  <TableCell className="font-mono text-xs break-all">{String(planActions?.url ?? row.planActions ?? '-')}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    <div>openId : {String(alarmFeatures?.openId ?? '-')}</div>
                    <div>通知人 : {String(alarmFeatures?.userName ?? '-')}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{formatTime(row.createdAt ?? row.createdAt)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatTime(row.updatedAt ?? row.updatedAt)}</TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <UnifiedPagination
          total={total}
          currentPage={page}
          pageSize={PAGE_SIZE}
          onPageChange={(p) => loadList(p)}
          unitLabel="条"
          hideWhenEmpty={false}
        />
      </div>
    </div>
  );
}
