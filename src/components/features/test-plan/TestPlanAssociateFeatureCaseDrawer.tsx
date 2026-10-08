/**
 * 测试计划关联功能用例抽屉
 * 参考原项目 aegis-next-server testPlanMinder 关联用例流程：选择用例后通过脑图 edit 接口写入
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Folder, RefreshCw, Link, ChevronRight, ChevronDown, ArrowUp, ArrowDown, ChevronsUpDown, Filter, RotateCcw } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { caseManagementService, testPlanManagementService, projectManagementService } from '@/services';
import { formatTimestampBeijing } from '@/utils/date';
import { getTagsArray } from '@/components/features/case-management/utils';
import { REVIEW_STATUS_MAP, CASE_LEVEL_MAP } from '@/components/features/case-management/constants';
import { CaseDetailDrawer, CaseLevelBadge } from '@/components/features/case-management/components';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { toast } from 'sonner';
import type { ModuleTreeNode } from '@/components/features/case-management/types';

/** 搜索时：节点自身或任意子节点名称匹配则保留 */
function nodeOrChildrenMatch(node: ModuleTreeNode, keyword: string): boolean {
  if (!keyword) return true;
  const k = keyword.trim().toLowerCase();
  if ((node.name ?? '').toLowerCase().includes(k)) return true;
  if (node.children?.length) {
    return node.children.some((c) => nodeOrChildrenMatch(c, k));
  }
  return false;
}

/** 过滤树：只保留匹配的节点，子节点递归过滤 */
function filterModuleTree(nodes: ModuleTreeNode[], keyword: string): ModuleTreeNode[] {
  if (!keyword.trim()) return nodes;
  return nodes
    .filter((n) => nodeOrChildrenMatch(n, keyword))
    .map((n) => ({
      ...n,
      children: n.children?.length
        ? filterModuleTree(n.children, keyword)
        : undefined,
    }));
}

/** 收集树中所有节点 id（用于「全部」勾选时勾选所有模块） */
function getAllModuleIds(nodes: ModuleTreeNode[]): string[] {
  const ids: string[] = [];
  nodes.forEach((n) => {
    ids.push(n.id);
    if (n.children?.length) ids.push(...getAllModuleIds(n.children));
  });
  return ids;
}

/** 收集某节点及其所有子孙节点的 id（用于按模块筛选用例列表，对齐原项目 moduleIds） */
function getModuleAndOffspringIds(moduleId: string, tree: ModuleTreeNode[]): string[] {
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
  findAndCollect(tree);
  return ids;
}

/** 获取某一树节点自身 + 全部子孙节点的 id（用于级联勾选） */
function getSubtreeIds(node: ModuleTreeNode): string[] {
  const ids: string[] = [node.id];
  if (node.children?.length) {
    node.children.forEach((c) => ids.push(...getSubtreeIds(c)));
  }
  return ids;
}

const DRAWER_WIDTH_STORAGE_KEY = 'test-plan-associate-case-drawer-width';
const MIN_DRAWER_WIDTH = 560;
const MAX_DRAWER_WIDTH = 1200;
const DEFAULT_DRAWER_WIDTH = 896;

const LEFT_PANEL_WIDTH_STORAGE_KEY = 'test-plan-associate-case-left-panel-width';
const MIN_LEFT_PANEL_WIDTH = 200;
const MAX_LEFT_PANEL_WIDTH = 520;
const DEFAULT_LEFT_PANEL_WIDTH = 256;

const TABLE_COLUMN_WIDTHS_KEY = 'test-plan-associate-case-drawer-column-widths';
const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 500;
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  num: 80,
  name: 160,
  caseLevel: 72,
  tags: 96,
  reviewStatus: 88,
  createUser: 88,
  createdAt: 144,
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
        const w = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, startW.current + delta));
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

export interface TestPlanAssociateFeatureCaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  projectId: string;
  /** 目标测试点/集合 ID，为空则关联到功能用例下第一个测试点 */
  collectionId?: string | null;
  onSuccess?: () => void;
}

export function TestPlanAssociateFeatureCaseDrawer({
  open,
  onOpenChange,
  planId,
  projectId,
  collectionId,
  onSuccess,
}: TestPlanAssociateFeatureCaseDrawerProps) {
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null);
  const [moduleTree, setModuleTree] = useState<ModuleTreeNode[]>([]);
  const [caseList, setCaseList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [moduleKeyword, setModuleKeyword] = useState('');
  const [caseKeyword, setCaseKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  /** 各模块下用例数量（对齐原项目 modulesCount，用于树节点展示与按模块筛选） */
  const [modulesCount, setModulesCount] = useState<Record<string, number>>({});
  /** 勾选的模块（整模块关联，对齐原项目 ms-associate-case 树节点 checkable） */
  const [checkedModuleIds, setCheckedModuleIds] = useState<Set<string>>(new Set());
  /** 表格排序 */
  const [sortField, setSortField] = useState<'num' | 'name' | 'createdAt' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  /** 表格筛选（多选） */
  const [caseLevelFilter, setCaseLevelFilter] = useState<string[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string[]>([]);
  const [createUserFilter, setCreateUserFilter] = useState<string[]>([]);
  /** 创建人筛选项 */
  const [memberOptions, setMemberOptions] = useState<{ id: string; name: string }[]>([]);

  /** 抽屉宽度（可拖拽左侧边缘调整），持久化 */
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
  /** 表格列宽（可拖拽表头调整），持久化 */
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

  /** 表格筛选条件 */
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

  const fetchModules = useCallback(async () => {
    if (!open || !projectId) return;
    setModuleLoading(true);
    try {
      const tree = await caseManagementService.getCaseModuleTree({ projectId });
      setModuleTree(Array.isArray(tree) ? tree : []);
    } catch (err) {
      console.error('获取模块树失败:', err);
      setModuleTree([]);
    } finally {
      setModuleLoading(false);
    }
  }, [projectId, open]);

  const fetchModulesCount = useCallback(async () => {
    if (!open || !projectId) return;
    const parseCountResponse = (res: any): Record<string, number> => {
      const raw = res?.data ?? res;
      if (!raw || typeof raw !== 'object') return {};
      if (Array.isArray(raw)) {
        const map: Record<string, number> = {};
        raw.forEach((item: any) => {
          const id = item.moduleId ?? item.id ?? item.key;
          const count = item.count ?? item.value ?? 0;
          if (id != null) map[String(id)] = Number(count) || 0;
        });
        return map;
      }
      const map: Record<string, number> = {};
      Object.keys(raw).forEach((k) => {
        const v = raw[k];
        map[k] = typeof v === 'number' ? v : Number(v) || 0;
      });
      return map;
    };
    try {
      const params: Record<string, unknown> = {
        projectId,
        moduleIds: [],
        current: 1,
        pageSize: 10,
      };
      let res: any;
      try {
        res = await caseManagementService.getAssociationPublicCaseModuleCount(params);
      } catch {
        res = await caseManagementService.getCaseModulesCounts(params);
      }
      setModulesCount(parseCountResponse(res));
    } catch (err) {
      console.error('获取模块数量失败:', err);
      setModulesCount({});
    }
  }, [projectId, open]);

  const fetchCaseList = useCallback(async () => {
    if (!open || !projectId) return;
    setLoading(true);
    try {
      const params: any = {
        projectId,
        current: currentPage,
        pageSize,
        keyword: caseKeyword || undefined,
      };
      if (selectedModuleId !== 'all') {
        params.moduleIds = getModuleAndOffspringIds(selectedModuleId, moduleTree);
        if (params.moduleIds.length === 0) params.moduleIds = [selectedModuleId];
      }
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
  }, [projectId, open, currentPage, pageSize, caseKeyword, selectedModuleId, moduleTree, sortField, sortOrder, tableFilter]);

  useEffect(() => {
    if (open) fetchModules();
  }, [open, fetchModules]);
  useEffect(() => {
    if (open && moduleTree.length >= 0) fetchModulesCount();
  }, [open, fetchModulesCount, moduleTree.length]);
  useEffect(() => {
    if (open) {
      setExpandedIds(new Set());
      setCheckedModuleIds(new Set());
    }
  }, [open]);
  useEffect(() => {
    if (open && moduleTree.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        moduleTree.forEach((n) => {
          if (n.id && n.children?.length) next.add(n.id);
        });
        return next;
      });
    }
  }, [open, moduleTree]);
  useEffect(() => {
    if (open) fetchCaseList();
  }, [open, fetchCaseList]);

  useEffect(() => {
    if (open && projectId) {
      projectManagementService.getProjectMemberOptions(projectId).then((res: any) => {
        const list = Array.isArray(res) ? res : res?.list ?? res?.data ?? [];
        setMemberOptions(list.map((u: any) => ({ id: u.id, name: u.name || u.userName || '-' })));
      }).catch(() => setMemberOptions([]));
    }
  }, [open, projectId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredTree = useMemo(
    () => filterModuleTree(moduleTree, moduleKeyword),
    [moduleTree, moduleKeyword]
  );

  const allModuleCount = useMemo(() => {
    const v = modulesCount.total ?? modulesCount.all ?? modulesCount.ALL ?? modulesCount[''];
    if (typeof v === 'number' && v >= 0) return v;
    const vals = Object.values(modulesCount).filter((n): n is number => typeof n === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) : 0;
  }, [modulesCount]);

  const renderModuleNode = (node: ModuleTreeNode, level: number) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedModuleId === node.id;
    // 计算当前节点的 checkbox 状态（支持 indeterminate）
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
              // 勾选/取消时级联应用到所有子孙节点
              const ids = getSubtreeIds(node);
              setCheckedModuleIds((prev) => {
                const next = new Set(prev);
                if (checked) {
                  ids.forEach((id) => next.add(id));
                } else {
                  ids.forEach((id) => next.delete(id));
                }
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
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              aria-label={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" aria-hidden />
          )}
          <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
          <span className="flex-1 whitespace-nowrap">{node.name}</span>
          <span className="text-xs text-blue-600 shrink-0 ml-1">({modulesCount[node.id] ?? node.count ?? 0})</span>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-0">
            {node.children!.map((child) => renderModuleNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** 当前页是否全部已选中（用于表头 checkbox 状态） */
  const isCurrentPageAllSelected = useMemo(
    () => caseList.length > 0 && caseList.every((c) => selectedIds.has(c.id)),
    [caseList, selectedIds]
  );

  /** 勾选的模块（含子孙模块）预计关联用例总数 */
  const checkedModulesTotalCount = useMemo(() => {
    if (checkedModuleIds.size === 0) return 0;
    const allIds = Array.from(checkedModuleIds).flatMap((mid) =>
      getModuleAndOffspringIds(mid, moduleTree)
    );
    const uniqueIds = [...new Set(allIds)];
    return uniqueIds.reduce((sum, id) => sum + (modulesCount[id] ?? 0), 0);
  }, [checkedModuleIds, moduleTree, modulesCount]);

  /** 全选/取消全选当前页（不影响其他页已选项） */
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

  /** 拉取某模块及其子模块下全部用例 id（分页） */
  const fetchAllCaseIdsByModule = useCallback(
    async (moduleId: string): Promise<string[]> => {
      const moduleIds = getModuleAndOffspringIds(moduleId, moduleTree);
      const ids: string[] = [];
      let page = 1;
      const size = 200;
      while (true) {
        const res: any = await caseManagementService.getCaseList({
          projectId,
          current: page,
          pageSize: size,
          moduleIds: moduleIds.length ? moduleIds : undefined,
        });
        const list = res?.list ?? res?.data ?? [];
        list.forEach((item: any) => {
          if (item.id) ids.push(item.id);
        });
        const total = res?.total ?? 0;
        if (ids.length >= total || list.length < size) break;
        page += 1;
      }
      return ids;
    },
    [projectId, moduleTree]
  );

  const handleSubmit = async () => {
    const caseIdsFromTable = Array.from(selectedIds);
    const caseIdsFromModules: string[] = [];
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
    if (allCaseIds.length === 0) {
      toast.error('请至少勾选模块或选择用例');
      return;
    }
    setSubmitLoading(true);
    try {
      await testPlanManagementService.associateFeatureCasesToPlan(
        planId,
        projectId,
        allCaseIds,
        collectionId ?? undefined
      );
      toast.success('关联成功');
      onSuccess?.();
      onOpenChange(false);
      setSelectedIds(new Set());
      setCheckedModuleIds(new Set());
    } catch (err: any) {
      toast.error(err?.message || '关联失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
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
              <div className="w-0.5 h-8 bg-gray-300 rounded-full opacity-0 hover:opacity-100" />
            </div>
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <SheetHeader className="px-6 py-4 border-b shrink-0">
                <SheetTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-blue-600" />
                  关联功能用例
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
                    onClick={() => {
                      setSelectedModuleId('all');
                      setCurrentPage(1);
                    }}
                  >
                    <Checkbox
                      checked={moduleTree.length > 0 && getAllModuleIds(moduleTree).every((id) => checkedModuleIds.has(id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCheckedModuleIds(new Set(getAllModuleIds(moduleTree)));
                        } else {
                          setCheckedModuleIds(new Set());
                        }
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
                      {filteredTree.map((node) => renderModuleNode(node, 0))}
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
                        <button key={value} type="button" className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'text-blue-600 font-medium' : ''}`} onClick={() => { const next = isSelected ? reviewStatusFilter.filter((v) => v !== value) : [...reviewStatusFilter, value]; setReviewStatusFilter(next); setCurrentPage(1); }}>
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
                      <ResizableTh columnKey="num" width={getColumnWidth('num')} onResize={handleColumnResize}>
                        <button type="button" className="flex items-center gap-0.5 hover:text-gray-900 w-full text-left" onClick={() => handleSort('num')}>
                          ID
                          {sortField === 'num' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                        </button>
                      </ResizableTh>
                      <ResizableTh columnKey="name" width={getColumnWidth('name')} onResize={handleColumnResize}>
                        <button type="button" className="flex items-center gap-0.5 hover:text-gray-900 w-full text-left" onClick={() => handleSort('name')}>
                          用例名称
                          {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                        </button>
                      </ResizableTh>
                      <ResizableTh columnKey="caseLevel" width={getColumnWidth('caseLevel')} onResize={handleColumnResize}>
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
                      <ResizableTh columnKey="tags" width={getColumnWidth('tags')} onResize={handleColumnResize}>
                        标签
                      </ResizableTh>
                      <ResizableTh columnKey="reviewStatus" width={getColumnWidth('reviewStatus')} onResize={handleColumnResize}>
                        <div className="flex items-center gap-1">
                          <span>评审结果</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="p-0.5 rounded hover:bg-gray-100" title="筛选（可多选）">
                                <Filter className={cn('w-3 h-3', reviewStatusFilter.length > 0 && 'text-blue-600')} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-2 max-h-[260px] overflow-auto" align="start">
                              <div className="px-2 py-1 text-xs text-gray-500 mb-0.5">可多选</div>
                              <button type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100" onClick={() => { setReviewStatusFilter([]); setCurrentPage(1); }}>全部</button>
                              {Object.entries(REVIEW_STATUS_MAP).map(([value, { label }]) => {
                                const isSelected = reviewStatusFilter.includes(value);
                                return (
                                  <button key={value} type="button" className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'text-blue-600 font-medium' : ''}`} onClick={() => { const next = isSelected ? reviewStatusFilter.filter((v) => v !== value) : [...reviewStatusFilter, value]; setReviewStatusFilter(next); setCurrentPage(1); }}>
                                    <span className={cn('w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px]', isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300')}>{isSelected ? '✓' : ''}</span>
                                    {label}
                                  </button>
                                );
                              })}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </ResizableTh>
                      <ResizableTh columnKey="createUser" width={getColumnWidth('createUser')} onResize={handleColumnResize}>
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
                      <ResizableTh columnKey="createdAt" width={getColumnWidth('createdAt')} onResize={handleColumnResize}>
                        <button type="button" className="flex items-center gap-0.5 hover:text-gray-900 w-full text-left" onClick={() => handleSort('createdAt')}>
                          创建时间
                          {sortField === 'createdAt' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                        </button>
                      </ResizableTh>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : caseList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          暂无用例
                        </TableCell>
                      </TableRow>
                    ) : (
                      caseList.map((row) => {
                        const reviewInfo = REVIEW_STATUS_MAP[row.reviewStatus ?? ''] ?? null;
                        const tagsArr = getTagsArray(row.tags);
                        const wNum = getColumnWidth('num');
                        const wName = getColumnWidth('name');
                        const wCaseLevel = getColumnWidth('caseLevel');
                        const wTags = getColumnWidth('tags');
                        const wReview = getColumnWidth('reviewStatus');
                        const wCreateUser = getColumnWidth('createUser');
                        const wCreateTime = getColumnWidth('createdAt');
                        return (
                          <TableRow key={row.id} className="h-9">
                            <TableCell className="w-10 px-2">
                              <Checkbox
                                checked={selectedIds.has(row.id)}
                                onCheckedChange={() => toggleSelect(row.id)}
                              />
                            </TableCell>
                            <TableCell className="truncate" style={{ width: wNum, minWidth: wNum, maxWidth: wNum }}>
                              <button
                                type="button"
                                className="font-mono text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer text-left w-full truncate block"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailCaseId(row.id);
                                  setDetailDrawerOpen(true);
                                }}
                              >
                                {row.num ?? row.id ?? '-'}
                              </button>
                            </TableCell>
                            <TableCell className="truncate text-gray-900" style={{ width: wName, minWidth: wName, maxWidth: wName }} title={row.name}>
                              {row.name ?? '-'}
                            </TableCell>
                            <TableCell className="truncate" style={{ width: wCaseLevel, minWidth: wCaseLevel, maxWidth: wCaseLevel }}>
                              <CaseLevelBadge item={row as any} />
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 truncate" style={{ width: wTags, minWidth: wTags, maxWidth: wTags }} title={tagsArr.join(', ')}>
                              {tagsArr.length ? tagsArr.join('、') : '-'}
                            </TableCell>
                            <TableCell className="truncate" style={{ width: wReview, minWidth: wReview, maxWidth: wReview }}>
                              {reviewInfo ? (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${reviewInfo.color}`}>
                                  {reviewInfo.label}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 truncate" style={{ width: wCreateUser, minWidth: wCreateUser, maxWidth: wCreateUser }} title={row.createUserName ?? row.createUser}>
                              {row.createUserName ?? row.createUser ?? '-'}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 tabular-nums whitespace-nowrap truncate" style={{ width: wCreateTime, minWidth: wCreateTime, maxWidth: wCreateTime }}>
                              {formatTimestampBeijing(row.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <UnifiedPagination
                total={total}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
                unitLabel="条记录"
                className="flex-shrink-0 border-t border-gray-100 bg-[#f9fafb]/50 px-4"
              />
            </div>
          </div>
          <SheetFooter className="px-6 py-4 border-t flex-row justify-between">
            <span className="text-sm text-gray-500">
              已选 {selectedIds.size} 个用例
              {checkedModuleIds.size > 0 && (
                <>，已勾选 {checkedModuleIds.size} 个模块{checkedModulesTotalCount > 0 && `（约 ${checkedModulesTotalCount} 条用例）`}</>
              )}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitLoading || (selectedIds.size === 0 && checkedModuleIds.size === 0)}
              >
                {submitLoading ? '关联中...' : '确定关联'}
              </Button>
            </div>
          </SheetFooter>
          </div>
        </div>
        </SheetContent>
      </Sheet>
      <CaseDetailDrawer
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        caseId={detailCaseId}
        caseList={caseList}
        caseIndex={detailCaseId ? Math.max(0, caseList.findIndex((c) => c.id === detailCaseId)) : 0}
        moduleTree={moduleTree}
        currentPage={1}
        totalPages={Math.max(1, totalPages)}
        onPageChange={() => { }}
        projectId={projectId}
        onSuccess={() => {
          fetchCaseList();
        }}
        onCaseSelect={(item) => setDetailCaseId(item.id)}
      />
    </>
  );
}
