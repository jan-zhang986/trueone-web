import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { qualityWorkspaceService, type QualityWorkspaceStats, ANALYSIS_STATUS_LABEL, RELEASE_CONCLUSION_LABEL } from '@/services';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { QualityWorkspaceSheet } from '@/components/features/test-plan/QualityWorkspaceSheet';
import { PlanDetailAnalysis } from '@/components/features/test-plan/PlanDetailAnalysis';
import { WorkspaceLinkedDocumentsPanel } from '@/components/features/test-plan/WorkspaceLinkedDocumentsPanel';
import {
    buildWorkspaceDocumentMock,
    resolveWorkspaceDocumentDemoEnabled,
} from '@/components/features/test-plan/workspace-document-mock';
import { WorkspaceTestCasesPanel } from '@/components/features/test-plan/WorkspaceTestCasesPanel';
import { WorkspaceExecutionPanel } from '@/components/features/test-plan/WorkspaceExecutionPanel';
import { AiNativeWorkspaceView } from '@/components/features/quality-workspace/AiNativeWorkspaceView';
import { PageIndexWorkspaceDemo } from '@/components/features/quality-workspace/PageIndexWorkspaceDemo';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
    Loader2, Layers3, Target, Activity, ShieldCheck, RefreshCw,
    GitBranch, BookOpen, FlaskConical, PlayCircle, Settings2, Sparkles, FolderTree,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/** 适配 QualityWorkspace 模型的详情定义 */
interface QualityWorkspaceDetail {
    id: string;
    num: string;
    name: string;
    status: string;
    projectId: string;
    goal?: string;
    description?: string;
    feishuStoryId?: string;
    ownerId?: string;
    createTime: number;
    plannedStartTime?: number;
    plannedEndTime?: number;
    actualStartTime?: number;
    actualEndTime?: number;
    functionalCaseCount: number;
    apiCaseCount: number;
    apiScenarioCount: number;
    bugCount: number;
    targetName?: string;
    metadata?: Record<string, any>;
    scopeDefinition?: Record<string, any>;
}

/** 统一统计接口返回模型适配 */
const WORKSPACE_STATUS_META: Record<string, { label: string; className: string }> = {
    DRAFT: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
    TODO: { label: '待开始', className: 'bg-slate-100 text-slate-600' },
    IN_PROGRESS: { label: '进行中', className: 'bg-blue-50 text-blue-700' },
    DONE: { label: '已完成', className: 'bg-emerald-50 text-emerald-700' },
    ARCHIVED: { label: '已归档', className: 'bg-amber-50 text-amber-700' },
};

function normalizeStats(statsData: Record<string, any>): QualityWorkspaceStats {
    return {
        workspaceId: statsData.workspaceId,
        total: statsData.total || statsData.checkItemTotal || 0,
        todo: statsData.todo || 0,
        inProgress: statsData.inProgress || 0,
        passed: statsData.passed || 0,
        failed: statsData.failed || 0,
        blocked: statsData.blocked || 0,
        skipped: statsData.skipped || 0,
        passRate: (statsData.passRate || 0) * 100,
        executionRate: (statsData.executionRate || 0) * 100,
        actualStartTime: statsData.actualStartTime,
        allDone: statsData.allDone,
        analysisStatus: statsData.analysisStatus,
        reviewStatus: statsData.reviewStatus,
        checkItemTotal: statsData.checkItemTotal ?? statsData.total ?? 0,
        riskCount: statsData.riskCount ?? 0,
        blockedCount: statsData.blockedCount ?? statsData.blocked ?? 0,
        releaseConclusion: statsData.releaseConclusion,
    };
}

function getWorkspaceStatusMeta(status?: string) {
    return WORKSPACE_STATUS_META[status || 'DRAFT'] || { label: status || '草稿', className: 'bg-slate-100 text-slate-600' };
}

function getReleaseConclusionMeta(conclusion?: string) {
    const key = conclusion || 'NEED_ANALYSIS';
    const label = RELEASE_CONCLUSION_LABEL[key] || key;
    if (key === 'READY') return { label, className: 'text-emerald-600' };
    if (key === 'BLOCKED' || key === 'NOT_RECOMMENDED') return { label, className: 'text-rose-600' };
    if (key === 'CONDITIONAL') return { label, className: 'text-amber-600' };
    return { label, className: 'text-slate-600' };
}

function getWorkspaceIdFromPathname(pathname: string): string {
    const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    if (segments[0] !== 'quality-workspace' && segments[0] !== 'test-plan') return '';
    const last = segments[segments.length - 1];
    return last === 'config-report' ? '' : last;
}

type WorkspaceStep = 'document' | 'cases' | 'execution' | 'release';

const WORKSPACE_STEPS: Array<{ id: WorkspaceStep; label: string; hint: string; icon: typeof BookOpen }> = [
    { id: 'document', label: '测试分析', hint: '测试内部完善', icon: BookOpen },
    { id: 'cases', label: '测试用例', hint: '从分析生成用例', icon: FlaskConical },
    { id: 'execution', label: '联合评审', hint: '需求+分析+用例', icon: PlayCircle },
    { id: 'release', label: '上线准出', hint: '结论与放行', icon: GitBranch },
];

function normalizeWorkspaceStep(tab: string | null): WorkspaceStep {
    if (tab === 'document' || tab === 'cases' || tab === 'execution' || tab === 'release') return tab;
    if (tab === 'overview' || tab === 'analysis') return 'document';
    if (tab === 'review' || tab === 'tasks' || tab === 'risk') return 'execution';
    return 'document';
}

function getStepIndex(step: WorkspaceStep) {
    return WORKSPACE_STEPS.findIndex((item) => item.id === step);
}

export function QualityWorkspaceDetailPage() {
    const { planId: legacyPlanIdParam, workspaceId: workspaceIdParam } = useParams<{ planId?: string; workspaceId?: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const workspaceId = workspaceIdParam || legacyPlanIdParam || getWorkspaceIdFromPathname(location.pathname) || '';
    const detailTab = searchParams.get('detailTab');

    const [detail, setDetail] = useState<QualityWorkspaceDetail | null>(null);
    const [stats, setStats] = useState<QualityWorkspaceStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [editSheetOpen, setEditSheetOpen] = useState(false);
    const [activeStep, setActiveStep] = useState<WorkspaceStep>('document');
    const [demoPreview, setDemoPreview] = useState(() => resolveWorkspaceDocumentDemoEnabled(window.location.search));
    const [isAiNativeMode, setIsAiNativeMode] = useState(() => searchParams.get('mode') === 'ai-native');
    const demoInitRef = useRef(false);

    useEffect(() => {
        setActiveStep(normalizeWorkspaceStep(detailTab));
    }, [detailTab]);

    const goToStep = (step: WorkspaceStep) => {
        setActiveStep(step);
        const params = new URLSearchParams(searchParams);
        params.set('detailTab', step);
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    };

    const fetchDetail = useCallback(async (id: string) => {
        if (loading) return;
        setLoading(true);
        try {
            const [detailRes, statsRes] = await Promise.all([
                qualityWorkspaceService.getWorkspaceDetail(id),
                qualityWorkspaceService.getWorkspaceStats(id)
            ]);
            
            const workspaceData = (detailRes as any)?.data || detailRes;
            const statsData = (statsRes as any)?.data || statsRes;

            setDetail({
                ...workspaceData,
                id: workspaceData.workspaceId,
                num: workspaceData.workspaceId?.slice(0, 8) || 'N/A',
                functionalCaseCount: workspaceData.workItems?.length || workspaceData.workItemCount || 0,
            });
            
            setStats(normalizeStats(statsData));
        } catch (error) {
            console.error(error);
            toast.error('获取质量工作台详情失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (workspaceId && workspaceId !== 'quality-workspace' && workspaceId !== 'test-plan') {
            fetchDetail(workspaceId);
        }
    }, [workspaceId, fetchDetail]);

    const focusExecutionStep = () => {
        if (!detail) return;
        goToStep('execution');
    };

    const handleArchive = async () => {
        if (!detail) return;
        const toastId = toast.loading('正在归档质量工作台...');
        try {
            await qualityWorkspaceService.archiveWorkspace(detail.id);
            toast.success('质量工作台已归档', { id: toastId });
            fetchDetail(detail.id);
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || '归档失败', { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (!detail) return;
        if (!window.confirm(`确定删除质量工作台「${detail.name}」吗？`)) return;
        const toastId = toast.loading('正在删除质量工作台...');
        try {
            await qualityWorkspaceService.deleteWorkspace(detail.id);
            toast.success('质量工作台已删除', { id: toastId });
            navigate('/quality-workspace?menu=quality-workspace&tab=workspace');
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || '删除失败', { id: toastId });
        }
    };

    const workspaceStatusMeta = useMemo(() => getWorkspaceStatusMeta(detail?.status), [detail?.status]);
    const releaseConclusionMeta = useMemo(() => getReleaseConclusionMeta(stats?.releaseConclusion), [stats?.releaseConclusion]);
    const referenceBundle = useMemo(() => {
        const scope = detail?.scopeDefinition || {};
        const metadata = detail?.metadata || {};
        return {
            prdUrl: metadata.prdUrl || scope.prdUrl,
            designUrl: metadata.designUrl || scope.designUrl,
            apiDocUrl: metadata.apiDocUrl || scope.apiDocUrl,
            targetName: detail?.targetName || scope.targetName,
        };
    }, [detail]);

    useEffect(() => {
        setDemoPreview(resolveWorkspaceDocumentDemoEnabled(location.search));
    }, [location.search]);

    const toggleDemoMode = () => {
        const next = !demoPreview;
        setDemoPreview(next);
        const params = new URLSearchParams(searchParams);
        params.set('demo', next ? '1' : '0');
        params.delete('mock');
        params.set('detailTab', activeStep);
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    };

    if (loading && !detail) return (
        <div className="flex h-full w-full items-center justify-center bg-white/60 backdrop-blur-sm z-50">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 opacity-20" />
                    <Activity className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <span className="text-sm font-semibold text-slate-500 tracking-wider uppercase">Loading Workspace...</span>
            </div>
        </div>
    );

    if (!detail) return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#F8FAFC]">
             <div className="rounded-3xl bg-white shadow-xl shadow-slate-200/50 p-10 flex flex-col items-center max-w-sm text-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 ring-1 ring-slate-100">
                    <Target className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">质量工作台不存在</h3>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                    该质量工作台可能已被归档或删除，请返回列表重新选择。
                </p>
                <Button variant="default" className="mt-8 w-full h-11 bg-slate-900 rounded-xl" onClick={() => navigate('/quality-workspace')}>
                    返回质量工作台
                </Button>
             </div>
        </div>
    );

    if (isPageIndexMode) {
        return (
            <PageIndexWorkspaceDemo
                onBack={() => setIsPageIndexMode(false)}
            />
        );
    }

    if (isAiNativeMode) {
        return (
            <AiNativeWorkspaceView
                workspaceName={detail?.name || '用户登录改造 质量工作台'}
                onBack={() => setIsAiNativeMode(false)}
            />
        );
    }

    return (
        <TooltipProvider>
            <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] w-full overflow-hidden">
                <div className="bg-white px-8 py-2 flex items-center justify-end gap-2 border-b border-slate-100 shrink-0">
                    <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-500/20 gap-1.5"
                        onClick={() => setIsPageIndexMode(true)}
                    >
                        <FolderTree className="w-3.5 h-3.5" />
                        <span>体验 PageIndex 需求与用例闭环模式</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-lg border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium gap-1.5"
                        onClick={() => setIsAiNativeMode(true)}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>AI Native 全景导图模式</span>
                    </Button>
                    <Button
                        variant={demoPreview ? 'default' : 'outline'}
                        size="sm"
                        className={cn('h-7 text-xs rounded-lg', demoPreview ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'text-slate-500')}
                        onClick={toggleDemoMode}
                    >
                        {demoPreview ? '退出演示（看真实数据）' : '加载演示数据'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-blue-600" onClick={() => fetchDetail(workspaceId)}>
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                        刷新
                    </Button>
                </div>

                <div className="relative bg-white shrink-0 px-8 py-4 border-b border-slate-100">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100 shrink-0">
                                <Layers3 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h1 className="text-lg font-black text-slate-900 tracking-tight truncate leading-none">{detail.name}</h1>
                                    <Badge className={cn('border-0 px-1.5 py-0 rounded-md font-black text-[8px] tracking-widest uppercase', workspaceStatusMeta.className)}>
                                        {workspaceStatusMeta.label}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400">
                                    <div className="flex items-center gap-1"><Activity className="w-3 h-3" /> {stats?.passed || 0}/{stats?.checkItemTotal || stats?.total || 0} 用例已执行</div>
                                    <div className="w-px h-2 bg-slate-200" />
                                    <div className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" /> {(stats?.passRate || 0).toFixed(1)}% 通过率</div>
                                    {stats?.analysisStatus && (
                                        <>
                                            <div className="w-px h-2 bg-slate-200" />
                                            <div className="flex items-center gap-1 text-blue-600">
                                                <BookOpen className="w-3 h-3" />
                                                {ANALYSIS_STATUS_LABEL[stats.analysisStatus] || stats.analysisStatus}
                                            </div>
                                        </>
                                    )}
                                    {stats?.releaseConclusion && (
                                        <>
                                            <div className="w-px h-2 bg-slate-200" />
                                            <div className={cn('flex items-center gap-1', releaseConclusionMeta.className)}>
                                                <GitBranch className="w-3 h-3" />
                                                {releaseConclusionMeta.label}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Button size="sm" className="h-8 rounded-xl bg-slate-900 text-white font-black text-[11px] px-4 shadow-lg shadow-slate-900/10" onClick={focusExecutionStep}>
                                <ShieldCheck className="w-3.5 h-3.5 mr-2" /> 联合评审
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-slate-200" onClick={() => setEditSheetOpen(true)}>
                                <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                        </div>
                    </div>
                </div>

                    <div className="px-8 mt-1 shrink-0 border-b border-slate-100 bg-white">
                        <div className="flex flex-wrap items-center gap-2 py-3">
                            {WORKSPACE_STEPS.map((step, index) => {
                                const StepIcon = step.icon;
                                const active = activeStep === step.id;
                                const done = getStepIndex(activeStep) > index;
                                return (
                                    <button
                                        key={step.id}
                                        type="button"
                                        onClick={() => goToStep(step.id)}
                                        className={cn(
                                            'flex min-w-[140px] flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition max-w-[220px]',
                                            active ? 'border-blue-200 bg-blue-50 shadow-sm' : done ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50 hover:bg-white'
                                        )}
                                    >
                                        <div className={cn(
                                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black',
                                            active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'
                                        )}>
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <StepIcon className={cn('h-3.5 w-3.5', active ? 'text-blue-600' : 'text-slate-400')} />
                                                <span className={cn('text-xs font-black', active ? 'text-blue-700' : 'text-slate-700')}>{step.label}</span>
                                            </div>
                                            <p className="mt-0.5 truncate text-[10px] text-slate-400">{step.hint}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                
                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden p-6 w-full flex flex-col">
                    <div className="flex-1 bg-white rounded-[32px] border border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col relative">
                        <div className="flex-1 min-h-0 relative">
                            {activeStep === 'document' && (
                                <WorkspaceLinkedDocumentsPanel
                                    workspaceId={detail.id}
                                    projectId={detail.projectId}
                                    canEdit={detail.status !== 'ARCHIVED'}
                                    mode="edit"
                                    demoMode={demoPreview}
                                    referenceBundle={demoReferenceBundle}
                                    onToggleDemo={toggleDemoMode}
                                    onChanged={() => fetchDetail(detail.id)}
                                    onNavigateCases={() => goToStep('cases')}
                                />
                            )}
                            {activeStep === 'cases' && (
                                <WorkspaceTestCasesPanel
                                    workspaceId={detail.id}
                                    projectId={detail.projectId}
                                    canEdit={detail.status !== 'ARCHIVED'}
                                    onGenerated={() => fetchDetail(detail.id)}
                                    onGoDocument={() => goToStep('document')}
                                    onGoExecution={() => goToStep('execution')}
                                />
                            )}
                            {activeStep === 'execution' && (
                                <WorkspaceExecutionPanel
                                    workspaceId={detail.id}
                                    projectId={detail.projectId}
                                    spaceId={detail.scopeDefinition?.spaceId}
                                    canEdit={detail.status !== 'ARCHIVED'}
                                    reviewStatus={stats?.reviewStatus}
                                    demoMode={demoPreview}
                                    referenceBundle={demoReferenceBundle}
                                    onChanged={() => fetchDetail(detail.id)}
                                />
                            )}
                            {activeStep === 'release' && (
                                <PlanDetailAnalysis
                                    workspaceId={detail.id}
                                    projectId={detail.projectId}
                                    spaceId={detail.scopeDefinition?.spaceId}
                                    canEdit={detail.status !== 'ARCHIVED'}
                                    mode="release"
                                    releaseConclusion={stats?.releaseConclusion}
                                    onNavigateCases={() => goToStep('cases')}
                                    onNavigateExecution={() => goToStep('execution')}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <QualityWorkspaceSheet
                    open={editSheetOpen}
                    onOpenChange={setEditSheetOpen}
                    workspaceId={detail.id}
                    projectId={detail.projectId}
                    initialValues={detail}
                    onSuccess={() => fetchDetail(detail.id)}
                />
            </div>
        </TooltipProvider>
    );
}

export const TestPlanDetailPage = QualityWorkspaceDetailPage;
