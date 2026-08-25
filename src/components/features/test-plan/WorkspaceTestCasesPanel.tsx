import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  qualityWorkspaceService,
  type QualityAnalysis,
  type QualityAnalysisItem,
  type QualityTask,
  type QualityWorkItem,
} from '@/services/quality-workspace';
import { cn } from '@/utils/cn';

interface WorkspaceTestCasesPanelProps {
  workspaceId: string;
  projectId: string;
  canEdit?: boolean;
  onGenerated?: () => void;
  onGoDocument?: () => void;
  onGoExecution?: () => void;
}

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

const SECTION_LABEL: Record<string, string> = {
  OVERVIEW: '概述',
  REQUIREMENT_ANALYSIS: '需求分析',
  FUNCTIONAL_TEST: '功能测试',
  NON_FUNCTIONAL: '非功能',
  REGRESSION: '回归',
  JOINT_CASE: '联调',
};

const TASK_TYPE_LABEL: Record<string, string> = {
  FUNCTIONAL_CHECK: '功能检查',
  REGRESSION: '回归测试',
  SPECIAL_TEST: '专项测试',
  JOINT_DEBUG: '联调 CASE',
  RELEASE_CHECK: '准出检查',
  SMOKE: '冒烟',
};

const RESULT_LABEL: Record<string, string> = {
  PASS: '通过',
  FAIL: '失败',
  BLOCKED: '阻塞',
  SKIPPED: '跳过',
};

function extractRecords(res: any): any[] {
  const data = unwrap<any>(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

interface GeneratedCaseRow extends QualityWorkItem {
  taskType?: string;
  taskTitle?: string;
}

export function WorkspaceTestCasesPanel({
  workspaceId,
  projectId,
  canEdit = true,
  onGenerated,
  onGoDocument,
  onGoExecution,
}: WorkspaceTestCasesPanelProps) {
  const [analysis, setAnalysis] = useState<QualityAnalysis | null>(null);
  const [cases, setCases] = useState<GeneratedCaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadAll = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const analysisRes = unwrap<QualityAnalysis>(await qualityWorkspaceService.getAnalysis(workspaceId));
      setAnalysis(analysisRes);

      const tasks = unwrap<QualityTask[]>(await qualityWorkspaceService.getTaskList(workspaceId)) || [];
      const executableTasks = tasks.filter((task) => !['ANALYSIS', 'REVIEW'].includes(task.taskType));
      const rows: GeneratedCaseRow[] = [];
      for (const task of executableTasks) {
        const res = await qualityWorkspaceService.getWorkItemPage({
          workspaceId,
          taskId: task.taskId,
          projectId,
          current: 1,
          pageSize: 100,
        });
        extractRecords(res).forEach((item) => {
          rows.push({
            ...item,
            taskId: item.taskId || task.taskId,
            taskType: task.taskType,
            taskTitle: task.title,
          });
        });
      }
      setCases(rows);
    } catch (error) {
      console.error(error);
      toast.error('加载测试用例失败');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sourcePoints = analysis?.items || [];
  const pendingPoints = sourcePoints.filter((item) => item.selected !== false && !item.workItemId);

  const generateFromAnalysis = async () => {
    if (!analysis?.analysisId) return;
    if (!sourcePoints.length) {
      toast.warning('请先在测试分析文档中补充测试点');
      onGoDocument?.();
      return;
    }
    if (!pendingPoints.length) {
      toast.info('所有测试点已生成用例');
      return;
    }
    setGenerating(true);
    try {
      const created = unwrap<string[]>(
        await qualityWorkspaceService.generateAnalysisCheckItems(workspaceId, analysis.analysisId, {
          itemIds: pendingPoints.map((item) => item.itemId!).filter(Boolean),
        })
      );
      toast.success(`已从分析文档生成 ${created.length} 条测试用例`);
      await loadAll();
      onGenerated?.();
    } catch (error: any) {
      toast.error(error?.message || '生成用例失败');
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !analysis) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F7F8FB]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[#F7F8FB] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <Card className="rounded-[28px] border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-2 rounded-md bg-violet-50 text-violet-700">步骤 2 · 测试用例</Badge>
              <h2 className="text-xl font-black text-slate-900">从测试分析生成可执行用例</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                分析文档里的测试点，在这里一键生成为可执行用例。生成后进入「联合评审」，与研发对照需求、分析、用例一起确认。
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" className="rounded-xl font-black" onClick={onGoDocument}>
                <BookOpen className="mr-2 h-4 w-4" />
                编辑分析文档
              </Button>
              <Button
                className="rounded-xl bg-violet-600 font-black hover:bg-violet-700"
                disabled={!canEdit || generating || pendingPoints.length === 0}
                onClick={generateFromAnalysis}
              >
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                从分析生成用例{pendingPoints.length ? ` (${pendingPoints.length})` : ''}
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Card className="rounded-[24px] border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black text-slate-900">分析文档中的测试点</h3>
            <p className="mt-1 text-xs text-slate-500">这些是生成用例的来源，不是最终可执行用例。</p>
            <div className="mt-4 space-y-2">
              {sourcePoints.length ? sourcePoints.map((item) => (
                <SourcePointRow key={item.itemId} item={item} />
              )) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  还没有测试点，请回到「测试分析」文档末尾的测试点清单添加。
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-[24px] border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">已生成的测试用例</h3>
                <p className="mt-1 text-xs text-slate-500">共 {cases.length} 条，可在「评审执行」中分配与执行。</p>
              </div>
              {cases.length > 0 && onGoExecution && (
                <Button variant="ghost" size="sm" className="rounded-lg text-blue-600" onClick={onGoExecution}>
                  去评审执行
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
            {cases.length ? (
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                    <tr>
                      <th className="px-3 py-2">用例</th>
                      <th className="px-3 py-2">任务</th>
                      <th className="px-3 py-2">结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((item) => (
                      <tr key={item.workItemId} className="border-t border-slate-100">
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-900">{item.title || '未命名'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          {TASK_TYPE_LABEL[item.taskType || ''] || item.taskTitle || item.taskType || '-'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="rounded-md text-[10px]">
                            {item.result ? (RESULT_LABEL[item.result] || item.result) : (item.status || '待执行')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <BookOpen className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">尚未生成用例</p>
                <p className="mt-1 text-xs text-slate-500">点击上方「从分析生成用例」后，这里会展示可执行用例列表。</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function SourcePointRow({ item }: { item: QualityAnalysisItem }) {
  const generated = !!item.workItemId;
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5', generated ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-100')}>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-slate-900">{item.title}</div>
        <div className="text-[11px] text-slate-400">{SECTION_LABEL[item.sectionKey] || item.sectionKey}</div>
      </div>
      {generated ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <CircleDashed className="h-4 w-4 shrink-0 text-slate-300" />
      )}
    </div>
  );
}
