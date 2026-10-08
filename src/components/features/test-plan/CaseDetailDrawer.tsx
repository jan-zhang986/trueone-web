/**
 * 用例详情抽屉
 * 参考 aegis-next-web 测试计划功能用例详情实现
 */

import { useState, useEffect, useMemo } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    CheckCircle, XCircle, MinusCircle, AlertCircle, Clock,
    User, Calendar, FileText, Link as LinkIcon, History, Loader2, AlertTriangle
} from 'lucide-react';
import { testPlanManagementService } from '@/services';
import { http } from '@/utils/request';
import { formatTimestampBeijing } from '@/utils/date';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextContent } from '@/components/features/case-management/components/RichTextContent';

/** 将 API 返回的 steps 转为数组，支持 JSON 字符串或对象数组 */
function normalizeSteps(steps: unknown): { desc: string; result: string }[] {
    if (Array.isArray(steps)) return steps;
    if (typeof steps === 'string' && steps.trim()) {
        try {
            const parsed = JSON.parse(steps);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

interface CaseDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    caseId: string;
    planId: string;
    projectId: string;
    onSuccess?: () => void;
}

export function CaseDetailDrawer({
    open,
    onOpenChange,
    caseId,
    planId,
    projectId,
    onSuccess
}: CaseDetailDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<any>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [executeResult, setExecuteResult] = useState<string>('');
    const [executeRemark, setExecuteRemark] = useState<string>('');
    const [executeHistory, setExecuteHistory] = useState<any[]>([]);
    const [associatedBugs, setAssociatedBugs] = useState<any[]>([]);
    const [executorNameMap, setExecutorNameMap] = useState<Map<string, string>>(new Map());

    const stepsList = useMemo(() => (detail ? normalizeSteps(detail.steps) : []), [detail]);

    useEffect(() => {
        const loadUserList = async () => {
            try {
                const response = await http.get('/system/user/list/public');
                let userList: { id: string; name: string }[] = [];
                if (Array.isArray(response) && response.length > 0) {
                    userList = response.map((u: any) => ({ id: u.id, name: u.name || u.email || u.id }));
                } else if (response && typeof response === 'object' && 'code' in response && (response as any).code === 100200 && Array.isArray((response as any).data)) {
                    userList = (response as any).data.map((u: any) => ({ id: u.id, name: u.name || u.email || u.id }));
                }
                if (userList.length > 0) {
                    const map = new Map<string, string>();
                    userList.forEach((u) => map.set(u.id, u.name));
                    setExecutorNameMap(map);
                }
            } catch (e) {
                console.error('加载用户列表失败:', e);
            }
        };
        loadUserList();
    }, []);

    useEffect(() => {
        if (!open || !caseId) {
            setDetail(null);
            setLoadError(null);
            return;
        }
        setDetail(null);
        setLoadError(null);
        setExecuteHistory([]);
        setAssociatedBugs([]);
        fetchDetail();
        fetchAssociatedBugs();
    }, [open, caseId]);

    const fetchDetail = async () => {
        if (!caseId) return;
        setLoading(true);
        setLoadError(null);
        try {
            const res = await testPlanManagementService.getTestPlanCaseDetail(caseId);
            setDetail(res);
            setExecuteResult(res?.lastExecResult || res?.lastReportStatus || '');
            if (planId) {
                try {
                    const historyRes = await testPlanManagementService.getExecuteHistory({
                        id: caseId,
                        testPlanId: planId,
                        caseId: res?.caseId ?? caseId,
                    });
                    const list = Array.isArray(historyRes) ? historyRes : (historyRes as any)?.list ?? (historyRes as any)?.records ?? [];
                    setExecuteHistory(Array.isArray(list) ? list : []);
                } catch (e) {
                    console.error('获取执行历史失败:', e);
                }
            }
        } catch (error: any) {
            console.error('获取用例详情失败:', error);
            setLoadError(error?.message || '获取用例详情失败');
            toast.error('获取用例详情失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchExecuteHistory = async () => {
        if (!caseId || !planId) return;
        try {
            const res = await testPlanManagementService.getExecuteHistory({
                id: caseId,
                testPlanId: planId,
                caseId: detail?.caseId ?? caseId,
            });
            const list = Array.isArray(res) ? res : (res as any)?.list ?? (res as any)?.records ?? [];
            setExecuteHistory(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('获取执行历史失败:', error);
        }
    };

    const fetchAssociatedBugs = async () => {
        if (!caseId) return;
        try {
            const res = await testPlanManagementService.getAssociatedBug({
                caseId,
                current: 1,
                pageSize: 100
            });
            setAssociatedBugs(res?.list || []);
        } catch (error) {
            console.error('获取关联缺陷失败:', error);
        }
    };

    const handleUpdateResult = async () => {
        const result = (executeResult ?? '').trim();
        if (!result) {
            toast.error('请选择执行结果');
            return;
        }
        // 与原项目一致：id 为计划用例关联 id，caseId 为功能用例 id；详情接口返回的 detail.id 为功能用例 id
        const planCaseId = caseId;
        const functionalCaseId = detail?.caseId ?? detail?.id;
        if (!functionalCaseId) {
            toast.error('缺少功能用例信息，无法提交');
            return;
        }
        const toastId = toast.loading('正在更新执行结果...');
        try {
            await testPlanManagementService.runFeatureCase({
                id: planCaseId,
                caseId: functionalCaseId,
                testPlanId: planId,
                projectId,
                lastExecResult: result,
                content: executeRemark ?? '',
            });
            toast.success('执行结果已更新', { id: toastId });
            onSuccess?.();
            fetchExecuteHistory();
        } catch (error) {
            console.error(error);
            toast.error('更新失败', { id: toastId });
        }
    };

    const getResultIcon = (result: string) => {
        switch (result) {
            case 'PASSED':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'FAILED':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'BLOCKED':
                return <MinusCircle className="w-4 h-4 text-orange-500" />;
            case 'SKIPPED':
                return <AlertCircle className="w-4 h-4 text-gray-400" />;
            default:
                return <Clock className="w-4 h-4 text-blue-500" />;
        }
    };

    const getResultColor = (result: string) => {
        switch (result) {
            case 'PASSED': return 'bg-green-50 text-green-600';
            case 'FAILED': return 'bg-red-50 text-red-600';
            case 'BLOCKED': return 'bg-orange-50 text-orange-600';
            case 'SKIPPED': return 'bg-gray-50 text-gray-600';
            default: return 'bg-blue-50 text-blue-600';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'P0': return 'bg-red-50 text-red-600';
            case 'P1': return 'bg-orange-50 text-orange-600';
            case 'P2': return 'bg-blue-50 text-blue-600';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[800px] w-full p-0 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : loadError ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 px-6">
                        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                        <p className="text-sm text-gray-600 text-center mb-4">{loadError}</p>
                        <Button variant="outline" size="sm" onClick={fetchDetail}>
                            重试
                        </Button>
                    </div>
                ) : !detail ? (
                    <div className="flex-1 flex items-center justify-center py-24 text-sm text-gray-500">
                        暂无数据
                    </div>
                ) : (
                    <>
                <SheetHeader className="px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <SheetTitle className="text-base font-normal">
                                <span className="text-gray-400 font-mono text-sm mr-2">[{detail?.num ?? '-'}]</span>
                                {detail?.name || '用例详情'}
                            </SheetTitle>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className={`${getPriorityColor(detail?.priority)} border-0 text-xs`}>
                                    {detail?.priority || 'P2'}
                                </Badge>
                                {detail?.tags?.map((tag: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue="detail" className="h-full flex flex-col">
                        <div className="px-6 border-b border-gray-100">
                            <TabsList className="bg-transparent border-0 h-10 px-0 gap-6">
                                <TabsTrigger
                                    value="detail"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-10 px-0 text-sm"
                                >
                                    用例详情
                                </TabsTrigger>
                                <TabsTrigger
                                    value="execute"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-10 px-0 text-sm"
                                >
                                    执行
                                </TabsTrigger>
                                <TabsTrigger
                                    value="bugs"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-10 px-0 text-sm gap-2"
                                >
                                    关联缺陷
                                    <Badge className="bg-gray-100 text-gray-600 border-0 rounded-full h-4 px-1.5 text-[10px]">
                                        {associatedBugs.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-10 px-0 text-sm"
                                >
                                    执行历史
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1">
                            <TabsContent value="detail" className="m-0 p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                创建人
                                            </div>
                                            <div className="text-sm text-gray-900">{detail?.createUser || '-'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                创建时间
                                            </div>
                                            <div className="text-sm text-gray-900 font-mono">{detail?.createdAt || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                                <FileText className="w-3 h-3" />
                                                用例描述 (备注)
                                            </div>
                                            <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100 leading-relaxed min-h-[60px]">
                                                {detail?.description?.trim() ? (
                                                    <RichTextContent
                                                        content={detail.description}
                                                        className="[&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-64 [&_img]:object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-gray-400">暂无备注</span>
                                                )}
                                            </div>
                                        </div>

                                        {detail?.caseEditType === 'TEXT' ? (
                                            <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <div className="text-xs text-gray-500 font-medium">文本描述</div>
                                                        <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100 leading-relaxed">
                                                            {detail?.textDescription?.trim() ? (
                                                                <RichTextContent
                                                                    content={detail.textDescription}
                                                                    className="[&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-64 [&_img]:object-contain"
                                                                />
                                                            ) : (
                                                                <span className="text-gray-400">暂无描述</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                {detail?.expectedResult?.trim() && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs text-gray-500 font-medium">预期结果</div>
                                                        <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100 leading-relaxed">
                                                            <RichTextContent
                                                                content={detail.expectedResult}
                                                                className="[&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-64 [&_img]:object-contain"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="text-xs text-gray-500 font-medium">测试步骤</div>
                                                <div className="space-y-3">
                                                    {stepsList.length > 0 ? stepsList.map((step: any, index: number) => (
                                                        <div key={index} className="border border-gray-200 rounded-md p-4 space-y-3 bg-white/50">
                                                            <div className="flex items-start gap-3">
                                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 shrink-0 mt-0.5">
                                                                    {index + 1}
                                                                </span>
                                                                <div className="flex-1 text-sm text-gray-800 leading-relaxed">
                                                                    <div className="font-medium text-gray-400 text-[10px] uppercase mb-1">步骤描述</div>
                                                                    {step.desc ?? step.step ?? ''}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-start gap-3 pl-9 border-t border-gray-50 pt-3">
                                                                <div className="flex-1 text-sm text-gray-600 leading-relaxed">
                                                                    <div className="font-medium text-gray-400 text-[10px] uppercase mb-1">预期结果</div>
                                                                    {step.result ?? step.expected ?? ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )) : <div className="text-sm text-gray-400 py-4 text-center border border-dashed rounded-md">暂无测试步骤</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="execute" className="m-0 p-6 space-y-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">执行结果 *</label>
                                        <Select value={executeResult} onValueChange={setExecuteResult}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="请选择执行结果" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PASSED">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                        <span>通过</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="FAILED">
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="w-4 h-4 text-red-500" />
                                                        <span>失败</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="BLOCKED">
                                                    <div className="flex items-center gap-2">
                                                        <MinusCircle className="w-4 h-4 text-orange-500" />
                                                        <span>阻塞</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="SKIPPED">
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle className="w-4 h-4 text-gray-400" />
                                                        <span>跳过</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">执行备注</label>
                                        <Textarea
                                            placeholder="请输入执行备注（选填）"
                                            className="min-h-[120px] resize-none"
                                            value={executeRemark}
                                            onChange={(e) => setExecuteRemark(e.target.value)}
                                        />
                                    </div>

                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={handleUpdateResult}
                                    >
                                        提交执行结果
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="bugs" className="m-0 p-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-600">已关联 {associatedBugs.length} 个缺陷</div>
                                        <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700">
                                            <LinkIcon className="w-3.5 h-3.5 mr-1" />
                                            关联缺陷
                                        </Button>
                                    </div>

                                    {associatedBugs.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400 text-sm">
                                            暂无关联缺陷
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {associatedBugs.map((bug) => (
                                                <div key={bug.id} className="border border-gray-200 rounded-md p-3 hover:border-blue-300 transition-colors">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs text-blue-600 font-mono">{bug.num}</span>
                                                                <Badge className="bg-red-50 text-red-600 border-0 text-xs">
                                                                    {bug.severity}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-gray-700">{bug.title}</div>
                                                        </div>
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700">
                                                            取消关联
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="m-0 p-6">
                                <div className="space-y-3">
                                    {executeHistory.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400 text-sm flex flex-col items-center gap-2">
                                            <History className="w-10 h-10 opacity-20" />
                                            <span>暂无执行历史</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {executeHistory.map((item, index) => (
                                                <div key={index} className="border-l-2 border-gray-200 pl-4 pb-4 relative">
                                                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-500" />
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            {getResultIcon(item.status)}
                                                            <Badge className={`${getResultColor(item.status)} border-0 text-xs`}>
                                                                {item.status}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-xs text-gray-400">{formatTimestampBeijing(item.createdAt)}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mb-1">执行人: {executorNameMap.get(item.createUser) ?? item.createUser ?? '-'}</div>
                                                    {item.content && (
                                                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                                                            {item.content}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
