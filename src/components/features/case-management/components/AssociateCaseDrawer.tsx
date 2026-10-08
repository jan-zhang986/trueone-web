/**
 * 关联用例抽屉
 * 用于评审创建时选择用例、评审详情中追加关联用例
 * 迁移自 aegis-next-server caseReview/components/create/associateDrawer.vue
 * - 左侧模块树默认收起（仅展示一级，点击展开子级）
 * - 右侧表格补充：用例等级、所属模块、创建人
 */

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Folder, ChevronRight, ChevronDown, RefreshCw, Link, ArrowUp, ArrowDown, ChevronsUpDown, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { caseManagementService, projectManagementService } from '@/services';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { toast } from 'sonner';
import type { ModuleTreeNode } from '../types';
import { CaseLevelBadge } from './CaseLevelBadge';
import { getCaseLevel } from '../utils/getCaseLevel';
import { CASE_LEVEL_MAP, REVIEW_STATUS_MAP } from '../constants';

export interface BaseAssociateCaseRequest {
  excludeIds: string[];
  selectIds: string[];
  selectAll: boolean;
  condition: Record<string, any>;
  moduleIds: string[];
  versionId: string;
  refId: string;
  projectId: string;
  totalCount?: number;
}

/** 搜索时：节点自身或任意子节点名称匹配则保留 */
function nodeOrChildrenMatch(node: ModuleTreeNode, keyword: string): boolean {
  if (!keyword.trim()) return true;
  const k = keyword.trim().toLowerCase();
  if ((node.name ?? '').toLowerCase().includes(k)) return true;
  if (node.children?.length) return node.children.some((c) => nodeOrChildrenMatch(c, k));
  return false;
}

function filterModuleTree(nodes: ModuleTreeNode[], keyword: string): ModuleTreeNode[] {
  if (!keyword.trim()) return nodes;
  return nodes
    .filter((n) => nodeOrChildrenMatch(n, keyword))
    .map((n) => ({
      ...n,
      children: n.children?.length ? filterModuleTree(n.children, keyword) : undefined,
    }));
}

function getAllModuleIds(nodes: ModuleTreeNode[]): string[] {
  const ids: string[] = [];
  nodes.forEach((n) => {
    ids.push(n.id);
    if (n.children?.length) ids.push(...getAllModuleIds(n.children));
  });
  return ids;
}

function getSubtreeIds(node: ModuleTreeNode): string[] {
  const ids = [node.id];
  if (node.children?.length) node.children.forEach((c) => ids.push(...getSubtreeIds(c)));
  return ids;
}

const DRAWER_WIDTH_STORAGE_KEY = 'associate-case-drawer-width';
const MIN_DRAWER_WIDTH = 560;
const MAX_DRAWER_WIDTH = 1200;
const DEFAULT_DRAWER_WIDTH = 896; // 约 max-w-4xl

const LEFT_PANEL_WIDTH_STORAGE_KEY = 'associate-case-drawer-left-panel-width';
const MIN_LEFT_PANEL_WIDTH = 200;
const MAX_LEFT_PANEL_WIDTH = 520;
const DEFAULT_LEFT_PANEL_WIDTH = 256;

const TABLE_COLUMN_WIDTHS_KEY = 'associate-case-drawer-column-widths';
const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 500;
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  num: 96,
  name: 220,
  caseLevel: 88,
  module: 140,
  createUser: 100,
};

/** 可拖拽列宽的表头 */
function ResizableTh({
  columnKey,
  width,
  onResize,
  children,
  className,
}: {
  columnKey: string;
  width: number;
  onResize: (key: string, w: number) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const startX = useRef(0);
  const startW = useRef(0);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startX.current = e.clientX;
      startW.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      const onMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX.current;
        let w = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, startW.current + delta));
        onResize(columnKey, w);
      };
      const onMouseUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [columnKey, width, onResize]
  );
  return (
    <TableHead
      className={cn('relative group !px-2 overflow-hidden', className)}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className="w-full flex items-center pr-2">
        <div className="truncate w-full text-left">{children}</div>
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调整列宽"
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-[8px] cursor-col-resize z-10 flex items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        <div className="w-[3px] h-4 bg-gray-300/80 rounded-full opacity-0 group-hover:opacity-100 group-hover:bg-[#165DFF] transition-all duration-200" />
      </div>
    </TableHead>
  );
}

interface AssociateCaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  reviewId?: string;
  reviewers?: string[];
  /** 已关联的用例 ID，用于排除（在详情页追加时） */
  excludeIds?: string[];
  /** 创建评审时传入，用于回显已选用例 */
  initialSelectIds?: string[];
  /** 创建评审时传入，用于回显已勾选模块 */
  initialModuleIds?: string[];
  onSuccess: (params: BaseAssociateCaseRequest & { reviewers?: string[] }) => void;
}

export function AssociateCaseDrawer({
  open,
  onOpenChange,
  projectId,
  reviewId,
  reviewers: initialReviewers = [],
  excludeIds = [],
  initialSelectIds,
  initialModuleIds,
  onSuccess,
}: AssociateCaseDrawerProps) {
  const [moduleTree, setModuleTree] = useState<ModuleTreeNode[]>([]);
  const [caseList, setCaseList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  /** 模块 id -> 完整路径（用于表格「所属模块」展示） */
  const [modulePathMap, setModulePathMap] = useState<Record<string, string>>({});
  /** 模块 id -> 用例数量（用于模块树右侧的小计数） */
  const [modulesCount, setModulesCount] = useState<Record<string, number>>({});
  const [moduleKeyword, setModuleKeyword] = useState('');
  const [caseKeyword, setCaseKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** 勾选的模块（整模块关联，与测试计划关联用例一致） */
  const [checkedModuleIds, setCheckedModuleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [reviewerIds, setReviewerIds] = useState<string[]>(initialReviewers);
  const [reviewerOptions, setReviewerOptions] = useState<{ id: string; name: string }[]>([]);
  const [reviewerPopoverOpen, setReviewerPopoverOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  /** 模块树展开的节点 id 集合 */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  /** 表格排序 */
  const [sortField, setSortField] = useState<'num' | 'name' | 'createdAt' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  /** 表格筛选（多选） */
  const [caseLevelFilter, setCaseLevelFilter] = useState<string[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string[]>([]);
  const [createUserFilter, setCreateUserFilter] = useState<string[]>([]);
  /** 创建人筛选项（项目成员） */
  const [memberOptions, setMemberOptions] = useState<{ id: string; name: string }[]>([]);
  const openJustOpenedRef = useRef(false);
  /** 用序列化后的 excludeIds 作为依赖，避免父组件未传时默认 [] 导致每次渲染新引用、fetchCaseList 不断重建、表格疯狂刷新 */
  const excludeIdsKey = useMemo(() => (excludeIds ?? []).join(','), [excludeIds?.length, (excludeIds ?? []).join(',')]);

  /** 抽屉宽度（可拖拽左侧边缘调整），持久化到 localStorage */
  const [drawerWidth, setDrawerWidth] = useState(() => {
    try {
      const v = localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY);
      const n = v ? parseInt(v, 10) : NaN;
      if (!Number.isNaN(n) && n >= MIN_DRAWER_WIDTH && n <= MAX_DRAWER_WIDTH) return n;
    } catch {}
    return DEFAULT_DRAWER_WIDTH;
  });
  /** 左侧模块树宽度（可拖拽分隔条调整），持久化 */
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    try {
      const v = localStorage.getItem(LEFT_PANEL_WIDTH_STORAGE_KEY);
      const n = v ? parseInt(v, 10) : NaN;
      if (!Number.isNaN(n) && n >= MIN_LEFT_PANEL_WIDTH && n <= MAX_LEFT_PANEL_WIDTH) return n;
    } catch {}
    return DEFAULT_LEFT_PANEL_WIDTH;
  });
  /** 表格列宽（可拖拽表头调整），持久化到 localStorage */
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const v = localStorage.getItem(TABLE_COLUMN_WIDTHS_KEY);
      if (v) {
        const o = JSON.parse(v) as Record<string, number>;
        if (o && typeof o === 'object') return { ...DEFAULT_COLUMN_WIDTHS, ...o };
      }
    } catch {}
    return { ...DEFAULT_COLUMN_WIDTHS };
  });
  const drawerResizeStartX = useRef(0);
  const drawerResizeStartW = useRef(0);
  const leftPanelResizeStartX = useRef(0);
  const leftPanelResizeStartW = useRef(0);

  const getColumnWidth = useCallback((key: string) => columnWidths[key] ?? DEFAULT_COLUMN_WIDTHS[key] ?? 100, [columnWidths]);
  const handleColumnResize = useCallback((key: string, width: number) => {
    setColumnWidths((prev) => {
      const next = { ...prev, [key]: width };
      try {
        localStorage.setItem(TABLE_COLUMN_WIDTHS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  const handleDrawerResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    drawerResizeStartX.current = e.clientX;
    drawerResizeStartW.current = drawerWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMouseMove = (ev: MouseEvent) => {
      const delta = drawerResizeStartX.current - ev.clientX;
      const w = Math.max(MIN_DRAWER_WIDTH, Math.min(MAX_DRAWER_WIDTH, drawerResizeStartW.current + delta));
      setDrawerWidth(w);
      try {
        localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(w));
      } catch {}
    };
    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [drawerWidth]);

  const handleLeftPanelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    leftPanelResizeStartX.current = e.clientX;
    leftPanelResizeStartW.current = leftPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - leftPanelResizeStartX.current;
      const w = Math.max(MIN_LEFT_PANEL_WIDTH, Math.min(MAX_LEFT_PANEL_WIDTH, leftPanelResizeStartW.current + delta));
      setLeftPanelWidth(w);
      try {
        localStorage.setItem(LEFT_PANEL_WIDTH_STORAGE_KEY, String(w));
      } catch {}
    };
    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [leftPanelWidth]);

  /** 表格筛选条件（后端 filter 为 Record<string, string[]>） */
  const tableFilter = useMemo(() => {
    const f: Record<string, string[]> = {};
    if (caseLevelFilter.length) f.caseLevel = caseLevelFilter;
    if (reviewStatusFilter.length) f.reviewStatus = reviewStatusFilter;
    if (createUserFilter.length) f.createUser = createUserFilter;
    return f;
  }, [caseLevelFilter, reviewStatusFilter, createUserFilter]);

  const handleSort = useCallback((field: 'num' | 'name' | 'createdAt') => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortOrder('asc');
      return field;
    });
    setCurrentPage(1);
  }, []);

  /** 仅在抽屉从关闭变为打开时重置勾选/模块/页码等，避免 initialSelectIds/initialModuleIds 引用变化导致反复重置 */
  useEffect(() => {
    if (!open) {
      openJustOpenedRef.current = false;
      return;
    }
    if (openJustOpenedRef.current) return;
    openJustOpenedRef.current = true;
    setSelectedModuleId('all');
    setCurrentPage(1);
    setCaseKeyword('');
    setModuleKeyword('');
    if (initialSelectIds?.length) {
      setSelectedIds(new Set(initialSelectIds));
    } else {
      setSelectedIds(new Set());
    }
    if (initialModuleIds?.length) {
      setCheckedModuleIds(new Set(initialModuleIds));
    } else {
      setCheckedModuleIds(new Set());
    }
  }, [open, initialSelectIds, initialModuleIds]);

  useEffect(() => {
    if (open && projectId) {
      projectManagementService.getProjectMemberOptions(projectId).then((res: any) => {
        const list = Array.isArray(res) ? res : res?.list ?? res?.data ?? [];
        setMemberOptions(list.map((u: any) => ({ id: u.id, name: u.name || u.userName || '-' })));
      }).catch(() => setMemberOptions([]));
    }
  }, [open, projectId]);

  /**
   * 收集某模块及其所有子孙模块 id（用于按模块筛选用例列表）
   * 与测试计划关联用例抽屉的 getModuleAndOffspringIds 逻辑保持一致
   */
  const getModuleAndOffspringIds = useCallback(
    (moduleId: string): string[] => {
      const ids: string[] = [];
      const addNodeAndDescendants = (node: ModuleTreeNode) => {
        ids.push(node.id);
        if (node.children?.length) node.children.forEach(addNodeAndDescendants);
      };
      const findAndCollect = (nodes: ModuleTreeNode[]): boolean => {
        for (const n of nodes) {
          if (n.id === moduleId) {
            addNodeAndDescendants(n);
            return true;
          }
          if (n.children?.length && findAndCollect(n.children)) return true;
        }
        return false;
      };
      findAndCollect(moduleTree);
      return ids;
    },
    [moduleTree]
  );

  const fetchModules = useCallback(async () => {
    if (!open) return;
    setModuleLoading(true);
    try {
      const tree = await caseManagementService.getCaseModuleTree({ projectId });
      const normalized = Array.isArray(tree) ? tree : [];
      setModuleTree(normalized);

      // 构建模块路径映射：id -> “父/子/节点”
      const pathMap: Record<string, string> = {};
      const buildPaths = (nodes: ModuleTreeNode[], parentPath: string) => {
        nodes.forEach((n) => {
          const currentPath = parentPath ? `${parentPath}/${n.name}` : n.name;
          pathMap[n.id] = currentPath;
          if (n.children?.length) buildPaths(n.children, currentPath);
        });
      };
      buildPaths(normalized, '');
      setModulePathMap(pathMap);
    } catch (err) {
      console.error('获取模块树失败:', err);
      setModuleTree([]);
      setModulePathMap({});
    } finally {
      setModuleLoading(false);
    }
  }, [projectId, open]);

  const fetchCaseList = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const params: any = {
        projectId,
        current: currentPage,
        pageSize,
        keyword: caseKeyword || undefined,
      };
      if (selectedModuleId !== 'all') {
        const moduleIds = getModuleAndOffspringIds(selectedModuleId);
        params.moduleIds = moduleIds.length > 0 ? moduleIds : [selectedModuleId];
      }
      const excludeList = excludeIds ?? [];
      if (excludeList.length) params.excludeIds = excludeList;
      if (sortField) {
        params.sort = { [sortField]: sortOrder };
        params.sortString = `${sortField} ${sortOrder}`;
      }
      if (Object.keys(tableFilter).length) params.filter = tableFilter;
      const res: any = await caseManagementService.getCaseList(params);
      const list = res?.list ?? res?.data ?? [];
      setCaseList(list);
      setTotal(res?.total ?? list.length);
    } catch (err) {
      console.error('获取用例列表失败:', err);
      setCaseList([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, open, currentPage, pageSize, caseKeyword, selectedModuleId, getModuleAndOffspringIds, excludeIdsKey, sortField, sortOrder, tableFilter]);

  /** 拉取某模块及其子模块下全部用例 id（分页，与测试计划一致） */
  const fetchAllCaseIdsByModule = useCallback(
    async (moduleId: string): Promise<string[]> => {
      const moduleIds = getModuleAndOffspringIds(moduleId);
      const ids: string[] = [];
      let page = 1;
      const size = 200;
      while (true) {
        const res: any = await caseManagementService.getCaseList({
          projectId,
          current: page,
          pageSize: size,
          moduleIds: moduleIds.length ? moduleIds : undefined,
          excludeIds: excludeIds.length ? excludeIds : undefined,
        });
        const list = res?.list ?? res?.data ?? [];
        list.forEach((item: any) => { if (item.id) ids.push(item.id); });
        const totalRes = res?.total ?? 0;
        if (ids.length >= totalRes || list.length < size) break;
        page += 1;
      }
      return ids;
    },
    [projectId, getModuleAndOffspringIds, excludeIds]
  );

  // 获取模块下用例数量（与测试计划关联用例抽屉保持一致，优先公开接口）
  const fetchModulesCount = useCallback(async () => {
    if (!open || !projectId) return;
    const normalizeCount = (res: any): Record<string, number> => {
      const raw = res?.data ?? res;
      if (!raw || typeof raw !== 'object') return {};
      if (!Array.isArray(raw)) {
        const map: Record<string, number> = {};
        Object.keys(raw).forEach((k) => {
          const v = (raw as any)[k];
          map[k] = typeof v === 'number' ? v : Number(v) || 0;
        });
        return map;
      }
      const map: Record<string, number> = {};
      raw.forEach((item: any) => {
        const id = item.moduleId ?? item.id ?? item.key;
        const count = item.count ?? item.value ?? 0;
        if (id != null) map[String(id)] = Number(count) || 0;
      });
      return map;
    };
    try {
      const params: any = { projectId, moduleIds: [], current: 1, pageSize: 10 };
      let res: any;
      try {
        res = await caseManagementService.getAssociationPublicCaseModuleCount(params);
      } catch {
        res = await caseManagementService.getCaseModulesCounts(params);
      }
      setModulesCount(normalizeCount(res));
    } catch (err) {
      console.error('获取模块用例数量失败:', err);
      setModulesCount({});
    }
  }, [open, projectId]);

  const fetchReviewers = useCallback(async () => {
    try {
      const res: any = await caseManagementService.getReviewUsers(projectId, '');
      const list = Array.isArray(res) ? res : res?.list ?? res?.data ?? [];
      setReviewerOptions(list.map((u: any) => ({ id: u.id, name: u.name || u.userName || '-' })));
    } catch (err) {
      console.error('获取评审人失败:', err);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      fetchModules();
      fetchModulesCount();
      fetchReviewers();
      setReviewerIds(initialReviewers);
    }
  }, [open, fetchModules, fetchModulesCount, fetchReviewers, initialReviewers]);
  useEffect(() => { if (open) fetchCaseList(); }, [open, fetchCaseList]);
  useEffect(() => {
    if (open && moduleTree.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        moduleTree.forEach((n) => { if (n.id && n.children?.length) next.add(n.id); });
        return next;
      });
    }
  }, [open, moduleTree]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** 当前页是否全部已选中（与测试计划一致） */
  const isCurrentPageAllSelected = useMemo(
    () => caseList.length > 0 && caseList.every((c) => selectedIds.has(c.id)),
    [caseList, selectedIds]
  );

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isCurrentPageAllSelected) {
        caseList.forEach((c) => next.delete(c.id));
      } else {
        caseList.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const allModuleCount = useMemo(() => {
    const v = modulesCount.total ?? modulesCount.all ?? modulesCount.ALL ?? modulesCount[''];
    if (typeof v === 'number' && v >= 0) return v;
    return Object.values(modulesCount).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) || 0;
  }, [modulesCount]);

  /** 勾选模块预计关联用例总数 */
  const checkedModulesTotalCount = useMemo(() => {
    if (checkedModuleIds.size === 0) return 0;
    const allIds = Array.from(checkedModuleIds).flatMap((mid) => getModuleAndOffspringIds(mid));
    const uniqueIds = [...new Set(allIds)];
    return uniqueIds.reduce((sum, id) => sum + (modulesCount[id] ?? 0), 0);
  }, [checkedModuleIds, getModuleAndOffspringIds, modulesCount]);

  const filteredTree = useMemo(
    () => filterModuleTree(moduleTree, moduleKeyword),
    [moduleTree, moduleKeyword]
  );

  const toggleReviewer = (id: string) => {
    setReviewerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (reviewId && reviewerIds.length === 0) {
      toast.error('请选择至少一位评审人');
      return;
    }
    const caseIdsFromTable = Array.from(selectedIds);
    let caseIdsFromModules: string[] = [];
    if (checkedModuleIds.size > 0) {
      setSubmitLoading(true);
      try {
        for (const moduleId of checkedModuleIds) {
          const ids = await fetchAllCaseIdsByModule(moduleId);
          caseIdsFromModules.push(...ids);
        }
      } catch (err) {
        toast.error('获取勾选模块下用例失败');
        setSubmitLoading(false);
        return;
      }
      setSubmitLoading(false);
    }
    const allCaseIds = Array.from(new Set([...caseIdsFromTable, ...caseIdsFromModules]));
    if (allCaseIds.length === 0 && !reviewId) {
      toast.error('请至少勾选模块或选择用例');
      return;
    }
    setSubmitLoading(true);
    try {
      const baseAssociateCaseRequest: BaseAssociateCaseRequest = {
        excludeIds: [...excludeIds],
        selectIds: allCaseIds,
        selectAll: false,
        condition: {},
        moduleIds: Array.from(checkedModuleIds),
        versionId: '',
        refId: '',
        projectId,
      };
      if (reviewId) {
        await caseManagementService.associateReviewCase({
          reviewId,
          projectId,
          reviewers: reviewerIds,
          baseAssociateCaseRequest,
        });
        toast.success('关联成功');
      }
      onSuccess({ ...baseAssociateCaseRequest, reviewers: reviewerIds.length ? reviewerIds : undefined });
      onOpenChange(false);
      setSelectedIds(new Set());
      setCheckedModuleIds(new Set());
    } catch (err: any) {
      toast.error(err?.message || '关联失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** 渲染树节点（与测试计划一致：Checkbox + 展开箭头 + Folder + 名称 + 数量） */
  const renderTreeNode = (node: ModuleTreeNode, level = 0): ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedModuleId === node.id;
    const subtreeIds = getSubtreeIds(node);
    const checkedCount = subtreeIds.filter((id) => checkedModuleIds.has(id)).length;
    const isChecked = checkedCount === subtreeIds.length;
    const isIndeterminate = !isChecked && checkedCount > 0;
    return (
      <div key={node.id} className="mb-0.5">
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
          style={{ paddingLeft: 8 + level * 14 }}
          onClick={() => {
            setSelectedModuleId(node.id);
            setCurrentPage(1);
          }}
        >
          <Checkbox
            checked={isIndeterminate ? 'indeterminate' : isChecked}
            onCheckedChange={(checked) => {
              const ids = getSubtreeIds(node);
              setCheckedModuleIds((prev) => {
                const next = new Set(prev);
                if (checked) ids.forEach((id) => next.add(id));
                else ids.forEach((id) => next.delete(id));
                return next;
              });
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`勾选模块 ${node.name}`}
          />
          {hasChildren ? (
            <button
              type="button"
              className="p-0.5 -ml-0.5 rounded hover:bg-gray-200 shrink-0"
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              aria-label={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
            </button>
          ) : (
            <span className="w-4 shrink-0" aria-hidden />
          )}
          <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
          <span className="flex-1 whitespace-nowrap">{node.name}</span>
          <span className="text-xs text-blue-600 shrink-0 ml-1">({modulesCount[node.id] ?? node.count ?? 0})</span>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-0">{node.children!.map((c) => renderTreeNode(c, level + 1))}</div>
        )}
      </div>
    );
  };

  // 搜索模块时，自动展开并定位到第一个匹配的模块
  useEffect(() => {
    if (!open || !moduleKeyword.trim() || moduleTree.length === 0) return;
    const keyword = moduleKeyword.trim().toLowerCase();

    const dfs = (nodes: ModuleTreeNode[], path: string[]): string[] | null => {
      for (const n of nodes) {
        const nextPath = [...path, n.id];
        if ((n.name ?? '').toLowerCase().includes(keyword)) {
          return nextPath;
        }
        if (n.children?.length) {
          const found = dfs(n.children, nextPath);
          if (found) return found;
        }
      }
      return null;
    };

    const matchPath = dfs(moduleTree, []);
    if (matchPath && matchPath.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        matchPath.forEach((id) => next.add(id));
        return next;
      });
      const targetId = matchPath[matchPath.length - 1];
      setSelectedModuleId(targetId);
      setCurrentPage(1);
    }
  }, [open, moduleKeyword, moduleTree]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0"
        style={{ width: drawerWidth, maxWidth: '95vw' }}
      >
        <div className="flex flex-1 min-h-0">
          <div
            role="separator"
            aria-label="拖动调整抽屉宽度"
            onMouseDown={handleDrawerResizeStart}
            className="w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-100 active:bg-blue-200 flex items-center justify-center border-r border-transparent hover:border-blue-200 transition-colors"
            style={{ touchAction: 'none' }}
          >
            <div className="w-0.5 h-8 bg-gray-300 rounded-full opacity-0 hover:opacity-100 group-hover:opacity-100" />
          </div>
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <SheetHeader className="px-6 py-4 border-b shrink-0">
              <SheetTitle className="flex items-center gap-2">
                <Link className="w-5 h-5 text-blue-600" />
                关联用例
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex min-h-0 overflow-hidden">
          <div
            className="min-w-0 border-r flex flex-col flex-shrink-0"
            style={{ width: leftPanelWidth }}
          >
            <div className="p-4 pb-2 flex-shrink-0">
              <Input
                placeholder="搜索模块..."
                value={moduleKeyword}
                onChange={(e) => setModuleKeyword(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto px-2 pb-4">
              <div className="inline-block min-w-max">
              <div
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm cursor-pointer mb-1 hover:bg-gray-50 ${selectedModuleId === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                onClick={() => { setSelectedModuleId('all'); setCurrentPage(1); }}
              >
                <Checkbox
                  checked={moduleTree.length > 0 && getAllModuleIds(moduleTree).every((id) => checkedModuleIds.has(id))}
                  onCheckedChange={(checked) => {
                    if (checked) setCheckedModuleIds(new Set(getAllModuleIds(moduleTree)));
                    else setCheckedModuleIds(new Set());
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="全选模块"
                />
                <Folder className="w-4 h-4 shrink-0" />
                <span className="flex-1 whitespace-nowrap">全部用例</span>
                <span className="text-xs text-blue-600 shrink-0">({allModuleCount})</span>
              </div>
              {moduleLoading ? (
                <div className="py-4 text-center text-sm text-gray-400">加载中...</div>
              ) : (
                <>
                  {filteredTree.map((node) => renderTreeNode(node, 0))}
                  {filteredTree.length === 0 && moduleTree.length > 0 && moduleKeyword && (
                    <div className="py-4 text-center text-sm text-gray-400">未找到匹配的模块</div>
                  )}
                </>
              )}
              </div>
            </div>
          </div>
            <div
              role="separator"
              aria-label="拖动调整左侧模块树宽度"
              onMouseDown={handleLeftPanelResizeStart}
              className="w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-100 active:bg-blue-200 flex items-center justify-center border-r border-transparent hover:border-blue-200 transition-colors"
              style={{ touchAction: 'none' }}
            >
              <div className="w-0.5 h-8 bg-gray-300 rounded-full opacity-0 hover:opacity-100" />
            </div>
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="p-4 border-b flex items-center gap-2 flex-shrink-0 flex-wrap">
              <Input
                placeholder="搜索用例..."
                className="max-w-xs"
                value={caseKeyword}
                onChange={(e) => setCaseKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setCurrentPage(1), fetchCaseList())}
              />
              <Button size="sm" onClick={() => (setCurrentPage(1), fetchCaseList())}>
                搜索
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    评审结果
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    {reviewStatusFilter.length > 0 && <span className="text-blue-600 text-xs">({reviewStatusFilter.length})</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2 max-h-[280px] overflow-auto" align="start">
                  <div className="px-2 py-1 text-xs text-gray-500 mb-0.5">可多选</div>
                  <button type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100" onClick={() => { setReviewStatusFilter([]); setCurrentPage(1); }}>全部</button>
                  {Object.entries(REVIEW_STATUS_MAP).map(([value, { label }]) => {
                    const isSelected = reviewStatusFilter.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'text-blue-600 font-medium' : ''}`}
                        onClick={() => {
                          const next = isSelected ? reviewStatusFilter.filter((v) => v !== value) : [...reviewStatusFilter, value];
                          setReviewStatusFilter(next);
                          setCurrentPage(1);
                        }}
                      >
                        <span className={cn('w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px]', isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300')}>{isSelected ? '✓' : ''}</span>
                        {label}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
              {(caseLevelFilter.length || reviewStatusFilter.length || createUserFilter.length) > 0 && (
                <Button variant="outline" size="sm" className="gap-1.5 text-gray-600" onClick={() => { setCaseLevelFilter([]); setReviewStatusFilter([]); setCreateUserFilter([]); setCurrentPage(1); fetchCaseList(); }}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  清除筛选
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={fetchCaseList} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-4">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="h-9">
                    <TableHead className="w-10 px-2">
                      <Checkbox
                        checked={isCurrentPageAllSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="全选当前页"
                      />
                    </TableHead>
                    <ResizableTh columnKey="num" width={getColumnWidth('num')} onResize={handleColumnResize} className="font-medium text-gray-700">
                      <button type="button" className="flex items-center gap-0.5 hover:text-gray-900 w-full text-left" onClick={() => handleSort('num')}>
                        编号
                        {sortField === 'num' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                      </button>
                    </ResizableTh>
                    <ResizableTh columnKey="name" width={getColumnWidth('name')} onResize={handleColumnResize} className="font-medium text-gray-700">
                      <button type="button" className="flex items-center gap-0.5 hover:text-gray-900 w-full text-left" onClick={() => handleSort('name')}>
                        用例名称
                        {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                      </button>
                    </ResizableTh>
                    <ResizableTh columnKey="caseLevel" width={getColumnWidth('caseLevel')} onResize={handleColumnResize} className="font-medium text-gray-700">
                      <div className="flex items-center gap-1">
                        <span>用例等级</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="p-0.5 rounded hover:bg-gray-100" title="筛选（可多选）">
                              <Filter className={cn('w-3 h-3', caseLevelFilter.length > 0 && 'text-blue-600')} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-2 max-h-[260px] overflow-auto" align="start">
                            <div className="px-2 py-1 text-xs text-gray-500 mb-0.5">可多选</div>
                            <button type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100" onClick={() => { setCaseLevelFilter([]); setCurrentPage(1); }}>全部</button>
                            {Object.entries(CASE_LEVEL_MAP).map(([value, { label }]) => {
                              const isSelected = caseLevelFilter.includes(value);
                              return (
                                <button key={value} type="button" className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'text-blue-600 font-medium' : ''}`} onClick={() => { const next = isSelected ? caseLevelFilter.filter((v) => v !== value) : [...caseLevelFilter, value]; setCaseLevelFilter(next); setCurrentPage(1); }}>
                                  <span className={cn('w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px]', isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300')}>{isSelected ? '✓' : ''}</span>
                                  {label}
                                </button>
                              );
                            })}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </ResizableTh>
                    <ResizableTh columnKey="module" width={getColumnWidth('module')} onResize={handleColumnResize} className="font-medium text-gray-700">
                      所属模块
                    </ResizableTh>
                    <ResizableTh columnKey="createUser" width={getColumnWidth('createUser')} onResize={handleColumnResize} className="font-medium text-gray-700">
                      <div className="flex items-center gap-1">
                        <span>创建人</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="p-0.5 rounded hover:bg-gray-100" title="筛选（可多选）">
                              <Filter className={cn('w-3 h-3', createUserFilter.length > 0 && 'text-blue-600')} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-52 p-2 max-h-[280px] overflow-auto" align="start">
                            <div className="px-2 py-1 text-xs text-gray-500 mb-0.5">可多选</div>
                            <button type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100" onClick={() => { setCreateUserFilter([]); setCurrentPage(1); }}>全部</button>
                            {memberOptions.map((u) => {
                              const isSelected = createUserFilter.includes(u.id);
                              return (
                                <button key={u.id} type="button" className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 truncate flex items-center gap-2 ${isSelected ? 'text-blue-600 font-medium' : ''}`} onClick={() => { const next = isSelected ? createUserFilter.filter((v) => v !== u.id) : [...createUserFilter, u.id]; setCreateUserFilter(next); setCurrentPage(1); }}>
                                  <span className={cn('w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px]', isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300')}>{isSelected ? '✓' : ''}</span>
                                  {u.name}
                                </button>
                              );
                            })}
                            {memberOptions.length === 0 && <div className="px-2 py-2 text-xs text-gray-400">暂无成员</div>}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </ResizableTh>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">加载中...</TableCell></TableRow>
                  ) : caseList.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">暂无用例，可切换左侧模块或清空搜索</TableCell></TableRow>
                  ) : (
                    caseList.map((row) => (
                      <TableRow key={row.id} className="h-10 hover:bg-gray-50/70">
                        <TableCell className="px-3 py-2 w-10">
                          <Checkbox
                            checked={selectedIds.has(row.id)}
                            onCheckedChange={() => toggleSelect(row.id)}
                            aria-label={`选择 ${row.name}`}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-2 font-mono text-sm text-gray-700 truncate" style={{ width: getColumnWidth('num'), minWidth: getColumnWidth('num'), maxWidth: getColumnWidth('num') }} title={row.num ?? '-'}>{row.num ?? '-'}</TableCell>
                        <TableCell className="px-3 py-2 truncate" style={{ width: getColumnWidth('name'), minWidth: getColumnWidth('name'), maxWidth: getColumnWidth('name') }} title={row.name}>{row.name}</TableCell>
                        <TableCell className="px-3 py-2" style={{ width: getColumnWidth('caseLevel'), minWidth: getColumnWidth('caseLevel'), maxWidth: getColumnWidth('caseLevel') }}>
                          <CaseLevelBadge item={row} level={(row as any).caseLevel ?? getCaseLevel(row as any) ?? (row as any).functionalPriority} />
                        </TableCell>
                        <TableCell
                          className="px-3 py-2 text-sm text-gray-600 truncate"
                          style={{ width: getColumnWidth('module'), minWidth: getColumnWidth('module'), maxWidth: getColumnWidth('module') }}
                          title={
                            modulePathMap[row.moduleId as string] ??
                            row.moduleName ??
                            (row as any).modulePath
                          }
                        >
                          {modulePathMap[row.moduleId as string] ??
                            row.moduleName ??
                            (row as any).modulePath ??
                            '-'}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm text-gray-600 truncate" style={{ width: getColumnWidth('createUser'), minWidth: getColumnWidth('createUser'), maxWidth: getColumnWidth('createUser') }} title={row.createUserName ?? (row as any).createUser}>
                          {row.createUserName ?? (row as any).createUser ?? '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <UnifiedPagination
              total={total}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              pageSizeOptions={[10, 20, 50, 100]}
              unitLabel="条记录"
              className="flex-shrink-0 border-t border-gray-100 bg-[#f9fafb]/50 px-4"
            />
          </div>
            </div>
            <SheetFooter className="px-6 py-4 border-t flex-row justify-between shrink-0">
          <span className="text-sm text-gray-500">
            已选 {selectedIds.size} 个用例
            {checkedModuleIds.size > 0 && (
              <>，已勾选 {checkedModuleIds.size} 个模块{checkedModulesTotalCount > 0 && `（约 ${checkedModulesTotalCount} 条用例）`}</>
            )}
          </span>
          <div className="flex gap-2">
            {reviewId && (
              <Popover open={reviewerPopoverOpen} onOpenChange={setReviewerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    评审人：{reviewerIds.length > 0 ? reviewerOptions.filter((r) => reviewerIds.includes(r.id)).map((r) => r.name).join('、') : '请选择'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <ScrollArea className="h-48">
                    {reviewerOptions.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer rounded" onClick={() => toggleReviewer(r.id)}>
                        <Checkbox checked={reviewerIds.includes(r.id)} />
                        <span>{r.name}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitLoading || (reviewId ? reviewerIds.length === 0 : false) || (selectedIds.size === 0 && checkedModuleIds.size === 0)}
            >
              {submitLoading ? '提交中...' : reviewId ? '确认关联' : '确定关联'}
            </Button>
          </div>
        </SheetFooter>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
