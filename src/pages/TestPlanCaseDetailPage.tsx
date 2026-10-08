/**
 * 测试计划 - 用例详情页（双栏布局）
 * 参考 aegis-next-web 及设计图：左侧用例列表，右侧详情 + 步骤执行
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Search, ChevronRight, ChevronDown, Loader2, Edit, CheckCircle, XCircle, MinusCircle, AlertCircle, Link as LinkIcon, History, Plus } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RichTextContent } from '@/components/features/case-management/components/RichTextContent';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TruncateWithTooltip } from '@/components/ui/truncate-with-tooltip';
import { testPlanManagementService, caseManagementService } from '@/services';
import { http } from '@/utils/request';
import { formatTimestampBeijing } from '@/utils/date';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssociateBugDialog } from '@/components/features/test-plan/AssociateBugDialog';
import { CreateBugDialog } from '@/components/features/test-plan/CreateBugDialog';
import { FEISHU_BUG_HOMEPAGE_URL } from '@/services/bug-management/constants/feishu-defect-url';
import type { ModuleTreeNode } from '@/components/features/case-management/types';

/** 与后端 LastExecuteResults 一致：PENDING/SUCCESS/BLOCKED/ERROR，避免全部显示为未执行 */
const EXEC_RESULT_OPTIONS = [
    { value: 'PENDING', label: '未执行', icon: AlertCircle, color: 'text-gray-500' },
    { value: 'SUCCESS', label: '成功', icon: CheckCircle, color: 'text-green-600' },
    { value: 'BLOCKED', label: '阻塞', icon: MinusCircle, color: 'text-orange-600' },
    { value: 'ERROR', label: '失败', icon: XCircle, color: 'text-red-600' },
];
/** 提交结果时仅允许成功/阻塞/失败，不含未执行 */
const EXEC_RESULT_OPTIONS_FOR_SUBMIT = EXEC_RESULT_OPTIONS.filter((o) => o.value !== 'PENDING');

/** 阻塞原因选项（与 spotter BlockedReason 及设计图一致，两列展示） */
const BLOCKED_REASON_OPTIONS: { value: string; label: string; desc: string }[] = [
    { value: 'ENVIRONMENT', label: '环境因素', desc: '如服务器故障、网络波动' },
    { value: 'PREREQUISITE_DEPENDENCY', label: '前置依赖阻塞', desc: '关联任务/模块未完成交付' },
    { value: 'TECHNICAL_DIFFICULTY', label: '技术难点阻塞', desc: '遇到未预期的技术问题待解决' },
    { value: 'RESOURCE_SHORTAGE', label: '资源不足阻塞', desc: '如人力短缺、硬件/工具未到位' },
    { value: 'REQUIREMENT_UNCLEAR', label: '需求/方案不明确阻塞', desc: '待确认需求细节、方案方向' },
    { value: 'PROCESS_COMMUNICATION', label: '流程/沟通阻塞', desc: '审批流程延迟、跨团队沟通未对齐' },
];

const STEP_RESULT_OPTIONS = [
    { value: 'PASSED', label: '通过' },
    { value: 'FAILED', label: '失败' },
    { value: 'BLOCKED', label: '阻塞' },
];

const AUTO_NEXT_STORAGE_KEY = 'test-plan.case-detail.auto-next';

/** 步骤项：与 spotter tabDetail setStepData 一致，支持 actualResult/executeResult */
export type StepItem = { desc?: string; step?: string; result?: string; expected?: string; actualResult?: string; executeResult?: string };

function normalizeSteps(steps: unknown): StepItem[] {
    if (Array.isArray(steps)) return steps as StepItem[];
    if (typeof steps === 'string' && steps.trim()) {
        try {
            const parsed = JSON.parse(steps);
            return Array.isArray(parsed) ? (parsed as StepItem[]) : [];
        } catch {
            return [];
        }
    }
    return [];
}

/** 从详情 steps 解析出实际结果与步骤执行结果，用于回显（与 spotter setStepData 一致） */
function parseStepActualsAndResults(steps: unknown): { actuals: Record<number, string>; results: Record<number, string> } {
    const list = normalizeSteps(steps);
    const actuals: Record<number, string> = {};
    const results: Record<number, string> = {};
    list.forEach((item, index) => {
        if (item.actualResult != null && item.actualResult !== '') actuals[index] = String(item.actualResult);
        if (item.executeResult != null && item.executeResult !== '') results[index] = String(item.executeResult);
    });
    return { actuals, results };
}

import { ExecuteResultTag } from '@/components/features/test-plan/ExecuteResultTag';

function getResultBadge(result: string, size: 'sm' | 'md' = 'sm') {
    return <ExecuteResultTag result={result} size={size} />;
}


/** 将执行历史备注内容转为可展示的 HTML：支持 contentText、base64 编码的 HTML、或纯文本 */
function getExecutionContentHtml(item: { content?: string; contentText?: string }): string | null {
    const raw = item?.contentText ?? item?.content;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // 优先使用 contentText（原项目 v-html 使用该字段）
    if (item?.contentText) return item.contentText;
    // 尝试 base64 解码（备注可能是富文本/图片的 base64 HTML）
    try {
        const b64 = trimmed.replace(/\s/g, '');
        if (b64.length > 0 && /^[A-Za-z0-9+/=]+$/.test(b64) && b64.length % 4 === 0) {
            const decoded = atob(b64);
            if (decoded.includes('<') && decoded.includes('>')) return decoded;
        }
    } catch {
        // 非 base64 或解码失败，下面按普通字符串处理
    }
    // 若已是 HTML 片段则直接返回，否则转义后当纯文本显示（避免 XSS）
    if (trimmed.startsWith('<') && trimmed.includes('>')) return trimmed;
    return null;
}

/** 图片 base：优先 API 地址（与请求同源），否则当前页 origin */
function getImageBaseUrl(): string {
    if (typeof window === 'undefined') return '';
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    if (apiBase) return apiBase.replace(/\/$/, '');
    return `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
}

/** 将 HTML 中图片相对路径补全为完整 URL */
function rewriteImgSrcToFullUrl(html: string): string {
    const base = getImageBaseUrl();
    if (!base) return html;
    return html.replace(/\ssrc="\/([^"]*)"/g, (_, path) => ` src="${base}/${path}"`);
}

/** 带鉴权加载图片：用 http 拉取后转为 blob URL 显示，避免 <img> 请求无 token 导致破图 */
function useAuthImageSrc(containerRef: React.RefObject<HTMLDivElement | null>, html: string) {
    const blobUrlsRef = useRef<string[]>([]);
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !html) return;
        const imgs = el.querySelectorAll<HTMLImageElement>('img[src]');
        const revoke = () => {
            blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
            blobUrlsRef.current = [];
        };
        imgs.forEach((img) => {
            const url = img.getAttribute('src');
            if (!url || !url.includes('/attachment/')) return;
            http.get<Blob>(url, { responseType: 'blob' })
                .then((blob) => {
                    const blobUrl = URL.createObjectURL(blob as unknown as Blob);
                    blobUrlsRef.current.push(blobUrl);
                    img.src = blobUrl;
                })
                .catch(() => { });
        });
        return revoke;
    }, [html]);
}

/** 执行历史备注展示：有 HTML 时用 div 渲染，图片通过鉴权请求转 blob URL 显示 */
function ExecutionContentDisplay({ item }: { item: { content?: string; contentText?: string } }) {
    const containerRef = useRef<HTMLDivElement>(null);
    let html = getExecutionContentHtml(item);
    if (!html) {
        const raw = (item?.contentText ?? item?.content) ?? '';
        if (!raw) return null;
        return <div className="text-sm text-gray-600 bg-white/80 p-3 rounded-md border border-gray-100 mt-2 whitespace-pre-wrap break-words">{raw}</div>;
    }
    html = rewriteImgSrcToFullUrl(html);
    useAuthImageSrc(containerRef, html);
    return (
        <div
            ref={containerRef}
            className="text-sm text-gray-600 bg-white/80 p-3 rounded-md border border-gray-100 mt-2 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

/** 从详情/列表项中取执行结果（兼容 lastExecResult / lastExecuteResult / lastReportStatus） */
function getExecResultFromItem(item: Record<string, unknown> | null | undefined): string {
    if (!item) return '';
    return (
        (item.lastExecResult as string) ||
        (item.lastExecuteResult as string) ||
        (item.lastReportStatus as string) ||
        ''
    );
}

/** 从路径 /test-plan/:planId/feature-case/:caseId 解析出 planId、caseId（当前布局未用嵌套路由，useParams 取不到，需从 pathname 解析） */
function parsePlanAndCaseId(pathname: string): { planId: string; caseId: string } {
    const m = pathname.match(/^\/test-plan\/([^/]+)\/feature-case\/([^/]+)\/?$/);
    if (m) return { planId: m[1], caseId: m[2] };
    return { planId: '', caseId: '' };
}

/** 递归收集某模块及其所有子模块 ID（用于按模块筛选执行页左侧列表） */
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

export function TestPlanCaseDetailPage() {
    const paramsFromRoute = useParams<{ planId: string; caseId: string }>();
    const location = useLocation();
    const { planId, caseId } = useMemo(() => {
        const fromPath = parsePlanAndCaseId(location.pathname);
        return {
            planId: paramsFromRoute.planId ?? fromPath.planId,
            caseId: paramsFromRoute.caseId ?? fromPath.caseId,
        };
    }, [location.pathname, paramsFromRoute.planId, paramsFromRoute.caseId]);

    /** 从 URL query 解析模块过滤参数（由测试计划详情页点击执行时传入） */
    const { filterCollectionId, filterModuleId } = useMemo(() => {
        const sp = new URLSearchParams(location.search);
        return {
            filterCollectionId: sp.get('collectionId') ?? '',
            filterModuleId: sp.get('moduleId') ?? '',
        };
    }, [location.search]);
    const navigate = useNavigate();
    const [planDetail, setPlanDetail] = useState<{ id: string; num?: string; name: string; feishuStoryId?: string; projectId?: string } | null>(null);
    const [caseList, setCaseList] = useState<any[]>([]);
    const [caseListLoading, setCaseListLoading] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [lastExecResultFilter, setLastExecResultFilter] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const [detail, setDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('detail');
    const [executeResult, setExecuteResult] = useState<string>('PENDING');
    const [executeRemark, setExecuteRemark] = useState('');
    const [blockReason, setBlockReason] = useState<string>('');
    const [autoNext, setAutoNext] = useState(() => {
        try {
            const stored = localStorage.getItem(AUTO_NEXT_STORAGE_KEY);
            if (stored == null) return true; // 默认开启：执行后自动下一条
            return stored === 'true';
        } catch {
            return true;
        }
    });
    const [stepResults, setStepResults] = useState<Record<number, string>>({});
    const [stepActuals, setStepActuals] = useState<Record<number, string>>({});
    const [submitLoading, setSubmitLoading] = useState(false);
    const [executeHistory, setExecuteHistory] = useState<any[]>([]);
    const [associatedBugs, setAssociatedBugs] = useState<any[]>([]);
    const [associateBugOpen, setAssociateBugOpen] = useState(false);
    const [createBugOpen, setCreateBugOpen] = useState(false);
    /** 执行人 ID -> 用户名，用于执行历史展示 */
    const [executorNameMap, setExecutorNameMap] = useState<Map<string, string>>(new Map());
    /** 计划内模块树（MODULE 类型），用于执行页按模块+子级过滤左侧用例列表 */
    const [moduleTreeForFilter, setModuleTreeForFilter] = useState<ModuleTreeNode[]>([]);

    /** 始终指向最新 caseList，用于自动下一条时避免因 effect 重拉列表导致快照与当前页不一致 */
    const caseListRef = useRef<any[]>([]);
    useEffect(() => {
        caseListRef.current = caseList;
    }, [caseList]);

    /** 当前 URL 对应的 caseId，用于 fetchDetail 返回时校验避免竞态（旧请求覆盖新详情） */
    const caseIdRef = useRef<string>(caseId ?? '');
    useEffect(() => {
        caseIdRef.current = caseId ?? '';
    }, [caseId]);

    const stepsList = useMemo(() => (detail ? normalizeSteps(detail.steps) : []), [detail]);

    const fetchPlanDetail = useCallback(async () => {
        if (!planId) return;
        try {
            const res = await testPlanManagementService.getTestPlanDetail(planId);
            setPlanDetail(res);
        } catch (e) {
            console.error(e);
        }
    }, [planId]);

    /** 加载用户列表，用于执行历史中执行人 ID 映射为用户名 */
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

    /** 若从测试计划详情页按模块进入执行页，则加载该计划的模块树，用于展开子级 ID 做过滤 */
    useEffect(() => {
        if (!planId || !filterModuleId) return;
        const loadModuleTree = async () => {
            try {
                const res = await testPlanManagementService.getFeatureCaseModule({
                    testPlanId: planId,
                    treeType: 'MODULE',
                });
                const list = Array.isArray(res) ? res : [];
                setModuleTreeForFilter(list as ModuleTreeNode[]);
            } catch (e) {
                console.error('加载执行页模块树失败:', e);
                setModuleTreeForFilter([]);
            }
        };
        loadModuleTree();
    }, [planId, filterModuleId]);

    const fetchCaseList = useCallback(async () => {
        if (!planId) return;
        setCaseListLoading(true);
        try {
            const params: any = {
                testPlanId: planId,
                projectId: (planDetail as any)?.projectId || '',
                current: currentPage,
                pageSize,
                keyword: keyword || undefined,
                filter: { lastExecResult: lastExecResultFilter.length ? lastExecResultFilter : undefined },
            };
            // 若从测试计划详情页携带了模块/测试点过滤参数，则只加载对应范围内的用例
            if (filterCollectionId) {
                params.collectionId = filterCollectionId;
            } else if (filterModuleId) {
                // 按模块进入执行页时，需包含该模块及其子级下所有用例
                const moduleIds = moduleTreeForFilter.length
                    ? collectModuleAndOffspringIds(filterModuleId, moduleTreeForFilter)
                    : [filterModuleId];
                params.moduleIds = moduleIds;
                params.treeType = 'MODULE';
            }
            const res = await testPlanManagementService.getPlanDetailFeatureCaseList(params);
            setCaseList(res.list || []);
            setTotal(res.total || 0);
        } catch (e) {
            console.error(e);
            toast.error('加载用例列表失败');
        } finally {
            setCaseListLoading(false);
        }
    }, [planId, planDetail, currentPage, pageSize, keyword, lastExecResultFilter, filterCollectionId, filterModuleId, moduleTreeForFilter]);

    const fetchDetail = useCallback(async () => {
        if (!caseId) return;
        const requestedCaseId = caseId;
        setDetailLoading(true);
        try {
            const res = await testPlanManagementService.getTestPlanCaseDetail(requestedCaseId);
            // 仅当当前 URL 仍是该用例时再写 state，避免快速切换/自动下一条时旧请求覆盖新详情
            if (caseIdRef.current !== requestedCaseId) return;
            setDetail(res);
            // 执行时默认选中「通过(SUCCESS)」；若已执行过则按上次结果回显
            const last = (getExecResultFromItem(res) || '').trim();
            setExecuteResult(!last || last === 'PENDING' ? 'SUCCESS' : last);
            setBlockReason((res?.lastExecResult ?? res?.lastExecuteResult) === 'BLOCKED' ? (res?.blockReason ?? '') : '');
            // 与 spotter 一致：从详情 steps 回填实际结果与步骤执行结果（上次执行保存的数据）
            const { actuals, results } = parseStepActualsAndResults(res?.steps);
            setStepActuals(actuals);
            setStepResults(results);
            // 详情加载后再拉执行历史（需用到 res.caseId，原项目 POST 请求）
            if (planId) {
                try {
                    const historyRes = await testPlanManagementService.getExecuteHistory({
                        id: requestedCaseId,
                        testPlanId: planId,
                        caseId: res?.caseId ?? requestedCaseId,
                    });
                    const list = Array.isArray(historyRes) ? historyRes : (historyRes as any)?.list ?? (historyRes as any)?.records ?? [];
                    setExecuteHistory(Array.isArray(list) ? list : []);
                } catch (err) {
                    console.error(err);
                }
            }
        } catch (e) {
            if (caseIdRef.current !== requestedCaseId) return;
            console.error(e);
            toast.error('加载用例详情失败');
        } finally {
            if (caseIdRef.current === requestedCaseId) setDetailLoading(false);
        }
    }, [caseId, planId, planDetail]);

    const fetchExecuteHistory = useCallback(async () => {
        if (!planId || !caseId || !detail?.caseId) return;
        try {
            const res = await testPlanManagementService.getExecuteHistory({
                id: caseId,
                testPlanId: planId,
                caseId: detail.caseId,
            });
            const list = Array.isArray(res) ? res : (res as any)?.list ?? (res as any)?.records ?? [];
            setExecuteHistory(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error(e);
        }
    }, [planId, caseId, detail?.caseId]);

    const fetchAssociatedBugs = useCallback(async () => {
        if (!caseId || !detail?.caseId) return;
        const projectId = (planDetail as any)?.projectId || localStorage.getItem('currentProjectId') || '';
        if (!projectId) return;
        try {
            const res: any = await testPlanManagementService.getAssociatedBug({
                caseId: detail.caseId,
                testPlanCaseId: caseId,
                projectId,
                current: 1,
                pageSize: 100,
            });
            // 兼容多种返回：Pager{ list }、{ data: [] }、或直接为数组（部分接口 data 即数组）
            const list =
                res?.list ??
                res?.data?.list ??
                (Array.isArray(res?.data) ? res.data : null) ??
                (Array.isArray(res) ? res : []);
            setAssociatedBugs(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error(e);
        }
    }, [caseId, detail?.caseId, planDetail]);

    const handleDisassociateBug = async (bugRelationId: string) => {
        try {
            await testPlanManagementService.testPlanCancelBug({
                testPlanId: planId,
                id: bugRelationId,
            });
            toast.success('取消关联成功');
            fetchAssociatedBugs();
        } catch (e) {
            console.error(e);
            toast.error('取消关联失败');
        }
    };

    useEffect(() => {
        fetchPlanDetail();
    }, [fetchPlanDetail]);

    // 与 spotter 一致：先加载计划详情再拉取用例列表（首屏时 planDetail 为 null，若先请求列表会带空 projectId 导致列表为空）
    useEffect(() => {
        if (planId && planDetail !== null) {
            fetchCaseList();
        }
    }, [planId, planDetail, fetchCaseList]);

    useEffect(() => {
        if (caseId) {
            setDetail(null);
            fetchDetail();
        }
    }, [caseId, fetchDetail]);

    // planDetail 就绪后补拉关联缺陷（详情里已带 projectId 时在 fetchDetail 内已拉过）
    useEffect(() => {
        if (caseId && detail?.caseId && (planDetail as any)?.projectId) {
            fetchAssociatedBugs();
        }
    }, [caseId, detail?.caseId, planDetail, fetchAssociatedBugs]);

    const handleUploadImage = useCallback(
        async (file: File): Promise<string> => {
            const res: any = await caseManagementService.editorUploadFile({ fileList: [file] });
            let fileId: string | undefined;
            if (typeof res === 'string') fileId = res;
            else if (res?.data != null)
                fileId = typeof res.data === 'string' ? res.data : res.data?.id ?? res.data?.fileId;
            else if (res?.id) fileId = res.id;
            else if (res?.fileId) fileId = res.fileId;
            if (!fileId || typeof fileId !== 'string') throw new Error('上传失败：无法获取文件 ID');
            const projectId = (planDetail as any)?.projectId || localStorage.getItem('currentProjectId') || '';
            return `/attachment/download/file/${projectId}/${fileId}/true`;
        },
        [planDetail]
    );

    const buildCaseUrlWithCurrentQuery = (id: string) => {
        const qs = location.search;
        return `/test-plan/${planId}/feature-case/${id}${qs}`;
    };

    const handleSubmitResult = async () => {
        if (!planId || !caseId || !detail) return;
        const caseListSnapshot = caseList;
        const result = (executeResult ?? '').trim();
        if (!result || result === 'PENDING') {
            toast.error('请选择执行结果');
            return;
        }
        if (result === 'BLOCKED' && !blockReason) {
            toast.error('请选择阻塞原因');
            return;
        }
        // 与 aegis 一致：projectId 优先用计划详情，否则用当前项目
        const projectId = (planDetail as any)?.projectId || localStorage.getItem('currentProjectId') || '';
        if (!projectId) {
            toast.error('缺少项目信息，无法提交');
            return;
        }
        setSubmitLoading(true);
        try {
            // 与原项目一致：id 为计划用例关联 id（test_plan_functional_case.id），caseId 为功能用例 id；路由 param caseId 即为计划用例 id
            const planCaseId = caseId;
            const functionalCaseId = detail?.caseId ?? detail?.id;
            if (!functionalCaseId) {
                toast.error('缺少功能用例信息，无法提交');
                setSubmitLoading(false);
                return;
            }
            const stepExecutionResult = stepsList.map((step, index) => ({
                id: (step as any).id,
                num: index,
                desc: step.desc ?? step.step ?? '',
                result: step.result ?? step.expected ?? '',
                actualResult: stepActuals[index] != null && stepActuals[index] !== '' ? stepActuals[index] : null,
                executeResult: stepResults[index] != null && stepResults[index] !== '' ? stepResults[index] : null,
            }));
            const payload: Record<string, unknown> = {
                projectId,
                testPlanId: planId,
                lastExecResult: result,
                content: executeRemark ?? '',
                planCommentFileIds: [],
                notifier: '', // 与原项目 executeSubmit 一致：评论@的人 id，多个以 ; 隔开
                stepsExecResult: JSON.stringify(stepExecutionResult),
                isBlocked: result === 'BLOCKED',
                caseId: functionalCaseId,
                id: planCaseId,
            };
            if (result === 'BLOCKED' && blockReason) {
                payload.blockReason = blockReason;
            }
            await testPlanManagementService.runFeatureCase(payload as any);
            toast.success('提交成功');
            // 只刷新右侧详情与执行历史，不重新拉取左侧列表，避免列表滚动回顶部
            fetchDetail();
            fetchExecuteHistory();
            setCaseList((prev) =>
                prev.map((c) =>
                    String(c.id) === String(caseId) ? { ...c, lastExecResult: result, lastExecuteResult: result, blockReason: result === 'BLOCKED' ? blockReason : c.blockReason } : c
                )
            );
            setExecuteRemark('');
            setBlockReason('');
            if (autoNext) {
                let listForNext = caseListSnapshot.length > 0 ? caseListSnapshot : (caseListRef.current || []);
                let idx = listForNext.findIndex((c: any) => String(c.id) === String(caseId) || String(c.caseId) === String(caseId));
                if (idx === -1 && caseListRef.current?.length) {
                    listForNext = caseListRef.current;
                    idx = listForNext.findIndex((c: any) => String(c.id) === String(caseId) || String(c.caseId) === String(caseId));
                }
                if (idx >= 0 && idx < listForNext.length - 1) {
                    const next = listForNext[idx + 1];
                    navigate(buildCaseUrlWithCurrentQuery(next.id), { replace: false });
                } else if (idx === listForNext.length - 1 && currentPage < Math.max(1, Math.ceil(total / pageSize))) {
                    // 当前页最后一条：请求下一页并跳转到该页第一条
                    const nextPage = currentPage + 1;
                    try {
                        const nextParams: any = {
                            testPlanId: planId,
                            projectId: (planDetail as any)?.projectId || '',
                            current: nextPage,
                            pageSize,
                            keyword: keyword || undefined,
                            filter: { lastExecResult: lastExecResultFilter.length ? lastExecResultFilter : undefined },
                        };
                        if (filterCollectionId) {
                            nextParams.collectionId = filterCollectionId;
                        } else if (filterModuleId) {
                            const moduleIds = moduleTreeForFilter.length
                                ? collectModuleAndOffspringIds(filterModuleId, moduleTreeForFilter)
                                : [filterModuleId];
                            nextParams.moduleIds = moduleIds;
                            nextParams.treeType = 'MODULE';
                        }
                        const nextRes = await testPlanManagementService.getPlanDetailFeatureCaseList(nextParams);
                        const nextList = nextRes?.list || [];
                        if (nextList.length > 0) {
                            setCurrentPage(nextPage);
                            setCaseList(nextList);
                            setTotal(nextRes?.total ?? total);
                            navigate(buildCaseUrlWithCurrentQuery(nextList[0].id), { replace: false });
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        } catch (e) {
            console.error(e);
            toast.error('提交失败');
        } finally {
            setSubmitLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (!planId || !caseId) {
        return (
            <div className="flex flex-1 flex-col bg-gray-50 items-center justify-center gap-5 px-6 min-h-0">
                <p className="text-gray-500 text-sm text-center max-w-sm">缺少计划或用例参数，请从测试计划详情中点击用例进入。</p>
                <Button variant="outline" size="sm" className="rounded-md shadow-sm" onClick={() => navigate('/test-plan')}>
                    返回测试计划
                </Button>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex flex-col flex-1 min-h-0 bg-gray-50">
                {/* 面包屑 */}
                <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-2 text-sm text-gray-400 shrink-0">
                    <span
                        className="hover:text-blue-600 cursor-pointer transition-colors"
                        onClick={() => navigate('/test-plan')}
                    >
                        测试计划
                    </span>
                    <ChevronRight className="w-3 h-3 opacity-40" />
                    <span
                        className="hover:text-blue-600 cursor-pointer transition-colors"
                        onClick={() => {
                            const params = new URLSearchParams(location.search);
                            params.set('tab', 'featureCase');
                            navigate(`/test-plan/${planId}?${params.toString()}`);
                        }}
                    >
                        测试计划详情
                    </span>
                    <ChevronRight className="w-3 h-3 opacity-40" />
                    <span className="text-gray-600 font-medium">用例详情</span>
                </div>

                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* 左侧：用例列表 */}
                    <div className="w-[320px] shrink-0 flex flex-col border-r border-gray-200 bg-white">
                        <div className="p-4 border-b border-gray-50">
                            {planDetail && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="text-sm font-medium text-gray-900 truncate mb-3 px-1 cursor-default">
                                            <span className="text-gray-400 font-mono text-xs">[{planDetail.num}]</span>
                                            <span className="ml-1">{planDetail.name}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{`[${planDetail.num}]${planDetail.name}`}</TooltipContent>
                                </Tooltip>
                            )}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <Input
                                        placeholder="ID / 名称搜索"
                                        className="h-8 pl-8 text-xs rounded-md border-gray-200 focus:ring-1 focus:ring-blue-500/20"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchCaseList()}
                                    />
                                </div>
                                <Select
                                    value={lastExecResultFilter[0] ?? 'all'}
                                    onValueChange={(v) => setLastExecResultFilter(v === 'all' ? [] : [v])}
                                >
                                    <SelectTrigger className="w-[96px] h-8 text-xs rounded-md border-gray-200">
                                        <SelectValue placeholder="执行结果" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">执行结果</SelectItem>
                                        {EXEC_RESULT_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto min-h-0 py-2 px-2">
                            {caseListLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                                    <span className="text-xs text-gray-400">加载中...</span>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {caseList.map((item) => (
                                        <div
                                            key={item.id}
                                                className={`p-3 rounded-lg cursor-pointer transition-all duration-150 ${String(item.id) === String(caseId)
                                                    ? 'bg-blue-50 border border-blue-200'
                                                    : 'border border-transparent hover:bg-gray-50'
                                                    }`}
                                            onClick={() => navigate(buildCaseUrlWithCurrentQuery(item.id))}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <span className="text-xs text-gray-500 font-mono shrink-0">{item.num}</span>
                                                {getResultBadge(getExecResultFromItem(item), 'md')}
                                            </div>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="text-xs text-gray-800 line-clamp-2 leading-snug cursor-default">
                                                        {item.name}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>{item.name}</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500 shrink-0">
                            <span className="text-gray-400">共 {total} 条</span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 rounded-md hover:bg-gray-200"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    ‹
                                </Button>
                                <span className="min-w-[4rem] text-center">{currentPage} / {totalPages}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 rounded-md hover:bg-gray-200"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    ›
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* 右侧：用例详情 */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white border-l border-gray-100 overflow-hidden">
                        {detailLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                <span className="text-xs text-gray-400">加载用例详情...</span>
                            </div>
                        ) : !detail ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
                                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Edit className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-sm">请从左侧选择用例</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {getResultBadge(getExecResultFromItem(detail))}
                                        <span className="text-gray-400 font-mono text-xs shrink-0">[{detail.num}]</span>
                                        <TruncateWithTooltip className="font-medium text-gray-900 text-sm flex-1 min-w-0">
                                            {detail.name}
                                        </TruncateWithTooltip>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs shrink-0 rounded-md border-gray-200"
                                        onClick={() => {
                                            // 用例管理编辑需要功能用例 ID（非计划用例 id）。从详情、列表项多字段兼容获取
                                            const currentListItem = caseList.find((c) => String(c.id) === String(caseId));
                                            const caseManagementId =
                                                detail?.caseId ??
                                                (detail as any)?.functionalCaseId ??
                                                (detail as any)?.functionalCase?.id ??
                                                (detail as any)?.caseInfo?.id ??
                                                currentListItem?.caseId ??
                                                (currentListItem as any)?.functionalCaseId ??
                                                (detail?.id && String(detail.id) !== String(caseId) ? detail.id : undefined);
                                            if (!caseManagementId) {
                                                toast.error('无法获取用例 ID，无法跳转编辑');
                                                return;
                                            }
                                            const planQuery = location.search ? `&fromPlanQuery=${encodeURIComponent(location.search)}` : '';
                                            navigate(`/case-management?menu=test-case&tab=feature-case&caseId=${caseManagementId}&mode=edit&fromPlanId=${planId}&fromPlanCaseId=${caseId}${planQuery}`);
                                        }}
                                    >
                                        <Edit className="w-3.5 h-3.5 mr-1.5" /> 编辑
                                    </Button>
                                </div>

                                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                    <div className="px-6 border-b border-gray-200 bg-white shrink-0">
                                        <TabsList className="bg-transparent border-0 h-12 px-0 gap-6 rounded-none justify-start">
                                            <TabsTrigger
                                                value="baseInfo"
                                                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-blue-500 data-[state=active]:!bg-transparent h-12 px-0 text-sm font-normal text-gray-600 hover:text-gray-900 data-[state=active]:font-medium data-[state=active]:text-blue-600 transition-colors shadow-none data-[state=active]:shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none"
                                            >
                                                基本信息
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="detail"
                                                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-blue-500 data-[state=active]:!bg-transparent h-12 px-0 text-sm font-normal text-gray-600 hover:text-gray-900 data-[state=active]:font-medium data-[state=active]:text-blue-600 transition-colors shadow-none data-[state=active]:shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none"
                                            >
                                                详情
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="defectList"
                                                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-blue-500 data-[state=active]:!bg-transparent h-12 px-0 text-sm font-normal text-gray-600 hover:text-gray-900 data-[state=active]:font-medium data-[state=active]:text-blue-600 transition-colors shadow-none data-[state=active]:shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none gap-1.5"
                                            >
                                                缺陷列表
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-0 rounded-full h-4 px-1.5 text-xs font-normal">
                                                    {associatedBugs.length}
                                                </Badge>
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="history"
                                                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-blue-500 data-[state=active]:!bg-transparent h-12 px-0 text-sm font-normal text-gray-600 hover:text-gray-900 data-[state=active]:font-medium data-[state=active]:text-blue-600 transition-colors shadow-none data-[state=active]:shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none"
                                            >
                                                执行历史
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <ScrollArea className="flex-1 min-h-0">
                                        <TabsContent value="baseInfo" className="m-0 p-6">
                                            <div className="grid grid-cols-2 gap-6 max-w-2xl">
                                                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                                                    <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">创建人</div>
                                                    <div className="text-sm text-gray-900">{detail.createUserName ?? executorNameMap.get(detail.createUser) ?? detail.createUser ?? '-'}</div>
                                                </div>
                                                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                                                    <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">创建时间</div>
                                                    <div className="text-sm text-gray-900">{detail.createdAt != null ? formatTimestampBeijing(detail.createdAt) : '-'}</div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="detail" className="m-0 p-6 pb-16 space-y-6 flex-none outline-none">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700">前置条件</Label>
                                                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-100 leading-relaxed">
                                                    {detail.prerequisite?.trim() ? (
                                                        <RichTextContent content={detail.prerequisite} className="[&_img]:max-w-full [&_img]:h-auto" />
                                                    ) : (
                                                        <span className="text-gray-400">无</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                {detail.caseEditType === 'TEXT' ? (
                                                    <div className="space-y-6">
                                                        <div className="space-y-2">
                                                            <Label className="text-sm font-medium text-gray-700">文本描述</Label>
                                                            <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-100 leading-relaxed">
                                                                {detail.textDescription?.trim() ? (
                                                                    <RichTextContent content={detail.textDescription} className="[&_img]:max-w-full [&_img]:h-auto" />
                                                                ) : (
                                                                    <span className="text-gray-400">无描述</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {detail.expectedResult?.trim() && (
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-medium text-gray-700">预期结果</Label>
                                                                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-100 leading-relaxed">
                                                                    <RichTextContent content={detail.expectedResult} className="[&_img]:max-w-full [&_img]:h-auto" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <Label className="text-sm font-medium text-gray-700">步骤描述</Label>
                                                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="hover:bg-transparent bg-gray-50 border-b border-gray-200">
                                                                        <TableHead className="w-12 text-sm font-medium text-gray-600 py-3">序号</TableHead>
                                                                        <TableHead className="text-sm font-medium text-gray-600 py-3">用例步骤</TableHead>
                                                                        <TableHead className="text-sm font-medium text-gray-600 py-3">预期结果</TableHead>
                                                                        <TableHead className="w-[200px] text-sm font-medium text-gray-600 py-3">实际结果</TableHead>
                                                                        <TableHead className="w-[120px] text-sm font-medium text-gray-600 py-3">步骤结果</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {stepsList.map((step, index) => (
                                                                        <TableRow key={index} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                                                            <TableCell className="text-sm text-gray-500 py-2.5 font-mono align-top">{index + 1}</TableCell>
                                                                            <TableCell className="text-sm text-gray-800 py-2.5 align-top whitespace-pre-wrap break-words max-w-xs pr-4">
                                                                                {step.desc ?? step.step ?? '-'}
                                                                            </TableCell>
                                                                            <TableCell className="text-sm text-gray-600 py-2.5 align-top whitespace-pre-wrap break-words max-w-xs pr-4">
                                                                                {step.result ?? step.expected ?? '-'}
                                                                            </TableCell>
                                                                            <TableCell className="py-2">
                                                                                <Input
                                                                                    placeholder="请输入实际结果"
                                                                                    className="h-8 text-sm rounded-md border-gray-200 focus:ring-1 focus:ring-blue-500/20"
                                                                                    value={stepActuals[index] ?? ''}
                                                                                    onChange={(e) => setStepActuals((s) => ({ ...s, [index]: e.target.value }))}
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell className="py-2">
                                                                                <Select
                                                                                    value={stepResults[index] ?? ''}
                                                                                    onValueChange={(v) => {
                                                                                        setStepResults((s) => ({ ...s, [index]: v }));
                                                                                        if (v === 'FAILED') setExecuteResult('ERROR');
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className="h-8 text-sm rounded-md border-gray-200">
                                                                                        <SelectValue placeholder="选择" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {STEP_RESULT_OPTIONS.map((o) => (
                                                                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-gray-700">备注</Label>
                                                    <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-100 leading-relaxed min-h-[80px]">
                                                        {detail.description?.trim() ? (
                                                            <RichTextContent content={detail.description} className="[&_img]:max-w-full [&_img]:h-auto" />
                                                        ) : (
                                                            <span className="text-gray-400">无备注</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 底部：执行结果 + 备注 + 阻塞原因（选阻塞时）+ 提交 */}
                                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <Label className="text-sm font-medium text-gray-700 shrink-0">执行结果 <span className="text-red-500">(必填)</span></Label>
                                                    <RadioGroup
                                                        value={executeResult}
                                                        onValueChange={(v) => {
                                                            setExecuteResult(v);
                                                            if (v !== 'BLOCKED') setBlockReason('');
                                                        }}
                                                        className="flex gap-6"
                                                    >
                                                        {EXEC_RESULT_OPTIONS_FOR_SUBMIT.map((o) => {
                                                            const Icon = o.icon;
                                                            return (
                                                                <div key={o.value} className="flex items-center space-x-2">
                                                                    <RadioGroupItem
                                                                        value={o.value}
                                                                        id={o.value}
                                                                        className="border-2 border-gray-400 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                                                    />
                                                                    <label htmlFor={o.value} className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-700">
                                                                        <Icon className={`w-4 h-4 shrink-0 ${o.value === 'SUCCESS' ? 'text-green-600' : o.value === 'ERROR' ? 'text-red-600' : 'text-violet-600'}`} />
                                                                        {o.label}
                                                                    </label>
                                                                </div>
                                                            );
                                                        })}
                                                    </RadioGroup>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-gray-700">备注</Label>
                                                    <RichTextEditor
                                                        value={executeRemark}
                                                        onChange={setExecuteRemark}
                                                        placeholder="请输入备注，支持富文本、粘贴/拖拽图片"
                                                        minHeight="88px"
                                                        uploadImage={handleUploadImage}
                                                        className="rounded-lg border border-gray-200 focus-within:ring-1 focus-within:ring-blue-500/20"
                                                        editorClassName="text-sm"
                                                    />
                                                </div>
                                                {executeResult === 'BLOCKED' && (
                                                    <div className="space-y-1.5">
                                                        <div className="text-sm font-medium text-gray-700">
                                                            请选择阻塞原因 <span className="text-red-500">(必填)</span>
                                                        </div>
                                                        <RadioGroup value={blockReason} onValueChange={setBlockReason} className="grid grid-cols-2 gap-2">
                                                            {BLOCKED_REASON_OPTIONS.map((o) => (
                                                                <div key={o.value} className="flex items-center space-x-2 rounded-sm border border-gray-200 bg-white py-2 px-2.5 hover:border-gray-300">
                                                                    <RadioGroupItem value={o.value} id={`block-${o.value}`} className="shrink-0 border-2 border-gray-400 data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                                                                    <label htmlFor={`block-${o.value}`} className="flex flex-col cursor-pointer text-xs leading-tight min-w-0">
                                                                        <span className="font-medium text-gray-800">{o.label}</span>
                                                                        <span className="text-xs text-gray-500 mt-0.5">{o.desc}</span>
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </RadioGroup>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between pt-2">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
                                                            onClick={handleSubmitResult}
                                                            disabled={submitLoading}
                                                        >
                                                            {submitLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                                                            提交结果
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="rounded-md border-gray-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> 添加缺陷
                                                                    <ChevronDown className="w-3 h-3 ml-1" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="start">
                                                                <DropdownMenuItem onClick={() => setCreateBugOpen(true)}>
                                                                    创建缺陷
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => window.open(FEISHU_BUG_HOMEPAGE_URL, '_blank')}>
                                                                    飞书创建
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setAssociateBugOpen(true)}>
                                                                    关联已有缺陷
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            id="autoNext"
                                                            checked={autoNext}
                                                            onCheckedChange={(v) => {
                                                                setAutoNext(v);
                                                                try {
                                                                    localStorage.setItem(AUTO_NEXT_STORAGE_KEY, String(v));
                                                                } catch { }
                                                            }}
                                                        />
                                                        <Label htmlFor="autoNext" className="text-sm text-gray-600 cursor-pointer">自动下一条</Label>
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="defectList" className="m-0 p-6">
                                            {associatedBugs.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                                                    <LinkIcon className="w-10 h-10 opacity-30" />
                                                    <p className="text-sm">暂无关联缺陷</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {associatedBugs.map((bug) => (
                                                        <div key={bug.id} className="rounded-lg border border-gray-200 bg-white p-4 flex justify-between items-start hover:border-gray-300 transition-colors">
                                                            <div className="min-w-0">
                                                                <span className="text-xs text-blue-600 font-mono mr-2">{bug.num}</span>
                                                                {(bug.statusName || bug.status) && (
                                                                    <Badge className="bg-gray-50 text-gray-600 border-0 text-xs rounded-md">{bug.statusName || bug.status}</Badge>
                                                                )}
                                                                <div className="text-sm text-gray-700 mt-2 line-clamp-2">{bug.name || bug.title}</div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs shrink-0 rounded-md"
                                                                onClick={() => handleDisassociateBug(bug.id)}
                                                            >
                                                                取消关联
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="history" className="m-0 p-6">
                                            {executeHistory.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                                                    <History className="w-10 h-10 opacity-30" />
                                                    <p className="text-sm">暂无执行历史</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-0">
                                                    {executeHistory.map((item, index) => (
                                                        <div key={index} className="flex gap-4 pb-6 last:pb-0 relative">
                                                            <div className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5 ring-4 ring-blue-50" />
                                                            <div className="flex-1 min-w-0 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                                    {getResultBadge(item.status)}
                                                                    <span className="text-xs text-gray-400 shrink-0">{formatTimestampBeijing(item.createdAt)}</span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 mb-1">执行人：{executorNameMap.get(item.createUser) ?? item.createUser ?? '-'}</div>
                                                                {(item.content || item.contentText) && <ExecutionContentDisplay item={item} />}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>
                                    </ScrollArea>
                                </Tabs>
                                {/* 创建缺陷 / 关联已有缺陷 弹窗放在 Tabs 外，任意 Tab 下点击都能打开 */}
                                <CreateBugDialog
                                    open={createBugOpen}
                                    onOpenChange={setCreateBugOpen}
                                    projectId={planDetail?.projectId || localStorage.getItem('currentProjectId') || ''}
                                    caseId={detail?.caseId}
                                    testPlanId={planId || ''}
                                    testPlanCaseId={caseId}
                                    onSuccess={fetchAssociatedBugs}
                                />
                                <AssociateBugDialog
                                    open={associateBugOpen}
                                    onOpenChange={setAssociateBugOpen}
                                    planId={planId || ''}
                                    projectId={planDetail?.projectId || localStorage.getItem('currentProjectId') || ''}
                                    caseId={detail?.caseId}
                                    testPlanCaseId={caseId}
                                    onSuccess={fetchAssociatedBugs}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
