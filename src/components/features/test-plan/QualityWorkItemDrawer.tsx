import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, FileText, GitPullRequest, History, Loader2, MessageSquareText, Paperclip, PlayCircle, RefreshCcw, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { metadataService } from '@/services/metadata';
import { qualityWorkspaceService, type ProposalComment, type ProposalWorkflow, type QualityWorkItem, type QualityWorkItemComment, type WorkItemProposal } from '@/services/quality-workspace';
import { cn } from '@/utils/cn';
import { WorkItemProposalDialog } from './WorkItemProposalDialog';

interface QualityWorkItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  taskId: string;
  projectId: string;
  workItem?: QualityWorkItem | null;
  canEdit?: boolean;
  onChanged?: () => void;
}

const RESULT_META: Record<string, { label: string; className: string }> = {
  PASS: { label: '通过', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  FAIL: { label: '失败', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  BLOCKED: { label: '阻塞', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  SKIPPED: { label: '跳过', className: 'border-slate-200 bg-slate-50 text-slate-600' },
};

const PROPOSAL_STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '草稿', className: 'bg-slate-100 text-slate-700' },
  SUBMITTED: { label: '待评审', className: 'bg-blue-100 text-blue-700' },
  MERGED: { label: '已沉淀', className: 'bg-purple-100 text-purple-700' },
  REJECTED: { label: '已驳回', className: 'bg-rose-100 text-rose-700' },
};

const PROPOSAL_TRANSITION_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  SUBMITTED: '待评审',
  MERGED: '已沉淀',
  REJECTED: '已驳回',
};

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T;
}

function formatTime(value?: number | string) {
  if (!value) return '刚刚';
  const time = typeof value === 'number' ? value : Number(value);
  if (!Number.isNaN(time)) return new Date(time).toLocaleString();
  return String(value);
}

function safeJson(value: any) {
  if (!value) return '{}';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

function getEvidenceCount(item?: QualityWorkItem | null, comments: QualityWorkItemComment[] = []) {
  const fromComments = comments.reduce((count, comment) => {
    const files = comment.attachments || comment.files || comment.uploadFileIds || [];
    return count + (Array.isArray(files) ? files.length : 0);
  }, 0);
  return item?.evidenceCount ?? item?.runtimeSnapshot?.commentFileIds?.length ?? fromComments;
}

export function QualityWorkItemDrawer({
  open,
  onOpenChange,
  workspaceId,
  taskId,
  projectId,
  workItem,
  canEdit = true,
  onChanged,
}: QualityWorkItemDrawerProps) {
  const [detail, setDetail] = useState<QualityWorkItem | null>(workItem || null);
  const [comments, setComments] = useState<QualityWorkItemComment[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [proposals, setProposals] = useState<WorkItemProposal[]>([]);
  const [proposalWorkflowMap, setProposalWorkflowMap] = useState<Record<string, ProposalWorkflow>>({});
  const [proposalCommentMap, setProposalCommentMap] = useState<Record<string, ProposalComment[]>>({});
  const [runtimeDetail, setRuntimeDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [expandedProposalId, setExpandedProposalId] = useState('');
  const [mergeSubmittingId, setMergeSubmittingId] = useState('');
  const [proposalActionId, setProposalActionId] = useState('');
  const [proposalCommentSubmittingId, setProposalCommentSubmittingId] = useState('');
  const [result, setResult] = useState('PASS');
  const [content, setContent] = useState('');
  const [stepsExecResult, setStepsExecResult] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [actualExecMs, setActualExecMs] = useState('');
  const [actualReadingMs, setActualReadingMs] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [proposalReviewCommentMap, setProposalReviewCommentMap] = useState<Record<string, string>>({});
  const [proposalTransitionCommentMap, setProposalTransitionCommentMap] = useState<Record<string, string>>({});

  const workItemId = workItem?.workItemId || workItem?.id || detail?.workItemId || detail?.id || '';
  const current = detail || workItem;
  const evidenceCount = useMemo(() => getEvidenceCount(current, comments), [current, comments]);

  const loadAll = async () => {
    if (!open || !workspaceId || !taskId || !workItemId) return;
    setLoading(true);
    try {
      const [detailRes, commentsRes, historyRes, runtimeRes] = await Promise.allSettled([
        qualityWorkspaceService.getWorkItemDetail(workspaceId, taskId, workItemId),
        qualityWorkspaceService.getWorkItemComments(workspaceId, workItemId),
        qualityWorkspaceService.getWorkItemRuntimeHistory(workspaceId, workItemId),
        qualityWorkspaceService.getWorkItemRuntimeDetail(workspaceId, workItemId),
      ]);
      if (detailRes.status === 'fulfilled') setDetail(unwrap<QualityWorkItem>(detailRes.value));
      if (commentsRes.status === 'fulfilled') setComments(unwrap<QualityWorkItemComment[]>(commentsRes.value) || []);
      if (historyRes.status === 'fulfilled') setHistory(unwrap<any[]>(historyRes.value) || []);
      if (runtimeRes.status === 'fulfilled') setRuntimeDetail(unwrap<any>(runtimeRes.value));
      await loadProposals();
    } catch (error) {
      console.error(error);
      toast.error('加载执行项详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadProposals = async () => {
    if (!workspaceId || !workItemId) return;
    try {
      const proposalList = unwrap<WorkItemProposal[]>(await qualityWorkspaceService.getWorkItemProposalList(workspaceId, workItemId)) || [];
      setProposals(proposalList);
      await Promise.all(proposalList.map((proposal) => loadProposalReviewContext(proposal.proposalId)));
    } catch (error) {
      console.error(error);
      setProposals([]);
    }
  };

  const loadProposalReviewContext = async (proposalId?: string) => {
    if (!proposalId) return;
    const [workflowRes, commentsRes] = await Promise.allSettled([
      qualityWorkspaceService.getProposalWorkflow(proposalId),
      qualityWorkspaceService.getProposalComments(proposalId),
    ]);
    if (workflowRes.status === 'fulfilled') {
      setProposalWorkflowMap((prev) => ({ ...prev, [proposalId]: unwrap<ProposalWorkflow>(workflowRes.value) }));
    }
    if (commentsRes.status === 'fulfilled') {
      setProposalCommentMap((prev) => ({ ...prev, [proposalId]: unwrap<ProposalComment[]>(commentsRes.value) || [] }));
    }
  };

  useEffect(() => {
    if (open) {
      setDetail(workItem || null);
      setResult(workItem?.result && RESULT_META[workItem.result] ? workItem.result : 'PASS');
      setBlockReason(workItem?.runtimeSnapshot?.blockReason || '');
      loadAll();
    }
  }, [open, workItemId]);

  const submitRun = async () => {
    if (!canEdit || !workItemId) return;
    setSubmitting(true);
    try {
      await qualityWorkspaceService.runWorkItem(workspaceId, taskId, workItemId, {
        lastExecResult: result,
        content,
        stepsExecResult,
        isBlocked: result === 'BLOCKED',
        blockReason: result === 'BLOCKED' ? blockReason : undefined,
        actualExecMs: actualExecMs ? Number(actualExecMs) : undefined,
        actualReadingMs: actualReadingMs ? Number(actualReadingMs) : undefined,
        commentFileIds: [],
      });
      toast.success('执行结果已提交');
      setContent('');
      setStepsExecResult('');
      await loadAll();
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error('提交执行结果失败');
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!canEdit || !workItemId || (!commentContent.trim() && !commentFiles.length)) return;
    setCommentSubmitting(true);
    try {
      const uploadFileIds: string[] = [];
      for (const file of commentFiles) {
        const uploaded = await metadataService.uploadFileForWorkflow(file, projectId);
        uploadFileIds.push(uploaded.fileId);
      }
      await qualityWorkspaceService.saveWorkItemComment(workspaceId, workItemId, {
        content: commentContent || '上传证据附件',
        uploadFileIds,
      });
      toast.success(uploadFileIds.length ? '证据评论已保存' : '评论已保存');
      setCommentContent('');
      setCommentFiles([]);
      await loadAll();
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error('保存评论失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const mergeProposal = async (proposal: WorkItemProposal) => {
    if (!proposal.proposalId) return;
    if ((proposal.status || 'DRAFT') !== 'SUBMITTED') {
      toast.error('只有待评审的 Proposal 才能合并到 Case');
      return;
    }
    setMergeSubmittingId(proposal.proposalId);
    const toastId = toast.loading('正在沉淀到统一 Case...');
    try {
      const mergedCaseId = unwrap<string>(await qualityWorkspaceService.mergeProposalToCase(proposal.proposalId, {
        spaceId: proposal.spaceId || current?.sourceSpaceId,
        targetCaseId: proposal.targetCaseId || current?.caseId,
        title: proposal.title,
        description: proposal.reason,
      }));
      toast.success(`已沉淀到 Case：${mergedCaseId || proposal.targetCaseId || current?.caseId || '已创建'}`, { id: toastId });
      await loadProposals();
      onChanged?.();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '合并提案失败', { id: toastId });
    } finally {
      setMergeSubmittingId('');
    }
  };

  const transitionProposal = async (proposal: WorkItemProposal, targetStatus: 'SUBMITTED' | 'REJECTED') => {
    if (!proposal.proposalId) return;
    setProposalActionId(proposal.proposalId);
    try {
      await qualityWorkspaceService.transitionProposal(proposal.proposalId, {
        targetStatus,
        comment: proposalTransitionCommentMap[proposal.proposalId] || '',
      });
      setProposalTransitionCommentMap((prev) => ({ ...prev, [proposal.proposalId]: '' }));
      toast.success(targetStatus === 'SUBMITTED' ? '已提交评审' : '已驳回提案');
      await loadProposals();
      onChanged?.();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '提案状态流转失败');
    } finally {
      setProposalActionId('');
    }
  };

  const submitProposalComment = async (proposalId: string) => {
    const content = proposalReviewCommentMap[proposalId]?.trim();
    if (!content) return;
    setProposalCommentSubmittingId(proposalId);
    try {
      await qualityWorkspaceService.saveProposalComment(proposalId, { content });
      setProposalReviewCommentMap((prev) => ({ ...prev, [proposalId]: '' }));
      toast.success('评审意见已保存');
      await loadProposalReviewContext(proposalId);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '保存评审意见失败');
    } finally {
      setProposalCommentSubmittingId('');
    }
  };

  const renderProposalStatus = (status?: string) => {
    const normalized = status || 'DRAFT';
    const meta = PROPOSAL_STATUS_META[normalized] || PROPOSAL_STATUS_META.DRAFT;
    return <Badge className={cn('rounded-lg', meta.className)}>{meta.label}</Badge>;
  };

  const proposalDefaultSummary = [
    content && `执行说明：${content}`,
    stepsExecResult && `步骤结果：${stepsExecResult}`,
    blockReason && `阻塞原因：${blockReason}`,
    current?.runtimeSnapshot?.content && `历史执行说明：${current.runtimeSnapshot.content}`,
    current?.runtimeSnapshot?.blockReason && `历史阻塞原因：${current.runtimeSnapshot.blockReason}`,
  ].filter(Boolean).join('\n');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[760px] max-w-[92vw] gap-0 bg-slate-50 p-0 sm:max-w-[760px]">
        <SheetHeader className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-5 pr-8">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl font-black text-slate-900">
                {current?.title || '执行项详情'}
              </SheetTitle>
              <SheetDescription className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-lg bg-white font-bold">{current?.status || 'TODO'}</Badge>
                <Badge className={cn('rounded-lg border px-2 py-0.5 font-bold', RESULT_META[current?.result || '']?.className || 'bg-slate-100 text-slate-500')}>
                  {RESULT_META[current?.result || '']?.label || current?.result || '待执行'}
                </Badge>
                {current?.caseId && <span>Case: {current.caseId}</span>}
                {current?.implementationId && <span>Realization: {current.implementationId}</span>}
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
              <Paperclip className="h-4 w-4" />
              证据 {evidenceCount}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-5">
            {loading && (
              <Card className="flex h-24 items-center justify-center rounded-3xl border-slate-200 text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                加载执行上下文
              </Card>
            )}

            <Tabs defaultValue="run" className="gap-4">
              <TabsList className="w-full justify-start rounded-2xl bg-white p-1">
                <TabsTrigger value="run" className="rounded-xl"><PlayCircle className="mr-1 h-4 w-4" />执行</TabsTrigger>
                <TabsTrigger value="comments" className="rounded-xl"><MessageSquareText className="mr-1 h-4 w-4" />评论证据</TabsTrigger>
                <TabsTrigger value="proposal" className="rounded-xl"><GitPullRequest className="mr-1 h-4 w-4" />资产沉淀</TabsTrigger>
                <TabsTrigger value="runtime" className="rounded-xl"><History className="mr-1 h-4 w-4" />历史</TabsTrigger>
              </TabsList>

              <TabsContent value="run" className="space-y-4">
                <Card className="rounded-3xl border-slate-200 p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    提交执行结果
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(RESULT_META).map(([key, meta]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setResult(key)}
                        className={cn(
                          'rounded-2xl border px-3 py-3 text-sm font-black transition-all',
                          result === key ? meta.className : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        )}
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Input placeholder="执行耗时 ms" value={actualExecMs} onChange={(e) => setActualExecMs(e.target.value)} disabled={!canEdit} />
                    <Input placeholder="阅读耗时 ms" value={actualReadingMs} onChange={(e) => setActualReadingMs(e.target.value)} disabled={!canEdit} />
                  </div>
                  <Textarea className="mt-3 min-h-24 rounded-2xl bg-white" placeholder="执行说明：环境、结论、观察到的现象..." value={content} onChange={(e) => setContent(e.target.value)} disabled={!canEdit} />
                  <Textarea className="mt-3 min-h-24 rounded-2xl bg-white" placeholder="步骤结果：可以记录关键步骤通过/失败情况" value={stepsExecResult} onChange={(e) => setStepsExecResult(e.target.value)} disabled={!canEdit} />
                  {result === 'BLOCKED' && (
                    <Textarea className="mt-3 min-h-20 rounded-2xl border-amber-200 bg-amber-50/60" placeholder="阻塞原因：依赖谁、缺什么、下一步怎么解除" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} disabled={!canEdit} />
                  )}
                  <Button className="mt-4 w-full rounded-2xl bg-slate-900 font-black text-white hover:bg-slate-800" disabled={!canEdit || submitting} onClick={submitRun}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    提交执行
                  </Button>
                </Card>

                <Card className="rounded-3xl border-slate-200 p-5 shadow-sm">
                  <div className="mb-3 text-sm font-black text-slate-900">运行快照</div>
                  <pre className="max-h-64 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                    {safeJson(current?.runtimeSnapshot || runtimeDetail?.runtimeSnapshot || runtimeDetail)}
                  </pre>
                </Card>
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                <Card className="rounded-3xl border-slate-200 p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    评论与证据附件
                  </div>
                  <Textarea className="min-h-24 rounded-2xl bg-white" placeholder="写下执行证据、排查结论、协作说明..." value={commentContent} onChange={(e) => setCommentContent(e.target.value)} disabled={!canEdit} />
                  <Input className="mt-3 bg-white" type="file" multiple disabled={!canEdit} onChange={(e) => setCommentFiles(Array.from(e.target.files || []))} />
                  {!!commentFiles.length && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {commentFiles.map((file) => (
                        <Badge key={file.name} variant="outline" className="rounded-lg bg-blue-50 text-blue-700">{file.name}</Badge>
                      ))}
                    </div>
                  )}
                  <Button className="mt-4 rounded-2xl bg-slate-900 font-black text-white hover:bg-slate-800" disabled={!canEdit || commentSubmitting} onClick={submitComment}>
                    {commentSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
                    保存评论/证据
                  </Button>
                </Card>

                <div className="space-y-3">
                  {comments.map((comment) => {
                    const files = comment.attachments || comment.files || comment.uploadFileIds || [];
                    return (
                      <Card key={comment.commentId || comment.id || `${comment.createdAt}-${comment.content}`} className="rounded-3xl border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                          <span className="font-bold text-slate-600">{comment.createUserName || comment.createUser || '协作者'}</span>
                          <span>{formatTime(comment.createdAt)}</span>
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content || '证据附件'}</div>
                        {!!files.length && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {files.map((file: any, index: number) => (
                              <Badge key={file.fileId || file.id || index} className="rounded-lg bg-blue-50 text-blue-700">
                                <FileText className="mr-1 h-3 w-3" />
                                证据附件 {file.name || file.fileName || file.fileId || index + 1}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                  {!comments.length && (
                    <Card className="rounded-3xl border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                      还没有评论或证据附件。
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="proposal" className="space-y-4">
                <Card className="rounded-3xl border-slate-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <GitPullRequest className="h-4 w-4 text-blue-600" />
                        执行发现沉淀
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        把这次执行中的补充、修正或缺口，先变成 Proposal，提交评审后再合并回 Space 下的统一 Case。
                      </p>
                    </div>
                    <Button className="rounded-2xl bg-slate-900 font-black text-white hover:bg-slate-800" disabled={!canEdit || !workItemId} onClick={() => setProposalDialogOpen(true)}>
                      <GitPullRequest className="mr-2 h-4 w-4" />
                      发起提案
                    </Button>
                  </div>
                </Card>

                <div className="space-y-3">
                  {proposals.map((proposal) => {
                    const status = proposal.status || 'DRAFT';
                    const proposalId = proposal.proposalId;
                    const expanded = expandedProposalId === proposalId;
                    const workflow = proposalWorkflowMap[proposalId];
                    const proposalComments = proposalCommentMap[proposalId] || [];
                    const transitionHistory = workflow?.transitionHistory || proposal.metadata?.transitionHistory || [];
                    return (
                      <Card key={proposal.proposalId} className="rounded-3xl border-slate-200 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-base font-black text-slate-900">{proposal.title || '未命名提案'}</div>
                              {renderProposalStatus(status)}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span>目标 Case：{proposal.targetCaseId || current?.caseId || '合并时创建'}</span>
                              <span>创建人：{proposal.createUser || '未知'}</span>
                              <span>更新：{formatTime(proposal.updatedAt || proposal.createdAt)}</span>
                            </div>
                            {proposal.reason && <p className="mt-3 text-sm leading-6 text-slate-600">{proposal.reason}</p>}
                            <Button
                              variant="ghost"
                              className="mt-3 h-8 rounded-xl px-2 text-xs font-black text-blue-600 hover:text-blue-700"
                              onClick={() => {
                                const nextExpanded = expanded ? '' : proposalId;
                                setExpandedProposalId(nextExpanded);
                                if (nextExpanded) loadProposalReviewContext(proposalId);
                              }}
                            >
                              {expanded ? '收起评审详情' : '展开评审详情'}
                            </Button>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2">
                            {(status === 'DRAFT' || status === 'REJECTED') && (
                              <Button
                                variant="outline"
                                className="rounded-xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                disabled={!canEdit || proposalActionId === proposalId}
                                onClick={() => transitionProposal(proposal, 'SUBMITTED')}
                              >
                                {proposalActionId === proposalId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                {status === 'REJECTED' ? '重新提交' : '提交评审'}
                              </Button>
                            )}
                            {status === 'SUBMITTED' && (
                              <>
                                <Button
                                  variant="outline"
                                  className="rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                  disabled={!canEdit || proposalActionId === proposalId}
                                  onClick={() => transitionProposal(proposal, 'REJECTED')}
                                >
                                  {proposalActionId === proposalId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                  驳回
                                </Button>
                                <Button
                                  variant="outline"
                                  className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  disabled={!canEdit || mergeSubmittingId === proposalId}
                                  onClick={() => mergeProposal(proposal)}
                                >
                                  {mergeSubmittingId === proposalId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpRight className="mr-2 h-4 w-4" />}
                                  合并到 Case
                                </Button>
                              </>
                            )}
                            {status === 'MERGED' && (
                              <div className="flex items-center justify-center rounded-xl bg-purple-50 px-3 py-2 text-xs font-black text-purple-700">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                已完成沉淀
                              </div>
                            )}
                          </div>
                        </div>
                        {expanded && (
                          <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                            {proposal.changeSummary && (
                              <div>
                                <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">变更摘要</div>
                                <pre className="max-h-56 overflow-auto rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                                  {safeJson(proposal.changeSummary)}
                                </pre>
                              </div>
                            )}

                            <div>
                              <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">评审意见</div>
                              <div className="space-y-2">
                                {proposalComments.map((comment) => (
                                  <div key={comment.commentId || comment.id || `${comment.createdAt}-${comment.content}`} className="rounded-2xl bg-slate-50 p-3">
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                      <span className="font-bold text-slate-600">{comment.createUserName || comment.createUser || '评审人'}</span>
                                      <span>{formatTime(comment.createdAt)}</span>
                                    </div>
                                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content}</div>
                                  </div>
                                ))}
                                {!proposalComments.length && (
                                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                                    暂无评审意见。
                                  </div>
                                )}
                              </div>
                              <Textarea
                                className="mt-3 min-h-20 rounded-2xl bg-white"
                                placeholder="写评审意见：为什么同意、哪里需要补充、是否可以沉淀..."
                                value={proposalReviewCommentMap[proposalId] || ''}
                                disabled={!canEdit || status === 'MERGED'}
                                onChange={(event) => setProposalReviewCommentMap((prev) => ({ ...prev, [proposalId]: event.target.value }))}
                              />
                              <Button
                                variant="outline"
                                className="mt-2 rounded-xl"
                                disabled={!canEdit || status === 'MERGED' || proposalCommentSubmittingId === proposalId || !proposalReviewCommentMap[proposalId]?.trim()}
                                onClick={() => submitProposalComment(proposalId)}
                              >
                                {proposalCommentSubmittingId === proposalId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
                                保存评审意见
                              </Button>
                            </div>

                            {(status === 'DRAFT' || status === 'SUBMITTED' || status === 'REJECTED') && (
                              <div>
                                <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">流转说明</div>
                                <Textarea
                                  className="min-h-16 rounded-2xl bg-white"
                                  placeholder="提交、驳回或重新提交时的说明，可留空。"
                                  value={proposalTransitionCommentMap[proposalId] || ''}
                                  disabled={!canEdit}
                                  onChange={(event) => setProposalTransitionCommentMap((prev) => ({ ...prev, [proposalId]: event.target.value }))}
                                />
                              </div>
                            )}

                            <div>
                              <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">流程历史</div>
                              <div className="space-y-2">
                                {transitionHistory.map((record: any, index: number) => (
                                  <div key={record.changeLogId || `${record.transitionTime}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3 text-xs">
                                    <div>
                                      <div className="font-black text-slate-700">
                                        {PROPOSAL_TRANSITION_LABELS[record.fromStatus] || record.fromStatus || '开始'}
                                        <span className="mx-2 text-slate-300">→</span>
                                        {PROPOSAL_TRANSITION_LABELS[record.toStatus] || record.toStatus || '未知'}
                                      </div>
                                      {record.comment && <div className="mt-1 text-slate-500">{record.comment}</div>}
                                      {record.mergedCaseId && <div className="mt-1 text-purple-600">沉淀 Case：{record.mergedCaseId}</div>}
                                    </div>
                                    <div className="text-right text-slate-400">
                                      <div>{record.transitionUser || '系统'}</div>
                                      <div>{formatTime(record.transitionTime)}</div>
                                    </div>
                                  </div>
                                ))}
                                {!transitionHistory.length && (
                                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                                    暂无流程历史，提交评审后会开始留痕。
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                  {!proposals.length && (
                    <Card className="rounded-3xl border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                      还没有沉淀提案。执行中的发现可以从这里回流到长期 Case 资产。
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="runtime" className="space-y-3">
                {history.map((record, index) => (
                  <Card key={record.id || record.historyId || index} className="rounded-3xl border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <Clock3 className="h-4 w-4 text-slate-400" />
                        {record.execResult || record.result || record.status || '执行记录'}
                      </div>
                      <span className="text-xs text-slate-400">{formatTime(record.createdAt || record.execTime || record.updatedAt)}</span>
                    </div>
                    <pre className="mt-3 max-h-44 overflow-auto rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                      {safeJson(record)}
                    </pre>
                  </Card>
                ))}
                {!history.length && (
                  <Card className="rounded-3xl border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                    暂无执行历史。提交一次执行后会在这里沉淀。
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {current?.runtimeSnapshot?.blockReason && (
          <div className="border-t border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            当前阻塞：{current.runtimeSnapshot.blockReason}
          </div>
        )}
      </SheetContent>
      <WorkItemProposalDialog
        open={proposalDialogOpen}
        onOpenChange={setProposalDialogOpen}
        workspaceId={workspaceId}
        workItemId={workItemId || null}
        targetCaseId={current?.caseId || null}
        implementationId={current?.implementationId || null}
        defaultTitle={current?.title ? `沉淀：${current.title}` : '执行发现沉淀'}
        defaultReason={blockReason || current?.runtimeSnapshot?.blockReason || content || current?.runtimeSnapshot?.content || ''}
        defaultSummary={proposalDefaultSummary}
        runtimeSnapshot={current?.runtimeSnapshot || null}
        onSuccess={loadProposals}
      />
    </Sheet>
  );
}
