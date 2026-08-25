import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  ExternalLink,
  FileText,
  FlaskConical,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  qualityWorkspaceService,
  type PrdDocNode,
  type PrdDocumentSearchHit,
  type PrdDocumentView,
  type QualityAnalysis,
  type QualityAnalysisInput,
  type QualityTask,
  type QualityWorkItem,
} from '@/services/quality-workspace';
import { cn } from '@/utils/cn';
import {
  ANALYSIS_SECTION_LABEL,
  buildWorkspaceReferenceLinks,
  filterCasesBySectionItems,
  filterItemsBySection,
  pickPrimaryReferenceUrl,
  sortAnalysisSections,
  type WorkspaceReferenceBundle,
} from './workspace-trace-utils';

import {
  buildWorkspaceDocumentMock,
  type WorkspaceDocumentMockBundle,
} from './workspace-document-mock';

interface WorkspaceLinkedDocumentsPanelProps {
  workspaceId: string;
  projectId: string;
  canEdit?: boolean;
  mode?: 'edit' | 'readonly';
  hideHeader?: boolean;
  demoMode?: boolean;
  referenceBundle?: WorkspaceReferenceBundle;
  onToggleDemo?: () => void;
  onNavigateCases?: () => void;
  onChanged?: () => void;
}

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

const INPUT_TYPE_OPTIONS = [
  { value: 'REQUIREMENT', label: '需求文档' },
  { value: 'PRD', label: 'PRD' },
  { value: 'TECH_DESIGN', label: '技术设计' },
  { value: 'API_DOC', label: '接口文档' },
  { value: 'OTHER', label: '其他资料' },
];

const SECTION_ITEM_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  FUNCTIONAL_TEST: [
    { value: 'FUNCTIONAL_POINT', label: '功能测试点' },
    { value: 'RISK', label: '风险点' },
  ],
  REGRESSION: [{ value: 'REGRESSION', label: '回归范围' }],
  JOINT_CASE: [{ value: 'JOINT_CASE', label: '联调 CASE' }],
  REQUIREMENT_ANALYSIS: [
    { value: 'RISK', label: '风险点' },
    { value: 'QUESTION', label: '疑问点' },
  ],
  OVERVIEW: [
    { value: 'RISK', label: '风险' },
    { value: 'QUESTION', label: '疑问' },
  ],
};

interface CaseRow extends QualityWorkItem {
  taskType?: string;
}

function extractRecords(res: any): any[] {
  const data = unwrap<any>(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  return [];
}

export function WorkspaceLinkedDocumentsPanel({
  workspaceId,
  projectId,
  canEdit = true,
  mode = 'edit',
  hideHeader = false,
  demoMode = false,
  referenceBundle,
  onToggleDemo,
  onNavigateCases,
  onChanged,
}: WorkspaceLinkedDocumentsPanelProps) {
  const initialMock = useMemo(() => {
    if (!demoMode || !workspaceId) return null;
    return buildWorkspaceDocumentMock(workspaceId, projectId);
  }, [demoMode, workspaceId, projectId]);

  const [analysis, setAnalysis] = useState<QualityAnalysis | null>(() => initialMock?.analysis ?? null);
  const [cases, setCases] = useState<CaseRow[]>(() => initialMock?.cases ?? []);
  const [prdView, setPrdView] = useState<PrdDocumentView | null>(() => initialMock?.prdView ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPoint, setSavingPoint] = useState(false);
  const [savingInput, setSavingInput] = useState(false);
  const [syncingFeishu, setSyncingFeishu] = useState(false);
  const [prdSearchQuery, setPrdSearchQuery] = useState('');
  const [prdSearchHits, setPrdSearchHits] = useState<PrdDocumentSearchHit[]>([]);
  const [searchingPrd, setSearchingPrd] = useState(false);
  const [generatingItems, setGeneratingItems] = useState(false);
  const [generatingCases, setGeneratingCases] = useState(false);
  const [useAiSearch, setUseAiSearch] = useState(false);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>(() => {
    const drafts: Record<string, string> = {};
    (initialMock?.analysis.sections || []).forEach((section) => {
      drafts[section.sectionKey] = section.content || '';
    });
    return drafts;
  });
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(() =>
    sortAnalysisSections(initialMock?.analysis.sections)[0]?.sectionKey || null
  );
  const [activeNodeId, setActiveNodeId] = useState<string | null>(() => initialMock?.prdView?.nodes?.[0]?.nodeId || null);
  const [nodeAnalysisDraft, setNodeAnalysisDraft] = useState('');
  const [pointForm, setPointForm] = useState({ itemType: 'FUNCTIONAL_POINT', title: '', description: '' });
  const [inputForm, setInputForm] = useState({ inputType: 'PRD', title: '', refUrl: '' });

  const analysisPaneRef = useRef<HTMLDivElement>(null);

  const applyMockBundle = useCallback((mock: WorkspaceDocumentMockBundle) => {
    setAnalysis(mock.analysis);
    setCases(mock.cases);
    setPrdView(mock.prdView);
    const drafts: Record<string, string> = {};
    (mock.analysis.sections || []).forEach((section) => {
      drafts[section.sectionKey] = section.content || '';
    });
    setSectionDrafts(drafts);
    const firstSection = sortAnalysisSections(mock.analysis.sections)[0]?.sectionKey;
    if (firstSection) setActiveSectionKey(firstSection);
    const firstNode = mock.prdView?.nodes?.[0];
    if (firstNode) {
      setActiveNodeId(firstNode.nodeId);
      setNodeAnalysisDraft(firstNode.analysisContent || '');
    }
  }, []);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    if (demoMode) {
      applyMockBundle(buildWorkspaceDocumentMock(workspaceId, projectId));
      return;
    }
    setLoading(true);
    try {
      const [analysisRes, prdViewResRaw] = await Promise.all([
        qualityWorkspaceService.getAnalysis(workspaceId),
        qualityWorkspaceService.getPrdView(workspaceId).catch(() => null),
      ]);
      const analysisResData = unwrap<QualityAnalysis>(analysisRes);
      const prdViewRes = prdViewResRaw ? unwrap<PrdDocumentView>(prdViewResRaw) : null;
      setAnalysis(analysisResData);
      setPrdView(prdViewRes && Array.isArray(prdViewRes.nodes) && prdViewRes.nodes.length ? prdViewRes : null);
      const drafts: Record<string, string> = {};
      (analysisResData.sections || []).forEach((s) => {
        drafts[s.sectionKey] = s.content || '';
      });
      setSectionDrafts(drafts);

      const tasks = unwrap<QualityTask[]>(await qualityWorkspaceService.getTaskList(workspaceId)) || [];
      const rows: CaseRow[] = [];
      for (const task of tasks.filter((t) => !['ANALYSIS', 'REVIEW'].includes(t.taskType))) {
        const res = await qualityWorkspaceService.getWorkItemPage({
          workspaceId,
          taskId: task.taskId,
          projectId,
          current: 1,
          pageSize: 100,
        });
        extractRecords(res).forEach((item) => rows.push({ ...item, taskType: task.taskType }));
      }
      setCases(rows);

      const firstSection = sortAnalysisSections(analysisResData.sections)[0]?.sectionKey;
      if (firstSection) setActiveSectionKey(firstSection);
      const firstNode = prdViewRes?.nodes?.[0];
      if (firstNode) {
        setActiveNodeId(firstNode.nodeId);
        setNodeAnalysisDraft(firstNode.analysisContent || '');
      }
    } catch (error) {
      console.error(error);
      toast.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, demoMode, applyMockBundle]);

  useEffect(() => {
    if (demoMode && workspaceId) {
      applyMockBundle(buildWorkspaceDocumentMock(workspaceId, projectId));
      return;
    }
    load();
  }, [demoMode, workspaceId, projectId, load, applyMockBundle]);

  useEffect(() => {
    if (demoMode || !workspaceId) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [demoMode, workspaceId, load]);

  const sections = useMemo(() => sortAnalysisSections(analysis?.sections), [analysis?.sections]);
  const prdNodes = prdView?.nodes || [];
  const usePrdTree = prdNodes.length > 0;
  const items = analysis?.items || [];
  const inputs = analysis?.inputs || [];

  const referenceLinks = useMemo(
    () => buildWorkspaceReferenceLinks(referenceBundle, inputs),
    [referenceBundle, inputs]
  );
  const primaryDocUrl = useMemo(() => pickPrimaryReferenceUrl(referenceLinks), [referenceLinks]);

  const linkedSectionKey = activeSectionKey || sections[0]?.sectionKey || null;
  const activeNode = prdNodes.find((node) => node.nodeId === activeNodeId) || prdNodes[0] || null;
  const nodeItems = useMemo(
    () => (activeNode ? items.filter((item) => item.prdNodeId === activeNode.nodeId) : []),
    [items, activeNode]
  );
  const sectionItems = useMemo(
    () => (usePrdTree ? nodeItems : filterItemsBySection(items, linkedSectionKey)),
    [usePrdTree, nodeItems, items, linkedSectionKey]
  );
  const sectionCases = useMemo(() => filterCasesBySectionItems(cases, sectionItems), [cases, sectionItems]);
  const activeAnalysisSection = sections.find((s) => s.sectionKey === linkedSectionKey) || null;

  const sectionStats = useMemo(() => {
    const stats: Record<string, { points: number; caseCount: number }> = {};
    sections.forEach((section) => {
      const sectionItemList = filterItemsBySection(items, section.sectionKey);
      stats[section.sectionKey] = {
        points: sectionItemList.length,
        caseCount: filterCasesBySectionItems(cases, sectionItemList).length,
      };
    });
    return stats;
  }, [sections, items, cases]);

  const selectSection = (sectionKey: string) => {
    setActiveSectionKey(sectionKey);
    analysisPaneRef.current?.querySelector(`#analysis-${sectionKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectNode = (node: PrdDocNode) => {
    setActiveNodeId(node.nodeId);
    setNodeAnalysisDraft(node.analysisContent || '');
    setPrdSearchHits([]);
  };

  const searchPrdTree = async () => {
    if (!workspaceId || demoMode || !prdSearchQuery.trim()) return;
    setSearchingPrd(true);
    try {
      const res = unwrap<{ hits?: PrdDocumentSearchHit[] }>(
        await qualityWorkspaceService.searchPrdNodes(workspaceId, {
          query: prdSearchQuery.trim(),
          topK: 8,
          useLlm: useAiSearch,
        })
      );
      const hits = res?.hits || [];
      setPrdSearchHits(hits);
      if (hits.length === 0) {
        toast.info('未找到相关节点');
      } else {
        const first = prdNodes.find((node) => node.nodeId === hits[0].nodeId);
        if (first) selectNode(first);
      }
    } catch (error) {
      console.error(error);
      toast.error('PRD 检索失败');
    } finally {
      setSearchingPrd(false);
    }
  };

  const generateNodeItems = async (useLlm = false) => {
    if (!workspaceId || !activeNode?.nodeId) return;
    if (demoMode) {
      toast.info('演示模式不支持生成测试点');
      return;
    }
    setGeneratingItems(true);
    try {
      const res = unwrap<{ createdCount?: number; prdView?: PrdDocumentView; analysis?: QualityAnalysis }>(
        await qualityWorkspaceService.generatePrdNodeItems(workspaceId, activeNode.nodeId, {
          maxItems: 20,
          useLlm,
        })
      );
      if (res?.prdView) setPrdView(res.prdView);
      if (res?.analysis) setAnalysis(res.analysis);
      toast.success(`已从本节生成 ${res?.createdCount ?? 0} 个测试点`);
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error('生成测试点失败');
    } finally {
      setGeneratingItems(false);
    }
  };

  /** 测分结论（测试点）评审后，从本节待生成的测试点产生测试用例 */
  const generateNodeCases = async () => {
    if (!workspaceId || !analysis?.analysisId || !activeNode?.nodeId) return;
    if (demoMode) {
      toast.info('演示模式不支持生成用例');
      return;
    }
    const pending = nodeItems.filter((item) => !item.workItemId && item.itemId);
    if (!pending.length) {
      toast.info('本节没有待生成用例的测试点');
      return;
    }
    setGeneratingCases(true);
    try {
      await qualityWorkspaceService.generateAnalysisCheckItems(workspaceId, analysis.analysisId, {
        itemIds: pending.map((item) => item.itemId).filter(Boolean) as string[],
      });
      toast.success(`已从 ${pending.length} 个测试点生成用例`);
      await load();
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error('生成用例失败');
    } finally {
      setGeneratingCases(false);
    }
  };

  const syncFeishuPrd = async () => {
    if (!workspaceId || demoMode) return;
    if (!primaryDocUrl) {
      toast.warning('请先在「编辑工作台」或资料引用中填写飞书 PRD 链接');
      return;
    }
    setSyncingFeishu(true);
    try {
      const next = unwrap<PrdDocumentView>(await qualityWorkspaceService.syncFeishuPrd(workspaceId));
      if (next?.nodes?.length) {
        setPrdView(next);
        const firstNode = next.nodes[0];
        setActiveNodeId(firstNode.nodeId);
        setNodeAnalysisDraft(firstNode.analysisContent || '');
      }
      toast.success(next?.unchanged ? 'PRD 内容未变化，已跳过重建' : '已从飞书同步 PRD 结构树');
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error('飞书 PRD 同步失败');
    } finally {
      setSyncingFeishu(false);
    }
  };

  const saveDocuments = async () => {
    if (usePrdTree && activeNode) {
      if (demoMode) {
        setPrdView((prev) => {
          if (!prev?.nodes) return prev;
          return {
            ...prev,
            nodes: prev.nodes.map((node) =>
              node.nodeId === activeNode.nodeId ? { ...node, analysisContent: nodeAnalysisDraft } : node
            ),
          };
        });
        toast.success('演示模式：已本地保存节点测分');
        return;
      }
      setSaving(true);
      try {
        const next = unwrap<PrdDocumentView>(
          await qualityWorkspaceService.savePrdNodeAnalysis(workspaceId, activeNode.nodeId, {
            content: nodeAnalysisDraft,
          })
        );
        setPrdView(next);
        toast.success('本节测分已保存');
        onChanged?.();
      } catch (error) {
        console.error(error);
        toast.error('保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!analysis?.analysisId) return;
    if (demoMode) {
      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: (prev.sections || []).map((section) => ({
            ...section,
            content: sectionDrafts[section.sectionKey] ?? section.content ?? '',
          })),
        };
      });
      toast.success('演示模式：已本地保存（不会写入后端）');
      return;
    }
    setSaving(true);
    try {
      let next = analysis;
      for (const section of sections) {
        next = unwrap<QualityAnalysis>(await qualityWorkspaceService.saveAnalysisSection(workspaceId, analysis.analysisId, {
          sectionId: section.sectionId,
          sectionKey: section.sectionKey,
          title: section.title,
          enabled: section.enabled,
          content: sectionDrafts[section.sectionKey] ?? section.content ?? '',
          sort: section.sort,
          metadata: section.metadata,
        }));
      }
      setAnalysis(next);
      toast.success('测试分析文档已保存');
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const addInputReference = async () => {
    if (!analysis?.analysisId || !inputForm.title.trim()) {
      toast.warning('请填写资料名称');
      return;
    }
    if (demoMode) {
      const nextInput: QualityAnalysisInput = {
        inputId: `mock-input-${Date.now()}`,
        inputType: inputForm.inputType,
        title: inputForm.title,
        refUrl: inputForm.refUrl,
      };
      setAnalysis((prev) => (prev ? { ...prev, inputs: [...(prev.inputs || []), nextInput] } : prev));
      setInputForm({ inputType: 'PRD', title: '', refUrl: '' });
      toast.success('演示模式：已本地添加引用');
      return;
    }
    setSavingInput(true);
    try {
      const next = unwrap<QualityAnalysis>(await qualityWorkspaceService.saveAnalysisInput(workspaceId, analysis.analysisId, {
        inputType: inputForm.inputType,
        title: inputForm.title,
        refUrl: inputForm.refUrl,
      } as QualityAnalysisInput));
      setAnalysis(next);
      setInputForm({ inputType: 'PRD', title: '', refUrl: '' });
      toast.success('已添加资料引用');
    } catch (error) {
      toast.error('添加失败');
    } finally {
      setSavingInput(false);
    }
  };

  const addPoint = async () => {
    const sectionKey = usePrdTree ? 'FUNCTIONAL_TEST' : linkedSectionKey;
    if (!analysis?.analysisId || !sectionKey || !pointForm.title.trim()) {
      toast.warning(usePrdTree ? '请填写测试点标题' : '请选择板块并填写测试点');
      return;
    }
    if (usePrdTree && !activeNode?.nodeId) {
      toast.warning('请先选择 PRD 节点');
      return;
    }
    if (demoMode) {
      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: [
            ...(prev.items || []),
            {
              itemId: `mock-item-${Date.now()}`,
              sectionKey,
              prdNodeId: activeNode?.nodeId,
              itemType: pointForm.itemType,
              title: pointForm.title,
              description: pointForm.description,
              selected: true,
              status: 'OPEN',
            },
          ],
        };
      });
      setPointForm((p) => ({ ...p, title: '', description: '' }));
      toast.success('演示模式：已本地添加测试点');
      return;
    }
    setSavingPoint(true);
    try {
      const next = unwrap<QualityAnalysis>(await qualityWorkspaceService.saveAnalysisItem(workspaceId, analysis.analysisId, {
        sectionKey,
        prdNodeId: usePrdTree ? activeNode?.nodeId : undefined,
        itemType: pointForm.itemType,
        title: pointForm.title,
        description: pointForm.description,
        selected: true,
        status: 'OPEN',
      }));
      setAnalysis(next);
      setPointForm((p) => ({ ...p, title: '', description: '' }));
      toast.success('测试点已添加');
      onChanged?.();
    } catch (error) {
      toast.error('添加失败');
    } finally {
      setSavingPoint(false);
    }
  };

  if (loading && !analysis && !demoMode) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F7F8FB]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!demoMode && !usePrdTree && sections.length === 0 && onToggleDemo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#F7F8FB] p-8 text-center">
        <Badge className="rounded-md bg-slate-100 text-slate-600 hover:bg-slate-100">暂无测试分析数据</Badge>
        <p className="max-w-md text-sm leading-6 text-slate-500">
          当前工作台还没有测分内容。你可以先加载演示数据，预览「需求资料 · 测试分析 · 用例」板块联动效果。
        </p>
        <Button className="rounded-xl bg-amber-500 font-black hover:bg-amber-600" onClick={onToggleDemo}>
          加载演示数据（登录改造示例）
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#F7F8FB]">
      {!hideHeader && (
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-black text-slate-900">需求资料 · 测试分析 · 用例联动</h2>
                {demoMode && (
                  <Badge className="rounded-md bg-amber-100 text-amber-800 hover:bg-amber-100">演示数据</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {demoMode
                  ? '当前为前端演示数据，可点击 PRD 树节点体验联动；不会调用后端接口。'
                  : usePrdTree
                    ? 'PRD 结构树来自 PageIndex 索引；选中节点维护本节测试点（即测分结论），评审后生成测试用例。'
                    : 'PRD 保持在外部文档，此处只登记链接；点击板块可定位测分章节及对应测试点、用例。'}
              </p>
            </div>
            <div className="flex gap-2">
              {onToggleDemo && (
                <Button
                  variant={demoMode ? 'default' : 'outline'}
                  size="sm"
                  className={cn('rounded-xl text-xs', demoMode ? 'bg-amber-500 hover:bg-amber-600' : '')}
                  onClick={onToggleDemo}
                >
                  {demoMode ? '退出演示' : '查看演示效果'}
                </Button>
              )}
              <Button variant="outline" size="sm" className="rounded-xl" onClick={load} disabled={demoMode}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />刷新
              </Button>
              {!demoMode && mode === 'edit' && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-blue-200 text-blue-700"
                  disabled={syncingFeishu}
                  onClick={syncFeishuPrd}
                >
                  {syncingFeishu ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
                  从飞书同步 PRD
                </Button>
              )}
              {mode === 'edit' && canEdit && (
                <Button size="sm" className="rounded-xl bg-slate-900 font-black" disabled={saving} onClick={saveDocuments}>
                  {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}保存测分
                </Button>
              )}
              {onNavigateCases && mode === 'edit' && (
                <Button size="sm" className="rounded-xl bg-violet-600 font-black" onClick={onNavigateCases}>
                  生成用例<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[280px_1fr_300px]">
        <div className="min-h-0 overflow-auto border-b border-slate-200 bg-white p-4 xl:border-b-0 xl:border-r">
          <div className="mb-4 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-rose-600" />
            <h3 className="text-sm font-black text-slate-900">需求资料</h3>
          </div>

          <Card className="mb-4 rounded-2xl border-slate-100 bg-slate-50/80 p-3">
            <p className="mb-3 text-[11px] leading-5 text-slate-500">
              不搬运 PRD 正文。在工作台设置或下方登记链接，需要时跳转原文对照。
            </p>
            <div className="space-y-2">
              {referenceLinks.length ? referenceLinks.map((link) => (
                link.url ? (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate">{link.label}</span>
                    <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-60" />
                  </a>
                ) : (
                  <div key={link.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    {link.label}
                    <Badge variant="outline" className="ml-auto rounded-md text-[10px]">待补链接</Badge>
                  </div>
                )
              )) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                  请在「编辑工作台」填写 PRD 链接，或下方添加资料引用
                </div>
              )}
            </div>

            {mode === 'edit' && canEdit && (
              <div className="mt-3 grid gap-2 border-t border-slate-200/80 pt-3">
                <Select value={inputForm.inputType} onValueChange={(v) => setInputForm((p) => ({ ...p, inputType: v }))}>
                  <SelectTrigger className="rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INPUT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={inputForm.title} onChange={(e) => setInputForm((p) => ({ ...p, title: e.target.value }))} placeholder="资料名称" className="rounded-lg text-sm" />
                <Input value={inputForm.refUrl} onChange={(e) => setInputForm((p) => ({ ...p, refUrl: e.target.value }))} placeholder="文档链接" className="rounded-lg text-sm" />
                <Button size="sm" disabled={savingInput} onClick={addInputReference} className="rounded-lg text-xs font-black">
                  {savingInput ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-3.5 w-3.5" />添加引用</>}
                </Button>
              </div>
            )}
          </Card>

          <div className="mb-2 text-[11px] font-black text-slate-400">{usePrdTree ? 'PRD 结构树' : '板块导航'}</div>
          {usePrdTree && (
            <div className="mb-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={prdSearchQuery}
                  onChange={(e) => setPrdSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void searchPrdTree();
                  }}
                  placeholder="检索 PRD 节点…"
                  className="rounded-lg text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-lg px-2"
                  disabled={searchingPrd || demoMode || !prdSearchQuery.trim()}
                  onClick={() => void searchPrdTree()}
                >
                  {searchingPrd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-slate-500">
                <input
                  type="checkbox"
                  checked={useAiSearch}
                  onChange={(e) => setUseAiSearch(e.target.checked)}
                  disabled={demoMode}
                />
                语义检索（向量与全文检索）
              </label>
            </div>
          )}
          {usePrdTree && prdSearchHits.length > 0 && (
            <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50/80 p-2">
              <div className="mb-1 text-[10px] font-black text-amber-700">检索结果</div>
              <div className="space-y-1">
                {prdSearchHits.map((hit) => (
                  <button
                    key={hit.nodeId}
                    type="button"
                    onClick={() => {
                      const node = prdNodes.find((item) => item.nodeId === hit.nodeId);
                      if (node) selectNode(node);
                    }}
                    className="block w-full rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-white"
                  >
                    <div className="font-bold text-slate-900">{hit.title}</div>
                    {hit.reason && <div className="text-slate-500">{hit.reason}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            {usePrdTree
              ? prdNodes.map((node) => {
                  const linked = activeNode?.nodeId === node.nodeId;
                  const matched = prdSearchHits.some((hit) => hit.nodeId === node.nodeId);
                  return (
                    <button
                      key={node.nodeId}
                      type="button"
                      onClick={() => selectNode(node)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2.5 text-left transition',
                        linked
                          ? 'border-rose-200 bg-rose-50 ring-1 ring-rose-100'
                          : matched
                            ? 'border-amber-200 bg-amber-50/60'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                      )}
                      style={{ marginLeft: `${Math.max((node.level || 1) - 1, 0) * 12}px`, width: `calc(100% - ${Math.max((node.level || 1) - 1, 0) * 12}px)` }}
                    >
                      <div className="text-xs font-black text-slate-900">{node.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="rounded-md text-[10px]">{node.itemCount || 0} 测试点</Badge>
                        <Badge variant="outline" className="rounded-md text-[10px]">{node.caseCount || 0} 用例</Badge>
                      </div>
                    </button>
                  );
                })
              : sections.map((section, index) => {
              const stats = sectionStats[section.sectionKey] || { points: 0, caseCount: 0 };
              const linked = linkedSectionKey === section.sectionKey;
              return (
                <button
                  key={section.sectionKey}
                  type="button"
                  onClick={() => selectSection(section.sectionKey)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2.5 text-left transition',
                    linked ? 'border-rose-200 bg-rose-50 ring-1 ring-rose-100' : 'border-slate-100 bg-white hover:border-slate-200'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900">{index + 1}. {section.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="rounded-md text-[10px]">{stats.points} 测试点</Badge>
                        <Badge variant="outline" className="rounded-md text-[10px]">{stats.caseCount} 用例</Badge>
                      </div>
                    </div>
                    {primaryDocUrl && (
                      <a
                        href={primaryDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-blue-600"
                        title="打开 PRD"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div ref={analysisPaneRef} className="min-h-0 overflow-auto border-b border-slate-200 bg-white p-5 xl:border-b-0 xl:border-r">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900">{usePrdTree ? '需求正文 · 本节测分' : '测试分析文档'}</h3>
          </div>
          {usePrdTree && activeNode ? (
            <article className="space-y-4">
              <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="mb-2 text-xs font-black text-slate-500">需求正文（只读）</div>
                <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{activeNode.body || '暂无正文'}</pre>
              </section>
              <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-slate-700">
                    本节测分结论（测试点 · {nodeItems.length}）
                  </div>
                  {mode === 'edit' && canEdit && !demoMode && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg border-violet-200 text-[11px] text-violet-700"
                        disabled={generatingItems}
                        onClick={() => void generateNodeItems(false)}
                      >
                        {generatingItems ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        规则生成
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg border-blue-200 text-[11px] text-blue-700"
                        disabled={generatingItems}
                        onClick={() => void generateNodeItems(true)}
                      >
                        自动生成
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {nodeItems.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-400">
                      暂无测试点。测分结论即测试点：可手动添加，或从本节正文「规则 / 自动生成」。
                    </p>
                  )}
                  {nodeItems.map((item) => (
                    <div
                      key={item.itemId || item.title}
                      className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-slate-800">{item.title}</div>
                        {item.description && (
                          <div className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-slate-500">{item.description}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 rounded-md text-[10px]">
                        {item.caseId ? '已沉淀用例' : item.workItemId ? '已生成' : '待生成'}
                      </Badge>
                    </div>
                  ))}
                </div>

                {mode === 'edit' && canEdit && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={pointForm.title}
                      onChange={(e) => setPointForm((p) => ({ ...p, title: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void addPoint();
                      }}
                      placeholder="补充测试点，回车添加"
                      className="h-8 rounded-lg bg-white text-xs"
                    />
                    <Button
                      size="sm"
                      className="h-8 shrink-0 rounded-lg bg-violet-600 text-xs font-black"
                      disabled={savingPoint}
                      onClick={addPoint}
                    >
                      {savingPoint ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                )}

                {mode === 'edit' && canEdit && !demoMode && (
                  <Button
                    size="sm"
                    className="mt-3 w-full rounded-lg bg-slate-900 text-xs font-black"
                    disabled={generatingCases || nodeItems.every((item) => !!item.workItemId)}
                    onClick={() => void generateNodeCases()}
                  >
                    {generatingCases ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    生成测试用例（{nodeItems.filter((item) => !item.workItemId).length} 个待生成）
                  </Button>
                )}

                <div className="mt-3">
                  <div className="mb-1 text-[10px] font-black text-slate-400">补充说明（选填）</div>
                  {mode === 'edit' && canEdit ? (
                    <Textarea
                      value={nodeAnalysisDraft}
                      onChange={(e) => setNodeAnalysisDraft(e.target.value)}
                      className="min-h-[80px] resize-none rounded-xl border-slate-200 bg-white text-sm leading-6"
                      placeholder="测试点之外需要补充的判断、约束或风险说明"
                    />
                  ) : (
                    nodeAnalysisDraft && (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{nodeAnalysisDraft}</p>
                    )
                  )}
                </div>
              </section>
            </article>
          ) : (
          <article className="space-y-3">
            {sections.map((section, index) => {
              const linked = linkedSectionKey === section.sectionKey;
              return (
                <section
                  key={section.sectionKey}
                  id={`analysis-${section.sectionKey}`}
                  onClick={() => selectSection(section.sectionKey)}
                  className={cn(
                    'cursor-pointer rounded-2xl border p-4 transition',
                    linked ? 'border-blue-300 bg-blue-50/60 ring-2 ring-blue-100' : 'border-slate-100 hover:border-blue-100'
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-slate-900">{index + 1}. {section.title}</h4>
                    <Badge variant="outline" className="rounded-md text-[10px]">
                      {sectionStats[section.sectionKey]?.points || 0} 点 · {sectionStats[section.sectionKey]?.caseCount || 0} 例
                    </Badge>
                  </div>
                  {mode === 'edit' && canEdit ? (
                    <Textarea
                      value={sectionDrafts[section.sectionKey] ?? ''}
                      onChange={(e) => setSectionDrafts((p) => ({ ...p, [section.sectionKey]: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                      className="min-h-[100px] resize-none rounded-xl border-slate-200 bg-white text-sm leading-7"
                      placeholder="写本板块的测试判断，不需要复制 PRD 原文"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {sectionDrafts[section.sectionKey] || section.content || '（暂无正文）'}
                    </p>
                  )}
                </section>
              );
            })}
          </article>
          )}
        </div>

        <div className="min-h-0 overflow-auto bg-slate-50/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-black text-slate-900">{usePrdTree ? '节点追踪' : '板块追踪'}</h3>
          </div>

          <Card className="mb-4 rounded-2xl border-violet-100 bg-white p-4">
            <div className="text-[10px] font-black text-slate-400">{usePrdTree ? '当前节点' : '当前板块'}</div>
            <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">
              {usePrdTree
                ? activeNode?.title || '—'
                : activeAnalysisSection?.title || ANALYSIS_SECTION_LABEL[linkedSectionKey || ''] || '—'}
            </div>
            {primaryDocUrl && (
              <a
                href={primaryDocUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
              >
                打开 PRD 对照<ExternalLink className="h-3 w-3" />
              </a>
            )}
          </Card>

          {!usePrdTree && (
            <TraceList
              title="测试点"
              count={sectionItems.length}
              empty="本板块暂无测试点"
              rows={sectionItems.map((item) => ({
                id: item.itemId || item.title,
                title: item.title,
                sub: item.description,
                tag: item.caseId ? '已沉淀用例' : item.workItemId ? '已生成' : '待生成',
              }))}
            />
          )}

          {mode === 'edit' && canEdit && !usePrdTree && linkedSectionKey && SECTION_ITEM_OPTIONS[linkedSectionKey] && (
            <Card className="mb-4 rounded-2xl border-dashed border-violet-200 bg-white p-3">
              <div className="mb-2 text-xs font-black">添加测试点</div>
              <Select value={pointForm.itemType} onValueChange={(v) => setPointForm((p) => ({ ...p, itemType: v }))}>
                <SelectTrigger className="mb-2 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(SECTION_ITEM_OPTIONS[linkedSectionKey] || []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={pointForm.title} onChange={(e) => setPointForm((p) => ({ ...p, title: e.target.value }))} placeholder="标题" className="mb-2 rounded-lg text-sm" />
              <Button size="sm" className="w-full rounded-lg bg-violet-600 font-black" disabled={savingPoint} onClick={addPoint}>
                {savingPoint ? <Loader2 className="h-4 w-4 animate-spin" /> : '添加'}
              </Button>
            </Card>
          )}

          <TraceList
            title="对应测试用例"
            icon={FlaskConical}
            count={sectionCases.length}
            empty={usePrdTree ? '本节测试点尚未生成用例，可在中栏点「生成测试用例」' : '本板块暂无已生成用例，可到「测试用例」步骤生成'}
            rows={sectionCases.map((c) => ({
              id: c.workItemId || c.title,
              title: c.title || '未命名',
              sub: c.taskType,
              tag: c.result || c.status || '待执行',
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function TraceList({
  title,
  icon: Icon = Target,
  count,
  empty,
  rows,
}: {
  title: string;
  icon?: typeof Target;
  count: number;
  empty: string;
  rows: Array<{ id: string; title: string; sub?: string; tag?: string }>;
}) {
  return (
    <Card className="mb-4 rounded-2xl border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs font-black">{title}</span>
        <Badge variant="outline" className="ml-auto rounded-md text-[10px]">{count}</Badge>
      </div>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs font-bold text-slate-900">{row.title}</div>
              {row.sub && <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{row.sub}</div>}
              {row.tag && <Badge variant="outline" className="mt-1 rounded-md text-[10px]">{row.tag}</Badge>}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed px-3 py-4 text-center text-[11px] text-slate-400">{empty}</p>
      )}
    </Card>
  );
}
