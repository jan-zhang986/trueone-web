/**
 * 用例详情抽屉
 * 1:1 迁移自 aegis-next-server caseDetailDrawer.vue
 * 完整功能：导航、分享、关注、多 Tab、评论等
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Pencil,
  Copy,
  Trash2,
  Share2,
  Star,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Sparkles,
  Plus,
  X,
  Bot,
  Workflow,
  Layers3,
  Play,
  Tag,
  Folder,
  Flame,
  User,
  Clock,
  Bookmark,
  FileText,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';
import { useUser } from '@/contexts/UserContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ApiPostmanInspector } from './ApiPostmanInspector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { SortableTabSettingRow } from './SortableTabSettingRow';
import { RichTextContent } from './RichTextContent';
import { StepEditor } from './StepEditor';
import { CASE_LEVEL_MAP } from '../constants';
import { caseManagementService } from '@/services';
import { getModulePath } from '../utils';
import { CaseLevelBadge, CaseLevelOption } from './CaseLevelBadge';
import WorkflowDesignPageV2, { type WorkflowDesignPageV2Ref } from '@/components/features/WorkflowDesignPageV2';
import { CaseModuleSelect } from './CaseModuleSelect';
import {
  TabComments,
  TabCaseReview,
  TabChangeHistory,
} from './drawer-tabs';
import { generateId } from '../utils';
import { getCaseLevel } from '../utils/getCaseLevel';
import type { CaseItem, CaseDetail, ModuleTreeNode, StepListItem, CaseRealization, CaseRealizationSummary } from '../types';

function parseSteps(stepsStr?: string): { step: string; expected: string }[] {
  if (!stepsStr?.trim()) return [];
  try {
    const arr = JSON.parse(stepsStr);
    return Array.isArray(arr) ? arr.map((s: any) => ({ step: s.desc ?? s.step ?? '', expected: s.result ?? s.expected ?? '' })) : [];
  } catch {
    return [];
  }
}

/** 列表/详情里只要已挂 workflowDefinitionId 或 realized，就应走「编辑」而非误走「新建」 */
function isWorkflowSlotBound(slot: CaseRealization | null | undefined): boolean {
  if (!slot) return false;
  if (slot.realized) return true;
  const id = slot.workflowDefinitionId;
  if (id == null) return false;
  return String(id).trim().length > 0;
}

/**
 * 用 realization/list 结果覆盖摘要中的计数与覆盖状态，避免 /realization/summary 或详情内嵌 summary 滞后导致头部一直 0/0、覆盖类型「暂无实现」
 */
function mergeRealizationSummaryFromList(
  api: CaseRealizationSummary | null,
  list: CaseRealization[],
  caseId: string | undefined
): CaseRealizationSummary | null {
  if (!caseId || !Array.isArray(list) || list.length === 0) {
    return api;
  }
  const realized = list.filter((r) => r.realized);
  const realizedCount = realized.length;
  const nonManualSlots = list.filter((r) => String(r.realizationType || '').toUpperCase() !== 'MANUAL');
  const nonManualRealized = nonManualSlots.filter((r) => r.realized).length;
  let automationCoverageStatus: CaseRealizationSummary['automationCoverageStatus'] = 'NONE';
  if (nonManualRealized > 0) {
    automationCoverageStatus =
      nonManualRealized >= nonManualSlots.length ? 'AUTOMATED_ONLY' : 'PARTIAL';
  }
  const coveredTypes = [...new Set(realized.map((r) => String(r.realizationType || '')).filter(Boolean))] as CaseRealizationSummary['coveredTypes'];
  return {
    ...(api ?? { caseId }),
    caseId,
    totalSlots: list.length,
    realizedCount,
    coveredTypes,
    automationCoverageStatus,
    hasAutomationRealization: nonManualRealized > 0,
    automationCount: nonManualRealized,
    flowCount: list.filter((r) => String(r.realizationType || '').toUpperCase() === 'FLOW' && r.realized).length,
    manualCount: list.filter((r) => String(r.realizationType || '').toUpperCase() === 'MANUAL' && r.realized).length,
    apiCount: list.filter((r) => String(r.realizationType || '').toUpperCase() === 'API' && r.realized).length,
    uiAutomationCount: list.filter((r) => String(r.realizationType || '').toUpperCase() === 'UI_AUTOMATION' && r.realized).length,
    perfCount: list.filter((r) => String(r.realizationType || '').toUpperCase() === 'PERF' && r.realized).length,
  };
}

function parseStepsToStepList(stepsStr?: string): StepListItem[] {
  if (!stepsStr?.trim()) return [{ id: generateId(), step: '', expected: '' }];
  try {
    const arr = JSON.parse(stepsStr);
    if (!Array.isArray(arr)) return [{ id: generateId(), step: '', expected: '' }];
    return arr.map((item: any) => ({
      id: item.id || generateId(),
      step: item.desc ?? item.step ?? '',
      expected: item.result ?? item.expected ?? '',
    }));
  } catch {
    return [{ id: generateId(), step: '', expected: '' }];
  }
}

function buildStepsPayload(steps: StepListItem[]): string {
  const payload = steps
    .filter((s) => s.step?.trim())
    .map((s, i) => ({
      id: s.id,
      num: i,
      desc: s.step,
      result: s.expected,
    }));
  return payload.length ? JSON.stringify(payload) : '';
}

export const CASE_TYPE_MAP: Record<string, { label: string; shortLabel: string; color: string; dotColor: string }> = {
  FUNCTIONAL: { label: '功能用例', shortLabel: '功能用例', color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80', dotColor: 'bg-slate-400' },
  API: { label: 'API 接口用例', shortLabel: 'API 接口', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100', dotColor: 'bg-purple-500' },
  UI_AUTOMATION: { label: 'UI 自动化用例', shortLabel: 'UI 自动化', color: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100', dotColor: 'bg-sky-500' },
  PERF: { label: '性能测试用例', shortLabel: '性能用例', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', dotColor: 'bg-amber-500' },
};

/**
 * 与 aegis-next-web caseDetailDrawer getParams 一致：拼出 { request, fileList } 用于 updateCaseRequest
 * customFields 格式：{ fieldId, value: Array.isArray ? JSON.stringify : value }，value 空时传 '' 避免后端 SQL 异常
 */
function getUpdateParams(
  detail: CaseDetail,
  caseId: string,
  overrides: Record<string, unknown>,
  fileList: File[] = []
): { request: Record<string, unknown>; fileList: File[] } {
  const customFieldsArr = (detail.customFields ?? []).map((f: { fieldId?: string; value?: unknown }) => ({
    fieldId: f.fieldId ?? '',
    value: Array.isArray(f.value) ? JSON.stringify(f.value) : (f.value != null ? String(f.value) : ''),
  }));
  const caseEditType =
    (overrides.caseEditType as string) ||
    detail.caseEditType ||
    (detail.steps || overrides.steps ? 'STEP' : 'TEXT');

  return {
    request: {
      ...detail,
      id: caseId,
      projectId: overrides.projectId || detail.projectId || localStorage.getItem('currentProjectId') || 'default-project',
      templateId: overrides.templateId || detail.templateId || 'default-template',
      moduleId: overrides.moduleId || detail.moduleId,
      name: overrides.name || overrides.title || detail.name || detail.title || '',
      caseEditType,
      versionId: overrides.versionId || detail.versionId,
      deleteFileMetaIds: [],
      unLinkFilesIds: [],
      newAssociateFileListIds: [],
      customFields: customFieldsArr,
      caseDetailFileIds: [],
      ...overrides,
    },
    fileList,
  };
}

function mapUnifiedCaseDetailToDrawerShape(detail: any): CaseDetail {
  const manualRealization = Array.isArray(detail?.realizations)
    ? detail.realizations.find((item: any) => String(item?.realizationType || '').toUpperCase() === 'MANUAL')
    : null;
  const manualImplementation = Array.isArray(detail?.implementations)
    ? detail.implementations.find((item: any) => String(item?.type || '').toUpperCase() === 'MANUAL')
    : null;
  const manualDefinition =
    manualRealization?.workflowDefinition ||
    manualImplementation?.definition ||
    {};
  const metadata = detail?.metadata || {};
  const caseEditType =
    metadata.caseEditType ||
    manualDefinition.caseEditType ||
    (manualDefinition.textDescription ? 'TEXT' : 'STEP');

  return {
    ...detail,
    id: detail?.caseId || detail?.id,
    caseId: detail?.caseId || detail?.id,
    name: detail?.title || detail?.name || '',
    title: detail?.title || detail?.name || '',
    prerequisite: detail?.precondition || detail?.prerequisite || '',
    caseEditType,
    steps: manualDefinition.steps || detail?.steps || '',
    textDescription: manualDefinition.textDescription || detail?.textDescription || '',
    expectedResult: detail?.expectedResult || manualDefinition.expectedResult || '',
    description: detail?.description || '',
    reviewStatus: detail?.lifecycleStatus || detail?.reviewStatus,
    customFields: Array.isArray(detail?.customFields) ? detail.customFields : [],
    functionalPriority: detail?.functionalPriority || metadata.functionalPriority,
    caseLevel: detail?.caseLevel || detail?.functionalPriority || metadata.functionalPriority,
    tags: Array.isArray(detail?.tags) ? detail.tags : [],
    realizations: Array.isArray(detail?.realizations) ? detail.realizations : [],
    realizationSummary: detail?.realizationSummary,
    attachments: Array.isArray(detail?.attachments) ? detail.attachments : [],
  } as CaseDetail;
}

interface CaseDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string | null;
  caseList?: CaseItem[];
  caseIndex?: number;
  moduleTree?: ModuleTreeNode[];
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  projectId?: string;
  onEdit?: (item: CaseItem) => void;
  onCopy?: (item: CaseItem) => void;
  onCreate?: () => void;
  onSuccess?: () => void;
  preferredTab?: 'detail' | 'realization';
  /** 切换查看的用例（prev/next 时调用） */
  onCaseSelect?: (item: CaseItem) => void;
  /** 权限控制：为 false 时隐藏对应操作，不传或 true 时显示 */
  canEdit?: boolean;
  canCopy?: boolean;
  canDelete?: boolean;
  canShare?: boolean;
  canFollow?: boolean;
  canComment?: boolean;
}

const TAB_LIST = [
  { value: 'basicInfo', label: '用例详情', canHide: false },
  { value: 'realization', label: '执行详情', canHide: true },
  { value: 'caseReview', label: '用例评审', canHide: true },
  { value: 'comments', label: '评论', canHide: true },
  { value: 'changeHistory', label: '变更历史', canHide: true },
] as const;

const DISPLAY_SETTINGS_KEY = 'case-detail-drawer-tab-settings';
const TAB_ORDER_KEY = 'case-detail-drawer-tab-order';

function normalizeTabOrder(order: string[] | null | undefined): string[] {
  const fallback = TAB_LIST.map((t) => t.value);
  if (!Array.isArray(order) || order.length === 0) return fallback;
  const valid = order.filter((value, index) => TAB_LIST.some((tab) => tab.value === value) && order.indexOf(value) === index);
  const missing = fallback.filter((value) => !valid.includes(value));
  return [...valid, ...missing];
}

export function CaseDetailDrawer({
  open,
  onOpenChange,
  caseId,
  caseList = [],
  caseIndex = -1,
  moduleTree = [],
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  projectId = 'default-project',
  onEdit,
  onCopy,
  onCreate,
  onSuccess,
  preferredTab = 'detail',
  onCaseSelect,
  canEdit = true,
  canCopy = true,
  canDelete = true,
  canShare = true,
  canFollow = true,
  canComment = true,
}: CaseDetailDrawerProps) {
  const workflowDesignRef = useRef<WorkflowDesignPageV2Ref>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [realizationLoading, setRealizationLoading] = useState(false);
  const [realizations, setRealizations] = useState<CaseRealization[]>([]);
  const [realizationSummary, setRealizationSummary] = useState<CaseRealizationSummary | null>(null);
  const [realizationActionLoading, setRealizationActionLoading] = useState<string | null>(null);
  const [workflowWorkbenchOpen, setWorkflowWorkbenchOpen] = useState(false);
  const [workflowWorkbenchLoading, setWorkflowWorkbenchLoading] = useState(false);
  const [workflowViewMode, setWorkflowViewMode] = useState<'canvas' | 'steps'>('canvas');
  /** 详情「实现」Tab 内嵌流程预览：画布 / 步骤（与全屏工作台数据源一致） */
  /** 详情内嵌流程默认「步骤」视图（与用例步骤编排场景一致，可手动切画布） */
  const [realizationPreviewViewMode, setRealizationPreviewViewMode] = useState<'canvas' | 'steps'>('steps');
  /** 内嵌流程预览是否收起（缩小占位，仅保留标题栏） */
  const [workflowEmbedCollapsed, setWorkflowEmbedCollapsed] = useState(false);
  const [workflowRealizationDetail, setWorkflowRealizationDetail] = useState<CaseRealization | null>(null);
  const [activeTab, setActiveTab] = useState('detail');
  const [followFlag, setFollowFlag] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [caseLevel, setCaseLevel] = useState('P1');
  const [caseType, setCaseType] = useState('FUNCTIONAL');
  const [typeSaving, setTypeSaving] = useState(false);
  const [commentHtml, setCommentHtml] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentRefreshKey, setCommentRefreshKey] = useState(0);
  const [tagsSaving, setTagsSaving] = useState(false);
  const [levelSaving, setLevelSaving] = useState(false);
  const [moduleSaving, setModuleSaving] = useState(false);
  const [showRealizationChoiceDialog, setShowRealizationChoiceDialog] = useState(false);
  const [targetRealizationType, setTargetRealizationType] = useState<string>('FLOW');
  const [showSettingSheet, setShowSettingSheet] = useState(false);
  const [visibleTabs, setVisibleTabs] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem(DISPLAY_SETTINGS_KEY);
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });
  const [tabOrder, setTabOrder] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem(TAB_ORDER_KEY);
      return normalizeTabOrder(s ? JSON.parse(s) : null);
    } catch {
      return normalizeTabOrder(null);
    }
  });
  const [isEditTitle, setIsEditTitle] = useState(false);
  const [titleName, setTitleName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRealizationDialogOpen, setDeleteRealizationDialogOpen] = useState(false);
  const [targetRealizationToDelete, setTargetRealizationToDelete] = useState<CaseRealization | null>(null);

  const openDeleteRealizationDialog = (realization: CaseRealization) => {
    setTargetRealizationToDelete(realization);
    setDeleteRealizationDialogOpen(true);
  };

  const handleConfirmDeleteRealization = async () => {
    if (!targetRealizationToDelete) return;
    const target = targetRealizationToDelete;
    setDeleteRealizationDialogOpen(false);
    setTargetRealizationToDelete(null);
    await handleRealizationAction('delete', target);
  };
  const [editingField, setEditingField] = useState<'prerequisite' | 'textDescription' | 'expectedResult' | 'description' | 'steps' | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingSteps, setEditingSteps] = useState<StepListItem[]>([]);
  const [editingSaving, setEditingSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { user } = useUser();

  // 关闭抽屉时退出全屏
  useEffect(() => {
    if (!open) setIsFullscreen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(preferredTab);
  }, [open, caseId, preferredTab]);
  const userId = user?.id || localStorage.getItem('currentUserId') || localStorage.getItem('userId') || '';

  const currentItem = caseId ? caseList?.find((c) => c.id === caseId) : null;
  const isUnifiedCase = Boolean(detail?.spaceId || currentItem?.spaceId);

  const formatRealizationType = (type?: string) => {
    switch (type) {
      case 'MANUAL':
        return '手工';
      case 'API':
        return 'API';
      case 'UI_AUTOMATION':
        return 'UI 自动化';
      case 'FLOW':
        return '自动化';
      case 'PERF':
        return '性能';
      default:
        return type || '-';
    }
  };

  const formatRunStatus = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'PASSED':
        return '成功';
      case 'ERROR':
      case 'FAILED':
        return '失败';
      case 'BLOCKED':
        return '阻塞';
      case 'PENDING':
      case 'TODO':
      case 'READY':
        return '待执行';
      default:
        return status || '未执行';
    }
  };

  const getRealizationBadgeClassName = (realization: CaseRealization) => {
    if (!realization.realized) return 'bg-gray-100 text-gray-600 border-gray-200';
    if (realization.enabled === false) return 'bg-slate-100 text-slate-600 border-slate-200';
    const status = realization.lastRunStatus || realization.workflowStatus || realization.status;
    if (status === 'SUCCESS' || status === 'PASSED' || status === 'PUBLISHED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'ERROR' || status === 'FAILED') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (status === 'BLOCKED') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const formatCoverageStatus = (status?: string) => {
    switch (status) {
      case 'AUTOMATED_ONLY':
        return '全自动化';
      case 'PARTIAL':
        return '部分自动化';
      case 'NONE':
        return '未自动化';
      default:
        return status || '未自动化';
    }
  };

  const formatDateTime = (value?: number | string) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
  };

  /** 实现槽位以 /realization/list 为准；不要用详情里的内嵌 realizations（易滞后，导致 FLOW 仍显示未实现） */
  const resolvedRealizations = useMemo(
    () => (Array.isArray(realizations) && realizations.length > 0 ? realizations : []),
    [realizations]
  );
  const resolvedRealizationSummary = useMemo(
    () =>
      mergeRealizationSummaryFromList(
        realizationSummary ?? detail?.realizationSummary ?? null,
        resolvedRealizations,
        caseId ?? undefined
      ),
    [realizationSummary, detail?.realizationSummary, resolvedRealizations, caseId]
  );
  const nonManualRealizations = useMemo(
    () => resolvedRealizations.filter((item) => String(item.realizationType || '').toUpperCase() !== 'MANUAL'),
    [resolvedRealizations]
  );
  const primaryWorkflowRealization = useMemo(() => {
    const realizedFlow = nonManualRealizations.find((item) => String(item.realizationType || '').toUpperCase() === 'FLOW' && item.realized);
    if (realizedFlow) return realizedFlow;
    const boundFlow = nonManualRealizations.find(
      (item) => String(item.realizationType || '').toUpperCase() === 'FLOW' && isWorkflowSlotBound(item)
    );
    if (boundFlow) return boundFlow;
    const realizedAny = nonManualRealizations.find((item) => item.realized);
    if (realizedAny) return realizedAny;
    const flowSlot = nonManualRealizations.find((item) => String(item.realizationType || '').toUpperCase() === 'FLOW');
    return flowSlot || nonManualRealizations[0] || null;
  }, [nonManualRealizations]);
  const workflowSlotBound = useMemo(() => isWorkflowSlotBound(primaryWorkflowRealization), [primaryWorkflowRealization]);
  const workflowSlotType = primaryWorkflowRealization?.realizationType || 'FLOW';
  const workflowWorkbenchSpace = useMemo<any>(() => ({
    id: `case-${caseId || 'unknown'}-workflow`,
    name: detail?.name ? `${detail.name} · 自动化` : '自动化',
    projectId: detail?.projectId || projectId,
    description: detail?.description || '',
  }), [caseId, detail?.description, detail?.name, detail?.projectId, projectId]);
  const workflowWorkbenchCase = useMemo(() => {
    const workflowId =
      workflowRealizationDetail?.workflowDefinitionId ?? primaryWorkflowRealization?.workflowDefinitionId ?? undefined;
    if (!workflowId) return null;
    const lastRunStatus =
      workflowRealizationDetail?.lastRunStatus ?? primaryWorkflowRealization?.lastRunStatus;
    const lastRunTime = workflowRealizationDetail?.lastRunTime ?? primaryWorkflowRealization?.lastRunTime;
    return {
      id: workflowId,
      name:
        workflowRealizationDetail?.workflowName ||
        primaryWorkflowRealization?.workflowName ||
        `${detail?.name || '用例'} · 自动化`,
      description:
        workflowRealizationDetail?.workflowDefinition?.description || detail?.description || '',
      category:
        workflowRealizationDetail?.workflowCategory || primaryWorkflowRealization?.workflowCategory || 'CASE',
      nodeCount: (() => {
        const dn = workflowRealizationDetail?.workflowDefinition?.nodes;
        const ln = primaryWorkflowRealization?.workflowDefinition?.nodes;
        if (Array.isArray(dn)) return dn.length;
        if (Array.isArray(ln)) return ln.length;
        return 0;
      })(),
      duration: workflowRealizationDetail?.lastDurationMs ?? primaryWorkflowRealization?.lastDurationMs,
      status:
        lastRunStatus === 'SUCCESS' || lastRunStatus === 'PASSED'
          ? 'success'
          : lastRunStatus === 'ERROR' || lastRunStatus === 'FAILED'
            ? 'failed'
            : 'not-run',
      lastRun: lastRunTime ? formatDateTime(lastRunTime) : undefined,
      creator: detail?.createUserName || detail?.createUser || '当前项目',
    };
  }, [
    detail?.createUser,
    detail?.createUserName,
    detail?.description,
    detail?.name,
    primaryWorkflowRealization,
    workflowRealizationDetail,
  ]);

  const workflowPreviewNodes = useMemo((): Record<string, unknown>[] => {
    const fromDetail = workflowRealizationDetail?.workflowDefinition?.nodes;
    const fromList = primaryWorkflowRealization?.workflowDefinition?.nodes;
    const raw = Array.isArray(fromDetail) ? fromDetail : Array.isArray(fromList) ? fromList : [];
    return raw as Record<string, unknown>[];
  }, [
    workflowRealizationDetail?.workflowDefinition?.nodes,
    primaryWorkflowRealization?.workflowDefinition?.nodes,
  ]);

  const handleUploadImage = useCallback(
    async (file: File): Promise<string> => {
      const res: any = await caseManagementService.editorUploadFile({ fileList: [file] });
      let fileId: string | undefined;
      if (typeof res === 'string') fileId = res;
      else if (res?.data != null) fileId = typeof res.data === 'string' ? res.data : res.data?.id ?? res.data?.fileId;
      else if (res?.id) fileId = res.id;
      else if (res?.fileId) fileId = res.fileId;
      if (!fileId || typeof fileId !== 'string') throw new Error('上传失败：无法获取文件 ID');
      return `/attachment/download/file/${projectId}/${fileId}/true`;
    },
    [projectId]
  );

  const buildUnifiedSavePayload = useCallback(
    (overrides: Record<string, unknown> = {}) => {
      if (!detail || !caseId) return null;
      const next: Record<string, any> = { ...detail, ...overrides };
      const title = String(overrides.title ?? overrides.name ?? next.title ?? next.name ?? '').trim();
      const caseEditType = String(next.caseEditType || 'STEP');
      const manualDefinition: Record<string, any> = {
        caseEditType,
        expectedResult: next.expectedResult,
      };
      if (caseEditType === 'STEP') {
        manualDefinition.steps = next.steps;
      } else {
        manualDefinition.textDescription = next.textDescription;
      }

      const sourceRealizations = Array.isArray(resolvedRealizations) && resolvedRealizations.length > 0
        ? resolvedRealizations
        : Array.isArray(detail.realizations)
          ? detail.realizations
          : [];
      const hasManual = sourceRealizations.some((item: any) => String(item?.realizationType || '').toUpperCase() === 'MANUAL');
      const realizations = [
        ...sourceRealizations.map((item: any) => {
          if (String(item?.realizationType || '').toUpperCase() !== 'MANUAL') return item;
          return {
            ...item,
            name: item?.name || `${title} [MANUAL]`,
            workflowDefinition: {
              ...(item?.workflowDefinition || {}),
              ...manualDefinition,
            },
            status: item?.status || 'ACTIVE',
            enabled: item?.enabled !== false,
          };
        }),
        ...(!hasManual
          ? [{
            realizationType: 'MANUAL',
            name: `${title} [MANUAL]`,
            workflowDefinition: manualDefinition,
            status: 'ACTIVE',
            enabled: true,
          }]
          : []),
      ];

      return {
        caseId: detail.caseId || detail.id || caseId,
        projectId: detail.projectId || projectId,
        spaceId: detail.spaceId,
        moduleId: next.moduleId,
        title,
        description: next.description,
        precondition: next.precondition ?? next.prerequisite,
        expectedResult: next.expectedResult,
        priority: next.priority,
        ownerId: next.ownerId || next.createUser,
        sourceType: next.sourceType,
        lifecycleStatus: next.lifecycleStatus || next.reviewStatus,
        workflowId: next.workflowId,
        tags: Array.isArray(next.tags) ? next.tags : [],
        metadata: next.metadata || {},
        realizations,
      };
    },
    [caseId, detail, projectId, resolvedRealizations]
  );

  const saveUnifiedDrawerCase = useCallback(
    async (overrides: Record<string, unknown> = {}) => {
      const payload = buildUnifiedSavePayload(overrides);
      if (!payload) return;
      await caseManagementService.saveUnifiedCase(payload);
    },
    [buildUnifiedSavePayload]
  );

  const executeSave = useCallback(
    async (overrides: Record<string, unknown> = {}) => {
      if (!caseId || !detail) return;
      if (isUnifiedCase && (detail.spaceId || currentItem?.spaceId)) {
        try {
          await saveUnifiedDrawerCase(overrides);
          return;
        } catch (err) {
          console.warn('Unified save failed, falling back to legacy functional case update:', err);
        }
      }
      await caseManagementService.updateCaseRequest(getUpdateParams(detail, caseId, overrides));
    },
    [caseId, detail, isUnifiedCase, currentItem?.spaceId, saveUnifiedDrawerCase]
  );

  const loadWorkflowRealizationDetail = useCallback(
    async (realizationType?: string) => {
      if (!caseId || !realizationType) {
        setWorkflowRealizationDetail(null);
        return null;
      }
      const result = await caseManagementService.getCaseRealizationDetail(caseId, realizationType);
      setWorkflowRealizationDetail(result ?? null);
      return result ?? null;
    },
    [caseId]
  );

  const loadDetail = useCallback(() => {
    if (open && caseId) {
      setLoading(true);
      setRealizationLoading(true);
      const detailRequest = caseManagementService
        .getUnifiedCaseDetail(caseId)
        .then((res: any) => mapUnifiedCaseDetailToDrawerShape(res))
        .catch((error: unknown) => {
          if (currentItem?.spaceId) {
            throw error;
          }
          return caseManagementService.getCaseDetail(caseId);
        });
      Promise.allSettled([
        detailRequest,
        caseManagementService.getCaseRealizations(caseId),
        caseManagementService.getCaseRealizationSummary(caseId),
      ])
        .then(([detailResult, realizationsResult, summaryResult]) => {
          let embeddedRealizationsFallback: unknown[] | undefined;
          if (detailResult.status === 'fulfilled') {
            try {
              const res: any = detailResult.value;
              embeddedRealizationsFallback = Array.isArray(res?.realizations) ? res.realizations : undefined;
              // 去掉内嵌 realizations / realizationSummary，避免与独立 list、summary 接口不一致时覆盖 UI
              const { realizations: _embeddedRealizations, realizationSummary: _embeddedSummary, ...detailRest } = res ?? {};
              setDetail(detailRest);
              setTitleName(res?.name ?? res?.title ?? '');
              setTags(Array.isArray(res?.tags) ? res.tags : res?.tags ? [res.tags] : []);
              setFollowFlag(!!res?.followFlag);
              const cf = (res?.customFields as { fieldId?: string; value?: string }[]) || [];
              const pf = cf.find((f: any) => f.fieldId === 'functional_priority' || f.internalFieldKey === 'functional_priority');
              const parsedLevel = getCaseLevel(res);
              setCaseLevel(pf?.value || res?.functionalPriority || res?.caseLevel || (parsedLevel !== '-' ? parsedLevel : 'P2'));

              const rawType = String(res?.type || res?.caseType || '').toUpperCase();
              const initialType = rawType === 'API' ? 'API' : rawType === 'UI_AUTOMATION' || rawType === 'UI' ? 'UI_AUTOMATION' : rawType === 'PERF' ? 'PERF' : 'FUNCTIONAL';
              setCaseType(initialType);
              if (initialType === 'API') {
                setActiveTab('realization');
                setViewApiAsPostman(true);
              }
            } catch (e) {
              console.error('[CaseDetailDrawer] 解析用例详情失败', e);
            }
          } else {
            setDetail(null);
          }

          if (realizationsResult.status === 'fulfilled') {
            const raw = realizationsResult.value as unknown;
            const arr = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data) ? (raw as { data: unknown[] }).data : [];
            setRealizations(arr as CaseRealization[]);
          } else {
            setRealizations(
              Array.isArray(embeddedRealizationsFallback) ? (embeddedRealizationsFallback as CaseRealization[]) : []
            );
          }

          if (summaryResult.status === 'fulfilled') {
            setRealizationSummary(summaryResult.value ?? null);
          } else {
            setRealizationSummary(null);
          }
        })
        .finally(() => {
          setLoading(false);
          setRealizationLoading(false);
        });
    } else {
      setDetail(null);
      setRealizations([]);
      setRealizationSummary(null);
    }
  }, [open, caseId, currentItem?.spaceId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!open || activeTab !== 'realization') return;
    if (!workflowSlotBound || !primaryWorkflowRealization?.realizationType) {
      setWorkflowRealizationDetail(null);
      return;
    }
    setWorkflowWorkbenchLoading(true);
    loadWorkflowRealizationDetail(primaryWorkflowRealization.realizationType)
      .catch((error) => {
        console.error(error);
        toast.error('加载自动化失败');
      })
      .finally(() => setWorkflowWorkbenchLoading(false));
  }, [activeTab, loadWorkflowRealizationDetail, open, primaryWorkflowRealization?.realizationType, workflowSlotBound]);

  useEffect(() => {
    if (!open || !caseId) setIsEditTitle(false);
  }, [open, caseId]);

  useEffect(() => {
    setWorkflowEmbedCollapsed(false);
    setRealizationPreviewViewMode('steps');
  }, [caseId]);

  const handleEdit = () => {
    if (currentItem) {
      onOpenChange(false);
      onEdit?.(currentItem);
    }
  };

  const handleCopy = () => {
    if (currentItem) {
      onOpenChange(false);
      onCopy?.(currentItem);
    }
  };

  const handleDelete = () => {
    if (!currentItem) return;
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!currentItem) return;
    const request = isUnifiedCase
      ? caseManagementService.deleteUnifiedCase(currentItem.caseId || currentItem.id)
      : caseManagementService.deleteCaseRequest({ id: currentItem.id, projectId: currentItem.projectId || projectId });
    request
      .then(() => {
        setDeleteDialogOpen(false);
        onOpenChange(false);
        onSuccess?.();
        toast.success('删除成功');
      })
      .catch((e) => {
        toast.error('删除失败');
        console.error(e);
      });
  };

  const handleShare = () => {
    if (!caseId || !projectId) {
      toast.error('无法生成分享链接');
      return;
    }
    const orgId = user?.lastOrganizationId || localStorage.getItem('currentOrgId') || '';
    // 使用当前前端部署基路径，避免把域名/路径写死在根目录
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
    const base = `${window.location.origin}${baseUrl}/#/case-management/featureCase`;
    const params = new URLSearchParams();
    params.set('id', String(caseId));
    params.set('pId', String(projectId));
    if (orgId) params.set('orgId', String(orgId));
    const url = `${base}?${params.toString()}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success('链接已复制到剪贴板');
      }).catch(() => toast.error('复制失败'));
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success('链接已复制到剪贴板');
      } catch {
        toast.error('复制失败，请手动复制链接');
      }
    }
  };

  const startEdit = (field: 'prerequisite' | 'textDescription' | 'expectedResult' | 'description' | 'steps') => {
    if (!detail) return;
    if (field === 'steps') {
      setEditingField('steps');
      setEditingSteps(parseStepsToStepList(detail.steps));
    } else {
      const val = (detail as Record<string, string | undefined>)[field] ?? '';
      setEditingField(field);
      setEditingValue(typeof val === 'string' ? val : '');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditingValue('');
    setEditingSteps([]);
  };

  const saveEdit = () => {
    if (!caseId || !projectId || !editingField || !detail) return;
    setEditingSaving(true);
    const overrides =
      editingField === 'steps'
        ? { steps: buildStepsPayload(editingSteps) }
        : { [editingField]: editingValue };
    executeSave(overrides)
      .then(() => {
        setEditingField(null);
        setEditingValue('');
        setEditingSteps([]);
        loadDetail();
        onSuccess?.();
        toast.success('保存成功');
      })
      .catch((e) => {
        toast.error('保存失败');
        console.error(e);
      })
      .finally(() => setEditingSaving(false));
  };

  const handleFollow = () => {
    if (!caseId) return;
    if (!userId) {
      toast.error('请先登录后再关注');
      return;
    }
    setFollowLoading(true);
    caseManagementService
      .followerCaseRequest({ userId, functionalCaseId: caseId })
      .then(() => {
        setFollowFlag(!followFlag);
        loadDetail();
        toast.success(followFlag ? '已取消关注' : '关注成功');
      })
      .catch((e) => {
        console.error(e);
        toast.error('操作失败，请稍后重试');
      })
      .finally(() => setFollowLoading(false));
  };

  const handlePrev = () => {
    if (caseIndex > 0) {
      const prev = caseList[caseIndex - 1];
      if (prev) onCaseSelect?.(prev);
    } else if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (caseIndex >= 0 && caseIndex < caseList.length - 1) {
      const next = caseList[caseIndex + 1];
      if (next) onCaseSelect?.(next);
    } else if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  const handleCommentSubmit = () => {
    const html = commentHtml.trim();
    if (!caseId || !html) return;
    const textOnly = html.replace(/<[^>]*>/g, '').trim();
    const hasImage = /<img\b[^>]*>/i.test(html);
    // 允许「只有图片」的评论；仅在既没有文字也没有图片时才视为无效
    if (!textOnly && !hasImage) return;
    const uploadFileIds = Array.from(
      html.matchAll(/\/attachment\/download\/file\/[^/]+\/([^/]+)\/true/g),
      (m) => m[1]
    );
    setCommentLoading(true);
    const request = isUnifiedCase
      ? caseManagementService.saveCollabComment({
        projectId,
        subjectType: 'CASE',
        subjectId: caseId,
        content: html,
        notifier: '',
        replyUser: '',
        parentId: '',
        uploadFileIds,
      })
      : caseManagementService.createCommentItem({
        caseId,
        content: html,
        event: 'COMMENT',
        notifier: '',
        replyUser: '',
        parentId: '',
        uploadFileIds,
      });
    request
      .then(() => {
        setCommentHtml('');
        setCommentRefreshKey((k) => k + 1);
        toast.success('评论已发送');
      })
      .catch((e) => console.error(e))
      .finally(() => setCommentLoading(false));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      const v = e.currentTarget.value.trim();
      if (!tags.includes(v)) {
        const next = [...tags, v];
        setTags(next);
        saveTags(next);
      }
      e.currentTarget.value = '';
    }
  };

  const handleRemoveTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    saveTags(next);
  };

  const saveTags = (newTags: string[]) => {
    if (!caseId || !detail) return;
    setTagsSaving(true);
    executeSave({ tags: newTags })
      .then(() => {
        loadDetail();
        onSuccess?.();
        toast.success('标签已保存');
      })
      .catch((e) => console.error(e))
      .finally(() => setTagsSaving(false));
  };

  const handleModuleChange = (moduleId: string) => {
    if (!caseId || !detail) return;
    setModuleSaving(true);
    executeSave({ moduleId })
      .then(() => {
        loadDetail();
        onSuccess?.();
        toast.success('模块已更新');
      })
      .catch((e) => console.error(e))
      .finally(() => setModuleSaving(false));
  };

  const handleCaseTypeChange = (newType: string) => {
    if (!caseId) return;
    setCaseType(newType);
    setDetail((prev) => (prev ? { ...prev, type: newType, caseType: newType } : prev));
    if (currentItem) {
      currentItem.type = newType;
      currentItem.caseType = newType;
    }
    if (newType === 'API') {
      setActiveTab('realization');
      setViewApiAsPostman(true);
    }
    setTypeSaving(true);
    const overrides = { type: newType, caseType: newType };
    executeSave(overrides)
      .then(() => {
        onSuccess?.();
        toast.success(`用例类型已更新为: ${CASE_TYPE_MAP[newType]?.label || newType}`);
      })
      .catch((e) => {
        console.error('更新用例类型失败', e);
        toast.error('更新用例类型失败');
      })
      .finally(() => setTypeSaving(false));
  };

  const handleRealizationAction = async (action: 'publish' | 'enable' | 'disable' | 'delete', realization: CaseRealization) => {
    if (!caseId) return;
    if (realization.realizationType === 'MANUAL') {
      toast.info('手工实现无需维护自动化');
      return;
    }
    const actionKey = `${action}:${realization.realizationType}`;
    setRealizationActionLoading(actionKey);
    try {
      if (action === 'publish') {
        await caseManagementService.publishCaseRealization(caseId, realization.realizationType);
      } else if (action === 'enable') {
        await caseManagementService.enableCaseRealization(caseId, realization.realizationType);
      } else if (action === 'disable') {
        await caseManagementService.disableCaseRealization(caseId, realization.realizationType);
      } else if (action === 'delete') {
        await caseManagementService.deleteCaseRealization(caseId, realization.realizationType);
      }
      await Promise.resolve(loadDetail());
      if (action === 'delete') {
        setWorkflowRealizationDetail(null);
      } else {
        await loadWorkflowRealizationDetail(realization.realizationType).catch(() => null);
      }
      const messageMap = {
        publish: '自动化已发布',
        enable: '自动化已启用',
        disable: '自动化已停用',
        delete: '已成功清除该自动化/接口配置',
      } as const;
      toast.success(messageMap[action]);
    } catch (error) {
      console.error(error);
      toast.error('自动化操作失败，请稍后重试');
    } finally {
      setRealizationActionLoading(null);
    }
  };

  const handleCreateWorkflowRealization = async () => {
    setTargetRealizationType('FLOW');
    setWorkflowViewMode('steps');
    setRealizationPreviewViewMode('steps');
    setWorkflowWorkbenchOpen(true);
    setActiveTab('realization');
  };
  const handleOpenWorkflowWorkbench = async () => {
    if (!caseId) return;
    if (!workflowSlotBound || !primaryWorkflowRealization?.realizationType) {
      await handleCreateWorkflowRealization();
      return;
    }
    setWorkflowWorkbenchLoading(true);
    try {
      const next = await loadWorkflowRealizationDetail(primaryWorkflowRealization.realizationType);
      const resolvedWfId =
        next?.workflowDefinitionId ?? primaryWorkflowRealization.workflowDefinitionId ?? undefined;
      if (!resolvedWfId) {
        toast.error('缺少自动化编排，请先创建');
        return;
      }
      setTargetRealizationType(primaryWorkflowRealization.realizationType || 'FLOW');
      setWorkflowViewMode(realizationPreviewViewMode);
      setWorkflowWorkbenchOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('打开自动化编辑失败，请稍后重试');
    } finally {
      setWorkflowWorkbenchLoading(false);
    }
  };

  const handleCaseLevelChange = (value: string) => {
    if (!caseId || !detail) return;
    setCaseLevel(value);
    setLevelSaving(true);
    // 与 aegis-next-web handleStatusChange 一致：整份 customFields，仅改 functional_priority
    const customFieldsArr = (detail.customFields as { fieldId?: string; internalFieldKey?: string; value?: string }[]) ?? [];
    const hasPriority = customFieldsArr.some((f) => f.fieldId === 'functional_priority' || f.internalFieldKey === 'functional_priority');
    const customFieldsList = customFieldsArr.map((f) => ({
      fieldId: f.fieldId ?? f.internalFieldKey ?? '',
      value: f.fieldId === 'functional_priority' || f.internalFieldKey === 'functional_priority' ? value : (f.value ?? ''),
    }));
    if (!hasPriority) customFieldsList.push({ fieldId: 'functional_priority', value });
    const priorityNum = value.startsWith('P') ? Number.parseInt(value.slice(1), 10) + 1 : detail.priority;
    executeSave({
      customFields: customFieldsList,
      priority: Number.isFinite(priorityNum) ? priorityNum : detail.priority,
      functionalPriority: value,
      metadata: {
        ...(detail.metadata || {}),
        functionalPriority: value,
      },
    })
      .then(() => {
        loadDetail();
        onSuccess?.();
        toast.success('用例等级已更新');
      })
      .catch((e) => console.error(e))
      .finally(() => setLevelSaving(false));
  };

  const steps = detail?.caseEditType === 'STEP' ? parseSteps(detail?.steps) : [];

  const visibleTabList = tabOrder
    .map((v) => TAB_LIST.find((t) => t.value === v))
    .filter((t): t is (typeof TAB_LIST)[number] => !!t && visibleTabs[t.value] !== false)
    .filter((t) => !(isUnifiedCase && t.value === 'caseReview'));
  const countMap: Record<string, number> = {
    realization: resolvedRealizationSummary?.realizedCount ?? 0,
    caseReview: detail?.caseReviewCount ?? 0,
    comments: detail?.commentCount ?? 0,
    changeHistory: detail?.historyCount ?? 0,
  };
  const getTabLabel = (t: (typeof TAB_LIST)[number]) => {
    if (t.value === 'realization') {
      return '执行详情';
    }
    const cnt = countMap[t.value as keyof typeof countMap];
    if (cnt != null && cnt > 0) return `${t.label} ${cnt > 99 ? '99+' : cnt}`;
    return t.label;
  };

  const handleTitleSave = () => {
    if (!caseId || !detail || !titleName.trim()) {
      setIsEditTitle(false);
      return;
    }
    if (titleName.trim() === detail.name) {
      setIsEditTitle(false);
      return;
    }
    executeSave({ title: titleName.trim(), name: titleName.trim() })
      .then(() => {
        loadDetail();
        setIsEditTitle(false);
        onSuccess?.();
        toast.success('名称已更新');
      })
      .catch((e) => console.error(e));
  };

  const persistVisibleTabs = (v: Record<string, boolean>) => {
    setVisibleTabs(v);
    try {
      localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  };

  const persistTabOrder = (order: string[]) => {
    const normalized = normalizeTabOrder(order);
    setTabOrder(normalized);
    try {
      localStorage.setItem(TAB_ORDER_KEY, JSON.stringify(normalized));
    } catch {
      /* ignore */
    }
  };

  const handleResetSettings = () => {
    persistVisibleTabs({});
    persistTabOrder(TAB_LIST.map((t) => t.value));
  };

  const closeableTabOrder = tabOrder.filter((v) => TAB_LIST.find((t) => t.value === v)?.canHide);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTabDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = closeableTabOrder.indexOf(active.id as string);
    const newIndex = closeableTabOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const moved = arrayMove(closeableTabOrder, oldIndex, newIndex);
    const nonCloseable = TAB_LIST.filter((t) => !t.canHide).map((t) => t.value);
    persistTabOrder([...nonCloseable, ...moved]);
  };
  const canPrev = caseIndex > 0 || (currentPage > 1 && onPageChange);
  const canNext = (caseIndex >= 0 && caseIndex < caseList.length - 1) || (currentPage < totalPages && onPageChange);

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={
          isFullscreen
            ? 'inset-0 right-0 left-0 w-full max-w-none sm:max-w-none flex flex-col p-0 gap-0 rounded-none'
            : 'w-[860px] sm:max-w-[860px] flex flex-col p-0 gap-0'
        }
      >
        {/* 头部导航与操作栏 */}
        <SheetHeader className="flex flex-row items-center justify-between border-b border-gray-100 px-4 py-2 shrink-0 bg-white">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700" disabled={!canPrev} onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700" disabled={!canNext} onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <SheetTitle className={`flex-1 pr-2 ${isEditTitle ? 'min-w-0' : 'truncate'}`}>
              <div className="flex items-center gap-2 min-w-0">
                {detail?.aiCreate && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-violet-50 text-violet-700 border border-violet-200/60 shrink-0 font-normal" title="AI 创建">
                    <Sparkles className="h-3 w-3" /> AI
                  </span>
                )}
                {canEdit ? (
                  <Select value={caseLevel} onValueChange={handleCaseLevelChange} disabled={levelSaving}>
                    <SelectTrigger className="h-7 w-auto px-1.5 !border-0 !bg-transparent !shadow-none text-[13px] shrink-0 hover:!bg-gray-100 rounded">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CASE_LEVEL_MAP).map(([val]) => (
                        <SelectItem key={val} value={val}>
                          <CaseLevelOption value={val} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <CaseLevelBadge level={caseLevel} />
                )}
                {/* 用例类型 Badge (优雅标签，点击弹出切换菜单) */}
                {canEdit ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={typeSaving}
                        className={`inline-flex items-center px-2 py-0.5 text-xs rounded border shrink-0 font-medium cursor-pointer transition-all hover:shadow-2xs select-none focus:outline-none ${
                          (CASE_TYPE_MAP[caseType] || CASE_TYPE_MAP.FUNCTIONAL).color
                        }`}
                        title="点击切换用例类型"
                      >
                        {(CASE_TYPE_MAP[caseType] || CASE_TYPE_MAP.FUNCTIONAL).shortLabel}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44 p-1 rounded-lg shadow-md border-gray-200">
                      <div className="px-2 py-1 text-[11px] font-medium text-gray-400">切换用例类型</div>
                      {Object.entries(CASE_TYPE_MAP).map(([val, item]) => {
                        const isSelected = caseType === val;
                        return (
                          <DropdownMenuItem
                            key={val}
                            onClick={() => handleCaseTypeChange(val)}
                            className={`flex items-center justify-between px-2 py-1.5 text-xs rounded cursor-pointer ${
                              isSelected ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
                              <span>{item.label}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs rounded border shrink-0 font-normal ${
                      (CASE_TYPE_MAP[caseType] || CASE_TYPE_MAP.FUNCTIONAL).color
                    }`}
                  >
                    {(CASE_TYPE_MAP[caseType] || CASE_TYPE_MAP.FUNCTIONAL).shortLabel}
                  </span>
                )}

                {isEditTitle ? (
                  <Textarea
                    className="flex-1 min-w-0 text-[15px] font-medium resize-none py-1 px-2 min-h-[2rem] max-h-24"
                    value={titleName}
                    onChange={(e) => setTitleName(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTitleSave();
                      }
                    }}
                    placeholder="用例标题"
                    rows={1}
                    autoFocus
                  />
                ) : (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="text-[15px] font-semibold tracking-tight truncate cursor-pointer hover:bg-gray-100 px-2 py-0.5 rounded text-gray-900 block min-w-0 transition-colors"
                          onClick={() => setIsEditTitle(true)}
                        >
                          {(() => {
                            const n = detail?.num ?? currentItem?.num;
                            const numStr = n && String(n) !== '-' ? `#${n} ` : '';
                            const tName = detail?.name ?? currentItem?.name ?? titleName ?? '加载中...';
                            return `${numStr}${tName}`;
                          })()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[480px] whitespace-pre-wrap break-words">
                        {detail?.name ?? currentItem?.name ?? titleName ?? '加载中...'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </SheetTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0 pr-10">
            {canEdit && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-normal text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-all" onClick={handleEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1 text-gray-400" /> 编辑
              </Button>
            )}
            {canShare && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-normal text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-all" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5 mr-1 text-gray-400" /> 分享
              </Button>
            )}
            {canFollow && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-normal text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-all" disabled={followLoading} onClick={handleFollow}>
                <Star className={`h-3.5 w-3.5 mr-1 ${followFlag ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}`} /> 关注
              </Button>
            )}
            {(canCopy || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-normal text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-all">
                    <MoreVertical className="h-3.5 w-3.5 mr-1 text-gray-400" /> 更多
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-lg shadow-lg border-gray-200 p-1">
                  {canCopy && (
                    <DropdownMenuItem onClick={handleCopy} className="rounded text-xs font-normal py-1.5">
                      <Copy className="h-3.5 w-3.5 mr-2 text-gray-500" /> 复制
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="rounded text-xs font-normal py-1.5 text-rose-600 focus:text-rose-700 focus:bg-rose-50">
                      <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-500" /> 删除
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
                title={isFullscreen ? '退出全屏' : '全屏'}
                onClick={() => setIsFullscreen((v) => !v)}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Tab 栏 */}
        <div className="border-b border-gray-200 px-5 shrink-0 flex items-center justify-between bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="h-9 bg-transparent p-0 gap-1 border-0 w-auto justify-start inline-flex items-center">
              {visibleTabList.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="!flex-none w-auto rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-blue-600 data-[state=active]:!bg-transparent px-3 py-2 text-[13px] font-normal text-gray-500 data-[state=active]:font-medium data-[state=active]:text-blue-600 transition-colors hover:text-gray-900 shadow-none data-[state=active]:shadow-none cursor-pointer"
                >
                  {getTabLabel(t)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-700 shrink-0 ml-3 font-normal transition-colors" onClick={() => setShowSettingSheet(true)}>显示设置</span>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto px-6 py-4">
              <TabsContent value="basicInfo" className="mt-0 m-0">
                {loading ? (
                  <div className="py-8 text-center text-gray-500">加载中...</div>
                ) : detail ? (
                    <div className="space-y-5 max-w-4xl py-1 px-1">
                      {/* 属性区域 (Notion 原生属性列表风格，无表格/无边框盒子) */}
                      <div className="pb-4 border-b border-gray-100">
                        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-[13px]">
                          {/* 用例类型 */}
                          <div className="flex items-center min-h-[26px]">
                            <span className="w-20 text-gray-400 font-normal flex items-center gap-1.5 shrink-0 select-none">
                              <Tag className="w-3.5 h-3.5 text-gray-400" /> 类型
                            </span>
                            <Select value={caseType} onValueChange={handleCaseTypeChange} disabled={typeSaving}>
                              <SelectTrigger className="h-6 px-1.5 !border-0 !bg-transparent hover:!bg-gray-100 text-[13px] font-normal text-gray-800 shadow-none rounded transition-colors w-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="w-[180px]">
                                {Object.entries(CASE_TYPE_MAP).map(([val, item]) => (
                                  <SelectItem key={val} value={val}>
                                    <span className="text-[13px]">{item.label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 创建人 */}
                          <div className="flex items-center min-h-[26px]">
                            <span className="w-20 text-gray-400 font-normal flex items-center gap-1.5 shrink-0 select-none">
                              <User className="w-3.5 h-3.5 text-gray-400" /> 创建人
                            </span>
                            <span className="font-normal text-gray-800 text-[13px] px-1.5">
                              {detail.createUserName ?? detail.createUser ?? '-'}
                            </span>
                          </div>

                          {/* 所属模块 */}
                          <div className="flex items-center min-h-[26px]">
                            <span className="w-20 text-gray-400 font-normal flex items-center gap-1.5 shrink-0 select-none">
                              <Folder className="w-3.5 h-3.5 text-gray-400" /> 模块
                            </span>
                            <div className="min-w-[140px]">
                              <CaseModuleSelect
                                moduleTree={moduleTree}
                                value={detail.moduleId || ''}
                                onChange={handleModuleChange}
                                disabled={moduleSaving}
                                noLabel
                                variant="ghost"
                                placeholder="选择模块"
                              />
                            </div>
                          </div>

                          {/* 创建时间 */}
                          <div className="flex items-center min-h-[26px]">
                            <span className="w-20 text-gray-400 font-normal flex items-center gap-1.5 shrink-0 select-none">
                              <Clock className="w-3.5 h-3.5 text-gray-400" /> 创建时间
                            </span>
                            <span className="text-gray-600 text-[13px] px-1.5">
                              {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '-'}
                            </span>
                          </div>

                          {/* 用例等级 */}
                          <div className="flex items-center min-h-[26px]">
                            <span className="w-20 text-gray-400 font-normal flex items-center gap-1.5 shrink-0 select-none">
                              <Flame className="w-3.5 h-3.5 text-gray-400" /> 等级
                            </span>
                            <Select value={caseLevel} onValueChange={handleCaseLevelChange} disabled={levelSaving}>
                              <SelectTrigger className="h-6 px-1.5 !border-0 !bg-transparent hover:!bg-gray-100 text-[13px] font-normal text-gray-800 shadow-none rounded transition-colors w-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CASE_LEVEL_MAP).map(([k]) => (
                                  <SelectItem key={k} value={k}>
                                    <CaseLevelOption value={k} />
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 标签 */}
                          <div className="flex items-center min-h-[26px]">
                            <span className="w-20 text-gray-400 font-normal flex items-center gap-1.5 shrink-0 select-none">
                              <Bookmark className="w-3.5 h-3.5 text-gray-400" /> 标签
                            </span>
                            <div className="flex flex-wrap gap-1.5 items-center flex-1">
                              {tags.map((t) => (
                                <Badge
                                  key={t}
                                  variant="secondary"
                                  className="pl-2 pr-1 py-0.5 text-xs font-normal bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 gap-1 rounded"
                                >
                                  {t}
                                  <button
                                    type="button"
                                    className="ml-0.5 rounded p-0.5 hover:bg-gray-300/60 hover:text-gray-900 disabled:opacity-50"
                                    onClick={() => handleRemoveTag(t)}
                                    disabled={tagsSaving}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                              <div className="inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-0.5 h-5.5 min-w-[80px] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all hover:border-gray-300">
                                <Plus className="w-3 h-3 text-gray-400 shrink-0 mr-1" />
                                <Input
                                  className="h-3.5 w-full min-w-0 border-0 bg-transparent px-0 py-0 text-xs placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                                  placeholder="添加标签"
                                  onKeyDown={handleTagKeyDown}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 1. 前置条件 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-gray-900">
                            前置条件
                          </span>
                          {canEdit && editingField !== 'prerequisite' && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded font-normal shrink-0" onClick={() => startEdit('prerequisite')}>
                              <Pencil className="w-3 h-3 mr-1 text-gray-400" /> 编辑
                            </Button>
                          )}
                        </div>
                        {editingField === 'prerequisite' ? (
                          <div className="space-y-2.5">
                            <RichTextEditor value={editingValue} onChange={setEditingValue} placeholder="请输入前置条件" minHeight="120px" uploadImage={handleUploadImage} />
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={editingSaving}>取消</Button>
                              <Button size="sm" onClick={saveEdit} disabled={editingSaving}>{editingSaving ? '保存中...' : '保存'}</Button>
                            </div>
                          </div>
                        ) : detail.prerequisite?.trim() ? (
                          <div
                            className={`text-[13px] text-gray-800 leading-relaxed rounded-lg bg-gray-50/60 hover:bg-gray-50/90 px-3.5 py-2.5 border border-gray-200/80 transition-colors ${canEdit ? 'cursor-pointer' : ''}`}
                            onClick={() => canEdit && startEdit('prerequisite')}
                            title={canEdit ? '点击快速编辑前置条件' : undefined}
                          >
                            <RichTextContent
                              content={detail.prerequisite}
                              className="[&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-64 [&_img]:object-contain"
                            />
                          </div>
                        ) : (
                          <div
                            className={`text-gray-400 text-xs italic py-2 px-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/30 flex items-center gap-1.5 transition-colors ${canEdit ? 'cursor-pointer hover:bg-gray-50 hover:text-gray-600 hover:border-gray-300' : ''}`}
                            onClick={() => canEdit && startEdit('prerequisite')}
                          >
                            <Pencil className="w-3 h-3 text-gray-400" />
                            <span>暂无前置条件{canEdit ? '，点击添加' : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* 2. 用例步骤 (清晰表头底色 + 层次结构) */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                            <span>{detail.caseEditType === 'STEP' ? '用例步骤' : '文本描述'}</span>
                            {detail.caseEditType === 'STEP' && steps.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[11px] font-normal bg-gray-100 text-gray-500">
                                {steps.length} 步
                              </span>
                            )}
                          </div>
                          {canEdit && editingField !== 'textDescription' && editingField !== 'steps' && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded font-normal shrink-0" onClick={() => startEdit(detail.caseEditType === 'STEP' ? 'steps' : 'textDescription')}>
                              <Pencil className="w-3 h-3 mr-1 text-gray-400" /> 编辑步骤
                            </Button>
                          )}
                        </div>

                        {editingField === 'steps' ? (
                          <div className="space-y-2.5">
                            <StepEditor steps={editingSteps} onChange={setEditingSteps} />
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={editingSaving}>取消</Button>
                              <Button size="sm" onClick={saveEdit} disabled={editingSaving}>{editingSaving ? '保存中...' : '保存'}</Button>
                            </div>
                          </div>
                        ) : detail.caseEditType === 'STEP' && steps.length > 0 ? (
                          <div className="rounded-lg border border-emerald-100 overflow-hidden shadow-2xs">
                            <table className="w-full text-[13px]">
                              <thead>
                                <tr className="bg-emerald-50/80 border-b border-emerald-100">
                                  <th className="w-12 py-2 text-left px-3.5 font-medium text-emerald-800 text-[12px]">序号</th>
                                  <th className="py-2 text-left px-3.5 font-medium text-emerald-800 text-[12px] w-1/2">步骤描述</th>
                                  <th className="py-2 text-left px-3.5 font-medium text-emerald-800 text-[12px] w-1/2">预期结果</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {steps.map((s, i) => (
                                  <tr key={i} className="hover:bg-[#f7f8fa] transition-colors">
                                    <td className="py-2.5 px-3.5 text-gray-400 font-mono text-[13px] align-top">{i + 1}</td>
                                    <td className="py-2.5 px-3.5 font-normal whitespace-pre-wrap align-top text-gray-800 leading-relaxed">{s.step || '-'}</td>
                                    <td className="py-2.5 px-3.5 font-normal whitespace-pre-wrap align-top text-gray-800 leading-relaxed">{s.expected || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : editingField === 'textDescription' ? (
                          <div className="text-[13px] space-y-3">
                            <RichTextEditor value={editingValue} onChange={setEditingValue} placeholder="请输入文本描述" minHeight="180px" uploadImage={handleUploadImage} />
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={editingSaving}>取消</Button>
                              <Button size="sm" onClick={saveEdit} disabled={editingSaving}>{editingSaving ? '保存中...' : '保存'}</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[13px] text-gray-800 rounded-lg bg-gray-50/50 p-3 border border-gray-200/80 min-h-[2.5rem]">
                            {detail.textDescription?.trim() ? (
                              <RichTextContent
                                content={detail.textDescription}
                                className="[&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-64 [&_img]:object-contain"
                              />
                            ) : (
                              <span className="text-gray-400 italic text-xs">暂无步骤描述</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 3. 预期结果（仅文本模式时单独展示） */}
                      {detail.caseEditType === 'TEXT' && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-semibold text-gray-900">
                              预期结果
                            </span>
                            {canEdit && editingField !== 'expectedResult' && (
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded font-normal shrink-0" onClick={() => startEdit('expectedResult')}>
                                <Pencil className="w-3 h-3 mr-1 text-gray-400" /> 编辑
                              </Button>
                            )}
                          </div>
                          <div className="text-[13px] text-gray-800 rounded-lg bg-gray-50/50 p-3 border border-gray-200/80 min-h-[2.5rem] leading-relaxed">
                            {editingField === 'expectedResult' ? (
                              <div className="space-y-2.5">
                                <RichTextEditor value={editingValue} onChange={setEditingValue} placeholder="请输入预期结果" minHeight="140px" uploadImage={handleUploadImage} />
                                <div className="flex gap-2 justify-end">
                                  <Button variant="outline" size="sm" onClick={cancelEdit} disabled={editingSaving}>取消</Button>
                                  <Button size="sm" onClick={saveEdit} disabled={editingSaving}>{editingSaving ? '保存中...' : '保存'}</Button>
                                </div>
                              </div>
                            ) : detail.expectedResult?.trim() ? (
                              <RichTextContent
                                content={detail.expectedResult}
                                className="[&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-64 [&_img]:object-contain"
                              />
                            ) : (
                              <span className="text-gray-400 italic text-xs">暂无预期结果</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">暂无数据</div>
                )}
              </TabsContent>
              <TabsContent value="realization" className="mt-0 m-0">
                {realizationLoading ? (
                  <div className="py-8 text-center text-gray-500">加载中...</div>
                ) : caseType === 'API' ? (
                  <div className="pb-4">
                    <ApiPostmanInspector
                      caseId={caseId ?? undefined}
                      caseName={detail?.name || currentItem?.name || 'API 接口用例'}
                      initialMethod="POST"
                      initialUrl={`/api/v1/cases/${caseId || '1024'}`}
                      onClear={
                        canEdit && workflowSlotBound && primaryWorkflowRealization
                          ? () => openDeleteRealizationDialog(primaryWorkflowRealization)
                          : undefined
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workflowSlotBound ? (
                      <div className="space-y-3">
                        {/* 顶部轻量控制栏 */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/70 border border-gray-200 px-3.5 py-2 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            {(() => {
                              const rawName = workflowRealizationDetail?.workflowName || primaryWorkflowRealization.workflowName || '';
                              const isRawId = !rawName || /^\d+$/.test(rawName.trim()) || rawName === primaryWorkflowRealization.workflowDefinitionId;
                              const slotType = String(primaryWorkflowRealization?.realizationType || caseType || 'FLOW').toUpperCase();
                              const typeSuffixMap: Record<string, string> = {
                                API: 'API 接口工作流',
                                UI_AUTOMATION: 'UI 自动化工作流',
                                PERF: '性能测试工作流',
                                FLOW: '自动化工作流',
                              };
                              const defaultSuffix = typeSuffixMap[slotType] || '自动化工作流';
                              const displayName = isRawId ? `${detail?.name || '用例'} · ${defaultSuffix}` : rawName;
                              return (
                                <span className="text-[13px] font-medium text-gray-900 truncate">
                                  {displayName}
                                </span>
                              );
                            })()}
                            <Badge variant="outline" className="text-xs font-normal text-gray-600 bg-white border-gray-200">
                              {primaryWorkflowRealization.enabled === false ? '已停用' : '已就绪'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="inline-flex h-7 rounded border border-gray-200 bg-white p-0.5">
                              <button
                                type="button"
                                className={`h-6 px-2.5 text-xs rounded transition-colors ${realizationPreviewViewMode === 'canvas' ? 'bg-gray-100 font-medium text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setRealizationPreviewViewMode('canvas')}
                              >
                                画布
                              </button>
                              <button
                                type="button"
                                className={`h-6 px-2.5 text-xs rounded transition-colors ${realizationPreviewViewMode === 'steps' ? 'bg-gray-100 font-medium text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setRealizationPreviewViewMode('steps')}
                              >
                                步骤
                              </button>
                            </div>

                            {canEdit && (
                              <Button
                                size="sm"
                                className="h-7 px-2.5 gap-1 bg-blue-600 hover:bg-blue-700 text-white font-normal text-xs rounded shadow-2xs"
                                disabled={workflowWorkbenchLoading}
                                onClick={handleOpenWorkflowWorkbench}
                              >
                                <Maximize2 className="h-3.5 w-3.5" />
                                全屏编辑
                              </Button>
                            )}

                            {canEdit && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700 rounded">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-lg shadow-lg border-gray-200 p-1">
                                  <DropdownMenuItem
                                    className="rounded text-xs py-1.5"
                                    disabled={realizationActionLoading === `publish:${primaryWorkflowRealization.realizationType}`}
                                    onClick={() => handleRealizationAction('publish', primaryWorkflowRealization)}
                                  >
                                    发布
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="rounded text-xs py-1.5"
                                    disabled={realizationActionLoading === `${primaryWorkflowRealization.enabled === false ? 'enable' : 'disable'}:${primaryWorkflowRealization.realizationType}`}
                                    onClick={() => handleRealizationAction(primaryWorkflowRealization.enabled === false ? 'enable' : 'disable', primaryWorkflowRealization)}
                                  >
                                    {primaryWorkflowRealization.enabled === false ? '启用' : '停用'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="rounded text-xs py-1.5 text-rose-600 focus:text-rose-700 focus:bg-rose-50 flex items-center gap-1.5 cursor-pointer"
                                    disabled={realizationActionLoading === `delete:${primaryWorkflowRealization.realizationType}`}
                                    onClick={() => openDeleteRealizationDialog(primaryWorkflowRealization)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {primaryWorkflowRealization.realizationType === 'API' ? '清除接口配置' : '清除自动化配置'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>

                        {/* 工作流画布/步骤直出展示 */}
                        {workflowWorkbenchCase?.id && !workflowWorkbenchOpen ? (
                          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-2xs">
                            <div className="h-[min(70vh,700px)] min-h-[480px] w-full">
                              <WorkflowDesignPageV2
                                key={`case-detail-wf-embed-${caseId}-${workflowWorkbenchCase.id}`}
                                showNodePalette={false}
                                viewMode={realizationPreviewViewMode}
                                workflowId={workflowWorkbenchCase.id}
                                caseId={caseId || undefined}
                                realizationType={workflowSlotType}
                                moduleId={detail?.moduleId}
                                projectId={workflowWorkbenchSpace.projectId}
                                onSave={async () => {
                                  await Promise.resolve(loadDetail());
                                  await loadWorkflowRealizationDetail(workflowSlotType).catch(() => null);
                                }}
                              />
                            </div>
                          </div>
                        ) : workflowWorkbenchCase?.id && workflowWorkbenchOpen ? (
                          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-xs text-gray-500">
                            全屏编辑工作台中；关闭全屏后可在此继续预览与调试。
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="px-6 py-12 text-center rounded-xl border border-dashed border-slate-200/80 bg-slate-50/40 m-4">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                            <Bot className="h-6 w-6" />
                          </div>
                          <h4 className="mt-4 text-sm font-bold text-slate-900">暂未配置自动化工作流</h4>
                          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            为当前测试用例关联 API 或 UI 自动化工作流，可在测试计划挂载与持续集成中自动跑测校验。
                          </p>
                          {canEdit && (
                            <div className="mt-6 flex flex-wrap justify-center gap-3">
                              <Button
                                onClick={handleCreateWorkflowRealization}
                                disabled={workflowWorkbenchLoading}
                                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs"
                              >
                                <Plus className="h-4 w-4" />
                                新建自动化工作流
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                )}
              </TabsContent>
              <TabsContent value="caseReview" className="mt-0 m-0">
                <TabCaseReview caseId={caseId} projectId={projectId} />
              </TabsContent>
              <TabsContent value="comments" className="mt-0 m-0">
                <TabComments caseId={caseId} projectId={projectId} unifiedCase={isUnifiedCase} refreshKey={commentRefreshKey} />
              </TabsContent>
              <TabsContent value="changeHistory" className="mt-0 m-0">
                <TabChangeHistory caseId={caseId} projectId={projectId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* 底部评论输入（受 canComment 权限控制，支持富文本与图片） */}
        {canComment && (
          <div className="border-t border-gray-100 px-4 py-2.5 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600 shrink-0">
                {userId ? userId.slice(0, 1).toUpperCase() : '?'}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <RichTextEditor
                  value={commentHtml}
                  onChange={setCommentHtml}
                  placeholder="请输入评论（支持图片）..."
                  minHeight="80px"
                  uploadImage={handleUploadImage}
                  editorClassName="text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleCommentSubmit}
                    disabled={
                      (!commentHtml.replace(/<[^>]*>/g, '').trim() &&
                        !/<img\b[^>]*>/i.test(commentHtml)) ||
                      commentLoading
                    }
                  >
                    {commentLoading ? '发送中...' : '发送'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <Sheet open={workflowWorkbenchOpen} onOpenChange={setWorkflowWorkbenchOpen}>
      <SheetContent side="right" className="w-[100vw] sm:max-w-[100vw] p-0 gap-0 flex flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-3 shrink-0">
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {workflowWorkbenchCase?.name || `${detail?.name || '用例'} · 自动化`}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              在此编辑并保存本条用例的自动化。
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setWorkflowWorkbenchOpen(false);
                setWorkflowEmbedCollapsed(false);
              }}
            >
              <Minimize2 className="h-4 w-4" />
              缩小到详情
            </Button>
            <Tabs value={workflowViewMode} onValueChange={(value) => setWorkflowViewMode(value as 'canvas' | 'steps')}>
              <TabsList className="h-9">
                <TabsTrigger value="canvas" className="text-xs">画布</TabsTrigger>
                <TabsTrigger value="steps" className="text-xs">步骤</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                await workflowDesignRef.current?.handleSave();
                await Promise.resolve(loadDetail());
                if (workflowSlotType) {
                  await loadWorkflowRealizationDetail(workflowSlotType).catch(() => null);
                }
              }}
            >
              保存
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={async () => {
                await workflowDesignRef.current?.handleRunWorkflow();
                await Promise.resolve(loadDetail());
                if (workflowSlotType) {
                  await loadWorkflowRealizationDetail(workflowSlotType).catch(() => null);
                }
              }}
            >
              <Play className="h-4 w-4" />
              运行
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {(workflowWorkbenchCase || (caseId && targetRealizationType)) ? (
            <WorkflowDesignPageV2
              ref={workflowDesignRef}
              viewMode={workflowViewMode}
              workflowId={workflowWorkbenchCase?.id}
              caseId={caseId || undefined}
              realizationType={targetRealizationType}
              moduleId={detail?.moduleId}
              projectId={workflowWorkbenchSpace.projectId}
              onSave={async () => {
                await Promise.resolve(loadDetail());
                if (workflowSlotType) {
                  await loadWorkflowRealizationDetail(workflowSlotType).catch(() => null);
                }
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">正在加载…</div>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* 显示设置 */}
    <Sheet open={showSettingSheet} onOpenChange={setShowSettingSheet}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] p-0 gap-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 pr-12 border-b border-gray-100">
          <SheetTitle className="text-base font-medium text-gray-900">详情显示设置</SheetTitle>
          <p className="text-[13px] text-gray-500 font-normal mt-1.5">可开启或关闭 Tab 显示，拖拽可调整顺序</p>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-5 py-4 space-y-5">
          {/* 不可关闭的 Tab */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">固定显示</div>
            <div className="space-y-1">
              {TAB_LIST.filter((t) => !t.canHide).map((t) => (
                <div key={t.value} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50/60 border border-gray-100">
                  <span className="text-[13px] text-gray-700">{t.label}</span>
                  <span className="text-[11px] text-gray-400 font-normal">常驻</span>
                </div>
              ))}
            </div>
          </div>
          {/* 可关闭且可排序的 Tab */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">可选显示 · 拖拽排序</div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTabDragEnd}>
              <SortableContext
                items={closeableTabOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {closeableTabOrder.map((v) => {
                    const t = TAB_LIST.find((x) => x.value === v);
                    if (!t) return null;
                    return (
                    <SortableTabSettingRow
                      key={t.value}
                      id={t.value}
                      label={t.label}
                      checked={visibleTabs[t.value] ?? true}
                      onCheckedChange={(checked) => persistVisibleTabs({ ...visibleTabs, [t.value]: checked })}
                    />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
        <div className="border-t border-gray-100 px-5 py-3 shrink-0">
          <Button variant="outline" size="sm" className="w-full text-[13px] font-normal text-gray-600 border-gray-200" onClick={handleResetSettings}>
            恢复默认
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除用例 &quot;{currentItem?.name}&quot; 吗？此操作不可恢复。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={deleteRealizationDialogOpen} onOpenChange={setDeleteRealizationDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            确认清除{targetRealizationToDelete?.realizationType === 'API' ? '接口' : '自动化'}配置
          </AlertDialogTitle>
          <AlertDialogDescription>
            确定要清除当前用例已配置的{targetRealizationToDelete?.realizationType === 'API' ? ' API 接口/工作流' : '自动化工作流'}配置吗？清除后将重置为未配置状态，相关工作流节点将被清除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setTargetRealizationToDelete(null)}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDeleteRealization}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            确认清除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
