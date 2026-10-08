/**
 * 调试历史抽屉组件
 * 用于显示工作流的调试执行历史记录
 */
import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  History,
  RefreshCw,
  FileText,
  Trash2,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronRight,
  Globe,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { JsonViewer } from '@/components/ui/json-viewer';
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
import { cn } from '@/utils/cn';
import { workflowService } from '@/services/workflow';
import type { DebugHistoryItem } from './types';
import type { WorkflowNodeData } from '@/components/workflow';

interface DebugHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyList: DebugHistoryItem[];
  loading: boolean;
  selectedRunId: string | null;
  historyDetail: any;
  workflowNodes: WorkflowNodeData[];
  onSelectHistory: (runId: string) => void;
  onDeleteHistory: (runId: string) => Promise<void>;
  onLoadDetail: (runId: string) => Promise<void>;
}

export const DebugHistoryDrawer: React.FC<DebugHistoryDrawerProps> = ({
  open,
  onOpenChange,
  historyList,
  loading,
  selectedRunId,
  historyDetail,
  workflowNodes,
  onSelectHistory,
  onDeleteHistory,
  onLoadDetail,
}) => {
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [expandedConsoleLogIds, setExpandedConsoleLogIds] = useState<Set<string>>(new Set());
  const [loadingConsoleLogs, setLoadingConsoleLogs] = useState<Set<string>>(new Set());
  const [consoleLogsMap, setConsoleLogsMap] = useState<Map<string, any[]>>(new Map());
  const [deleteHistoryDialogOpen, setDeleteHistoryDialogOpen] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);

  // 处理删除历史记录
  const handleDeleteHistory = useCallback((runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryToDelete(runId);
    setDeleteHistoryDialogOpen(true);
  }, []);

  // 确认删除调试历史记录
  const handleConfirmDeleteHistory = useCallback(async () => {
    if (!historyToDelete) {
      return;
    }
    setDeleteHistoryDialogOpen(false);
    try {
      await onDeleteHistory(historyToDelete);
      toast.success('删除成功');
    } catch (error: any) {
      console.error('删除调试历史失败:', error);
      toast.error(`删除失败: ${error?.response?.data?.message || error?.message || '未知错误'}`);
    } finally {
      setHistoryToDelete(null);
    }
  }, [historyToDelete, onDeleteHistory]);

  // 处理查看详情
  const handleViewDetail = useCallback(async (runId: string) => {
    onSelectHistory(runId);
    await onLoadDetail(runId);
  }, [onSelectHistory, onLoadDetail]);

  // 处理加载控制台日志
  const handleLoadConsoleLogs = useCallback(async (runId: string, stepId: string) => {
    if (!runId || !stepId) {
      toast.error('无法获取执行日志：缺少运行ID或节点ID');
      return;
    }

    const logKey = `${runId}-${stepId}`;
    setLoadingConsoleLogs(prev => new Set([...prev, logKey]));
    try {
      // 注意：日志入库时 run_step_id 存储的是 nodeId（即 stepId），所以这里使用 stepId 作为 runStepId
      const consoleLogs = await workflowService.getRunLogsByRunIdAndRunStepId(runId, stepId);
      setConsoleLogsMap(prev => new Map(prev.set(logKey, consoleLogs)));
    } catch (error: any) {
      toast.error(`获取执行日志失败: ${error?.response?.data?.message || error?.message || '未知错误'}`);
    } finally {
      setLoadingConsoleLogs(prev => {
        const newSet = new Set(prev);
        newSet.delete(logKey);
        return newSet;
      });
    }
  }, []);

  // 切换控制台日志展开状态
  const handleToggleConsoleLogs = useCallback((runId: string, stepId: string) => {
    const logKey = `${runId}-${stepId}`;
    const isConsoleExpanded = expandedConsoleLogIds.has(logKey);

    // 如果未展开且没有加载过日志，则加载日志
    if (!isConsoleExpanded && !consoleLogsMap.has(logKey) && runId && stepId) {
      handleLoadConsoleLogs(runId, stepId);
    }

    setExpandedConsoleLogIds(prev => {
      const newSet = new Set(prev);
      if (isConsoleExpanded) {
        newSet.delete(logKey);
      } else {
        newSet.add(logKey);
      }
      return newSet;
    });
  }, [expandedConsoleLogIds, consoleLogsMap, handleLoadConsoleLogs]);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <DrawerTitle className="text-lg font-semibold">调试历史</DrawerTitle>
              </div>
            </div>
            <DrawerDescription className="text-sm text-gray-500">
              查看当前工作流的调试执行历史记录
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-hidden flex min-h-0">
            {/* 历史列表区域 */}
            <div className="w-80 flex-shrink-0 border-r border-gray-200 p-6 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <RefreshCw className="w-8 h-8 mb-3 animate-spin" />
                  <p className="text-sm">加载中...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <History className="w-12 h-12 mb-3" />
                  <p className="text-sm">暂无调试历史</p>
                  <p className="text-xs mt-1 text-center">执行节点或运行工作流后，历史记录会显示在这里</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((item) => (
                    <div
                      key={item.runId}
                      className={cn(
                        "p-4 rounded-lg border transition-all cursor-pointer hover:shadow-sm relative group",
                        selectedRunId === item.runId
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white"
                      )}
                      onClick={() => handleViewDetail(item.runId)}
                    >
                      {/* 删除按钮 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                        onClick={(e) => handleDeleteHistory(item.runId, e)}
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>

                      <div className="flex items-start justify-between gap-3 mb-2 pr-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {item.workflowName || '未命名工作流'}
                            </span>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                                item.status === 'SUCCESS' || item.status === 'success'
                                  ? 'bg-green-100 text-green-700'
                                  : item.status === 'FAILED' || item.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : item.status === 'RUNNING' || item.status === 'running'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              )}
                            >
                              {item.status === 'SUCCESS' || item.status === 'success'
                                ? '成功'
                                : item.status === 'FAILED' || item.status === 'failed'
                                ? '失败'
                                : item.status === 'RUNNING' || item.status === 'running'
                                ? '运行中'
                                : '未完成'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            {item.triggerType === 'DEBUG' ? '调试' : '执行'} • {item.triggerUser}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-500">
                            {(item.startTime || item.createdAt)
                              ? new Date(item.startTime || item.createdAt || 0).toLocaleString('zh-CN')
                              : '时间未知'}
                          </div>
                          {(item.duration || item.durationMs) && (
                            <div className="text-xs text-gray-400 mt-1">
                              {item.duration || item.durationMs}ms
                            </div>
                          )}
                        </div>
                      </div>
                      {item.environmentName && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {item.environmentName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 详情区域 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-white">
              {!selectedRunId ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FileText className="w-12 h-12 mb-3" />
                  <p className="text-sm">选择左侧记录查看详情</p>
                </div>
              ) : !historyDetail ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <RefreshCw className="w-8 h-8 mb-3 animate-spin" />
                  <p className="text-sm">加载详情中...</p>
                </div>
              ) : !historyDetail.steps || historyDetail.steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FileText className="w-12 h-12 mb-3" />
                  <p className="text-sm">暂无执行详情</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyDetail.steps.map((step: any) => {
                    // 从工作流中查找节点名称
                    const nodeInWorkflow = workflowNodes.find((n: WorkflowNodeData) => n.id === step.stepId);
                    const nodeName = step.stepName || step.name || nodeInWorkflow?.name || step.description || step.stepId || '未命名节点';
                    const nodeType = step.stepType || nodeInWorkflow?.type || '未知类型';

                    return (
                      <div
                        key={step.stepId}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                      >
                        {/* 节点标题 */}
                        <div
                          className={cn(
                            "px-4 py-3 flex items-center gap-2 cursor-pointer transition-colors",
                            expandedLogIds.has(step.stepId) ? "bg-gray-50" : "hover:bg-gray-50"
                          )}
                          onClick={() => {
                            setExpandedLogIds((prev) => {
                              const newSet = new Set(prev);
                              if (newSet.has(step.stepId)) {
                                newSet.delete(step.stepId);
                              } else {
                                newSet.add(step.stepId);
                              }
                              return newSet;
                            });
                          }}
                        >
                          {step.status === 'SUCCESS' || step.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : step.status === 'FAILED' || step.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {nodeName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {nodeType}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* 执行日志按钮 */}
                            {selectedRunId && step.stepId && (step.status === 'SUCCESS' || step.status === 'success' || step.status === 'FAILED' || step.status === 'failed') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleConsoleLogs(selectedRunId, step.stepId);
                                }}
                                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                                disabled={loadingConsoleLogs.has(`${selectedRunId}-${step.stepId}`)}
                              >
                                {loadingConsoleLogs.has(`${selectedRunId}-${step.stepId}`) ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    加载中...
                                  </>
                                ) : expandedConsoleLogIds.has(`${selectedRunId}-${step.stepId}`) ? (
                                  <>
                                    <FileText className="w-3 h-3" />
                                    收起日志
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-3 h-3" />
                                    执行日志
                                  </>
                                )}
                              </button>
                            )}
                            <ChevronRight
                              className={cn(
                                "w-4 h-4 text-gray-400 transition-transform",
                                expandedLogIds.has(step.stepId) && "rotate-90"
                              )}
                            />
                          </div>
                        </div>

                        {/* 详情内容 */}
                        {expandedLogIds.has(step.stepId) && (
                          <div className="border-t border-gray-200">
                            {step.status === 'FAILED' || step.status === 'failed' ? (
                              /* 错误信息 */
                              <div className="px-4 py-3 bg-red-50">
                                <div className="text-sm font-medium text-red-700 mb-2">执行失败</div>
                                {step.errorMsg && (
                                  <div className="text-xs text-red-600 bg-red-100 p-2 rounded mb-2">
                                    {step.errorMsg}
                                  </div>
                                )}
                                {step.errorStack && (
                                  <div className="text-xs text-red-600 font-mono bg-red-100 p-2 rounded overflow-auto max-h-40">
                                    <pre className="whitespace-pre-wrap break-all">{step.errorStack}</pre>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* 成功内容 */
                              <div className="px-4 py-3">
                                <div className="space-y-0 border rounded-lg overflow-hidden">
                                  {/* URL */}
                                  {step.requestData && typeof step.requestData === 'object' && (() => {
                                    const requestData = step.requestData as any;
                                    const url = requestData?.url || requestData?.path || null;
                                    return url ? (
                                      <Collapsible defaultOpen={false}>
                                        <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b last:border-b-0">
                                          <ChevronRight className="w-4 h-4 text-gray-500 transition-transform duration-200 data-[state=open]:rotate-90" />
                                          <span>URL</span>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <div className="overflow-hidden pl-4 relative group">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="absolute top-2 right-2 z-10 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                  await navigator.clipboard.writeText(url);
                                                  toast.success('已复制到剪贴板');
                                                } catch (err) {
                                                  toast.error('复制失败');
                                                }
                                              }}
                                            >
                                              <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                            <div className="bg-white border border-gray-200 text-blue-600 p-3 font-mono text-xs break-all select-text">
                                              {url}
                                            </div>
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    ) : null;
                                  })()}

                                  {/* 请求头 */}
                                  {step.requestData && typeof step.requestData === 'object' && (() => {
                                    const requestData = step.requestData as any;
                                    const headers = requestData?.headers;
                                    return headers && Object.keys(headers).length > 0 ? (
                                      <Collapsible defaultOpen={false}>
                                        <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b last:border-b-0">
                                          <ChevronRight className="w-4 h-4 text-gray-500 transition-transform duration-200 data-[state=open]:rotate-90" />
                                          <span>请求头</span>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <div className="overflow-hidden pl-4">
                                            <JsonViewer data={headers} />
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    ) : null;
                                  })()}

                                  {/* 请求体 */}
                                  {step.requestData && typeof step.requestData === 'object' && (() => {
                                    const requestData = step.requestData as any;
                                    // 只显示实际的请求体内容（json 或 data 字段）
                                    const body = requestData?.json || requestData?.data || requestData?.body;
                                    return body ? (
                                      <Collapsible defaultOpen={false}>
                                        <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b last:border-b-0">
                                          <ChevronRight className="w-4 h-4 text-gray-500 transition-transform duration-200 data-[state=open]:rotate-90" />
                                          <span>请求体</span>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <div className="overflow-hidden pl-4">
                                            <JsonViewer data={body} />
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    ) : null;
                                  })()}

                                  {/* 返回体 */}
                                  {step.responseData && (
                                    <Collapsible defaultOpen={true}>
                                      <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b last:border-b-0">
                                        <ChevronRight className="w-4 h-4 text-gray-500 transition-transform duration-200 data-[state=open]:rotate-90" />
                                        <span>返回体</span>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="overflow-hidden pl-4">
                                          <JsonViewer data={step.responseData} />
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}

                                  {/* 校验结果 */}
                                  {step.assertion && Array.isArray(step.assertion) && (
                                    <Collapsible defaultOpen={false}>
                                      <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b last:border-b-0">
                                        <ChevronRight className="w-4 h-4 text-gray-500 transition-transform duration-200 data-[state=open]:rotate-90" />
                                        <span>校验结果</span>
                                        {step.assertion.length > 0 && (
                                          <span className="text-xs text-gray-500">({step.assertion.length})</span>
                                        )}
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="overflow-hidden pl-4">
                                          <JsonViewer data={step.assertion} />
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}

                                  {/* 参数提取 */}
                                  {step.extractVars && typeof step.extractVars === 'object' && !Array.isArray(step.extractVars) && (
                                    <Collapsible defaultOpen={false}>
                                      <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b last:border-b-0">
                                        <ChevronRight className="w-4 h-4 text-gray-500 transition-transform duration-200 data-[state=open]:rotate-90" />
                                        <span>参数提取</span>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="overflow-hidden pl-4">
                                          <JsonViewer data={step.extractVars} />
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 执行日志 - 与详情同一层级 */}
                        {expandedConsoleLogIds.has(`${selectedRunId}-${step.stepId}`) && (
                          <div className="border-t border-gray-200">
                            <div className="space-y-0 border rounded-lg overflow-hidden m-4">
                              <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">执行日志</span>
                              </div>
                              <div className="bg-gray-900 font-mono text-xs max-h-96 overflow-y-auto select-text scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {loadingConsoleLogs.has(`${selectedRunId}-${step.stepId}`) ? (
                                      <div className="flex items-center gap-2 text-gray-400 p-4">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>加载中...</span>
                                      </div>
                                    ) : consoleLogsMap.get(`${selectedRunId}-${step.stepId}`) && consoleLogsMap.get(`${selectedRunId}-${step.stepId}`)!.length > 0 ? (
                                      <div className="space-y-2 p-4">
                                        {consoleLogsMap.get(`${selectedRunId}-${step.stepId}`)!.map((consoleLog: any, index: number) => {
                                          const logTime = consoleLog.logTime
                                            ? new Date(consoleLog.logTime).toLocaleString('zh-CN', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                                hour12: false
                                              })
                                            : '';

                                          const levelColor = {
                                            DEBUG: 'text-gray-400',
                                            INFO: 'text-green-400',
                                            WARN: 'text-yellow-400',
                                            ERROR: 'text-red-400',
                                          }[consoleLog.level] || 'text-gray-400';

                                          const levelBgColor = {
                                            DEBUG: 'bg-gray-800',
                                            INFO: 'bg-green-900/30',
                                            WARN: 'bg-yellow-900/30',
                                            ERROR: 'bg-red-900/30',
                                          }[consoleLog.level] || 'bg-gray-800';

                                          // 尝试解析和格式化日志内容
                                          const formatLogContent = (content: string) => {
                                            // 尝试提取 JSON 部分
                                            const jsonMatch = content.match(/\{[\s\S]*\}/);
                                            if (jsonMatch) {
                                              try {
                                                const jsonObj = JSON.parse(jsonMatch[0]);
                                                const formattedJson = JSON.stringify(jsonObj, null, 2);
                                                return content.replace(jsonMatch[0], formattedJson);
                                              } catch (e) {
                                                // JSON 解析失败，返回原内容
                                              }
                                            }
                                            return content;
                                          };

                                          const formattedContent = formatLogContent(consoleLog.content);
                                          const isMultiLine = formattedContent.includes('\n');
                                          const lines = isMultiLine ? formattedContent.split('\n') : [formattedContent];

                                          return (
                                            <div
                                              key={consoleLog.logId || index}
                                              className={`${levelBgColor} rounded border border-gray-700/50 overflow-hidden relative`}
                                            >
                                              {/* 日志头部：时间戳和级别 */}
                                              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700/50">
                                                <span className="text-gray-500 text-[10px] font-medium">{logTime}</span>
                                                <span className={`${levelColor} font-semibold text-[10px] px-1.5 py-0.5 rounded`}>
                                                  {consoleLog.level}
                                                </span>
                                              </div>
                                              {/* 日志内容 */}
                                              <div className="px-3 py-2 select-text">
                                                {isMultiLine ? (
                                                  <pre className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                                                    {lines.map((line, lineIndex) => {
                                                      const jsonKeyMatch = line.match(/^(\s*)("[^"]+"\s*:\s*)/);
                                                      if (jsonKeyMatch) {
                                                        return (
                                                          <div key={lineIndex} className="flex">
                                                            <span className="text-gray-500">{jsonKeyMatch[1]}</span>
                                                            <span className="text-blue-400">{jsonKeyMatch[2]}</span>
                                                            <span className="text-gray-300">{line.substring(jsonKeyMatch[0].length)}</span>
                                                          </div>
                                                        );
                                                      }
                                                      if (line.includes('HTTP Request') || line.includes('HTTP Response') || line.includes('==================')) {
                                                        return (
                                                          <div key={lineIndex} className="text-cyan-400 font-semibold my-1">
                                                            {line}
                                                          </div>
                                                        );
                                                      }
                                                      if (line.match(/status_code|statusCode|✅|❌/)) {
                                                        return (
                                                          <div key={lineIndex} className="text-green-400">
                                                            {line}
                                                          </div>
                                                        );
                                                      }
                                                      return (
                                                        <div key={lineIndex} className="text-gray-300">
                                                          {line}
                                                        </div>
                                                      );
                                                    })}
                                                  </pre>
                                                ) : (
                                                  <div className="text-gray-300 whitespace-pre-wrap break-words">
                                                    {formattedContent}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 p-4">暂无执行日志</div>
                                    )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 删除调试历史确认对话框 */}
      <AlertDialog open={deleteHistoryDialogOpen} onOpenChange={setDeleteHistoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条调试历史记录吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteHistory}
              className="bg-red-600 hover:bg-red-700"
            >
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

