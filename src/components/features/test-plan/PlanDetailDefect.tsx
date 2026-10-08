/**
 * 测试计划详情 - 缺陷列表
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw, Link as LinkIcon,
    Bug, Filter, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AssociateBugDialog } from './AssociateBugDialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { testPlanManagementService, bugManagementService } from '@/services';
import { getPriorityLabel, getPriorityColor } from '@/services/bug-management/constants/bug-priority';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { BugDetailDrawer } from '@/components/features/bug-management/BugDetailDrawer';
import { toast } from 'sonner';

function formatCreateTime(v: number | string | undefined): string {
    if (v == null) return '-';
    const t = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (Number.isNaN(t)) return String(v);
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface PlanDetailDefectProps {
    planId: string;
    projectId: string;
    canEdit: boolean;
    onRefresh?: () => void;
    /** 缺陷列表条数变化时回调，用于 Tab 角标展示真实数量 */
    onDefectCountChange?: (count: number) => void;
}

export function PlanDetailDefect({ planId, projectId, canEdit, onRefresh, onDefectCountChange }: PlanDetailDefectProps) {
    const [loading, setLoading] = useState(false);
    const [defectList, setDefectList] = useState<any[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [associateBugOpen, setAssociateBugOpen] = useState(false);
    const [detailBugId, setDetailBugId] = useState<string | null>(null);
    /** 处理人 ID -> 名称，用于列表展示（后端可能只返回 handleUser id） */
    const [handleUserNameMap, setHandleUserNameMap] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!projectId) return;
        bugManagementService.getCustomOptionHeader(projectId).then((res: any) => {
            const raw = res?.handleUserOption || [];
            const map: Record<string, string> = {};
            raw.forEach((o: { value?: string; text?: string; id?: string; name?: string }) => {
                const id = o.value ?? o.id;
                const name = o.text ?? o.name;
                if (id != null && name != null) map[id] = name;
            });
            setHandleUserNameMap(map);
        }).catch(() => setHandleUserNameMap({}));
    }, [projectId]);

    // 获取缺陷列表（后端要求必传 planId、projectId）
    const fetchDefectList = useCallback(async () => {
        if (!projectId) {
            toast.error('缺少项目信息，无法加载缺陷列表');
            return;
        }
        setLoading(true);
        try {
            const params: any = {
                planId,
                projectId,
                current: currentPage,
                pageSize,
                keyword: searchKeyword,
            };
            const res = await testPlanManagementService.getPlanDetailBugPage(params);
            const list = res.list || [];
            const totalCount = res.total || 0;
            setDefectList(list);
            setTotal(totalCount);
            onDefectCountChange?.(totalCount);
        } catch (error) {
            console.error('获取缺陷列表失败:', error);
            toast.error('获取缺陷列表失败');
        } finally {
            setLoading(false);
        }
    }, [planId, projectId, currentPage, pageSize, searchKeyword]);

    useEffect(() => {
        fetchDefectList();
    }, [fetchDefectList]);

    const handleUnlink = async (defectId: string) => {
        if (!confirm('确定要取消关联该缺陷吗？')) return;
        const toastId = toast.loading('正在取消关联...');
        try {
            await testPlanManagementService.testPlanCancelBug({
                testPlanId: planId,
                id: defectId
            });
            toast.success('已取消关联', { id: toastId });
            fetchDefectList();
        } catch (error) {
            console.error(error);
            toast.error('取消关联失败', { id: toastId });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': case '待处理': return 'text-blue-600 bg-blue-50';
            case 'IN_PROGRESS': case '处理中': return 'text-orange-600 bg-orange-50';
            case 'RESOLVED': case '已解决': return 'text-green-600 bg-green-50';
            case 'CLOSED': case '已关闭': return 'text-gray-600 bg-gray-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    /** 状态展示：优先用后端返回的 statusName，否则用状态码或常见中文兜底 */
    const STATUS_DISPLAY_FALLBACK: Record<string, string> = {
        OPEN: '待处理', IN_PROGRESS: '处理中', RESOLVED: '已解决', CLOSED: '已关闭',
        new: '待处理', NEW: '待处理',
    };
    const statusDisplay = (item: any) =>
        (item as any).statusName ?? item.status ?? STATUS_DISPLAY_FALLBACK[item?.status] ?? item?.status ?? '-';

    /** 从列表项取优先级：后端可能返回 severity，或兼容 priority / customFields */
    const priorityValue = (item: any) =>
        item?.severity ?? item?.priority ?? (item?.customFields?.find((c: any) => (c?.id ?? c?.fieldId) === 'severity')?.value);

    return (
        <div className="h-[600px] border border-gray-200 rounded-lg overflow-hidden bg-white w-full">
            <div className="flex flex-col h-full overflow-hidden bg-white">
                <div className="p-2.5 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2 flex-1 max-w-[360px] pl-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <Input
                                placeholder="通过 ID 或名称搜索"
                                className="h-7 pl-8 text-[11px] border-gray-200 bg-gray-50/30 focus:bg-white transition-all rounded-sm"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchDefectList()}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <Button
                                size="sm"
                                className="h-8 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                                onClick={() => setAssociateBugOpen(true)}
                            >
                                <LinkIcon className="w-3.5 h-3.5" /> 关联缺陷
                            </Button>
                        )}

                        <Button variant="outline" size="sm" className="h-8 text-[11px] border-gray-200 text-gray-600 gap-1.5">
                            <Filter className="w-3.5 h-3.5" /> 筛选
                        </Button>

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={fetchDefectList}>
                            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
                    <Table className="text-sm">
                        <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-100">
                            <TableRow className="hover:bg-transparent border-none h-9">
                                <TableHead className="w-[40px] px-2 text-center">
                                    <Checkbox className="rounded-[2px] opacity-60" />
                                </TableHead>
                                <TableHead className="w-[100px] font-medium text-gray-500 text-xs">ID</TableHead>
                                <TableHead className="min-w-[200px] font-medium text-gray-500 text-xs">缺陷名称</TableHead>
                                <TableHead className="w-[100px] font-medium text-gray-500 text-xs">优先级</TableHead>
                                <TableHead className="w-[100px] font-medium text-gray-500 text-xs">状态</TableHead>
                                <TableHead className="w-[120px] font-medium text-gray-500 text-xs">处理人</TableHead>
                                <TableHead className="w-[140px] font-medium text-gray-500 text-xs">创建时间</TableHead>
                                <TableHead className="w-[120px] text-center font-medium text-gray-500 text-xs">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-64 text-center">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                                    </TableCell>
                                </TableRow>
                            ) : defectList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-64 text-center">
                                        <div className="text-gray-400 flex flex-col items-center gap-2">
                                            <Bug className="w-10 h-10 opacity-20" />
                                            <span>暂无关联缺陷</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                defectList.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-[#f2f3f5]/50 group transition-colors border-b border-gray-50 h-11">
                                        <TableCell className="px-2 text-center">
                                            <Checkbox className="rounded-[2px] border-gray-300" />
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                type="button"
                                                className="text-blue-600 font-normal cursor-pointer hover:underline decoration-blue-600/30 text-xs text-left"
                                                onClick={() => setDetailBugId(item.id)}
                                            >
                                                {item.num}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-gray-700 truncate max-w-[320px] font-normal text-xs" title={item.title}>
                                                {item.title}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${getPriorityColor(priorityValue(item))} border-0 text-xs font-normal`}>
                                                {getPriorityLabel(priorityValue(item))}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusColor(statusDisplay(item))} border-0 text-xs font-normal`}>
                                                {statusDisplay(item)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-xs">
                                            {(item as any).handleUserName ?? (item.handleUser && handleUserNameMap[item.handleUser]) ?? (item as any).handle_user ?? item.handleUser ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-gray-500 tabular-nums font-mono text-xs">
                                            {formatCreateTime(item.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-3">
                                                <span
                                                    className="text-blue-600 cursor-pointer hover:text-blue-700 font-normal hover:underline decoration-blue-200 text-xs"
                                                    onClick={() => setDetailBugId(item.id)}
                                                >
                                                    查看
                                                </span>
                                                <span className="text-gray-300">|</span>
                                                <span
                                                    className="text-blue-600 cursor-pointer hover:text-blue-700 font-normal hover:underline decoration-blue-200 text-xs"
                                                    onClick={() => handleUnlink(item.id)}
                                                >
                                                    取消关联
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

            <AssociateBugDialog
                open={associateBugOpen}
                onOpenChange={setAssociateBugOpen}
                planId={planId}
                projectId={projectId}
                onSuccess={() => {
                    fetchDefectList();
                    onRefresh?.();
                }}
            />
            <BugDetailDrawer
                open={!!detailBugId}
                onOpenChange={(open) => !open && setDetailBugId(null)}
                bugId={detailBugId || ''}
                onRefresh={fetchDefectList}
            />
        </div>
    );
}
