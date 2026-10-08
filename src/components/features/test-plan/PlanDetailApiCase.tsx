/**
 * 测试计划详情 - 接口用例
 */

import { useState, useEffect, useCallback } from 'react';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from '@/components/ui/resizable';
import {
    Search, RefreshCw, Play, Link as LinkIcon,
    ChevronRight, ChevronDown,
    Filter, LayoutGrid, List, RotateCcw, FileCode,
    CheckCircle, XCircle, Clock, AlertTriangle,
    ChevronsUpDown, ChevronsDownUp
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { testPlanManagementService } from '@/services';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { toast } from 'sonner';
import { WorkItemProposalDialog } from './WorkItemProposalDialog';

interface PlanDetailApiCaseProps {
    planId: string;
    projectId: string;
    canEdit: boolean;
    /** 嵌入测试规划右侧：隐藏左侧树，仅展示接口用例列表，由外部传入模块 id 筛选 */
    embedInPlanTree?: boolean;
    /** 嵌入模式下使用的模块 id，为空或 'all' 表示全部 */
    defaultModuleId?: string | null;
}

export function PlanDetailApiCase({ planId, projectId, canEdit, embedInPlanTree, defaultModuleId }: PlanDetailApiCaseProps) {
    const [loading, setLoading] = useState(false);
    const [caseList, setCaseList] = useState<any[]>([]);
    const [moduleTree, setModuleTree] = useState<any[]>([]);
    const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
    const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
    const [proposalRow, setProposalRow] = useState<any | null>(null);
    const [proposalSnapshotMap, setProposalSnapshotMap] = useState<Record<string, { count: number; latestStatus: string | null; latestProposalId: string | null }>>({});

    // 获取模块树
    const fetchModuleTree = useCallback(async () => {
        try {
            const res = await testPlanManagementService.getApiCaseModule({
                testPlanId: planId,
                treeType: 'MODULE'
            });
            setModuleTree(res || []);
        } catch (error) {
            console.error('获取模块树失败:', error);
        }
    }, [planId]);

    // 获取接口用例列表
    const fetchCaseList = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                testPlanId: planId,
                projectId,
                current: currentPage,
                pageSize,
                keyword: searchKeyword,
                moduleIds: selectedModuleId === 'all' ? [] : [selectedModuleId],
            };
            const res = await testPlanManagementService.getPlanDetailApiCaseList(params);
            setCaseList(res.list || []);
            setTotal(res.total || 0);
        } catch (error) {
            console.error('获取接口用例列表失败:', error);
            toast.error('获取接口用例列表失败');
        } finally {
            setLoading(false);
        }
    }, [planId, projectId, currentPage, pageSize, searchKeyword, selectedModuleId]);

    useEffect(() => {
        fetchModuleTree();
    }, [fetchModuleTree]);

    useEffect(() => {
        fetchCaseList();
    }, [fetchCaseList]);


    useEffect(() => {
        if (!embedInPlanTree) return;
        setSelectedModuleId(defaultModuleId ?? 'all');
    }, [embedInPlanTree, defaultModuleId]);

    const handleExecuteCase = async (caseId: string) => {
        const toastId = toast.loading('正在执行接口用例...');
        try {
            await testPlanManagementService.runApiCase(caseId);
            toast.success('执行成功', { id: toastId });
            fetchCaseList();
        } catch (error) {
            console.error(error);
            toast.error('执行失败', { id: toastId });
        }
    };

    const handleBatchExecute = async () => {
        if (selectedCaseIds.length === 0) {
            toast.error('请选择要执行的执行项');
            return;
        }

        const toastId = toast.loading(`正在批量执行 ${selectedCaseIds.length} 个接口用例...`);
        try {
            await testPlanManagementService.batchRunApiCase({
                testPlanId: planId,
                selectIds: selectedCaseIds
            });
            toast.success('批量执行项成功', { id: toastId });
            fetchCaseList();
            setSelectedCaseIds([]);
        } catch (error) {
            console.error(error);
            toast.error('批量执行项失败', { id: toastId });
        }
    };

    const handleDisassociate = async (caseId: string) => {
        if (!confirm('确定要移出活动该接口用例吗？')) return;
        const toastId = toast.loading('正在移出活动...');
        try {
            await testPlanManagementService.disassociateApiCase({
                testPlanId: planId,
                id: caseId
            });
            toast.success('已移出活动', { id: toastId });
            fetchCaseList();
        } catch (error) {
            console.error(error);
            toast.error('移出活动失败', { id: toastId });
        }
    };

    const handleBatchDisassociate = async () => {
        if (selectedCaseIds.length === 0) {
            toast.error('请选择要移出活动的用例');
            return;
        }

        if (!confirm(`确定要移出活动选中的 ${selectedCaseIds.length} 个接口用例吗？`)) return;

        const toastId = toast.loading('正在批量移出活动...');
        try {
            await testPlanManagementService.batchDisassociateApiCase({
                testPlanId: planId,
                selectIds: selectedCaseIds
            });
            toast.success('批量移出活动成功', { id: toastId });
            fetchCaseList();
            setSelectedCaseIds([]);
        } catch (error) {
            console.error(error);
            toast.error('批量移出活动失败', { id: toastId });
        }
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

    // 渲染模块树节点
    const renderTreeNode = (node: any, level: number = 0) => {
        const isExpanded = expandedNodes.has(node.id);
        const isSelected = selectedModuleId === node.id;
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div key={node.id} className="mb-0.5" style={{ paddingLeft: `${level * 12}px` }}>
                <div
                    onClick={() => {
                        if (hasChildren) {
                            const next = new Set(expandedNodes);
                            if (next.has(node.id)) {
                                next.delete(node.id);
                            } else {
                                next.add(node.id);
                            }
                            setExpandedNodes(next);
                        }
                        setSelectedModuleId(node.id);
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
                    {node.count !== undefined && (
                        <span className={`text-[11px] ml-auto font-normal ${isSelected ? 'text-[#165DFF]' : 'text-gray-400 opacity-60'}`}>
                            {node.count}
                        </span>
                    )}
                </div>
                {hasChildren && isExpanded && (
                    <div className="mt-0.5">
                        {node.children!.map((child: any) => renderTreeNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SUCCESS':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'ERROR':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'FAKE_ERROR':
                return <AlertTriangle className="w-4 h-4 text-orange-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SUCCESS': return 'bg-green-50 text-green-600';
            case 'ERROR': return 'bg-red-50 text-red-600';
            case 'FAKE_ERROR': return 'bg-orange-50 text-orange-600';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    const getMethodColor = (method: string) => {
        switch (method?.toUpperCase()) {
            case 'GET': return 'bg-green-50 text-green-600';
            case 'POST': return 'bg-blue-50 text-blue-600';
            case 'PUT': return 'bg-orange-50 text-orange-600';
            case 'DELETE': return 'bg-red-50 text-red-600';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    const tablePanelContent = (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/60 px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="text-sm font-medium text-slate-900">接口执行项</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">这里管理的是本次测试活动里的接口执行项。接口资产沉淀在长期用例里，这里只负责本次活动的执行、分派和移出。</div>
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
                            className="h-7 pl-8 text-[11px] border-gray-200 bg-gray-50/30 focus:bg-white transition-all rounded-sm"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchCaseList()}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {selectedCaseIds.length > 0 && (
                        <>
                            <Button
                                size="sm"
                                className="h-8 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                                onClick={handleBatchExecute}
                            >
                                <Play className="w-3.5 h-3.5" /> 批量执行 ({selectedCaseIds.length})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[11px] border-gray-200 text-gray-600 gap-1.5"
                                onClick={handleBatchDisassociate}
                            >
                                移出活动 ({selectedCaseIds.length})
                            </Button>
                        </>
                    )}

                    {canEdit && (
                        <Button size="sm" className="h-8 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                            <LinkIcon className="w-3.5 h-3.5" /> 补执行项
                        </Button>
                    )}

                    <Button variant="outline" size="sm" className="h-8 text-[11px] border-gray-200 text-gray-600 gap-1.5">
                        <Filter className="w-3.5 h-3.5" /> 筛选
                    </Button>

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
                <Table className="text-sm">
                    <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-100">
                        <TableRow className="hover:bg-transparent border-none h-9">
                            <TableHead className="w-[40px] px-2 text-center">
                                <Checkbox
                                    className="rounded-[2px] opacity-60"
                                    checked={selectedCaseIds.length === caseList.length && caseList.length > 0}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-[100px] font-medium text-gray-500 text-xs">ID</TableHead>
                            <TableHead className="min-w-[200px] font-medium text-gray-500 text-xs">接口名称</TableHead>
                            <TableHead className="w-[80px] font-medium text-gray-500 text-xs">请求方式</TableHead>
                            <TableHead className="w-[120px] font-medium text-gray-500 text-xs">执行结果</TableHead>
                            <TableHead className="w-[100px] font-medium text-gray-500 text-xs">用例等级</TableHead>
                            <TableHead className="w-[120px] font-medium text-gray-500 text-xs">执行人</TableHead>
                            <TableHead className="w-[140px] font-medium text-gray-500 text-xs">更新时间</TableHead>
                            <TableHead className="w-[120px] text-center font-medium text-gray-500 text-xs">提案</TableHead>
                            <TableHead className="w-[120px] text-center font-medium text-gray-500 text-xs">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-64 text-center">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                                </TableCell>
                            </TableRow>
                        ) : caseList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-64 text-center">
                                    <div className="text-gray-400 flex flex-col items-center gap-2">
                                        <FileCode className="w-10 h-10 opacity-20" />
                                        <span>当前活动下还没有接口执行项</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            caseList.map((item) => (
                                <TableRow key={item.id} className="hover:bg-[#f2f3f5]/50 group transition-colors border-b border-gray-50 h-11">
                                    <TableCell className="px-2 text-center">
                                        <Checkbox
                                            className="rounded-[2px] border-gray-300"
                                            checked={selectedCaseIds.includes(item.id)}
                                            onCheckedChange={(checked) => handleSelectCase(item.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-blue-600 font-normal cursor-pointer hover:underline decoration-blue-600/30 text-xs">
                                            {item.num}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-gray-700 truncate max-w-[320px] font-normal text-xs" title={item.name}>
                                            {item.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`${getMethodColor(item.method)} border-0 text-xs font-normal`}>
                                            {item.method || 'GET'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(item.lastReportStatus)}
                                            <Badge className={`${getStatusColor(item.lastReportStatus)} border-0 text-xs font-normal`}>
                                                {item.lastReportStatus === 'SUCCESS' ? '成功' :
                                                    item.lastReportStatus === 'ERROR' ? '失败' :
                                                        item.lastReportStatus === 'FAKE_ERROR' ? '误报' : '未执行'}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <div
                                                className={`w-1.5 h-1.5 rounded-full ${item.priority === 'P0' ? 'bg-red-500' :
                                                    item.priority === 'P1' ? 'bg-orange-500' :
                                                        item.priority === 'P2' ? 'bg-blue-500' : 'bg-gray-400'
                                                    }`}
                                            />
                                            <span className={`text-xs font-normal ${item.priority === 'P0' ? 'text-red-600' :
                                                item.priority === 'P1' ? 'text-orange-600' :
                                                    item.priority === 'P2' ? 'text-blue-600' : 'text-gray-500'
                                                }`}>
                                                {item.priority || 'P2'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-xs">
                                        {item.executeUser || '-'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 tabular-nums font-mono text-xs">
                                        {item.updatedAt || '2026-01-13 11:10:26'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {(() => {
                                            const proposalInfo = proposalSnapshotMap[item.id] ?? { count: 0, latestStatus: null, latestProposalId: null };
                                            const proposalMeta = getProposalStatusMeta(proposalInfo.latestStatus);
                                            return (
                                                <div className="flex flex-col items-center gap-1">
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
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-3">
                                            <span
                                                className="text-blue-600 cursor-pointer hover:text-blue-700 font-normal hover:underline decoration-blue-200 text-xs"
                                                onClick={() => handleExecuteCase(item.id)}
                                            >
                                                执行
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span className="text-blue-600 cursor-pointer hover:text-blue-700 font-normal hover:underline decoration-blue-200 text-xs">
                                                报告
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span
                                                className="text-blue-600 cursor-pointer hover:text-blue-700 font-normal hover:underline decoration-blue-200 text-xs"
                                                onClick={() => openProposalDialog(item)}
                                            >
                                                发起提案
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span
                                                className="text-blue-600 cursor-pointer hover:text-blue-700 font-normal hover:underline decoration-blue-200 text-xs"
                                                onClick={() => handleDisassociate(item.id)}
                                            >
                                                移出活动
                                            </span>
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
                unitLabel="条记录"
                className="p-3 border-t border-gray-100 bg-gray-50/30"
            />
        </div>
    );

    const proposalDialog = (
        <WorkItemProposalDialog
            open={proposalDialogOpen}
            onOpenChange={(open) => {
                setProposalDialogOpen(open);
                if (!open) setProposalRow(null);
            }}
            campaignId={planId}
            workItemId={proposalRow?.id ?? null}
            targetCaseId={proposalRow?.caseId ?? proposalRow?.apiCaseId ?? proposalRow?.id ?? null}
            defaultTitle={proposalRow ? `沉淀：${proposalRow.name || proposalRow.num || proposalRow.id}` : ''}
            defaultReason={proposalRow ? '本次测试活动执行过程中发现该接口执行项需要沉淀回长期 Case 资产。' : ''}
            onSuccess={() => {
                fetchCaseList();
                loadProposalSnapshots(caseList);
            }}
        />
    );

    return (
        <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white w-full ${embedInPlanTree ? 'h-full min-h-[600px]' : 'h-[600px]'}`}>
            {embedInPlanTree ? (
                <div className="h-full flex flex-col overflow-hidden">{tablePanelContent}</div>
            ) : (
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={18} minSize={15}>
                        <div className="flex flex-col h-full border-r border-gray-100 bg-gray-50/10">
                            <div className="p-3 border-b border-gray-100 flex items-center gap-1.5">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                    <Input
                                        placeholder="请输入模块名称"
                                        className="h-7 pl-8 text-[11px] bg-white border-gray-200 focus:ring-0 focus:border-blue-400 transition-colors rounded-sm"
                                    />
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 shrink-0 hover:bg-gray-100/80 rounded-[2px]" onClick={() => {
                                                const ids = new Set<string>();
                                                const traverse = (nodes: any[]) => { nodes.forEach(n => { if (n.children?.length > 0) { ids.add(n.id); traverse(n.children); } }); };
                                                traverse(moduleTree);
                                                setExpandedNodes(ids);
                                            }}>
                                                <ChevronsUpDown className="w-3.5 h-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>展开全部</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 shrink-0 hover:bg-gray-100/80 rounded-[2px]" onClick={() => setExpandedNodes(new Set())}>
                                                <ChevronsDownUp className="w-3.5 h-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>收起全部</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <div className="flex-1 overflow-y-auto pt-2">
                                <div
                                    className={`flex items-center justify-between group px-4 py-2 rounded-r-full mr-2 cursor-pointer transition-colors ${selectedModuleId === 'all'
                                        ? 'bg-blue-50 text-[#165DFF] font-medium'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#165DFF]'
                                        }`}
                                    onClick={() => setSelectedModuleId('all')}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <FileCode className={`w-4 h-4 ${selectedModuleId === 'all' ? 'text-[#165DFF]' : 'text-gray-400'}`} />
                                        <span className="text-sm">全部接口用例 ({total})</span>
                                    </div>
                                </div>
                                {moduleTree.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-xs">暂无模块</div>
                                ) : (
                                    <div className="mt-1">
                                        {moduleTree.map(node => renderTreeNode(node))}
                                    </div>
                                )}
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
    );
}