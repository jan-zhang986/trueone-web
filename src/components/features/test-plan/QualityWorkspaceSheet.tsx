import { useEffect, useMemo, useState } from 'react';
import { Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { qualityWorkspaceService } from '@/services/quality-workspace';

type TargetType = 'ITERATION' | 'VERSION' | 'RELEASE_BATCH' | 'MANUAL' | 'REQUIREMENT';

interface QualityWorkspaceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceId?: string | null;
  initialValues?: Record<string, any> | null;
  onSuccess?: (workspaceId?: string) => void;
}

const TARGET_TYPE_LABEL: Record<TargetType, string> = {
  ITERATION: '迭代',
  VERSION: '版本',
  RELEASE_BATCH: '发布批次',
  MANUAL: '手动范围',
  REQUIREMENT: '需求',
};

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T;
}

function toDateInputValue(value?: number | string | null) {
  if (!value) return '';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function toTimestamp(value: string) {
  if (!value) return undefined;
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function parseTags(value: string) {
  return value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isFeishuDocUrl(url: string) {
  return /\/(docx|wiki)\//i.test(url.trim());
}

export function QualityWorkspaceSheet({
  open,
  onOpenChange,
  projectId,
  workspaceId,
  initialValues,
  onSuccess,
}: QualityWorkspaceSheetProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('ITERATION');
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [tags, setTags] = useState('');
  const [prdUrl, setPrdUrl] = useState('');
  const [designUrl, setDesignUrl] = useState('');
  const [apiDocUrl, setApiDocUrl] = useState('');
  const [productOwnerId, setProductOwnerId] = useState('');
  const [devOwnerId, setDevOwnerId] = useState('');
  const [testOwnerId, setTestOwnerId] = useState('');
  const [scopeNote, setScopeNote] = useState('');

  const isEdit = Boolean(workspaceId);
  const title = isEdit ? '编辑测试计划' : '创建测试计划';

  const normalizedInitial = useMemo(() => initialValues || {}, [initialValues]);

  useEffect(() => {
    if (!open) return;
    const scope = normalizedInitial.scopeDefinition || {};
    const metadata = normalizedInitial.metadata || {};
    setName(normalizedInitial.name || '');
    setGoal(normalizedInitial.goal || '');
    setDescription(normalizedInitial.description || '');
    setOwnerId(normalizedInitial.ownerId || '');
    setTargetType((normalizedInitial.targetType || scope.targetType || metadata.targetType || 'ITERATION') as TargetType);
    setTargetId(normalizedInitial.targetId || scope.targetId || metadata.targetId || '');
    setTargetName(normalizedInitial.targetName || scope.targetName || metadata.targetName || '');
    setPlannedStart(toDateInputValue(normalizedInitial.plannedStartTime));
    setPlannedEnd(toDateInputValue(normalizedInitial.plannedEndTime));
    setTags(Array.isArray(normalizedInitial.tags) ? normalizedInitial.tags.join(', ') : '');
    setPrdUrl(metadata.prdUrl || scope.prdUrl || '');
    setDesignUrl(metadata.designUrl || scope.designUrl || '');
    setApiDocUrl(metadata.apiDocUrl || scope.apiDocUrl || '');
    setProductOwnerId(metadata.productOwnerId || scope.productOwnerId || '');
    setDevOwnerId(metadata.devOwnerId || scope.devOwnerId || '');
    setTestOwnerId(metadata.testOwnerId || scope.testOwnerId || normalizedInitial.ownerId || '');
    setScopeNote(metadata.scopeNote || scope.scopeNote || normalizedInitial.description || '');
  }, [open, normalizedInitial]);

  const handleSubmit = async () => {
    if (!projectId) {
      toast.error('当前项目不存在，无法创建测试计划');
      return;
    }
    if (!name.trim()) {
      toast.error('请输入测试计划名称');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        workspaceId: workspaceId || undefined,
        projectId,
        name: name.trim(),
        goal: goal.trim() || undefined,
        description: description.trim() || undefined,
        ownerId: ownerId.trim() || undefined,
        targetType,
        targetId: targetId.trim() || undefined,
        targetName: targetName.trim() || undefined,
        plannedStartTime: toTimestamp(plannedStart),
        plannedEndTime: toTimestamp(plannedEnd),
        tags: parseTags(tags),
        scopeDefinition: {
          ...(normalizedInitial.scopeDefinition || {}),
          targetType,
          targetId: targetId.trim() || undefined,
          targetName: targetName.trim() || undefined,
          prdUrl: prdUrl.trim() || undefined,
          designUrl: designUrl.trim() || undefined,
          apiDocUrl: apiDocUrl.trim() || undefined,
          productOwnerId: productOwnerId.trim() || undefined,
          devOwnerId: devOwnerId.trim() || undefined,
          testOwnerId: testOwnerId.trim() || undefined,
          scopeNote: scopeNote.trim() || undefined,
        },
        metadata: {
          ...(normalizedInitial.metadata || {}),
          targetType,
          targetId: targetId.trim() || undefined,
          targetName: targetName.trim() || undefined,
          prdUrl: prdUrl.trim() || undefined,
          designUrl: designUrl.trim() || undefined,
          apiDocUrl: apiDocUrl.trim() || undefined,
          productOwnerId: productOwnerId.trim() || undefined,
          devOwnerId: devOwnerId.trim() || undefined,
          testOwnerId: testOwnerId.trim() || undefined,
          scopeNote: scopeNote.trim() || undefined,
          source: 'iteration-quality-workspace',
        },
      };
      const savedId = unwrap<string>(await qualityWorkspaceService.saveWorkspace(payload));
      toast.success(
        prdUrl.trim()
          ? isEdit
            ? '测试计划已更新，飞书 PRD 索引将在后台同步'
            : '测试计划已创建，飞书 PRD 索引将在后台同步'
          : isEdit
            ? '测试计划已更新'
            : '测试计划已创建'
      );
      onOpenChange(false);
      onSuccess?.(savedId || workspaceId || undefined);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '保存测试计划失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[560px] max-w-[92vw] overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Target className="h-6 w-6" />
          </div>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            测试计划承载一次迭代/版本上线的测试分析、评审、检查项执行、复测回归和准出结论。
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>计划名称</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：2026.05 支付域迭代测试计划" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>迭代/版本类型</Label>
              <Select value={targetType} onValueChange={(value) => setTargetType(value as TargetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TARGET_TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>迭代/版本 ID</Label>
              <Input value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="可选，如迭代 ID 或版本号" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>迭代/版本名称</Label>
            <Input value={targetName} onChange={(event) => setTargetName(event.target.value)} placeholder="例如：支付域 5 月第二迭代" />
          </div>

          <div className="space-y-2">
            <Label>质量目标</Label>
            <Input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="例如：核心链路零 P0/P1，冒烟全通过" />
          </div>

          <div className="space-y-2">
            <Label>上线范围说明</Label>
            <Textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setScopeNote(event.target.value);
              }}
              placeholder="简单说明本次迭代上线范围、重点变更、明确不覆盖的内容。"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>PRD 链接</Label>
              <Input value={prdUrl} onChange={(event) => setPrdUrl(event.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>研发设计链接</Label>
              <Input value={designUrl} onChange={(event) => setDesignUrl(event.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>接口文档链接</Label>
              <Input value={apiDocUrl} onChange={(event) => setApiDocUrl(event.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>产品负责人</Label>
              <Input value={productOwnerId} onChange={(event) => setProductOwnerId(event.target.value)} placeholder="用户 ID，可选" />
            </div>
            <div className="space-y-2">
              <Label>开发负责人</Label>
              <Input value={devOwnerId} onChange={(event) => setDevOwnerId(event.target.value)} placeholder="用户 ID，可选" />
            </div>
            <div className="space-y-2">
              <Label>测试负责人</Label>
              <Input
                value={testOwnerId || ownerId}
                onChange={(event) => {
                  setTestOwnerId(event.target.value);
                  setOwnerId(event.target.value);
                }}
                placeholder="用户 ID，可选"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>负责人</Label>
              <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} placeholder="默认测试负责人，可选" />
            </div>
            <div className="space-y-2">
              <Label>标签</Label>
              <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="用逗号或空格分隔" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>计划开始</Label>
              <Input type="date" value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>计划结束</Label>
              <Input type="date" value={plannedEnd} onChange={(event) => setPlannedEnd(event.target.value)} />
            </div>
          </div>
        </div>

        <SheetFooter className="mt-8">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>取消</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-slate-900 text-white hover:bg-slate-800">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存工作台
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
