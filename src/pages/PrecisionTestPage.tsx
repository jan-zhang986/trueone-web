/**
 * 精准测试/覆盖率页面
 * 接入 spotter-jacoco：报告列表 aggregateReportList、生成报告 aggregateReport
 * 样式参考行业通用覆盖率平台（Codecov / JaCoCo / SonarQube）
 */

import { useState, useCallback, useEffect } from 'react';
import {
  BarChart3,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Loader2,
  Server,
  FileBarChart,
  Percent,
  GitBranch,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { aggregateReportList, aggregateReport, triggerUnitCover, createServiceExclude, serviceExcludeList } from '@/services/coverageJacocoService';
import type {
  CoverageReportListItem,
  CoverageRequestStatus,
  AggregateReportParams,
  TriggerUnitCoverParams,
  ServiceExcludeListItem,
  ServiceExcludeRuleType,
} from '@/types/coverageJacoco';

/** 默认报告时间范围：当前日期往前 7 天，起始 00:00:00，结束 23:59:59（本地时间，格式 YYYY-MM-DD HH:mm:ss） */
function getDefaultReportRange(): { reportStart: string; reportEnd: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { reportStart: fmt(start), reportEnd: fmt(end) };
}

/** 当前项目 ID（来自 localStorage.currentProjectId；为空时不传，让后端自行兜底） */
function getCurrentProjectId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('currentProjectId') || '';
}

/** 当前用户（优先用户名 currentuser，其次邮箱 currentemail） */
function getCurrentUserIdentifier(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('currentuser') ||
    localStorage.getItem('currentemail') ||
    ''
  );
}

/** 新建报告表单状态（环境用字符串便于输入逗号，提交时再解析为数组） */
type CreateFormState = Omit<AggregateReportParams, 'env'> & { env: string };


function statusBadge(status: CoverageRequestStatus, errMsg?: string) {
  const statusConfig: Record<
    CoverageRequestStatus,
    { className: string; label: string }
  > = {
    [-1]: {
      className: 'bg-rose-50 text-rose-700 border-rose-100',
      label: '异常',
    },
    0: { className: 'bg-slate-50 text-slate-600 border-slate-200', label: '运行中' },
    1: { className: 'bg-blue-50 text-blue-600 border-blue-100', label: '运行中' },
    2: { className: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: '运行中' },
    3: { className: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: '成功' },
  };
  const c = statusConfig[status] ?? statusConfig[0];
  return (
    <Badge variant="outline" className={cn("font-medium px-2 py-0.5 rounded-md", c.className)} title={status === -1 ? errMsg : undefined}>
      {c.label}
    </Badge>
  );
}

/** 表格内覆盖率单元格：进度条 + 百分比 */
function CoverageCell({ value, pctOnly }: { value: number; pctOnly?: boolean }) {
  if (value < 0) return <span className="text-gray-400 font-mono">-</span>;
  const pct = Math.round(value);

  const getStyles = (p: number) => {
    if (p < 30) return { bar: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]', text: 'text-rose-600' };
    if (p < 60) return { bar: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]', text: 'text-amber-600' };
    if (p < 85) return { bar: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]', text: 'text-blue-600' };
    return { bar: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]', text: 'text-emerald-600' };
  };

  const { bar, text } = getStyles(pct);

  return (
    <div className={cn("flex items-center gap-2", pctOnly ? "min-w-[80px]" : "min-w-[120px]")}>
      <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden ring-1 ring-inset ring-gray-900/5">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-in-out', bar)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className={cn('tabular-nums font-bold shrink-0 text-[10px] tracking-tight', text, pctOnly ? "w-[42px]" : "w-[54px]")}>
        {pctOnly ? `${pct}%` : `${value.toFixed(2)}%`}
      </span>
    </div>
  );
}

/** 格式化日期时间：short 为精简版 */
function formatDateTime(dateStr: string, mode?: 'short') {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  if (mode === 'short') {
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

/** 
 * 解析环境字段：支持数组、JSON 字符串数组、逗号分隔字符串
 * 针对用户反馈的 "[\"dev\", \"test\"]" 这种 JSON 字符串进行特殊处理
 */
function parseEnv(env: any): string[] {
  if (!env) return [];
  if (Array.isArray(env)) return env;
  
  const str = String(env).trim();
  if (!str) return [];

  // 1. 尝试 JSON 解析（处理 "[\"dev\", \"test\"]"）
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {
      // 解析失败则跳过，进入下一种解析
    }
  }

  // 2. 尝试按逗号/分号分割
  return str.split(/[,，;]/).map(s => s.trim()).filter(Boolean);
}

export function PrecisionTestPage() {
  const [list, setList] = useState<CoverageReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [serviceCode, setServiceCode] = useState('');
  // 报告类型/来源：null 表示「全部」
  const [reportType, setReportType] = useState<number | null>(null);
  const [fromSource, setFromSource] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [total, setTotal] = useState(0);
  const [projectId] = useState<string>(() => getCurrentProjectId());
  const [createUser] = useState<string>(() => getCurrentUserIdentifier());

  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<'iteration' | 'unit'>('iteration');
  const [createLoading, setCreateLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReportUrl, setDetailReportUrl] = useState<string | null>(null);
  
  // 抽屉宽度拖拽状态
  const [sheetWidth, setSheetWidth] = useState(50); // 百分比宽度
  const [isResizing, setIsResizing] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(() => ({
    serviceCode: '',
    env: '',
    ...getDefaultReportRange(),
    gitUrl: '',
    baseVersion: '',
    nowVersion: '',
    type: 2,
  }));
  const [unitForm, setUnitForm] = useState<TriggerUnitCoverParams>({
    serviceCode: '',
    uuid: '',
    type: 1,
    gitUrl: '',
    baseVersion: '',
    nowVersion: '',
  });

  // 规则配置看板
  const [ruleBoardOpen, setRuleBoardOpen] = useState(false);
  const [ruleList, setRuleList] = useState<ServiceExcludeListItem[]>([]);
  const [ruleListLoading, setRuleListLoading] = useState(false);
  const [ruleQueryServiceName, setRuleQueryServiceName] = useState('');
  const [rulePage, setRulePage] = useState(1);
  const RULE_PAGE_SIZE = 20;
  const [ruleTotal, setRuleTotal] = useState(0);
  const [ruleCreateOpen, setRuleCreateOpen] = useState(false);
  const [ruleCreateLoading, setRuleCreateLoading] = useState(false);
  const [ruleCreateForm, setRuleCreateForm] = useState({
    serviceName: '',
    excludeRule: '',
    ruleType: 1 as ServiceExcludeRuleType,
    description: '',
  });

  // 拖拽逻辑实现
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    // 计算相对于窗口的百分比宽度（从右往左）
    const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    // 限制在 30vw - 90vw 之间
    if (newWidth >= 30 && newWidth <= 90) {
      setSheetWidth(newWidth);
    }
  };

  const handlePointerUp = () => {
    setIsResizing(false);
  };

  const fetchList = useCallback(async (targetPage?: number) => {
    const currentPage = targetPage ?? page;
    setLoading(true);
    try {
      const data = await aggregateReportList({
        serviceCode: serviceCode.trim(),
        // 后端约定：null 表示「全部」
        type: reportType ?? null,
        from: fromSource ?? null,
        projectId: projectId || undefined,
        currentPage,
        pageSize: PAGE_SIZE,
      });
      setList(data.list);
      setTotal(data.total);
      setPage(currentPage);
      if (data.list.length === 0) {
        toast.info('暂无报告');
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || '获取报告列表失败';
      toast.error(msg);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [serviceCode, reportType, fromSource, page, projectId]);

  useEffect(() => {
    fetchList(1);
  }, []);

  const handleCreateReport = async () => {
    const { serviceCode: sc, env: envStr, reportStart: rs, reportEnd: re, gitUrl, baseVersion, nowVersion, type } = createForm;
    if (!sc?.trim()) {
      toast.error('请输入服务代码');
      return;
    }
    const envList = envStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (envList.length === 0) {
      toast.error('请输入环境');
      return;
    }
    if (!rs?.trim()) {
      toast.error('请输入报告开始时间');
      return;
    }
    if (!re?.trim()) {
      toast.error('请输入报告结束时间');
      return;
    }
    if (!gitUrl?.trim()) {
      toast.error('请输入 Git 仓库地址');
      return;
    }
    const reportTypeNum = type ?? 2;
    if (!nowVersion?.trim()) {
      toast.error('请输入 nowVersion');
      return;
    }
    setCreateLoading(true);
    try {
      await aggregateReport({
        serviceCode: sc.trim(),
        env: envList,
        reportStart: rs.trim(),
        reportEnd: re.trim(),
        gitUrl: gitUrl.trim(),
        baseVersion: baseVersion.trim(),
        nowVersion: nowVersion.trim(),
        type: reportTypeNum,
        projectId: projectId || undefined,
        createUser: createUser || undefined,
      });
      toast.success('报告已提交，请稍后在列表中刷新查看');
      setCreateOpen(false);
      setCreateForm({
        serviceCode: '',
        env: '',
        ...getDefaultReportRange(),
        gitUrl: '',
        baseVersion: '',
        nowVersion: '',
        type: 2,
      });
      fetchList();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || '提交失败';
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleTriggerUnitCover = async () => {
    const { serviceCode: sc, uuid, type: t, gitUrl, baseVersion, nowVersion } = unitForm;
    if (!sc?.trim()) {
      toast.error('请输入服务代码');
      return;
    }
    if (!uuid?.trim()) {
      toast.error('请输入 uuid');
      return;
    }
    if (!gitUrl?.trim()) {
      toast.error('请输入 Git 仓库地址');
      return;
    }
    if (!nowVersion?.trim()) {
      toast.error('请输入 nowVersion');
      return;
    }
    setCreateLoading(true);
    try {
      await triggerUnitCover({
        serviceCode: sc.trim(),
        uuid: uuid.trim(),
        type: t ?? 1,
        gitUrl: gitUrl.trim(),
        baseVersion: baseVersion.trim(),
        nowVersion: nowVersion.trim(),
        projectId: projectId || undefined,
        createUser: createUser || undefined,
      });
      toast.success('单元测试覆盖率已触发');
      setCreateOpen(false);
      setUnitForm({ serviceCode: '', uuid: '', type: 1, gitUrl: '', baseVersion: '', nowVersion: '' });
      fetchList();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || '触发失败';
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const fetchRuleList = useCallback(async (targetPage?: number) => {
    const currentPage = targetPage ?? rulePage;
    setRuleListLoading(true);
    try {
      const projId = projectId ? (Number(projectId) || projectId) : undefined;
      const data = await serviceExcludeList({
        serviceName: ruleQueryServiceName.trim() || undefined,
        projectId: projId,
        currentPage,
        pageSize: RULE_PAGE_SIZE,
      });
      setRuleList(data.list);
      setRuleTotal(data.total);
      setRulePage(currentPage);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || '获取规则列表失败';
      toast.error(msg);
      setRuleList([]);
      setRuleTotal(0);
    } finally {
      setRuleListLoading(false);
    }
  }, [ruleQueryServiceName, rulePage, projectId]);

  useEffect(() => {
    if (ruleBoardOpen) fetchRuleList(1);
    // 仅在看板打开时拉取第一页，不把 fetchRuleList 加入 deps 避免 rulePage 变化时重复触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleBoardOpen]);

  const handleCreateRule = async () => {
    const { serviceName, excludeRule, ruleType, description } = ruleCreateForm;
    if (!serviceName?.trim()) {
      toast.error('请输入服务名称');
      return;
    }
    if (!excludeRule?.trim()) {
      toast.error('请输入排除规则');
      return;
    }
    // 支持多行或英文逗号分隔规则
    const excludeRules = excludeRule
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (excludeRules.length === 0) {
      toast.error('请输入有效的排除规则');
      return;
    }
    setRuleCreateLoading(true);
    try {
      const projId = projectId ? (Number(projectId) || projectId) : undefined;
      await createServiceExclude({
        serviceName: serviceName.trim(),
        excludeRules,
        ruleType: ruleType ?? 1,
        description: description.trim() || undefined,
        createUser: createUser || undefined,
        projectId: projId,
        status: 1,
      });
      toast.success('规则已创建');
      setRuleCreateOpen(false);
      setRuleCreateForm({ serviceName: '', excludeRule: '', ruleType: 1, description: '' });
      fetchRuleList(rulePage);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || '创建失败';
      toast.error(msg);
    } finally {
      setRuleCreateLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="p-4 lg:p-6 min-h-screen bg-gray-50/50 space-y-4 animate-in fade-in duration-500">
          {/* 头部 */}
          <div className="flex flex-col gap-1 px-1 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-100 ring-4 ring-blue-50 shrink-0">
              </div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">代码覆盖率</h1>
            </div>
            <p className="text-sm text-gray-500 ml-[3.25rem]">基于 spotter-jacoco 的聚合报告与报告列表</p>
          </div>

          <Card className="border-none shadow-[0_30px_60px_rgba(0,0,0,0.04)] rounded-[2rem] bg-white ring-1 ring-gray-100 overflow-hidden">
            <CardContent className="p-6">
              {/* 操作与筛选区 */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <form
                  className="flex flex-wrap items-center gap-3 flex-1"
                  onSubmit={(e) => { e.preventDefault(); fetchList(1); }}
                >
                  <Input
                    className="h-9 w-[180px] rounded-lg border-gray-200"
                    placeholder="服务代码"
                    value={serviceCode}
                    onChange={(e) => setServiceCode(e.target.value)}
                  />
                  <Select
                    value={reportType === null ? 'all' : String(reportType)}
                    onValueChange={(v) => {
                      if (v === 'all') {
                        setReportType(null);
                      } else {
                        setReportType(Number(v));
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 w-[88px] rounded-lg border-gray-200">
                      <SelectValue placeholder="类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="1">全量</SelectItem>
                      <SelectItem value="2">增量</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={fromSource === null ? 'all' : String(fromSource)}
                    onValueChange={(v) => {
                      if (v === 'all') {
                        setFromSource(null);
                      } else {
                        setFromSource(Number(v));
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 w-[100px] rounded-lg border-gray-200">
                      <SelectValue placeholder="来源" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="1">单元测试</SelectItem>
                      <SelectItem value="3">迭代测试</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="h-8 w-px bg-gray-200 shrink-0" aria-hidden />
                  <Button type="submit" size="sm" className="rounded-lg h-9 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    查询
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-9"
                    onClick={() => {
                      setServiceCode('');
                      setReportType(null);
                      setFromSource(null);
                      fetchList(1);
                    }}
                  >
                    重置
                  </Button>
                </form>
                <Button
                  onClick={() => {
                    setCreateForm((prev) => ({ ...prev, ...getDefaultReportRange() }));
                    setCreateOpen(true);
                  }}
                  size="sm"
                  className="rounded-lg h-9 gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  新建报告
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-9 gap-2 border-gray-200"
                  onClick={() => setRuleBoardOpen(true)}
                >
                  <Settings2 className="h-4 w-4" />
                  规则配置看板
                </Button>
              </div>

              {/* 列表表格 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mb-4 overflow-hidden overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                <TooltipProvider>
                  <table className="w-full text-sm table-auto border-collapse">
                    <thead className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200">
                      <tr className="bg-gray-50/60 hover:bg-gray-50/60 border-b border-gray-100 h-11">
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[90px]">报告 ID</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[140px]">服务代码</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[90px]">状态</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[130px]">行覆盖率</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[130px]">分支覆盖率</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[110px]">环境</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[70px]">类型</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[200px]">版本区间</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[100px]">创建人</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[130px]">创建时间</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 min-w-[100px]">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                      {loading ? (
                        <tr className="hover:bg-transparent">
                          <td colSpan={11} className="text-center text-gray-400 py-12">
                            <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> 加载中...</span>
                          </td>
                        </tr>
                      ) : list.length === 0 ? (
                        <tr className="hover:bg-transparent">
                          <td colSpan={11} className="text-center text-gray-500 py-12">暂无数据</td>
                        </tr>
                      ) : (
                        list.map((row) => (
                          <tr 
                            key={row.reportId} 
                            className={cn(
                              "hover:bg-gray-50/50 transition-colors",
                              row.requestStatus === 3 && row.reportUrl ? "cursor-pointer" : ""
                            )}
                            onClick={() => {
                              if (row.requestStatus === 3 && row.reportUrl) {
                                setDetailReportUrl(row.reportUrl);
                                setDetailOpen(true);
                              }
                            }}
                          >
                            <td className="px-3 py-3 font-mono text-[11px] truncate">{row.reportId}</td>
                            <td className="px-3 py-3 font-medium text-gray-900 truncate">{row.serviceCode}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{statusBadge(row.requestStatus, row.errMsg)}</td>
                            <td className="px-3 py-3">
                              <CoverageCell value={row.lineCoverage} pctOnly />
                            </td>
                            <td className="px-3 py-3">
                              <CoverageCell value={row.branchCoverage} pctOnly />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {(() => {
                                  const envs = parseEnv(row.env);
                                  if (envs.length === 0) return <span className="text-gray-400">-</span>;
                                  
                                  return envs.map((e, idx) => (
                                    <Badge 
                                      key={idx} 
                                      variant="outline" 
                                      className="bg-gray-50 text-gray-600 border-gray-200 text-[10px] px-1.5 py-0 h-4 min-w-0"
                                    >
                                      {e}
                                    </Badge>
                                  ));
                                })()}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                                  row.type === 1
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : row.type === 2
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-gray-100 text-gray-600'
                                )}
                              >
                                {row.type === 1 ? '全量' : row.type === 2 ? '增量' : row.type}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className="inline-flex flex-col gap-0.5 font-mono text-[10px] leading-snug max-w-[240px]"
                                title={`base: ${row.baseVersion || '-'}\nnow: ${row.nowVersion || '-'}`}
                              >
                                <span className="block truncate">base: {row.baseVersion || '-'}</span>
                                <span className="block truncate">now: {row.nowVersion || '-'}</span>
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="max-w-[100px] truncate" title={row.createUser || '-'}>
                                {row.createUser || '-'}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-500">{formatDateTime(row.createdAt, 'short')}</td>
                            <td className="px-3 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                              {row.requestStatus === 3 && row.reportUrl ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-blue-600 hover:text-blue-700 font-medium"
                                  onClick={() => {
                                    setDetailReportUrl(row.reportUrl);
                                    setDetailOpen(true);
                                  }}
                                >
                                  查看报告
                                </Button>
                              ) : row.requestStatus === -1 && row.errMsg ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-rose-500 cursor-help underline decoration-dotted underline-offset-4">运行失败</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm break-words">
                                    {row.errMsg}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </TooltipProvider>

                <UnifiedPagination
                  total={total}
                  currentPage={page}
                  pageSize={PAGE_SIZE}
                  onPageChange={(p) => fetchList(p)}
                  unitLabel="个报告"
                  hideWhenEmpty={false}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 报告在抽屉内用 iframe 嵌入，不新开浏览器窗口 */}
      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) setDetailReportUrl(null);
          setDetailOpen(open);
        }}
      >
        <SheetContent 
          className="!h-screen !max-h-screen flex flex-col p-0 gap-0 overflow-hidden border-slate-200 transition-none"
          style={{ width: `${sheetWidth}vw`, maxWidth: `${sheetWidth}vw` }}
        >
          {/* 拖拽手柄 */}
          <div 
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-50 flex items-center justify-center group transition-colors",
              isResizing ? "bg-blue-400" : "hover:bg-blue-300/30"
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className={cn(
              "w-0.5 h-8 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors",
              isResizing && "bg-blue-600"
            )} />
          </div>

          <SheetHeader className="shrink-0 border-b border-slate-200 px-6 py-4">
            <SheetTitle className="text-slate-900">查看报告</SheetTitle>
          </SheetHeader>
          <div className={cn(
            "flex-1 min-h-0 overflow-hidden flex flex-col relative",
            isResizing && "pointer-events-none select-none" // 拖拽时屏蔽 iframe 干扰
          )}>
            {detailReportUrl ? (
              <iframe
                title="覆盖率报告"
                src={detailReportUrl}
                className="w-full flex-1 min-h-0 border-0 block"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
                暂无报告链接
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 规则配置看板 */}
      <Sheet open={ruleBoardOpen} onOpenChange={setRuleBoardOpen}>
        <SheetContent className="!w-[90vw] sm:!max-w-4xl flex flex-col p-0 gap-0 overflow-hidden border-slate-200">
          <SheetHeader className="shrink-0 border-b border-slate-200 px-6 py-4">
            <SheetTitle className="text-slate-900">规则配置看板</SheetTitle>
            <p className="text-sm text-slate-500 mt-1">服务排除规则：类文件排除、包名排除</p>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-6 gap-4">
            <form
              className="flex flex-wrap items-center gap-3"
              onSubmit={(e) => { e.preventDefault(); fetchRuleList(1); }}
            >
              <Input
                className="h-9 w-[200px] rounded-lg border-gray-200"
                placeholder="服务名称"
                value={ruleQueryServiceName}
                onChange={(e) => setRuleQueryServiceName(e.target.value)}
              />
              <Button type="submit" size="sm" className="rounded-lg h-9 bg-blue-600 hover:bg-blue-700" disabled={ruleListLoading}>
                {ruleListLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                查询
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg h-9"
                onClick={() => { setRuleQueryServiceName(''); fetchRuleList(1); }}
              >
                重置
              </Button>
              <div className="flex-1" />
              <Button
                size="sm"
                className="rounded-lg h-9 gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => setRuleCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                新建规则
              </Button>
            </form>
            <div className="rounded-xl border border-gray-100 bg-white flex flex-col max-h-[72vh]">
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full text-sm table-auto border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 min-w-[100px]">服务名称</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 min-w-[120px]">规则类型</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 min-w-[180px]">排除规则</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 min-w-[140px]">说明</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 min-w-[80px]">创建人</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 min-w-[120px]">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                  {ruleListLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-12">
                        <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> 加载中...</span>
                      </td>
                    </tr>
                  ) : ruleList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-500 py-12">暂无规则</td>
                    </tr>
                  ) : (
                    ruleList.map((row, idx) => (
                      <tr key={row.id ?? idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 font-medium text-gray-900">{row.serviceName}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            row.ruleType === 1 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                          )}>
                            {row.ruleType === 1 ? '类文件排除' : row.ruleType === 2 ? '包名排除' : row.ruleType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs truncate max-w-[200px]" title={row.excludeRule}>{row.excludeRule}</td>
                        <td className="px-3 py-2.5 text-gray-500 truncate max-w-[160px]" title={row.description}>{row.description ?? '-'}</td>
                        <td className="px-3 py-2.5">{row.createUser ?? '-'}</td>
                        <td className="px-3 py-2.5 text-gray-500">{row.createdAt ? formatDateTime(row.createdAt, 'short') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 px-4 py-2 bg-white/80 backdrop-blur sticky bottom-0">
                <UnifiedPagination
                  total={ruleTotal}
                  currentPage={rulePage}
                  pageSize={RULE_PAGE_SIZE}
                  onPageChange={(p) => fetchRuleList(p)}
                  unitLabel="条规则"
                  hideWhenEmpty={false}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 新建规则弹窗 */}
      <Dialog open={ruleCreateOpen} onOpenChange={setRuleCreateOpen}>
        <DialogContent className="max-w-lg border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">新建排除规则</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              projectId、createUser 使用当前系统与覆盖率一致
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-700">服务名称 <span className="text-red-500">*</span></Label>
              <Input
                value={ruleCreateForm.serviceName}
                onChange={(e) => setRuleCreateForm((f) => ({ ...f, serviceName: e.target.value }))}
                placeholder="如 user-center"
                className="h-9 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-700">规则类型 <span className="text-red-500">*</span></Label>
              <Select
                value={String(ruleCreateForm.ruleType)}
                onValueChange={(v) => setRuleCreateForm((f) => ({ ...f, ruleType: Number(v) as ServiceExcludeRuleType }))}
              >
                <SelectTrigger className="h-9 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">类文件排除</SelectItem>
                  <SelectItem value="2">包名排除</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-700">排除规则 <span className="text-red-500">*</span></Label>
              <Input
                value={ruleCreateForm.excludeRule}
                onChange={(e) => setRuleCreateForm((f) => ({ ...f, excludeRule: e.target.value }))}
                placeholder="用英文逗号或换行分隔，如 sun/**,com/sun/**"
                className="h-9 border-slate-200 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-700">说明（选填）</Label>
              <Input
                value={ruleCreateForm.description}
                onChange={(e) => setRuleCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="如 排除 entity 包下所有类"
                className="h-9 border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button variant="outline" onClick={() => setRuleCreateOpen(false)} className="border-slate-200">取消</Button>
            <Button onClick={handleCreateRule} disabled={ruleCreateLoading} className="bg-blue-600 hover:bg-blue-700">
              {ruleCreateLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建报告弹窗 */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreateTab('iteration'); }}>
        <DialogContent className="max-w-2xl border-slate-200 p-0 gap-0 overflow-hidden">
          <DialogHeader className="border-b border-slate-200 px-6 py-5 bg-slate-50/50">
            <DialogTitle className="text-slate-900 font-semibold">新建覆盖率报告</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-1">
              提交后将在后台生成报告，请在列表中刷新查看状态与报告链接
            </DialogDescription>
          </DialogHeader>
          <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as 'iteration' | 'unit')} className="flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="bg-slate-100 rounded-lg p-0.5 w-full max-w-[280px]">
                <TabsTrigger value="iteration" className="flex-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  迭代测试
                </TabsTrigger>
                <TabsTrigger value="unit" className="flex-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  单元测试
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
              <TabsContent value="iteration" className="mt-0">
                <div className="space-y-5">
                  <section className="space-y-4">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">基础信息</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">服务代码 <span className="text-red-500">*</span></Label>
                        <Input
                          value={createForm.serviceCode}
                          onChange={(e) => setCreateForm((f) => ({ ...f, serviceCode: e.target.value }))}
                          placeholder="请输入服务代码"
                          className="h-9 border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">环境 <span className="text-red-500">*</span></Label>
                        <Input
                          value={createForm.env}
                          onChange={(e) => setCreateForm((f) => ({ ...f, env: e.target.value }))}
                          placeholder="请输入环境，多个用英文逗号分隔，如 dev,unittest"
                          className="h-9 border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-slate-700 font-medium">报告类型 <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center space-x-2 cursor-pointer group" onClick={() => setCreateForm((f) => ({ ...f, type: 1 }))}>
                          <Checkbox 
                            id="type-full" 
                            checked={createForm.type === 1}
                            onCheckedChange={() => setCreateForm((f) => ({ ...f, type: 1 }))}
                            className="rounded-full w-5 h-5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label htmlFor="type-full" className="text-sm font-normal text-slate-600 cursor-pointer group-hover:text-blue-600 transition-colors">全量报告</Label>
                        </div>
                        <div className="flex items-center space-x-2 cursor-pointer group" onClick={() => setCreateForm((f) => ({ ...f, type: 2 }))}>
                          <Checkbox 
                            id="type-inc" 
                            checked={createForm.type === 2}
                            onCheckedChange={() => setCreateForm((f) => ({ ...f, type: 2 }))}
                            className="rounded-full w-5 h-5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label htmlFor="type-inc" className="text-sm font-normal text-slate-600 cursor-pointer group-hover:text-blue-600 transition-colors">增量报告</Label>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">报告开始 <span className="text-red-500">*</span></Label>
                        <Input
                          value={createForm.reportStart}
                          onChange={(e) => setCreateForm((f) => ({ ...f, reportStart: e.target.value }))}
                          placeholder="请输入报告开始时间"
                          className="h-9 border-slate-200 font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">报告结束 <span className="text-red-500">*</span></Label>
                        <Input
                          value={createForm.reportEnd}
                          onChange={(e) => setCreateForm((f) => ({ ...f, reportEnd: e.target.value }))}
                          placeholder="请输入报告结束时间"
                          className="h-9 border-slate-200 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </section>
                  <section className="space-y-4 pt-1 border-t border-slate-100">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">Git 与版本</h4>
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-700">Git 仓库地址 <span className="text-red-500">*</span></Label>
                      <Input
                        value={createForm.gitUrl}
                        onChange={(e) => setCreateForm((f) => ({ ...f, gitUrl: e.target.value }))}
                        placeholder="请输入 Git 仓库地址"
                        className="h-9 border-slate-200 font-mono text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-700">
                        baseVersion{createForm.type === 1 ? '（全量时选填）' : ''}
                      </Label>
                      <Input
                        value={createForm.baseVersion}
                        onChange={(e) => setCreateForm((f) => ({ ...f, baseVersion: e.target.value }))}
                        placeholder={createForm.type === 1 ? '全量时选填' : '请输入 baseVersion'}
                        className="h-9 border-slate-200 font-mono text-sm"
                      />
                    </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-700">
                          nowVersion <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={createForm.nowVersion}
                          onChange={(e) => setCreateForm((f) => ({ ...f, nowVersion: e.target.value }))}
                          placeholder="请输入 nowVersion"
                          className="h-9 border-slate-200 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </TabsContent>
              <TabsContent value="unit" className="mt-0">
                <section className="space-y-4">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">单元测试覆盖率</h4>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-700">服务代码 <span className="text-red-500">*</span></Label>
                    <Input
                      value={unitForm.serviceCode}
                      onChange={(e) => setUnitForm((f) => ({ ...f, serviceCode: e.target.value }))}
                      placeholder="请输入服务代码"
                      className="h-9 border-slate-200 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-700">uuid <span className="text-red-500">*</span></Label>
                    <Input
                      value={unitForm.uuid}
                      onChange={(e) => setUnitForm((f) => ({ ...f, uuid: e.target.value }))}
                      placeholder="请输入 uuid，如 unit-test-00013"
                      className="h-9 border-slate-200 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm text-slate-700 font-medium">报告类型</Label>
                    <div className="flex items-center space-x-2 opacity-60">
                      <Checkbox 
                        id="unit-type-full" 
                        checked={true} 
                        disabled 
                        className="rounded-full w-5 h-5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor="unit-type-full" className="text-sm font-normal text-slate-600 cursor-not-allowed">全量报告</Label>
                      <span className="text-xs text-slate-400 ml-2">（单元测试仅支持全量）</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-700">Git 仓库地址 <span className="text-red-500">*</span></Label>
                    <Input
                      value={unitForm.gitUrl}
                      onChange={(e) => setUnitForm((f) => ({ ...f, gitUrl: e.target.value }))}
                      placeholder="请输入 Git 仓库地址"
                      className="h-9 border-slate-200 font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-700">baseVersion（选填）</Label>
                      <Input
                        value={unitForm.baseVersion}
                        onChange={(e) => setUnitForm((f) => ({ ...f, baseVersion: e.target.value }))}
                        placeholder="请输入 baseVersion（可不填）"
                        className="h-9 border-slate-200 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-700">nowVersion <span className="text-red-500">*</span></Label>
                      <Input
                        value={unitForm.nowVersion}
                        onChange={(e) => setUnitForm((f) => ({ ...f, nowVersion: e.target.value }))}
                        placeholder="请输入 nowVersion"
                        className="h-9 border-slate-200 font-mono text-sm"
                      />
                    </div>
                  </div>
                </section>
              </TabsContent>
            </div>
          </Tabs>
          <DialogFooter className="border-t border-slate-200 px-6 py-4 bg-slate-50/50">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-slate-200">
              取消
            </Button>
            <Button
              onClick={createTab === 'iteration' ? handleCreateReport : handleTriggerUnitCover}
              disabled={createLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
