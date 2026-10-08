/**
 * 测试用例 - 筛选抽屉（优化版）
 * 参考 aegis-next-server filterDrawer.vue
 * 优化：UI/UX 改进、重要按钮蓝色、更好的布局和交互
 */

import { useState, useEffect, useMemo } from 'react';
import { Info, Plus, X, Filter, RotateCcw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import type { ModuleTreeNode } from '../types';
import { CaseLevelOption } from './CaseLevelBadge';
import { CASE_LEVEL_MAP, REVIEW_STATUS_MAP, EXECUTE_RESULT_MAP } from '../constants';
import { cn } from '@/utils/cn';

const FILTER_FIELDS: { dataIndex: string; title: string; operators: { value: string; label: string }[] }[] = [
  { dataIndex: 'num', title: 'ID', operators: [{ value: 'CONTAINS', label: '包含' }] },
  { dataIndex: 'name', title: '用例名称', operators: [{ value: 'CONTAINS', label: '包含' }] },
  { dataIndex: 'moduleId', title: '所属模块', operators: [{ value: 'IN', label: '属于' }] },
  { dataIndex: 'caseLevel', title: '用例等级', operators: [{ value: 'IN', label: '属于' }] },
  { dataIndex: 'reviewStatus', title: '评审结果', operators: [{ value: 'IN', label: '属于' }] },
  { dataIndex: 'lastExecuteResult', title: '执行结果', operators: [{ value: 'IN', label: '属于' }] },
  { dataIndex: 'createUser', title: '创建人', operators: [{ value: 'IN', label: '属于' }] },
  { dataIndex: 'createdAt', title: '创建时间', operators: [{ value: 'CONTAINS', label: '包含' }] },
  { dataIndex: 'updateUser', title: '更新人', operators: [{ value: 'IN', label: '属于' }] },
  { dataIndex: 'updatedAt', title: '更新时间', operators: [{ value: 'CONTAINS', label: '包含' }] },
  { dataIndex: 'tags', title: '标签', operators: [{ value: 'CONTAINS', label: '包含' }] },
];

export interface FilterCondition {
  dataIndex: string;
  operator: string;
  value: string | string[];
}

export interface FilterResult {
  searchMode: 'AND' | 'OR';
  conditions: FilterCondition[];
}

const CASE_LEVEL_OPTIONS = Object.keys(CASE_LEVEL_MAP).map((value) => ({ value }));
const REVIEW_STATUS_OPTIONS = Object.entries(REVIEW_STATUS_MAP).map(([value, { label }]) => ({ value, label }));
const EXECUTE_RESULT_OPTIONS = Object.entries(EXECUTE_RESULT_MAP).map(([value, { label }]) => ({ value, label }));

const SAVED_VIEWS_KEY = 'case-management-saved-views';

export function loadSavedViews(): { id: string; name: string; filter: FilterResult }[] {
  try {
    const s = localStorage.getItem(SAVED_VIEWS_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function saveView(name: string, filter: FilterResult): string {
  const views = loadSavedViews();
  const id = `custom_${Date.now()}`;
  views.push({ id, name, filter });
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  return id;
}

interface CaseFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewName: string;
  moduleTree: ModuleTreeNode[];
  memberOptions?: { id: string; name: string }[];
  initialFilter?: FilterResult;
  onFilter: (filter: FilterResult) => void;
  onSaveAsView?: (name: string, filter: FilterResult, newViewId: string) => void;
}

function flattenModules(nodes: ModuleTreeNode[], indent = 0): { node: ModuleTreeNode; indent: number }[] {
  const result: { node: ModuleTreeNode; indent: number }[] = [];
  for (const node of nodes) {
    result.push({ node, indent });
    if (node.children?.length) {
      result.push(...flattenModules(node.children, indent + 1));
    }
  }
  return result;
}

export function CaseFilterDrawer({
  open,
  onOpenChange,
  viewName,
  moduleTree,
  memberOptions = [],
  initialFilter,
  onFilter,
  onSaveAsView,
}: CaseFilterDrawerProps) {
  const [searchMode, setSearchMode] = useState<'AND' | 'OR'>(initialFilter?.searchMode ?? 'AND');
  const [conditions, setConditions] = useState<FilterCondition[]>(
    initialFilter?.conditions?.length
      ? initialFilter.conditions
      : [
          { dataIndex: 'num', operator: 'CONTAINS', value: '' },
          { dataIndex: 'name', operator: 'CONTAINS', value: '' },
          { dataIndex: 'moduleId', operator: 'IN', value: [] },
        ]
  );
  const [saveAsName, setSaveAsName] = useState('');
  const [showSaveAs, setShowSaveAs] = useState(false);

  const flatModules = useMemo(() => flattenModules(moduleTree), [moduleTree]);

  // 当抽屉打开时，同步初始筛选条件
  useEffect(() => {
    if (open) {
      setSearchMode(initialFilter?.searchMode ?? 'AND');
      setConditions(
        initialFilter?.conditions?.length
          ? initialFilter.conditions
          : [
              { dataIndex: 'num', operator: 'CONTAINS', value: '' },
              { dataIndex: 'name', operator: 'CONTAINS', value: '' },
              { dataIndex: 'moduleId', operator: 'IN', value: [] },
            ]
      );
      setShowSaveAs(false);
      setSaveAsName('');
    }
  }, [open, initialFilter]);

  // 计算有效条件数量
  const validConditionsCount = useMemo(() => {
    return conditions.filter((c) => {
      if (Array.isArray(c.value)) return c.value.length > 0;
      return String(c.value || '').trim() !== '';
    }).length;
  }, [conditions]);

  const handleAddCondition = () => {
    const used = new Set(conditions.map((c) => c.dataIndex));
    const next = FILTER_FIELDS.find((f) => !used.has(f.dataIndex)) ?? FILTER_FIELDS[0];
    setConditions([...conditions, { dataIndex: next.dataIndex, operator: next.operators[0].value, value: '' }]);
  };

  const handleRemoveCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const handleUpdateCondition = (idx: number, patch: Partial<FilterCondition>) => {
    setConditions(conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const handleReset = () => {
    setSearchMode('AND');
    setConditions([
      { dataIndex: 'num', operator: 'CONTAINS', value: '' },
      { dataIndex: 'name', operator: 'CONTAINS', value: '' },
      { dataIndex: 'moduleId', operator: 'IN', value: [] },
    ]);
    setShowSaveAs(false);
    setSaveAsName('');
  };

  const handleApply = () => {
    const validConditions = conditions.filter((c) => {
      if (Array.isArray(c.value)) return c.value.length > 0;
      return String(c.value || '').trim() !== '';
    });
    
    if (validConditions.length === 0) {
      toast.error('请至少添加一个有效的筛选条件');
      return;
    }
    
    onFilter({ searchMode, conditions: validConditions });
    onOpenChange(false);
    toast.success('筛选已应用');
  };

  const handleSaveAs = () => {
    const name = saveAsName.trim();
    if (!name) {
      toast.error('请输入视图名称');
      return;
    }
    const validConditions = conditions.filter((c) => {
      if (Array.isArray(c.value)) return c.value.length > 0;
      return String(c.value || '').trim() !== '';
    });
    
    if (validConditions.length === 0) {
      toast.error('请至少添加一个有效的筛选条件');
      return;
    }
    
    const filterResult = { searchMode, conditions: validConditions };
    const newViewId = saveView(name, filterResult);
    onSaveAsView?.(name, filterResult, newViewId);
    setShowSaveAs(false);
    setSaveAsName('');
    toast.success('视图已保存');
  };

  const renderValueInput = (cond: FilterCondition, idx: number) => {
    const field = FILTER_FIELDS.find((f) => f.dataIndex === cond.dataIndex);
    if (!field) return null;

    if (cond.dataIndex === 'moduleId') {
      return (
        <Select
          value={Array.isArray(cond.value) ? (cond.value[0] as string) || '' : ''}
          onValueChange={(v) => handleUpdateCondition(idx, { value: v ? [v] : [] })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="请选择模块" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {flatModules.map(({ node, indent }) => (
              <SelectItem key={node.id} value={node.id}>
                <span style={{ paddingLeft: indent * 16 }}>{node.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (cond.dataIndex === 'caseLevel') {
      const selected = Array.isArray(cond.value) ? (cond.value as string[]) : [];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 justify-between w-full font-normal">
              {selected.length === 0 ? '请选择用例等级（可多选）' : `已选 ${selected.length} 项`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 max-h-[280px] overflow-auto" align="start">
            {CASE_LEVEL_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer text-sm">
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const next = checked ? [...selected, opt.value] : selected.filter((v) => v !== opt.value);
                    handleUpdateCondition(idx, { value: next });
                  }}
                />
                <CaseLevelOption value={opt.value} />
              </label>
            ))}
          </PopoverContent>
        </Popover>
      );
    }

    if (cond.dataIndex === 'reviewStatus') {
      const selected = Array.isArray(cond.value) ? (cond.value as string[]) : [];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 justify-between w-full font-normal">
              {selected.length === 0 ? '请选择评审结果（可多选）' : `已选 ${selected.length} 项`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 max-h-[280px] overflow-auto" align="start">
            {REVIEW_STATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer text-sm">
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const next = checked ? [...selected, opt.value] : selected.filter((v) => v !== opt.value);
                    handleUpdateCondition(idx, { value: next });
                  }}
                />
                {opt.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>
      );
    }

    if (cond.dataIndex === 'lastExecuteResult') {
      const selected = Array.isArray(cond.value) ? (cond.value as string[]) : [];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 justify-between w-full font-normal">
              {selected.length === 0 ? '请选择执行结果（可多选）' : `已选 ${selected.length} 项`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 max-h-[280px] overflow-auto" align="start">
            {EXECUTE_RESULT_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer text-sm">
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const next = checked ? [...selected, opt.value] : selected.filter((v) => v !== opt.value);
                    handleUpdateCondition(idx, { value: next });
                  }}
                />
                {opt.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>
      );
    }

    if (cond.dataIndex === 'createUser' || cond.dataIndex === 'updateUser') {
      const selected = Array.isArray(cond.value) ? (cond.value as string[]) : [];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 justify-between w-full font-normal">
              {selected.length === 0 ? '请选择用户（可多选）' : `已选 ${selected.length} 人`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 max-h-[300px] overflow-auto" align="start">
            {memberOptions.length > 0 ? (
              memberOptions.map((m) => (
                <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer text-sm truncate">
                  <Checkbox
                    checked={selected.includes(m.id)}
                    onCheckedChange={(checked) => {
                      const next = checked ? [...selected, m.id] : selected.filter((v) => v !== m.id);
                      handleUpdateCondition(idx, { value: next });
                    }}
                  />
                  <span className="truncate">{m.name}</span>
                </label>
              ))
            ) : (
              <div className="px-2 py-4 text-sm text-gray-500 text-center">暂无用户数据</div>
            )}
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <Input
        className="h-9"
        placeholder="请输入关键字（多个关键字用空格分隔）"
        value={Array.isArray(cond.value) ? '' : (cond.value as string)}
        onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
      />
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[700px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <SheetTitle className="text-base">{viewName}</SheetTitle>
            </div>
            {validConditionsCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {validConditionsCount} 个条件
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-6">
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-gray-700">
              筛选模式下，模块过滤仅可在当前过滤器中操作
            </AlertDescription>
          </Alert>

          {/* 筛选模式选择 */}
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">筛选模式</Label>
            <Select value={searchMode} onValueChange={(v) => setSearchMode(v as 'AND' | 'OR')}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">
                  <div className="flex items-center gap-2">
                    <span>所有条件</span>
                    <Badge variant="outline" className="text-xs">AND</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="OR">
                  <div className="flex items-center gap-2">
                    <span>任一条件</span>
                    <Badge variant="outline" className="text-xs">OR</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1.5">
              {searchMode === 'AND' ? '必须同时满足所有条件' : '满足任一条件即可'}
            </p>
          </div>

          <Separator className="my-6" />

          {/* 筛选条件列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">筛选条件</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddCondition}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                添加条件
              </Button>
            </div>

            {conditions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">暂无筛选条件，点击上方"添加条件"开始筛选</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conditions.map((cond, idx) => {
                  const field = FILTER_FIELDS.find((f) => f.dataIndex === cond.dataIndex);
                  const isValid = Array.isArray(cond.value) 
                    ? cond.value.length > 0 
                    : String(cond.value || '').trim() !== '';
                  
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        isValid 
                          ? "bg-blue-50/50 border-blue-200" 
                          : "bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* 字段选择 */}
                        <Select
                          value={cond.dataIndex}
                          onValueChange={(v) => {
                            const newField = FILTER_FIELDS.find((f) => f.dataIndex === v);
                            handleUpdateCondition(idx, { 
                              dataIndex: v, 
                              value: '', 
                              operator: newField?.operators[0].value || 'CONTAINS'
                            });
                          }}
                        >
                          <SelectTrigger className="h-9 flex-1 min-w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FILTER_FIELDS.map((f) => {
                              const isUsed = conditions.some((c, i) => c.dataIndex === f.dataIndex && i !== idx);
                              return (
                                <SelectItem 
                                  key={f.dataIndex} 
                                  value={f.dataIndex}
                                  disabled={isUsed}
                                >
                                  {f.title}
                                  {isUsed && <span className="ml-2 text-xs text-gray-400">(已使用)</span>}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        {/* 操作符选择 */}
                        <Select
                          value={cond.operator}
                          onValueChange={(v) => handleUpdateCondition(idx, { operator: v })}
                        >
                          <SelectTrigger className="h-9 w-[100px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(field?.operators ?? [{ value: 'CONTAINS', label: '包含' }]).map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* 值输入 */}
                        <div className="flex-1 min-w-0">{renderValueInput(cond, idx)}</div>
                      </div>

                      {/* 删除按钮 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveCondition(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t gap-2 bg-gray-50">
          {showSaveAs ? (
            <>
              <Input
                placeholder="请输入视图名称"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveAs();
                  } else if (e.key === 'Escape') {
                    setShowSaveAs(false);
                  }
                }}
                className="h-9 flex-1 max-w-[240px]"
                autoFocus
              />
              <Button 
                size="sm" 
                onClick={handleSaveAs}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                保存
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setShowSaveAs(false);
                  setSaveAsName('');
                }}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSaveAs(true)}
                disabled={validConditionsCount === 0}
              >
                另存为视图
              </Button>
              <Button 
                size="sm" 
                onClick={handleApply}
                disabled={validConditionsCount === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[80px]"
              >
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                应用筛选
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
