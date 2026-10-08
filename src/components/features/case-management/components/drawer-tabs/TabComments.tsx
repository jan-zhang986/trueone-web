/**
 * 用例详情抽屉 - 评论 Tab
 * 参考 aegis-next-server tabCommentIndex.vue + reviewCommentList.vue
 * 支持：用例评论、评审评论、执行评论 三种类型
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RichTextContent } from '../RichTextContent';
import { HtmlContent } from '../HtmlContent';
import { caseManagementService } from '@/services';

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PASS: { label: '通过', icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, color: 'text-green-600' },
  UN_PASS: { label: '不通过', icon: <XCircle className="w-4 h-4 text-red-500" />, color: 'text-red-600' },
  UNDER_REVIEWED: { label: '建议', icon: <AlertCircle className="w-4 h-4 text-amber-500" />, color: 'text-amber-600' },
  RE_REVIEWED: { label: '重新提审', icon: <RotateCcw className="w-4 h-4 text-amber-500" />, color: 'text-amber-600' },
  SUCCESS: { label: '成功', icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, color: 'text-green-600' },
  BLOCKED: { label: '阻塞', icon: <AlertCircle className="w-4 h-4 text-gray-500" />, color: 'text-gray-600' },
  ERROR: { label: '失败', icon: <XCircle className="w-4 h-4 text-red-500" />, color: 'text-red-600' },
};

type CommentTab = 'all' | 'caseComment' | 'reviewComment' | 'executiveComment';

interface TabCommentsProps {
  caseId: string | null;
  projectId?: string;
  unifiedCase?: boolean;
  refreshKey?: number;
  onNavigateToReview?: (reviewId: string, caseId: string) => void;
  onNavigateToPlan?: (planId: string) => void;
}

function parseSteps(stepsText?: string): { step: string; expected: string; actualResult?: string; executeResult?: string }[] {
  if (!stepsText?.trim()) return [];
  try {
    const arr = JSON.parse(stepsText);
    return Array.isArray(arr) ? arr.map((s: any) => ({
      step: s.desc ?? s.step ?? '',
      expected: s.result ?? s.expected ?? '',
      actualResult: s.actualResult,
      executeResult: s.executeResult,
    })) : [];
  } catch {
    return [];
  }
}

function StepDetailTrigger({ stepsText }: { stepsText?: string }) {
  const steps = parseSteps(stepsText);
  if (steps.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="link" className="h-auto p-0 text-blue-600 text-xs font-normal">
          步骤详情
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] max-h-[300px] overflow-auto" align="start">
        <div className="space-y-3 text-sm">
          {steps.map((s, i) => (
            <div key={i} className="border-b border-gray-100 pb-2 last:border-0">
              <div className="text-gray-500 mb-1">步骤 {i + 1}</div>
              <div className="text-gray-800">{s.step || '-'}</div>
              <div className="text-gray-600 text-xs mt-1">预期：{s.expected || '-'}</div>
              {s.actualResult && <div className="text-gray-600 text-xs">实际：{s.actualResult}</div>}
              {s.executeResult && (
                <div className="mt-1">
                  {STATUS_MAP[s.executeResult] ? (
                    <span className={`text-xs ${STATUS_MAP[s.executeResult].color}`}>{STATUS_MAP[s.executeResult].label}</span>
                  ) : (
                    <span className="text-xs text-gray-500">{s.executeResult}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReviewExecuteCommentItem({
  item,
  type,
  onReview,
  onPlan,
}: {
  item: any;
  type: 'reviewComment' | 'executiveComment';
  onReview?: (reviewId: string, caseId: string) => void;
  onPlan?: (planId: string) => void;
}) {
  const status = item.status ? STATUS_MAP[item.status] : null;
  const showStepDetail = item.caseEditType === 'STEP' && item.showResult && item.stepsText;

  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600 shrink-0">
        {(item.createUserName ?? item.userName ?? '-').slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 truncate max-w-[200px]">{item.createUserName ?? item.userName ?? '-'}</span>
          {showStepDetail && (
            <>
              <span className="text-gray-300">|</span>
              <StepDetailTrigger stepsText={item.stepsText} />
            </>
          )}
          {status && (
            <>
              <span className="text-gray-300">|</span>
              <span className={`flex items-center gap-1 text-xs ${status.color}`}>
                {status.icon}
                {status.label}
              </span>
            </>
          )}
        </div>
        <div className="mt-1 text-sm text-gray-700">
          {item.contentText ? (
            <HtmlContent content={item.contentText} className="[&_p]:my-0.5 [&_ul]:my-1 text-sm" />
          ) : (
            <RichTextContent content={item.content} />
          )}
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span>{item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '-'}</span>
          {type === 'reviewComment' && item.reviewName && (
            <button
              type="button"
              onClick={() => item.reviewId && item.caseId && onReview?.(item.reviewId, item.caseId)}
              className="text-blue-600 hover:underline truncate max-w-[200px]"
              title={item.reviewName}
            >
              {item.reviewName}
            </button>
          )}
          {type === 'executiveComment' && item.testPlanName && (
            <button
              type="button"
              onClick={() => item.testPlanId && onPlan?.(item.testPlanId)}
              className="text-blue-600 hover:underline truncate max-w-[200px]"
              title={item.testPlanName}
            >
              {item.testPlanName}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CaseCommentItem({ item }: { item: any }) {
  const text = item.contentText ?? item.content;
  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600 shrink-0">
        {(item.createUser ?? item.createUserName ?? item.userName ?? '-').slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 text-sm">{item.createUser ?? item.createUserName ?? item.userName ?? '-'}</div>
        <div className="mt-1 text-sm text-gray-700 [&_img]:cursor-pointer [&_img]:hover:opacity-90">
          <RichTextContent content={text} className="[&_p]:my-0.5 [&_ul]:my-1 text-sm" />
        </div>
        <div className="mt-1 text-xs text-gray-500">
          {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '-'}
        </div>
      </div>
    </div>
  );
}

export function TabComments({ caseId, projectId, unifiedCase = false, refreshKey, onNavigateToReview, onNavigateToPlan }: TabCommentsProps) {
  const [activeTab, setActiveTab] = useState<CommentTab>('all');
  const [loading, setLoading] = useState(false);
  const [caseList, setCaseList] = useState<any[]>([]);
  const [reviewList, setReviewList] = useState<any[]>([]);
  const [executeList, setExecuteList] = useState<any[]>([]);


  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    const caseCommentRequest = unifiedCase
      ? caseManagementService.getCollabComments(projectId || '', 'CASE', caseId)
      : caseManagementService.getCommentList(caseId);
    Promise.all([
      caseCommentRequest,
      caseManagementService.getReviewCommentList(caseId),
      caseManagementService.getTestPlanExecuteCommentList(caseId),
    ])
      .then(([c, r, e]) => {
        setCaseList(Array.isArray(c) ? c : []);
        setReviewList(Array.isArray(r) ? r : []);
        setExecuteList(Array.isArray(e) ? e : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [caseId, refreshKey]);

  if (!caseId) return null;

  // 默认展示全部，点击筛选条件才按类型过滤
  const currentList = activeTab === 'all'
    ? (() => {
        const combined = [
          ...caseList.map((i: any) => ({ ...i, _commentType: 'case' as const })),
          ...reviewList.map((i: any) => ({ ...i, _commentType: 'review' as const })),
          ...executeList.map((i: any) => ({ ...i, _commentType: 'execute' as const })),
        ];
        return combined.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      })()
    : activeTab === 'caseComment' ? caseList : activeTab === 'reviewComment' ? reviewList : executeList;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-medium text-gray-900">评论列表</div>
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(v) => v && setActiveTab(v as CommentTab)}
          className="gap-0"
        >
          <ToggleGroupItem value="all" className="text-xs px-3 py-1.5 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700">
            全部
          </ToggleGroupItem>
          <ToggleGroupItem value="caseComment" className="text-xs px-3 py-1.5 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700">
            用例评论
          </ToggleGroupItem>
          <ToggleGroupItem value="reviewComment" className="text-xs px-3 py-1.5 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700">
            评审评论
          </ToggleGroupItem>
          <ToggleGroupItem value="executiveComment" className="text-xs px-3 py-1.5 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700">
            执行评论
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">加载中...</div>
      ) : currentList.length === 0 ? (
        <div className="py-8 text-center text-gray-500">暂无评论</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {currentList.map((item: any) => {
            const sourceType = item._commentType ?? (activeTab === 'caseComment' ? 'case' : activeTab === 'reviewComment' ? 'review' : 'execute');
            if (sourceType === 'case') {
              const { _commentType, ...rest } = item;
              return <CaseCommentItem key={item.id} item={rest} />;
            }
            const reviewExecType = sourceType === 'execute' ? 'executiveComment' : 'reviewComment';
            return (
              <ReviewExecuteCommentItem
                key={item.id}
                item={item}
                type={reviewExecType}
                onReview={onNavigateToReview}
                onPlan={onNavigateToPlan}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
