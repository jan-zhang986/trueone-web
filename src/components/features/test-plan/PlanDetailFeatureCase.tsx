import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from '@/components/ui/resizable';
import {
    Search, RefreshCw, Play,
    ChevronRight, ChevronDown, Inbox, FolderOpen,
    Filter, LayoutGrid, List, RotateCcw, Link, User, Bug, PlusCircle,
    MoreHorizontal, Unlink, Zap, ChevronsUpDown, ChevronsDownUp, ArrowUp, ArrowDown
} from 'lucide-react';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { BatchExecuteDialog } from './BatchExecuteDialog';
import { BatchUpdateExecutorModal } from './BatchUpdateExecutorModal';
import { TestPlanAssociateFeatureCaseDrawer } from './TestPlanAssociateFeatureCaseDrawer';
import { AssociateBugDialog } from './AssociateBugDialog';
import { CreateBugDialog } from './CreateBugDialog';
import { WorkItemProposalDialog } from './WorkItemProposalDialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { testPlanManagementService, projectManagementService } from '@/services';
import { toast } from 'sonner';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { getModulePath } from '@/components/features/case-management/utils/getModulePath';
import { getCaseLevel } from '@/components/features/case-management/utils/getCaseLevel';
import { CaseLevelBadge } from '@/components/features/case-management/components/CaseLevelBadge';
import type { ModuleTreeNode } from '@/components/features/case-management/types';
import { formatTimestampBeijing } from '@/utils/date';

import { ExecuteResultTag } from './ExecuteResultTag';
import { CASE_LEVEL_MAP } from '@/components/features/case-management/constants';

/** 执行结果筛选项（与后端 ResultStatus 一致：失败为 ERROR 非 FAILED，否则筛选不匹配） */
const EXEC_RESULT_FILTER_OPTIONS = [
    { value: 'PENDING', label: '待执行' },
    { value: 'SUCCESS', label: '通过' },
    { value: 'ERROR', label: '失败' },
    { value: 'FAKE_ERROR', label: '造假失败' },
    { value: 'BLOCKED', label: '阻塞' },
    { value: 'SKIPPED', label: '跳过' },
] as const;

/** 递归收集某模块及其所有子模块 ID（用于按模块筛选用例列表） */
function collectModuleAndOffspringIds(moduleId: string, tree: ModuleTreeNode[]): string[] {
    const ids: string[] = [moduleId];
    function walk(nodes: ModuleTreeNode[]) {
        for (const n of nodes) {
            if (n.id === moduleId && n.children?.length) {
                function collect(ns: ModuleTreeNode[]) {
                    for (const c of ns) {
                        ids.push(c.id);
                        if (c.children?.length) collect(c.children);
                    }
                }
                collect(n.children);
                return;
            }
            if (n.children?.length) walk(n.children);
        }
    }
    walk(tree);
    return ids;
}

/** 递归收集树中所有模块 ID（用于请求模块数量时传参，部分后端需此才返回各模块数量） */
function collectAllModuleIds(tree: ModuleTreeNode[]): string[] {
    const ids: string[] = [];
    function walk(nodes: ModuleTreeNode[]) {
        for (const n of nodes) {
            if (n.id) ids.push(n.id);
            if (n.children?.length) walk(n.children);
        }
    }
    walk(tree);
    return ids;
}

/** 递归收集树中某节点的所有祖先节点 ID（用于展开到该节点，不含自身） */
function findPathToNode(nodes: any[], targetId: string, path: string[] = []): string[] | null {
    for (const node of nodes) {
        if (node.id === targetId) return path;
        if (node.children?.length) {
            const found = findPathToNode(node.children, targetId, [...path, node.id]);
            if (found) return found;
        }
    }
    return null;
}

/** 将模块数量接口返回转为 Record<moduleId, count>（兼容对象 / 数组 / data 包装） */
function normalizeModulesCount(res: any): Record<string, number> {
    const raw = res?.data ?? res;
    if (raw == null) return {};
    if (Array.isArray(raw)) {
        return raw.reduce<Record<string, number>>((acc, item: any) => {
            const id = item.id ?? item.moduleId;
            const count = item.count ?? item.caseCount ?? 0;
            if (id != null) acc[id] = Number(count) || 0;
            return acc;
        }, {});
    }
    if (typeof raw === 'object') {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(raw)) {
            if (v != null && typeof (v as number) === 'number') out[k] = v as number;
            else if (typeof v === 'string' && /^\d+$/.test(v)) out[k] = parseInt(v, 10);
        }
        return out;
    }
    return {};
}

interface PlanDetailFeatureCaseProps {
    planId: string;
    projectId: string;
    canEdit: boolean;
    onRefresh?: () => void;
    /** 嵌入测试规划右侧：隐藏左侧树，仅展示功能用例表格，由外部传入测试点 collectionId 筛选 */
    embedInPlanTree?: boolean;
    /** 嵌入模式下使用的测试点 ID（collectionId），为空或 'all' 表示全部 */
    defaultCollectionId?: string | null;
    /** 为 true 时首次挂载后自动打开「补执行项」抽屉（如从测试规划页「去补执行项」进入） */
    openAssociateOnce?: boolean;
    /** 打开关联抽屉后回调，用于父组件清除 openAssociateOnce */
    onOpenAssociateConsumed?: () => void;
    /** 嵌入测试规划时，补执行项成功后仅刷新左侧规划树，不触发整页 onRefresh */
    onRefreshPlanTree?: () => void;
    /** 从执行页返回时恢复：当前为测试点或模块 tab */
    initialTreeTab?: 'points' | 'modules';
    /** 从执行页返回时恢复：测试点 ID（treeTab=points 时有效） */
    initialCollectionId?: string | null;
    /** 从执行页返回时恢复：模块 ID（treeTab=modules 时有效） */
    initialModuleId?: string | null;
    /** 从执行页返回时恢复：列表搜索关键词 */
    initialKeyword?: string | null;
    /** 从执行页返回时恢复：执行结果筛选（多选） */
    initialLastExecResultFilter?: string[];
    /** 从执行页返回时恢复：用例等级筛选 */
    initialCaseLevelFilter?: string[];
    /** 从执行页返回时恢复：执行人筛选 */
    initialExecuteUserFilter?: string[];
    /** 从执行页返回时恢复：当前页 */
    initialCurrentPage?: number | null;
    /** 从执行页返回时恢复：每页条数 */
    initialPageSize?: number | null;
    /** 从执行页返回时恢复：排序字段 */
    initialSortField?: 'num' | 'name' | 'createdAt' | null;
    /** 从执行页返回时恢复：排序方向 */
    initialSortOrder?: 'asc' | 'desc';
}

export function PlanDetailFeatureCase({ planId, projectId, canEdit, onRefresh, embedInPlanTree, defaultCollectionId, openAssociateOnce, onOpenAssociateConsumed, onRefreshPlanTree, initialTreeTab, initialCollectionId, initialModuleId, initialKeyword, initialLastExecResultFilter, initialCaseLevelFilter, initialExecuteUserFilter, initialCurrentPage, initialPageSize, initialSortField, initialSortOrder }: PlanDetailFeatureCaseProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [caseList, setCaseList] = useState<any[]>([]);
    const [moduleTree, setModuleTree] = useState<any[]>([]);
    /** 模块树（MODULE 类型），用于表格「模块」列展示路径 */
    const [moduleTreeForColumn, setModuleTreeForColumn] = useState<ModuleTreeNode[]>([]);
    const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
    const [treeTab, setTreeTab] = useState<'points' | 'modules'>('points');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
    const [batchExecuteOpen, setBatchExecuteOpen] = useState(false);
    const [batchExecutorOpen, setBatchExecutorOpen] = useState(false);
    const [associateBugOpen, setAssociateBugOpen] = useState(false);
    const [createBugOpen, setCreateBugOpen] = useState(false);
    /** 当前打开关联缺陷弹窗的行：caseId 为功能用例 id，testPlanCaseId 为计划用例 id */
    const [associateBugRow, setAssociateBugRow] = useState<{ caseId: string; testPlanCaseId: string } | null>(null);
    /** 当前打开新建缺陷弹窗的行 */
    const [createBugRow, setCreateBugRow] = useState<{ caseId: string; testPlanCaseId: string } | null>(null);
    const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
    const [proposalRow, setProposalRow] = useState<any | null>(null);
    const [proposalSnapshotMap, setProposalSnapshotMap] = useState<Record<string, { count: number; latestStatus: string | null; latestProposalId: string | null }>>({});
    /** 各模块/测试点下的用例数量（用于左侧树展示） */
    const [modulesCount, setModulesCount] = useState<Record<string, number>>({});
    const [associateDrawerOpen, setAssociateDrawerOpen] = useState(false);
    /** 移出活动确认：待取消的行 id */
    const [disassociateTarget, setDisassociateTarget] = useState<string | null>(null);
    const [disassociateLoading, setDisassociateLoading] = useState(false);
    /** 批量移出活动确认弹窗 */
    const [batchDisassociateOpen, setBatchDisassociateOpen] = useState(false);
    const [batchDisassociateLoading, setBatchDisassociateLoading] = useState(false);
    /** 表格筛选：执行结果、用例等级、执行人（多选） */
    const [lastExecResultFilter, setLastExecResultFilter] = useState<string[]>([]);
    const [caseLevelFilter, setCaseLevelFilter] = useState<string[]>([]);
    const [executeUserFilter, setExecuteUserFilter] = useState<string[]>([]);
    /** 执行人下拉内搜索关键词（仅筛选选项列表） */
    const [executorSearchKeyword, setExecutorSearchKeyword] = useState('');
    /** 表格排序：num=ID, name=用例名称, createdAt=创建时间 */
    const [sortField, setSortField] = useState<'num' | 'name' | 'createdAt' | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    /** 执行人下拉选项（项目成员） */
    const [executorOptions, setExecutorOptions] = useState<{ id: string; name: string }[]>([]);
    /** 列宽（支持拖拽调整），单位 px */
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
        id: 90,
        name: 260,
        point: 120,
        module: 120,
        level: 65,
        execResult: 130,
        defectCount: 80,
        lastExecTime: 110,
        lastExecutor: 90,
    });

    /** 表格筛选条件，供列表与模块数请求使用（后端要求 filter 内字段为 List，且执行人 key 为 executeUserName） */
    const tableFilter = useMemo(() => {
        const f: Record<string, string[]> = {};
        if (lastExecResultFilter.length) f.lastExecResult = lastExecResultFilter;
        if (caseLevelFilter.length) f.caseLevel = caseLevelFilter;
        if (executeUserFilter.length) f.executeUserName = executeUserFilter;
        return f;
    }, [lastExecResultFilter, caseLevelFilter, executeUserFilter]);

    /** 执行人下拉内筛选后的选项（按名称搜索） */
    const filteredExecutorOptions = useMemo(() => {
        const kw = (executorSearchKeyword || '').trim().toLowerCase();
        if (!kw) return executorOptions;
        return executorOptions.filter((u) => u.name.toLowerCase().includes(kw));
    }, [executorOptions, executorSearchKeyword]);

    const startResize = (key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = columnWidths[key] ?? 120;

        const handleMove = (ev: MouseEvent) => {
            const delta = ev.clientX - startX;
            setColumnWidths(prev => {
                const nextWidth = Math.max(60, startWidth + delta);
                return { ...prev, [key]: nextWidth };
            });
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };

    const ResizableHeader: React.FC<{
        columnKey: string;
        className?: string;
        children: React.ReactNode;
    }> = ({ columnKey, className, children }) => {
        const width = columnWidths[columnKey];
        return (
            <TableHead
                className={className}
                style={width ? { width, minWidth: width, maxWidth: width } : undefined}
            >
                <div className="relative flex items-center w-full">
                    <div className="flex-1 min-w-0">{children}</div>
                    <div
                        className="w-1 cursor-col-resize select-none self-stretch ml-1"
                        onMouseDown={(e) => startResize(columnKey, e)}
                    >
                        <div className="w-px h-full bg-gray-200 hover:bg-blue-400" />
                    </div>
                </div>
            </TableHead>
        );
    };

    // 获取模块树（测试点/集合树，用于左侧筛选）
    const fetchModuleTree = useCallback(async () => {
        try {
            const res = await testPlanManagementService.getFeatureCaseModule({
                testPlanId: planId,
                treeType: 'COLLECTION'
            });
            setModuleTree(res || []);
        } catch (error) {
            console.error('获取模块树失败:', error);
        }
    }, [planId]);

    // 获取模块树（MODULE 类型，用于表格「模块」列展示路径，与 spotter 一致）
    const fetchModuleTreeForColumn = useCallback(async () => {
        try {
            const res = await testPlanManagementService.getFeatureCaseModule({
                testPlanId: planId,
                treeType: 'MODULE'
            });
            const list = Array.isArray(res) ? res : [];
            setModuleTreeForColumn(list as ModuleTreeNode[]);
        } catch (error) {
            console.error('获取模块树(模块)失败:', error);
        }
    }, [planId]);

    const fetchExecutorOptions = useCallback(async () => {
        try {
            const res: any = await projectManagementService.getProjectMemberOptions(projectId);
            const list = Array.isArray(res) ? res : res?.list ?? res?.data ?? [];
            setExecutorOptions(list.map((u: any) => ({ id: u.id, name: u.name || u.userName || u.email || '-' })));
        } catch {
            setExecutorOptions([]);
        }
    }, [projectId]);

    // 获取用例列表（测试点模式用 collectionId，模块模式用 moduleIds）
    const fetchCaseList = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                testPlanId: planId,
                projectId,
                current: currentPage,
                pageSize,
                keyword: searchKeyword,
            };
            if (treeTab === 'points') {
                params.collectionId = selectedModuleId === 'all' ? '' : selectedModuleId;
            } else {
                params.moduleIds = selectedModuleId === 'all' ? [] : collectModuleAndOffspringIds(selectedModuleId, moduleTreeForColumn);
                params.treeType = 'MODULE';
                if (!sortField) {
                    params.sort = { pos: 'desc' };
                    params.sortString = 'pos desc';
                }
            }
            if (sortField) {
                params.sort = { [sortField]: sortOrder };
                params.sortString = `${sortField} ${sortOrder}`;
            }
            if (Object.keys(tableFilter).length) params.filter = tableFilter;
            const res = await testPlanManagementService.getPlanDetailFeatureCaseList(params);
            setCaseList(res.list || []);
            setTotal(res.total || 0);
            // 刷新后同步拉取模块/测试点数量（与 spotter 一致：需传 current、pageSize，否则部分后端返回 400）
            const countParams: any = {
                testPlanId: planId,
                keyword: searchKeyword,
                treeType: treeTab === 'points' ? 'COLLECTION' : 'MODULE',
                current: currentPage,
                pageSize,
            };
            if (treeTab === 'points') {
                countParams.collectionId = params.collectionId ?? '';
            } else {
                countParams.moduleIds = selectedModuleId === 'all' ? [] : collectModuleAndOffspringIds(selectedModuleId, moduleTreeForColumn);
            }
            if (Object.keys(tableFilter).length) countParams.filter = tableFilter;
            testPlanManagementService.getFeatureCaseModuleCount(countParams).then((countRes: any) => {
                setModulesCount(normalizeModulesCount(countRes));
            }).catch(() => { });
        } catch (error) {
            console.error('获取用例列表失败:', error);
            toast.error('获取用例列表失败');
        } finally {
            setLoading(false);
        }
    }, [planId, projectId, currentPage, pageSize, searchKeyword, selectedModuleId, treeTab, moduleTreeForColumn, tableFilter, sortField, sortOrder]);

    useEffect(() => {
        fetchModuleTree();
    }, [fetchModuleTree]);

    useEffect(() => {
        fetchModuleTreeForColumn();
    }, [fetchModuleTreeForColumn]);

    useEffect(() => {
        fetchCaseList();
    }, [fetchCaseList]);


    useEffect(() => {
        fetchExecutorOptions();
    }, [fetchExecutorOptions]);

    // 嵌入测试规划时：同步外部传入的 defaultCollectionId 为当前选中的测试点
    useEffect(() => {
        if (!embedInPlanTree) return;
        setSelectedModuleId(defaultCollectionId ?? 'all');
        setTreeTab('points');
    }, [embedInPlanTree, defaultCollectionId]);

    // 从执行页返回时：根据 URL 传入的 initialTreeTab/initialCollectionId/initialModuleId 恢复测试点或模块位置
    useEffect(() => {
        if (embedInPlanTree) return;
        if (initialTreeTab != null) setTreeTab(initialTreeTab);
        if (initialTreeTab === 'modules' && initialModuleId != null) {
            setSelectedModuleId(initialModuleId || 'all');
        } else if (initialTreeTab !== 'modules' && initialCollectionId != null) {
            setSelectedModuleId(initialCollectionId || 'all');
        }
    }, [embedInPlanTree, initialTreeTab, initialCollectionId, initialModuleId]);

    // 从执行页返回时：恢复列表筛选条件（关键词、执行结果、分页、排序等）
    useEffect(() => {
        if (embedInPlanTree) return;
        if (initialKeyword != null && initialKeyword !== '') setSearchKeyword(initialKeyword);
        if (initialLastExecResultFilter != null && initialLastExecResultFilter.length > 0) setLastExecResultFilter(initialLastExecResultFilter);
        if (initialCaseLevelFilter != null && initialCaseLevelFilter.length > 0) setCaseLevelFilter(initialCaseLevelFilter);
        if (initialExecuteUserFilter != null && initialExecuteUserFilter.length > 0) setExecuteUserFilter(initialExecuteUserFilter);
        if (initialCurrentPage != null && initialCurrentPage >= 1) setCurrentPage(initialCurrentPage);
        if (initialPageSize != null && initialPageSize >= 1) setPageSize(initialPageSize);
        if (initialSortField != null) setSortField(initialSortField);
        if (initialSortOrder != null) setSortOrder(initialSortOrder);
    }, [embedInPlanTree, initialKeyword, initialLastExecResultFilter, initialCaseLevelFilter, initialExecuteUserFilter, initialCurrentPage, initialPageSize, initialSortField, initialSortOrder]);

    // 从执行页返回时：展开左侧树到选中节点，使对应测试点/模块可见
    useEffect(() => {
        if (embedInPlanTree) return;
        const targetId = initialTreeTab === 'modules' ? (initialModuleId || '') : (initialCollectionId || '');
        if (!targetId || targetId === 'all') return;
        const tree = initialTreeTab === 'modules' ? moduleTreeForColumn : moduleTree;
        if (!Array.isArray(tree) || tree.length === 0) return;
        const path = findPathToNode(tree, targetId);
        if (path?.length) {
            setExpandedNodes((prev) => new Set([...prev, ...path]));
        }
    }, [embedInPlanTree, initialTreeTab, initialCollectionId, initialModuleId, moduleTree, moduleTreeForColumn]);

    // 外部请求「直接进入补执行项」时自动打开关联抽屉（仅消费一次）
    useEffect(() => {
        if (!openAssociateOnce) return;
        setAssociateDrawerOpen(true);
        onOpenAssociateConsumed?.();
    }, [openAssociateOnce, onOpenAssociateConsumed]);

    // 模块 tab 下，模块树加载后拉取数量（与列表同参：current、pageSize 必传，moduleIds 与「全部」时一致为空数组，避免 400）
    useEffect(() => {
        if (treeTab !== 'modules') return;
        testPlanManagementService.getFeatureCaseModuleCount({
            testPlanId: planId,
            keyword: searchKeyword,
            treeType: 'MODULE',
            moduleIds: [],
            current: 1,
            pageSize: 10,
        }).then((countRes: any) => {
            setModulesCount((prev) => ({ ...prev, ...normalizeModulesCount(countRes) }));
        }).catch(() => { });
    }, [treeTab, planId, searchKeyword]);

    /** 与 aegis caseTable handleEditLastExecResult 一致：id 为计划用例关联 id，caseId 为功能用例 id */
    const handleUpdateResult = async (planCaseId: string, functionalCaseId: string, result: string) => {
        const resultVal = (result ?? '').trim();
        if (!resultVal) return;
        const toastId = toast.loading('更新执行结果...');
        try {
            await testPlanManagementService.runFeatureCase({
                id: planCaseId,
                caseId: functionalCaseId,
                testPlanId: planId,
                projectId,
                lastExecResult: resultVal,
            });
            toast.success('更新成功', { id: toastId });
            fetchCaseList();
        } catch (error) {
            console.error(error);
            toast.error('更新失败', { id: toastId });
        }
    };

    const handleDisassociate = async (caseId: string) => {
        setDisassociateLoading(true);
        const toastId = toast.loading('正在移出活动...');
        try {
            await testPlanManagementService.disassociateCase({
                testPlanId: planId,
                id: caseId
            });
            toast.success('已移出活动', { id: toastId });
            setDisassociateTarget(null);
            fetchCaseList();
        } catch (error) {
            console.error(error);
            toast.error('移出活动失败', { id: toastId });
        } finally {
            setDisassociateLoading(false);
        }
    };

    /** 内联更新执行结果（乐观更新 + 失败回滚） */
    const handleUpdateExecResult = async (item: any, result: string) => {
        const prev = item.lastExecResult;
        setCaseList(list => list.map(c => c.id === item.id ? { ...c, lastExecResult: result } : c));
        try {
            await testPlanManagementService.runFeatureCase({
                id: item.id,
                caseId: item.caseId,
                testPlanId: planId,
                projectId,
                lastExecResult: result,
            });
            toast.success('执行结果已更新');
        } catch {
            setCaseList(list => list.map(c => c.id === item.id ? { ...c, lastExecResult: prev } : c));
            toast.error('更新失败');
        }
    };

    const handleBatchDisassociate = async () => {
        if (selectedCaseIds.length === 0) return;
        setBatchDisassociateLoading(true);
        const toastId = toast.loading(`正在移出活动 ${selectedCaseIds.length} 个用例...`);
        try {
            await testPlanManagementService.batchDisassociateCase({
                testPlanId: planId,
                projectId,
                selectIds: selectedCaseIds,
                selectAll: false,
                excludeIds: []
            });
            toast.success(`已移出活动 ${selectedCaseIds.length} 个用例`, { id: toastId });
            setBatchDisassociateOpen(false);
            setSelectedCaseIds([]);
            fetchCaseList();
        } catch (error) {
            console.error(error);
            toast.error('批量移出活动失败', { id: toastId });
        } finally {
            setBatchDisassociateLoading(false);
        }
    };

    /** 构建进入执行页面的 URL，若当前已按某模块/测试点筛选或有列表筛选条件，则带入 query 以便返回时恢复 */
    const buildExecuteUrl = (id: string) => {
        const params = new URLSearchParams();
        if (selectedModuleId !== 'all') {
            params.set('treeTab', treeTab);
            if (treeTab === 'points') {
                params.set('collectionId', selectedModuleId);
            } else {
                params.set('moduleId', selectedModuleId);
            }
        }
        if ((searchKeyword || '').trim()) params.set('keyword', (searchKeyword || '').trim());
        if (lastExecResultFilter.length) params.set('lastExecResult', lastExecResultFilter.join(','));
        if (caseLevelFilter.length) params.set('caseLevel', caseLevelFilter.join(','));
        if (executeUserFilter.length) params.set('executeUser', executeUserFilter.join(','));
        if (currentPage > 1) params.set('currentPage', String(currentPage));
        if (pageSize !== 10) params.set('pageSize', String(pageSize));
        if (sortField) {
            params.set('sortField', sortField);
            params.set('sortOrder', sortOrder);
        }
        const qs = params.toString();
        return `/test-plan/${planId}/feature-case/${id}${qs ? `?${qs}` : ''}`;
    };

    const handleExecuteCase = (id: string) => {
        navigate(buildExecuteUrl(id));
    };

    const handleViewCase = (id: string) => {
        navigate(buildExecuteUrl(id));
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedCaseIds(caseList.map(c => c.id));
        } else {
            setSelectedCaseIds([]);
        }
    };

    const handleSelectCase = (caseId: string, checked: boolean) => {
        if (checked) {
            setSelectedCaseIds([...selectedCaseIds, caseId]);
        } else {
            setSelectedCaseIds(selectedCaseIds.filter(id => id !== caseId));
        }
    };

    /** 点击表头切换排序（ID、用例名称、创建时间） */
    const handleSort = (field: 'num' | 'name' | 'createdAt') => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    const handleBatchExecute = () => {
        if (selectedCaseIds.length === 0) {
            toast.error('请选择要执行的执行项');
            return;
        }
        setBatchExecuteOpen(true);
    };

    const handleBatchUpdateExecutor = () => {
        if (selectedCaseIds.length === 0) {
            toast.error('请选择要修改的用例');
            return;
        }
        setBatchExecutorOpen(true);
    };

    const openAssociateBug = (item: { id: string; caseId?: string }) => {
        setAssociateBugRow({ caseId: item.caseId ?? item.id, testPlanCaseId: item.id });
        setAssociateBugOpen(true);
    };

    const openCreateBug = (item: { id: string; caseId?: string }) => {
        setCreateBugRow({ caseId: item.caseId ?? item.id, testPlanCaseId: item.id });
        setCreateBugOpen(true);
    };

    const handleBatchAssociateBug = () => {
        if (selectedCaseIds.length === 0) {
            toast.error('请选择要关联缺陷的用例');
            return;
        }
        setAssociateBugRow(null);
        setAssociateBugOpen(true);
    };

    const openProposalDialog = (item: any) => {
        setProposalRow(item);
        setProposalDialogOpen(true);
    };

    const normalizeProposalList = (res: any): any[] => {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.list)) return res.list;
        if (Array.isArray(res?.data)) return res.data;
        return [];
    };

    const loadProposalSnapshots = useCallback(async (items: any[]) => {
        if (!items?.length) {
            setProposalSnapshotMap({});
            return;
        }
        const entries = await Promise.all(items.map(async (item) => {
            try {
                const res = await testPlanManagementService.getWorkItemProposalList(planId, item.id);
                const list = normalizeProposalList(res);
                const latest = list[0] ?? list[list.length - 1] ?? null;
                return [item.id, { count: list.length, latestStatus: latest?.status ?? null, latestProposalId: latest?.id ?? null }] as const;
            } catch (error) {
                return [item.id, { count: 0, latestStatus: null, latestProposalId: null }] as const;
            }
        }));
        setProposalSnapshotMap(Object.fromEntries(entries));
    }, [planId]);

    const getProposalStatusMeta = (status?: string | null) => {
        switch (status) {
            case 'MERGED':
                return { label: '已合并', className: 'bg-green-50 text-green-600' };
            case 'SUBMITTED':
                return { label: '评审中', className: 'bg-blue-50 text-blue-600' };
            case 'REJECTED':
                return { label: '已拒绝', className: 'bg-red-50 text-red-600' };
            case 'DRAFT':
                return { label: '草稿', className: 'bg-amber-50 text-amber-600' };
            default:
                return { label: '未发起', className: 'bg-gray-50 text-gray-500' };
        }
    };

    const handleMergeProposalToCase = async (item: any) => {
        const proposalInfo = proposalSnapshotMap[item.id];
        const proposalId = proposalInfo?.latestProposalId;
        if (!proposalId) {
            toast.error('当前执行项还没有可合并的提案');
            return;
        }
        if (proposalInfo?.latestStatus === 'MERGED') {
            toast.message('最近提案已经合并');
            return;
        }
        if (!confirm('确定要将最近一次提案合并回 Case 吗？')) return;
        const toastId = toast.loading('正在合并回 Case...');
        try {
            await testPlanManagementService.mergeProposalToCase(proposalId, {
                targetCaseId: item.caseId || item.apiCaseId || item.apiScenarioId || item.id || undefined,
            });
            toast.success('提案已合并回 Case', { id: toastId });
            fetchCaseList();
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || '合并回 Case 失败', { id: toastId });
        }
    };

    useEffect(() => {
        loadProposalSnapshots(caseList);
    }, [caseList, loadProposalSnapshots]);

    const handleBatchCreateBug = () => {
        if (selectedCaseIds.length === 0) {
            toast.error('请选择用例');
            return;
        }
        const first = caseList.find((c) => selectedCaseIds.includes(c.id));
        if (first) {
            setCreateBugRow({ caseId: first.caseId ?? first.id, testPlanCaseId: first.id });
        } else {
            setCreateBugRow(null);
        }
        setCreateBugOpen(true);
    };

    // 渲染模块树节点（数量优先用 modulesCount，其次 node.count）
    const renderTreeNode = (node: any, level = 0) => {
        const isExpanded = expandedNodes.has(node.id);
        const isSelected = selectedModuleId === node.id;
        const hasChildren = node.children && node.children.length > 0;
        const count = modulesCount[node.id] ?? node.count ?? 0;

        return (
            <div key={node.id}>
                <div
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                    onClick={() => setSelectedModuleId(node.id)}
                >
                    {hasChildren ? (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                const next = new Set(expandedNodes);
                                if (next.has(node.id)) next.delete(node.id);
                                else next.add(node.id);
                                setExpandedNodes(next);
                            }}
                            className="p-0.5 hover:bg-gray-200 rounded"
                        >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                    ) : (
                        <div className="w-4.5" />
                    )}
                    <FolderOpen className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="text-sm truncate">{node.name}</span>
                    <span className="ml-auto text-sm text-gray-400 shrink-0">({count})</span>
                </div>
                {hasChildren && isExpanded && (
                    <div>
                        {node.children.map((child: any) => renderTreeNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const tablePanelContent = (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/60 px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="text-sm font-medium text-slate-900">功能用例执行项</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">这里管理的是本次测试活动里的功能用例执行项。长期资产仍然在 Case 库里，这里只关注本次活动怎么执行、谁来执行、执行结果如何。</div>
                    </div>
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-2 text-xs leading-5 text-slate-500">
                        这里看的不是长期资产，而是本次活动中的 <span className="font-medium text-blue-600">WorkItem</span>。
                    </div>
                </div>
            </div>
            <div className="p-2.5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2 flex-1 max-w-[360px] pl-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <Input
                            placeholder="通过 ID 或名称搜索"
                            className="h-8 pl-8 text-sm border-gray-200 bg-gray-50/30 focus:bg-white transition-all rounded-sm"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchCaseList()}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-sm border-gray-200 text-gray-600 gap-1.5"
                            onClick={() => setAssociateDrawerOpen(true)}
                        >
                            <Link className="w-3.5 h-3.5" /> 补执行项
                        </Button>
                    )}
                    {selectedCaseIds.length > 0 && (
                        <div className="flex items-center gap-1.5 pl-1 border-l border-gray-200">
                            <span className="text-sm text-gray-400">已选 {selectedCaseIds.length} 项</span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-sm border-gray-200 text-gray-500 gap-1 px-2"
                                onClick={handleBatchUpdateExecutor}
                            >
                                <User className="w-3 h-3" /> 执行人
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-sm border-gray-200 text-gray-500 gap-1 px-2"
                                onClick={handleBatchAssociateBug}
                            >
                                <Bug className="w-3 h-3" /> 关联缺陷
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-sm border-gray-200 text-gray-500 gap-1 px-2"
                                onClick={handleBatchCreateBug}
                            >
                                <PlusCircle className="w-3 h-3" /> 新建缺陷
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 text-sm bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2.5"
                                onClick={handleBatchExecute}
                            >
                                <Play className="w-3 h-3" /> 批量执行
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-sm border-gray-200 text-red-500 hover:text-red-600 hover:border-red-200 gap-1 px-2"
                                onClick={() => setBatchDisassociateOpen(true)}
                            >
                                <Unlink className="w-3 h-3" /> 移出活动
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center bg-gray-50 rounded-sm border border-gray-200 p-0.5">
                        <span className="text-sm px-2 text-gray-400">视图</span>
                        <Select defaultValue="all">
                            <SelectTrigger className="h-8 w-[100px] border-0 bg-transparent text-sm font-normal focus:ring-0">
                                <SelectValue placeholder="全部数据" />
                            </SelectTrigger>
                            <SelectContent className="text-sm">
                                <SelectItem value="all">全部数据</SelectItem>
                                <SelectItem value="mine">我的用例</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {Object.keys(tableFilter).length > 0 ? (
                        <Button variant="outline" size="sm" className="h-8 text-sm border-gray-200 text-gray-600 gap-1.5" onClick={() => { setLastExecResultFilter([]); setCaseLevelFilter([]); setExecuteUserFilter([]); setCurrentPage(1); }}>
                            清除筛选
                        </Button>
                    ) : null}

                    <div className="flex border border-gray-200 rounded-sm p-0.5 h-8">
                        <Button variant="ghost" size="icon" className="h-full w-7 p-0 bg-gray-50 text-blue-600">
                            <List className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-full w-7 p-0">
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={fetchCaseList}>
                        <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
                <Table className="w-full [&_th]:text-[13px] [&_td]:text-[13px]" style={{ tableLayout: 'fixed' }}>
                    <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-100">
                        <TableRow className="hover:bg-transparent border-none h-9">
                            <TableHead className="w-[40px] px-2 text-center">
                                <Checkbox
                                    className="rounded-[2px] opacity-60"
                                    checked={selectedCaseIds.length === caseList.length && caseList.length > 0}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <ResizableHeader columnKey="id" className="font-medium text-gray-500">
                                <button
                                    type="button"
                                    className="flex items-center gap-1 hover:text-gray-900"
                                    onClick={() => handleSort('num')}
                                >
                                    ID
                                    {sortField === 'num' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                                </button>
                            </ResizableHeader>
                            <ResizableHeader columnKey="name" className="font-medium text-gray-500">
                                <button
                                    type="button"
                                    className="flex items-center gap-1 hover:text-gray-900"
                                    onClick={() => handleSort('name')}
                                >
                                    用例名称
                                    {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                                </button>
                            </ResizableHeader>
                            <ResizableHeader columnKey="point" className="font-medium text-gray-500">
                                测试点
                            </ResizableHeader>
                            <ResizableHeader columnKey="module" className="font-medium text-gray-500">
                                所属模块
                            </ResizableHeader>
                            <ResizableHeader columnKey="level" className="font-medium text-gray-500">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button type="button" className="flex items-center gap-1 hover:text-gray-900 min-w-0 w-full">
                                            <span className="min-w-0 truncate">等级</span>
                                            <Filter className="w-3 h-3 text-gray-400 shrink-0" />
                                            {caseLevelFilter.length > 0 && <span className="text-blue-600 text-[10px] shrink-0">(已筛{caseLevelFilter.length})</span>}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-36 p-2 max-h-[260px] overflow-auto" align="start">
                                        <button type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100" onClick={() => { setCaseLevelFilter([]); setCurrentPage(1); }}>全部</button>
                                        {Object.entries(CASE_LEVEL_MAP).map(([value, { label }]) => {
                                            const isSelected = caseLevelFilter.includes(value);
                                            return (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'text-blue-600 font-medium' : ''}`}
                                                    onClick={() => {
                                                        const next = isSelected ? caseLevelFilter.filter((v) => v !== value) : [...caseLevelFilter, value];
                                                        setCaseLevelFilter(next);
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>{isSelected ? '✓' : ''}</span>
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </PopoverContent>
                                </Popover>
                            </ResizableHeader>
                            <ResizableHeader columnKey="execResult" className="font-medium text-gray-500">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button type="button" className="flex items-center gap-1 hover:text-gray-900 min-w-0 w-full">
                                            <span className="min-w-0 truncate">执行结果</span>
                                            <Filter className="w-3 h-3 text-gray-400 shrink-0" />
                                            {lastExecResultFilter.length > 0 && <span className="text-blue-600 text-[10px] shrink-0">(已筛{lastExecResultFilter.length})</span>}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-36 p-2 max-h-[260px] overflow-auto" align="start">
                                        <button type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100" onClick={() => { setLastExecResultFilter([]); setCurrentPage(1); }}>全部</button>
                                        {EXEC_RESULT_FILTER_OPTIONS.map(({ value, label }) => {
                                            const isSelected = lastExecResultFilter.includes(value);
                                            return (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'text-blue-600 font-medium' : ''}`}
                                                    onClick={() => {
                                                        const next = isSelected ? lastExecResultFilter.filter((v) => v !== value) : [...lastExecResultFilter, value];
                                                        setLastExecResultFilter(next);
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>{isSelected ? '✓' : ''}</span>
                                                    {label}
                                                </button>
                                            );
                                        })}
                                        </PopoverContent>
                                    </Popover>
                                </ResizableHeader>
                            <ResizableHeader columnKey="defectCount" className="font-medium text-gray-500">
                                缺陷数
                            </ResizableHeader>
                            <ResizableHeader columnKey="lastExecTime" className="font-medium text-gray-500">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button type="button" className="flex items-center gap-1 hover:text-gray-900 min-w-0 w-full">
                                            <span className="min-w-0 truncate">执行人</span>
                                            <Filter className="w-3 h-3 text-gray-400 shrink-0" />
                                            {executeUserFilter.length > 0 && <span className="text-blue-600 text-[10px] shrink-0">(已筛{executeUserFilter.length})</span>}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-48 p-2 max-h-[280px] overflow-hidden flex flex-col"
                                        align="start"
                                        onOpenAutoFocus={() => setExecutorSearchKeyword('')}
                                    >
                                        <div className="pb-2 border-b border-gray-100 mb-2">
                                            <Input
                                                placeholder="搜索执行人"
                                                className="h-8 text-[13px]"
                                                value={executorSearchKeyword}
                                                onChange={(e) => setExecutorSearchKeyword(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-[220px] overflow-auto -mx-1 px-1">
                                            <button type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100" onClick={() => { setExecuteUserFilter([]); setCurrentPage(1); }}>全部</button>
                                            {filteredExecutorOptions.map((u) => {
                                                const isSelected = executeUserFilter.includes(u.id);
                                                return (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 truncate flex items-center gap-2 ${isSelected ? 'text-blue-600 font-medium' : ''}`}
                                                        title={u.name}
                                                        onClick={() => {
                                                            const next = isSelected ? executeUserFilter.filter((v) => v !== u.id) : [...executeUserFilter, u.id];
                                                            setExecuteUserFilter(next);
                                                            setCurrentPage(1);
                                                        }}
                                                    >
                                                        <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>{isSelected ? '✓' : ''}</span>
                                                        {u.name}
                                                    </button>
                                                );
                                            })}
                                            {filteredExecutorOptions.length === 0 && <div className="px-2 py-2 text-xs text-gray-400">暂无匹配</div>}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </ResizableHeader>
                            <TableHead className="w-[90px] font-medium text-gray-500">创建人</TableHead>
                            <TableHead className="w-[140px] font-medium text-gray-500">
                                <button
                                    type="button"
                                    className="flex items-center gap-1 hover:text-gray-900"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    创建时间
                                    {sortField === 'createdAt' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                                </button>
                            </TableHead>
                            <TableHead className="w-[140px] font-medium text-gray-500">更新时间</TableHead>
                            <TableHead className="w-[120px] text-center font-medium text-gray-500">提案</TableHead>
                            <TableHead className="w-[90px] text-center font-medium text-gray-500">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={13} className="h-64 text-center">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                                </TableCell>
                            </TableRow>
                        ) : caseList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={13} className="h-64 text-center">
                                    <div className="text-gray-400 flex flex-col items-center gap-2">
                                        <Inbox className="w-10 h-10 opacity-20" />
                                        <span>当前活动下还没有功能用例执行项</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            caseList.map((item) => (
                                <TableRow key={item.id} className="hover:bg-[#f5f7ff]/60 group transition-colors border-b border-gray-50" style={{ height: '40px' }}>
                                    <TableCell className="px-2 text-center w-[40px]">
                                        <Checkbox
                                            className="rounded-[2px] border-gray-300"
                                            checked={selectedCaseIds.includes(item.id)}
                                            onCheckedChange={(checked) => handleSelectCase(item.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell className="py-0">
                                        <span
                                            className="text-blue-600 text-[13px] cursor-pointer hover:underline"
                                            onClick={() => handleViewCase(item.id)}
                                        >
                                            {item.num}
                                        </span>
                                    </TableCell>
                                    <TableCell
                                        className="py-0"
                                        style={{ width: 260, minWidth: 220, maxWidth: 320 }}
                                    >
                                        <div
                                            className="text-gray-700 truncate text-[13px] cursor-pointer hover:text-blue-600 transition-colors"
                                            title={item.name}
                                            onClick={() => handleViewCase(item.id)}
                                        >
                                            {item.name}
                                        </div>
                                    </TableCell>
                                    <TableCell
                                        className="py-0 text-gray-500 text-[13px] truncate whitespace-nowrap"
                                        style={{ width: 120, maxWidth: 140 }}
                                    >
                                        {item.testPoint || '基本功能点'}
                                    </TableCell>
                                    <TableCell className="py-0 text-gray-400 truncate" title={(item.moduleName ?? (item.moduleId ? getModulePath(item.moduleId, moduleTreeForColumn) : '')) || '-'}>
                                        {(item.moduleName ?? (item.moduleId ? getModulePath(item.moduleId, moduleTreeForColumn) : '')) || '-'}
                                    </TableCell>
                                    <TableCell className="py-0">
                                        <CaseLevelBadge item={item as any} />
                                    </TableCell>
                                    {/* 执行结果列: Select 下拉（对齐原项目 lastExecResult 列） */}
                                    <TableCell className="py-0">
                                        {canEdit ? (
                                            <Select
                                                value={item.lastExecResult || 'PENDING'}
                                                onValueChange={(v) => handleUpdateExecResult(item, v)}
                                            >
                                                <SelectTrigger className="h-6 w-[120px] border-0 bg-transparent px-1 shadow-none focus:ring-0 hover:bg-gray-100 rounded">
                                                    <SelectValue>
                                                        <ExecuteResultTag result={item.lastExecResult || 'PENDING'} />
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {['SUCCESS', 'ERROR', 'FAKE_ERROR', 'BLOCKED', 'PENDING'].map(opt => (
                                                        <SelectItem key={opt} value={opt} className="text-[13px]">
                                                            <ExecuteResultTag result={opt} />
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <ExecuteResultTag result={item.lastExecResult || 'PENDING'} />
                                        )}
                                    </TableCell>
                                    {/* 缺陷数列: 可关联/新建 */}
                                    <TableCell className="py-0">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button type="button" className="flex items-center gap-1 text-[13px] text-gray-600 hover:text-blue-600 transition-colors group/bug">
                                                    <Bug className="w-3 h-3 text-gray-400 group-hover/bug:text-blue-500" />
                                                    <span>{item.bugCount ?? 0}</span>
                                                </button>
                                            </DropdownMenuTrigger>
                                            {canEdit && (
                                                <DropdownMenuContent align="start" className="w-28">
                                                    <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => openAssociateBug(item)}>
                                                        <Link className="w-3.5 h-3.5 text-gray-400" /> 关联缺陷
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => openCreateBug(item)}>
                                                        <PlusCircle className="w-3.5 h-3.5 text-gray-400" /> 新建缺陷
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            )}
                                        </DropdownMenu>
                                    </TableCell>
                                    {/* 执行人列 */}
                                    <TableCell className="py-0 text-gray-500 truncate max-w-[90px]">
                                        {item.executeUserName || '-'}
                                    </TableCell>
                                    <TableCell className="py-0 text-gray-500 truncate max-w-[90px]">
                                        {item.createUserName || '-'}
                                    </TableCell>
                                    <TableCell className="py-0 text-gray-400 tabular-nums">
                                        {item.createdAt ? formatTimestampBeijing(item.createdAt) : '-'}
                                    </TableCell>
                                    <TableCell className="py-0 text-gray-400 tabular-nums">
                                        {item.updatedAt ? formatTimestampBeijing(item.updatedAt) : '-'}
                                    </TableCell>
                                    {/* 操作列：「执行」文字按钮 + 「···」菜单（修改执行人 + 移出活动） */}
                                    <TableCell className="py-0 text-center">
                                        {(() => {
                                            const proposalInfo = proposalSnapshotMap[item.id] ?? { count: 0, latestStatus: null, latestProposalId: null };
                                            const proposalMeta = getProposalStatusMeta(proposalInfo.latestStatus);
                                            return (
                                                <div className="flex flex-col items-center gap-1 py-1">
                                                    <span className="text-[11px] text-gray-500">{proposalInfo.count} 个提案</span>
                                                    <Badge className={`${proposalMeta.className} border-0 text-[11px] font-normal`}>
                                                        {proposalMeta.label}
                                                    </Badge>
                                                    {proposalInfo.count > 0 && proposalInfo.latestStatus !== 'MERGED' ? (
                                                        <button
                                                            type="button"
                                                            className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline"
                                                            onClick={() => handleMergeProposalToCase(item)}
                                                        >
                                                            合并回Case
                                                        </button>
                                                    ) : null}
                                                </div>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell className="py-0 text-center">
                                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-0.5 text-[13px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-1.5 py-1 rounded transition-colors"
                                                onClick={() => handleExecuteCase(item.id)}
                                            >
                                                <Play className="w-3 h-3" /> 执行
                                            </button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-36">
                                                    <DropdownMenuItem
                                                        className="text-xs gap-2 cursor-pointer"
                                                        onClick={() => { setBatchExecutorOpen(true); setSelectedCaseIds([item.id]); }}
                                                    >
                                                        <User className="w-3.5 h-3.5 text-gray-400" /> 修改执行人
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-xs gap-2 cursor-pointer"
                                                        onClick={() => openProposalDialog(item)}
                                                    >
                                                        <PlusCircle className="w-3.5 h-3.5 text-gray-400" /> 发起沉淀提案
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-xs gap-2 cursor-pointer text-red-500 focus:text-red-600"
                                                        onClick={() => setDisassociateTarget(item.id)}
                                                    >
                                                        <Unlink className="w-3.5 h-3.5" /> 移出活动
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
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
                onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                }}
                pageSizeOptions={[10, 20, 50]}
                unitLabel="条记录"
                className="p-3 border-t border-gray-100 bg-gray-50/30"
            />
        </div>
    );

    return (
        <>
            <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white w-full ${embedInPlanTree ? 'h-full min-h-[600px]' : 'h-[600px]'}`}>
                {embedInPlanTree ? (
                    <div className="h-full flex flex-col overflow-hidden">{tablePanelContent}</div>
                ) : (
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={18} minSize={15}>
                            <div className="flex flex-col h-full border-r border-gray-100 bg-gray-50/10">
                                <div className="p-3 bg-white">
                                    <div className="flex bg-gray-100/80 p-0.5 rounded-sm mb-3">
                                        <Button
                                            variant="ghost"
                                            className={`flex-1 h-7 text-sm rounded-[2px] p-0 transition-all ${treeTab === 'points' ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => { setTreeTab('points'); setSelectedModuleId('all'); }}
                                        >
                                            测试点
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className={`flex-1 h-7 text-sm rounded-[2px] p-0 transition-all ${treeTab === 'modules' ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                            onClick={() => { setTreeTab('modules'); setSelectedModuleId('all'); }}
                                        >
                                            模块
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                            <Input
                                                placeholder="请输入名称"
                                                className="h-8 pl-8 text-sm bg-white border-gray-200 focus:ring-0 focus:border-blue-400 transition-colors rounded-sm"
                                            />
                                        </div>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 shrink-0 hover:bg-gray-100/80 rounded-[2px]" onClick={() => {
                                                        const ids = new Set<string>();
                                                        const traverse = (nodes: any[]) => { nodes.forEach(n => { if (n.children?.length > 0) { ids.add(n.id); traverse(n.children); } }); };
                                                        traverse(treeTab === 'points' ? moduleTree : moduleTreeForColumn);
                                                        setExpandedNodes(ids);
                                                    }}>
                                                        <ChevronsUpDown className="w-3.5 h-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>展开全部</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 shrink-0 hover:bg-gray-100/80 rounded-[2px]" onClick={() => setExpandedNodes(new Set())}>
                                                        <ChevronsDownUp className="w-3.5 h-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>收起全部</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-1.5 pt-0">
                                    <div
                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm cursor-pointer transition-colors mb-0.5 ${selectedModuleId === 'all' ? 'bg-blue-50/50 text-blue-600 font-medium' : 'hover:bg-gray-100 text-gray-500'}`}
                                        onClick={() => setSelectedModuleId('all')}
                                    >
                                        <FolderOpen className={`w-3.5 h-3.5 ${selectedModuleId === 'all' ? 'text-blue-500' : 'text-gray-400'}`} />
                                        <span className="text-sm">{treeTab === 'points' ? '测试用例' : '全部模块'} ({total})</span>
                                    </div>
                                    {(treeTab === 'points' ? moduleTree : moduleTreeForColumn).map((node: any) => renderTreeNode(node))}
                                </div>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={82}>
                            {tablePanelContent}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                )}
            </div>

            <BatchExecuteDialog
                open={batchExecuteOpen}
                onOpenChange={setBatchExecuteOpen}
                planId={planId}
                selectedCaseIds={selectedCaseIds}
                onSuccess={() => {
                    fetchCaseList();
                loadProposalSnapshots(caseList);
                    setSelectedCaseIds([]);
                }}
            />
            <BatchUpdateExecutorModal
                open={batchExecutorOpen}
                onOpenChange={setBatchExecutorOpen}
                planId={planId}
                projectId={projectId}
                selectIds={selectedCaseIds}
                count={selectedCaseIds.length}
                onSuccess={() => {
                    fetchCaseList();
                    setSelectedCaseIds([]);
                }}
            />
            <AssociateBugDialog
                open={associateBugOpen}
                onOpenChange={(open) => {
                    setAssociateBugOpen(open);
                    if (!open) setAssociateBugRow(null);
                }}
                planId={planId}
                projectId={projectId}
                caseId={associateBugRow?.caseId}
                testPlanCaseId={associateBugRow?.testPlanCaseId}
                selectCaseIds={associateBugRow == null && selectedCaseIds.length > 0 ? selectedCaseIds : undefined}
                onSuccess={() => {
                    fetchCaseList();
                    if (selectedCaseIds.length > 0) setSelectedCaseIds([]);
                }}
            />
            <WorkItemProposalDialog
                open={proposalDialogOpen}
                onOpenChange={(open) => {
                    setProposalDialogOpen(open);
                    if (!open) setProposalRow(null);
                }}
                campaignId={planId}
                workItemId={proposalRow?.id ?? null}
                targetCaseId={proposalRow?.caseId ?? proposalRow?.id ?? null}
                defaultTitle={proposalRow ? `沉淀：${proposalRow.name || proposalRow.num || proposalRow.id}` : ''}
                defaultReason={proposalRow ? '本次测试活动执行过程中发现该执行项需要沉淀回长期 Case 资产。' : ''}
                onSuccess={() => {
                    fetchCaseList();
                    onRefresh?.();
                }}
            />

            <CreateBugDialog
                open={createBugOpen}
                onOpenChange={(open) => {
                    setCreateBugOpen(open);
                    if (!open) setCreateBugRow(null);
                }}
                projectId={projectId}
                caseId={createBugRow?.caseId}
                testPlanId={planId}
                testPlanCaseId={createBugRow?.testPlanCaseId}
                onSuccess={() => {
                    fetchCaseList();
                    if (selectedCaseIds.length > 0) setSelectedCaseIds([]);
                }}
            />
            {/* 移出活动确认弹窗（对齐原项目 MsPopconfirm 效果） */}
            <AlertDialog open={!!disassociateTarget} onOpenChange={(o) => !o && setDisassociateTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认移出活动？</AlertDialogTitle>
                        <AlertDialogDescription>
                            移出活动后，该用例将从测试计划中移除，不影响用例库原数据。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={disassociateLoading}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={disassociateLoading}
                            onClick={() => disassociateTarget && handleDisassociate(disassociateTarget)}
                        >
                            确认移出活动
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* 批量移出活动确认弹窗（对齐原项目 openModal warning） */}
            <AlertDialog open={batchDisassociateOpen} onOpenChange={(o) => !o && setBatchDisassociateOpen(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认批量移出活动？</AlertDialogTitle>
                        <AlertDialogDescription>
                            已选中 <span className="font-semibold text-gray-700">{selectedCaseIds.length}</span> 个用例，移出活动后将从测试计划中移除，不影响用例库原数据。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={batchDisassociateLoading}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={batchDisassociateLoading}
                            onClick={handleBatchDisassociate}
                        >
                            确认移出活动
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {canEdit && (
                <TestPlanAssociateFeatureCaseDrawer
                    open={associateDrawerOpen}
                    onOpenChange={setAssociateDrawerOpen}
                    planId={planId}
                    projectId={projectId}
                    collectionId={embedInPlanTree ? defaultCollectionId : (selectedModuleId !== 'all' ? selectedModuleId : undefined)}
                    onSuccess={() => {
                        fetchCaseList();
                        fetchModuleTree();
                        fetchModuleTreeForColumn();
                        // 刷新测试计划规划树和详情，确保“去补执行项”提示栏等依赖 functionalCaseCount 的视图实时更新
                        onRefreshPlanTree?.();
                        onRefresh?.();
                    }}
                />
            )}
        </>
    );
}

