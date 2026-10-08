/**
 * 引用子节点表单：选择当前项目下的实现流程（支持模糊搜索），展示选中流程详情
 * 优化：列表仅在下拉打开时懒加载；详情直接用列表数据，不再请求详情接口
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Section } from '../shared/Section';
import { FormLabel } from '../shared/FormLabel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { workflowService } from '@/services/workflow';
import type { SubWorkflowConfig } from '../../types';
import { GitBranch, ChevronsUpDown, Check, ExternalLink } from 'lucide-react';
import { formatTimestampBeijing } from '@/utils/date';
import { cn } from '@/utils/cn';

/** 生成在新 tab 打开实现流程画布详情的 URL（从 Case 实现入口进入） */
function buildWorkflowCanvasUrl(workflowId: string, projectId?: string): string {
  const base =
    typeof window !== 'undefined' ? `${window.location.origin}/case-management` : '';
  const params = new URLSearchParams();
  params.set('menu', 'test-case');
  params.set('tab', 'realization');
  params.set('id', workflowId);
  if (projectId) params.set('projectId', projectId);
  return `${base}?${params.toString()}`;
}

interface SubWorkflowNodeFormProps {
  config: SubWorkflowConfig;
  onChange: (config: SubWorkflowConfig) => void;
  projectId?: string;
  moduleId?: string;
}

interface WorkflowOption {
  id: string;
  name: string;
  description?: string;
  updatedAt?: number | string;
  stepCount?: number;
}

export const SubWorkflowNodeForm: React.FC<SubWorkflowNodeFormProps> = ({
  config,
  onChange,
  projectId,
  moduleId,
}) => {
  const [workflowList, setWorkflowList] = useState<WorkflowOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [listFetched, setListFetched] = useState(false);

  const selectedId = config.workflow_id ?? '';

  // 懒加载：仅在下拉打开时请求列表，且同一 projectId+moduleId 只请求一次
  useEffect(() => {
    if (!open || !projectId || listFetched) return;
    let cancelled = false;
    setLoading(true);
    workflowService
      .getWorkflowList({
        projectId,
        moduleId,
        current: 1,
        pageSize: 500,
      })
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        const list = data?.list ?? data?.records ?? data ?? [];
        const items = Array.isArray(list)
          ? list.map((item: any) => ({
              id: item.id ?? item.workflowId ?? '',
              name: item.name ?? item.id ?? '-',
              description: item.description,
              updatedAt: item.updatedAt,
              stepCount: item.stepCount,
            }))
          : [];
        setWorkflowList(items.filter((i: WorkflowOption) => i.id));
        setListFetched(true);
      })
      .catch(() => {
        if (!cancelled) setWorkflowList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, moduleId, listFetched]);

  // projectId/moduleId 变化时允许重新拉列表
  useEffect(() => {
    setListFetched(false);
  }, [projectId, moduleId]);

  const filteredList = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return workflowList;
    return workflowList.filter(
      (w) =>
        (w.name ?? '').toLowerCase().includes(kw) ||
        (w.description ?? '').toLowerCase().includes(kw)
    );
  }, [workflowList, searchKeyword]);

  const selectedWorkflow = workflowList.find((w) => w.id === selectedId);
  /** 仅以 workflow_id 为准；名称从列表解析，避免在 config 里重复存一份 */
  const displayName = selectedWorkflow?.name ?? config.workflow_name ?? selectedId;

  const handleSelect = (id: string) => {
    const next: SubWorkflowConfig = { ...config };
    delete next.workflow_name;
    if (id === '__none__') {
      next.workflow_id = undefined;
    } else {
      next.workflow_id = id;
    }
    onChange(next);
    setOpen(false);
    setSearchKeyword('');
  };

  return (
    <div className="space-y-4">
      <Section title="引用子工作流">
        <div className="space-y-3">
          <FormLabel>选择实现流程（当前项目）</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between h-10 font-normal"
                disabled={!projectId}
              >
                {!projectId
                  ? '请先选择项目'
                  : open && loading
                    ? '加载中...'
                    : selectedId
                      ? displayName
                      : '请选择要引用的实现流程'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="搜索实现流程名称或描述..."
                  value={searchKeyword}
                  onValueChange={setSearchKeyword}
                  className="h-9"
                />
                <CommandList className="max-h-[260px]">
                  <CommandEmpty>未找到匹配的实现流程</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__none__"
                      onSelect={() => handleSelect('__none__')}
                      className="cursor-pointer"
                    >
                      <Check className={cn('mr-2 h-4 w-4', !selectedId ? 'opacity-100' : 'opacity-0')} />
                      不引用
                    </CommandItem>
                    {filteredList.map((w) => (
                      <CommandItem
                        key={w.id}
                        value={w.id}
                        onSelect={() => handleSelect(w.id)}
                        className="cursor-pointer"
                      >
                        <Check className={cn('mr-2 h-4 w-4', selectedId === w.id ? 'opacity-100' : 'opacity-0')} />
                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-sm font-medium text-gray-900">{w.name}</span>
                          {w.description ? (
                            <span className="text-xs text-gray-500 truncate">{w.description}</span>
                          ) : null}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedId && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => window.open(buildWorkflowCanvasUrl(selectedId, projectId), '_blank')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(buildWorkflowCanvasUrl(selectedId, projectId), '_blank'); } }}
              className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2 cursor-pointer hover:bg-gray-100/80 hover:border-gray-300 transition-colors group"
              title="在新标签页中打开实现流程画布"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-600">已选实现流程详情</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 shrink-0" aria-hidden />
              </div>
              {selectedWorkflow ? (
                <dl className="grid grid-cols-1 gap-1.5 text-xs">
                  {selectedWorkflow.description != null && selectedWorkflow.description !== '' && (
                    <div>
                      <dt className="text-gray-500">描述</dt>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <dd className="text-gray-700 line-clamp-2 cursor-default">{selectedWorkflow.description}</dd>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[320px] break-words">{selectedWorkflow.description}</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {selectedWorkflow.stepCount != null && (
                    <div>
                      <dt className="text-gray-500">节点数</dt>
                      <dd className="text-gray-900">{selectedWorkflow.stepCount} 个</dd>
                    </div>
                  )}
                  {selectedWorkflow.updatedAt != null && (
                    <div>
                      <dt className="text-gray-500">更新时间</dt>
                      <dd className="text-gray-700">{formatTimestampBeijing(selectedWorkflow.updatedAt)}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <div className="text-xs text-gray-500">
                  {displayName || selectedId}
                  {listFetched ? '' : '（打开下拉可加载详情）'}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500">
            执行时会将所选工作流按引用顺序内联到当前工作流中，统一使用当前执行环境。
          </p>
        </div>
      </Section>
    </div>
  );
};
