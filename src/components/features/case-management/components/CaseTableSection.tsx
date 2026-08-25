/**
 * 用例列表表格区域
 * 支持：列排序、列筛选、名称内联编辑、行拖拽排序、列宽拖动
 */

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { FileText, RefreshCw, Trash2, Download, Pencil, FolderInput, Copy, ArrowUpDown, ArrowUp, ArrowDown, Filter, GripVertical, MoreHorizontal, Link2, Plus, Sparkles, Settings, Play, Loader2 } from 'lucide-react';
import { caseManagementService } from '@/services';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { cn } from '@/utils/cn';
import { REVIEW_STATUS_MAP, EXECUTE_RESULT_MAP, CASE_LEVEL_MAP } from '../constants';
import { getModulePath, getTagsArray } from '../utils';
import { CaseLevelBadge, CaseLevelOption } from './CaseLevelBadge';
import { CaseModuleSelect } from './CaseModuleSelect';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CaseItem, ModuleTreeNode } from '../types';
import type { SortOption } from '../hooks/useCaseList';
import { DEFAULT_COLUMN_WIDTHS } from './ColumnSettingsSheet';

interface CaseTableSectionProps {
  loading: boolean;
  caseList: CaseItem[];
  moduleTree: ModuleTreeNode[];
  selectedCases: string[];
  currentPage: number;
  total: number;
  totalPages: number;
  /** 每页条数，与 onPageSizeChange 一起传入时显示「每页显示」选择器 */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  isAllSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectCase: (caseId: string, checked: boolean) => void;
  onPageChange: (page: number) => void;
  onViewCase?: (item: CaseItem, selectedModuleId?: string) => void;
  onViewRealizationCase?: (item: CaseItem, selectedModuleId?: string) => void;
  onEditCase?: (item: CaseItem) => void;
  onCopyCase?: (item: CaseItem, selectedModuleId?: string) => void;
  onDeleteCase?: (item: CaseItem) => void;
  onBatchDelete?: () => void;
  onBatchExport?: (type: 'exportExcel' | 'exportXMind') => void;
  onBatchEdit?: () => void;
  onBatchMove?: () => void;
  onBatchCopy?: () => void;
  onClearSelection?: () => void;
  onCaseLevelChange?: (item: CaseItem, level: string) => void | Promise<void>;
  onModuleChange?: (item: CaseItem, moduleId: string) => void | Promise<void>;
  onNameChange?: (item: CaseItem, name: string) => void | Promise<void>;
  onSortChange?: (field: string, order: 'asc' | 'desc' | null) => void;
  onDragSort?: (moveId: string, targetId: string, moveMode: 'BEFORE' | 'AFTER') => void;
  onColumnFilterChange?: (dataIndex: string, value: string[] | null) => void;
  onBatchAddDemand?: () => void;
  onBatchLinkDemand?: () => void;
  /** 打开列配置（表头齿轮） */
  onColumnSettingsClick?: () => void;
  sort?: SortOption | null;
  /** 表头筛选：多选，key 对应字段，value 为选中的值数组 */
  columnFilter?: Record<string, string[]>;
  /** 更新人筛选项（传入后「更新人」列显示筛选图标并支持多选） */
  updateUserFilterOptions?: { value: string; label: string }[];
  visibleColumns?: Record<string, boolean>;
  columnOrder?: string[];
  /** 列宽（可拖拽表头后持久化），key 为 num/name/caseLevel/reviewStatus 等 */
  columnWidths?: Record<string, number>;
  onColumnWidthChange?: (key: string, width: number) => void;
  /** 权限控制：不传或 true 时显示对应操作 */
  canEdit?: boolean;
  canCopy?: boolean;
  canDelete?: boolean;
}

function getReviewStatusLabel(status?: string) {
  return REVIEW_STATUS_MAP[status || '']?.label || status || '-';
}
function getReviewStatusColor(status?: string) {
  return REVIEW_STATUS_MAP[status || '']?.color || 'bg-gray-100 text-gray-800';
}
function getExecuteResultLabel(result?: string) {
  return EXECUTE_RESULT_MAP[result || '']?.label || result || '-';
}
function getExecuteResultColor(result?: string) {
  return EXECUTE_RESULT_MAP[result || '']?.color || 'bg-gray-100 text-gray-800';
}
function getCoverageBadgeClass(status?: string) {
  switch (status) {
    case 'AUTOMATED_ONLY':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold';
    case 'PARTIAL':
      return 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-200/60 font-medium';
  }
}
function getCoverageLabel(status?: string) {
  switch (status) {
    case 'AUTOMATED_ONLY':
      return '全自动化';
    case 'PARTIAL':
      return '部分自动化';
    default:
      return '';
  }
}

function getCaseTypeBadge(item?: any) {
  const rawType = String(item?.type || item?.caseType || '').toUpperCase();
  const covered = Array.isArray(item?.realizationSummary?.coveredTypes) ? item.realizationSummary.coveredTypes : [];
  
  if (rawType === 'API' || covered.includes('API')) {
    return { label: 'API 接口', color: 'bg-purple-50 text-purple-700 border-purple-200/80 font-bold' };
  }
  if (rawType === 'UI_AUTOMATION' || rawType === 'UI' || covered.includes('UI_AUTOMATION')) {
    return { label: 'UI 自动化', color: 'bg-sky-50 text-sky-700 border-sky-200/80 font-bold' };
  }
  if (rawType === 'PERF' || rawType === 'PERFORMANCE' || covered.includes('PERF')) {
    return { label: '性能用例', color: 'bg-amber-50 text-amber-700 border-amber-200/80 font-bold' };
  }
  return { label: '功能用例', color: 'bg-slate-100 text-slate-700 border-slate-200/80 font-medium' };
}

/** 可排序列头（筛选支持多选：filterValue 为数组，点击选项为切换选中） */
function SortableHeader({
  label,
  field,
  sort,
  onSortChange,
  filter,
  filterOptions,
  filterValue,
  onFilterChange,
  className,
}: {
  label: string;
  field: string;
  sort?: SortOption | null;
  onSortChange?: (field: string, order: 'asc' | 'desc' | null) => void;
  filter?: boolean;
  filterOptions?: { value: string; label: string }[];
  /** 多选筛选时的选中值数组 */
  filterValue?: string[];
  onFilterChange?: (value: string[] | null) => void;
  className?: string;
}) {
  const isActive = sort?.field === field;
  const selectedSet = new Set(filterValue ?? []);
  const hasFilter = Array.isArray(filterValue) && filterValue.length > 0;
  const cycleSort = () => {
    if (!onSortChange) return;
    if (!isActive) onSortChange(field, 'desc');
    else if (sort?.order === 'desc') onSortChange(field, 'asc');
    else onSortChange(field, null);
  };
  const toggleOption = (value: string) => {
    if (!onFilterChange) return;
    const next = selectedSet.has(value)
      ? (filterValue ?? []).filter((v) => v !== value)
      : [...(filterValue ?? []), value];
    onFilterChange(next.length > 0 ? next : null);
  };
  return (
    <div className={cn('flex items-center gap-1 min-w-0', className)}>
      {onSortChange ? (
        <button type="button" className="flex items-center gap-0.5 hover:text-gray-900 min-w-0" onClick={cycleSort}>
          <span className="min-w-0 truncate">{label}</span>
          <span className="text-gray-400 shrink-0">
            {!isActive && <ArrowUpDown className="w-3 h-3" />}
            {isActive && sort?.order === 'asc' && <ArrowUp className="w-3 h-3 text-blue-600" />}
            {isActive && sort?.order === 'desc' && <ArrowDown className="w-3 h-3 text-blue-600" />}
          </span>
        </button>
      ) : (
        <span className="min-w-0 truncate">{label}</span>
      )}
      {filter && filterOptions && onFilterChange && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`p-0.5 rounded hover:bg-gray-100 shrink-0 ${hasFilter ? 'text-blue-600' : 'text-gray-400'}`}
              title="筛选（可多选）"
            >
              <Filter className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 max-h-[280px] overflow-hidden flex flex-col p-2" align="start">
            <button
              type="button"
              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100"
              onClick={() => onFilterChange(null)}
            >
              全部
            </button>
            <div className="overflow-auto max-h-[240px] -mx-0.5 px-0.5">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 flex items-center gap-2 ${selectedSet.has(opt.value) ? 'text-blue-600 font-medium' : ''}`}
                  onClick={() => toggleOption(opt.value)}
                >
                  <span className={cn('w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center', selectedSet.has(opt.value) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300')}>
                    {selectedSet.has(opt.value) ? '✓' : ''}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

const MIN_COLUMN_WIDTH = 60;
const MAX_COLUMN_WIDTH = 800;

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
        let w = startW.current + delta;
        w = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, w));
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
      className={`relative group !px-2 overflow-hidden ${className ?? ''}`}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className="w-full flex items-center pr-2 min-w-0">
        <div className="w-full min-w-0 text-left overflow-hidden">{children}</div>
      </div>
      {/* 拖拽把手：靠右绝对定位，不占用文本流，设计为居中小药丸，防止重合并优化美观 */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调整列宽"
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-[8px] cursor-col-resize z-10 flex items-center justify-center group/resizer"
        style={{ touchAction: 'none' }}
      >
        <div className="w-[3px] h-4 bg-gray-300/80 rounded-full opacity-0 group-hover:opacity-100 group-hover/resizer:bg-[#165DFF] group-hover/resizer:scale-y-125 transition-all duration-200" />
      </div>
    </TableHead>
  );
}

/** 可拖拽表格行（使用原生 tr + ref 避免 forwardRef 兼容问题） */
function SortableTableRow({
  id,
  children,
  hasDrag,
}: {
  id: string;
  children: React.ReactNode;
  hasDrag?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !hasDrag,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-gray-200 h-10 ${isDragging ? 'opacity-50 bg-gray-50' : ''}`}
    >
      {hasDrag && (
        <TableCell className="w-8 px-1 cursor-grab active:cursor-grabbing border-r-0" {...attributes} {...listeners}>
          <GripVertical className="w-3.5 h-3.5 text-gray-400" />
        </TableCell>
      )}
      {children}
    </tr>
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function CaseTableSection({
  loading,
  caseList,
  moduleTree,
  selectedCases,
  currentPage,
  total,
  totalPages,
  pageSize,
  onPageSizeChange,
  isAllSelected,
  onSelectAll,
  onSelectCase,
  onPageChange,
  onViewCase,
  onViewRealizationCase,
  onEditCase,
  onCopyCase,
  onDeleteCase,
  onBatchDelete,
  onBatchExport,
  onBatchEdit,
  onBatchMove,
  onBatchCopy,
  onClearSelection,
  onCaseLevelChange,
  onModuleChange,
  onNameChange,
  onSortChange,
  onDragSort,
  onColumnFilterChange,
  onBatchAddDemand,
  onBatchLinkDemand,
  onColumnSettingsClick,
  sort,
  columnFilter = {},
  updateUserFilterOptions,
  visibleColumns: visibleCols = {},
  columnOrder: colOrder = ['reviewStatus', 'lastExecuteResult', 'moduleId', 'tags', 'updateUserName', 'updateTime', 'createUserName', 'createTime'],
  columnWidths,
  onColumnWidthChange,
  canEdit = true,
  canCopy = true,
  canDelete = true,
}: CaseTableSectionProps) {
  const [jumpToPage, setJumpToPage] = useState<string | number>('');
  const canGoToPrev = currentPage > 1;
  const canGoToNext = currentPage < totalPages;
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) onPageChange(page);
  };
  const handleJumpToPage = () => {
    if (jumpToPage === '' || jumpToPage === 0) return;
    const pageNum = typeof jumpToPage === 'string' ? parseInt(jumpToPage, 10) : jumpToPage;
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
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
  const getWidth = useCallback(
    (key: string) => columnWidths?.[key] ?? DEFAULT_COLUMN_WIDTHS[key] ?? 100,
    [columnWidths]
  );
  const safeCaseList = Array.isArray(caseList) ? caseList : [];
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());

  const handleExecute = async (item: CaseItem) => {
    if (!item.id || !item.workflowId) {
      toast.error('该用例未绑定自动化');
      return;
    }
    
    setExecutingIds(prev => new Set(prev).add(item.id));
    const toastId = toast.loading(`正在触发用例 [${item.name}] 的自动化执行...`);
    try {
      const res: any = await caseManagementService.executeCaseWorkflow(item.id);
      toast.success(`触发成功！`, {
        id: toastId,
        description: `运行ID: ${res?.runId || 'N/A'}`,
        action: res?.runId ? {
          label: '查看任务',
          onClick: () => window.open(`/workflow/run/${res.runId}`, '_blank')
        } : undefined
      });
    } catch (error: any) {
      console.error('Execute failed', error);
      toast.error(error.response?.data?.message || error.message || '触发执行失败', { id: toastId });
    } finally {
      setExecutingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleView = (item: CaseItem) => {
    if (!item?.id) return;
    onViewCase?.(item);
  };
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CaseItem | null>(null);

  const handleEdit = (item: CaseItem) => {
    if (!item?.id) return;
    onEditCase?.(item);
  };
  const handleCopy = (item: CaseItem) => {
    if (!item?.id) return;
    onCopyCase?.(item);
  };
  const handleDelete = (item: CaseItem) => {
    if (!item?.id) return;
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget && deleteTarget.id) {
      onDeleteCase?.(deleteTarget);
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleNameSave = (item: CaseItem) => {
    const val = editingNameValue.trim();
    if (val && val !== item.name && onNameChange) {
      onNameChange(item, val);
    }
    setEditingNameId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onDragSort) return;
    const moveId = String(active.id);
    const targetId = String(over.id);
    // 优先按落点（目标行上/下半区）判断前后，避免“放到后面”不准确
    const activeRect = active.rect.current.translated ?? active.rect.current.initial;
    const overMiddleY = over.rect.top + over.rect.height / 2;
    const activeCenterY = activeRect ? activeRect.top + activeRect.height / 2 : undefined;
    let moveMode: 'BEFORE' | 'AFTER';
    if (typeof activeCenterY === 'number') {
      moveMode = activeCenterY > overMiddleY ? 'AFTER' : 'BEFORE';
    } else {
      // 兜底：按当前列表索引方向判断
      const activeIndex = safeCaseList.findIndex((item) => item.id === moveId);
      const overIndex = safeCaseList.findIndex((item) => item.id === targetId);
      moveMode = overIndex > activeIndex ? 'AFTER' : 'BEFORE';
    }
    onDragSort(moveId, targetId, moveMode);
  };

  const colVisible = (key: string) => visibleCols[key] !== false;
  const orderedOptionalCols = colOrder.filter((k) => colVisible(k));
  const optionalColCount = orderedOptionalCols.length;
  const colSpan = 5 + optionalColCount + (onDragSort ? 1 : 0);

  return (
    <>
      {selectedCases.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4">
          <span className="text-sm text-blue-800">
            已选择 <strong>{selectedCases.length}</strong> 项
          </span>
          <div className="flex gap-2">
            {onBatchExport && (
              <>
                <Button variant="outline" size="sm" onClick={() => onBatchExport('exportExcel')}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />导出 Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => onBatchExport('exportXMind')}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />导出 XMind
                </Button>
              </>
            )}
            {onBatchEdit && (
              <Button variant="outline" size="sm" onClick={onBatchEdit}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />批量编辑
              </Button>
            )}
            {onBatchMove && (
              <Button variant="outline" size="sm" onClick={onBatchMove}>
                <FolderInput className="w-3.5 h-3.5 mr-1.5" />移动到
              </Button>
            )}
            {onBatchCopy && (
              <Button variant="outline" size="sm" onClick={onBatchCopy}>
                <Copy className="w-3.5 h-3.5 mr-1.5" />复制到
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" size="sm" onClick={onBatchDelete} className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />批量删除
              </Button>
            )}
            {(onBatchAddDemand || onBatchLinkDemand) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-3.5 h-3.5 mr-1.5" />更多
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onBatchAddDemand && (
                    <DropdownMenuItem onClick={onBatchAddDemand}>
                      <Plus className="w-3.5 h-3.5 mr-2" />添加需求
                    </DropdownMenuItem>
                  )}
                  {onBatchLinkDemand && (
                    <DropdownMenuItem onClick={onBatchLinkDemand}>
                      <Link2 className="w-3.5 h-3.5 mr-2" />关联需求
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              取消选择
            </Button>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 与测试计划列表一致，不额外增加右侧 padding，避免视觉上的大空白；操作列依靠 sticky right-0 固定 */}
        <div className="flex-1 min-h-0 overflow-auto border border-gray-200 rounded-lg bg-white">
          {onDragSort ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              accessibility={{ container: typeof document !== 'undefined' ? document.body : undefined }}
            >
              <Table className="[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3 [&_th]:text-[13px] [&_th]:font-semibold [&_th]:text-gray-600 [&_td]:text-[13px] [&_td]:text-gray-900" style={{ tableLayout: 'fixed' }}>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10 border-b border-slate-200">
                  <TableRow className="hover:bg-transparent border-none h-9">
                    {!!onDragSort && <TableHead className="w-8 !px-2" />}
                    <TableHead className="w-12 !px-2">
                      <Checkbox checked={isAllSelected} onCheckedChange={onSelectAll} className="rounded-[2px] opacity-60" />
                    </TableHead>
                    {onColumnWidthChange ? (
                      <>
                        <ResizableTh columnKey="num" width={getWidth('num')} onResize={onColumnWidthChange} className="font-medium text-gray-500">
                          <SortableHeader label="编号" field="num" sort={sort} onSortChange={onSortChange} />
                        </ResizableTh>
                        <ResizableTh columnKey="name" width={getWidth('name')} onResize={onColumnWidthChange} className="font-medium text-gray-500">
                          <SortableHeader label="用例名称" field="name" sort={sort} onSortChange={onSortChange} />
                        </ResizableTh>
                        <ResizableTh columnKey="caseLevel" width={getWidth('caseLevel')} onResize={onColumnWidthChange} className="font-medium text-gray-500">
                          <SortableHeader label="用例等级" field="caseLevel" filter filterOptions={Object.entries(CASE_LEVEL_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.caseLevel} onFilterChange={(v) => onColumnFilterChange?.('caseLevel', v ?? null)} />
                        </ResizableTh>
                      </>
                    ) : (
                      <>
                        <TableHead className="w-24 font-medium text-gray-500">
                          <SortableHeader label="编号" field="num" sort={sort} onSortChange={onSortChange} />
                        </TableHead>
                        <TableHead className="min-w-[180px] font-medium text-gray-500">
                          <SortableHeader label="用例名称" field="name" sort={sort} onSortChange={onSortChange} />
                        </TableHead>
                        <TableHead className="w-20 font-medium text-gray-500">
                          <SortableHeader label="用例等级" field="caseLevel" filter filterOptions={Object.entries(CASE_LEVEL_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.caseLevel} onFilterChange={(v) => onColumnFilterChange?.('caseLevel', v ?? null)} />
                        </TableHead>
                      </>
                    )}
                    {orderedOptionalCols.map((key) => {
                      const w = getWidth(key);
                      const resizeTh = onColumnWidthChange ? (
                        <ResizableTh key={key} columnKey={key} width={w} onResize={onColumnWidthChange} className="font-medium text-gray-500">
                          {key === 'reviewStatus' && <SortableHeader label="评审结果" field="reviewStatus" sort={sort} onSortChange={onSortChange} filter filterOptions={Object.entries(REVIEW_STATUS_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.reviewStatus} onFilterChange={(v) => onColumnFilterChange?.('reviewStatus', v ?? null)} />}
                          {key === 'lastExecuteResult' && <SortableHeader label="执行结果" field="lastExecuteResult" sort={sort} onSortChange={onSortChange} filter filterOptions={Object.entries(EXECUTE_RESULT_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.lastExecuteResult} onFilterChange={(v) => onColumnFilterChange?.('lastExecuteResult', v ?? null)} />}
                          {key === 'moduleId' && '所属模块'}
                          {key === 'tags' && '标签'}
                          {key === 'updateUserName' && (updateUserFilterOptions ? <SortableHeader label="更新人" field="updateUser" filter filterOptions={updateUserFilterOptions} filterValue={columnFilter.updateUser} onFilterChange={(v) => onColumnFilterChange?.('updateUser', v ?? null)} /> : '更新人')}
                          {key === 'updateTime' && <SortableHeader label="更新时间" field="updateTime" sort={sort} onSortChange={onSortChange} />}
                          {key === 'createUserName' && '创建人'}
                          {key === 'createTime' && <SortableHeader label="创建时间" field="createTime" sort={sort} onSortChange={onSortChange} />}
                        </ResizableTh>
                      ) : null;
                      if (resizeTh) return resizeTh;
                      switch (key) {
                        case 'reviewStatus':
                          return (
                            <TableHead key={key} className="w-24 font-medium text-gray-500">
                              <SortableHeader label="评审结果" field="reviewStatus" sort={sort} onSortChange={onSortChange} filter filterOptions={Object.entries(REVIEW_STATUS_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.reviewStatus} onFilterChange={(v) => onColumnFilterChange?.('reviewStatus', v ?? null)} />
                            </TableHead>
                          );
                        case 'lastExecuteResult':
                          return (
                            <TableHead key={key} className="w-24 font-medium text-gray-500">
                              <SortableHeader label="执行结果" field="lastExecuteResult" sort={sort} onSortChange={onSortChange} filter filterOptions={Object.entries(EXECUTE_RESULT_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.lastExecuteResult} onFilterChange={(v) => onColumnFilterChange?.('lastExecuteResult', v ?? null)} />
                            </TableHead>
                          );
                        case 'moduleId':
                          return <TableHead key={key} className="w-36 font-medium text-gray-500">所属模块</TableHead>;
                        case 'tags':
                          return <TableHead key={key} className="w-24 font-medium text-gray-500">标签</TableHead>;
                        case 'updateUserName':
                          return (
                            <TableHead key={key} className="w-24 font-medium text-gray-500">
                              {updateUserFilterOptions ? <SortableHeader label="更新人" field="updateUser" filter filterOptions={updateUserFilterOptions} filterValue={columnFilter.updateUser} onFilterChange={(v) => onColumnFilterChange?.('updateUser', v ?? null)} /> : '更新人'}
                            </TableHead>
                          );
                        case 'updateTime':
                          return (
                            <TableHead key={key} className="w-36 font-medium text-gray-500">
                              <SortableHeader label="更新时间" field="updateTime" sort={sort} onSortChange={onSortChange} />
                            </TableHead>
                          );
                        case 'createUserName':
                          return <TableHead key={key} className="w-24 font-medium text-gray-500">创建人</TableHead>;
                        case 'createTime':
                          return (
                            <TableHead key={key} className="w-36 font-medium text-gray-500">
                              <SortableHeader label="创建时间" field="createTime" sort={sort} onSortChange={onSortChange} />
                            </TableHead>
                          );
                        default:
                          return null;
                      }
                    })}
                    {/* 操作列固定在右侧，明显样式：左侧分隔线 + 浅灰背景 + 阴影 */}
                    <TableHead className="min-w-[200px] w-[200px] text-right font-medium text-gray-600 !pl-4 !pr-5 sticky right-0 bg-[#f7f8fa] border-l border-[#e5e6eb] shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10">
                      <div className="flex items-center justify-end gap-1">
                        操作
                        {onColumnSettingsClick && (
                          <button
                            type="button"
                            onClick={onColumnSettingsClick}
                            className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                            aria-label="表格列配置"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody key={`case-tbody-${safeCaseList.length}-${safeCaseList[0]?.id ?? ''}-${safeCaseList[safeCaseList.length - 1]?.id ?? ''}`}>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      </TableCell>
                    </TableRow>
                  ) : safeCaseList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="text-center py-12">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">暂无用例数据</p>
                      </TableCell>
                    </TableRow>
                  ) : !!onDragSort ? (
                    <SortableContext items={safeCaseList.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                      {safeCaseList.map((item) => (
                        <SortableTableRow key={item.id} id={item.id} hasDrag>
                          <TableCell className="!px-2">
                            <Checkbox
                              checked={selectedCases.includes(item.id)}
                              onCheckedChange={(c) => onSelectCase(item.id, c as boolean)}
                              className="rounded-[2px] border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="w-24">
                            <button
                              className="text-slate-400 hover:text-blue-600 font-mono text-[11px] font-medium transition-colors tracking-tight"
                              onClick={() => handleView(item)}
                            >
                              {item.num ? `#${item.num}` : (item.id?.slice(0, 7) || 'untagged')}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              {canEdit && onNameChange && editingNameId === item.id ? (
                                <Input
                                  className="h-7 text-xs flex-1 min-w-0"
                                  value={editingNameValue}
                                  onChange={(e) => setEditingNameValue(e.target.value)}
                                  onBlur={() => handleNameSave(item)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave(item)}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  className={`text-left flex-1 min-w-0 truncate font-normal hover:underline decoration-blue-600/30 ${canEdit && onNameChange ? 'text-blue-600 cursor-pointer' : 'text-blue-600'}`}
                                  title={item.name}
                                  onClick={() =>
                                    canEdit && onNameChange
                                      ? (setEditingNameId(item.id), setEditingNameValue(item.name || ''))
                                      : handleView(item)
                                  }
                                >
                                  {item.name || '-'}
                                </button>
                              )}
                              {(() => {
                                const typeMeta = getCaseTypeBadge(item);
                                return (
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] shrink-0 border ${typeMeta.color}`}
                                    title={`用例类型：${typeMeta.label}`}
                                  >
                                    {typeMeta.label}
                                  </span>
                                );
                              })()}
                              {item.realizationSummary?.automationCoverageStatus && getCoverageLabel(item.realizationSummary.automationCoverageStatus) && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs shrink-0 ${getCoverageBadgeClass(item.realizationSummary.automationCoverageStatus)}`}
                                  title={`已覆盖类型：${(item.realizationSummary.coveredTypes ?? []).join(' / ') || '暂无'}`}
                                >
                                  {getCoverageLabel(item.realizationSummary.automationCoverageStatus)}
                                </span>
                              )}
                              {item.aiCreate && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-violet-100 text-violet-700 shrink-0" title="AI 创建">
                                  <Sparkles className="h-3 w-3" /> AI
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[72px]">
                            {canEdit && onCaseLevelChange ? (
                              editingLevelId === item.id ? (
                                <Select
                                  open
                                  value={item.caseLevel ?? item.functionalPriority ?? 'P2'}
                                  onValueChange={(v) => {
                                    onCaseLevelChange(item, v);
                                    setEditingLevelId(null);
                                  }}
                                  onOpenChange={(open) => !open && setEditingLevelId(null)}
                                >
                                  <SelectTrigger className="h-7 min-w-0 w-[70px] border-gray-200 text-xs">
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
                                <button
                                  type="button"
                                  className="w-full text-left"
                                  onClick={() => setEditingLevelId(item.id)}
                                >
                                  <CaseLevelBadge item={item} />
                                </button>
                              )
                            ) : (
                              <CaseLevelBadge item={item} />
                            )}
                          </TableCell>
                          {orderedOptionalCols.map((key) => {
                            switch (key) {
                              case 'caseType': {
                                const typeMeta = getCaseTypeBadge(item);
                                return (
                                  <TableCell key={`${item.id}-${key}`}>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${typeMeta.color}`}>
                                      {typeMeta.label}
                                    </span>
                                  </TableCell>
                                );
                              }
                              case 'reviewStatus':
                                return (
                                  <TableCell key={`${item.id}-${key}`}>
                                    {item.reviewStatus ? <Badge className={getReviewStatusColor(item.reviewStatus)}>{getReviewStatusLabel(item.reviewStatus)}</Badge> : '-'}
                                  </TableCell>
                                );
                              case 'lastExecuteResult':
                                return (
                                  <TableCell key={`${item.id}-${key}`}>
                                    {item.lastExecuteResult ? <Badge className={getExecuteResultColor(item.lastExecuteResult)}>{getExecuteResultLabel(item.lastExecuteResult)}</Badge> : '-'}
                                  </TableCell>
                                );
                              case 'moduleId':
                                return (
                                  <TableCell key={`${item.id}-${key}`} className="max-w-[180px]">
                                    {canEdit && onModuleChange ? (editingModuleId === item.id ? (
                                      <CaseModuleSelect moduleTree={moduleTree} value={item.moduleId ?? ''} onChange={(v) => { onModuleChange(item, v); setEditingModuleId(null); }} onOpenChange={(o) => !o && setEditingModuleId(null)} open noLabel placeholder="选择模块" />
                                    ) : (
                                      <button type="button" className="w-full text-left truncate text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded px-1 -mx-1" title={item.moduleId ? getModulePath(item.moduleId, moduleTree) : ''} onClick={() => setEditingModuleId(item.id)}>
                                        {item.moduleId ? getModulePath(item.moduleId, moduleTree) : '-'}
                                      </button>
                                    )) : (
                                      <div className="truncate text-gray-600" title={item.moduleId ? getModulePath(item.moduleId, moduleTree) : ''}>
                                        {item.moduleId ? getModulePath(item.moduleId, moduleTree) : '-'}
                                      </div>
                                    )}
                                  </TableCell>
                                );
                              case 'tags': {
                                const tagList = getTagsArray(item.tags);
                                const displayTags = tagList.slice(0, 2);
                                const moreCount = tagList.length - 2;
                                return (
                                  <TableCell key={`${item.id}-${key}`} className="max-w-[200px] truncate">
                                    {tagList.length === 0 ? (
                                      <span className="text-gray-400">-</span>
                                    ) : (
                                      <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex flex-nowrap items-center gap-1.5 truncate">
                                              {displayTags.map((t, i) => (
                                                <Badge key={`${t}-${i}`} variant="outline" className="text-xs px-1.5 py-0 font-normal border-gray-200 text-gray-600 bg-gray-50 shrink-0 truncate max-w-[80px]" title={t}>
                                                  {t}
                                                </Badge>
                                              ))}
                                              {moreCount > 0 && (
                                                <span className="text-xs text-gray-500 shrink-0">+{moreCount}</span>
                                              )}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs bg-white text-gray-800 border border-gray-200 shadow-md">
                                            <div className="flex flex-wrap gap-1.5">
                                              {tagList.map((t, i) => (
                                                <span key={`${t}-${i}`} className="text-xs text-gray-700">{t}</span>
                                              ))}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </TableCell>
                                );
                              }
                              case 'updateUserName':
                                return (<TableCell key={`${item.id}-${key}`} className="text-gray-500 truncate max-w-[96px]" title={item.updateUserName || item.updateUser || '-'}>{item.updateUserName || item.updateUser || '-'}</TableCell>);
                              case 'updateTime':
                                return (<TableCell key={`${item.id}-${key}`} className="text-gray-400 tabular-nums font-mono truncate max-w-[144px]" title={item.updateTime ? new Date(item.updateTime as string | number).toLocaleString('zh-CN') : '-'}>{item.updateTime ? new Date(item.updateTime as string | number).toLocaleString('zh-CN') : '-'}</TableCell>);
                              case 'createUserName':
                                return (<TableCell key={`${item.id}-${key}`} className="text-gray-500 truncate max-w-[96px]" title={item.createUserName || item.createUser || '-'}>{item.createUserName || item.createUser || '-'}</TableCell>);
                              case 'createTime':
                                return (<TableCell key={`${item.id}-${key}`} className="text-gray-400 tabular-nums font-mono truncate max-w-[144px]" title={item.createTime ? new Date(item.createTime as string | number).toLocaleString('zh-CN') : '-'}>{item.createTime ? new Date(item.createTime as string | number).toLocaleString('zh-CN') : '-'}</TableCell>);
                              default:
                                return null;
                            }
                          })}
                          <TableCell className="text-right !pl-4 !pr-6 w-[220px] min-w-[220px] sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.03)] z-10">
                            <div className="flex items-center justify-end gap-2.5">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      disabled={executingIds.has(item.id) || !item.workflowId}
                                      className={cn(
                                        "inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 shadow-sm",
                                        !item.workflowId 
                                          ? "bg-slate-50 text-slate-300 cursor-not-allowed opacity-50"
                                          : executingIds.has(item.id)
                                            ? "bg-blue-50 text-blue-400 animate-pulse"
                                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:shadow-md active:scale-95"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExecute(item);
                                      }}
                                    >
                                      {executingIds.has(item.id) ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Play className={cn("w-4 h-4", item.workflowId && "fill-current")} />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {item.workflowId ? "一键执行自动化" : "未绑定自动化"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <div className="h-4 w-px bg-slate-200 mx-0.5" />

                              {canEdit && (
                                <button
                                  type="button"
                                  className="text-[13px] font-semibold text-[#165DFF] hover:text-[#165DFF]/80 transition-colors px-1"
                                  onClick={() => handleEdit(item)}
                                >
                                  编辑
                                </button>
                              )}
                              
                              {canCopy && (
                                <button
                                  type="button"
                                  className="text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-colors px-1"
                                  onClick={() => handleCopy(item)}
                                >
                                  复制
                                </button>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem onClick={() => handleView(item)} className="gap-2">
                                    <FileText className="w-4 h-4" /> 查看详情
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <>
                                      <div className="h-px bg-slate-100 my-1" />
                                      <DropdownMenuItem 
                                        onClick={() => handleDelete(item)} 
                                        className="text-red-500 focus:text-red-600 gap-2"
                                      >
                                        <Trash2 className="w-4 h-4" /> 删除
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </SortableTableRow>
                      ))}
                    </SortableContext>
                  ) : (
                    safeCaseList.map((item) => (
                      <TableRow key={item.id} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-200 h-10">
                        <TableCell className="!px-2">
                          <Checkbox
                            checked={selectedCases.includes(item.id)}
                            onCheckedChange={(c) => onSelectCase(item.id, c as boolean)}
                            className="rounded-[2px] border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            className="text-blue-600 font-medium cursor-pointer hover:underline decoration-blue-600/30 font-mono"
                            onClick={() => handleView(item)}
                          >
                            {item.num ?? item.id?.slice(0, 8)}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            {canEdit && onNameChange && editingNameId === item.id ? (
                              <Input
                                className="h-7 text-xs flex-1 min-w-0"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                onBlur={() => handleNameSave(item)}
                                onKeyDown={(e) => e.key === 'Enter' && handleNameSave(item)}
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                className={`text-left flex-1 min-w-0 truncate font-normal hover:underline decoration-blue-600/30 ${canEdit && onNameChange ? 'text-blue-600 cursor-pointer' : 'text-blue-600'}`}
                                title={item.name}
                                onClick={() =>
                                  canEdit && onNameChange
                                    ? (setEditingNameId(item.id), setEditingNameValue(item.name || ''))
                                    : handleView(item)
                                }
                              >
                                {item.name || '-'}
                              </button>
                            )}
                            {item.realizationSummary?.automationCoverageStatus && getCoverageLabel(item.realizationSummary.automationCoverageStatus) && (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs shrink-0 ${getCoverageBadgeClass(item.realizationSummary.automationCoverageStatus)}`}
                                title={`已覆盖类型：${(item.realizationSummary.coveredTypes ?? []).join(' / ') || '暂无'}`}
                              >
                                {getCoverageLabel(item.realizationSummary.automationCoverageStatus)}
                              </span>
                            )}
                            {item.aiCreate && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-violet-100 text-violet-700 shrink-0" title="AI 创建">
                                <Sparkles className="h-3 w-3" /> AI
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[72px]">
                          {canEdit && onCaseLevelChange ? (
                            editingLevelId === item.id ? (
                              <Select
                                open
                                value={item.caseLevel ?? item.functionalPriority ?? 'P2'}
                                onValueChange={(v) => {
                                  onCaseLevelChange(item, v);
                                  setEditingLevelId(null);
                                }}
                                onOpenChange={(open) => !open && setEditingLevelId(null)}
                              >
                                <SelectTrigger className="h-7 min-w-0 w-[70px] border-gray-200 text-xs">
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
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => setEditingLevelId(item.id)}
                              >
                                <CaseLevelBadge item={item} />
                              </button>
                            )
                          ) : (
                            <CaseLevelBadge item={item} />
                          )}
                        </TableCell>
                        {orderedOptionalCols.map((key) => {
                          switch (key) {
                            case 'reviewStatus':
                              return (
                                <TableCell key={`${item.id}-${key}`}>
                                  {item.reviewStatus ? <Badge className={getReviewStatusColor(item.reviewStatus)}>{getReviewStatusLabel(item.reviewStatus)}</Badge> : '-'}
                                </TableCell>
                              );
                            case 'lastExecuteResult':
                              return (
                                <TableCell key={`${item.id}-${key}`}>
                                  {item.lastExecuteResult ? <Badge className={getExecuteResultColor(item.lastExecuteResult)}>{getExecuteResultLabel(item.lastExecuteResult)}</Badge> : '-'}
                                </TableCell>
                              );
                            case 'moduleId':
                              return (
                                <TableCell key={`${item.id}-${key}`} className="max-w-[180px]">
                                  {canEdit && onModuleChange ? (editingModuleId === item.id ? (
                                    <CaseModuleSelect moduleTree={moduleTree} value={item.moduleId ?? ''} onChange={(v) => { onModuleChange(item, v); setEditingModuleId(null); }} onOpenChange={(o) => !o && setEditingModuleId(null)} open noLabel placeholder="选择模块" />
                                  ) : (
                                    <button type="button" className="w-full text-left truncate text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded px-1 -mx-1" title={item.moduleId ? getModulePath(item.moduleId, moduleTree) : ''} onClick={() => setEditingModuleId(item.id)}>
                                      {item.moduleId ? getModulePath(item.moduleId, moduleTree) : '-'}
                                    </button>
                                  )) : (
                                    <div className="truncate text-gray-600" title={item.moduleId ? getModulePath(item.moduleId, moduleTree) : ''}>
                                      {item.moduleId ? getModulePath(item.moduleId, moduleTree) : '-'}
                                    </div>
                                  )}
                                </TableCell>
                              );
                            case 'tags': {
                              const tagList = getTagsArray(item.tags);
                              const displayTags = tagList.slice(0, 2);
                              const moreCount = tagList.length - 2;
                              return (
                                <TableCell key={`${item.id}-${key}`} className="max-w-[200px] truncate">
                                  {tagList.length === 0 ? (
                                    <span className="text-gray-400">-</span>
                                  ) : (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex flex-nowrap items-center gap-1.5 truncate">
                                            {displayTags.map((t, i) => (
                                              <Badge key={`${t}-${i}`} variant="outline" className="text-xs px-1.5 py-0 font-normal border-gray-200 text-gray-600 bg-gray-50 shrink-0 truncate max-w-[80px]" title={t}>
                                                {t}
                                              </Badge>
                                            ))}
                                            {moreCount > 0 && (
                                              <span className="text-xs text-gray-500 shrink-0">+{moreCount}</span>
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs bg-white text-gray-800 border border-gray-200 shadow-md">
                                          <div className="flex flex-wrap gap-1.5">
                                            {tagList.map((t, i) => (
                                              <span key={`${t}-${i}`} className="text-xs text-gray-700">{t}</span>
                                            ))}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </TableCell>
                              );
                            }
                            case 'updateUserName':
                              return (<TableCell key={`${item.id}-${key}`} className="text-gray-500 truncate max-w-[96px]" title={item.updateUserName || item.updateUser || '-'}>{item.updateUserName || item.updateUser || '-'}</TableCell>);
                            case 'updateTime':
                              return (<TableCell key={`${item.id}-${key}`} className="text-gray-400 tabular-nums font-mono truncate max-w-[144px]" title={item.updateTime ? new Date(item.updateTime as string | number).toLocaleString('zh-CN') : '-'}>{item.updateTime ? new Date(item.updateTime as string | number).toLocaleString('zh-CN') : '-'}</TableCell>);
                            case 'createUserName':
                              return (<TableCell key={`${item.id}-${key}`} className="text-gray-500 truncate max-w-[96px]" title={item.createUserName || item.createUser || '-'}>{item.createUserName || item.createUser || '-'}</TableCell>);
                            case 'createTime':
                              return (<TableCell key={`${item.id}-${key}`} className="text-gray-400 tabular-nums font-mono truncate max-w-[144px]" title={item.createTime ? new Date(item.createTime as string | number).toLocaleString('zh-CN') : '-'}>{item.createTime ? new Date(item.createTime as string | number).toLocaleString('zh-CN') : '-'}</TableCell>);
                            default:
                              return null;
                          }
                        })}
                        <TableCell className="text-right !pl-4 !pr-5 w-[200px] min-w-[200px] sticky right-0 bg-white group-hover:bg-[#f2f3f5] border-l border-[#e5e6eb] shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10">
                          <div className="flex items-center justify-end gap-2">
                            {canEdit && (
                              <button
                                type="button"
                                className="text-xs font-medium text-[#165DFF] underline decoration-[#165DFF]/50 hover:decoration-[#165DFF] hover:text-[#165DFF]/90 transition-colors"
                                onClick={() => handleEdit(item)}
                              >
                                编辑
                              </button>
                            )}
                            {canCopy && (
                              <>
                                <span className="text-gray-300 mx-0.5">|</span>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[#165DFF] underline decoration-[#165DFF]/50 hover:decoration-[#165DFF] hover:text-[#165DFF]/90 transition-colors"
                                  onClick={() => handleCopy(item)}
                                >
                                  复制
                                </button>
                              </>
                            )}
                            <span className="text-gray-300 mx-0.5 select-none">|</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                  aria-label="更多操作"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(item)}>
                                  查看
                                </DropdownMenuItem>
                                {canDelete && (
                                  <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-500 focus:text-red-600">
                                    删除
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DndContext>
          ) : (
            <Table className="[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3 [&_th]:text-[13px] [&_th]:font-semibold [&_th]:text-gray-600 [&_td]:text-[13px] [&_td]:text-gray-900" style={{ tableLayout: 'fixed' }}>
              <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <TableRow className="hover:bg-transparent border-none h-10">
                  <TableHead className="w-12 !px-2">
                    <Checkbox checked={isAllSelected} onCheckedChange={onSelectAll} className="rounded-[2px] opacity-60" />
                  </TableHead>
                  {onColumnWidthChange ? (
                    <>
                      <ResizableTh columnKey="num" width={getWidth('num')} onResize={onColumnWidthChange} className="font-medium text-gray-500">
                        <SortableHeader label="编号" field="num" sort={sort} onSortChange={onSortChange} />
                      </ResizableTh>
                      <ResizableTh columnKey="name" width={getWidth('name')} onResize={onColumnWidthChange} className="font-medium text-gray-500">
                        <SortableHeader label="用例名称" field="name" sort={sort} onSortChange={onSortChange} />
                      </ResizableTh>
                      <ResizableTh columnKey="caseLevel" width={getWidth('caseLevel')} onResize={onColumnWidthChange} className="font-medium text-gray-500">
                        <SortableHeader label="用例等级" field="caseLevel" filter filterOptions={Object.entries(CASE_LEVEL_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.caseLevel} onFilterChange={(v) => onColumnFilterChange?.('caseLevel', v ?? null)} />
                      </ResizableTh>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-24 font-medium text-gray-500">
                        <SortableHeader label="编号" field="num" sort={sort} onSortChange={onSortChange} />
                      </TableHead>
                      <TableHead className="min-w-[180px] font-medium text-gray-500">
                        <SortableHeader label="用例名称" field="name" sort={sort} onSortChange={onSortChange} />
                      </TableHead>
                      <TableHead className="w-20 font-medium text-gray-500">
                        <SortableHeader label="用例等级" field="caseLevel" filter filterOptions={Object.entries(CASE_LEVEL_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.caseLevel} onFilterChange={(v) => onColumnFilterChange?.('caseLevel', v ?? null)} />
                      </TableHead>
                    </>
                  )}
                  {orderedOptionalCols.map((key) => {
                    if (onColumnWidthChange) {
                      const content = key === 'reviewStatus' ? <SortableHeader label="评审结果" field="reviewStatus" sort={sort} onSortChange={onSortChange} filter filterOptions={Object.entries(REVIEW_STATUS_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.reviewStatus} onFilterChange={(v) => onColumnFilterChange?.('reviewStatus', v ?? null)} /> :
                        key === 'lastExecuteResult' ? <SortableHeader label="执行结果" field="lastExecuteResult" sort={sort} onSortChange={onSortChange} filter filterOptions={Object.entries(EXECUTE_RESULT_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.lastExecuteResult} onFilterChange={(v) => onColumnFilterChange?.('lastExecuteResult', v ?? null)} /> :
                          key === 'moduleId' ? '所属模块' : key === 'tags' ? '标签' : key === 'updateUserName' ? (updateUserFilterOptions ? <SortableHeader label="更新人" field="updateUser" filter filterOptions={updateUserFilterOptions} filterValue={columnFilter.updateUser} onFilterChange={(v) => onColumnFilterChange?.('updateUser', v ?? null)} /> : '更新人') :
                            key === 'updateTime' ? <SortableHeader label="更新时间" field="updateTime" sort={sort} onSortChange={onSortChange} /> : key === 'createUserName' ? '创建人' :
                              key === 'createTime' ? <SortableHeader label="创建时间" field="createTime" sort={sort} onSortChange={onSortChange} /> : null;
                      return <ResizableTh key={key} columnKey={key} width={getWidth(key)} onResize={onColumnWidthChange} className="font-medium text-gray-500">{content}</ResizableTh>;
                    }
                    switch (key) {
                      case 'reviewStatus':
                        return (
                          <TableHead key={key} className="w-24 font-medium text-gray-500">
                            <SortableHeader label="评审结果" field="reviewStatus" sort={sort} onSortChange={onSortChange} filter filterOptions={Object.entries(REVIEW_STATUS_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.reviewStatus} onFilterChange={(v) => onColumnFilterChange?.('reviewStatus', v ?? null)} />
                          </TableHead>
                        );
                      case 'lastExecuteResult':
                        return (
                          <TableHead key={key} className="w-24 font-medium text-gray-500">
                            <SortableHeader label="执行结果" field="lastExecuteResult" sort={sort} onSortChange={onSortChange} filter filterOptions={Object.entries(EXECUTE_RESULT_MAP).map(([v, { label }]) => ({ value: v, label }))} filterValue={columnFilter.lastExecuteResult} onFilterChange={(v) => onColumnFilterChange?.('lastExecuteResult', v ?? null)} />
                          </TableHead>
                        );
                      case 'moduleId':
                        return <TableHead key={key} className="w-36 font-medium text-gray-500">所属模块</TableHead>;
                      case 'tags':
                        return <TableHead key={key} className="w-24 font-medium text-gray-500">标签</TableHead>;
                      case 'updateUserName':
                        return (
                          <TableHead key={key} className="w-24 font-medium text-gray-500">
                            {updateUserFilterOptions ? <SortableHeader label="更新人" field="updateUser" filter filterOptions={updateUserFilterOptions} filterValue={columnFilter.updateUser} onFilterChange={(v) => onColumnFilterChange?.('updateUser', v ?? null)} /> : '更新人'}
                          </TableHead>
                        );
                      case 'updateTime':
                        return (
                          <TableHead key={key} className="w-36 font-medium text-gray-500">
                            <SortableHeader label="更新时间" field="updateTime" sort={sort} onSortChange={onSortChange} />
                          </TableHead>
                        );
                      case 'createUserName':
                        return <TableHead key={key} className="w-24 font-medium text-gray-500">创建人</TableHead>;
                      case 'createTime':
                        return (
                          <TableHead key={key} className="w-36 font-medium text-gray-500">
                            <SortableHeader label="创建时间" field="createTime" sort={sort} onSortChange={onSortChange} />
                          </TableHead>
                        );
                      default:
                        return null;
                    }
                  })}
                  <TableHead className="min-w-[200px] w-[200px] text-right font-medium text-gray-600 !pl-4 !pr-5 sticky right-0 bg-[#f7f8fa] border-l border-[#e5e6eb] shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10">
                    <div className="flex items-center justify-end gap-1">操作</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody key={`case-tbody-${safeCaseList.length}-${safeCaseList[0]?.id ?? ''}-${safeCaseList[safeCaseList.length - 1]?.id ?? ''}`}>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    </TableCell>
                  </TableRow>
                ) : safeCaseList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">暂无用例数据</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  safeCaseList.map((item) => (
                    <TableRow key={item.id} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-200 h-10">
                      <TableCell className="!px-2">
                        <Checkbox
                          checked={selectedCases.includes(item.id)}
                          onCheckedChange={(c) => onSelectCase(item.id, c as boolean)}
                          className="rounded-[2px] border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="w-24">
                        <button
                          className="text-slate-400 hover:text-blue-600 font-mono text-[11px] font-medium transition-colors tracking-tight"
                          onClick={() => handleView(item)}
                        >
                          {item.num ? `#${item.num}` : (item.id?.slice(0, 7) || 'untagged')}
                        </button>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center gap-2 min-w-0">
                          {canEdit && onNameChange && editingNameId === item.id ? (
                            <Input
                              className="h-7 text-xs flex-1 min-w-0"
                              value={editingNameValue}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              onBlur={() => handleNameSave(item)}
                              onKeyDown={(e) => e.key === 'Enter' && handleNameSave(item)}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              className={`text-left flex-1 min-w-0 truncate font-normal hover:underline decoration-blue-600/30 ${canEdit && onNameChange ? 'text-blue-600 cursor-pointer' : 'text-blue-600'}`}
                              title={item.name}
                              onClick={() =>
                                canEdit && onNameChange
                                  ? (setEditingNameId(item.id), setEditingNameValue(item.name || ''))
                                  : handleView(item)
                              }
                            >
                              {item.name || '-'}
                            </button>
                          )}
                          {item.aiCreate && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-violet-100 text-violet-700 shrink-0" title="AI 创建">
                              <Sparkles className="h-3 w-3" /> AI
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[72px]">
                        {canEdit && onCaseLevelChange ? (
                          editingLevelId === item.id ? (
                            <Select
                              open
                              value={item.caseLevel ?? item.functionalPriority ?? 'P2'}
                              onValueChange={(v) => {
                                onCaseLevelChange(item, v);
                                setEditingLevelId(null);
                              }}
                              onOpenChange={(open) => !open && setEditingLevelId(null)}
                            >
                              <SelectTrigger className="h-7 min-w-0 w-[70px] border-gray-200 text-xs">
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
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() => setEditingLevelId(item.id)}
                            >
                              <CaseLevelBadge item={item} />
                            </button>
                          )
                        ) : (
                          <CaseLevelBadge item={item} />
                        )}
                      </TableCell>
                      {orderedOptionalCols.map((key) => {
                        switch (key) {
                          case 'reviewStatus':
                            return (
                              <TableCell key={`${item.id}-${key}`}>
                                {item.reviewStatus ? <Badge className={getReviewStatusColor(item.reviewStatus)}>{getReviewStatusLabel(item.reviewStatus)}</Badge> : '-'}
                              </TableCell>
                            );
                          case 'lastExecuteResult':
                            return (
                              <TableCell key={`${item.id}-${key}`}>
                                {item.lastExecuteResult ? <Badge className={getExecuteResultColor(item.lastExecuteResult)}>{getExecuteResultLabel(item.lastExecuteResult)}</Badge> : '-'}
                              </TableCell>
                            );
                          case 'moduleId':
                            return (
                              <TableCell key={`${item.id}-${key}`} className="max-w-[180px]">
                                {canEdit && onModuleChange ? (editingModuleId === item.id ? (
                                  <CaseModuleSelect moduleTree={moduleTree} value={item.moduleId ?? ''} onChange={(v) => { onModuleChange(item, v); setEditingModuleId(null); }} onOpenChange={(o) => !o && setEditingModuleId(null)} open noLabel placeholder="选择模块" />
                                ) : (
                                  <button type="button" className="w-full text-left truncate text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded px-1 -mx-1" title={item.moduleId ? getModulePath(item.moduleId, moduleTree) : ''} onClick={() => setEditingModuleId(item.id)}>
                                    {item.moduleId ? getModulePath(item.moduleId, moduleTree) : '-'}
                                  </button>
                                )) : (
                                  <div className="truncate text-gray-600" title={item.moduleId ? getModulePath(item.moduleId, moduleTree) : ''}>
                                    {item.moduleId ? getModulePath(item.moduleId, moduleTree) : '-'}
                                  </div>
                                )}
                              </TableCell>
                            );
                          case 'tags': {
                            const tagList = getTagsArray(item.tags);
                            const displayTags = tagList.slice(0, 2);
                            const moreCount = tagList.length - 2;
                            return (
                              <TableCell key={`${item.id}-${key}`} className="max-w-[200px] truncate">
                                {tagList.length === 0 ? (
                                  <span className="text-gray-400">-</span>
                                ) : (
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex flex-nowrap items-center gap-1.5 truncate">
                                          {displayTags.map((t, i) => (
                                            <Badge key={`${t}-${i}`} variant="outline" className="text-xs px-1.5 py-0 font-normal border-gray-200 text-gray-600 bg-gray-50 shrink-0 truncate max-w-[80px]" title={t}>
                                              {t}
                                            </Badge>
                                          ))}
                                          {moreCount > 0 && (
                                            <span className="text-xs text-gray-500 shrink-0">+{moreCount}</span>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs bg-white text-gray-800 border border-gray-200 shadow-md p-2">
                                        <div className="flex flex-wrap gap-1.5">
                                          {tagList.map((t, i) => (
                                            <span key={`${t}-${i}`} className="text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{t}</span>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </TableCell>
                            );
                          }
                          case 'updateUserName':
                            return (<TableCell key={`${item.id}-${key}`} className="text-gray-500 truncate max-w-[96px]" title={item.updateUserName || item.updateUser || '-'}>{item.updateUserName || item.updateUser || '-'}</TableCell>);
                          case 'updateTime':
                            return (<TableCell key={`${item.id}-${key}`} className="text-gray-400 tabular-nums font-mono truncate max-w-[144px]" title={item.updateTime ? new Date(item.updateTime as string | number).toLocaleString('zh-CN') : '-'}>{item.updateTime ? new Date(item.updateTime as string | number).toLocaleString('zh-CN') : '-'}</TableCell>);
                          case 'createUserName':
                            return (<TableCell key={`${item.id}-${key}`} className="text-gray-500 truncate max-w-[96px]" title={item.createUserName || item.createUser || '-'}>{item.createUserName || item.createUser || '-'}</TableCell>);
                          case 'createTime':
                            return (<TableCell key={`${item.id}-${key}`} className="text-gray-400 tabular-nums font-mono truncate max-w-[144px]" title={item.createTime ? new Date(item.createTime as string | number).toLocaleString('zh-CN') : '-'}>{item.createTime ? new Date(item.createTime as string | number).toLocaleString('zh-CN') : '-'}</TableCell>);
                          default:
                            return null;
                        }
                      })}
                      <TableCell className="text-right !pl-4 !pr-5 w-[200px] min-w-[200px] sticky right-0 bg-white group-hover:bg-[#f2f3f5] border-l border-[#e5e6eb] shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-[#165DFF] underline decoration-[#165DFF]/50 hover:decoration-[#165DFF] hover:text-[#165DFF]/90 transition-colors"
                            onClick={() => handleView(item)}
                          >
                            查看
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              className="text-xs font-medium text-[#165DFF] underline decoration-[#165DFF]/50 hover:decoration-[#165DFF] hover:text-[#165DFF]/90 transition-colors"
                              onClick={() => handleEdit(item)}
                            >
                              编辑
                            </button>
                          )}
                          {canCopy && (
                            <button
                              type="button"
                              className="text-xs font-medium text-[#165DFF] underline decoration-[#165DFF]/50 hover:decoration-[#165DFF] hover:text-[#165DFF]/90 transition-colors"
                              onClick={() => handleCopy(item)}
                            >
                              复制
                            </button>
                          )}
                          {canDelete && (
                            <>
                              <span className="w-px h-3.5 bg-gray-200" />
                              <button
                                type="button"
                                className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline transition-colors"
                                onClick={() => handleDelete(item)}
                              >
                                删除
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
        {/* 分页 - 与报告中心自动化测试报告一致 */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-[#f9fafb]/50 flex-shrink-0">
            <div className="flex items-center text-sm text-gray-500">
              共 <span className="font-medium text-gray-900 mx-1">{total}</span> 条用例
              {pageSize != null && onPageSizeChange && (
                <>
                  <div className="w-px h-4 bg-gray-200 mx-4" />
                  每页显示
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => onPageSizeChange(Number(v))}
                  >
                    <SelectTrigger className="inline-flex h-9 w-20 mx-2 border-gray-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  条
                </>
              )}
            </div>
            <div className="flex items-center gap-6">
              <Pagination className="w-auto m-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={cn('h-9 px-3 cursor-pointer hover:bg-white border-gray-200 transition-all', !canGoToPrev && 'pointer-events-none opacity-40')}
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
                      className={cn('h-9 px-3 cursor-pointer hover:bg-white border-gray-200 transition-all', !canGoToNext && 'pointer-events-none opacity-40')}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="flex items-center gap-2 pl-6 border-l border-gray-200">
                <span className="text-sm text-gray-500 whitespace-nowrap">跳至</span>
                <Input
                  className="w-14 h-9 px-1 text-center border-gray-200 bg-white"
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
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用例</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用例「{deleteTarget?.name ?? ''}」吗？用例将进入回收站，可以在回收站中恢复或彻底删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteConfirm}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
