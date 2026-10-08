/**
 * 质量工作台页面
 * 主路径用于组织需求/版本/发布批次下的质量任务。
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Search, RefreshCw, MoreVertical, Edit, Copy, Trash2,
  Play, Archive, ChevronRight, ChevronDown, GripVertical,
  MoreHorizontal, Filter, Settings, HelpCircle, FolderPlus, Pencil,
  Boxes, ArrowUpDown, Share2, Inbox, Move, ChevronsDown, ChevronsUp
} from 'lucide-react';
import { testPlanManagementService, qualityWorkspaceService } from '@/services';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ComingSoon } from '@/components/common/ComingSoon';
import { CreateTestPlanSheet } from '@/components/features/test-plan/CreateTestPlanSheet';
import { CreatePlanGroupDialog } from '@/components/features/test-plan/CreatePlanGroupDialog';
import { ExecutePlanDialog } from '@/components/features/test-plan/ExecutePlanDialog';
import { TestPlanStatusTag } from '@/components/features/test-plan/TestPlanStatusTag';
import { StatusProgress, StatusProgressTooltipContent } from '@/components/features/test-plan/StatusProgress';
import { ExecuteResultTag } from '@/components/features/test-plan/ExecuteResultTag';
import { BatchOperationDialog } from '@/components/features/test-plan/BatchOperationDialog';
import { AdvancedFilterDialog, FilterValues } from '@/components/features/test-plan/AdvancedFilterDialog';
import { ModuleManagementDialog } from '@/components/features/test-plan/ModuleManagementDialog';
import { ModuleTreePanel } from '@/components/features/case-management/components/ModuleTreePanel';
import { testPlanTypeEnum, TestPlanType, planStatusOptions, planStatusMap, type PlanStatusType } from '@/constants/testPlanEnums';
import { TestPlanItem, ModuleTreeNode } from '@/types/testPlan';
import {
  getViewList,
  addView,
  type ViewItem,
  type ViewList,
  type ViewParams,
} from '@/services/test-plan/service';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TruncateWithTooltip } from '@/components/ui/truncate-with-tooltip';
import { Switch } from '@/components/ui/switch';
import { formatTimestampBeijing } from '@/utils/date';
import { DndContext, type DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 功能开关：是否显示"即将开放"占位页面（设置为 true 显示占位页面，false 显示实际功能）
const SHOW_COMING_SOON = false;

/** 视图 ID：系统视图固定值或自定义视图 id（与老前端 planTable viewId 一致） */
type ViewId = string;
const SYSTEM_VIEW_LABELS: Record<string, string> = {
  '': '全部数据',
  all_data: '全部数据',
  archived: '已归档',
  my_follow: '我关注的',
  my_create: '我创建的',
};
function getViewLabel(id: ViewId, viewList: ViewList | null): string {
  if (!viewList) return (SYSTEM_VIEW_LABELS[id] ?? id) || '全部数据';
  const internal = viewList.internalViews?.find(v => v.id === id);
  if (internal) return internal.name;
  const custom = viewList.customViews?.find(v => v.id === id);
  if (custom) return custom.name;
  return (SYSTEM_VIEW_LABELS[id] ?? id) || '全部数据';
}

/** 表头列配置（与老前端表格设置一致：前两项不可排序，其余可配置） */
const TABLE_COLUMNS_CONFIG: { key: string; label: string; sortable: boolean }[] = [
  { key: 'id', label: 'ID', sortable: false },
  { key: 'name', label: '质量工作台名称', sortable: false },
  { key: 'status', label: '状态', sortable: true },
  { key: 'createUser', label: '创建人', sortable: true },
  { key: 'passRate', label: '通过率', sortable: true },
  { key: 'executeResult', label: '执行结果', sortable: true },
  { key: 'caseCount', label: '用例数', sortable: true },
  { key: 'tags', label: '标签', sortable: true },
  { key: 'moduleId', label: '所属模块', sortable: true },
  { key: 'createdAt', label: '创建时间', sortable: true },
  { key: 'plannedStartEnd', label: '计划起止时间', sortable: true },
  { key: 'actualStartEnd', label: '实际起止时间', sortable: true },
];

/** 可拖拽排序的测试计划行（仅根计划/计划组） */
function SortablePlanRow({
  plan,
  isExpanded,
  expandedGroups,
  setExpandedGroups,
  selectedPlans,
  handleSelectPlan,
  navigate,
  moduleTree,
  getModuleName,
  handleExecute,
  handleEdit,
  handleCopy,
  handleArchive,
  handleDelete,
}: {
  plan: TestPlanItem;
  isExpanded: boolean;
  expandedGroups: Set<string>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedPlans: string[];
  handleSelectPlan: (id: string, checked: boolean) => void;
  navigate: (path: string) => void;
  moduleTree: ModuleTreeNode[];
  getModuleName: (moduleId: string, tree: ModuleTreeNode[]) => string;
  handleExecute: (plan: TestPlanItem) => void;
  handleEdit: (plan: TestPlanItem) => void;
  handleCopy: (plan: TestPlanItem) => void;
  handleArchive: (plan: TestPlanItem) => void;
  handleDelete: (plan: TestPlanItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plan.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`group border-b border-gray-200 transition-colors hover:bg-[#f2f3f5] h-14 ${isExpanded ? 'bg-blue-50/5' : ''} ${isDragging ? 'opacity-60 bg-gray-50 shadow-md' : ''}`}
    >
      <TableCell className="w-[44px] px-3 text-center" {...attributes} {...listeners}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 mx-auto" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">鼠标按住可拖拽排序</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="w-[140px] px-4">
        <div className="flex items-center gap-2">
          {plan.type === 'GROUP' ? (
            <button
              type="button"
              className="flex items-center justify-center rounded transition-colors cursor-pointer p-0 hover:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                const newExpanded = new Set(expandedGroups);
                if (newExpanded.has(plan.id)) newExpanded.delete(plan.id);
                else newExpanded.add(plan.id);
                setExpandedGroups(newExpanded);
              }}
              aria-label={isExpanded ? '收起' : '展开'}
            >
              <div className="relative group/group-icon">
                <div className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${isExpanded ? 'bg-blue-50 text-[#165DFF]' : 'bg-gray-100 text-gray-400'}`}>
                  <Share2 className="w-3.5 h-3.5 transform -rotate-90" />
                </div>
                {plan.childrenCount > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1 bg-white rounded-full leading-tight border ${isExpanded ? 'border-blue-200 text-blue-500' : 'border-gray-200 text-gray-500'}`}>
                    {plan.childrenCount}
                  </span>
                )}
              </div>
            </button>
          ) : null}
          {plan.type === testPlanTypeEnum.GROUP ? (
            <span className="text-sm font-normal text-gray-600 font-mono ml-1 cursor-default">{plan.num || plan.id.slice(0, 6)}</span>
          ) : (
            <button
              type="button"
              className="text-sm font-normal text-[#165DFF] font-mono tracking-tight ml-1 hover:underline text-left"
              onClick={() => navigate(`/quality-workspace/${plan.id}`)}
            >
              {plan.num || plan.id.slice(0, 6)}
            </button>
          )}
        </div>
      </TableCell>
      <TableCell className="w-[220px] max-w-[220px] px-4">
        {plan.type === testPlanTypeEnum.GROUP ? (
          <TruncateWithTooltip className="text-sm font-normal text-gray-700 block cursor-default">{plan.name || '-'}</TruncateWithTooltip>
        ) : (
          <button type="button" className="w-full text-left" onClick={() => navigate(`/quality-workspace/${plan.id}`)}>
            <TruncateWithTooltip className="text-sm font-normal text-[#165DFF] hover:underline block">{plan.name || '-'}</TruncateWithTooltip>
          </button>
        )}
      </TableCell>
      <TableCell className="text-center px-4">
        <TestPlanStatusTag status={plan.status} className="h-5 text-xs font-medium" />
      </TableCell>
      <TableCell className="px-4">
        <TruncateWithTooltip className="text-sm text-gray-600 block max-w-[120px]">
          {plan.createUserName || plan.createUser || '-'}
        </TruncateWithTooltip>
      </TableCell>
      <TableCell className="px-4">
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2.5 w-full min-w-0 cursor-pointer">
                <div className="flex-1 min-w-[140px]">
                  <StatusProgress statusDetail={plan as any} className="w-full" height="6px" showTooltip={false} />
                </div>
                <span className="text-xs font-normal text-gray-700 w-12 shrink-0 text-right tabular-nums">
                  {plan.passRate != null ? `${Number(plan.passRate).toFixed(2)}%` : '0.00%'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="p-3 shadow-xl border border-gray-200 bg-white text-gray-900 min-w-[160px]" side="top" hideArrow>
              <StatusProgressTooltipContent statusDetail={plan as any} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-center px-4">
        <ExecuteResultTag pass={plan.status === 'PREPARED' ? undefined : (plan as any).pass} plain className="text-sm mx-auto" />
      </TableCell>
      <TableCell className="text-center px-4">
        <span className="text-sm font-normal text-gray-900">{plan.functionalCaseCount || 0}</span>
      </TableCell>
      <TableCell className="w-[180px] min-w-0 px-4">
        {plan.tags && Array.isArray(plan.tags) && plan.tags.length > 0 ? (
          <div className="flex flex-nowrap gap-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
            {plan.tags.map((tag: any, i: number) => (
              <Badge key={i} variant="outline" className="text-xs px-1.5 h-3.5 bg-blue-50 border-blue-200 text-blue-600 font-normal shrink-0">
                {typeof tag === 'string' ? tag : tag.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="px-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-gray-500 truncate block max-w-[120px] cursor-default">
                {getModuleName(plan.moduleId, moduleTree)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{getModuleName(plan.moduleId, moduleTree)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-sm text-gray-600 whitespace-nowrap px-4">
        {formatTimestampBeijing(plan.createdAt)}
      </TableCell>
      <TableCell className="text-right pr-5 pl-4 w-[150px] min-w-[150px] sticky right-0 bg-white group-hover:bg-[#f2f3f5] border-l border-[#e5e6eb] shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10 transition-colors">
        <div className="flex justify-end items-center gap-2.5 flex-nowrap shrink-0">
          <button className="text-sm font-normal text-[#165DFF] hover:text-[#165DFF]/80 transition-colors shrink-0" onClick={() => handleExecute(plan)}>执行</button>
          <button className="text-sm font-normal text-[#165DFF] hover:text-[#165DFF]/80 transition-colors shrink-0" onClick={() => handleEdit(plan)}>编辑</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors focus:outline-none shrink-0" type="button">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 shadow-xl border-gray-100">
              {plan.type !== testPlanTypeEnum.GROUP && (
                <DropdownMenuItem onClick={() => navigate(`/quality-workspace/${plan.id}`)} className="text-sm">
                  <ClipboardList className="w-3.5 h-3.5 mr-2 text-gray-400" />详情
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleCopy(plan)} className="text-sm">
                <Copy className="w-3.5 h-3.5 mr-2 text-gray-400" />复制
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleArchive(plan)} className="text-sm text-amber-600 hover:text-amber-700">
                <Archive className="w-3.5 h-3.5 mr-2 opacity-70" />归档
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(plan)} className="text-sm text-red-600 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5 mr-2 opacity-70" />删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

/** 可拖拽排序的子计划行 */
function SortableSubPlanRow({
  child,
  navigate,
  moduleTree,
  getModuleName,
  handleExecute,
  handleEdit,
  handleCopy,
  handleDelete,
}: {
  child: TestPlanItem;
  navigate: (path: string) => void;
  moduleTree: ModuleTreeNode[];
  getModuleName: (moduleId: string, tree: ModuleTreeNode[]) => string;
  handleExecute: (plan: TestPlanItem) => void;
  handleEdit: (plan: TestPlanItem) => void;
  handleCopy: (plan: TestPlanItem) => void;
  handleDelete: (plan: TestPlanItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: child.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`bg-[#fafafc] hover:bg-[#f2f3f5] group border-b border-gray-200 transition-colors ${isDragging ? 'opacity-60 bg-gray-50 shadow-md' : ''}`}
    >
      <TableCell className="w-[44px] px-3 text-center" {...attributes} {...listeners}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 mx-auto" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">鼠标按住可拖拽排序</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="w-[140px] px-4">
        <div className="flex items-center gap-2">
          <div className="w-[20px] shrink-0" aria-hidden />
          <button
            type="button"
            className="text-sm font-normal text-[#165DFF] font-mono tracking-tight hover:underline text-left ml-1"
            onClick={() => navigate(`/quality-workspace/${child.id}`)}
          >
            {child.num || child.id.slice(0, 6)}
          </button>
        </div>
      </TableCell>
      <TableCell className="w-[220px] max-w-[220px] px-4">
        <button type="button" className="w-full text-left" onClick={() => navigate(`/quality-workspace/${child.id}`)}>
          <TruncateWithTooltip className="text-sm font-normal text-[#165DFF] hover:underline block">{child.name || '-'}</TruncateWithTooltip>
        </button>
      </TableCell>
      <TableCell className="text-center px-4">
        <TestPlanStatusTag status={child.status} className="h-5 text-xs font-medium" />
      </TableCell>
      <TableCell className="px-4">
        <TruncateWithTooltip className="text-sm text-gray-600 block max-w-[120px]">
          {child.createUserName || child.createUser || '-'}
        </TruncateWithTooltip>
      </TableCell>
      <TableCell className="px-4">
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2.5 w-full min-w-0 cursor-pointer">
                <div className="flex-1 min-w-[140px]">
                  <StatusProgress statusDetail={child as any} className="w-full" height="6px" showTooltip={false} />
                </div>
                <span className="text-xs font-normal text-gray-700 w-12 shrink-0 text-right tabular-nums">
                  {child.passRate != null ? `${Number(child.passRate).toFixed(2)}%` : '0.00%'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="p-3 shadow-xl border border-gray-200 bg-white text-gray-900 min-w-[160px]" side="top" hideArrow>
              <StatusProgressTooltipContent statusDetail={child as any} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-center px-4">
        <ExecuteResultTag pass={child.status === 'PREPARED' ? undefined : (child as any).pass} plain className="text-sm mx-auto" />
      </TableCell>
      <TableCell className="text-center px-4">
        <span className="text-sm font-normal text-gray-900">{child.functionalCaseCount || 0}</span>
      </TableCell>
      <TableCell className="w-[180px] min-w-0 px-4">
        {child.tags && Array.isArray(child.tags) && child.tags.length > 0 ? (
          <div className="flex flex-nowrap gap-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
            {child.tags.map((tag: any, i: number) => (
              <Badge key={i} variant="outline" className="text-xs px-1.5 h-3.5 bg-blue-50 border-blue-200 text-blue-600 font-normal shrink-0">
                {typeof tag === 'string' ? tag : tag.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="px-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-gray-500 truncate block max-w-[120px] cursor-default">
                {getModuleName(child.moduleId, moduleTree)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {getModuleName(child.moduleId, moduleTree)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-sm text-gray-600 whitespace-nowrap px-4">
        {formatTimestampBeijing(child.createdAt)}
      </TableCell>
      <TableCell className="text-right pr-5 pl-4 w-[150px] min-w-[150px] sticky right-0 bg-[#fafafc] group-hover:bg-[#f2f3f5] border-l border-[#e5e6eb] shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10 transition-colors">
        <div className="flex justify-end items-center gap-2.5 flex-nowrap shrink-0">
          <button className="text-sm font-normal text-[#165DFF] hover:text-[#165DFF]/80 transition-colors shrink-0" onClick={() => handleExecute(child)}>执行</button>
          <button className="text-sm font-normal text-[#165DFF] hover:text-[#165DFF]/80 transition-colors shrink-0" onClick={() => handleEdit(child)}>编辑</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors focus:outline-none shrink-0" type="button">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              <DropdownMenuItem onClick={() => handleCopy(child)}>复制</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(child)} className="text-red-500">删除</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TestPlanPage() {
  const navigate = useNavigate();
  // 如果开关打开，显示"即将开放"占位页面
  if (SHOW_COMING_SOON) {
    return (
      <ComingSoon
        title="测试计划即将开放"
        description="测试计划管理功能正在开发中，敬请期待..."
      />
    );
  }

  const [loading, setLoading] = useState(false);
  const [planList, setPlanList] = useState<TestPlanItem[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [jumpToPage, setJumpToPage] = useState<string | number>('');
  const [projectId] = useState<string>(() => localStorage.getItem('currentProjectId') || 'default-project');
  const [showType, setShowType] = useState<TestPlanType>('ALL');
  // 视图：与老前端一致，系统视图 + 我的视图（由 getViewList 拉取）
  const [viewId, setViewId] = useState<ViewId>('');
  const [viewList, setViewList] = useState<ViewList | null>(null);
  const [filterDialogMode, setFilterDialogMode] = useState<'filter' | 'newView'>('filter');
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);
  const [pageSizeOptions] = useState([10, 20, 30, 40, 50]);
  const TABLE_COLUMN_STORAGE_KEY = 'test-plan-table-columns';
  const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
    id: true,
    name: true,
    status: true,
    createUser: true,
    passRate: true,
    executeResult: true,
    caseCount: true,
    tags: true,
    moduleId: true,
    createdAt: true,
    plannedStartEnd: false,
    actualStartEnd: false,
  };
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(TABLE_COLUMN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        return { ...DEFAULT_COLUMN_VISIBILITY, ...parsed };
      }
    } catch (_) { }
    return { ...DEFAULT_COLUMN_VISIBILITY };
  });
  const resetColumnVisibility = () => {
    setColumnVisibility({ ...DEFAULT_COLUMN_VISIBILITY });
    localStorage.removeItem(TABLE_COLUMN_STORAGE_KEY);
  };
  const setColumnVisible = (key: string, visible: boolean) => {
    const next = { ...columnVisibility, [key]: visible };
    setColumnVisibility(next);
    localStorage.setItem(TABLE_COLUMN_STORAGE_KEY, JSON.stringify(next));
  };

  // 模块树相关状态
  const [moduleTree, setModuleTree] = useState<ModuleTreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [moduleKeyword, setModuleKeyword] = useState('');
  const [isExpandAll, setIsExpandAll] = useState(false);
  const [unplannedCount, setUnplannedCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 列表列筛选：状态、执行结果（点击表头筛选图标）
  const [statusFilter, setStatusFilter] = useState<PlanStatusType[]>([]);
  const [executeResultFilter, setExecuteResultFilter] = useState<boolean[]>([]);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<PlanStatusType[]>([]);
  const [executeResultPopoverOpen, setExecuteResultPopoverOpen] = useState(false);
  const [executeResultPending, setExecuteResultPending] = useState<boolean[]>([]);

  // 创建/编辑抽屉状态
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | undefined>(undefined);

  // 批量操作对话框状态
  const [batchOperationOpen, setBatchOperationOpen] = useState(false);
  const [batchOperationType, setBatchOperationType] = useState<'copy' | 'move' | 'archive' | 'execute' | 'edit'>('copy');

  // 高级筛选对话框状态
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [userList, setUserList] = useState<Array<{ id: string; name: string }>>([]);

  // 模块管理对话框状态（重命名、移动仍用 ModuleManagementDialog）
  const [moduleManagementOpen, setModuleManagementOpen] = useState(false);
  const [moduleOperationType, setModuleOperationType] = useState<'create' | 'edit' | 'move'>('create');
  const [selectedModuleForEdit, setSelectedModuleForEdit] = useState<{ id?: string; name?: string; parentId?: string }>({});

  // 添加子模块轻量弹窗（对齐用例管理 ModuleTreePanel 交互）
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [addSubParentId, setAddSubParentId] = useState('');
  const [addSubName, setAddSubName] = useState('');
  const [addSubLoading, setAddSubLoading] = useState(false);

  // 删除模块确认
  const [deleteModuleOpen, setDeleteModuleOpen] = useState(false);
  const [deleteModuleId, setDeleteModuleId] = useState('');
  const [deleteModuleName, setDeleteModuleName] = useState('');
  const [deleteModuleLoading, setDeleteModuleLoading] = useState(false);

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TestPlanItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 执行弹窗（单条计划组 / 批量执行）
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [executeDialogIds, setExecuteDialogIds] = useState<string[]>([]);

  // 新建计划组弹窗（与「新建计划」抽屉区分）；编辑计划组时传入 id
  const [planGroupDialogOpen, setPlanGroupDialogOpen] = useState(false);
  const [editingPlanGroupId, setEditingPlanGroupId] = useState<string | undefined>(undefined);

  // 拖拽排序：仅指针移动超过 8px 才触发拖拽，避免误触
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const safeList = Array.isArray(planList) ? planList : [];
    const rootPlans = safeList.filter(p => !p.groupId || !safeList.some(other => other.id === p.groupId));
    const activePlan = safeList.find(p => p.id === active.id);
    const overPlan = safeList.find(p => p.id === over.id);
    if (!activePlan || !overPlan) return;
    // 构建与表格展示一致的顺序（根计划 + 展开的子计划）
    const orderedIds = rootPlans.flatMap(p => {
      const children = safeList.filter(c => c.groupId === p.id);
      const expanded = expandedGroups.has(p.id);
      return [p.id, ...(expanded && children.length ? children.map(c => c.id) : [])];
    });
    const activeIndex = orderedIds.indexOf(String(active.id));
    const overIndex = orderedIds.indexOf(String(over.id));
    if (activeIndex === -1 || overIndex === -1) return;
    const moveMode = overIndex > activeIndex ? 'AFTER' : 'BEFORE';
    setLoading(true);
    testPlanManagementService.dragPlanOnGroup({
      projectId,
      moveId: String(active.id),
      targetId: String(over.id),
      moveMode,
    }).then(() => {
      toast.success('排序已更新');
      fetchPlanList();
    }).catch((err: any) => {
      console.error('拖拽排序失败:', err);
      toast.error(err?.message || '排序失败，请重试');
    }).finally(() => setLoading(false));
  }, [planList, projectId, expandedGroups]);

  // 获取模块树
  const fetchModuleTree = async () => {
    try {
      const result = await testPlanManagementService.getTestPlanModule({
        projectId,
      });
      setModuleTree(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('获取模块树失败:', err);
      setModuleTree([]);
    }
  };

  // 获取用户列表
  const fetchUserList = async () => {
    try {
      const result = await testPlanManagementService.getTestPlanUsers(projectId);
      setUserList(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('获取用户列表失败:', err);
      setUserList([]);
    }
  };

  // 获取指定模块及其所有子模块的 ID
  const getAllModuleIds = (moduleId: string, tree: ModuleTreeNode[]): string[] => {
    if (!Array.isArray(tree)) return moduleId === 'all' ? [] : [moduleId];
    if (moduleId === 'unplanned') return ['NONE'];
    const ids: string[] = [];
    const findAndCollect = (nodes: ModuleTreeNode[], targetId: string, collect: boolean = false) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (collect || node.id === targetId) {
          ids.push(node.id);
          if (node.children) {
            findAndCollect(node.children, targetId, true);
          }
        } else if (node.children) {
          findAndCollect(node.children, targetId, false);
        }
      }
    };
    findAndCollect(tree, moduleId);
    return ids;
  };

  // 递归过滤模块树
  const filterTree = (nodes: ModuleTreeNode[], keyword: string): ModuleTreeNode[] => {
    if (!Array.isArray(nodes)) return [];
    const result: ModuleTreeNode[] = [];
    nodes.forEach(node => {
      const isMatch = node.name.toLowerCase().includes(keyword.toLowerCase());
      const filteredChildren = node.children ? filterTree(node.children, keyword) : [];
      if (isMatch || filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : undefined
        });
      }
    });
    return result;
  };

  const filteredModuleTree = useMemo(() => {
    const safeTree = Array.isArray(moduleTree) ? moduleTree : [];
    // 过滤掉后端返回的“未规划”节点（ID为 NONE 或名称包含“未规划”），
    // 因为前端已经硬编码了一个“未规划”入口。
    const cleanTree = safeTree.filter(node =>
      node.id !== 'NONE' &&
      node.id !== 'unplanned' &&
      !(node.name && String(node.name).includes('未规划'))
    );

    if (!moduleKeyword) return cleanTree;
    return filterTree(cleanTree, moduleKeyword);
  }, [moduleTree, moduleKeyword]);

  /** 给 ModuleTreePanel 的树（去掉未规划节点，不含关键词过滤，由面板内搜索） */
  const cleanedModuleTree = useMemo(() => {
    const safeTree = Array.isArray(moduleTree) ? moduleTree : [];
    return safeTree.filter(node =>
      node.id !== 'NONE' &&
      node.id !== 'unplanned' &&
      !(node.name && String(node.name).includes('未规划'))
    );
  }, [moduleTree]);

  /** 模块 id -> 计划数量，供 ModuleTreePanel 展示 */
  const planModulesCount = useMemo(() => {
    const rec: Record<string, number> = {};
    const walk = (nodes: ModuleTreeNode[]) => {
      nodes.forEach(node => {
        if (node.id) rec[node.id] = node.count ?? 0;
        if (node.children?.length) walk(node.children);
      });
    };
    walk(cleanedModuleTree);
    return rec;
  }, [cleanedModuleTree]);

  // 按「状态」「执行结果」列筛选：仅对根计划/计划组过滤，通过则保留该根及其子计划
  const safePlanList = useMemo(() => {
    const list = Array.isArray(planList) ? planList : [];
    if (list.length === 0) return [];
    const roots = list.filter(p => !p.groupId || !list.some(other => other.id === p.groupId));
    const childrenMap = new Map<string, TestPlanItem[]>();
    list.forEach(p => {
      if (p.groupId && list.some(other => other.id === p.groupId)) {
        const arr = childrenMap.get(p.groupId) || [];
        arr.push(p);
        childrenMap.set(p.groupId, arr);
      }
    });
    const passStatus = (plan: TestPlanItem) => {
      if (statusFilter.length > 0 && !statusFilter.includes(plan.status)) return false;
      if (executeResultFilter.length > 0) {
        const pass = plan.status === 'PREPARED' ? undefined : (plan as any).pass;
        if (pass === undefined) return false; // 未开始的不参与执行结果筛选
        if (!executeResultFilter.includes(pass)) return false;
      }
      return true;
    };
    const includedRootIds = new Set(roots.filter(passStatus).map(p => p.id));
    return list.filter(p => {
      if (includedRootIds.has(p.id)) return true;
      if (p.groupId && includedRootIds.has(p.groupId)) return true;
      return false;
    });
  }, [planList, statusFilter, executeResultFilter]);

  // 拖拽排序用：当前列表中的可排序 id 列表（根 + 已展开子项），供 DndContext/SortableContext 包在 table 外层使用
  const sortableItemIds = useMemo(() => {
    if (safePlanList.length === 0) return [];
    const rootPlans = safePlanList.filter(p => !p.groupId || !safePlanList.some(other => other.id === p.groupId));
    const childrenMap = new Map<string, TestPlanItem[]>();
    safePlanList.forEach(p => {
      if (p.groupId && safePlanList.some(other => other.id === p.groupId)) {
        const list = childrenMap.get(p.groupId) || [];
        list.push(p);
        childrenMap.set(p.groupId, list);
      }
    });
    return rootPlans.flatMap((p) => {
      const sub = childrenMap.get(p.id) || (Array.isArray(p.children) && p.children.length > 0 ? p.children : []);
      const expanded = expandedGroups.has(p.id);
      return [p.id, ...(expanded && sub.length ? sub.map((c: TestPlanItem) => c.id) : [])];
    });
  }, [safePlanList, expandedGroups]);

  // 从树中获取模块全路径名称
  const getModuleName = useCallback((moduleId: string, tree: ModuleTreeNode[]): string => {
    if (moduleId === 'NONE' || !moduleId) return '未规划';

    // 递归查找路径
    const findPath = (nodes: ModuleTreeNode[], targetId: string): string[] | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return [node.name];
        }
        if (node.children) {
          const path = findPath(node.children, targetId);
          if (path) {
            return [node.name, ...path];
          }
        }
      }
      return null;
    };

    const path = findPath(tree, moduleId);
    if (path) {
      return path.length > 1 ? `/${path.join('/')}` : path[0];
    }
    return '-';
  }, []);

  // 将接口可能返回的树形列表展平为「根+子」扁平列表（与老前端一致，便于为每条请求通过率）
  const flattenPlanList = useCallback((items: any[], parentId?: string): any[] => {
    const result: any[] = [];
    for (const p of items || []) {
      if (!p?.id) continue;
      const { children, ...rest } = p;
      const node = { ...rest, groupId: p.groupId || parentId || '' };
      result.push(node);
      if (Array.isArray(children) && children.length) {
        result.push(...flattenPlanList(children, node.id));
      }
    }
    return result;
  }, []);

  // 获取质量工作台列表
  const fetchPlanList = async () => {
    setLoading(true);
    try {
      // 严格对齐 Metersphere 原版参数结构，避免 400 参数校验失败
      const params: Record<string, any> = {
        projectId,
        current: currentPage,
        pageSize,
        type: showType,
        moduleIds: selectedModuleId === 'all' ? [] : getAllModuleIds(selectedModuleId, moduleTree),
        selectIds: [],
        excludeIds: [],
        selectAll: false,
        filter: {},
        keyword: searchKeyword || undefined,
      };
      // 与老前端 planTable 一致：系统视图传 viewId（全部数据不传，已归档/我关注/我创建传对应 id）
      if (viewId) {
        params.viewId = viewId;
      }

      console.log('请求质量工作台列表参数:', params);
      const result = await qualityWorkspaceService.getWorkspaceList({
        projectId,
        current: currentPage,
        pageSize,
        keyword: searchKeyword || undefined,
        archived: viewId === 'archived',
      });

      // 适配新的返回格式
      const rawList = result?.list || result?.data || [];
      const totalCount = result?.total || (Array.isArray(rawList) ? rawList.length : 0);
      
      // 映射新字段到旧组件期望的字段名（如 workspaceId -> id）
      const list = rawList.map((item: any) => ({
        ...item,
        id: item.workspaceId,
        num: item.workspaceId?.slice(0, 8), // 临时用 ID 截断作为编号
        type: 'TEST_PLAN', // 统一为计划类型，暂时隐藏计划组概念
      }));

      setPlanList(list);
      setTotal(totalCount);

      // 同步更新左侧模块树的计数 (适配后台统计逻辑)
      try {
        const counts: any = await testPlanManagementService.getPlanModulesCount(params);
        if (counts) {
          let unplanned = 0;
          if (counts.unplannedCount !== undefined) unplanned = counts.unplannedCount;
          else if (counts.unplanned !== undefined) unplanned = counts.unplanned;
          else if (counts['NONE'] !== undefined) unplanned = counts['NONE'];
          setUnplannedCount(unplanned);

          const countMap = counts.moduleCountMap || counts;
          if (typeof countMap === 'object' && countMap !== null && !Array.isArray(countMap)) {
            const updateNodeCount = (nodes: ModuleTreeNode[]): ModuleTreeNode[] => {
              if (!Array.isArray(nodes)) return [];
              return nodes.map(node => ({
                ...node,
                count: countMap[node.id] || 0,
                children: node.children ? updateNodeCount(node.children) : undefined
              }));
            };
            setModuleTree(prev => (Array.isArray(prev) ? updateNodeCount(prev) : []));
          }
        }
      } catch (countErr) {
        console.warn('同步模块计数失败:', countErr);
      }

      // 获取统计信息（通过率、执行结果等）：必须传「当前页所有计划 id」（含子计划），与老前端 getStatistics(selectedPlanIds) 一致
      // 暂时禁用旧的统计信息获取，后续会通过 qualityWorkspaceService.getWorkspaceStats 或直接在列表返回中包含统计数据
      /*
      if (list.length > 0) {
        try {
          const planIds = list.map((p: any) => p.id).filter(Boolean);
          const stats = await testPlanManagementService.getPlanPassRate(planIds);
          if (stats && Array.isArray(stats)) {
            const statsMap = new Map(stats.map((s: any) => [s.id, s]));
            setPlanList(prev => prev.map(p => {
              const stat = statsMap.get(p.id);
              if (stat) {
                return { ...p, ...stat };
              }
              return p;
            }));
          }
        } catch (statsErr) {
          console.error('获取统计信息失败:', statsErr);
        }
      }
      */
    } catch (err: any) {
      console.error('获取质量工作台列表失败:', err);
      setPlanList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchViewList = useCallback(async () => {
    try {
      const res = await getViewList(projectId);
      setViewList(res ?? { internalViews: [], customViews: [] });
    } catch (e) {
      console.warn('获取视图列表失败:', e);
      setViewList({ internalViews: [], customViews: [] });
    }
  }, [projectId]);

  useEffect(() => {
    fetchModuleTree();
    fetchUserList();
    fetchViewList();
  }, [fetchViewList]);

  useEffect(() => {
    fetchPlanList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchKeyword, selectedModuleId, showType, viewId]);

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1);
    fetchPlanList();
  };

  // 处理模块树展开/折叠
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // 全部展开/折叠
  const handleExpandAll = () => {
    if (isExpandAll) {
      setExpandedNodes(new Set());
    } else {
      const allIds = new Set<string>();
      const collectIds = (nodes: ModuleTreeNode[]) => {
        nodes.forEach(node => {
          allIds.add(node.id);
          if (node.children) {
            collectIds(node.children);
          }
        });
      };
      collectIds(moduleTree);
      setExpandedNodes(allIds);
    }
    setIsExpandAll(!isExpandAll);
  };

  // 选择模块
  const handleSelectModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setCurrentPage(1);
  };

  // 递归渲染模块树节点（对齐用例管理：支持更多菜单 添加子模块/重命名/移动/删除）
  const renderTreeNode = (node: ModuleTreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedModuleId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="mb-0.5" style={{ paddingLeft: `${level * 12}px` }}>
        <div
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            handleSelectModule(node.id);
          }}
          className={`group flex items-center justify-between px-3 py-1.5 mr-2 rounded-r-full cursor-pointer transition-colors ${isSelected
            ? 'bg-blue-50 text-[#165DFF] font-medium'
            : 'text-gray-600 hover:bg-gray-50 hover:text-[#165DFF]'
            }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
              )
            ) : (
              <div className="w-3.5 flex-shrink-0" />
            )}
            <span className="truncate text-sm">{node.name}</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {node.count !== undefined && (
              <span className={`text-xs font-normal ${isSelected ? 'text-[#165DFF]' : 'text-gray-400 opacity-60'}`}>
                {node.count}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddSubParentId(node.id);
                    setAddSubName('');
                    setAddSubOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-2" /> 添加子模块
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setModuleOperationType('edit');
                    setSelectedModuleForEdit({ id: node.id, name: node.name, parentId: (node as any).parentId });
                    setModuleManagementOpen(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" /> 重命名
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setModuleOperationType('move');
                    setSelectedModuleForEdit({ id: node.id, name: node.name, parentId: (node as any).parentId });
                    setModuleManagementOpen(true);
                  }}
                >
                  <Move className="w-3.5 h-3.5 mr-2" /> 移动模块
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModuleId(node.id);
                    setDeleteModuleName(node.name ?? '');
                    setDeleteModuleOpen(true);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {hasChildren && isExpanded && Array.isArray(node.children) && (
          <div className="mt-0.5">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 处理选择
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlans(safePlanList.map(plan => plan.id));
    } else {
      setSelectedPlans([]);
    }
  };

  const handleSelectPlan = (planId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlans([...selectedPlans, planId]);
    } else {
      setSelectedPlans(selectedPlans.filter(id => id !== planId));
    }
  };

  // 处理操作
  const handleCreate = () => {
    setEditingPlanId(undefined);
    setCreateSheetOpen(true);
  };

  const handleCreateGroup = () => {
    setEditingPlanGroupId(undefined);
    setPlanGroupDialogOpen(true);
  };

  const handleEdit = (plan: TestPlanItem) => {
    if (plan.type === testPlanTypeEnum.GROUP) {
      setEditingPlanGroupId(plan.id);
      setPlanGroupDialogOpen(true);
      return;
    }
    setEditingPlanId(plan.id);
    setCreateSheetOpen(true);
  };

  const handleCopy = async (plan: TestPlanItem) => {
    const toastId = toast.loading('正在复制测试计划...');
    try {
      // 与 aegis-next-server 一致：优先使用 GET /quality-workspace/copy/{id}
      try {
        await testPlanManagementService.testPlanAndGroupCopy(plan.id);
      } catch (getErr: any) {
        // 若单条复制接口不可用（如后端 NoClassDefFoundError），降级为批量复制接口
        const targetId = plan.moduleId || 'root';
        await testPlanManagementService.batchCopyPlan({
          selectIds: [plan.id],
          projectId: projectId || '',
          targetId,
          moduleId: targetId,
          moduleIds: [targetId],
          moveType: plan.type === testPlanTypeEnum.GROUP ? 'GROUP' : 'MODULE',
        });
      }
      toast.success('复制成功', { id: toastId });
      fetchPlanList();
    } catch (err: any) {
      console.error('复制失败:', err);
      toast.error(err?.message || '复制失败，请点击确认后端环境', { id: toastId });
    }
  };

  const handleDelete = (plan: TestPlanItem) => {
    setDeleteTarget(plan);
    setDeleteDialogOpen(true);
  };

  const deleteTip = useMemo(() => {
    if (!deleteTarget) return '';
    const planTypeLabel = deleteTarget.type === testPlanTypeEnum.GROUP ? '计划组' : '测试计划';
    let statusTip = '删除后不可恢复';
    switch (deleteTarget.status) {
      case 'ARCHIVED':
        statusTip = '已归档，删除后不可恢复';
        break;
      case 'UNDERWAY':
        statusTip = '正在执行，删除后不可恢复';
        break;
      case 'COMPLETED':
        statusTip = '已完成，删除后不可恢复';
        break;
      default:
        statusTip = '删除后不可恢复';
    }
    return `${planTypeLabel}「${deleteTarget.name}」${statusTip}，请谨慎操作。`;
  }, [deleteTarget]);

  const showArchiveButton = useMemo(() => {
    return deleteTarget?.status === 'COMPLETED' && deleteTarget?.groupId === 'NONE';
  }, [deleteTarget]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await testPlanManagementService.deletePlan(deleteTarget.id);
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      fetchPlanList();
    } catch (err) {
      console.error('删除失败:', err);
      toast.error('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await testPlanManagementService.archivedPlan(deleteTarget.id);
      toast.success('归档成功');
      setDeleteDialogOpen(false);
      fetchPlanList();
    } catch (err) {
      console.error('归档失败:', err);
      toast.error('归档失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExecute = (plan: TestPlanItem) => {
    if (plan.type === testPlanTypeEnum.GROUP) {
      setExecuteDialogIds([plan.id]);
      setExecuteDialogOpen(true);
      return;
    }
    if (plan.type === testPlanTypeEnum.TEST_PLAN) {
      const apiScenarioCount = (plan as any).apiScenarioCount;
      const apiCaseCount = (plan as any).apiCaseCount;
      const onlyFeatureCase = apiScenarioCount === 0 && apiCaseCount === 0;
      if (onlyFeatureCase) {
        navigate(`/quality-workspace/${plan.id}?type=featureCase`);
        return;
      }
      const toastId = toast.loading(`正在下发执行任务: ${plan.name}...`);
      testPlanManagementService.executeSinglePlan({
        executeId: plan.id,
        projectId: plan.projectId ?? projectId,
        runMode: 'SERIAL',
        executionSource: 'MANUAL'
      }).then(() => {
        toast.success('执行任务已下发', { id: toastId });
        fetchPlanList();
      }).catch((err) => {
        console.error('执行失败:', err);
        toast.error('执行失败', { id: toastId });
      });
    }
  };

  const handleArchive = async (plan: TestPlanItem) => {
    try {
      await testPlanManagementService.archivedPlan(plan.id);
      fetchPlanList();
    } catch (err) {
      console.error('归档失败:', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedPlans.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedPlans.length} 个测试计划吗？`)) return;

    try {
      await testPlanManagementService.batchDeletePlan({
        selectIds: selectedPlans,
        projectId,
      });
      setSelectedPlans([]);
      fetchPlanList();
    } catch (err) {
      console.error('批量删除失败:', err);
    }
  };

  // 批量操作（执行走执行弹窗，与老前端一致；其余走 BatchOperationDialog）
  const handleBatchOperation = (type: 'copy' | 'move' | 'archive' | 'execute' | 'edit') => {
    if (selectedPlans.length === 0) {
      toast.error('请先选择测试计划');
      return;
    }
    if (type === 'execute') {
      setExecuteDialogIds(selectedPlans);
      setExecuteDialogOpen(true);
      return;
    }
    setBatchOperationType(type);
    setBatchOperationOpen(true);
  };

  // 高级筛选（与「新建视图」区分：此处为筛选模式）
  const handleAdvancedFilter = () => {
    setFilterDialogMode('filter');
    setAdvancedFilterOpen(true);
  };

  const handleApplyFilter = (filters: FilterValues) => {
    setFilterValues(filters);
    setCurrentPage(1);
    // 这里可以根据筛选条件重新获取列表
    // fetchPlanList() 会自动使用 filterValues
  };

  // 添加子模块（轻量弹窗，对齐用例管理）
  const handleAddSubModule = async () => {
    const name = addSubName.trim();
    if (!name) {
      toast.error('请输入分组名称');
      return;
    }
    setAddSubLoading(true);
    try {
      await testPlanManagementService.addTestPlanModule({
        projectId,
        name,
        parentId: addSubParentId === 'NONE' || !addSubParentId ? undefined : addSubParentId,
      });
      toast.success('添加成功');
      setAddSubOpen(false);
      setAddSubName('');
      setAddSubParentId('');
      fetchModuleTree();
      fetchPlanList();
    } catch (err: any) {
      toast.error(err?.message || '添加失败');
    } finally {
      setAddSubLoading(false);
    }
  };

  const handleDeleteModuleConfirm = async () => {
    if (!deleteModuleId) return;
    setDeleteModuleLoading(true);
    try {
      await testPlanManagementService.deletePlanModuleTree(deleteModuleId);
      toast.success('删除成功');
      setDeleteModuleOpen(false);
      setDeleteModuleId('');
      setDeleteModuleName('');
      fetchModuleTree();
      fetchPlanList();
    } catch (err: any) {
      toast.error(err?.message || '删除失败');
    } finally {
      setDeleteModuleLoading(false);
    }
  };

  // 模块管理（重命名、移动用弹窗）
  const handleCreateModule = () => {
    setAddSubParentId('NONE');
    setAddSubName('');
    setAddSubOpen(true);
  };

  const handleEditModule = (module: any) => {
    setModuleOperationType('edit');
    setSelectedModuleForEdit({
      id: module.id,
      name: module.name,
      parentId: module.parentId
    });
    setModuleManagementOpen(true);
  };

  const handleMoveModule = (module: any) => {
    setModuleOperationType('move');
    setSelectedModuleForEdit({
      id: module.id,
      name: module.name,
      parentId: module.parentId
    });
    setModuleManagementOpen(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('确定要删除该模块吗？删除后模块下的测试计划将移至未规划。')) return;

    try {
      await testPlanManagementService.deletePlanModuleTree(moduleId);
      toast.success('删除成功');
      fetchModuleTree();
      fetchPlanList();
    } catch (err) {
      console.error('删除模块失败:', err);
      toast.error('删除失败');
    }
  };

  /** 测试计划左侧模块树：与用例管理同一套移动逻辑与交互（拖拽前/内/后、「作为子级」高亮） */
  const handlePlanAddSubModule = useCallback(
    async (parentId: string, name: string) => {
      const parentIdForApi = parentId === 'NONE' || parentId === '' ? 'NONE' : parentId;
      await testPlanManagementService.addTestPlanModule({ projectId, name, parentId: parentIdForApi });
      toast.success('创建成功');
      fetchModuleTree();
      fetchPlanList();
    },
    [projectId]
  );
  const handlePlanRenameModule = useCallback(
    async (nodeId: string, name: string) => {
      await testPlanManagementService.updateTestPlanModule({ id: nodeId, name });
      toast.success('重命名成功');
      fetchModuleTree();
      fetchPlanList();
    },
    []
  );
  const handlePlanDeleteModule = useCallback(
    async (nodeId: string) => {
      await testPlanManagementService.deletePlanModuleTree(nodeId);
      toast.success('删除成功');
      if (selectedModuleId === nodeId) setSelectedModuleId('all');
      fetchModuleTree();
      fetchPlanList();
    },
    [selectedModuleId]
  );
  const handlePlanMoveModule = useCallback(
    async (dragNodeId: string, dropNodeId: string, dropPosition: number) => {
      await testPlanManagementService.moveTestPlanModule({ dragNodeId, dropNodeId, dropPosition });
      toast.success('移动成功');
      fetchModuleTree();
      fetchPlanList();
    },
    []
  );

  // 移除旧的颜色映射函数，使用新组件处理

  // 计算总页数
  const totalPages = Math.ceil(total / pageSize);
  const canGoToPrev = currentPage > 1;
  const canGoToNext = currentPage < totalPages;
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };
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
  const isAllSelected = safePlanList.length > 0 && selectedPlans.length === safePlanList.length;

  // 计算所有模块总数
  const allModuleCount = moduleTree.reduce((sum, node) => sum + (node.count || 0), 0) + unplannedCount;

  return (
    <div className="flex-1 flex flex-col bg-[#f5f7fa] min-h-0 overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* 左侧：机构树 - 与右侧一致用 flex 占满高度，数据少时也铺满 */}
        <ResizablePanel defaultSize={18} minSize={15} maxSize={30} className="flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200 shadow-sm overflow-hidden">
            <ModuleTreePanel
              moduleTree={cleanedModuleTree}
              modulesCount={planModulesCount}
              expandedNodes={expandedNodes}
              selectedModuleId={selectedModuleId === 'unplanned' ? '__unplanned__' : selectedModuleId}
              moduleSearchKeyword={moduleKeyword}
              onModuleSearchChange={setModuleKeyword}
              allModuleCount={allModuleCount}
              onModuleSelect={(id) => {
                setSelectedModuleId(id === 'all' ? 'all' : id);
                setCurrentPage(1);
              }}
              onToggleExpand={toggleNode}
              isExpandAll={isExpandAll}
              onExpandAll={handleExpandAll}
              onCollapseAll={() => {
                setExpandedNodes(new Set());
                setIsExpandAll(false);
              }}
              onAddSubModule={handlePlanAddSubModule}
              onRenameModule={handlePlanRenameModule}
              onDeleteModule={handlePlanDeleteModule}
              onMoveModule={handlePlanMoveModule}
              allLabel="全部测试计划"
              headerRight={
                <div className="flex">
                  <Button
                    size="sm"
                    className="rounded-r-none h-8 px-3 bg-[#165DFF] hover:bg-[#165DFF]/90 text-white border-0 text-sm"
                    onClick={handleCreate}
                  >
                    新建
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        className="rounded-l-none h-8 px-1.5 bg-[#165DFF] hover:bg-[#165DFF]/90 text-white border-l border-white/20 p-0"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCreate} className="text-sm">新建计划</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCreateGroup} className="text-sm">新建计划组</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              }
              extraRowsBeforeTree={
                <div
                  className={`flex items-center justify-between group px-4 py-1.5 rounded-r-full mr-2 cursor-pointer transition-colors mt-1 ${selectedModuleId === 'unplanned'
                    ? 'bg-blue-50 text-[#165DFF] font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#165DFF]'}`}
                  onClick={() => {
                    setSelectedModuleId('unplanned');
                    setCurrentPage(1);
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Inbox className={`w-4 h-4 ${selectedModuleId === 'unplanned' ? 'text-[#165DFF]' : 'text-gray-400'}`} />
                    <span className="text-sm">未规划计划</span>
                  </div>
                  <span className={`text-xs font-normal ${selectedModuleId === 'unplanned' ? 'text-[#165DFF]' : 'text-gray-400 opacity-60'}`}>
                    {unplannedCount}
                  </span>
                </div>
              }
            />
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-[1px] bg-gray-200" />

        {/* 右侧：测试计划列表（与功能用例 FeatureCaseList 一致的展示逻辑） */}
        <ResizablePanel defaultSize={82} minSize={70} className="flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* 顶部工具栏 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Tabs
                    value={showType}
                    onValueChange={(val) => {
                      setShowType(val as TestPlanType);
                      setCurrentPage(1);
                    }}
                    className="bg-gray-100 p-0.5 rounded-md"
                  >
                    <TabsList className="bg-transparent h-8 p-0 gap-0">
                      <TabsTrigger value="ALL" className="h-8 text-sm px-4 rounded data-[state=active]:bg-white data-[state=active]:text-[#165DFF] data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600">全部</TabsTrigger>
                      <TabsTrigger value="TEST_PLAN" className="h-8 text-sm px-4 rounded data-[state=active]:bg-white data-[state=active]:text-[#165DFF] data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600">计划</TabsTrigger>
                      <TabsTrigger value="GROUP" className="h-8 text-sm px-4 rounded data-[state=active]:bg-white data-[state=active]:text-[#165DFF] data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600">计划组</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* 批量操作按钮 */}
                  {selectedPlans.length > 0 && (
                    <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                      <span className="text-sm text-gray-500">已选 {selectedPlans.length} 项</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-sm gap-1"
                        onClick={() => handleBatchOperation('execute')}
                      >
                        <Play className="w-3.5 h-3.5" />
                        批量执行
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-sm gap-1"
                        onClick={() => handleBatchOperation('copy')}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        批量复制
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-sm gap-1"
                        onClick={() => handleBatchOperation('move')}
                      >
                        <Move className="w-3.5 h-3.5" />
                        批量移动
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-sm">
                            更多
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => handleBatchOperation('archive')}>
                            <Archive className="w-3.5 h-3.5 mr-2" />
                            批量归档
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleBatchDelete} className="text-red-600">
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            批量删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="通过 ID/名称/标签预览搜索"
                      className="pl-8 h-8 text-sm border-gray-200 focus-visible:ring-1 focus-visible:ring-blue-400"
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-8 text-sm w-[145px] bg-white border-gray-200 justify-between gap-1 px-2">
                        <span className="text-gray-400 flex-shrink-0">视图</span>
                        <span className="text-gray-800 truncate flex-1 text-left">{getViewLabel(viewId, viewList)}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[145px] max-h-[300px] p-0 overflow-y-auto">
                      <div className="flex items-center px-2 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">
                        <span>系统视图</span>
                      </div>
                      {(viewList?.internalViews?.length ? viewList.internalViews : [
                        { id: '', name: '全部数据' },
                        { id: 'archived', name: '已归档' },
                        { id: 'my_follow', name: '我关注的' },
                        { id: 'my_create', name: '我创建的' },
                      ] as ViewItem[]).map((item) => (
                        <DropdownMenuItem
                          key={item.id || 'all'}
                          onClick={() => {
                            setViewId(item.id || '');
                            setCurrentPage(1);
                          }}
                          className={`flex items-center justify-between py-1.5 px-2 rounded mx-1 my-0.5 cursor-pointer ${viewId === (item.id || '') ? 'bg-blue-50 text-[#165DFF]' : 'hover:bg-blue-50'}`}
                        >
                          {item.name}
                          {viewId === (item.id || '') && <span className="text-[#165DFF]">✓</span>}
                        </DropdownMenuItem>
                      ))}
                      <div className="flex items-center px-2 py-1.5 text-xs font-medium text-gray-500 border-t border-gray-100 mt-1">
                        <span>我的视图</span>
                      </div>
                      {(viewList?.customViews ?? []).map((item) => (
                        <DropdownMenuItem
                          key={item.id}
                          onClick={() => {
                            setViewId(item.id);
                            setCurrentPage(1);
                          }}
                          className={`flex items-center justify-between py-1.5 px-2 rounded mx-1 my-0.5 cursor-pointer ${viewId === item.id ? 'bg-blue-50 text-[#165DFF]' : 'hover:bg-blue-50'}`}
                        >
                          {item.name}
                          {viewId === item.id && <span className="text-[#165DFF]">✓</span>}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        className="py-1.5 px-2 text-[#165DFF] hover:bg-blue-50 rounded mx-1 cursor-pointer"
                        onSelect={(e) => {
                          e.preventDefault();
                          setFilterDialogMode('newView');
                          setAdvancedFilterOpen(true);
                        }}
                      >
                        + 新建视图
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-sm text-gray-600 border-gray-200"
                    onClick={handleAdvancedFilter}
                  >
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    筛选
                    {Object.keys(filterValues).some(key => {
                      const value = filterValues[key as keyof FilterValues];
                      return Array.isArray(value) ? value.length > 0 : value !== undefined;
                    }) && (
                        <Badge className="ml-1 h-4 px-1 bg-blue-500 text-white text-xs">
                          {Object.keys(filterValues).filter(key => {
                            const value = filterValues[key as keyof FilterValues];
                            return Array.isArray(value) ? value.length > 0 : value !== undefined;
                          }).length}
                        </Badge>
                      )}
                  </Button>

                  <Button variant="outline" size="icon" className="h-8 w-8 text-gray-400 border-gray-200" onClick={fetchPlanList} disabled={loading}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* 表格区域：与功能用例 CaseTableSection 一致，flex-1 占满剩余高度，内部可滚动 */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-auto bg-white flex flex-col">
                  {/* 数据少时用 min-h-full 撑满滚动区，避免下方大片空白；数据多时正常滚动；DndContext 包在 table 外避免 tbody 内出现 div */}
                  <div className="min-h-full flex flex-col">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
                        <Table className="text-sm">
                          <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                            <TableRow className="hover:bg-transparent border-none h-11">
                              <TableHead className="w-[44px] px-3">{/* 拖拽占位 */}</TableHead>
                              <TableHead className="w-[140px] px-4 text-sm font-semibold text-gray-500 uppercase">ID</TableHead>
                              <TableHead className="w-[220px] max-w-[220px] px-4 text-sm font-semibold text-gray-500 uppercase">
                                <div className="flex items-center gap-1">
                                  测试计划名称
                                  <ArrowUpDown className="w-3 h-3 text-gray-300" />
                                </div>
                              </TableHead>
                              <TableHead className="w-[110px] px-4 text-sm font-semibold text-gray-500 uppercase text-center">
                                <Popover open={statusPopoverOpen} onOpenChange={(open) => { setStatusPopoverOpen(open); if (open) setStatusPending([...statusFilter]); }}>
                                  <PopoverTrigger asChild>
                                    <button type="button" className="flex items-center justify-center gap-1 w-full py-1 rounded hover:bg-gray-100 transition-colors">
                                      状态
                                      <Filter className="w-3 h-3 text-gray-300" />
                                      {statusFilter.length > 0 && (
                                        <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                      )}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="center" className="w-48 p-3">
                                    <div className="space-y-2">
                                      {planStatusOptions.map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                                          <Checkbox
                                            checked={statusPending.length === 0 || statusPending.includes(opt.value)}
                                            onCheckedChange={(checked) => {
                                              setStatusPending(prev => {
                                                if (checked) {
                                                  const next = prev.length === 0 ? [opt.value] : [...prev, opt.value];
                                                  return next.length >= planStatusOptions.length ? [] : next;
                                                }
                                                return prev.length === 0 ? planStatusOptions.map(o => o.value).filter(v => v !== opt.value) : prev.filter(s => s !== opt.value);
                                              });
                                            }}
                                          />
                                          <span className={planStatusMap[opt.value]?.textColor ?? ''}>{opt.label}</span>
                                        </label>
                                      ))}
                                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-gray-600" onClick={() => setStatusPending([])}>重置</Button>
                                        <Button size="sm" className="flex-1 h-8 bg-[#165DFF] hover:bg-[#165DFF]/90" onClick={() => { setStatusFilter(statusPending); setStatusPopoverOpen(false); }}>确认</Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </TableHead>
                              <TableHead className="w-[140px] px-4 text-sm font-semibold text-gray-500 uppercase">创建人</TableHead>
                              <TableHead className="w-[200px] px-4 text-sm font-semibold text-gray-500 uppercase">
                                <div className="flex items-center gap-1.5">
                                  通过率
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex cursor-help">
                                          <HelpCircle className="w-3.5 h-3.5 text-gray-300" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[260px]">
                                        <p className="font-medium text-white mb-1">通过率</p>
                                        <p className="text-gray-200 text-xs">已通过用例数 / 全部用例数 × 100%</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableHead>
                              <TableHead className="w-[130px] px-4 text-sm font-semibold text-gray-500 uppercase">
                                <Popover open={executeResultPopoverOpen} onOpenChange={(open) => { setExecuteResultPopoverOpen(open); if (open) setExecuteResultPending([...executeResultFilter]); }}>
                                  <PopoverTrigger asChild>
                                    <button type="button" className="flex items-center gap-1 w-full py-1 rounded hover:bg-gray-100 transition-colors">
                                      执行结果
                                      <Filter className="w-3 h-3 text-gray-300" />
                                      {executeResultFilter.length > 0 && (
                                        <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                      )}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="center" className="w-44 p-3">
                                    <div className="space-y-2">
                                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <Checkbox
                                          checked={executeResultPending.length === 0 || executeResultPending.includes(true)}
                                          onCheckedChange={(checked) => {
                                            setExecuteResultPending(prev => {
                                              if (checked) {
                                                const next = prev.length === 0 ? [true] : [...prev, true];
                                                return next.length >= 2 ? [] : next;
                                              }
                                              return prev.length === 0 ? [false] : prev.filter(x => !x);
                                            });
                                          }}
                                        />
                                        <span className="text-green-600">通过</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <Checkbox
                                          checked={executeResultPending.length === 0 || executeResultPending.includes(false)}
                                          onCheckedChange={(checked) => {
                                            setExecuteResultPending(prev => {
                                              if (checked) {
                                                const next = prev.length === 0 ? [false] : [...prev, false];
                                                return next.length >= 2 ? [] : next;
                                              }
                                              return prev.length === 0 ? [true] : prev.filter(x => x);
                                            });
                                          }}
                                        />
                                        <span className="text-red-600">不通过</span>
                                      </label>
                                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-gray-600" onClick={() => setExecuteResultPending([])}>重置</Button>
                                        <Button size="sm" className="flex-1 h-8 bg-[#165DFF] hover:bg-[#165DFF]/90" onClick={() => { setExecuteResultFilter(executeResultPending); setExecuteResultPopoverOpen(false); }}>确认</Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </TableHead>
                              <TableHead className="w-[90px] px-4 text-sm font-semibold text-gray-500 uppercase text-center">用例数</TableHead>
                              <TableHead className="w-[180px] px-4 text-sm font-semibold text-gray-500 uppercase">标签</TableHead>
                              <TableHead className="w-[140px] px-4 text-sm font-semibold text-gray-500 uppercase">所属模块</TableHead>
                              <TableHead className="w-[160px] px-4 text-sm font-semibold text-gray-500 uppercase">
                                <div className="flex items-center gap-1">
                                  创建时间
                                  <ArrowUpDown className="w-3 h-3 text-gray-300" />
                                </div>
                              </TableHead>
                              <TableHead className="w-[150px] px-4 text-sm font-semibold text-gray-500 uppercase text-right pr-5 sticky right-0 bg-[#f7f8fa] border-l border-[#e5e6eb] shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10">
                                <div className="flex items-center justify-end gap-1">
                                  操作
                                  <button type="button" onClick={() => setTableSettingsOpen(true)} className="p-0.5 rounded hover:bg-gray-100" aria-label="表格设置">
                                    <Settings className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-gray-600" />
                                  </button>
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              <TableRow>
                                <TableCell colSpan={12} className="text-center py-16">
                                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-400 mb-2" />
                                  <p className="text-sm text-gray-400">正在努力加载数据...</p>
                                </TableCell>
                              </TableRow>
                            ) : safePlanList.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={12} className="text-center py-24">
                                  <div className="flex flex-col items-center">
                                    <ClipboardList className="w-16 h-16 text-gray-100 mb-4" />
                                    <p className="text-gray-400 text-sm">暂无测试计划记录</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              (() => {
                                // 1. 识别当前在列表中的所有根计划/计划组
                                const rootPlans = safePlanList.filter(p => !p.groupId || !safePlanList.some(other => other.id === p.groupId));

                                // 2. 将非根项（子计划）按 groupId 分类
                                const childrenMap = new Map<string, TestPlanItem[]>();
                                safePlanList.forEach(p => {
                                  if (p.groupId && safePlanList.some(other => other.id === p.groupId)) {
                                    const list = childrenMap.get(p.groupId) || [];
                                    list.push(p);
                                    childrenMap.set(p.groupId, list);
                                  }
                                });

                                return rootPlans.flatMap((plan) => {
                                  const isExpanded = expandedGroups.has(plan.id);
                                  const subPlansFromMap = childrenMap.get(plan.id) || [];
                                  const subPlans = (Array.isArray(plan.children) && plan.children.length > 0) ? plan.children : (Array.isArray(subPlansFromMap) ? subPlansFromMap : []);
                                  const hasChildren = subPlans.length > 0;

                                  const rows = [
                                    <SortablePlanRow
                                      key={plan.id}
                                      plan={plan}
                                      isExpanded={isExpanded}
                                      expandedGroups={expandedGroups}
                                      setExpandedGroups={setExpandedGroups}
                                      selectedPlans={selectedPlans}
                                      handleSelectPlan={handleSelectPlan}
                                      navigate={navigate}
                                      moduleTree={moduleTree}
                                      getModuleName={getModuleName}
                                      handleExecute={handleExecute}
                                      handleEdit={handleEdit}
                                      handleCopy={handleCopy}
                                      handleArchive={handleArchive}
                                      handleDelete={handleDelete}
                                    />,
                                  ];

                                  if (isExpanded && hasChildren) {
                                    subPlans.forEach((child) => {
                                      rows.push(
                                        <SortableSubPlanRow
                                          key={child.id}
                                          child={child}
                                          navigate={navigate}
                                          moduleTree={moduleTree}
                                          getModuleName={getModuleName}
                                          handleExecute={handleExecute}
                                          handleEdit={handleEdit}
                                          handleCopy={handleCopy}
                                          handleDelete={handleDelete}
                                        />
                                      );
                                    });
                                  }

                                  return rows;
                                });
                              })()

                            )}
                          </TableBody>
                        </Table>
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              </div>

              {/* 分页 - 与报告中心自动化测试报告一致 */}
              {total > 0 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-[#f9fafb]/50 flex-shrink-0">
                  <div className="flex items-center text-sm text-gray-500">
                    共 <span className="font-medium text-gray-900 mx-1">{total}</span> 条计划
                    <div className="w-px h-4 bg-gray-200 mx-4" />
                    每页显示
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="inline-flex h-9 w-20 mx-2 border-gray-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pageSizeOptions.map((n) => (
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
                                <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
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
                                    "h-9 w-9 cursor-pointer transition-all",
                                    currentPage === i
                                      ? "bg-[#165DFF] text-white hover:bg-[#165DFF]/90 border-[#165DFF]"
                                      : "hover:bg-white border-gray-200"
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
                                <PaginationLink onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink>
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
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <CreateTestPlanSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        planId={editingPlanId}
        projectId={projectId}
        onSuccess={fetchPlanList}
        moduleTree={moduleTree}
        initialModuleId={!editingPlanId && selectedModuleId && selectedModuleId !== "all" && selectedModuleId !== "unplanned" ? selectedModuleId : undefined}
        onCreatedPlanId={(id) => navigate(`/quality-workspace/${id}`)}
      />

      <CreatePlanGroupDialog
        open={planGroupDialogOpen}
        onOpenChange={(open) => {
          setPlanGroupDialogOpen(open);
          if (!open) setEditingPlanGroupId(undefined);
        }}
        projectId={projectId}
        moduleTree={moduleTree}
        moduleId={selectedModuleId === 'all' ? undefined : selectedModuleId}
        planGroupId={editingPlanGroupId}
        onSuccess={() => fetchPlanList()}
      />

      <ExecutePlanDialog
        open={executeDialogOpen}
        onOpenChange={setExecuteDialogOpen}
        executeIds={executeDialogIds}
        projectId={projectId}
        onSuccess={() => {
          fetchPlanList();
          setSelectedPlans([]);
        }}
      />

      <BatchOperationDialog
        open={batchOperationOpen}
        onOpenChange={setBatchOperationOpen}
        operationType={batchOperationType}
        selectedPlanIds={selectedPlans}
        projectId={projectId}
        moduleTree={moduleTree}
        onSuccess={() => {
          fetchPlanList();
          setSelectedPlans([]);
        }}
      />

      <AdvancedFilterDialog
        open={advancedFilterOpen}
        onOpenChange={(open) => {
          setAdvancedFilterOpen(open);
          if (!open) setFilterDialogMode('filter');
        }}
        onApply={handleApplyFilter}
        initialFilters={filterValues}
        userList={userList}
        viewName={filterDialogMode === 'newView' ? '新建视图' : getViewLabel(viewId, viewList)}
        mode={filterDialogMode}
        onSaveNewView={async (payload) => {
          const conditions: ViewParams['conditions'] = [];
          if (payload.status?.length) {
            conditions.push({ name: 'status', operator: 'in', value: payload.status, customField: false, customFieldType: '' });
          }
          if (payload.executeResult?.length) {
            conditions.push({ name: 'executeResult', operator: 'in', value: payload.executeResult, customField: false, customFieldType: '' });
          }
          if (payload.createUser?.length) {
            conditions.push({ name: 'createUser', operator: 'in', value: payload.createUser, customField: false, customFieldType: '' });
          }
          if (payload.startDate) {
            conditions.push({ name: 'startDate', operator: 'gte', value: payload.startDate instanceof Date ? payload.startDate.getTime() : payload.startDate, customField: false, customFieldType: '' });
          }
          if (payload.endDate) {
            conditions.push({ name: 'endDate', operator: 'lte', value: payload.endDate instanceof Date ? payload.endDate.getTime() : payload.endDate, customField: false, customFieldType: '' });
          }
          await addView({
            name: payload.viewName,
            scopeId: projectId,
            searchMode: 'AND',
            conditions,
          });
          toast.success('保存成功');
          setAdvancedFilterOpen(false);
          setFilterDialogMode('filter');
          await fetchViewList();
          setFilterValues({ status: payload.status, executeResult: payload.executeResult, createUser: payload.createUser, startDate: payload.startDate, endDate: payload.endDate });
        }}
      />

      <Dialog open={tableSettingsOpen} onOpenChange={setTableSettingsOpen}>
        <DialogContent className="sm:max-w-[480px] px-4 pt-6 pb-6" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>表格设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">每页显示数量</div>
              <div className="flex h-8 w-full max-w-[289px] items-center gap-0.5 rounded bg-gray-100 p-0.5">
                {pageSizeOptions.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`flex-1 h-7 rounded text-sm transition-colors ${pageSize === size ? 'bg-white text-[#165DFF] shadow-sm' : 'text-gray-600 hover:text-gray-800'
                      }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">表头设置</span>
                <button
                  type="button"
                  onClick={resetColumnVisibility}
                  className="text-sm text-[#165DFF] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  撤销修改
                </button>
              </div>
              <div className="flex flex-col gap-0.5 mt-2">
                {TABLE_COLUMNS_CONFIG.slice(0, 2).map((col) => (
                  <div key={col.key} className="flex items-center justify-between py-2 px-3 pl-9 rounded-md hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{col.label}</span>
                    <Switch
                      checked={columnVisibility[col.key] !== false}
                      onCheckedChange={(v) => setColumnVisible(col.key, v)}
                    />
                  </div>
                ))}
                <div className="my-2 border-t border-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-400 px-2 -mt-3 bg-white">以上属性不可排序</span>
                </div>
                {TABLE_COLUMNS_CONFIG.slice(2).map((col) => (
                  <div key={col.key} className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-50">
                    <GripVertical className="w-4 h-4 text-gray-400 shrink-0 cursor-move" />
                    <span className="text-sm text-gray-700 flex-1 truncate">{col.label}</span>
                    <Switch
                      checked={columnVisibility[col.key] !== false}
                      onCheckedChange={(v) => setColumnVisible(col.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ModuleManagementDialog
        open={moduleManagementOpen}
        onOpenChange={setModuleManagementOpen}
        operationType={moduleOperationType}
        moduleId={selectedModuleForEdit.id}
        moduleName={selectedModuleForEdit.name}
        parentId={selectedModuleForEdit.parentId}
        projectId={projectId}
        moduleTree={moduleTree}
        onSuccess={() => {
          fetchModuleTree();
          fetchPlanList();
        }}
      />

      <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
        <DialogContent className="sm:max-w-[360px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>添加子模块</DialogTitle>
            <DialogDescription className="sr-only">输入分组名称并保存</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={addSubName}
              onChange={(e) => setAddSubName(e.target.value)}
              placeholder="请输入分组名称，按回车键保存"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubModule()}
              className="text-[13px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSubOpen(false)} disabled={addSubLoading}>
              取消
            </Button>
            <Button onClick={handleAddSubModule} disabled={!addSubName.trim() || addSubLoading}>
              {addSubLoading ? '添加中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteModuleOpen} onOpenChange={setDeleteModuleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除该模块？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后模块下的计划将移至「未规划计划」，此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModuleConfirm}
              disabled={deleteModuleLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteModuleLoading ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>删除确认</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600">
            {deleteTip}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              取消
            </Button>
            {showArchiveButton && (
              <Button onClick={handleConfirmArchive} disabled={deleteLoading}>
                {deleteLoading ? '处理中...' : '归档'}
              </Button>
            )}
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? '处理中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
