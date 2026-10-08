/**
 * 功能用例回收站
 * 从 aegis-next-server 迁移
 */

import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, RotateCcw, Search, ArrowLeft, Sparkles } from 'lucide-react';
import { caseManagementService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import type { CaseItem, ModuleTreeNode } from './types';
import { REVIEW_STATUS_MAP } from './constants';
import { getModulePath } from './utils';
import { collectOffspringIds } from './utils/collectOffspringIds';
import { CaseLevelBadge, ModuleTreePanel } from './components';

interface RecycleCaseListProps {
  projectId?: string;
  onBack?: () => void;
}

export function RecycleCaseList({ projectId = localStorage.getItem('currentProjectId') || 'default-project', onBack }: RecycleCaseListProps) {
  const [loading, setLoading] = useState(false);
  const [caseList, setCaseList] = useState<CaseItem[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [moduleTree, setModuleTree] = useState<ModuleTreeNode[]>([]);
  const [modulesCount, setModulesCount] = useState<Record<string, number>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [moduleSearchKeyword, setModuleSearchKeyword] = useState('');

  const fetchModuleTree = async () => {
    try {
      const r = await caseManagementService.getTrashCaseModuleTree(projectId);
      setModuleTree(r || []);
    } catch {
      setModuleTree([]);
    }
  };

  const fetchModulesCount = async () => {
    try {
      const params: any = {
        projectId,
        moduleIds: [],
        current: 1,
        pageSize: 10,
        keyword: searchKeyword || undefined,
      };
      const result = await caseManagementService.getRecycleModulesCounts(params);
      setModulesCount(result || {});
    } catch (err) {
      console.error('获取回收站模块数量失败:', err);
      setModulesCount({});
    }
  };

  useEffect(() => {
    fetchModuleTree();
  }, [projectId]);

  useEffect(() => {
    fetchModulesCount();
  }, [projectId, searchKeyword]);

  const offspringIds = selectedModuleId === 'all' ? [] : collectOffspringIds(moduleTree, selectedModuleId);

  const fetchList = async () => {
    setLoading(true);
    try {
      const result = await caseManagementService.getRecycleListRequest({
        projectId,
        current: currentPage,
        pageSize,
        keyword: searchKeyword || undefined,
        moduleIds: selectedModuleId === 'all' ? [] : [selectedModuleId, ...offspringIds],
      });
      const list = result?.list || result?.data || [];
      setCaseList(list);
      setTotal(result?.total ?? list.length);
    } catch (err) {
      console.error('获取回收站列表失败:', err);
      setCaseList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [currentPage, pageSize, searchKeyword, projectId, selectedModuleId]);

  const handleRestore = async (id: string) => {
    try {
      await caseManagementService.recoverRecycleCase(id);
      fetchList();
    } catch (err) {
      console.error('恢复失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要彻底删除该用例吗？此操作不可恢复。')) return;
    try {
      await caseManagementService.deleteRecycleCaseList(id);
      fetchList();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleBatchRestore = async () => {
    if (selectedCases.length === 0) return;
    try {
      await caseManagementService.restoreCaseList({
        projectId,
        selectIds: selectedCases,
        selectAll: false,
        excludeIds: [],
      });
      setSelectedCases([]);
      fetchList();
    } catch (err) {
      console.error('批量恢复失败:', err);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setCurrentPage(1);
  };

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <ModuleTreePanel
            moduleTree={moduleTree}
            modulesCount={modulesCount}
            expandedNodes={expandedNodes}
            selectedModuleId={selectedModuleId}
            moduleSearchKeyword={moduleSearchKeyword}
            allModuleCount={modulesCount['all'] ?? modulesCount['ALL'] ?? total}
            onModuleSearchChange={setModuleSearchKeyword}
            onModuleSelect={handleModuleSelect}
            onToggleExpand={toggleNodeExpand}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80} className="flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col m-4 min-h-0">
            <CardContent className="flex-1 flex flex-col p-4 min-h-0">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  {onBack && (
                    <Button variant="ghost" size="sm" onClick={onBack}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> 返回
                    </Button>
                  )}
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    用例回收站
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchList()} placeholder="搜索用例..." className="pl-10" />
                  </div>
                  <Button variant="outline" onClick={fetchList} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 刷新
                  </Button>
                </div>
              </div>
              {selectedCases.length > 0 && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4">
                  <span className="text-sm text-blue-800">已选择 <strong>{selectedCases.length}</strong> 项</span>
                  <Button variant="outline" size="sm" onClick={handleBatchRestore}>
                    <RotateCcw className="w-4 h-4 mr-2" /> 批量恢复
                  </Button>
                </div>
              )}
              <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50 z-10">
                    <TableRow>
                      <TableHead className="w-12"><Checkbox /></TableHead>
                      <TableHead className="w-24">编号</TableHead>
                      <TableHead className="min-w-[180px]">用例名称</TableHead>
                      <TableHead className="w-20">用例等级</TableHead>
                      <TableHead className="w-24">评审结果</TableHead>
                      <TableHead className="w-36">所属模块</TableHead>
                      <TableHead className="w-24">更新人</TableHead>
                      <TableHead className="w-36">更新时间</TableHead>
                      <TableHead className="w-24">删除人</TableHead>
                      <TableHead className="w-36">删除时间</TableHead>
                      <TableHead className="w-24 text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></TableCell></TableRow>
                    ) : caseList.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-12"><Trash2 className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">回收站为空</p></TableCell></TableRow>
                    ) : (
                      caseList.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell><Checkbox checked={selectedCases.includes(item.id)} onCheckedChange={(c) => setSelectedCases(c ? [...selectedCases, item.id] : selectedCases.filter(id => id !== item.id))} /></TableCell>
                          <TableCell className="font-mono text-sm">{item.num ?? item.id?.slice(0, 8)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="truncate max-w-[200px]" title={item.name}>
                                {item.name || '-'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <CaseLevelBadge item={item} />
                          </TableCell>
                          <TableCell>{item.reviewStatus ? <span className={`text-xs px-2 py-0.5 rounded ${REVIEW_STATUS_MAP[item.reviewStatus]?.color || 'bg-gray-100'}`}>{REVIEW_STATUS_MAP[item.reviewStatus]?.label || item.reviewStatus}</span> : '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{item.moduleId ? getModulePath(item.moduleId, moduleTree) : '-'}</TableCell>
                          <TableCell className="text-sm">{item.updateUserName || item.updateUser || '-'}</TableCell>
                          <TableCell className="text-gray-600 text-sm">{item.updatedAt ? new Date(item.updatedAt as string | number).toLocaleString('zh-CN') : '-'}</TableCell>
                          <TableCell className="text-sm">{item.deleteUserName || item.deleteUser || '-'}</TableCell>
                          <TableCell className="text-gray-600 text-sm">{item.deleteTime ? new Date(item.deleteTime as string | number).toLocaleString('zh-CN') : '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleRestore(item.id)}>恢复</Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(item.id)}>彻底删除</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="text-xs text-gray-400 flex items-center gap-1.5">
                    共 <span className="font-medium text-gray-900">{total}</span> 条
                  </div>
                  <Pagination className="w-auto m-0">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={`h-7 px-2 text-xs cursor-pointer ${currentPage === 1 ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'}`}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className={`h-7 w-7 text-xs cursor-pointer rounded ${currentPage === pageNum ? 'bg-[#165DFF] text-white hover:bg-[#165DFF]/90 border-0' : 'hover:bg-gray-50'}`}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={`h-7 px-2 text-xs cursor-pointer ${currentPage === totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
