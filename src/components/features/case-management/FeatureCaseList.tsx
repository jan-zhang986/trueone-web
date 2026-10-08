/**
 * 用例主视图
 * 用户在这里看到统一的 Case 资产，realization 作为用例下的实现视角呈现
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers3, Sparkles, Workflow, Bot } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import type { CaseItem } from './types';
import { useModuleTree } from './hooks/useModuleTree';
import { useCaseList, type SortOption } from './hooks/useCaseList';
import { useCaseManagementPermission } from './hooks/useCaseManagementPermission';
import { ModuleTreePanel, CaseListToolbar, CaseTableSection, CaseDetailDrawer, VersionMergeDrawer, RepoCaseExplorer } from './components';
import { CaseFilterDrawer, loadSavedViews } from './components/CaseFilterDrawer';
import { CaseExportDrawer, type ExportType } from './components/CaseExportDrawer';
import { BatchEditModal } from './components/BatchEditModal';
import { BatchMoveCopyDrawer } from './components/BatchMoveCopyDrawer';
import { BatchAddDemandModal } from './components/BatchAddDemandModal';
import { BatchLinkDemandDrawer } from './components/BatchLinkDemandDrawer';
import { ColumnSettingsSheet, loadVisibleColumns as loadCols, loadColumnOrder as loadOrder, loadColumnWidths, saveColumnWidths } from './components/ColumnSettingsSheet';
import { collectOffspringIds, moduleExistsInTree } from './utils/collectOffspringIds';

/** 稳定空数组引用，避免 offspringIds 每次产生新引用导致 useCaseList 无限刷新 */
const EMPTY_OFFSPRING_IDS: string[] = [];
import { ImportCaseDrawer } from './ImportCaseDrawer';
import { projectManagementService, caseManagementService } from '@/services';
import { metadataModuleService } from '@/services/metadata-module';
import { FeatureCaseMinderView } from './FeatureCaseMinderView';
import { toast } from 'sonner';
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

interface FeatureCaseListProps {
  projectId?: string;
  /** 当前 Space。新产品主路径要求先进入 Space，再维护 Case。 */
  spaceId?: string;
  /** 选中的用例库 ID / 名称 (用于项目内多用例库隔离) */
  repositoryId?: string;
  /** 分享链接打开时，从 URL 传入的 caseId，用于自动打开详情抽屉 */
  initialCaseId?: string | null;
  /** 初始选中的目录 ID（编辑/取消返回后恢复用） */
  initialSelectedModuleId?: string | null;
  /** 查看/编辑时打开抽屉；抽屉内点击「编辑」会调用此回调跳转全页编辑 */
  onViewCase?: (item: CaseItem, selectedModuleId?: string) => void;
  /** 跳转全页编辑；第二参为当前选中目录 ID，用于返回时恢复目录 */
  onEditCase?: (item: CaseItem, selectedModuleId?: string) => void;
  /** 复制用例时跳转 */
  onCopyCase?: (item: CaseItem, selectedModuleId?: string) => void;
  /** 新建用例；若支持传入当前目录则返回时停留在该目录 */
  onCreateCase?: (selectedModuleId?: string) => void;
  onDeleteCase?: (item: CaseItem) => void;
  onNavigateToRecycle?: () => void;
  onAiGenerate?: () => void;
  /** 是否隐藏内部的模块目录树（配合父组件展示成两栏） */
  hideModuleTree?: boolean;
  /** 外部传入的选中模块 ID */
  externalSelectedModuleId?: string;
  /** 选中的版本基线 / 分支 */
  versionId?: string;
  /** 版本基线 / 分支变更回调 */
  onVersionChange?: (versionId: string) => void;
}

export function FeatureCaseList({
  projectId = localStorage.getItem('currentProjectId') || 'default-project',
  spaceId,
  repositoryId,
  initialCaseId,
  initialSelectedModuleId,
  onViewCase,
  onEditCase,
  onCopyCase,
  onCreateCase,
  onDeleteCase,
  onNavigateToRecycle,
  onAiGenerate,
  hideModuleTree = false,
  externalSelectedModuleId,
  versionId: propVersionId,
  onVersionChange,
}: FeatureCaseListProps) {
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => urlSearchParams.get('keyword') || '');
  const [searchKeyword, setSearchKeyword] = useState(() => urlSearchParams.get('keyword') || '');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(() => (initialSelectedModuleId && initialSelectedModuleId !== 'all' ? initialSelectedModuleId : 'all'));
  const [moduleSearchKeyword, setModuleSearchKeyword] = useState('');
  const [showType, setShowType] = useState<'repo' | 'list' | 'minder'>('repo');
  const [viewId, setViewId] = useState<string>('all_data');
  const [filter, setFilter] = useState<{ searchMode: 'AND' | 'OR'; conditions: any[] } | undefined>(() => {
    const f = urlSearchParams.get('filter');
    if (f) {
      try {
        return JSON.parse(decodeURIComponent(f));
      } catch (e) {
        console.error('解析 URL filter 参数失败:', e);
      }
    }
    return undefined;
  });
  const [customViews, setCustomViews] = useState<{ id: string; name: string }[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [memberOptions, setMemberOptions] = useState<{ id: string; name: string }[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCaseId, setDrawerCaseId] = useState<string | null>(initialCaseId ?? null);
  const [drawerPreferredTab, setDrawerPreferredTab] = useState<'detail' | 'realization'>('detail');
  const [versionId, setVersionId] = useState<string>(() => propVersionId || '');
  const [currentVersion, setCurrentVersion] = useState<any>(null);
  const [mergeDrawerOpen, setMergeDrawerOpen] = useState(false);

  useEffect(() => {
    if (propVersionId) setVersionId(propVersionId);
  }, [propVersionId]);

  useEffect(() => {
    if (initialCaseId) {
      setDrawerCaseId(initialCaseId);
      setDrawerPreferredTab('detail');
      setDrawerOpen(true);
    } else if (initialCaseId === null) {
      setDrawerCaseId(null);
      setDrawerOpen(false);
    }
  }, [initialCaseId]);

  // 同步外部选中的模块ID
  useEffect(() => {
    if (externalSelectedModuleId !== undefined && externalSelectedModuleId !== selectedModuleId) {
      setSelectedModuleId(externalSelectedModuleId);
    }
  }, [externalSelectedModuleId, selectedModuleId]);

  // 编辑/取消返回后恢复指定目录
  useEffect(() => {
    if (initialSelectedModuleId != null && initialSelectedModuleId !== '' && initialSelectedModuleId !== selectedModuleId) {
      setSelectedModuleId(initialSelectedModuleId);
    }
  }, [initialSelectedModuleId, selectedModuleId]);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('exportExcel');
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [batchMoveCopyOpen, setBatchMoveCopyOpen] = useState(false);
  const [batchMoveCopyIsMove, setBatchMoveCopyIsMove] = useState(true);
  const [batchAddDemandOpen, setBatchAddDemandOpen] = useState(false);
  const [batchLinkDemandOpen, setBatchLinkDemandOpen] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => loadCols());
  const [columnOrder, setColumnOrder] = useState<string[]>(() => loadOrder());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => loadColumnWidths());
  const [sort, setSort] = useState<SortOption | null>(null);
  const [columnFilter, setColumnFilter] = useState<Record<string, string[]>>({});
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const showLegacyVersionControls = false;

  useEffect(() => {
    const views = loadSavedViews();
    setCustomViews(views.map((v) => ({ id: v.id, name: v.name })));
  }, [filterDrawerOpen, viewId]);

  useEffect(() => {
    if (viewId.startsWith('custom_')) {
      const views = loadSavedViews();
      const v = views.find((x) => x.id === viewId);
      if (v?.filter) setFilter(v.filter);
    } else if (viewId === 'all_data') {
      setFilter(undefined);
    } else {
      setFilter(undefined);
    }
  }, [viewId]);

  useEffect(() => {
    projectManagementService.getProjectMemberOptions(projectId).then((res: any) => {
      const list = Array.isArray(res) ? res : res?.list ?? res?.data ?? [];
      setMemberOptions(list.map((m: any) => ({ id: m.id, name: m.name || m.userName || '-' })));
    }).catch(() => setMemberOptions([]));
  }, [projectId]);

  const {
    moduleTree,
    modulesCount,
    expandedNodes,
    toggleNodeExpand,
    expandAll,
    collapseAll,
    isExpandAll,
    expandPathToNode,
    fetchModuleTree,
    fetchModulesCount,
    treeLoaded,
  } = useModuleTree({ projectId, spaceId, repositoryId, searchKeyword });

  // 展开树到选中节点（须在 useModuleTree 之后）
  useEffect(() => {
    if (
      initialSelectedModuleId
      && initialSelectedModuleId !== 'all'
      && moduleTree.length > 0
    ) {
      expandPathToNode(initialSelectedModuleId);
    }
  }, [initialSelectedModuleId, moduleTree, expandPathToNode]);

  const [recycleCount, setRecycleCount] = useState<number | undefined>(undefined);
  const fetchRecycleCount = useCallback(async () => {
    try {
      const result = await caseManagementService.getRecycleModulesCounts({
        projectId,
        moduleIds: [],
        current: 1,
        pageSize: 10,
      });
      const count =
        typeof result === 'object' && result !== null && 'all' in result && typeof (result as { all?: number }).all === 'number'
          ? (result as { all: number }).all
          : 0;
      setRecycleCount(count);
    } catch (err) {
      console.error('获取回收站数量失败:', err);
      setRecycleCount(0);
    }
  }, [projectId]);
  useEffect(() => {
    fetchRecycleCount();
  }, [fetchRecycleCount]);

  const permission = useCaseManagementPermission(projectId);

  const offspringIds = useMemo(() => {
    if (!selectedModuleId || selectedModuleId === 'all') return EMPTY_OFFSPRING_IDS;
    const ids = collectOffspringIds(moduleTree, selectedModuleId);
    return ids.length > 0 ? ids : EMPTY_OFFSPRING_IDS;
  }, [moduleTree, selectedModuleId]);

  const initialPageFromUrl = useMemo(() => {
    const p = urlSearchParams.get('currentPage');
    if (p == null || p === '') return undefined;
    const n = parseInt(p, 10);
    return Number.isFinite(n) && n >= 1 ? n : undefined;
  }, [urlSearchParams]);
  const initialPageSizeFromUrl = useMemo(() => {
    const p = urlSearchParams.get('pageSize');
    if (p == null || p === '') return undefined;
    const n = parseInt(p, 10);
    return Number.isFinite(n) && n >= 1 ? n : undefined;
  }, [urlSearchParams]);

  const listFilter = useMemo(() => {
    const baseFilter = {
      searchMode: filter?.searchMode ?? 'AND',
      conditions: filter?.conditions ?? [],
      ...filter,
    };
    return showLegacyVersionControls
      ? { ...baseFilter, versionId: versionId || undefined }
      : baseFilter;
  }, [filter, showLegacyVersionControls, versionId]);

  const {
    loading,
    caseList,
    selectedCases,
    currentPage,
    pageSize,
    onPageSizeChange,
    total,
    totalPages,
    fetchCaseList,
    updateItemInList,
    setPage,
    resetPage,
    isAllSelected,
    handleSelectAll,
    handleSelectCase,
    clearSelection,
  } = useCaseList({
    projectId,
    spaceId,
    repositoryId,
    selectedModuleId,
    offspringIds,
    searchKeyword,
    modulesCount,
    viewId,
    filter: listFilter,
    sort,
    columnFilter,
    versionId,
    onFetchSuccess: fetchModulesCount,
    initialCurrentPage: initialPageFromUrl,
    initialPageSize: initialPageSizeFromUrl,
  });

  // 刷新后：若 URL 中的 moduleId 不在当前用例管理模块树中（例如来自测试计划页），则回退为「全部」并重拉列表，避免表格一直为空
  useEffect(() => {
    if (!treeLoaded || selectedModuleId === 'all') return;
    const invalid =
      moduleTree.length === 0 || !moduleExistsInTree(moduleTree, selectedModuleId);
    if (invalid) {
      setSelectedModuleId('all');
      resetPage();
      const next = new URLSearchParams(urlSearchParams);
      next.delete('moduleId');
      next.delete('treeTab');
      setUrlSearchParams(next, { replace: true });
    }
  }, [treeLoaded, moduleTree, selectedModuleId, urlSearchParams, setUrlSearchParams, resetPage]);

  const handlePageChange = useCallback((page: number) => {
    setPage(page);
    const next = new URLSearchParams(urlSearchParams);
    if (page <= 1) next.delete('currentPage');
    else next.set('currentPage', String(page));
    setUrlSearchParams(next, { replace: true });
  }, [urlSearchParams, setUrlSearchParams, setPage]);

  const handlePageSizeChange = useCallback((size: number) => {
    onPageSizeChange(size);
    const next = new URLSearchParams(urlSearchParams);
    if (size === 20) next.delete('pageSize');
    else next.set('pageSize', String(size));
    next.delete('currentPage');
    setUrlSearchParams(next, { replace: true });
  }, [urlSearchParams, setUrlSearchParams, onPageSizeChange]);

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    resetPage();
    const next = new URLSearchParams(urlSearchParams);
    if (moduleId && moduleId !== 'all') {
      next.set('moduleId', moduleId);
    } else {
      next.delete('moduleId');
    }
    setUrlSearchParams(next, { replace: true });
  };

  const handleSearch = () => {
    const kw = searchInput.trim();
    setSearchKeyword(kw);
    resetPage();
    const next = new URLSearchParams(urlSearchParams);
    if (kw) next.set('keyword', kw);
    else next.delete('keyword');
    setUrlSearchParams(next, { replace: true });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchKeyword('');
    resetPage();
    const next = new URLSearchParams(urlSearchParams);
    next.delete('keyword');
    setUrlSearchParams(next, { replace: true });
  };

  const handleBatchDelete = () => {
    if (selectedCases.length === 0) return;
    setBatchDeleteDialogOpen(true);
  };

  const handleBatchDeleteConfirm = async () => {
    if (selectedCases.length === 0) {
      setBatchDeleteDialogOpen(false);
      return;
    }
    try {
      if (spaceId) {
        await caseManagementService.batchDeleteUnifiedCase(selectedCases);
      } else {
        await caseManagementService.batchDeleteCase({
          projectId,
          selectIds: selectedCases,
          selectAll: false,
          excludeIds: [],
          moduleIds: selectedModuleId === 'all' ? [] : [selectedModuleId, ...offspringIds],
          condition: filter as any,
        });
      }
      clearSelection();
      fetchCaseList({ silent: true });
      fetchModulesCount();
      fetchRecycleCount();
      toast.success('批量删除成功');
      setBatchDeleteDialogOpen(false);
    } catch (err: any) {
      console.error('批量删除失败:', err);
      toast.error(err?.message || '批量删除失败');
      // 保持弹窗打开，方便用户重试或取消
    }
  };

  /** 单个删除用例（进入回收站）；若父组件未传 onDeleteCase 则使用此默认实现 */
  const handleDeleteCase = useCallback(
    async (item: CaseItem) => {
      if (!item?.id) return;
      try {
        if (spaceId || item.spaceId) {
          await caseManagementService.deleteUnifiedCase(item.caseId || item.id);
        } else {
          await caseManagementService.deleteCaseRequest({
            id: item.id,
            projectId: item.projectId ?? projectId,
          });
        }
        toast.success('删除成功');
        fetchCaseList({ silent: true });
        fetchModulesCount();
        fetchRecycleCount();
      } catch (err: any) {
        console.error('单个删除失败:', err);
        toast.error(err?.message || '删除失败');
      }
    },
    [projectId, spaceId, fetchCaseList, fetchModulesCount, fetchRecycleCount]
  );

  /** 打开用例详情抽屉（查看/编辑均走抽屉） */
  const handleOpenDrawer = (item: CaseItem) => {
    setDrawerPreferredTab('detail');
    setDrawerCaseId(item.id);
    setDrawerOpen(true);
  };

  const handleOpenRealizationDrawer = (item: CaseItem) => {
    setDrawerPreferredTab('realization');
    setDrawerCaseId(item.id);
    setDrawerOpen(true);
  };

  /** 抽屉内点击编辑 → 关闭抽屉并跳转全页编辑，带上当前目录以便返回时恢复 */
  const handleDrawerEdit = (item: CaseItem) => {
    setDrawerOpen(false);
    onEditCase?.(item, selectedModuleId);
  };

  /** 抽屉内点击复制 → 关闭抽屉并跳转复制页 */
  const handleDrawerCopy = (item: CaseItem) => {
    setDrawerOpen(false);
    onCopyCase?.(item, selectedModuleId);
  };

  const handleImportSuccess = () => {
    fetchCaseList();
    fetchModulesCount();
  };

  const handleBatchSuccess = () => {
    fetchCaseList();
    fetchModulesCount();
    clearSelection();
  };

  const handleBatchExport = async (type: ExportType) => {
    try {
      const res: any = await caseManagementService.checkCaseExportTask();
      const hasTask = (res?.fileId && (Array.isArray(res.fileId) ? res.fileId.length > 0 : true))
        || res?.taskId;
      if (hasTask) {
        toast.error('已有导出任务进行中，请等待完成或稍后再试');
        return;
      }
    } catch {
      // 检查接口失败时仍允许打开抽屉
    }
    setExportType(type);
    setExportDrawerOpen(true);
  };

  const handleSortChange = (field: string, order: 'asc' | 'desc' | null) => {
    setSort(order && field ? { field, order } : null);
    resetPage();
  };

  /**
   * 与原项目 aegis-next-server caseTable getCustomMaps 一致：详情接口返回的 customFields 使用 defaultValue 作为提交值（value 可能为空）
   * 仅改名称时必须用 defaultValue 回填，否则会把用例等级等自定义字段清空
   */
  const getCustomMaps = (detailResult: any) => {
    const customFields = detailResult?.customFields ?? [];
    return customFields.map((f: any) => ({
      fieldId: f.fieldId ?? f.internalFieldKey ?? '',
      value: Array.isArray(f.defaultValue) ? JSON.stringify(f.defaultValue) : (f.defaultValue != null ? String(f.defaultValue) : (Array.isArray(f.value) ? JSON.stringify(f.value) : (f.value != null ? String(f.value) : ''))),
    }));
  };

  /** 与 CaseDetailDrawer getUpdateParams 一致：拼 request + fileList */
  const buildUpdateRequest = (detail: any, overrides: Record<string, unknown>) => {
    const customFieldsArr = (overrides.customFields as any[] | undefined) ?? getCustomMaps(detail);
    return {
      request: {
        ...detail,
        id: detail?.id,
        projectId: overrides.projectId || detail?.projectId || projectId || localStorage.getItem('currentProjectId') || 'default-project',
        templateId: overrides.templateId || detail?.templateId || 'default-template',
        moduleId: overrides.moduleId || detail?.moduleId,
        name: overrides.name || detail?.name || detail?.title || '',
        caseEditType: overrides.caseEditType || detail?.caseEditType || (detail?.steps ? 'STEP' : 'TEXT'),
        versionId: overrides.versionId || detail?.versionId,
        deleteFileMetaIds: [],
        unLinkFilesIds: [],
        newAssociateFileListIds: [],
        caseDetailFileIds: [],
        customFields: customFieldsArr,
        ...overrides,
      },
      fileList: [] as File[],
    };
  };

  const buildUnifiedInlineSavePayload = (detail: any, overrides: Record<string, unknown>) => {
    const caseId = detail?.caseId || detail?.id;
    return {
      caseId,
      projectId: detail?.projectId || projectId,
      spaceId: detail?.spaceId || spaceId,
      moduleId: detail?.moduleId,
      title: detail?.title || detail?.name || '',
      description: detail?.description,
      precondition: detail?.precondition || detail?.prerequisite,
      expectedResult: detail?.expectedResult,
      priority: detail?.priority,
      ownerId: detail?.ownerId || detail?.createUser,
      sourceType: detail?.sourceType,
      lifecycleStatus: detail?.lifecycleStatus || detail?.reviewStatus,
      workflowId: detail?.workflowId,
      tags: Array.isArray(detail?.tags) ? detail.tags : [],
      metadata: detail?.metadata || {},
      realizations: Array.isArray(detail?.realizations) ? detail.realizations : undefined,
      ...overrides,
    };
  };

  const isUnifiedSpaceCase = (item: CaseItem) => Boolean(spaceId || item.spaceId);

  const handleNameChange = async (item: CaseItem, name: string) => {
    try {
      if (isUnifiedSpaceCase(item)) {
        const detail: any = await caseManagementService.getUnifiedCaseDetail(item.caseId || item.id);
        await caseManagementService.saveUnifiedCase(buildUnifiedInlineSavePayload(detail, { title: name }));
        updateItemInList(item.id, { name, title: name });
        toast.success('名称已更新');
        return;
      }
      const detail: any = await caseManagementService.getCaseDetail(item.id);
      const payload = buildUpdateRequest(detail, { id: item.id, name, title: name });
      await caseManagementService.updateCaseRequest(payload);
      updateItemInList(item.id, { name });
      toast.success('名称已更新');
    } catch (err: any) {
      toast.error(err?.message || '更新失败');
    }
  };

  const handleDragSort = async (moveId: string, targetId: string, moveMode: 'BEFORE' | 'AFTER') => {
    try {
      await caseManagementService.dragSort({ projectId, moveId, targetId, moveMode });
      toast.success('排序成功');
      fetchCaseList({ silent: true });
      fetchModulesCount();
    } catch (err: any) {
      toast.error(err?.message || '排序失败');
    }
  };

  const handleColumnFilterChange = (dataIndex: string, value: string[] | null) => {
    setColumnFilter((prev) => {
      const next = { ...prev };
      if (value?.length) next[dataIndex] = value;
      else delete next[dataIndex];
      return next;
    });
    resetPage();
  };

  const handleCaseLevelChange = async (item: CaseItem, level: string) => {
    try {
      // 解析为数字优先级 (P0-P3 -> 1-4)
      let numericPriority: number | undefined;
      if (level.startsWith('P')) {
        const num = parseInt(level.substring(1), 10);
        if (!isNaN(num)) numericPriority = num + 1;
      }

      if (isUnifiedSpaceCase(item)) {
        const detail: any = await caseManagementService.getUnifiedCaseDetail(item.caseId || item.id);
        await caseManagementService.saveUnifiedCase(
          buildUnifiedInlineSavePayload(detail, {
            priority: numericPriority,
            metadata: {
              ...(detail?.metadata || {}),
              functionalPriority: level,
            },
          })
        );
        updateItemInList(item.id, { caseLevel: level, priority: numericPriority, functionalPriority: level });
        toast.success('用例等级已更新');
        return;
      }
      const detail: any = await caseManagementService.getCaseDetail(item.id);
      const { customFields } = detail;
      const customFieldsList = (customFields ?? []).map((f: any) => {
        const isPriority = f?.internalFieldKey === 'functional_priority' || f?.fieldId === 'functional_priority';
        const val = isPriority ? level : (Array.isArray(f.defaultValue) ? JSON.stringify(f.defaultValue) : (f.defaultValue != null ? String(f.defaultValue) : (f.value != null ? String(f.value) : '')));
        return { fieldId: f.fieldId ?? f.internalFieldKey ?? '', value: val };
      });
      const hasPriority = customFieldsList.some((f: any) => f.fieldId === 'functional_priority');
      if (!hasPriority) customFieldsList.push({ fieldId: 'functional_priority', value: level });

      const payload = buildUpdateRequest(detail, { 
        id: item.id, 
        customFields: customFieldsList,
        priority: numericPriority,
        functionalPriority: level 
      });
      await caseManagementService.updateCaseRequest(payload);
      updateItemInList(item.id, { caseLevel: level });
      toast.success('用例等级已更新');
    } catch (err: any) {
      toast.error(err?.message || '更新失败');
    }
  };

  const handleModuleChange = async (item: CaseItem, moduleId: string) => {
    try {
      if (isUnifiedSpaceCase(item)) {
        const detail: any = await caseManagementService.getUnifiedCaseDetail(item.caseId || item.id);
        await caseManagementService.saveUnifiedCase(buildUnifiedInlineSavePayload(detail, { moduleId }));
        updateItemInList(item.id, { moduleId });
        toast.success('所属模块已更新');
        fetchModulesCount();
        return;
      }
      const detail: any = await caseManagementService.getCaseDetail(item.id);
      const payload = buildUpdateRequest(detail, { id: item.id, moduleId });
      await caseManagementService.updateCaseRequest(payload);
      updateItemInList(item.id, { moduleId });
      toast.success('所属模块已更新');
      fetchModulesCount();
    } catch (err: any) {
      toast.error(err?.message || '更新失败');
    }
  };

  const batchParams = {
    selectedIds: selectedCases,
    selectAll: false,
    excludeIds: [] as string[],
    projectId,
    activeFolder: selectedModuleId,
    offspringIds,
    condition: filter as Record<string, unknown> | undefined,
  };

  const allModuleCount = modulesCount['all'] ?? modulesCount['ALL'] ?? total;

  const caseFirstSummary = useMemo(() => {
    const scopedTotal = total || caseList.length;
    const automatedCases = caseList.filter((item) => item.realizationSummary?.hasAutomationRealization).length;
    const fullyAutomatedCases = caseList.filter((item) => item.realizationSummary?.automationCoverageStatus === 'AUTOMATED_ONLY').length;
    const partialCases = caseList.filter((item) => item.realizationSummary?.automationCoverageStatus === 'PARTIAL').length;
    const coveredTypes = Array.from(new Set(
      caseList.flatMap((item) => Array.isArray(item.realizationSummary?.coveredTypes) ? item.realizationSummary?.coveredTypes : [])
    ));
    return {
      scopedTotal,
      automatedCases,
      fullyAutomatedCases,
      partialCases,
      coveredTypes,
    };
  }, [caseList, total]);

  const rightContent = (
    <Card className="flex-1 flex flex-col gap-0 m-2 min-h-0 overflow-hidden bg-white">
      <CaseListToolbar
        searchInput={searchInput}
        searchKeyword={searchKeyword}
        loading={loading}
        showType={showType}
        viewId={viewId}
        customViews={customViews}
        hasActiveFilter={!!filter?.conditions?.length}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        onRefresh={fetchCaseList}
        onShowTypeChange={setShowType}
        onColumnSettingsClick={() => setColumnSettingsOpen(true)}
        onViewChange={(id) => { setViewId(id); resetPage(); }}
        onFilterClick={() => setFilterDrawerOpen(true)}
        onClearFilter={() => { setFilter(undefined); setViewId('all_data'); resetPage(); }}
        onCreateCase={onCreateCase ? () => onCreateCase(selectedModuleId) : undefined}
        onImportOpen={() => setImportOpen(true)}
        onAiGenerate={onAiGenerate}
        projectId={projectId}
        showVersionControls={showLegacyVersionControls}
        versionId={versionId}
        onVersionChange={setVersionId}
        onVersionSelect={setCurrentVersion}
        onMergeClick={() => setMergeDrawerOpen(true)}
      />
      <CaseFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        viewName={loadSavedViews().find((v) => v.id === viewId)?.name ?? (viewId === 'my_follow' ? '我关注的' : viewId === 'my_create' ? '我创建的' : '全部数据')}
        moduleTree={moduleTree}
        memberOptions={memberOptions}
        initialFilter={filter}
        onFilter={(f) => {
          setFilter(f);
          resetPage();
          const next = new URLSearchParams(urlSearchParams);
          if (f && f.conditions?.length > 0) next.set('filter', encodeURIComponent(JSON.stringify(f)));
          else next.delete('filter');
          setUrlSearchParams(next, { replace: true });
        }}
        onSaveAsView={(name, f, newViewId) => {
          setFilter(f);
          setViewId(newViewId);
          setCustomViews(loadSavedViews().map((v) => ({ id: v.id, name: v.name })));
          resetPage();
          const next = new URLSearchParams(urlSearchParams);
          if (f && f.conditions?.length > 0) next.set('filter', encodeURIComponent(JSON.stringify(f)));
          else next.delete('filter');
          setUrlSearchParams(next, { replace: true });
        }}
      />
      <CardContent className="flex-1 flex flex-col p-2 pt-0 min-h-0">
        <ImportCaseDrawer
          open={importOpen}
          onOpenChange={setImportOpen}
          projectId={projectId}
          onSuccess={handleImportSuccess}
        />

        {showType === 'minder' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <FeatureCaseMinderView
              projectId={projectId}
              spaceId={spaceId}
              moduleId={selectedModuleId !== 'all' ? selectedModuleId : undefined}
              modulesCount={modulesCount}
              onViewCase={(caseId) => {
                const item = caseList.find((c) => c.id === caseId) || ({ id: caseId } as CaseItem);
                handleOpenDrawer(item);
              }}
              onSave={() => {
                fetchModuleTree();
                fetchModulesCount();
                fetchCaseList();
              }}
            />
          </div>
        ) : (
          <>
            <CaseTableSection
              loading={loading}
              caseList={caseList}
              moduleTree={moduleTree}
              selectedCases={selectedCases}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              total={total}
              totalPages={totalPages}
              isAllSelected={isAllSelected}
              onSelectAll={(checked) => handleSelectAll(checked === true)}
              onSelectCase={handleSelectCase}
              onPageChange={handlePageChange}
              onViewCase={handleOpenDrawer}
              onViewRealizationCase={handleOpenRealizationDrawer}
              onEditCase={(item) => onEditCase?.(item, selectedModuleId)}
              onCopyCase={(item) => onCopyCase?.(item, selectedModuleId)}
              onDeleteCase={onDeleteCase ?? handleDeleteCase}
              onBatchDelete={handleBatchDelete}
              onBatchExport={handleBatchExport}
              onBatchEdit={() => setBatchEditOpen(true)}
              onBatchMove={() => { setBatchMoveCopyIsMove(true); setBatchMoveCopyOpen(true); }}
              onBatchCopy={() => { setBatchMoveCopyIsMove(false); setBatchMoveCopyOpen(true); }}
              onClearSelection={clearSelection}
              onCaseLevelChange={permission.canEdit ? handleCaseLevelChange : undefined}
              onModuleChange={permission.canEdit ? handleModuleChange : undefined}
              onNameChange={permission.canEdit ? handleNameChange : undefined}
              onSortChange={handleSortChange}
              onDragSort={handleDragSort}
              onColumnFilterChange={handleColumnFilterChange}
              onBatchAddDemand={permission.canEdit ? () => setBatchAddDemandOpen(true) : undefined}
              onBatchLinkDemand={permission.canEdit ? () => setBatchLinkDemandOpen(true) : undefined}
              onColumnSettingsClick={() => setColumnSettingsOpen(true)}
              sort={sort}
              columnFilter={columnFilter}
              updateUserFilterOptions={memberOptions.map((m) => ({ value: m.id, label: m.name }))}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              columnWidths={columnWidths}
              onColumnWidthChange={(key, width) => {
                setColumnWidths((prev) => {
                  const next = { ...prev, [key]: width };
                  saveColumnWidths(next);
                  return next;
                });
              }}
              canEdit={permission.canEdit}
              canCopy={permission.canCopy}
              canDelete={permission.canDelete}
            />
            <CaseExportDrawer
              open={exportDrawerOpen}
              onOpenChange={setExportDrawerOpen}
              exportType={exportType}
              selectCount={selectedCases.length > 0 ? selectedCases.length : total}
              selectAll={selectedCases.length === 0}
              params={{
                projectId,
                selectIds: selectedCases.length > 0 ? selectedCases : [],
                selectAll: selectedCases.length === 0,
                excludeIds: [],
                moduleIds: selectedModuleId === 'all' ? [] : [selectedModuleId, ...offspringIds],
                condition: filter as Record<string, unknown> | undefined,
              }}
              onSuccess={handleBatchSuccess}
            />
            <BatchEditModal
              open={batchEditOpen}
              onOpenChange={setBatchEditOpen}
              batchParams={batchParams}
              onSuccess={handleBatchSuccess}
            />
            <BatchMoveCopyDrawer
              open={batchMoveCopyOpen}
              onOpenChange={setBatchMoveCopyOpen}
              isMove={batchMoveCopyIsMove}
              selectCount={selectedCases.length}
              params={batchParams}
              moduleTree={moduleTree}
              onSuccess={handleBatchSuccess}
            />
            <BatchAddDemandModal
              open={batchAddDemandOpen}
              onOpenChange={setBatchAddDemandOpen}
              batchParams={batchParams}
              onSuccess={handleBatchSuccess}
            />
            <BatchLinkDemandDrawer
              open={batchLinkDemandOpen}
              onOpenChange={setBatchLinkDemandOpen}
              batchParams={batchParams}
              onSuccess={handleBatchSuccess}
            />
            <ColumnSettingsSheet
              open={columnSettingsOpen}
              onOpenChange={setColumnSettingsOpen}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
            />
          </>
        )}
        <CaseDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          caseId={drawerCaseId}
          caseList={caseList}
          caseIndex={caseList.findIndex((c) => c.id === drawerCaseId)}
          moduleTree={moduleTree}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          projectId={projectId}
          onEdit={handleDrawerEdit}
          onCopy={handleDrawerCopy}
          onCreate={onCreateCase ? () => onCreateCase(selectedModuleId) : undefined}
          onSuccess={() => {
            fetchCaseList();
            fetchModuleTree();
            fetchModulesCount();
          }}
          preferredTab={drawerPreferredTab}
          onCaseSelect={(item) => {
            setDrawerCaseId(item.id);
            const next = new URLSearchParams(urlSearchParams);
            next.set('caseId', item.id);
            setUrlSearchParams(next, { replace: true });
          }}
          canEdit={permission.canEdit}
          canCopy={permission.canCopy}
          canDelete={permission.canDelete}
          canShare={permission.canShare}
          canFollow={permission.canFollow}
          canComment={permission.canComment}
        />
        <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认批量删除</AlertDialogTitle>
              <AlertDialogDescription>
                将删除选中的 {selectedCases.length} 个用例，用例将进入回收站。确定继续吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={handleBatchDeleteConfirm}
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );

  if (hideModuleTree) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">
        {rightContent}
        {showLegacyVersionControls && (
          <VersionMergeDrawer
            open={mergeDrawerOpen}
            onOpenChange={setMergeDrawerOpen}
            projectId={projectId}
            onSuccess={fetchCaseList}
          />
        )}
      </div>
    );
  }

  if (showType === 'repo') {
    return (
      <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">
        <CaseListToolbar
          searchInput={searchInput}
          searchKeyword={searchKeyword}
          loading={loading}
          showType={showType}
          viewId={viewId}
          customViews={customViews}
          hasActiveFilter={!!filter?.conditions?.length}
          onSearchInputChange={setSearchInput}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          onRefresh={fetchCaseList}
          onShowTypeChange={setShowType}
          onColumnSettingsClick={() => setColumnSettingsOpen(true)}
          onViewChange={(id) => { setViewId(id); resetPage(); }}
          onFilterClick={() => setFilterDrawerOpen(true)}
          onClearFilter={() => { setFilter(undefined); setViewId('all_data'); resetPage(); }}
          onCreateCase={onCreateCase ? () => onCreateCase(selectedModuleId) : undefined}
          onImportOpen={() => setImportOpen(true)}
          onAiGenerate={onAiGenerate}
          projectId={projectId}
          showVersionControls={showLegacyVersionControls}
          versionId={versionId}
          onVersionChange={setVersionId}
          onVersionSelect={setCurrentVersion}
          onMergeClick={() => setMergeDrawerOpen(true)}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          <RepoCaseExplorer
            initialRepoName={repositoryId}
            branch={versionId}
            onBranchChange={(newBranch) => {
              setVersionId(newBranch);
              onVersionChange?.(newBranch);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <ModuleTreePanel
            moduleTree={moduleTree}
            modulesCount={modulesCount}
            expandedNodes={expandedNodes}
            selectedModuleId={selectedModuleId}
            moduleSearchKeyword={moduleSearchKeyword}
            allModuleCount={allModuleCount}
            onModuleSearchChange={setModuleSearchKeyword}
            onModuleSelect={handleModuleSelect}
            onToggleExpand={toggleNodeExpand}
            isExpandAll={isExpandAll}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onCreateCase={onCreateCase ? () => onCreateCase(selectedModuleId) : undefined}
            onNavigateToRecycle={onNavigateToRecycle}
            recycleCount={recycleCount}
            projectId={projectId}
            onAddSubModule={async (parentId, name) => {
              if (spaceId) {
                await metadataModuleService.createModule({
                  projectId,
                  name,
                  parentId: parentId === 'NONE' ? 'ROOT' : parentId,
                  moduleType: 'WORKFLOW',
                  typeId: spaceId,
                });
              } else {
                await caseManagementService.createCaseModuleTree({ projectId, name, parentId: parentId === 'NONE' ? 'NONE' : parentId });
              }
              toast.success('添加成功');
              fetchModuleTree();
              fetchModulesCount();
            }}
            onRenameModule={async (nodeId, name) => {
              if (spaceId) {
                await metadataModuleService.updateModule({ id: nodeId, name });
              } else {
                await caseManagementService.updateCaseModuleTree({ id: nodeId, name });
              }
              toast.success('重命名成功');
              fetchModuleTree();
              fetchModulesCount();
            }}
            onDeleteModule={async (nodeId) => {
              if (spaceId) {
                await metadataModuleService.deleteModule(nodeId);
              } else {
                await caseManagementService.deleteCaseModuleTree(nodeId);
              }
              toast.success('删除成功');
              if (selectedModuleId === nodeId) setSelectedModuleId('all');
              fetchModuleTree();
              fetchModulesCount();
              fetchCaseList();
            }}
            onCopyModule={spaceId ? undefined : async (sourceId, targetId) => {
              try {
                await caseManagementService.copyModuleWithCases({
                  projectId,
                  sourceModuleId: sourceId,
                  targetModuleId: targetId,
                });
                toast.success('复制模块成功');
                fetchModuleTree();
                fetchModulesCount();
                fetchCaseList();
              } catch (err: any) {
                const msg =
                  err?.message ||
                  err?.response?.data?.message ||
                  err?.response?.data?.msg ||
                  '复制模块失败';
                toast.error(msg);
                throw err;
              }
            }}
            onMoveModule={spaceId ? undefined : async (dragNodeId, dropNodeId, dropPosition) => {
              await caseManagementService.moveCaseModuleTree({
                dragNodeId,
                dropNodeId,
                dropPosition,
              });
              toast.success('移动模块成功');
              if (selectedModuleId === dragNodeId) setSelectedModuleId('all');
              fetchModuleTree();
              fetchModulesCount();
              fetchCaseList();
            }}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80} className="flex flex-col min-h-0">
          {rightContent}
        </ResizablePanel>
      </ResizablePanelGroup>

      {showLegacyVersionControls && (
        <VersionMergeDrawer
          open={mergeDrawerOpen}
          onOpenChange={setMergeDrawerOpen}
          projectId={projectId}
          onSuccess={fetchCaseList}
        />
      )}
    </div>
  );
}
