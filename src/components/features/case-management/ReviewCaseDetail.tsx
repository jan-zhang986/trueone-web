/**
 * 评审用例详情
 * 与 aegis-next-web caseReview/caseDetail.vue 布局一致：左侧用例列表 + 右侧详情（Tab + 开始评审）
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { caseManagementService } from '@/services';
import { toast } from 'sonner';
import { RichTextContent } from './components/RichTextContent';
import { CaseLevelBadge } from './components/CaseLevelBadge';
import { getCaseLevel } from './utils/getCaseLevel';
import { REVIEW_STATUS_MAP, REVIEW_PASS_RULE_MAP } from './constants';

// 开始评审选项：通过/不通过/建议（与 aegis reviewForm 一致）
const REVIEW_RESULT_OPTIONS = [
  { value: 'PASS', label: '通过', icon: CheckCircle },
  { value: 'UN_PASS', label: '不通过', icon: XCircle },
  { value: 'UNDER_REVIEWED', label: '建议', icon: AlertCircle },
] as const;

type ReviewResultValue = 'PASS' | 'UN_PASS' | 'UNDER_REVIEWED';

function parseSteps(stepsStr?: string): { step: string; expected: string }[] {
  if (!stepsStr?.trim()) return [];
  try {
    const arr = JSON.parse(stepsStr);
    return Array.isArray(arr)
      ? arr.map((s: any) => ({ step: s.desc ?? s.step ?? '', expected: s.result ?? s.expected ?? '' }))
      : [];
  } catch {
    return [];
  }
}

interface ReviewCaseDetailProps {
  reviewId: string;
  caseId: string;
  projectId?: string;
  reviewPassRule?: 'SINGLE' | 'MULTIPLE';
  onBack?: () => void;
  onSuccess?: () => void;
  filterModuleId?: string;
  /** 切换选中的用例（用于左侧列表点击、自动下一条），父级更新 URL */
  onSelectCase?: (caseId: string) => void;
}

export function ReviewCaseDetail({
  reviewId,
  caseId,
  projectId = localStorage.getItem('currentProjectId') || 'default-project',
  reviewPassRule: propReviewPassRule = 'SINGLE',
  onBack,
  onSuccess,
  filterModuleId,
  onSelectCase,
}: ReviewCaseDetailProps) {
  const [reviewInfo, setReviewInfo] = useState<any>(null);
  const effectiveReviewPassRule = propReviewPassRule || reviewInfo?.reviewPassRule || 'SINGLE';

  // 左侧用例列表
  const [caseList, setCaseList] = useState<any[]>([]);
  const [caseListLoading, setCaseListLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listPageSize] = useState(10);
  const [listTotal, setListTotal] = useState(0);
  const [listKeyword, setListKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [onlyMineStatus, setOnlyMineStatus] = useState(false);
  const [moduleTree, setModuleTree] = useState<any[]>([]);

  // 右侧用例详情
  const [caseDetail, setCaseDetail] = useState<any>(null);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('detail');

  // 评审历史
  const [reviewHistoryList, setReviewHistoryList] = useState<any[]>([]);
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(false);

  // 开始评审
  const [reviewStatus, setReviewStatus] = useState<ReviewResultValue>('PASS');
  const [commentHtml, setCommentHtml] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [autoNext, setAutoNext] = useState(true);

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
      return `/attachment/download/file/${projectId}/${fileId}/true`;
    },
    [projectId]
  );

  const fetchCaseList = useCallback(async () => {
    setCaseListLoading(true);
    try {
      const params: any = {
        projectId,
        reviewId,
        current: listPage,
        pageSize: listPageSize,
        keyword: listKeyword || undefined,
      };
      if (statusFilter.length > 0) params.filter = { status: statusFilter };
      if (filterModuleId && filterModuleId !== 'all') {
        const { collectOffspringIds } = await import('./utils/collectOffspringIds');
        const offspringIds = collectOffspringIds(moduleTree, filterModuleId);
        params.moduleIds = [filterModuleId, ...offspringIds];
      }
      if (effectiveReviewPassRule === 'MULTIPLE' && onlyMineStatus) params.viewStatusFlag = true;
      const res: any = await caseManagementService.getReviewDetailCasePage(params);
      const list = res?.list ?? res?.data ?? [];
      setCaseList(list);
      setListTotal(res?.total ?? list.length);
    } catch {
      setCaseList([]);
      setListTotal(0);
    } finally {
      setCaseListLoading(false);
    }
  }, [projectId, reviewId, listPage, listPageSize, listKeyword, statusFilter, effectiveReviewPassRule, onlyMineStatus, filterModuleId, moduleTree]);

  useEffect(() => {
    if (!reviewId) return;
    caseManagementService.getReviewDetail(reviewId).then(setReviewInfo).catch(() => setReviewInfo(null));
  }, [reviewId]);

  useEffect(() => {
    fetchCaseList();
  }, [fetchCaseList]);

  useEffect(() => {
    if (filterModuleId && filterModuleId !== 'all' && reviewId) {
      caseManagementService.getReviewDetailModuleTree(reviewId).then(setModuleTree).catch(() => setModuleTree([]));
    }
  }, [reviewId, filterModuleId]);

  useEffect(() => {
    if (!caseId) return;
    setCaseDetailLoading(true);
    caseManagementService
      .getCaseDetail(caseId)
      .then(setCaseDetail)
      .catch(() => setCaseDetail(null))
      .finally(() => setCaseDetailLoading(false));
  }, [caseId]);

  const fetchReviewHistory = useCallback(async (silent = false) => {
    if (!reviewId || !caseId) return;
    if (!silent) setReviewHistoryLoading(true);
    try {
      const res = await caseManagementService.getCaseReviewHistoryList(reviewId, caseId);
      setReviewHistoryList(Array.isArray(res) ? res : res?.list ?? []);
    } catch {
      if (!silent) setReviewHistoryList([]);
    } finally {
      if (!silent) setReviewHistoryLoading(false);
    }
  }, [reviewId, caseId]);

  useEffect(() => {
    fetchReviewHistory();
  }, [fetchReviewHistory]);

  const commentTextOnly = commentHtml.replace(/<[^>]*>/g, '').trim();
  const isSameCase = useCallback((a: unknown, b: unknown) => String(a ?? '') === String(b ?? ''), []);

  const handleSubmit = async () => {
    if (reviewStatus !== 'PASS' && !commentTextOnly) {
      toast.error('不通过或建议时请填写评审意见');
      return;
    }
    setSubmitLoading(true);
    try {
      // 与 aegis-next-server reviewForm.vue 完全一致：字段名、类型、顺序与后端 ReviewFunctionalCaseRequest 一致，避免后端绑定失败
      const projectIdVal = String(reviewInfo?.projectId ?? projectId ?? '');
      const caseIdVal = String(caseId ?? '');
      const reviewIdVal = String(reviewId ?? '');
      const payload = {
        projectId: projectIdVal,
        reviewId: reviewIdVal,
        caseId: caseIdVal,
        reviewPassRule: effectiveReviewPassRule,
        status: reviewStatus,
        content: commentHtml.trim() || '',
        notifier: '',
        reviewCommentFileIds: [] as string[],
      };
      await caseManagementService.saveCaseReviewResult(payload);
      toast.success('评审已提交');
      onSuccess?.();
      setCommentHtml('');
      setReviewStatus('PASS');

      // 立即更新左侧列表中当前用例的评审状态（乐观更新，不再整列表刷新）
      setCaseList((prev) =>
        prev.map((item) => {
          const cid = item.caseId ?? item.id;
          if (isSameCase(cid, caseId)) {
            return { ...item, status: reviewStatus, myStatus: reviewStatus };
          }
          return item;
        })
      );
      setCaseDetail((prev) => (prev && isSameCase(prev.id ?? prev.caseId, caseId) ? { ...prev, reviewStatus: reviewStatus as string, status: reviewStatus } : prev));

      if (autoNext && onSelectCase) {
        const idx = caseList.findIndex((c) => isSameCase(c.caseId ?? c.id, caseId));
        if (idx >= 0 && idx < caseList.length - 1) {
          // 同页下一条：直接切换，不刷新列表
          const next = caseList[idx + 1];
          onSelectCase(next?.caseId ?? next?.id);
        } else if (listPage * listPageSize < listTotal) {
          // 下一页：只拉取下一页数据并切换
          const nextPage = listPage + 1;
          const params: any = {
            projectId,
            reviewId,
            current: nextPage,
            pageSize: listPageSize,
            keyword: listKeyword || undefined,
          };
          if (statusFilter.length > 0) params.filter = { status: statusFilter };
          if (filterModuleId && filterModuleId !== 'all') {
            const { collectOffspringIds } = await import('./utils/collectOffspringIds');
            const offspringIds = collectOffspringIds(moduleTree, filterModuleId);
            params.moduleIds = [filterModuleId, ...offspringIds];
          }
          if (effectiveReviewPassRule === 'MULTIPLE' && onlyMineStatus) params.viewStatusFlag = true;
          const r: any = await caseManagementService.getReviewDetailCasePage(params);
          const nextList = r?.list ?? r?.data ?? [];
          if (nextList.length > 0) {
            setListPage(nextPage);
            setCaseList(nextList);
            setListTotal(r?.total ?? listTotal);
            onSelectCase(nextList[0].caseId || nextList[0].id);
          } else {
            fetchCaseList();
          }
        }
        // 最后一页最后一条：不刷新，保持当前视图
      } else {
        // 不自动下一条：不刷新整页，仅后台静默刷新评审历史以便切到「评审历史」tab 时能看到新记录
        fetchReviewHistory(true);
      }
    } catch (err: any) {
      toast.error(err?.message || '提交失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const steps = caseDetail?.caseEditType === 'STEP' ? parseSteps(caseDetail?.steps) : [];
  const listTotalPages = Math.max(1, Math.ceil(listTotal / listPageSize));

  return (
    <div className="flex flex-1 flex-col bg-[#f5f6f8] min-h-0 overflow-hidden">
      {/* 顶部栏 */}
      <Card className="m-4 flex-shrink-0 border-gray-200/80 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {onBack && (
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#165DFF]" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> 返回
                </Button>
              )}
              <span className="font-medium text-gray-900 truncate max-w-[280px]" title={reviewInfo?.name}>
                {reviewInfo?.name || '评审详情'}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#165DFF]/10 text-[#165DFF]">
                {REVIEW_PASS_RULE_MAP[effectiveReviewPassRule] || '单人'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-1 min-h-0 border-t border-gray-200/80">
        {/* 左侧用例列表：交互与样式对齐测试计划用例执行页 TestPlanCaseDetailPage */}
        <div className="w-[320px] shrink-0 flex flex-col border-r border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-50">
            {reviewInfo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm font-medium text-gray-900 truncate mb-3 px-1 cursor-default">
                    <span className="text-gray-400 font-mono text-xs">[{reviewInfo.num ?? '-'}]</span>
                    <span className="ml-1">{reviewInfo.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{reviewInfo.name}</TooltipContent>
              </Tooltip>
            )}
            {effectiveReviewPassRule === 'MULTIPLE' && (
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <Switch
                  checked={onlyMineStatus}
                  onCheckedChange={(v) => { setOnlyMineStatus(v); setListPage(1); }}
                  className="data-[state=checked]:bg-[#165DFF]"
                />
                <span className="text-xs text-gray-600">仅看我的评审状态</span>
              </label>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="ID / 名称搜索"
                  className="h-8 pl-8 text-xs rounded-md border-gray-200 focus:ring-1 focus:ring-blue-500/20"
                  value={listKeyword}
                  onChange={(e) => setListKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCaseList()}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-[96px] justify-between text-xs rounded-md border-gray-200 px-2"
                    disabled={effectiveReviewPassRule === 'MULTIPLE' && onlyMineStatus}
                  >
                    <span className="truncate">评审结果</span>
                    {statusFilter.length > 0 ? (
                      <span className="text-blue-600 text-[10px] shrink-0">({statusFilter.length})</span>
                    ) : (
                      <Filter className="w-3 h-3 text-gray-400 shrink-0" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2 max-h-[280px] overflow-auto" align="start">
                  <div className="px-2 py-1 text-xs text-gray-500 mb-0.5">可多选</div>
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                    onClick={() => { setStatusFilter([]); setListPage(1); }}
                  >
                    全部
                  </button>
                  {Object.entries(REVIEW_STATUS_MAP).map(([value, { label }]) => {
                    const isSelected = statusFilter.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2 ${isSelected ? 'text-blue-600 font-medium' : ''}`}
                        onClick={() => {
                          const next = isSelected
                            ? statusFilter.filter((s) => s !== value)
                            : [...statusFilter, value];
                          setStatusFilter(next);
                          setListPage(1);
                        }}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                          {isSelected ? '✓' : ''}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0 py-2 px-2">
            {caseListLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                <span className="text-xs text-gray-400">加载中...</span>
              </div>
            ) : caseList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-xs text-gray-400">暂无用例</span>
              </div>
            ) : (
              <div className="space-y-1">
                {caseList.map((item) => {
                  const cid = item.caseId ?? item.id;
                  const isActive = isSameCase(cid, caseId);
                  const status = effectiveReviewPassRule === 'MULTIPLE' && onlyMineStatus
                    ? (item.myStatus ?? item.status ?? 'UN_REVIEWED')
                    : (item.status ?? item.myStatus ?? 'UN_REVIEWED');
                  const { label: statusLabel, color: statusColor } = REVIEW_STATUS_MAP[status] || { label: '-', color: 'bg-gray-100 text-gray-700' };
                  return (
                    <div
                      key={cid}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectCase?.(cid)}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectCase?.(cid)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-150 text-left ${
                        isActive
                          ? 'bg-blue-50 border border-blue-200'
                          : 'border border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs text-gray-500 font-mono shrink-0">{item.num ?? cid}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${statusColor}`}>
                          {statusLabel}
                        </span>
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
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500 shrink-0">
            <span className="text-gray-400">共 {listTotal} 条</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-md hover:bg-gray-200"
                disabled={listPage <= 1}
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </Button>
              <span className="min-w-[4rem] text-center">{listPage} / {listTotalPages}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-md hover:bg-gray-200"
                disabled={listPage >= listTotalPages}
                onClick={() => setListPage((p) => Math.min(listTotalPages, p + 1))}
              >
                ›
              </Button>
            </div>
          </div>
        </div>

        {/* 右侧详情 */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {caseList.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">请从左侧选择用例</div>
          ) : (
            <>
              {caseDetailLoading ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">加载中...</div>
              ) : caseDetail ? (
                <>
                  {/* 头部信息栏：对齐 TestPlanCaseDetailPage，无圆角无边框，仅底部边框 */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-gray-400 font-mono text-xs">【{caseDetail.num}】</span>
                      <span className="font-medium text-gray-900 truncate text-sm">{caseDetail.name}</span>
                      <span className="text-gray-400 mx-2">|</span>
                      <span className="text-gray-500 text-sm">{caseDetail.moduleName || '根模块'}</span>
                      <CaseLevelBadge level={getCaseLevel(caseDetail)} />
                      <span className={`text-xs px-1.5 py-0.5 rounded ${REVIEW_STATUS_MAP[caseDetail.reviewStatus ?? caseDetail.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {REVIEW_STATUS_MAP[caseDetail.reviewStatus ?? caseDetail.status]?.label ?? '未评审'}
                      </span>
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                      {/* Tab 样式对齐 TestPlanCaseDetailPage：下划线激活态、间距与边框一致 */}
                      <div className="border-b border-gray-200 bg-white shrink-0 px-6">
                        <TabsList className="bg-transparent border-0 h-11 px-0 gap-8 rounded-none">
                          <TabsTrigger
                            value="baseInfo"
                            className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#165DFF] data-[state=active]:text-[#165DFF] data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent text-gray-500 text-sm pb-3 -mb-px transition-colors hover:bg-transparent h-auto"
                          >
                            基本信息
                          </TabsTrigger>
                          <TabsTrigger
                            value="detail"
                            className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#165DFF] data-[state=active]:text-[#165DFF] data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent text-gray-500 text-sm pb-3 -mb-px transition-colors hover:bg-transparent h-auto"
                          >
                            详情
                          </TabsTrigger>
                          <TabsTrigger
                            value="demand"
                            className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#165DFF] data-[state=active]:text-[#165DFF] data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent text-gray-500 text-sm pb-3 -mb-px transition-colors hover:bg-transparent h-auto"
                          >
                            需求
                          </TabsTrigger>
                          <TabsTrigger
                            value="reviewHistory"
                            className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#165DFF] data-[state=active]:text-[#165DFF] data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent text-gray-500 text-sm pb-3 -mb-px transition-colors hover:bg-transparent h-auto"
                          >
                            评审历史
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      <ScrollArea className="flex-1 min-h-0">
                        <TabsContent value="baseInfo" className="m-0 p-6">
                          <div className="grid grid-cols-2 gap-4 max-w-2xl">
                            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">所属模块</div>
                              <div className="text-sm text-gray-900">{caseDetail.moduleName || '根模块'}</div>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">用例等级</div>
                              <div className="text-sm text-gray-900">
                                <CaseLevelBadge level={getCaseLevel(caseDetail)} />
                              </div>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">创建人</div>
                              <div className="text-sm text-gray-900">{caseDetail.createUserName ?? caseDetail.createUser ?? '-'}</div>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">创建时间</div>
                              <div className="text-sm text-gray-900 font-mono">
                                {caseDetail.createdAt ? new Date(caseDetail.createdAt).toLocaleString('zh-CN') : '-'}
                              </div>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">更新人</div>
                              <div className="text-sm text-gray-900">{caseDetail.updateUserName ?? caseDetail.updateUser ?? '-'}</div>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">更新时间</div>
                              <div className="text-sm text-gray-900 font-mono">
                                {caseDetail.updatedAt ? new Date(caseDetail.updatedAt).toLocaleString('zh-CN') : '-'}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="detail" className="m-0 p-6 pb-16 space-y-6 flex-none outline-none">
                        <div className="rounded-lg border overflow-hidden">
                          <div className="px-3 py-2 bg-emerald-50 border-b text-sm font-medium">前置条件</div>
                          <div className="p-3 text-sm text-gray-600">
                            <RichTextContent content={caseDetail.prerequisite} />
                          </div>
                        </div>
                        <div className="rounded-lg border overflow-hidden">
                          <div className="px-3 py-2 bg-sky-50 border-b text-sm font-medium">
                            {caseDetail.caseEditType === 'STEP' ? '步骤描述' : '文本描述'}
                          </div>
                          {caseDetail.caseEditType === 'STEP' && steps.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-sky-50/70 border-b">
                                  <th className="w-12 py-2 text-left px-3 font-medium text-gray-500">序号</th>
                                  <th className="py-2 text-left px-3 font-medium text-gray-500">用例步骤</th>
                                  <th className="py-2 text-left px-3 font-medium text-gray-500">预期结果</th>
                                </tr>
                              </thead>
                              <tbody>
                                {steps.map((s, i) => (
                                  <tr key={i} className="border-b">
                                    <td className="py-2 px-3">{i + 1}</td>
                                    <td className="py-2 px-3 whitespace-pre-wrap">{s.step || '-'}</td>
                                    <td className="py-2 px-3 whitespace-pre-wrap">{s.expected || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-3 text-sm">
                              <RichTextContent content={caseDetail.textDescription} />
                            </div>
                          )}
                        </div>
                        {caseDetail.caseEditType === 'TEXT' && caseDetail.expectedResult && (
                          <div className="rounded-lg border overflow-hidden">
                            <div className="px-3 py-2 bg-rose-50 border-b text-sm font-medium">预期结果</div>
                            <div className="p-3 text-sm">
                              <RichTextContent content={caseDetail.expectedResult} />
                            </div>
                          </div>
                        )}
                        </TabsContent>
                        <TabsContent value="demand" className="m-0 p-6">
                          <div className="text-sm text-gray-500">需求关联列表（占位）</div>
                        </TabsContent>
                        <TabsContent value="reviewHistory" className="m-0 p-6">
                          {reviewHistoryLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                              <div className="text-sm text-gray-500">加载中...</div>
                            </div>
                          ) : reviewHistoryList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                              <div className="text-sm text-gray-500">暂无评审历史</div>
                            </div>
                          ) : (
                            <div className="space-y-0">
                              {reviewHistoryList.map((item: any, index: number) => {
                                const status = item.status ?? 'UN_REVIEWED';
                                const statusInfo = REVIEW_STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
                                const statusColor = status === 'PASS' ? 'bg-green-500' : status === 'UN_PASS' ? 'bg-red-500' : status === 'UNDER_REVIEWED' ? 'bg-orange-500' : 'bg-gray-400';
                                const ringColor = status === 'PASS' ? 'ring-green-50' : status === 'UN_PASS' ? 'ring-red-50' : status === 'UNDER_REVIEWED' ? 'ring-orange-50' : 'ring-gray-50';
                                const contentHtml = item.contentText || item.content || '';
                                const hasContent = contentHtml && contentHtml.trim() && contentHtml.trim() !== '<p></p>' && contentHtml.trim() !== '<p style=""></p>';
                                return (
                                  <div key={item.id || index} className="flex gap-4 pb-6 last:pb-0 relative">
                                    <div className={`shrink-0 w-2 h-2 rounded-full ${statusColor} mt-1.5 ring-4 ${ringColor}`} />
                                    <div className="flex-1 min-w-0 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                                      <div className="flex justify-between items-start gap-2 mb-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${statusInfo.color}`}>
                                          {status === 'PASS' && <CheckCircle className="w-3 h-3" />}
                                          {status === 'UN_PASS' && <XCircle className="w-3 h-3" />}
                                          {status === 'UNDER_REVIEWED' && <AlertCircle className="w-3 h-3" />}
                                          {statusInfo.label}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono shrink-0">
                                          {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 mb-2">评审人：{item.userName ?? item.createUser ?? '-'}</div>
                                      {hasContent && (
                                        <div
                                          className="text-sm text-gray-600 bg-white/80 p-3 rounded-md border border-gray-100 mt-2 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded break-words"
                                          dangerouslySetInnerHTML={{ __html: contentHtml }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </TabsContent>
                      </ScrollArea>
                    </Tabs>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">未找到用例</div>
                )}

              {/* 开始评审 footer */}
              <div className="border-t border-gray-200 bg-white px-4 py-4 shadow-[0_-1px_4px_0_rgba(31,35,41,0.1)]">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium text-gray-900">开始评审</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={autoNext} onCheckedChange={setAutoNext} />
                    <span className="text-sm text-gray-500">自动下一条</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-gray-400 hover:text-[#165DFF]">
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 text-sm">
                        提交评审后自动跳转到下一条用例；若当前为最后一页最后一条则刷新列表。
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <RadioGroup
                  value={reviewStatus}
                  onValueChange={(v) => setReviewStatus(v as ReviewResultValue)}
                  className="flex flex-wrap gap-6 mb-3"
                >
                  {REVIEW_RESULT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = reviewStatus === opt.value;
                    const optClass =
                      opt.value === 'PASS' ? 'text-green-600' : opt.value === 'UN_PASS' ? 'text-red-600' : 'text-orange-600';
                    return (
                      <div
                        key={opt.value}
                        role="button"
                        tabIndex={0}
                        onClick={() => setReviewStatus(opt.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setReviewStatus(opt.value)}
                        className={`flex items-center gap-2 cursor-pointer font-medium select-none ${isSelected ? optClass : 'text-gray-600 hover:text-gray-800'}`}
                      >
                        <RadioGroupItem
                          value={opt.value}
                          id={opt.value}
                          className={
                            opt.value === 'PASS'
                              ? 'border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
                              : opt.value === 'UN_PASS'
                                ? 'border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500'
                                : 'border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500'
                          }
                        />
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? optClass : 'text-gray-400'}`} />
                        {opt.label}
                      </div>
                    );
                  })}
                </RadioGroup>
                <div className="mb-3">
                  <Label className="text-sm text-gray-600 mb-2 block">评审意见 {reviewStatus !== 'PASS' && <span className="text-red-500">*</span>}</Label>
                  <RichTextEditor
                    value={commentHtml}
                    onChange={setCommentHtml}
                    placeholder={reviewStatus === 'PASS' ? '选填（支持图片）' : '不通过或建议时请填写评审意见（支持图片）'}
                    minHeight="100px"
                    uploadImage={handleUploadImage}
                    editorClassName="text-sm mt-1 border rounded-md"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSubmit} disabled={submitLoading} className="bg-[#165DFF] hover:bg-[#165DFF]/90">
                    {submitLoading ? '提交中...' : '提交评审'}
                  </Button>
                  {commentHtml.replace(/<[^>]*>/g, '').trim() && (
                    <span className="text-xs text-gray-500">已填写原因</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
