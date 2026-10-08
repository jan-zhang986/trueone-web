/**
 * Bug 管理页面
 * 对标老版本 aegis-next-server bug-management/index.vue 的完整功能
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bug, Plus, Search, RefreshCw, MoreVertical, Edit, Download, RefreshCcw, ChevronDown } from 'lucide-react';
import { bugManagementService, requirementQualityService } from '@/services';
import { FEISHU_BUG_HOMEPAGE_URL, getFeishuDefectDetailUrl } from '@/services/bug-management/constants/feishu-defect-url';
import { getPriorityLabel } from '@/services/bug-management/constants/bug-priority';
import { BUG_STATUS_OPTIONS } from '@/services/bug-management/constants/bug-status';
import { useUser } from '@/contexts/UserContext';
import { CreateBugDialog } from '@/components/features/test-plan/CreateBugDialog';
import { BugDetailDrawer } from '@/components/features/bug-management/BugDetailDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { ComingSoon } from '@/components/common/ComingSoon';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

const SHOW_COMING_SOON = false;

interface BugCustomField {
    id?: string;
    value?: string;
}

interface BugItem {
    id: string;
    num: string;
    title: string;
    name?: string;
    status?: string;
    statusName?: string;
    priority?: string;
    severity?: string;
    handleUser?: string;
    handleUserName?: string;
    relationCaseCount?: number;
    platform?: string;
    createUser?: string;
    createUserName?: string;
    createdAt?: number;
    updatedAt?: number;
    tags?: string[];
    customFields?: BugCustomField[];
    feishuStoryId?: string;
    feishuStoryName?: string;
    /** 飞书缺陷 ID，用于跳转飞书详情/编辑页 */
    platformBugId?: string;
}

function getSeverity(bug: BugItem): string | undefined {
    return bug.severity ?? bug.customFields?.find((f) => f.id === 'severity')?.value;
}

// 提取出来的状态颜色映射逻辑
const getStatusColor = (status?: string) => {
    const m: Record<string, string> = {
        // 缺陷状态枚举（与 bug-status 常量一致）
        '待处理': 'bg-blue-100 text-blue-800',
        '新建': 'bg-blue-100 text-blue-800',
        '待确认': 'bg-sky-100 text-sky-800',
        '处理中': 'bg-purple-100 text-purple-800',
        '已解决': 'bg-green-100 text-green-800',
        '再次打开': 'bg-orange-100 text-orange-800',
        '已关闭': 'bg-gray-100 text-gray-800',
        '暂不修复': 'bg-amber-100 text-amber-800',
        '拒绝(驳回)': 'bg-red-100 text-red-800',
        '已验证': 'bg-emerald-100 text-emerald-800',
        '已终止': 'bg-slate-100 text-slate-700',
        // 兼容旧英文/键值
        'New': 'bg-blue-100 text-blue-800', 'Open': 'bg-yellow-100 text-yellow-800',
        'In Progress': 'bg-purple-100 text-purple-800', 'Resolved': 'bg-green-100 text-green-800',
        'Closed': 'bg-gray-100 text-gray-800', 'Reopened': 'bg-orange-100 text-orange-800',
        'new': 'bg-blue-100 text-blue-800', 'in_progress': 'bg-purple-100 text-purple-800',
        'resolved': 'bg-green-100 text-green-800', 'rejected': 'bg-red-100 text-red-800',
        'closed': 'bg-gray-100 text-gray-800',
    };
    return m[status || ''] || 'bg-gray-100 text-gray-800';
};

function InlineBugStatusSelect({
    bug,
    allOptions,
    statusUpdatingId,
    onStatusChange,
}: {
    bug: BugItem;
    allOptions: readonly { value: string; label: string }[];
    statusUpdatingId: string | null;
    onStatusChange: (bug: BugItem, newStatus: string) => void;
}) {
    const [validOptions, setValidOptions] = useState<{ value: string; label: string }[] | null>(null);
    const [optionsLoading, setOptionsLoading] = useState(false);

    const currentStatusValue =
        bug.status || allOptions.find((o) => o.label === bug.statusName)?.value || '';
    const currentLabel =
        allOptions.find((o) => o.value === currentStatusValue)?.label ||
        bug.statusName ||
        bug.status ||
        '-';
    const displayOptions = validOptions || allOptions;

    const fetchValidStatuses = async () => {
        setOptionsLoading(true);
        try {
            const res: any = await bugManagementService.getBugDetail(bug.id);
            const detail = res?.data !== undefined ? res.data : res;
            if (!detail?.projectId || !detail?.templateId) {
                setValidOptions(null);
                return;
            }

            const tplRes: any = await bugManagementService.getTemplateDetailInfo({
                id: detail.templateId,
                projectId: detail.projectId,
                fromStatusId: currentStatusValue,
                platformBugKey: detail.platformBugId || detail.id,
            });
            const data = tplRes?.data ?? tplRes;
            if (data?.customFields) {
                const statusField = data.customFields.find(
                    (f: any) =>
                        f.fieldId === 'status' || f.id === 'status' || f.fieldKey === 'status'
                );
                if (statusField?.options) {
                    setValidOptions(
                        statusField.options.map((o: any) => ({
                            value: o.value,
                            label: o.text || o.label || o.value,
                        }))
                    );
                    return;
                }
            }
            setValidOptions(null);
        } catch (e) {
            console.error('Failed to fetch inline status option', e);
            setValidOptions(null);
        } finally {
            setOptionsLoading(false);
        }
    };

    return (
        <Select
            value={currentStatusValue}
            onOpenChange={(open) => {
                if (open) fetchValidStatuses();
            }}
            onValueChange={(val) => onStatusChange(bug, val)}
            disabled={statusUpdatingId === String(bug.id)}
        >
            <SelectTrigger className="h-7 px-0 border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 [&_svg]:hidden justify-center">
                <Badge
                    className={cn(
                        'border-0 font-normal w-full justify-center',
                        getStatusColor(currentLabel)
                    )}
                    variant="secondary"
                >
                    {currentLabel}
                </Badge>
            </SelectTrigger>
            <SelectContent>
                {optionsLoading && !validOptions && (
                    <SelectItem value={currentStatusValue || '__loading__'} disabled>
                        加载中...
                    </SelectItem>
                )}
                {!optionsLoading &&
                    displayOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="justify-center">
                            <Badge
                                className={cn(
                                    'border-0 font-normal w-full justify-center',
                                    getStatusColor(opt.label),
                                )}
                                variant="secondary"
                            >
                                {opt.label}
                            </Badge>
                        </SelectItem>
                    ))}
            </SelectContent>
        </Select>
    );
}

export function BugManagementPage() {
    const { user } = useUser();
    const currentUserName = user?.name || user?.nickname || (typeof window !== 'undefined' ? localStorage.getItem('currentuser') : null) || '';

    if (SHOW_COMING_SOON) {
        return <ComingSoon title="缺陷管理即将开放" description="缺陷管理功能正在开发中，敬请期待..." />;
    }

    const [loading, setLoading] = useState(false);
    const [bugList, setBugList] = useState<BugItem[]>([]);
    const [selectedBugs, setSelectedBugs] = useState<string[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [searchParams] = useSearchParams();
    const projectId = localStorage.getItem('currentProjectId') || '';

    // 筛选项：处理人、状态、需求，默认均为「全部」
    const [filterHandleUser, setFilterHandleUser] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterRequirement, setFilterRequirement] = useState<string>('');
    const [headerOptions, setHeaderOptions] = useState<{
        handleUserOption: { value: string; text: string }[];
        statusOption?: { value: string; text: string }[];
    } | null>(null);
    const [requirementOptions, setRequirementOptions] = useState<{ id: string; name: string }[]>([]);
    const [requirementDropdownOpen, setRequirementDropdownOpen] = useState(false);
    const [requirementSearchKeyword, setRequirementSearchKeyword] = useState('');
    const [requirementSelectedName, setRequirementSelectedName] = useState(''); // 选中项名称（便于关闭后仍能展示）
    const requirementInputRef = useRef<HTMLInputElement>(null);
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 创建/编辑对话框状态
    const [dialogOpen, setDialogOpen] = useState(false);
    const [createDropdownOpen, setCreateDropdownOpen] = useState(false); // 创建按钮下拉：仅悬停展示
    const createDropdownLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const createDropdownOpenTimeRef = useRef<number>(0); // 刚打开时忽略 leave，避免闪烁
    const [editBugId, setEditBugId] = useState<string | undefined>();

    // 详情抽屉状态
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailBugId, setDetailBugId] = useState('');

    // 删除确认弹窗：支持勾选「同步删除飞书缺陷」
    const [deleteConfirmBug, setDeleteConfirmBug] = useState<BugItem | null>(null);
    const [deleteFeishuChecked, setDeleteFeishuChecked] = useState(false);
    // 行内状态更新 loading 标记
    const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

    const fetchBugList = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const filter: Record<string, string[]> = { platform: ['FEISHU'] };
            if (filterHandleUser) filter.handleUser = [filterHandleUser];
            if (filterStatus) filter.status = [filterStatus];
            if (filterRequirement) filter.feishuStoryId = [filterRequirement];
            const result = await bugManagementService.getBugList({
                projectId,
                current: currentPage,
                pageSize,
                keyword: debouncedKeyword || undefined,
                filter: Object.keys(filter).length > 0 ? filter : undefined,
            });
            const list = result?.list || result?.data || [];
            const totalCount = result?.total || list.length;
            setBugList(list);
            setTotal(totalCount);
            const storyIds = [...new Set((list as BugItem[]).map((b) => b.feishuStoryId).filter(Boolean))] as string[];
            if (storyIds.length > 0) {
                requirementQualityService.getStoryNamesByIds(storyIds).then((nameMap) => {
                    setBugList((prev) =>
                        prev.map((b) => ({
                            ...b,
                            feishuStoryName: b.feishuStoryId ? (nameMap[b.feishuStoryId] ?? undefined) : undefined,
                        }))
                    );
                }).catch(() => { });
            }
        } catch (err: any) {
            console.error('获取 Bug 列表失败:', err);
        } finally {
            setLoading(false);
        }
    };

    // 加载表头筛选项（处理人、状态）。飞书项目时状态从流程模板实时拉取，与项目配置一致
    useEffect(() => {
        if (!projectId) return;
        bugManagementService.getCustomOptionHeader(projectId).then((res: any) => {
            const raw = res?.handleUserOption || [];
            const handleUserOption = raw.map((o: { value?: string; text?: string; id?: string; name?: string }) => ({
                value: o.value ?? o.id ?? '',
                text: o.text ?? o.name ?? o.value ?? o.id ?? '',
            })).filter((o: { value: string }) => o.value);
            const rawStatus = res?.statusOption || [];
            const statusOption = rawStatus.map((o: { value?: string; text?: string }) => ({
                value: o.value ?? o.text ?? '',
                text: o.text ?? o.value ?? '',
            })).filter((o: { value: string }) => o.value);
            setHeaderOptions({ handleUserOption, statusOption });
        }).catch(() => { });
    }, [projectId]);

    // 加载需求筛选项（当前项目下的需求列表）
    useEffect(() => {
        if (!projectId) return;
        requirementQualityService.list({ projectId, current: 1, pageSize: 100 }).then((res) => {
            const list = res?.list ?? [];
            setRequirementOptions(Array.isArray(list) ? list.map((item: { storyId: string; storyName?: string }) => ({ id: item.storyId, name: item.storyName ?? item.storyId })) : []);
        }).catch(() => setRequirementOptions([]));
    }, [projectId]);

    // 状态下拉选项：优先使用表头接口返回的流程状态（飞书项目实时拉取），否则用本地常量
    const statusOptionsForPage = useMemo(() => {
        const list = headerOptions?.statusOption;
        if (list?.length) {
            return list.map((o: { value: string; text: string }) => ({ value: o.value, label: o.text || o.value }));
        }
        return BUG_STATUS_OPTIONS;
    }, [headerOptions?.statusOption]);

    // 需求下拉展示列表：仅当前项目需求，输入关键词时在本地按名称/ID 过滤
    const displayedRequirementOptions = useMemo(() => {
        if (!requirementSearchKeyword.trim()) return requirementOptions;
        const k = requirementSearchKeyword.trim().toLowerCase();
        return requirementOptions.filter(
            (o) => (o.name && o.name.toLowerCase().includes(k)) || (o.id && o.id.toLowerCase().includes(k)),
        );
    }, [requirementOptions, requirementSearchKeyword]);

    useEffect(() => {
        fetchBugList();
    }, [currentPage, pageSize, projectId, filterHandleUser, filterStatus, filterRequirement, debouncedKeyword]);

    // 输入即时搜索：关键词变化后防抖 300ms 再更新 debouncedKeyword 并回到第一页
    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setDebouncedKeyword(searchKeyword);
            setCurrentPage(1);
            searchDebounceRef.current = null;
        }, 300);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchKeyword]);

    // URL 参数：id 打开详情，orgId/pId 设置组织与项目上下文
    useEffect(() => {
        const idFromUrl = searchParams.get('id');
        const orgIdFromUrl = searchParams.get('orgId');
        const pIdFromUrl = searchParams.get('pId') || searchParams.get('projectId');
        if (orgIdFromUrl) {
            localStorage.setItem('currentOrgId', orgIdFromUrl);
        }
        if (pIdFromUrl) {
            localStorage.setItem('currentProjectId', pIdFromUrl);
        }
        if (idFromUrl) {
            setDetailBugId(idFromUrl);
            setDetailOpen(true);
        }
    }, [searchParams]);

    // === 选择相关（id 统一转字符串，兼容接口返回 number） ===
    const toId = (id: string | number | undefined) => (id != null ? String(id) : '');
    const isAllSelected = bugList.length > 0 && selectedBugs.length === bugList.length;
    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        setSelectedBugs(checked === true ? bugList.map((b) => toId(b.id)) : []);
    };
    const handleSelectBug = (bugId: string | number, checked: boolean) => {
        const id = toId(bugId);
        setSelectedBugs(checked ? [...selectedBugs, id] : selectedBugs.filter((x) => x !== id));
    };

    // === 创建：默认打开平台侧弹窗；下拉提供「飞书创建」 ===
    const handleCreatePlatform = () => {
        setEditBugId(undefined);
        setDialogOpen(true);
    };
    const handleCreateFeishu = () => {
        window.open(FEISHU_BUG_HOMEPAGE_URL, '_blank');
    };

    // 统一的「跳转飞书缺陷详情」逻辑：优先用行数据里的 platformBugId，没有则查详情再取
    const openFeishuDefectByBug = async (bug: BugItem) => {
        const feishuId = bug.platformBugId;
        if (feishuId) {
            window.open(getFeishuDefectDetailUrl(feishuId), '_blank');
            return;
        }
        try {
            const res: any = await bugManagementService.getBugDetail(bug.id);
            const data = res?.data !== undefined ? res.data : res;
            const id = data?.platformBugId ?? data?.id ?? bug.id;
            const url = getFeishuDefectDetailUrl(String(id));
            if (url) window.open(url, '_blank');
        } catch {
            toast.error('获取缺陷信息失败');
        }
    };

    // === 编辑：打开平台侧编辑弹窗（不跳转飞书） ===
    const handleEdit = (bug: BugItem) => {
        setEditBugId(bug.id);
        setDialogOpen(true);
    };

    // === 详情 ===
    const handleShowDetail = (bug: BugItem) => {
        setDetailBugId(bug.id);
        setDetailOpen(true);
    };

    // === 从详情抽屉触发的编辑：打开平台侧编辑弹窗（不跳转） ===
    const handleDetailEdit = (id: string) => {
        setEditBugId(id);
        setDialogOpen(true);
        setDetailOpen(false); // 关闭详情抽屉，避免与弹窗叠在一起
    };
    const handleDetailDelete = async (id: string) => {
        const bug = bugList.find((b) => b.id === id);
        if (bug) {
            await openFeishuDefectByBug(bug);
            return;
        }
        // 行数据不存在时，退回用 id 拉详情
        try {
            const res: any = await bugManagementService.getBugDetail(id);
            const data = res?.data !== undefined ? res.data : res;
            const feishuId = data?.platformBugId ?? data?.id ?? id;
            const url = getFeishuDefectDetailUrl(String(feishuId));
            if (url) window.open(url, '_blank');
        } catch {
            toast.error('获取缺陷信息失败');
        }
    };

    // === 列表行删除：打开确认弹窗（弹窗内确定后再调接口） ===
    const handleDeleteRow = (bug: BugItem) => {
        setDeleteConfirmBug(bug);
        setDeleteFeishuChecked(false);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmBug) return;
        try {
            await bugManagementService.deleteSingleBug({
                id: deleteConfirmBug.id,
                deleteFeishu: deleteFeishuChecked,
            });
            toast.success('删除成功');
            if (detailBugId === deleteConfirmBug.id) setDetailOpen(false);
            setDeleteConfirmBug(null);
            fetchBugList();
        } catch (e: any) {
            toast.error(e?.message || '删除失败');
        }
    };

    // === 创建/编辑成功后刷新列表（立即 + 延迟一轮，尽量覆盖飞书回调落库的时间） ===
    const handleDialogSuccess = () => {
        fetchBugList();
        // 飞书缺陷写入存在一定延迟，这里再补一次延迟刷新，避免用户必须手动刷新才能看到新建缺陷
        setTimeout(() => {
            fetchBugList();
        }, 7000);
    };

    // 列表行内更新状态：点击状态展示枚举并同步到后端/飞书
    const handleInlineStatusChange = async (bug: BugItem, newStatus: string) => {
        if (!bug.id) return;
        setStatusUpdatingId(String(bug.id));
        try {
            const res: any = await bugManagementService.getBugDetail(bug.id);
            const detail = res?.data !== undefined ? res.data : res;
            if (!detail) return;
            const label = statusOptionsForPage.find((o) => o.value === newStatus)?.label ?? newStatus;

            const baseFields = detail.customFields ?? [];
            const hasStatus = baseFields.some((f: any) => f.id === 'status');
            const newCustomFields = hasStatus
                ? baseFields.map((f: any) =>
                    f.id === 'status'
                        ? { ...f, value: newStatus, text: JSON.stringify([label]) }
                        : f
                )
                : [...baseFields, { id: 'status', value: newStatus, text: JSON.stringify([label]) }];

            await bugManagementService.updateBug({
                request: {
                    id: detail.id,
                    projectId: detail.projectId,
                    templateId: detail.templateId,
                    customFields: newCustomFields,
                },
                fileList: [],
            });

            toast.success('状态已更新');
            fetchBugList();
        } catch (err: any) {
            toast.error(err?.message || '状态更新失败');
        } finally {
            setStatusUpdatingId(null);
        }
    };

    // 提取出来的状态颜色映射逻辑
    const getStatusColor = (status?: string) => {
        const m: Record<string, string> = {
            // 缺陷状态枚举（与 bug-status 常量一致）
            '待处理': 'bg-blue-100 text-blue-800',
            '新建': 'bg-blue-100 text-blue-800',
            '待确认': 'bg-sky-100 text-sky-800',
            '处理中': 'bg-purple-100 text-purple-800',
            '已解决': 'bg-green-100 text-green-800',
            '再次打开': 'bg-orange-100 text-orange-800',
            '已关闭': 'bg-gray-100 text-gray-800',
            '暂不修复': 'bg-amber-100 text-amber-800',
            '拒绝(驳回)': 'bg-red-100 text-red-800',
            '已验证': 'bg-emerald-100 text-emerald-800',
            '已终止': 'bg-slate-100 text-slate-700',
            // 兼容旧英文/键值
            'New': 'bg-blue-100 text-blue-800', 'Open': 'bg-yellow-100 text-yellow-800',
            'In Progress': 'bg-purple-100 text-purple-800', 'Resolved': 'bg-green-100 text-green-800',
            'Closed': 'bg-gray-100 text-gray-800', 'Reopened': 'bg-orange-100 text-orange-800',
            'new': 'bg-blue-100 text-blue-800', 'in_progress': 'bg-purple-100 text-purple-800',
            'resolved': 'bg-green-100 text-green-800', 'rejected': 'bg-red-100 text-red-800',
            'closed': 'bg-gray-100 text-gray-800',
        };
        return m[status || ''] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">
            <Card className="flex-1 flex flex-col m-4 min-h-0 flex-shrink-0">
                <CardContent className="flex-1 flex flex-col p-4 min-h-0">
                    {/* 搜索和操作栏 */}
                    <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
                        <div className="flex items-center gap-2 flex-1 max-w-3xl flex-nowrap min-w-0">
                            <div className="relative w-[160px] shrink-0">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    placeholder="搜索 Bug ID、标题..."
                                    className="pl-10"
                                />
                            </div>
                            <span className="text-muted-foreground text-sm whitespace-nowrap">处理人：</span>
                            <Select
                                value={filterHandleUser || '__all__'}
                                onValueChange={(v) => {
                                    setFilterHandleUser(v === '__all__' ? '' : v);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-[140px]" aria-label="处理人">
                                    <SelectValue placeholder="处理人" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">全部</SelectItem>
                                    {filterHandleUser && !(headerOptions?.handleUserOption || []).some((o) => o.value === filterHandleUser) && (
                                        <SelectItem value={filterHandleUser}>{currentUserName || '我（当前用户）'}</SelectItem>
                                    )}
                                    {(headerOptions?.handleUserOption || []).map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{o.text}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-muted-foreground text-sm whitespace-nowrap">状态：</span>
                            <Select
                                value={filterStatus || '__all__'}
                                onValueChange={(v) => {
                                    setFilterStatus(v === '__all__' ? '' : v);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-[120px]" aria-label="状态">
                                    <SelectValue placeholder="状态" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">全部</SelectItem>
                                    {statusOptionsForPage.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-muted-foreground text-sm whitespace-nowrap">需求：</span>
                            <Popover
                                open={requirementDropdownOpen}
                                onOpenChange={(open) => {
                                    setRequirementDropdownOpen(open);
                                    if (!open) setRequirementSearchKeyword('');
                                }}
                            >
                                <PopoverAnchor asChild>
                                    <div
                                        role="combobox"
                                        aria-expanded={requirementDropdownOpen}
                                        aria-haspopup="listbox"
                                        aria-label="需求"
                                        className={cn(
                                            'flex h-9 w-[160px] cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                                        )}
                                        onClick={() => {
                                            if (!requirementDropdownOpen) {
                                                setRequirementDropdownOpen(true);
                                                setRequirementSearchKeyword('');
                                                setTimeout(() => requirementInputRef.current?.focus(), 0);
                                            }
                                        }}
                                    >
                                        <Input
                                            ref={requirementInputRef}
                                            aria-label="需求"
                                            placeholder="全部"
                                            readOnly={!requirementDropdownOpen}
                                            value={
                                                requirementDropdownOpen
                                                    ? requirementSearchKeyword
                                                    : filterRequirement
                                                        ? (
                                                            requirementOptions.find((o) => o.id === filterRequirement)?.name
                                                            ?? (requirementSelectedName || filterRequirement)
                                                        )
                                                        : '全部'
                                            }
                                            onChange={(e) => {
                                                if (requirementDropdownOpen) setRequirementSearchKeyword(e.target.value);
                                            }}
                                            className="h-auto border-0 p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                        />
                                        <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                                    </div>
                                </PopoverAnchor>
                                <PopoverContent
                                    className="w-[260px] p-0"
                                    align="start"
                                    onOpenAutoFocus={(e) => {
                                        e.preventDefault();
                                        requirementInputRef.current?.focus();
                                    }}
                                >
                                    <Command shouldFilter={false}>
                                        <CommandList>
                                            <CommandEmpty>暂无匹配需求</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem value="__all__" onSelect={() => { setFilterRequirement(''); setRequirementSelectedName(''); setCurrentPage(1); setRequirementDropdownOpen(false); }}>
                                                    全部
                                                </CommandItem>
                                                {filterRequirement && !requirementOptions.some((o) => o.id === filterRequirement) && (
                                                    <CommandItem value={filterRequirement} onSelect={() => setRequirementDropdownOpen(false)}>
                                                        当前选中
                                                    </CommandItem>
                                                )}
                                                {displayedRequirementOptions.map((o) => (
                                                    <CommandItem
                                                        key={o.id}
                                                        value={o.id}
                                                        onSelect={() => { setFilterRequirement(o.id); setRequirementSelectedName(o.name || o.id); setCurrentPage(1); setRequirementDropdownOpen(false); }}
                                                    >
                                                        {o.name || o.id}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" size="icon" onClick={fetchBugList} disabled={loading} title="刷新列表">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        <div
                            className="relative flex items-center gap-2 flex-shrink-0"
                            onMouseEnter={() => {
                                if (createDropdownLeaveTimerRef.current) {
                                    clearTimeout(createDropdownLeaveTimerRef.current);
                                    createDropdownLeaveTimerRef.current = null;
                                }
                                createDropdownOpenTimeRef.current = Date.now();
                                setCreateDropdownOpen(true);
                            }}
                            onMouseLeave={() => {
                                if (Date.now() - createDropdownOpenTimeRef.current < 200) return;
                                createDropdownLeaveTimerRef.current = setTimeout(() => setCreateDropdownOpen(false), 300);
                            }}
                        >
                            <Popover open={createDropdownOpen} onOpenChange={(open) => { if (!open) setCreateDropdownOpen(false); }}>
                                <PopoverAnchor asChild>
                                    <Button className="gap-2" onClick={handleCreatePlatform}>
                                        <Plus className="w-4 h-4" />
                                        创建 Bug
                                        <ChevronDown className="w-4 h-4 opacity-70" />
                                    </Button>
                                </PopoverAnchor>
                                <PopoverContent
                                    align="end"
                                    sideOffset={4}
                                    className="w-[120px] p-1"
                                    onPointerEnter={() => {
                                        if (createDropdownLeaveTimerRef.current) {
                                            clearTimeout(createDropdownLeaveTimerRef.current);
                                            createDropdownLeaveTimerRef.current = null;
                                        }
                                        setCreateDropdownOpen(true);
                                    }}
                                    onPointerLeave={() => {
                                        createDropdownLeaveTimerRef.current = setTimeout(() => setCreateDropdownOpen(false), 300);
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                        onClick={handleCreateFeishu}
                                    >
                                        飞书创建
                                    </button>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* 批量操作栏 */}
                    {selectedBugs.length > 0 && (
                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 flex-shrink-0">
                            <span className="text-sm text-blue-800">
                                已选择 <strong>{selectedBugs.length}</strong> 项
                            </span>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedBugs([])}>取消选择</Button>
                            </div>
                        </div>
                    )}

                    {/* 表格 */}
                    <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white">
                        <Table>
                            <TableHeader className="sticky top-0 bg-gray-50 z-10">
                                <TableRow>
                                    <TableHead className="w-12 cursor-default" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={(c) => handleSelectAll(c === 'indeterminate' ? true : c)}
                                        />
                                    </TableHead>
                                    <TableHead className="w-24">Bug ID</TableHead>
                                    <TableHead className="min-w-[200px]">标题</TableHead>
                                    <TableHead className="w-32">状态</TableHead>
                                    <TableHead className="w-32">优先级</TableHead>
                                    <TableHead className="w-32">处理人</TableHead>
                                    <TableHead className="w-28">需求</TableHead>
                                    <TableHead className="w-24">关联用例</TableHead>
                                    <TableHead className="w-24">平台</TableHead>
                                    <TableHead className="w-40">创建时间</TableHead>
                                    <TableHead className="w-32 text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center py-8">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                        </TableCell>
                                    </TableRow>
                                ) : bugList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center py-12">
                                            <Bug className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="text-gray-500">暂无 Bug 数据</p>
                                        </TableCell>
                                    </TableRow>
                                ) : bugList.map((bug) => (
                                    <TableRow key={bug.id} className="hover:bg-gray-50">
                                        <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default">
                                            <Checkbox
                                                checked={selectedBugs.includes(toId(bug.id))}
                                                onCheckedChange={(c) => handleSelectBug(bug.id, c === 'indeterminate' ? false : !!c)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <button className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm" onClick={() => handleShowDetail(bug)}>
                                                {bug.num}
                                            </button>
                                        </TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <div className="truncate cursor-pointer hover:text-blue-600" title={bug.title || bug.name} onClick={() => handleShowDetail(bug)}>
                                                {bug.title || bug.name || '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="w-32 text-center">
                                            <InlineBugStatusSelect
                                                bug={bug}
                                                allOptions={statusOptionsForPage}
                                                statusUpdatingId={statusUpdatingId}
                                                onStatusChange={handleInlineStatusChange}
                                            />
                                        </TableCell>
                                        <TableCell>{getPriorityLabel(getSeverity(bug))}</TableCell>
                                        <TableCell>{bug.handleUserName || bug.handleUser || '-'}</TableCell>
                                        <TableCell className="max-w-[140px] truncate" title={bug.feishuStoryName || bug.feishuStoryId || undefined}>
                                            {bug.feishuStoryName || bug.feishuStoryId || '-'}
                                        </TableCell>
                                        <TableCell>{bug.relationCaseCount ?? '-'}</TableCell>
                                        <TableCell>{bug.platform || '-'}</TableCell>
                                        <TableCell className="text-gray-600 text-sm">
                                            {bug.createdAt ? new Date(bug.createdAt).toLocaleString('zh-CN', {
                                                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                                            }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                                    onClick={() => handleShowDetail(bug)}
                                                >
                                                    详情
                                                </button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                    onClick={() => handleEdit(bug)}
                                                >
                                                    编辑
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                                                    onClick={() => handleDeleteRow(bug)}
                                                >
                                                    删除
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openFeishuDefectByBug(bug)}>
                                                            飞书详情
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openFeishuDefectByBug(bug)}>
                                                            飞书编辑
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
                        unitLabel="条"
                        className="mt-4 rounded-b-lg"
                    />
                </CardContent>
            </Card>

            {/* 创建/编辑 对话框 */}
            <CreateBugDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                projectId={projectId}
                bugId={editBugId}
                onSuccess={handleDialogSuccess}
            />

            {/* 详情抽屉 */}
            <BugDetailDrawer
                open={detailOpen}
                onOpenChange={setDetailOpen}
                bugId={detailBugId}
                onEdit={handleDetailEdit}
                onDelete={handleDetailDelete}
                onRefresh={fetchBugList}
            />

            {/* 删除确认弹窗：可选同步删除飞书缺陷 */}
            <Dialog open={!!deleteConfirmBug} onOpenChange={(open) => { if (!open) setDeleteConfirmBug(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>确定删除缺陷「{deleteConfirmBug?.title || deleteConfirmBug?.id || ''}」？</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center gap-2 py-2">
                        <Checkbox
                            id="delete-feishu"
                            checked={deleteFeishuChecked}
                            onCheckedChange={(v) => setDeleteFeishuChecked(v === true)}
                        />
                        <label htmlFor="delete-feishu" className="text-sm cursor-pointer select-none">
                            同步删除飞书缺陷
                        </label>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmBug(null)}>取消</Button>
                        <Button onClick={handleDeleteConfirm}>确定</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
