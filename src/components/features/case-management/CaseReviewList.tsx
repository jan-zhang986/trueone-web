/**
 * 用例评审列表
 * 完整迁移自 aegis-next-server caseReview/index.vue + reviewTable.vue
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, Plus, RefreshCw, Search, Folder, ChevronRight, ChevronDown, ChevronUp,
  MoreHorizontal, Edit, Copy, Trash2, FolderPlus, Pencil, Filter, HelpCircle, Settings, X, GripVertical,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { caseManagementService } from '@/services';
import { toast } from 'sonner';
import { stripHtmlTags } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { cn } from '@/utils/cn';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ReviewItem, ModuleTreeNode } from './types';
import { ReviewPassRateDisplay } from './ReviewPassRateDisplay';
import { REVIEW_STATUS_LABEL_MAP, REVIEW_PASS_RULE_MAP } from './constants';
import { ModuleTreePanel } from './components/ModuleTreePanel';

type ShowType = 'all' | 'reviewByMe' | 'createByMe';

function getReviewersDisplay(reviewers: ReviewItem['reviewers']): string {
  if (!reviewers?.length) return '-';
  if (typeof reviewers[0] === 'string') return (reviewers as string[]).join('、');
  return (reviewers as { userName: string }[]).map((r) => r.userName).join('、');
}

interface CaseReviewListProps {
  projectId?: string;
  onCreateReview?: (moduleId?: string) => void;
  onViewReview?: (id: string) => void;
  onEditReview?: (id: string) => void;
}

export function CaseReviewList({
  projectId = localStorage.getItem('currentProjectId') || 'default-project',
  onCreateReview,
  onViewReview,
  onEditReview,
}: CaseReviewListProps) {
  const [loading, setLoading] = useState(false);
  const [reviewList, setReviewList] = useState<ReviewItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const REVIEW_TABLE_PAGE_SIZE_KEY = 'case-review-table-page-size';
  const [pageSize, setPageSize] = useState(() => {
    try {
      const v = localStorage.getItem(REVIEW_TABLE_PAGE_SIZE_KEY);
      const n = v ? parseInt(v, 10) : 20;
      return [10, 20, 30, 40, 50].includes(n) ? n : 20;
    } catch {
      return 20;
    }
  });
  const [total, setTotal] = useState(0);
  const [moduleTree, setModuleTree] = useState<ModuleTreeNode[]>([]);
  const [modulesCount, setModulesCount] = useState<Record<string, number>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [showType, setShowType] = useState<ShowType>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleDialogMode, setModuleDialogMode] = useState<'add' | 'rename'>('add');
  const [moduleDialogParentId, setModuleDialogParentId] = useState<string>('root');
  const [moduleDialogNodeId, setModuleDialogNodeId] = useState<string | null>(null);
  const [moduleDialogName, setModuleDialogName] = useState('');
  const [moduleDialogLoading, setModuleDialogLoading] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [moduleDeleteLoading, setModuleDeleteLoading] = useState(false);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetModuleId, setMoveTargetModuleId] = useState<string>('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moduleKeyword, setModuleKeyword] = useState('');
  const [viewId, setViewId] = useState<string>('all');
  const [viewLabel, setViewLabel] = useState<string>('全部数据');
  const [viewOpen, setViewOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterViewName, setFilterViewName] = useState('全部数据');
  const [filterBannerDismissed, setFilterBannerDismissed] = useState(false);
  const [filterOptionSearch, setFilterOptionSearch] = useState('');
  const [filterLogic, setFilterLogic] = useState<'and' | 'or'>('and');
  const [filterConditions, setFilterConditions] = useState<Array<{ field: string; op: string; value: string }>>([]);
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<'and' | 'or'>('and');
  const [appliedFilterConditions, setAppliedFilterConditions] = useState<Array<{ field: string; op: string; value: string }>>([]);

  /** 表头排序：与 spotter reviewTable 一致，后端 sort 为 Map<字段名(camelCase), 'asc'|'desc'> */
  const [tableSort, setTableSort] = useState<{ field: 'num' | 'name' | 'createdAt'; order: 'asc' | 'desc' } | null>(null);
  /** 表头筛选：后端 filter 为 Map<string, string[]>，支持 status、reviewPassRule、createUser、reviewers */
  const [tableFilter, setTableFilter] = useState<Record<string, string[]>>({});
  /** 评审人筛选项（具有评审权限的用户），打开 Popover 时加载 */
  const [reviewerOptions, setReviewerOptions] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [reviewerOptionsLoading, setReviewerOptionsLoading] = useState(false);
  const [reviewerFilterKeyword, setReviewerFilterKeyword] = useState('');

  const REVIEW_FILTER_VIEWS_KEY = 'case-review-filter-views';
  const flattenedModules = useMemo(() => {
    const out: { id: string; name: string }[] = [];
    function walk(nodes: ModuleTreeNode[], depth = 0) {
      nodes.forEach((n) => {
        out.push({ id: n.id, name: (depth ? '　'.repeat(depth) : '') + n.name });
        if (n.children?.length) walk(n.children, depth + 1);
      });
    }
    walk(moduleTree);
    return out;
  }, [moduleTree]);
  const addConditionWithField = (fieldValue: string) => {
    const defaultOp = fieldValue === 'moduleId' ? 'in' : ['status', 'reviewPassRule', 'caseCount', 'passRate'].includes(fieldValue) ? 'equals' : 'contains';
    setFilterConditions((prev) => [...prev, { field: fieldValue, op: defaultOp, value: '' }]);
  };
  const savedFilterViews = useMemo(() => {
    try {
      const raw = localStorage.getItem(REVIEW_FILTER_VIEWS_KEY);
      const list: Array<{ id: string; name: string; logic: 'and' | 'or'; conditions: Array<{ field: string; op: string; value: string }> }> = raw ? JSON.parse(raw) : [];
      return list;
    } catch {
      return [];
    }
  }, [filterOpen]);
  const saveAsView = () => {
    const name = filterViewName.trim() || '未命名视图';
    try {
      const raw = localStorage.getItem(REVIEW_FILTER_VIEWS_KEY);
      const list: Array<{ id: string; name: string; logic: 'and' | 'or'; conditions: Array<{ field: string; op: string; value: string }> }> = raw ? JSON.parse(raw) : [];
      list.push({ id: `custom_${Date.now()}`, name, logic: filterLogic, conditions: [...filterConditions] });
      localStorage.setItem(REVIEW_FILTER_VIEWS_KEY, JSON.stringify(list));
      toast.success(`已另存为视图「${name}」`);
    } catch {
      toast.error('保存视图失败');
    }
  };
  const loadSavedView = (view: { name: string; logic: 'and' | 'or'; conditions: Array<{ field: string; op: string; value: string }> }) => {
    setFilterViewName(view.name);
    setFilterLogic(view.logic);
    setFilterConditions(view.conditions.length ? view.conditions.map((c) => ({ ...c })) : []);
  };

  const FILTER_FIELD_OPTIONS = useMemo(() => [
    { value: 'num', label: 'ID' },
    { value: 'name', label: '评审名称' },
    { value: 'caseCount', label: '用例数量' },
    { value: 'status', label: '评审状态' },
    { value: 'passRate', label: '通过率' },
    { value: 'reviewPassRule', label: '评审模式' },
    { value: 'reviewers', label: '评审人' },
    { value: 'createUserName', label: '创建人' },
    { value: 'moduleId', label: '所属模块' },
    { value: 'tags', label: '标签' },
    { value: 'description', label: '描述' },
    { value: 'cycle', label: '评审周期' },
    { value: 'createdAt', label: '创建时间' },
  ], []);
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);
  const REVIEW_TABLE_COLUMNS_KEY = 'case-review-table-visible-columns';
  const defaultVisibleColumns: Record<string, boolean> = {
    num: true, name: true, caseCount: true, status: true, passRate: true, reviewPassRule: true,
    reviewers: true, createUserName: true, moduleName: true, tags: true, description: true, cycle: true, createdAt: true,
  };
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem(REVIEW_TABLE_COLUMNS_KEY);
      if (!s) return defaultVisibleColumns;
      const parsed = JSON.parse(s);
      return { ...defaultVisibleColumns, ...parsed };
    } catch {
      return defaultVisibleColumns;
    }
  });
  const toggleColumnVisible = (key: string) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(REVIEW_TABLE_COLUMNS_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };
  const undoColumnSettings = () => {
    setVisibleColumns(defaultVisibleColumns);
    try {
      localStorage.setItem(REVIEW_TABLE_COLUMNS_KEY, JSON.stringify(defaultVisibleColumns));
    } catch { /* ignore */ }
  };
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    try {
      localStorage.setItem(REVIEW_TABLE_PAGE_SIZE_KEY, String(size));
    } catch { /* ignore */ }
  };

  const offspringIds = useMemo(() => {
    if (selectedModuleId === 'all' || !moduleTree.length) return [];
    const collect: string[] = [];
    function collectDescendants(nodes: any[]): void {
      for (const n of nodes) {
        collect.push(n.id);
        if (n.children?.length) collectDescendants(n.children);
      }
    }
    function findAndCollect(nodes: any[]): boolean {
      for (const n of nodes) {
        if (n.id === selectedModuleId) {
          if (n.children?.length) collectDescendants(n.children);
          return true;
        }
        if (n.children?.length && findAndCollect(n.children)) return true;
      }
      return false;
    }
    findAndCollect(moduleTree);
    return collect;
  }, [selectedModuleId, moduleTree]);

  const fetchModuleTree = async () => {
    try {
      const result = await caseManagementService.getReviewModules(projectId);
      setModuleTree(result || []);
    } catch (err) {
      console.error('获取评审模块树失败:', err);
      setModuleTree([]);
    }
  };

  const fetchModulesCount = async () => {
    try {
      const moduleIds =
        selectedModuleId === 'all'
          ? []
          : offspringIds.length
            ? [selectedModuleId, ...offspringIds]
            : [selectedModuleId];
      const currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('userId') || '';
      const params: Record<string, unknown> = {
        projectId,
        moduleIds,
        current: 1,
        pageSize: 20,
      };
      if (searchKeyword?.trim()) params.keyword = searchKeyword.trim();
      if (showType === 'createByMe' && currentUserId) params.createByMe = currentUserId;
      if (showType === 'reviewByMe' && currentUserId) params.reviewByMe = currentUserId;
      const res = await caseManagementService.reviewModuleCount(params);
      setModulesCount(res || {});
    } catch (err) {
      console.error('获取模块数量失败:', err);
    }
  };

  const fetchReviewList = async () => {
    setLoading(true);
    try {
      const currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('userId') || '';
      const moduleIds = selectedModuleId !== 'all' ? (offspringIds.length ? [selectedModuleId, ...offspringIds] : [selectedModuleId]) : [];
      // 与后端 CaseReviewPageRequest 一致：sort/viewId/combineSearch/filter 按约定结构传递
      const params: Record<string, unknown> = {
        projectId,
        current: currentPage,
        pageSize,
        sort: tableSort ? { [tableSort.field]: tableSort.order } : {},
        keyword: searchKeyword ?? '',
        viewId: '',
        combineSearch: { searchMode: 'AND' as const, conditions: [] },
        moduleIds,
        createByMe: showType === 'createByMe' && currentUserId ? currentUserId : undefined,
        reviewByMe: showType === 'reviewByMe' && currentUserId ? currentUserId : undefined,
      };
      // 筛选条件：与后端约定一致，始终传 filter（空对象或含 reviewers/status/reviewPassRule）
      params.filter = Object.keys(tableFilter).length > 0 ? { ...tableFilter } : {};
      const result = await caseManagementService.getReviewList(params);
      const list = result?.list ?? result?.data ?? [];
      setReviewList(list);
      setTotal(result?.total ?? list.length);
    } catch (err) {
      console.error('获取评审列表失败:', err);
      setReviewList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModuleTree(); }, [projectId]);
  useEffect(() => { fetchReviewList(); }, [currentPage, pageSize, searchKeyword, selectedModuleId, showType, offspringIds, tableSort, tableFilter]);

  /** 表头排序切换：asc -> desc -> 取消，与 spotter/测试计划一致 */
  const toggleSort = (field: 'num' | 'name' | 'createdAt') => {
    setTableSort((prev) => {
      if (prev?.field !== field) return { field, order: 'asc' as const };
      if (prev.order === 'asc') return { field, order: 'desc' as const };
      return null;
    });
    setCurrentPage(1);
  };

  /** 表头筛选：设置某字段的筛选值（空数组表示清空） */
  const setHeaderFilter = (key: string, values: string[]) => {
    setTableFilter((prev) => {
      const next = { ...prev };
      if (values.length === 0) delete next[key];
      else next[key] = values;
      return next;
    });
    setCurrentPage(1);
  };

  /** 加载评审人选项（具有评审权限的用户），打开弹层时拉取全部，搜索在本地过滤 */
  const fetchReviewerOptions = useCallback(async () => {
    setReviewerOptionsLoading(true);
    try {
      const res: any = await caseManagementService.getReviewUsers(projectId, '');
      const list = Array.isArray(res) ? res : res?.list ?? res?.data ?? res?.result ?? [];
      setReviewerOptions(list.map((u: any) => ({ id: u.id, name: u.name || u.userName || u.email || '-', email: u.email || '' })));
    } catch {
      setReviewerOptions([]);
    } finally {
      setReviewerOptionsLoading(false);
    }
  }, [projectId]);

  /** 评审人列表按输入关键词本地过滤（姓名、邮箱） */
  const filteredReviewerOptions = useMemo(() => {
    const k = reviewerFilterKeyword.trim().toLowerCase();
    if (!k) return reviewerOptions;
    return reviewerOptions.filter(
      (r) => (r.name || '').toLowerCase().includes(k) || (r.email || '').toLowerCase().includes(k)
    );
  }, [reviewerOptions, reviewerFilterKeyword]);

  useEffect(() => { fetchModulesCount(); }, [projectId, searchKeyword, selectedModuleId, showType, offspringIds]);

  const getItemFieldValue = (item: ReviewItem, field: string): string | number | undefined => {
    if (field === 'num') return item.num != null ? String(item.num) : '';
    if (field === 'cycle') {
      if (item.startTime && item.endTime) return `${new Date(item.startTime as string | number).toLocaleString('zh-CN')} - ${new Date(item.endTime as string | number).toLocaleString('zh-CN')}`;
      return '';
    }
    if (field === 'reviewers') return getReviewersDisplay(item.reviewers);
    if (field === 'tags') return Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags ?? '');
    const v = (item as any)[field];
    if (v == null) return '';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  };

  const displayedReviewList = useMemo(() => {
    if (!appliedFilterConditions.length) return reviewList;
    return reviewList.filter((item) => {
      const results = appliedFilterConditions.map((cond) => {
        const raw = getItemFieldValue(item, cond.field);
        const strVal = raw === undefined || raw === null ? '' : String(raw).trim();
        const keywords = cond.value.trim() ? cond.value.trim().split(/\s+/) : [];
        if (cond.op === 'contains') {
          if (!keywords.length) return true;
          return keywords.every((k) => strVal.includes(k));
        }
        if (cond.op === 'equals') return strVal === cond.value.trim();
        if (cond.op === 'in' || cond.op === 'belongs') {
          if (!cond.value) return true;
          if (cond.value === 'root') return !item.moduleId || item.moduleId === 'root' || item.moduleId === '';
          return item.moduleId === cond.value || strVal === cond.value;
        }
        if (cond.op === 'gt') return Number(raw) > Number(cond.value);
        if (cond.op === 'gte') return Number(raw) >= Number(cond.value);
        if (cond.op === 'lt') return Number(raw) < Number(cond.value);
        if (cond.op === 'lte') return Number(raw) <= Number(cond.value);
        return true;
      });
      return appliedFilterLogic === 'and' ? results.every(Boolean) : results.some(Boolean);
    });
  }, [reviewList, appliedFilterConditions, appliedFilterLogic]);

  const handleDelete = (item: ReviewItem) => {
    setReviewToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;
    setDeleteLoading(true);
    try {
      await caseManagementService.deleteReview(reviewToDelete.id, projectId);
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
      fetchReviewList();
      fetchModulesCount();
    } catch (err) {
      toast.error('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openAddModule = (parentId = 'root') => {
    setModuleDialogMode('add');
    setModuleDialogParentId(parentId);
    setModuleDialogNodeId(null);
    setModuleDialogName('');
    setModuleDialogOpen(true);
  };

  /** 获取同级模块名称列表（用于新建/重命名时重名校验，与 aegis-next-server popConfirm allNames 一致） */
  const getSiblingNames = (parentId: string, excludeNodeId?: string): string[] => {
    if (parentId === 'root' || parentId === 'NONE') {
      return moduleTree.map((n) => (n.name || '').trim()).filter(Boolean);
    }
    const findSiblings = (nodes: ModuleTreeNode[]): string[] | null => {
      for (const n of nodes) {
        if (n.id === parentId && n.children) {
          return n.children
            .filter((c) => c.id !== excludeNodeId)
            .map((c) => (c.name || '').trim())
            .filter(Boolean);
        }
        if (n.children) {
          const ret = findSiblings(n.children);
          if (ret) return ret;
        }
      }
      return null;
    };
    return findSiblings(moduleTree) ?? [];
  };

  /** 获取某节点同级名称（用于重命名时排除自身后的兄弟名称） */
  const getSiblingNamesForNode = (nodeId: string): string[] => {
    const findParent = (nodes: ModuleTreeNode[], parent: ModuleTreeNode | null): ModuleTreeNode | null | undefined => {
      for (const n of nodes) {
        if (n.id === nodeId) return parent;
        if (n.children) {
          const p = findParent(n.children, n);
          if (p !== undefined) return p;
        }
      }
      return undefined;
    };
    const parent = findParent(moduleTree, null);
    if (parent === undefined) return [];
    if (parent === null) return moduleTree.filter((n) => n.id !== nodeId).map((n) => (n.name || '').trim()).filter(Boolean);
    return (parent.children ?? []).filter((c) => c.id !== nodeId).map((c) => (c.name || '').trim()).filter(Boolean);
  };

  const openRenameModule = (node: { id: string; name: string }) => {
    setModuleDialogMode('rename');
    setModuleDialogNodeId(node.id);
    setModuleDialogName(node.name);
    setModuleDialogOpen(true);
  };

  const handleModuleDialogSubmit = async () => {
    const name = moduleDialogName.trim();
    if (!name) {
      toast.error('请输入模块名称');
      return;
    }
    const parentIdForApi = moduleDialogParentId === 'root' ? 'NONE' : moduleDialogParentId;
    const siblingNames =
      moduleDialogMode === 'rename' && moduleDialogNodeId
        ? getSiblingNamesForNode(moduleDialogNodeId)
        : getSiblingNames(moduleDialogParentId);
    if (siblingNames.includes(name)) {
      toast.error('同级模块下名称已存在');
      return;
    }
    setModuleDialogLoading(true);
    try {
      if (moduleDialogMode === 'add') {
        await caseManagementService.addReviewModule({ projectId, name, parentId: parentIdForApi });
        toast.success('创建成功');
      } else if (moduleDialogNodeId) {
        await caseManagementService.updateReviewModule({ id: moduleDialogNodeId, name });
        toast.success('重命名成功');
      }
      setModuleDialogOpen(false);
      fetchModuleTree();
      fetchModulesCount();
    } catch (err: any) {
      toast.error(err?.message || '操作失败');
    } finally {
      setModuleDialogLoading(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    setModuleDeleteLoading(true);
    try {
      await caseManagementService.deleteReviewModule(moduleToDelete.id);
      toast.success('删除成功');
      setModuleToDelete(null);
      fetchModuleTree();
      fetchModulesCount();
      if (selectedModuleId === moduleToDelete.id) setSelectedModuleId('all');
    } catch (err: any) {
      toast.error('删除失败');
    } finally {
      setModuleDeleteLoading(false);
    }
  };

  const isAllReviewSelected = displayedReviewList.length > 0 && displayedReviewList.every((item) => selectedReviewIds.includes(item.id));
  const toggleReviewSelect = (id: string) => {
    setSelectedReviewIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSelectAllReviews = () => {
    if (isAllReviewSelected) setSelectedReviewIds([]);
    else setSelectedReviewIds(displayedReviewList.map((item) => item.id));
  };
  const openMoveModal = () => {
    setMoveTargetModuleId('');
    setMoveModalOpen(true);
  };
  const confirmMove = async () => {
    if (!moveTargetModuleId || selectedReviewIds.length === 0) return;
    setMoveLoading(true);
    try {
      await caseManagementService.moveReview({
        selectIds: selectedReviewIds,
        selectAll: false,
        condition: {},
        moveModuleId: moveTargetModuleId,
      });
      toast.success('移动成功');
      setMoveModalOpen(false);
      setSelectedReviewIds([]);
      setMoveTargetModuleId('');
      fetchReviewList();
      fetchModulesCount();
    } catch (err) {
      toast.error('移动失败');
    } finally {
      setMoveLoading(false);
    }
  };

  const handleCopy = async (item: ReviewItem) => {
    try {
      const res: any = await caseManagementService.copyReview({
        copyId: item.id,
        projectId,
        name: `${item.name}_复制`,
        moduleId: item.moduleId || 'root',
        reviewPassRule: (item.reviewPassRule as 'SINGLE' | 'MULTIPLE') || 'SINGLE',
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
        tags: item.tags || [],
        description: item.description || '',
        reviewers: Array.isArray(item.reviewers)
          ? (item.reviewers as (string | { userId?: string })[]).map((r) => (typeof r === 'string' ? r : (r as { userId?: string }).userId)).filter(Boolean) as string[]
          : [],
      });
      const newId = res?.id || res?.data?.id;
      if (newId) {
        toast.success('复制成功');
        onViewReview?.(newId);
      }
    } catch (err) {
      toast.error('复制失败');
    }
  };

  const renderTreeNodeForMove = (node: any): JSX.Element => {
    const isSelected = moveTargetModuleId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    return (
      <div key={node.id}>
        <button
          type="button"
          className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
          onClick={() => setMoveTargetModuleId(node.id)}
        >
          {hasChildren ? <ChevronRight className="w-4 h-4 shrink-0" /> : <div className="w-4" />}
          <span className="truncate">{node.name}</span>
        </button>
        {hasChildren && (
          <div className="ml-4 border-l border-gray-100 pl-1">
            {node.children.map((c: any) => renderTreeNodeForMove(c))}
          </div>
        )}
      </div>
    );
  };

  const renderTreeNode = (node: any, level: number = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedModuleId === node.id;
    const count = modulesCount[node.id] ?? node.count ?? 0;
    return (
      <div key={node.id} className="mb-0.5 group/node">
        <div
          style={{ paddingLeft: level * 12 }}
          className={`flex items-center gap-1.5 px-2 py-1.5 mr-2 rounded-r-full text-[13px] cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 text-[#165DFF] font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-[#165DFF]'}`}
          onClick={() => {
            if (hasChildren) setExpandedNodes((prev) => (prev.has(node.id) ? new Set([...prev].filter((x) => x !== node.id)) : new Set([...prev, node.id])));
            setSelectedModuleId(node.id);
            setCurrentPage(1);
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          ) : (
            <div className="w-3.5 flex-shrink-0" />
          )}
          <span className="flex-1 truncate min-w-0">{node.name}</span>
          {count !== undefined && count > 0 && (
            <span className={`text-xs ml-auto tabular-nums shrink-0 ${isSelected ? 'text-[#165DFF]' : 'text-gray-400 opacity-80'}`}>
              {count}
            </span>
          )}
          {/* 与 aegis-next-server moduleTree 一致：节点右侧添加子模块 + 重命名/删除 */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/node:opacity-100" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-200/80 text-gray-500 hover:text-[#165DFF]"
              title="添加子模块"
              aria-label="添加子模块"
              onClick={() => openAddModule(node.id)}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-gray-200/80 text-gray-500 hover:text-gray-700"
                  title="更多操作"
                  aria-label="更多操作"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => openRenameModule({ id: node.id, name: node.name })}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> 重命名
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setModuleToDelete({ id: node.id, name: node.name })}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {node.children.map((c: any) => renderTreeNode(c, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canGoToPrev = currentPage > 1;
  const canGoToNext = currentPage < totalPages;
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };
  const [jumpToPage, setJumpToPage] = useState<string | number>('');
  const handleJumpToPage = () => {
    if (jumpToPage === '' || jumpToPage === 0) return;
    const pageNum = typeof jumpToPage === 'string' ? parseInt(jumpToPage, 10) : jumpToPage;
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpToPage('');
    } else {
      toast.error(`请输入有效的页码（1-${totalPages}）`);
      setJumpToPage('');
    }
  };
  const handleJumpToPageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleJumpToPage();
    }
  };
  const allCount = modulesCount['all'] ?? modulesCount['ALL'] ?? total;

  // 按模块名称过滤树（与用例管理侧栏一致）
  const filteredModuleTree = useMemo(() => {
    const kw = (moduleKeyword || '').trim().toLowerCase();
    if (!kw) return moduleTree;
    const filterTree = (nodes: ModuleTreeNode[]): ModuleTreeNode[] => {
      return nodes
        .map((n) => ({
          ...n,
          children: n.children?.length ? filterTree(n.children) : undefined,
        }))
        .filter((n) => n.name?.toLowerCase().includes(kw) || (n.children && n.children.length > 0));
    };
    return filterTree(moduleTree);
  }, [moduleTree, moduleKeyword]);

  // 可展开节点 id 集合，用于「展开/收起全部」
  const expandableIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (nodes: any[]) => {
      nodes.forEach((n) => {
        if (n.children?.length) {
          ids.add(n.id);
          collect(n.children);
        }
      });
    };
    collect(moduleTree);
    return ids;
  }, [moduleTree]);
  const isExpandAll = expandableIds.size > 0 && expandedNodes.size >= expandableIds.size;
  const handleExpandAll = () => {
    if (isExpandAll) setExpandedNodes(new Set());
    else setExpandedNodes(new Set(expandableIds));
  };
  const handleCollapseAll = () => setExpandedNodes(new Set());

  /** 用例评审左侧模块树：与用例管理同一套移动逻辑与交互（拖拽前/内/后、「作为子级」高亮） */
  const handleReviewAddSubModule = useCallback(
    async (parentId: string, name: string) => {
      const parentIdForApi = parentId === 'NONE' || parentId === '' ? 'NONE' : parentId;
      await caseManagementService.addReviewModule({ projectId, name, parentId: parentIdForApi });
      toast.success('创建成功');
      fetchModuleTree();
      fetchModulesCount();
    },
    [projectId]
  );
  const handleReviewRenameModule = useCallback(
    async (nodeId: string, name: string) => {
      await caseManagementService.updateReviewModule({ id: nodeId, name });
      toast.success('重命名成功');
      fetchModuleTree();
      fetchModulesCount();
    },
    []
  );
  const handleReviewDeleteModule = useCallback(
    async (nodeId: string) => {
      await caseManagementService.deleteReviewModule(nodeId);
      toast.success('删除成功');
      if (selectedModuleId === nodeId) setSelectedModuleId('all');
      fetchModuleTree();
      fetchModulesCount();
    },
    [selectedModuleId]
  );
  const handleReviewMoveModule = useCallback(
    async (dragNodeId: string, dropNodeId: string, dropPosition: number) => {
      await caseManagementService.moveReviewModule({ dragNodeId, dropNodeId, dropPosition });
      toast.success('移动成功');
      fetchModuleTree();
      fetchModulesCount();
    },
    []
  );

  return (
    <div className="flex-1 flex flex-col bg-[#f5f6f8] min-h-0 overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="w-full h-full flex flex-col bg-white rounded-r-lg border border-gray-200/80 border-l-0 shadow-sm border-r border-gray-200">
            <ModuleTreePanel
              moduleTree={moduleTree}
              modulesCount={modulesCount}
              expandedNodes={expandedNodes}
              selectedModuleId={selectedModuleId}
              moduleSearchKeyword={moduleKeyword}
              allModuleCount={allCount}
              onModuleSearchChange={setModuleKeyword}
              onModuleSelect={(id) => {
                setSelectedModuleId(id);
                setCurrentPage(1);
              }}
              onToggleExpand={(nodeId) =>
                setExpandedNodes((prev) =>
                  prev.has(nodeId) ? new Set([...prev].filter((x) => x !== nodeId)) : new Set([...prev, nodeId])
                )
              }
              isExpandAll={isExpandAll}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              onAddSubModule={handleReviewAddSubModule}
              onRenameModule={handleReviewRenameModule}
              onDeleteModule={handleReviewDeleteModule}
              onMoveModule={handleReviewMoveModule}
              allLabel="全部评审"
              headerRight={
                <Button
                  size="sm"
                  className="h-8 rounded-md bg-[#165DFF] hover:bg-[#165DFF]/90 text-white shrink-0 px-3"
                  onClick={() => onCreateReview?.(selectedModuleId !== 'all' ? selectedModuleId : undefined)}
                >
                  新建
                </Button>
              }
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80} className="flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col m-4 min-h-0 overflow-hidden border-gray-200/80 shadow-sm">
            <CardContent className="flex-1 flex flex-col p-5 min-h-0">
              <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                <Tabs value={showType} onValueChange={(v) => { setShowType(v as ShowType); setCurrentPage(1); }}>
                  <TabsList className="h-9 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <TabsTrigger value="all" className="text-xs px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-[#165DFF] data-[state=active]:shadow-sm border-0">全部</TabsTrigger>
                    <TabsTrigger value="reviewByMe" className="text-xs px-4 rounded-md text-gray-600 data-[state=active]:bg-white data-[state=active]:text-[#165DFF] data-[state=active]:shadow-sm border-0">我评审的</TabsTrigger>
                    <TabsTrigger value="createByMe" className="text-xs px-4 rounded-md text-gray-600 data-[state=active]:bg-white data-[state=active]:text-[#165DFF] data-[state=active]:shadow-sm border-0">我创建的</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedReviewIds.length > 0 && (
                    <>
                      <span className="text-sm text-gray-500">已选 {selectedReviewIds.length} 条</span>
                      <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={openMoveModal}>
                        批量移动
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9" onClick={() => setSelectedReviewIds([])}>取消选择</Button>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="relative w-[240px]">
                      <Input
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setCurrentPage(1)}
                        placeholder="通过ID/名称/标签搜索"
                        className="pr-9 pl-3 h-9 rounded-lg border-gray-200 bg-gray-50/80 text-sm placeholder:text-gray-400"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <Popover open={viewOpen} onOpenChange={setViewOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-9 px-3 rounded-lg border border-gray-200 bg-gray-50/80 text-sm text-gray-700 flex items-center gap-1 min-w-[130px]"
                        >
                          <span className="text-gray-500">视图</span>
                          <span className="flex-1 text-left truncate">{viewLabel}</span>
                          <ChevronUp className={`w-3.5 h-3.5 shrink-0 transition-transform ${viewOpen ? '' : 'rotate-180'}`} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="end">
                        <div className="py-1">
                          <div className="px-3 py-1.5 text-xs text-gray-400">系统视图</div>
                          {[
                            { value: 'all', label: '全部数据' },
                            { value: 'followed', label: '我关注的' },
                            { value: 'createByMe', label: '我创建的' },
                          ].map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              className={`w-full text-left px-3 py-2 text-sm ${viewId === value ? 'bg-blue-50 text-[#165DFF]' : 'text-gray-800 hover:bg-gray-50'}`}
                              onClick={() => { setViewId(value); setViewLabel(label); setViewOpen(false); }}
                            >
                              {label}
                            </button>
                          ))}
                          <div className="px-3 py-1.5 text-xs text-gray-400 mt-1">我的视图</div>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-1"
                            onClick={() => { setViewOpen(false); setFilterViewName('未命名视图'); setFilterOpen(true); }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            新建视图
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="sm" className="h-9 rounded-lg gap-1.5 border-gray-200 bg-gray-50/80 text-gray-700 hover:bg-gray-100" onClick={() => setFilterOpen(true)}>
                      <Filter className="w-3.5 h-3.5" />
                      筛选
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg shrink-0 border-gray-200 bg-gray-50/80 text-gray-700 hover:bg-gray-100" onClick={fetchReviewList} disabled={loading} title="刷新">
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-gray-200 bg-white">
                <Table className="text-sm">
                  <TableHeader className="bg-[#fafafa] sticky top-0 z-10 border-b border-gray-200">
                    <TableRow className="hover:bg-transparent border-none h-11">
                      <TableHead className="w-10 px-3">
                        <Checkbox
                          checked={isAllReviewSelected}
                          onCheckedChange={toggleSelectAllReviews}
                          className="rounded-[2px]"
                          aria-label="全选"
                        />
                      </TableHead>
                      {visibleColumns.num && (
                        <TableHead className="w-[100px] px-4 py-2.5 text-sm font-medium text-gray-600">
                          <button
                            type="button"
                            className="flex items-center gap-1 hover:text-gray-900 font-medium w-full text-left"
                            onClick={() => toggleSort('num')}
                          >
                            ID
                            {tableSort?.field === 'num' && tableSort.order === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#165DFF]" />
                            ) : tableSort?.field === 'num' && tableSort.order === 'desc' ? (
                              <ArrowDown className="w-3.5 h-3.5 text-[#165DFF]" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </TableHead>
                      )}
                      {visibleColumns.name && (
                        <TableHead className="min-w-[200px] px-4 py-2.5 text-sm font-medium text-gray-600">
                          <button
                            type="button"
                            className="flex items-center gap-1 hover:text-gray-900 font-medium w-full text-left"
                            onClick={() => toggleSort('name')}
                          >
                            评审名称
                            {tableSort?.field === 'name' && tableSort.order === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#165DFF]" />
                            ) : tableSort?.field === 'name' && tableSort.order === 'desc' ? (
                              <ArrowDown className="w-3.5 h-3.5 text-[#165DFF]" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </TableHead>
                      )}
                      {visibleColumns.caseCount && <TableHead className="w-[100px] px-4 py-2.5 text-sm font-medium text-gray-600">用例数量</TableHead>}
                      {visibleColumns.status && (
                        <TableHead className="w-[100px] px-4 py-2.5 text-sm font-medium text-gray-600">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="flex items-center gap-1 hover:text-gray-900 font-medium w-full text-left">
                                评审状态
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                {tableFilter.status?.length ? (
                                  <span className="text-[#165DFF] text-[10px]">(已筛{tableFilter.status.length})</span>
                                ) : null}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2 max-h-[280px] overflow-auto" align="start">
                              <div className="px-2 py-1 text-xs text-gray-500 mb-0.5">可多选</div>
                              <button
                                type="button"
                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                                onClick={() => setHeaderFilter('status', [])}
                              >
                                全部
                              </button>
                              {Object.entries(REVIEW_STATUS_LABEL_MAP).map(([value, label]) => {
                                const isSelected = tableFilter.status?.includes(value);
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'text-[#165DFF] font-medium' : ''}`}
                                    onClick={() => {
                                      const next = isSelected
                                        ? (tableFilter.status || []).filter((v) => v !== value)
                                        : [...(tableFilter.status || []), value];
                                      setHeaderFilter('status', next);
                                    }}
                                  >
                                    <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${isSelected ? 'bg-[#165DFF] border-[#165DFF] text-white' : 'border-gray-300'}`}>
                                      {isSelected ? '✓' : ''}
                                    </span>
                                    {label}
                                  </button>
                                );
                              })}
                            </PopoverContent>
                          </Popover>
                        </TableHead>
                      )}
                      {visibleColumns.passRate && (
                        <TableHead className="w-[160px] min-w-[160px] px-4 py-2.5 text-sm font-medium text-gray-600">
                          <div className="flex items-center gap-1">
                            通过率
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-help text-gray-400 hover:text-gray-600">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px]">
                                  <p>已通过用例 / 全部用例 × 100%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.reviewPassRule && (
                        <TableHead className="w-[100px] px-4 py-2.5 text-sm font-medium text-gray-600">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="flex items-center gap-1 hover:text-gray-900 font-medium w-full text-left">
                                评审模式
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                {tableFilter.reviewPassRule?.length ? (
                                  <span className="text-[#165DFF] text-[10px]">(已筛{tableFilter.reviewPassRule.length})</span>
                                ) : null}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-2 max-h-[280px] overflow-auto" align="start">
                              <div className="px-2 py-1 text-xs text-gray-500 mb-0.5">可多选</div>
                              <button
                                type="button"
                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                                onClick={() => setHeaderFilter('reviewPassRule', [])}
                              >
                                全部
                              </button>
                              {Object.entries(REVIEW_PASS_RULE_MAP).map(([value, label]) => {
                                const isSelected = tableFilter.reviewPassRule?.includes(value);
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'text-[#165DFF] font-medium' : ''}`}
                                    onClick={() => {
                                      const next = isSelected
                                        ? (tableFilter.reviewPassRule || []).filter((v) => v !== value)
                                        : [...(tableFilter.reviewPassRule || []), value];
                                      setHeaderFilter('reviewPassRule', next);
                                    }}
                                  >
                                    <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${isSelected ? 'bg-[#165DFF] border-[#165DFF] text-white' : 'border-gray-300'}`}>
                                      {isSelected ? '✓' : ''}
                                    </span>
                                    {label}
                                  </button>
                                );
                              })}
                            </PopoverContent>
                          </Popover>
                        </TableHead>
                      )}
                      {visibleColumns.reviewers && (
                        <TableHead className="w-[150px] px-4 py-2.5 text-sm font-medium text-gray-600">
                          <Popover
                            onOpenChange={(open) => {
                              if (open) {
                                setReviewerFilterKeyword('');
                                fetchReviewerOptions();
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button type="button" className="flex items-center gap-1 hover:text-gray-900 font-medium w-full text-left">
                                评审人
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                {tableFilter.reviewers?.length ? (
                                  <span className="text-[#165DFF] text-[10px]">(已筛{tableFilter.reviewers.length})</span>
                                ) : null}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0 max-h-[320px] overflow-hidden flex flex-col" align="start">
                              <div className="p-2 border-b border-gray-100">
                                <Input
                                  placeholder="输入姓名或邮箱筛选"
                                  value={reviewerFilterKeyword}
                                  onChange={(e) => setReviewerFilterKeyword(e.target.value)}
                                  className="h-8 text-sm border-gray-200"
                                />
                              </div>
                              <div className="p-2 border-b border-gray-50">
                                <span className="text-xs text-gray-500">可多选</span>
                              </div>
                              <div className="max-h-[220px] overflow-auto py-1">
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
                                  onClick={() => setHeaderFilter('reviewers', [])}
                                >
                                  全部
                                </button>
                                {reviewerOptionsLoading ? (
                                  <div className="px-3 py-4 text-sm text-gray-400 text-center">加载中...</div>
                                ) : filteredReviewerOptions.length === 0 ? (
                                  <div className="px-3 py-4 text-sm text-gray-400 text-center">
                                    {reviewerFilterKeyword.trim() ? '无匹配的评审人' : '暂无评审人'}
                                  </div>
                                ) : (
                                  filteredReviewerOptions.map((r) => {
                                    const isSelected = tableFilter.reviewers?.includes(r.id);
                                    return (
                                      <button
                                        key={r.id}
                                        type="button"
                                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 truncate flex items-center gap-2 ${isSelected ? 'text-[#165DFF] font-medium' : ''}`}
                                        title={r.name}
                                        onClick={() => {
                                          const next = isSelected
                                            ? (tableFilter.reviewers || []).filter((v) => v !== r.id)
                                            : [...(tableFilter.reviewers || []), r.id];
                                          setHeaderFilter('reviewers', next);
                                        }}
                                      >
                                        <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${isSelected ? 'bg-[#165DFF] border-[#165DFF] text-white' : 'border-gray-300'}`}>
                                          {isSelected ? '✓' : ''}
                                        </span>
                                        <span className="truncate block">{r.name}</span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableHead>
                      )}
                      {visibleColumns.createUserName && <TableHead className="w-[120px] px-4 py-2.5 text-sm font-medium text-gray-600">创建人</TableHead>}
                      {visibleColumns.moduleName && <TableHead className="w-[120px] px-4 py-2.5 text-sm font-medium text-gray-600">所属模块</TableHead>}
                      {visibleColumns.tags && <TableHead className="w-[170px] px-4 py-2.5 text-sm font-medium text-gray-600">标签</TableHead>}
                      {visibleColumns.description && <TableHead className="w-[150px] px-4 py-2.5 text-sm font-medium text-gray-600">描述</TableHead>}
                      {visibleColumns.cycle && <TableHead className="w-[280px] px-4 py-2.5 text-sm font-medium text-gray-600">评审周期</TableHead>}
                      {visibleColumns.createdAt && (
                        <TableHead className="w-[180px] px-4 py-2.5 text-sm font-medium text-gray-600">
                          <button
                            type="button"
                            className="flex items-center gap-1 hover:text-gray-900 font-medium w-full text-left"
                            onClick={() => toggleSort('createdAt')}
                          >
                            创建时间
                            {tableSort?.field === 'createdAt' && tableSort.order === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#165DFF]" />
                            ) : tableSort?.field === 'createdAt' && tableSort.order === 'desc' ? (
                              <ArrowDown className="w-3.5 h-3.5 text-[#165DFF]" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </TableHead>
                      )}
                      <TableHead className="w-[110px] px-4 py-2.5 text-sm font-medium text-gray-600 text-right pr-4 sticky right-0 bg-[#fafafa] shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] z-10">
                        <div className="flex items-center justify-end gap-1">
                          操作
                          <button type="button" className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600" aria-label="列配置" onClick={() => setTableSettingsOpen(true)}>
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={2 + Object.keys(visibleColumns).filter((k) => visibleColumns[k]).length} className="text-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                        </TableCell>
                      </TableRow>
                    ) : displayedReviewList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2 + Object.keys(visibleColumns).filter((k) => visibleColumns[k]).length} className="text-center py-16">
                          <FileText className="w-14 h-14 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500 text-sm">暂无评审数据</p>
                          <p className="text-gray-400 text-xs mt-1">可点击「创建评审」新建</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedReviewList.map((item) => {
                        const cycleStr = item.startTime && item.endTime
                          ? `${new Date(item.startTime as string | number).toLocaleString('zh-CN')} - ${new Date(item.endTime as string | number).toLocaleString('zh-CN')}`
                          : '-';
                        const tagsDisplay = Array.isArray(item.tags) ? item.tags.join('、') : (item.tags ?? '-');
                        return (
                        <TableRow key={item.id} className="hover:bg-gray-50/80 border-b border-gray-100 transition-colors">
                          <TableCell className="px-3 py-2.5">
                            <Checkbox
                              checked={selectedReviewIds.includes(item.id)}
                              onCheckedChange={() => toggleReviewSelect(item.id)}
                              className="rounded-[2px]"
                              aria-label={`选择 ${item.name}`}
                            />
                          </TableCell>
                          {visibleColumns.num && (
                            <TableCell className="px-4 py-2.5">
                              <button
                                type="button"
                                className="text-[#165DFF] font-medium cursor-pointer hover:underline text-left font-mono text-sm leading-[22px]"
                                onClick={() => onViewReview?.(item.id)}
                              >
                                {item.num ?? '-'}
                              </button>
                            </TableCell>
                          )}
                          {visibleColumns.name && (
                            <TableCell className="px-4 py-2.5 max-w-[200px]" title={item.name}>
                              <span className="text-sm text-gray-800 truncate block leading-[22px]">{item.name || '-'}</span>
                            </TableCell>
                          )}
                          {visibleColumns.caseCount && <TableCell className="px-4 py-2.5 text-sm text-gray-600 tabular-nums">{item.caseCount ?? '-'}</TableCell>}
                          {visibleColumns.status && (
                            <TableCell className="px-4 py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                {REVIEW_STATUS_LABEL_MAP[item.status || ''] ?? item.status ?? '-'}
                              </span>
                            </TableCell>
                          )}
                          {visibleColumns.passRate && (
                            <TableCell className="px-4 py-2.5">
                              <ReviewPassRateDisplay
                                compact
                                passRate={item.passRate}
                                caseCount={item.caseCount}
                                reviewedCount={item.reviewedCount}
                                passCount={item.passCount}
                                unPassCount={item.unPassCount}
                                reReviewCount={item.reReviewCount}
                                underReviewCount={item.underReviewCount}
                                unReviewCount={item.unReviewCount}
                              />
                            </TableCell>
                          )}
                          {visibleColumns.reviewPassRule && (
                            <TableCell className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.reviewPassRule === 'SINGLE' ? 'bg-green-100 text-green-700' : 'bg-[#165DFF]/10 text-[#165DFF]'}`}>
                                {REVIEW_PASS_RULE_MAP[item.reviewPassRule || ''] ?? item.reviewPassRule ?? '-'}
                              </span>
                            </TableCell>
                          )}
                          {visibleColumns.reviewers && (
                            <TableCell className="px-4 py-2.5 max-w-[150px] truncate text-sm text-gray-600" title={getReviewersDisplay(item.reviewers)}>
                              {getReviewersDisplay(item.reviewers)}
                            </TableCell>
                          )}
                          {visibleColumns.createUserName && <TableCell className="px-4 py-2.5 text-sm text-gray-600">{item.createUserName || item.createUser || '-'}</TableCell>}
                          {visibleColumns.moduleName && (
                            <TableCell className="px-4 py-2.5 max-w-[120px] truncate text-sm text-gray-600" title={item.moduleName}>
                              {item.moduleName || '-'}
                            </TableCell>
                          )}
                          {visibleColumns.tags && (
                            <TableCell className="px-4 py-2.5 max-w-[170px] truncate text-sm text-gray-600" title={tagsDisplay}>
                              {tagsDisplay}
                            </TableCell>
                          )}
                          {visibleColumns.description && (
                            <TableCell className="px-4 py-2.5 max-w-[150px] truncate text-sm text-gray-600" title={stripHtmlTags(item.description) || undefined}>
                              {stripHtmlTags(item.description) || '-'}
                            </TableCell>
                          )}
                          {visibleColumns.cycle && (
                            <TableCell className="px-4 py-2.5 max-w-[280px] truncate text-sm text-gray-600" title={cycleStr}>
                              {cycleStr}
                            </TableCell>
                          )}
                          {visibleColumns.createdAt && (
                            <TableCell className="px-4 py-2.5 text-sm text-gray-500 tabular-nums">
                              {item.createdAt ? new Date(item.createdAt as string | number).toLocaleString('zh-CN') : '-'}
                            </TableCell>
                          )}
                          <TableCell className="px-4 py-2.5 text-right pr-4 sticky right-0 bg-white shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] z-10">
                            <div className="flex items-center justify-end gap-0">
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-[#165DFF] hover:bg-transparent hover:text-[#165DFF] font-normal" onClick={() => onEditReview?.(item.id)}>
                                编辑
                              </Button>
                              <span className="h-4 w-px bg-gray-200 mx-2 shrink-0" aria-hidden />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#165DFF]">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleCopy(item)}>
                                    <Copy className="w-3.5 h-3.5 mr-2" /> 复制
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-600">
                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* 分页 - 与报告中心自动化测试报告一致 */}
              {(appliedFilterConditions.length > 0 ? displayedReviewList.length : total) > 0 && (
                <div className="flex items-center justify-between pt-6 border-t border-gray-100 px-4 py-3 flex-shrink-0 bg-white rounded-b-lg">
                  <div className="text-sm text-gray-500">
                    共 <span className="font-medium text-gray-900">{appliedFilterConditions.length > 0 ? displayedReviewList.length : total}</span> 条
                    {appliedFilterConditions.length > 0 && <span className="text-gray-400 ml-1">（已筛选）</span>}
                    <span className="mx-2">|</span>
                    每页显示
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => handlePageSizeChange(Number(v))}
                    >
                      <SelectTrigger className="inline-flex h-8 w-20 mx-2 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 30, 40, 50].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    条
                  </div>
                  <div className="flex items-center gap-6">
                    <Pagination className="w-auto m-0">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={cn('cursor-pointer', !canGoToPrev && 'pointer-events-none opacity-50')}
                          />
                        </PaginationItem>
                        {(() => {
                          const items: React.ReactNode[] = [];
                          const maxVisiblePages = 5;
                          let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          if (startPage > 1) {
                            items.push(
                              <PaginationItem key={1}>
                                <PaginationLink
                                  onClick={() => handlePageChange(1)}
                                  isActive={currentPage === 1}
                                  className={cn(
                                    'h-9 w-9 cursor-pointer transition-all',
                                    currentPage === 1
                                      ? 'bg-[#165DFF] text-white hover:bg-[#165DFF]/90 border-[#165DFF]'
                                      : 'hover:bg-white border-gray-200'
                                  )}
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                            );
                            if (startPage > 2) items.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis key="ellipsis-start-icon" /></PaginationItem>);
                          }
                          for (let i = startPage; i <= endPage; i++) {
                            items.push(
                              <PaginationItem key={i}>
                                <PaginationLink
                                  onClick={() => handlePageChange(i)}
                                  isActive={currentPage === i}
                                  className={cn(
                                    'h-9 w-9 cursor-pointer transition-all',
                                    currentPage === i
                                      ? 'bg-[#165DFF] text-white hover:bg-[#165DFF]/90 border-[#165DFF]'
                                      : 'hover:bg-white border-gray-200'
                                  )}
                                >
                                  {i}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) items.push(<PaginationItem key="ellipsis-end"><PaginationEllipsis key="ellipsis-end-icon" /></PaginationItem>);
                            items.push(
                              <PaginationItem key={totalPages}>
                                <PaginationLink
                                  onClick={() => handlePageChange(totalPages)}
                                  isActive={currentPage === totalPages}
                                  className={cn(
                                    'h-9 w-9 cursor-pointer transition-all',
                                    currentPage === totalPages
                                      ? 'bg-[#165DFF] text-white hover:bg-[#165DFF]/90 border-[#165DFF]'
                                      : 'hover:bg-white border-gray-200'
                                  )}
                                >
                                  {totalPages}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          return items;
                        })()}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(currentPage + 1)}
                            className={cn('cursor-pointer', !canGoToNext && 'pointer-events-none opacity-50')}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    <div className="flex items-center gap-2 pl-6 border-l border-gray-100">
                      <span className="text-sm text-gray-500 whitespace-nowrap">跳至</span>
                      <Input
                        className="w-14 h-8 px-1 text-center border-gray-200"
                        value={jumpToPage}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') setJumpToPage('');
                          else {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) setJumpToPage(num);
                          }
                        }}
                        onKeyDown={handleJumpToPageKeyDown}
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">页</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* 筛选抽屉：与参考图一致，含可编辑标题、可关闭提示条、左侧列配置、保存并筛选/重置 */}
      <Sheet open={filterOpen} onOpenChange={(open) => { setFilterOpen(open); if (!open) setFilterBannerDismissed(false); }}>
        <SheetContent className="w-[560px] sm:max-w-[560px] flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-2">
            <div className="flex items-center gap-2">
              <SheetTitle className="flex items-center gap-2">
                <input
                  type="text"
                  value={filterViewName}
                  onChange={(e) => setFilterViewName(e.target.value)}
                  className="bg-transparent border-0 outline-none text-lg font-semibold flex-1 min-w-0"
                />
                <button type="button" className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="编辑视图名称">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </SheetTitle>
            </div>
          </SheetHeader>
          {!filterBannerDismissed && (
            <div className="mx-5 flex items-start gap-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-100 text-sm text-blue-800">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">筛选模式, 模块过滤仅可在当前过滤器中操作</span>
              <button type="button" className="p-0.5 rounded hover:bg-blue-100" onClick={() => setFilterBannerDismissed(true)} aria-label="关闭提示">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-hidden flex min-h-0 px-5 pt-4">
            <div className="w-[140px] shrink-0 pr-3 border-r border-gray-100 flex flex-col min-h-0">
              <div className="text-xs text-gray-400 mb-2">可选筛选项</div>
              <Input
                placeholder="搜索"
                value={filterOptionSearch}
                onChange={(e) => setFilterOptionSearch(e.target.value)}
                className="h-8 text-sm mb-2"
              />
              <div className="space-y-0.5 overflow-y-auto flex-1 min-h-0">
                {FILTER_FIELD_OPTIONS.filter((o) => !filterOptionSearch.trim() || o.label.includes(filterOptionSearch.trim())).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="w-full flex items-center gap-1.5 py-1.5 text-sm text-gray-800 hover:bg-gray-100 rounded text-left"
                    onClick={() => addConditionWithField(opt.value)}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
                    {opt.label}
                  </button>
                ))}
              </div>
              {savedFilterViews.length > 0 && (
                <>
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <div className="text-xs text-gray-400 mb-1">我的视图</div>
                    <div className="space-y-0.5">
                      {savedFilterViews.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className="w-full text-left py-1.5 px-2 text-sm text-[#165DFF] hover:bg-blue-50 rounded truncate"
                          onClick={() => loadSavedView(v)}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 min-w-0 pl-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <Label className="text-sm text-gray-700 shrink-0">符合以下条件</Label>
                <Select value={filterLogic} onValueChange={(v: 'and' | 'or') => setFilterLogic(v)}>
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">所有</SelectItem>
                    <SelectItem value="or">任意</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {filterConditions.map((row, idx) => {
                  const opOptions: Array<{ value: string; label: string }> = row.field === 'moduleId' ? [{ value: 'in', label: '属于' }] : ['caseCount', 'passRate'].includes(row.field) ? [{ value: 'equals', label: '等于' }, { value: 'gt', label: '大于' }, { value: 'gte', label: '大于等于' }, { value: 'lt', label: '小于' }, { value: 'lte', label: '小于等于' }] : [{ value: 'contains', label: '包含' }, { value: 'equals', label: '等于' }];
                  return (
                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={row.field}
                        onValueChange={(v) => setFilterConditions((prev) => {
                          const next = [...prev];
                          const defaultOp = v === 'moduleId' ? 'in' : ['status', 'reviewPassRule', 'caseCount', 'passRate'].includes(v) ? 'equals' : 'contains';
                          next[idx] = { field: v, op: defaultOp, value: '' };
                          return next;
                        })}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FILTER_FIELD_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={row.op}
                        onValueChange={(v) => setFilterConditions((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], op: v };
                          return next;
                        })}
                      >
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {opOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {row.field === 'moduleId' ? (
                        <Select
                          value={row.value}
                          onValueChange={(v) => setFilterConditions((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], value: v };
                            return next;
                          })}
                        >
                          <SelectTrigger className="flex-1 min-w-[140px] h-8">
                            <SelectValue placeholder="请选择" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="root">根模块</SelectItem>
                            {flattenedModules.map((n) => (
                              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : row.field === 'status' ? (
                        <Select
                          value={row.value}
                          onValueChange={(v) => setFilterConditions((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], value: v };
                            return next;
                          })}
                        >
                          <SelectTrigger className="flex-1 min-w-[120px] h-8">
                            <SelectValue placeholder="请选择" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(REVIEW_STATUS_LABEL_MAP).map(([k, label]) => (
                              <SelectItem key={k} value={k}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : row.field === 'reviewPassRule' ? (
                        <Select
                          value={row.value}
                          onValueChange={(v) => setFilterConditions((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], value: v };
                            return next;
                          })}
                        >
                          <SelectTrigger className="flex-1 min-w-[120px] h-8">
                            <SelectValue placeholder="请选择" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SINGLE">单人评审</SelectItem>
                            <SelectItem value="MULTIPLE">多人评审</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={row.value}
                          onChange={(e) => setFilterConditions((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], value: e.target.value };
                            return next;
                          })}
                          placeholder="关键字之间以空格进行分隔"
                          className="flex-1 min-w-[120px] h-8"
                        />
                      )}
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 shrink-0"
                        onClick={() => setFilterConditions((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label="删除条件"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="text-sm text-[#165DFF] hover:underline flex items-center gap-1"
                  onClick={() => addConditionWithField('num')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加条件
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-200">
            <Button className="bg-[#165DFF] hover:bg-[#165DFF]/90" onClick={() => { setAppliedFilterLogic(filterLogic); setAppliedFilterConditions(filterConditions); setCurrentPage(1); setFilterOpen(false); }}>
              筛选
            </Button>
            <Button variant="outline" onClick={() => { setFilterConditions([]); setAppliedFilterConditions([]); setAppliedFilterLogic('and'); setFilterViewName('全部数据'); }}>
              重置
            </Button>
            <Button variant="ghost" className="text-[#165DFF]" onClick={saveAsView}>
              另存为视图
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>批量移动</DialogTitle>
            <p className="text-sm text-gray-500">将所选 {selectedReviewIds.length} 条评审移动到目标模块</p>
          </DialogHeader>
          <Label className="text-sm font-medium">选择目标模块</Label>
          <ScrollArea className="h-[240px] rounded-md border border-gray-200 mt-2">
            <div className="p-2 space-y-0.5">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${moveTargetModuleId === 'root' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                onClick={() => setMoveTargetModuleId('root')}
              >
                根模块
              </button>
              {moduleTree.map((node) => renderTreeNodeForMove(node))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveModalOpen(false)}>取消</Button>
            <Button onClick={confirmMove} disabled={!moveTargetModuleId || moveLoading}>
              {moveLoading ? '移动中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{moduleDialogMode === 'add' ? '新建模块' : '重命名模块'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>模块名称</Label>
            <Input
              value={moduleDialogName}
              onChange={(e) => setModuleDialogName(e.target.value)}
              placeholder="请输入模块名称"
              className="mt-2"
              onKeyDown={(e) => e.key === 'Enter' && handleModuleDialogSubmit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>取消</Button>
            <Button onClick={handleModuleDialogSubmit} disabled={moduleDialogLoading}>
              {moduleDialogLoading ? '提交中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!moduleToDelete} onOpenChange={(open) => !open && setModuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除模块 &quot;{moduleToDelete?.name}&quot; 吗？其下的评审将移至根目录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteModule} disabled={moduleDeleteLoading} className="bg-red-600 hover:bg-red-700">
              {moduleDeleteLoading ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除评审 &quot;{reviewToDelete?.name}&quot; 吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={tableSettingsOpen} onOpenChange={setTableSettingsOpen}>
        <SheetContent className="w-[320px] sm:max-w-[320px]">
          <SheetHeader>
            <SheetTitle>表格设置</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-6">
            <div>
              <Label className="text-sm font-medium text-gray-700">每页显示数量</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[10, 20, 30, 40, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handlePageSizeChange(n)}
                    className={`h-8 min-w-[40px] px-3 rounded-md text-sm font-medium transition-colors ${pageSize === n ? 'bg-[#165DFF] text-white hover:bg-[#165DFF]/90' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">表头设置</Label>
                <button
                  type="button"
                  onClick={undoColumnSettings}
                  className="text-sm text-[#165DFF] hover:underline"
                >
                  撤销修改
                </button>
              </div>
              <div className="space-y-0.5">
                {[
                  { key: 'num', label: 'ID' },
                  { key: 'name', label: '评审名称' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">{label}</span>
                    <Switch
                      checked={!!visibleColumns[key]}
                      onCheckedChange={() => toggleColumnVisible(key)}
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-400 py-1.5 border-b border-gray-100">以上属性不可排序</p>
                {[
                  { key: 'caseCount', label: '用例数量' },
                  { key: 'status', label: '评审状态' },
                  { key: 'passRate', label: '通过率' },
                  { key: 'reviewPassRule', label: '评审模式' },
                  { key: 'reviewers', label: '评审人' },
                  { key: 'createUserName', label: '创建人' },
                  { key: 'moduleName', label: '所属模块' },
                  { key: 'tags', label: '标签' },
                  { key: 'description', label: '描述' },
                  { key: 'cycle', label: '评审周期' },
                  { key: 'createdAt', label: '创建时间' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
                      <span className="text-sm text-gray-700">{label}</span>
                    </div>
                    <Switch
                      checked={!!visibleColumns[key]}
                      onCheckedChange={() => toggleColumnVisible(key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
