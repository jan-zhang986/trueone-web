/**
 * 拨测管理 - 性能报告（参考设计：配置ID/URL/设备/类别/状态筛选，表格含各项得分与报告链接）
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { performanceApi } from '@/services/dial-management';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 20;

/** 性能报告页 base（报告在 spotter-e2e 的 temp_report 下，按 task_id 拼接） */
const REPORT_BASE_URL = import.meta.env.VITE_PERF_REPORT_BASE_URL || 'https://spotter-e2e.spotter.ink';

/** 根据 task_id 生成报告链接：{base}/temp_report/task_{task_id}/lhreport.report.html */
function buildReportUrl(taskId: string | number | undefined | null): string | null {
  if (taskId === undefined || taskId === null || taskId === '') return null;
  const id = String(taskId).trim();
  if (!id) return null;
  const base = REPORT_BASE_URL.replace(/\/$/, '');
  return `${base}/temp_report/task_${id}/lhreport.report.html`;
}

const DEVICE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'desktop', label: 'desktop' },
  { value: 'mobile', label: 'mobile' },
] as const;

const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'performance', label: 'performance' },
  { value: 'accessibility', label: 'accessibility' },
  { value: 'best-practice', label: 'best-practice' },
  { value: 'seo', label: 'seo' },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'Passed', label: 'Passed' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Processing', label: 'Processing' },
] as const;

/**
 * 得分徽章（与原项目一致：后端为 0-1 小数，展示时 *100 取整；若已是 0-100 则直接展示）
 * 颜色：<50 红，50-89 黄橙，>=90 绿
 */
function ScoreBadge({ value }: { value: unknown }) {
  const raw = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  const n = Number.isFinite(raw)
    ? raw > 0 && raw <= 1
      ? Math.round(raw * 100)
      : Math.round(raw)
    : NaN;
  const str = Number.isFinite(n) ? String(n) : String(value ?? '-');
  const style = Number.isFinite(n)
    ? n < 50
      ? 'bg-red-100 text-red-700'
      : n < 90
        ? 'bg-amber-100 text-amber-800'
        : 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-600';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', style)}>
      {str}
    </span>
  );
}

/** 状态徽章：Passed 绿，其余灰 */
function StatusBadge({ value }: { value: unknown }) {
  const s = String(value ?? '-');
  const isPassed = /passed/i.test(s);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        isPassed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      )}
    >
      {s}
    </span>
  );
}

export function PerformanceReportView() {
  const [filters, setFilters] = useState({
    configuration_id: '',
    url: '',
    device: 'all',
    category: 'all',
    status: 'all',
  });
  const [list, setList] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReportUrl, setDetailReportUrl] = useState<string | null>(null);

  const loadList = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        current_page: p,
        page_size: PAGE_SIZE,
        currentPage: p,
        pageSize: PAGE_SIZE,
        configuration_id: filters.configuration_id || undefined,
        url: filters.url || undefined,
        device: filters.device === 'all' ? undefined : filters.device,
        categories: filters.category === 'all' ? [] : [filters.category],
        task_status: filters.status === 'all' ? undefined : filters.status,
      };
      const res = await performanceApi.reportList(params);
      const data = Array.isArray(res) ? res : (res && typeof res === 'object' && 'data' in res ? (res as any).data : []);
      const totalCount = (res && typeof res === 'object' && 'total' in res) ? (res as any).total : (res && typeof res === 'object' && 'totalNum' in res) ? (res as any).totalNum : data.length;
      setList(Array.isArray(data) ? data : []);
      setTotal(typeof totalCount === 'number' ? totalCount : 0);
      setPage(p);
    } catch (e) {
      toast.error((e as Error).message || '加载Lighthouse报告失败');
    } finally {
      setLoading(false);
    }
  }, [filters.configuration_id, filters.url, filters.device, filters.category, filters.status]);

  useEffect(() => {
    loadList(1);
  }, [loadList]);

  const onSearch = () => loadList(1);
  const onReset = () => {
    setFilters({
      configuration_id: '',
      url: '',
      device: 'all',
      category: 'all',
      status: 'all',
    });
    setPage(1);
    setTimeout(() => loadList(1), 0);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatTime = (v: unknown) => {
    if (v == null || v === '') return '-';
    const t = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN;
    if (!Number.isFinite(t)) return String(v);
    const d = new Date(t);
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
  };

  /** 从 row 中按多种可能字段名取值（含嵌套 scores.xxx、result.xxx） */
  const getRowVal = (row: Record<string, unknown>, ...keys: (string | string[])[]): unknown => {
    const flat: string[] = [];
    keys.forEach((k) => (Array.isArray(k) ? flat.push(...k) : flat.push(k)));
    for (const key of flat) {
      let v = row[key];
      if (v !== undefined && v !== null && v !== '') return v;
      const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (snake !== key) v = row[snake];
      if (v !== undefined && v !== null && v !== '') return v;
      const camel = key.replace(/_([a-z])/g, (_, x: string) => x.toUpperCase());
      if (camel !== key) v = row[camel];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    const scores = row.scores ?? row.result;
    if (scores && typeof scores === 'object' && !Array.isArray(scores)) {
      const s = scores as Record<string, unknown>;
      for (const key of flat) {
        const v = s[key] ?? s[key.replace(/([A-Z])/g, '_$1').toLowerCase()];
        if (v !== undefined && v !== null && v !== '') return v;
      }
    }
    return undefined;
  };

  const createTimeKeys = ['createdAt', 'create_time', 'createdAt', 'created_at', 'gmtCreate', 'gmt_create', 'ctime'];
  const taskIdKeys = ['task_id', 'taskId', 'id'];
  /** 与原项目一致：performance_score / accessibility_score / best_practices_score / seo_score（0-1 小数，展示时 *100） */
  const perfScoreKeys = ['performance_score', 'performanceScore', 'performance'];
  const a11yScoreKeys = ['accessibility_score', 'accessibilityScore', 'accessibility'];
  const bpScoreKeys = ['best_practices_score', 'bestPracticeScore', 'best_practice_score', 'bestPracticesScore', 'best_practice'];
  const seoScoreKeys = ['seo_score', 'seoScore', 'seo'];

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col gap-5 min-h-0">
        <form
          className="flex-shrink-0 flex flex-wrap items-end gap-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm"
          onSubmit={(e) => { e.preventDefault(); onSearch(); }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-gray-500 font-medium">配置ID</span>
            <Input
              className="h-9 w-[160px]"
              placeholder="请输入配置ID"
              value={filters.configuration_id}
              onChange={(e) => setFilters((f) => ({ ...f, configuration_id: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-gray-500 font-medium">URL</span>
            <Input
              className="h-9 w-[200px]"
              placeholder="请输入URL"
              value={filters.url}
              onChange={(e) => setFilters((f) => ({ ...f, url: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-gray-500 font-medium">设备</span>
            <Select
              value={filters.device}
              onValueChange={(v) => setFilters((f) => ({ ...f, device: v }))}
            >
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {DEVICE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-gray-500 font-medium">类别</span>
            <Select
              value={filters.category}
              onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-gray-500 font-medium">状态</span>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center gap-2">
            <Button type="submit">查询</Button>
            <Button type="button" variant="outline" onClick={onReset}>重置</Button>
          </div>
        </form>

        <div className="flex-1 flex flex-col rounded-xl border border-gray-200/80 bg-white shadow-sm min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur">
                <TableRow className="bg-transparent hover:bg-transparent">
                  <TableHead className="w-[90px]">报告ID</TableHead>
                  <TableHead className="w-[90px]">配置ID</TableHead>
                  <TableHead className="w-[100px]">应用</TableHead>
                  <TableHead className="min-w-[200px]">URL</TableHead>
                  <TableHead className="w-[90px]">设备</TableHead>
                  <TableHead className="w-[100px]">性能得分</TableHead>
                  <TableHead className="w-[110px]">无障碍功能得分</TableHead>
                  <TableHead className="w-[110px]">最佳实践得分</TableHead>
                  <TableHead className="w-[90px]">SEO得分</TableHead>
                  <TableHead className="w-[90px]">状态</TableHead>
                  <TableHead className="w-[90px]">报告</TableHead>
                  <TableHead className="w-[160px]">创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                      暂无报告
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((row, idx) => {
                    const urlStr = String(row.url ?? '');
                    return (
                      <TableRow key={(row.id as string) ?? idx}>
                        <TableCell className="font-mono text-xs">{String(row.id ?? '-')}</TableCell>
                        <TableCell className="font-mono text-xs">{String(row.configuration_id ?? row.configurationId ?? '-')}</TableCell>
                        <TableCell>{String(row.app_code ?? row.appCode ?? '-')}</TableCell>
                        <TableCell className="max-w-[280px] truncate">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">{urlStr || '-'}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md break-all">
                              {urlStr || '-'}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {String(row.device ?? '-')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ScoreBadge value={getRowVal(row, perfScoreKeys)} />
                        </TableCell>
                        <TableCell>
                          <ScoreBadge value={getRowVal(row, a11yScoreKeys)} />
                        </TableCell>
                        <TableCell>
                          <ScoreBadge value={getRowVal(row, bpScoreKeys)} />
                        </TableCell>
                        <TableCell>
                          <ScoreBadge value={getRowVal(row, seoScoreKeys)} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={row.status ?? row.task_status ?? row.taskStatus} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-primary font-medium"
                            onClick={() => {
                              const taskId = getRowVal(row, taskIdKeys);
                              const link = buildReportUrl(taskId as string | number | undefined | null);
                              setDetailReportUrl(link);
                              setDetailOpen(true);
                            }}
                          >
                            查看报告
                          </Button>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                          {formatTime(getRowVal(row, createTimeKeys))}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {total > PAGE_SIZE && (
            <div className="flex-shrink-0 flex justify-end items-center gap-2 p-4 border-t border-gray-200/80 bg-gray-50/50">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadList(page - 1)}>上一页</Button>
              <span className="text-sm text-gray-600 min-w-[80px] text-center">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadList(page + 1)}>下一页</Button>
            </div>
          )}
        </div>

        {/* 报告在抽屉内用 iframe 嵌入，不新开浏览器窗口 */}
        <Sheet open={detailOpen} onOpenChange={(open) => { if (!open) setDetailReportUrl(null); setDetailOpen(open); }}>
          <SheetContent className="!w-1/2 !max-w-[50vw] !h-screen !max-h-screen flex flex-col p-0 gap-0 overflow-hidden">
            <SheetHeader className="shrink-0 px-6 py-4 border-b border-gray-200">
              <SheetTitle>查看报告</SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {detailReportUrl ? (
                <iframe
                  title="报告"
                  src={detailReportUrl}
                  className="w-full flex-1 min-h-0 border-0 block"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-gray-500 text-sm">
                  暂无报告链接
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
