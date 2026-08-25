/**
 * 用例列表数据 Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { caseManagementService } from '@/services';
import type { CaseItem } from '../types';
import { getCaseLevel } from '../utils/getCaseLevel';
import type { FilterResult } from '../components/CaseFilterDrawer';

/** 排序：{ field: string; order: 'asc' | 'desc' } */
export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

interface UseCaseListOptions {
  projectId: string;
  spaceId?: string;
  repositoryId?: string;
  selectedModuleId: string;
  /** 当前选中模块的所有子孙节点 ID，用于包含下级模块用例（参考 aegis-next-server） */
  offspringIds?: string[];
  searchKeyword: string;
  modulesCount: Record<string, number>;
  viewId?: string;
  filter?: FilterResult;
  /** 排序 */
  sort?: SortOption | null;
  /** 列头快速筛选（多选）{ dataIndex: 选中值数组 } */
  columnFilter?: Record<string, string[]>;
  /** 版本基线/分支 ID */
  versionId?: string;
  onFetchSuccess?: () => void;
  /** 初始页码（从 URL 恢复，返回列表时保留用户之前选的页） */
  initialCurrentPage?: number;
  /** 初始每页条数（从 URL 恢复） */
  initialPageSize?: number;
}

/** 与后端 BasePageRequest 一致：pageSize ∈ [5, 500]，否则 /testcase/page 与 /functional/case/page 校验失败，整段请求失败会表现为列表被清空 */
function clampPageSize(size: number): number {
  const n = Number.isFinite(size) ? Math.floor(size) : 20;
  return Math.min(500, Math.max(5, n));
}

/** 判断条件是否有有效值（非空），与后端 CombineCondition.valid() 一致 */
function hasConditionValue(c: { value?: string | string[]; operator?: string }): boolean {
  if (c.operator === 'EMPTY' || c.operator === 'NOT_EMPTY') return true;
  if (c.value == null) return false;
  if (Array.isArray(c.value)) return c.value.length > 0 && c.value.some((v) => v != null && String(v).trim() !== '');
  return String(c.value).trim() !== '';
}

/** 后端 combine 片段不处理 caseLevel，只支持 filter 片段（ExtFunctionalCaseMapper filters 的 key=='caseLevel'），故用例等级走 filter 不入 combine */
const FILTER_MAP_KEYS = ['caseLevel', 'reviewStatus', 'lastExecuteResult'];

/**
 * 高级筛选中走 request.filter（表头 filter 片段）的项，从 conditions 转为 Map<string, string[]>
 */
function advanceFilterToFilterMap(filter?: FilterResult): Record<string, string[]> | undefined {
  const valid = filter?.conditions?.filter(hasConditionValue).filter((c) => FILTER_MAP_KEYS.includes(c.dataIndex));
  if (!valid?.length) return undefined;
  const map: Record<string, string[]> = {};
  for (const c of valid) {
    const arr = Array.isArray(c.value) ? c.value.filter(Boolean).map(String) : [String(c.value)];
    if (arr.length) map[c.dataIndex] = arr;
  }
  return Object.keys(map).length ? map : undefined;
}

/**
 * 转为 combineSearch：仅包含后端 combine 片段能处理的字段（name/num/moduleId/createUser/updateUser/tags/reviewStatus/lastExecuteResult 等），
 * 不含 caseLevel（caseLevel 走 request.filter 避免 AND () 报错）。
 */
function toCombineSearch(filter?: FilterResult): { searchMode: string; conditions: { name: string; value: unknown; operator: string; customField: boolean; customFieldType: string }[] } | undefined {
  const validConditions = filter?.conditions?.filter(hasConditionValue).filter((c) => !FILTER_MAP_KEYS.includes(c.dataIndex));
  if (!validConditions?.length) return undefined;
  const conditions = validConditions
    .map((c) => ({
      name: c.dataIndex,
      value: Array.isArray(c.value) ? c.value.filter(Boolean) : c.value,
      operator: c.operator ?? 'IN',
      customField: false,
      customFieldType: '',
    }))
    .filter((c) => hasConditionValue({ value: c.value, operator: c.operator }));
  if (!conditions.length) return undefined;
  return { searchMode: filter!.searchMode ?? 'AND', conditions };
}

/**
 * 抽屉中仅用于 keyword、moduleIds、createUser、updateUser、tags 等平铺参数；
 * 用例等级/评审结果/执行结果通过 advanceFilterToFilterMap 走 request.filter，表头筛选也走 filter。
 */
function filterToFlatParams(filter?: FilterResult): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (!filter?.conditions?.length) return params;
  const keywords: string[] = [];
  for (const c of filter.conditions) {
    const val = Array.isArray(c.value) ? (c.value.length ? c.value[0] : null) : c.value;
    if (val == null || val === '') continue;
    if (c.dataIndex === 'num' || c.dataIndex === 'name') {
      keywords.push(String(val).trim());
    } else if (c.dataIndex === 'moduleId') {
      params.moduleIds = Array.isArray(c.value) ? c.value.filter(Boolean) : [c.value];
    } else if (c.dataIndex === 'createUser') {
      // 多选时仅通过 combineSearch 传递，不设置平铺参数
      if (Array.isArray(c.value)) { if (c.value.length === 1) params.createUser = c.value[0]; }
      else if (val != null) params.createUser = val;
    } else if (c.dataIndex === 'updateUser') {
      if (Array.isArray(c.value)) { if (c.value.length === 1) params.updateUser = c.value[0]; }
      else if (val != null) params.updateUser = val;
    } else if (c.dataIndex === 'tags') {
      params.tags = val;
    }
    // caseLevel / reviewStatus / lastExecuteResult 通过 advanceFilterToFilterMap 写入 params.filter
  }
  if (keywords.length) params.keyword = keywords.join(' ').trim();
  return params;
}

/** 表头筛选转为后端 filter 格式：Map<string, List<string>>（支持多选数组） */
function columnFilterToFilter(columnFilter?: Record<string, string[]>): Record<string, string[]> | undefined {
  if (!columnFilter || typeof columnFilter !== 'object') return undefined;
  const filter: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(columnFilter)) {
    const arr = Array.isArray(value) ? value.filter((v) => v != null && String(v).trim() !== '') : [];
    if (arr.length > 0) filter[key] = arr;
  }
  return Object.keys(filter).length ? filter : undefined;
}

export function useCaseList({
  projectId,
  spaceId,
  repositoryId,
  selectedModuleId,
  offspringIds = [],
  searchKeyword,
  modulesCount,
  viewId = 'all_data',
  filter,
  sort,
  columnFilter,
  versionId,
  onFetchSuccess,
  initialCurrentPage,
  initialPageSize,
}: UseCaseListOptions) {
  const [loading, setLoading] = useState(false);
  const [caseList, setCaseList] = useState<CaseItem[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage ?? 1);
  const [pageSize, setPageSize] = useState(() => clampPageSize(initialPageSize ?? 20));
  const [total, setTotal] = useState(0);

  const onFetchSuccessRef = useRef(onFetchSuccess);
  onFetchSuccessRef.current = onFetchSuccess;

  /** options.silent: 为 true 时不置 loading，用于删除/编辑后静默刷新，避免表格收起为单行导致页面抖动 */
  const fetchCaseList = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const flatParams = filterToFlatParams(filter);
      const params: Record<string, unknown> = {
        projectId,
        ...(spaceId ? { spaceId } : {}),
        ...(repositoryId ? { repositoryId, repository: repositoryId } : {}),
        current: currentPage,
        pageSize: clampPageSize(pageSize),
        moduleIds:
          (flatParams.moduleIds as string[]) ??
          (selectedModuleId !== 'all' ? [selectedModuleId, ...offspringIds] : []),
      };
      /** 版本透传：选中的版本/分支 ID */
      const filterVersionId =
        filter && typeof filter === 'object' && 'versionId' in filter
          ? String((filter as { versionId?: string }).versionId || '').trim()
          : '';
      const activeVersion = versionId || filterVersionId;
      if (activeVersion) params.versionId = activeVersion;
      const kw = searchKeyword?.trim() || (flatParams.keyword as string);
      if (kw) params.keyword = kw;
      if (viewId === 'my_create') params.createByMe = 'true';
      if (viewId === 'my_follow') params.followFlag = 'true';
      if (flatParams.createUser) params.createUser = flatParams.createUser;
      if (flatParams.updateUser) params.updateUser = flatParams.updateUser;
      if (flatParams.tags) params.tags = flatParams.tags;
      if (sort?.field) {
        params.sort = { [sort.field]: sort.order };
        params.sortString = `${sort.field} ${sort.order}`;
      }
      // 原项目：高级筛选用 combineSearch（仅后端 combine 支持的字段），表头筛选用 filter；caseLevel 等走 filter 避免 AND () 报错
      const combineSearch = toCombineSearch(filter);
      if (combineSearch?.conditions?.length) params.combineSearch = combineSearch;
      const tableFilter = columnFilterToFilter(columnFilter);
      const advanceFilter = advanceFilterToFilterMap(filter);
      const mergedFilter =
        tableFilter || advanceFilter
          ? { ...(tableFilter ?? {}), ...(advanceFilter ?? {}) }
          : undefined;
      if (mergedFilter && Object.keys(mergedFilter).length > 0) params.filter = mergedFilter;

      // 判断选中的是否为新建/自定义用例库（非示例用例库）
      const isCustomRepo = repositoryId && repositoryId !== '示例用例库' && !repositoryId.includes('demo');

      let result: any;
      try {
        result = await caseManagementService.getUnifiedCaseList(params);
        // Fallback to legacy list if unified list is empty (transition phase)
        const hasData = (Array.isArray(result) && result.length > 0)
          || (Array.isArray(result?.list) && result.list.length > 0)
          || (Array.isArray(result?.data) && result.data.length > 0)
          || (Array.isArray(result?.records) && result.records.length > 0);

        if (!hasData && !spaceId && !isCustomRepo) {
          console.log('统一 Case 列表为空，尝试从 legacy 列表接口获取数据');
          result = await caseManagementService.getCaseList(params);
        }
      } catch (unifiedError) {
        if (spaceId || isCustomRepo) {
          result = [];
        } else {
          console.warn('统一 Case 列表获取失败，回退到 legacy 列表接口', unifiedError);
          result = await caseManagementService.getCaseList(params);
        }
      }
      let rawList: any[] = [];
      if (Array.isArray(result)) rawList = result;
      else if (Array.isArray(result?.list)) rawList = result.list;
      else if (Array.isArray(result?.data)) rawList = result.data;
      else if (Array.isArray(result?.records)) rawList = result.records;

      // 统一 aiCreate；并确保 caseLevel 可从 customFields/functionalPriority 解析
      const list: CaseItem[] = rawList
        .filter((item: any) => {
          if (!isCustomRepo) return true;
          const repoTag = item.repositoryId || item.repositoryName || item.repository;
          return repoTag === repositoryId;
        })
        .map((item: any) => {
          const meta = item.metadata && typeof item.metadata === 'object' ? item.metadata : null;
          const normalizedItem = {
            ...item,
            id: item.id ?? item.caseId,
            caseId: item.caseId ?? item.id,
            name: item.name ?? item.title,
            aiCreate: item.aiCreate ?? item.ai_create ?? false,
            customFields: item.customFields ?? item.customFieldList ?? item.custom_fields,
            reviewStatus: item.reviewStatus ?? item.lifecycleStatus,
            lastExecuteResult: item.lastExecuteResult ?? item.lastRunStatus ?? meta?.lastExecuteResult,
            moduleName: item.moduleName ?? item.modulePath,
          };
          const parsed = getCaseLevel(normalizedItem);
          const level = normalizedItem.name ? (item.caseLevel ?? item.functionalPriority ?? parsed) : '-';
          const caseLevelVal = level !== '-' ? level : (parsed !== '-' ? parsed : undefined);
          return {
            ...normalizedItem,
            caseLevel: caseLevelVal ?? item.caseLevel ?? item.functionalPriority,
          };
        });

      setCaseList(list);
      const apiTotal = isCustomRepo ? list.length : (result?.total ?? result?.totalCount ?? result?.totalElements);
      const fallbackTotal =
        selectedModuleId === 'all' ? modulesCount['all'] ?? modulesCount['ALL'] : undefined;
      setTotal(apiTotal ?? (typeof fallbackTotal === 'number' && fallbackTotal > 0 ? fallbackTotal : list.length));
      onFetchSuccessRef.current?.();
    } catch (err) {
      console.error('获取用例列表失败:', err);
      setCaseList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
    // 不将 modulesCount、onFetchSuccess 放入依赖，避免循环：onFetchSuccess 会更新 modulesCount，导致 fetchCaseList 重建并再次触发
  }, [projectId, spaceId, repositoryId, currentPage, pageSize, searchKeyword, selectedModuleId, offspringIds, viewId, filter, sort, columnFilter, versionId]);

  useEffect(() => {
    fetchCaseList();
  }, [fetchCaseList]);



  const setPage = useCallback((page: number) => setCurrentPage(page), []);
  const resetPage = useCallback(() => setCurrentPage(1), []);
  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(clampPageSize(size));
    setCurrentPage(1);
  }, []);
  const totalPages = Math.ceil(total / pageSize);

  const isAllSelected = selectedCases.length > 0 && selectedCases.length === caseList.length;
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedCases(checked ? caseList.map((c) => c.id) : []);
  }, [caseList]);
  const handleSelectCase = useCallback((caseId: string, checked: boolean) => {
    setSelectedCases((prev) => (checked ? [...prev, caseId] : prev.filter((id) => id !== caseId)));
  }, []);
  const clearSelection = useCallback(() => setSelectedCases([]), []);

  /** 仅更新列表中某一条的本地状态，用于表格内编辑后不整表刷新 */
  const updateItemInList = useCallback((caseId: string, patch: Partial<CaseItem>) => {
    setCaseList((prev) =>
      prev.map((item) => (item.id === caseId ? { ...item, ...patch } : item))
    );
  }, []);

  return {
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
  };
}
