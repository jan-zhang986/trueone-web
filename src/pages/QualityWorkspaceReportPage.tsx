/**
 * QualityWorkspace 报告资产页。
 * 列表、详情、导出均读取 quality_report 快照，不再把实时工作台聚合直接当成报告。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { qualityWorkspaceService, type QualityReport } from '@/services/quality-workspace';
import { cn } from '@/utils/cn';

interface QualityWorkspaceReportPageProps {
  onViewReport?: (reportId: string) => void;
}

interface QualityWorkspaceReportDetailPageProps {
  workspaceId: string;
  onBack?: () => void;
}

interface WorkspaceOption {
  workspaceId: string;
  name: string;
  targetName?: string;
}

const REPORT_TYPE_META: Record<string, { label: string; className: string }> = {
  OVERVIEW: { label: '总览报告', className: 'bg-slate-900 text-white' },
  STAGE: { label: '阶段报告', className: 'bg-blue-100 text-blue-700' },
};

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T;
}

function unwrapList(res: any) {
  const data = res?.data ?? res;
  const list = data?.list ?? data?.records ?? data?.items ?? data?.data ?? data;
  return {
    list: Array.isArray(list) ? list : [],
    total: data?.total ?? data?.totalCount ?? (Array.isArray(list) ? list.length : 0),
  };
}

function formatDate(value?: number | string) {
  if (!value) return '未设置';
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? '未设置' : date.toLocaleString();
}

function summaryOf(report?: QualityReport) {
  const summary = report?.snapshotJson?.summary || {};
  return {
    total: Number(summary.total || 0),
    executed: Number(summary.executed || 0),
    passed: Number(summary.passed || 0),
    failed: Number(summary.failed || 0),
    blocked: Number(summary.blocked || 0),
    risks: Number(summary.risks || 0),
    evidence: Number(summary.evidence || 0),
    executionRate: Math.round(Number(summary.executionRate || 0) * 100),
    passRate: Math.round(Number(summary.passRate || 0) * 100),
  };
}

function workspaceNameOf(report?: QualityReport) {
  return report?.snapshotJson?.workspace?.name || report?.metadata?.workspaceName || report?.workspaceId || '-';
}

function taskNameOf(report?: QualityReport) {
  return report?.snapshotJson?.task?.title || report?.taskId || '-';
}

function typeMeta(type?: string) {
  return REPORT_TYPE_META[type || ''] || { label: type || '报告', className: 'bg-slate-100 text-slate-700' };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function MetricCard({ label, value, tone = 'slate' }: { label: string; value: number | string; tone?: 'slate' | 'emerald' | 'rose' | 'amber' | 'blue' }) {
  const toneClass = {
    slate: 'border-slate-200 bg-white text-slate-800',
    emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
    rose: 'border-rose-100 bg-rose-50/70 text-rose-700',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
    blue: 'border-blue-100 bg-blue-50/70 text-blue-700',
  }[tone];
  return (
    <Card className={cn('rounded-3xl p-5 shadow-sm', toneClass)}>
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-1 text-xs font-bold opacity-70">{label}</div>
    </Card>
  );
}

export function QualityWorkspaceReportPage({ onViewReport }: QualityWorkspaceReportPageProps) {
  const [projectId] = useState(() => localStorage.getItem('currentProjectId') || 'default-project');
  const [keyword, setKeyword] = useState('');
  const [reportType, setReportType] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<QualityReport[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qualityWorkspaceService.getReportPage({
        projectId,
        current: 1,
        pageSize: 50,
        keyword: keyword || undefined,
        reportType: reportType === 'ALL' ? undefined : reportType,
        latest: true,
      });
      setReports(unwrapList(res).list.map((item: any) => ({ ...item, reportId: item.reportId || item.id })));
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '加载质量报告失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, projectId, reportType]);

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await qualityWorkspaceService.getWorkspaceList({ projectId, current: 1, pageSize: 100 });
      const list = unwrapList(res).list.map((item: any) => ({
        workspaceId: item.workspaceId || item.id,
        name: item.name || item.targetName || '未命名工作台',
        targetName: item.targetName,
      }));
      setWorkspaces(list);
      setSelectedWorkspaceId((current) => current || list[0]?.workspaceId || '');
    } catch (error) {
      console.error(error);
    }
  }, [projectId]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const totals = useMemo(() => reports.reduce(
    (acc, report) => {
      const summary = summaryOf(report);
      acc.reports += 1;
      acc.risks += summary.risks;
      acc.evidence += summary.evidence;
      acc.executed += summary.executed;
      acc.total += summary.total;
      acc.passed += summary.passed;
      return acc;
    },
    { reports: 0, risks: 0, evidence: 0, executed: 0, total: 0, passed: 0 }
  ), [reports]);

  const generateOverview = async () => {
    if (!selectedWorkspaceId) {
      toast.warning('请先选择一个质量工作台');
      return;
    }
    setGenerating(true);
    try {
      const report = unwrap<QualityReport>(await qualityWorkspaceService.generateReport(selectedWorkspaceId, { reportType: 'OVERVIEW' }));
      toast.success('质量总览报告已生成');
      await loadReports();
      if (report?.reportId) {
        onViewReport?.(report.reportId);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '生成质量报告失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fb]">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-950">质量报告</h1>
              <p className="mt-1 text-sm text-slate-500">沉淀质量工作台快照，支持阶段留痕、项目内分享和 Markdown 导出。</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
              <SelectTrigger className="h-11 min-w-[260px] rounded-2xl bg-white">
                <SelectValue placeholder="选择质量工作台" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.workspaceId} value={workspace.workspaceId}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="rounded-2xl bg-slate-900 font-black text-white hover:bg-slate-800" onClick={generateOverview} disabled={generating || !selectedWorkspaceId}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              生成总览报告
            </Button>
            <Button variant="outline" className="rounded-2xl bg-white" onClick={loadReports} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              刷新
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <MetricCard label="最新报告" value={totals.reports} />
          <MetricCard label="执行项" value={totals.total} tone="blue" />
          <MetricCard label="已执行" value={totals.executed} tone="emerald" />
          <MetricCard label="风险项" value={totals.risks} tone={totals.risks ? 'rose' : 'slate'} />
          <MetricCard label="证据附件" value={totals.evidence} tone="amber" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-6">
        <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') loadReports(); }}
              className="h-11 rounded-2xl border-slate-200 pl-10"
              placeholder="搜索报告名称"
            />
          </div>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="h-11 w-[180px] rounded-2xl bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部类型</SelectItem>
              <SelectItem value="OVERVIEW">总览报告</SelectItem>
              <SelectItem value="STAGE">阶段报告</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="min-h-0 flex-1 pr-2">
          {loading ? (
            <div className="flex h-80 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在加载质量报告资产
            </div>
          ) : reports.length ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {reports.map((report) => {
                const summary = summaryOf(report);
                const meta = typeMeta(report.reportType);
                return (
                  <Card key={report.reportId} className="rounded-[28px] border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn('rounded-lg font-bold', meta.className)}>{meta.label}</Badge>
                          <Badge variant="outline" className="rounded-lg bg-slate-50 font-bold">v{report.versionNo || 1}</Badge>
                          {report.latest ? <Badge className="rounded-lg bg-emerald-100 font-bold text-emerald-700">最新</Badge> : null}
                        </div>
                        <h3 className="mt-3 truncate text-xl font-black text-slate-950">{report.name}</h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                          {workspaceNameOf(report)}{report.reportType === 'STAGE' ? ` · ${taskNameOf(report)}` : ''}
                        </p>
                      </div>
                      <Button className="rounded-2xl bg-slate-900 font-black text-white hover:bg-slate-800" onClick={() => onViewReport?.(report.reportId)}>
                        查看报告
                      </Button>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-2xl font-black text-slate-900">{summary.total}</div>
                        <div className="text-xs font-bold text-slate-400">执行项</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-2xl font-black text-emerald-700">{summary.passRate}%</div>
                        <div className="text-xs font-bold text-slate-400">通过率</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-2xl font-black text-rose-700">{summary.risks}</div>
                        <div className="text-xs font-bold text-slate-400">风险</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-2xl font-black text-amber-700">{summary.evidence}</div>
                        <div className="text-xs font-bold text-slate-400">证据</div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(report.createTime)}</span>
                      <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />执行进度 {summary.executionRate}%</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center">
              <div className="text-xl font-black text-slate-950">暂无质量报告资产</div>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                完成质量任务会自动生成阶段报告和最新总览，也可以手动选择工作台生成总览报告。
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export function QualityWorkspaceReportDetailPage({ workspaceId: reportId, onBack }: QualityWorkspaceReportDetailPageProps) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      setReport(unwrap<QualityReport>(await qualityWorkspaceService.getReportDetail(reportId)));
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '加载质量报告详情失败');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    load();
  }, [load]);

  const exportMarkdown = async () => {
    if (!report?.reportId) return;
    setExporting(true);
    try {
      const res = await qualityWorkspaceService.exportReportMarkdown(report.reportId);
      const blob = res instanceof Blob ? res : new Blob([String(res || report.markdownContent || '')], { type: 'text/markdown;charset=utf-8' });
      downloadBlob(blob, `${report.name || report.reportId}.md`.replace(/[\\/:*?"<>|]/g, '-'));
      toast.success('Markdown 已导出');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '导出 Markdown 失败');
    } finally {
      setExporting(false);
    }
  };

  const copyProjectLink = async () => {
    if (!report?.reportId) return;
    const url = `${window.location.origin}/quality-workspace?menu=quality-workspace&tab=test-report&reportId=${encodeURIComponent(report.reportId)}`;
    await navigator.clipboard.writeText(url);
    toast.success('项目内报告链接已复制');
  };

  if (loading && !report) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f7f8fb] text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在加载质量报告
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#f7f8fb] text-center">
        <FileText className="mb-4 h-10 w-10 text-slate-300" />
        <div className="text-xl font-black text-slate-900">未找到质量报告</div>
        <Button className="mt-5 rounded-2xl" variant="outline" onClick={onBack}>返回列表</Button>
      </div>
    );
  }

  const summary = summaryOf(report);
  const meta = typeMeta(report.reportType);
  const tasks = Array.isArray(report.snapshotJson?.tasks) ? report.snapshotJson.tasks : [];
  const risks = Array.isArray(report.snapshotJson?.risks) ? report.snapshotJson.risks : [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fb]">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Button variant="ghost" className="mb-3 -ml-3 rounded-xl text-slate-500" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回质量报告
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('rounded-lg font-bold', meta.className)}>{meta.label}</Badge>
              <Badge variant="outline" className="rounded-lg bg-slate-50 font-bold">v{report.versionNo || 1}</Badge>
              {report.latest ? <Badge className="rounded-lg bg-emerald-100 font-bold text-emerald-700">最新版本</Badge> : null}
            </div>
            <h1 className="mt-3 truncate text-3xl font-black text-slate-950">{report.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {workspaceNameOf(report)} · 生成于 {formatDate(report.createTime)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-2xl bg-white" onClick={copyProjectLink}>
              <Copy className="mr-2 h-4 w-4" />
              复制项目内链接
            </Button>
            <Button className="rounded-2xl bg-slate-900 font-black text-white hover:bg-slate-800" onClick={exportMarkdown} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              导出 Markdown
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 p-6">
        <div className="grid gap-4 md:grid-cols-5">
          <MetricCard label="执行项" value={summary.total} tone="blue" />
          <MetricCard label="执行进度" value={`${summary.executionRate}%`} tone="emerald" />
          <MetricCard label="通过率" value={`${summary.passRate}%`} tone="emerald" />
          <MetricCard label="风险项" value={summary.risks} tone={summary.risks ? 'rose' : 'slate'} />
          <MetricCard label="证据附件" value={summary.evidence} tone="amber" />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_430px]">
          <Card className="rounded-[32px] border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-950">质量任务快照</h2>
              <Badge variant="outline" className="rounded-lg bg-slate-50 font-bold">{tasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {tasks.length ? tasks.map((task: any) => {
                const taskSummary = task.summary || {};
                return (
                  <div key={task.taskId || task.title} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-slate-900">{task.title || '未命名任务'}</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">{task.taskType || '-'} · {task.status || '-'}</div>
                      </div>
                      <Badge className="rounded-lg bg-slate-900 font-bold text-white">{Math.round(Number(taskSummary.executionRate || 0) * 100)}%</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-bold">
                      <div className="rounded-2xl bg-white p-3"><div className="text-lg font-black text-slate-900">{taskSummary.total || 0}</div>执行项</div>
                      <div className="rounded-2xl bg-white p-3"><div className="text-lg font-black text-emerald-700">{taskSummary.passed || 0}</div>通过</div>
                      <div className="rounded-2xl bg-white p-3"><div className="text-lg font-black text-rose-700">{taskSummary.failed || 0}</div>失败</div>
                      <div className="rounded-2xl bg-white p-3"><div className="text-lg font-black text-amber-700">{taskSummary.blocked || 0}</div>阻塞</div>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">报告快照中暂无任务</div>
              )}
            </div>
          </Card>

          <Card className="rounded-[32px] border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-950">风险证据快照</h2>
              <Badge variant="outline" className="rounded-lg bg-slate-50 font-bold">{risks.length}</Badge>
            </div>
            <div className="space-y-3">
              {risks.length ? risks.slice(0, 12).map((risk: any) => (
                <div key={risk.workItemId || risk.title} className="rounded-3xl border border-rose-100 bg-rose-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-900">{risk.title || '未命名执行项'}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">执行人 {risk.assigneeId || '未分派'} · 证据 {risk.evidenceCount || 0}</div>
                    </div>
                    <Badge className="rounded-lg bg-rose-100 font-bold text-rose-700">{risk.result || risk.status || 'RISK'}</Badge>
                  </div>
                </div>
              )) : (
                <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                  <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
                  暂无失败或阻塞风险
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className="mt-6 rounded-[32px] border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-slate-500" />
            <h2 className="text-xl font-black text-slate-950">Markdown 快照</h2>
          </div>
          <pre className="max-h-[520px] overflow-auto rounded-3xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">
            {report.markdownContent || '暂无 Markdown 内容'}
          </pre>
        </Card>
      </ScrollArea>
    </div>
  );
}
