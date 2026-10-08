/**
 * 测试计划报告列表页
 * 从 aegis-next-web/views/test-plan/report 迁移
 * 支持：类型筛选、搜索、高级筛选、批量删除、重命名、单条导出
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, FileText, Trash2, FileDown, Pencil, Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TruncateWithTooltip } from '@/components/ui/truncate-with-tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { testPlanManagementService } from '@/services';
import { toast } from 'sonner';
import { formatTimestampBeijing } from '@/utils/date';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ReportShowType = 'All' | 'INDEPENDENT' | 'INTEGRATED';

const REPORT_SHOW_TYPE_KEY = 'testPlanReportShowType';

const RESULT_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'PASS', label: '通过' },
  { value: 'FAIL', label: '不通过' },
] as const;

const TRIGGER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'MANUAL', label: '手动' },
  { value: 'SCHEDULE', label: '定时' },
  { value: 'BATCH', label: '批量执行' },
  { value: 'API', label: '接口调用' },
] as const;

interface TestPlanReportListPageProps {
  onViewReport?: (reportId: string) => void;
}

export function TestPlanReportListPage({ onViewReport }: TestPlanReportListPageProps) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [showType, setShowType] = useState<ReportShowType>(() => {
    const v = localStorage.getItem(REPORT_SHOW_TYPE_KEY);
    return (v === 'INDEPENDENT' || v === 'INTEGRATED' ? v : 'All') as ReportShowType;
  });
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameRow, setRenameRow] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [exportLoadingId, setExportLoadingId] = useState<string | null>(null);
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterTrigger, setFilterTrigger] = useState<string>('all');
  const [filterPassRateMin, setFilterPassRateMin] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState(false);
  const projectId = localStorage.getItem('currentProjectId') || '';
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadList = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const filter: Record<string, string[]> = {};
      if (showType !== 'All') {
        // 后端 filter 中 integrated 按字符串 'true'/'false' 比较（ExtTestPlanReportMapper.xml）
        filter.integrated = showType === 'INTEGRATED' ? ['true'] : ['false'];
      }
      if (filterResult !== 'all') {
        // 后端 result_status 取值为 SUCCESS / ERROR / FAKE_ERROR
        filter.resultStatus = [filterResult === 'PASS' ? 'SUCCESS' : 'ERROR'];
      }
      if (filterTrigger !== 'all') {
        filter.triggerMode = [filterTrigger];
      }
      // 通过率：后端只在 combineSearch.systemFieldConditions 中处理 passRate，不走 filter
      let combineSearch: { searchMode: 'AND'; conditions: Array<{ name: string; operator: string; value: number; customField: boolean }> } | undefined;
      if (filterPassRateMin.trim() !== '') {
        const num = Number(filterPassRateMin.trim());
        if (!Number.isNaN(num) && num >= 0 && num <= 100) {
          // 后端 BaseMapper 仅有 GT(>)，用 value=num-0.01 实现 通过率 >= num
          combineSearch = {
            searchMode: 'AND',
            conditions: [
              { name: 'passRate', operator: 'GT', value: Math.max(-0.01, num - 0.01), customField: false },
            ],
          };
        }
      }
      const res = await testPlanManagementService.reportList({
        current,
        pageSize,
        projectId,
        keyword: keyword || undefined,
        filter: Object.keys(filter).length ? filter : undefined,
        combineSearch,
      });
      const data = res as any;
      setList(data?.list ?? data?.records ?? []);
      setTotal(data?.total ?? 0);
    } catch (e) {
      console.error(e);
      toast.error('加载报告列表失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, current, pageSize, keyword, showType, filterResult, filterTrigger, filterPassRateMin]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    localStorage.setItem(REPORT_SHOW_TYPE_KEY, showType);
  }, [showType]);

  const handleViewReport = (reportId: string) => {
    if (onViewReport) {
      onViewReport(reportId);
    } else {
      navigate(`/test-plan?menu=test-plan&tab=test-report&reportId=${reportId}`);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await testPlanManagementService.reportDelete(deleteTarget.id);
      toast.success('删除成功');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadList();
    } catch (e) {
      console.error(e);
      toast.error('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await testPlanManagementService.reportBathDelete({
        selectIds: ids,
        projectId,
      });
      toast.success('批量删除成功');
      setSelectedIds(new Set());
      loadList();
    } catch (e) {
      console.error(e);
      toast.error('批量删除失败');
    }
  };

  const openRename = (row: any) => {
    setRenameRow({ id: row.id, name: row.name ?? '' });
    setRenameValue(row.name ?? '');
    setRenameOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameRow || !renameValue.trim()) return;
    setRenameLoading(true);
    try {
      await testPlanManagementService.reportRename(renameRow.id, renameValue.trim());
      toast.success('重命名成功');
      setRenameOpen(false);
      setRenameRow(null);
      loadList();
    } catch (e) {
      console.error(e);
      toast.error('重命名失败');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleExportPdf = async (row: any) => {
    const id = row.id;
    setExportLoadingId(id);
    try {
      const blob = await testPlanManagementService.testPlanReportExportPdf(id);
      if (!(blob instanceof Blob)) {
        toast.error('导出失败：返回格式异常');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.name ?? '测试计划报告'}-${id}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
      a.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (e) {
      console.error(e);
      toast.error('导出 PDF 失败');
    } finally {
      setExportLoadingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((r) => r.id)));
    }
  };

  const changeShowType = (type: ReportShowType) => {
    setShowType(type);
    setCurrent(1);
    setSelectedIds(new Set());
  };

  const hasActiveFilter = filterResult !== 'all' || filterTrigger !== 'all' || filterPassRateMin.trim() !== '';

  const handleResetFilter = () => {
    setFilterResult('all');
    setFilterTrigger('all');
    setFilterPassRateMin('');
    setCurrent(1);
    setSelectedIds(new Set());
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50">
      <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {(['All', 'INDEPENDENT', 'INTEGRATED'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    showType === type
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => changeShowType(type)}
                >
                  {type === 'All' ? '全部' : type === 'INDEPENDENT' ? '计划报告' : '计划组报告'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="按报告名称或计划名称搜索"
                  className="pl-9 h-9"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadList()}
                />
              </div>
              <Button variant="outline" size="sm" className="h-9" onClick={loadList}>
                搜索
              </Button>
            </div>
            <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <Filter className="w-4 h-4" />
                  高级筛选
                  {hasActiveFilter && (
                    <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap items-end gap-3 pt-3 mt-3 border-t border-gray-100">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-gray-500">结果状态</Label>
                    <Select
                      value={filterResult}
                      onValueChange={(v) => {
                        setFilterResult(v);
                        setCurrent(1);
                      }}
                    >
                      <SelectTrigger className="w-[120px] h-9">
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESULT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-gray-500">触发方式</Label>
                    <Select
                      value={filterTrigger}
                      onValueChange={(v) => {
                        setFilterTrigger(v);
                        setCurrent(1);
                      }}
                    >
                      <SelectTrigger className="w-[130px] h-9">
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-gray-500">通过率 ≥ (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0-100"
                      className="w-[100px] h-9"
                      value={filterPassRateMin}
                      onChange={(e) => setFilterPassRateMin(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" className="h-9 gap-1" onClick={handleResetFilter}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    重置
                  </Button>
                  <Button size="sm" className="h-9" onClick={() => { setCurrent(1); loadList(); }}>
                    查询
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
            {hasActiveFilter && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-gray-600" onClick={handleResetFilter}>
                <RotateCcw className="w-3.5 h-3.5" />
                清除筛选
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" className="h-9" onClick={handleBatchDelete}>
                <Trash2 className="w-4 h-4 mr-1.5" />
                批量删除 ({selectedIds.size})
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9" onClick={loadList} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="w-10">
                  <Checkbox
                    checked={list.length > 0 && selectedIds.size === list.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="全选"
                  />
                </TableHead>
                <TableHead className="w-[220px]">报告名称</TableHead>
                <TableHead className="w-[100px]">类型</TableHead>
                <TableHead className="w-[180px]">计划名称</TableHead>
                <TableHead className="w-[100px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="flex items-center gap-1 hover:text-gray-900 font-medium">
                        结果
                        <Filter className="w-3 h-3 text-gray-400" />
                        {filterResult !== 'all' && (
                          <span className="text-blue-600 text-[10px]">
                            (已筛: {RESULT_OPTIONS.find((o) => o.value === filterResult)?.label ?? filterResult})
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-36 p-2" align="start">
                      {RESULT_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${filterResult === o.value ? 'text-blue-600 font-medium' : ''}`}
                          onClick={() => {
                            setFilterResult(o.value);
                            setCurrent(1);
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </TableHead>
                <TableHead className="w-[100px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="flex items-center gap-1 hover:text-gray-900 font-medium">
                        通过率
                        <Filter className="w-3 h-3 text-gray-400" />
                        {filterPassRateMin.trim() !== '' && (
                          <span className="text-blue-600 text-[10px]">(已筛)</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-3" align="start">
                      <Label className="text-xs text-gray-500">通过率 ≥ (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0-100"
                        className="w-full h-8 mt-1.5"
                        value={filterPassRateMin}
                        onChange={(e) => setFilterPassRateMin(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-7 flex-1"
                          onClick={() => {
                            setCurrent(1);
                            loadList();
                          }}
                        >
                          确定
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => {
                            setFilterPassRateMin('');
                            setCurrent(1);
                          }}
                        >
                          清空
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableHead>
                <TableHead className="w-[110px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="flex items-center gap-1 hover:text-gray-900 font-medium">
                        触发方式
                        <Filter className="w-3 h-3 text-gray-400" />
                        {filterTrigger !== 'all' && (
                          <span className="text-blue-600 text-[10px]">
                            (已筛: {TRIGGER_OPTIONS.find((o) => o.value === filterTrigger)?.label ?? filterTrigger})
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-36 p-2" align="start">
                      {TRIGGER_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${filterTrigger === o.value ? 'text-blue-600 font-medium' : ''}`}
                          onClick={() => {
                            setFilterTrigger(o.value);
                            setCurrent(1);
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </TableHead>
                <TableHead className="w-[100px]">创建人</TableHead>
                <TableHead className="w-[160px]">创建时间</TableHead>
                <TableHead className="w-[180px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-48 text-center text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 opacity-60" />
                    <div>加载中...</div>
                  </TableCell>
                </TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-48 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <div>暂无报告</div>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={row.id} className="hover:bg-blue-50/20">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                        aria-label={`选择 ${row.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-blue-600 hover:underline text-left truncate max-w-[200px] block"
                        onClick={() => handleViewReport(row.id)}
                      >
                        {row.name ?? '-'}
                      </button>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {row.integrated ? '计划组报告' : '计划报告'}
                    </TableCell>
                    <TableCell className="text-gray-600 max-w-[180px]">
                      <TruncateWithTooltip className="block">
                        {row.planName ?? row.testPlanName ?? '-'}
                      </TruncateWithTooltip>
                    </TableCell>
                    <TableCell>
                      {row.resultStatus === 'PASS' || row.resultStatus === 'SUCCESS' ? (
                        <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 hover:bg-green-50">
                          {row.resultStatus === 'SUCCESS' ? '成功' : '通过'}
                        </Badge>
                      ) : row.resultStatus === 'FAIL' || row.resultStatus === 'error' || row.resultStatus === 'ERROR' ? (
                        <Badge variant="destructive">
                          {row.resultStatus === 'error' || row.resultStatus === 'ERROR' ? '失败' : '不通过'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-gray-600 bg-gray-100">
                          {row.resultStatus ?? '-'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">{row.passRate != null ? `${row.passRate}%` : '-'}</TableCell>
                    <TableCell className="text-gray-600">
                      {row.triggerMode === 'MANUAL' ? '手动' : row.triggerMode === 'SCHEDULE' ? '定时' : row.triggerMode === 'BATCH' ? '批量执行' : row.triggerMode === 'API' ? '接口调用' : row.triggerMode ?? '-'}
                    </TableCell>
                    <TableCell className="text-gray-600">{row.createUserName ?? row.createUser ?? '-'}</TableCell>
                    <TableCell className="text-gray-600 text-sm">{formatTimestampBeijing(row.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleViewReport(row.id)}
                        >
                          查看
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => openRename(row)}
                          title="重命名"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          disabled={exportLoadingId === row.id}
                          onClick={() => handleExportPdf(row)}
                          title="导出 PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(row.id, row.name)}
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          {total > 0 && (
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>共 {total} 条</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={current <= 1}
                  onClick={() => setCurrent((p) => Math.max(1, p - 1))}
                >
                  上一页
                </Button>
                <span className="px-2">
                  {current} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={current >= totalPages}
                  onClick={() => setCurrent((p) => Math.min(totalPages, p + 1))}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>重命名报告</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="报告名称"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!renameValue.trim() || renameLoading}>
              {renameLoading ? '保存中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除报告</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除测试计划报告
              <span className="font-semibold text-gray-900">
                {deleteTarget ? `「${deleteTarget.name || '未命名报告'}」` : ''}
              </span>
              吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? '删除中...' : '确定删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
