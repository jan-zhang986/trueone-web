/**
 * 全链路 E2E 工作流 DAG 可视化拓扑流向图
 * 基于 @xyflow/react 实现有向无环图渲染、拓扑连线、状态流转与单步断言检视
 */
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Position,
  Handle,
  MarkerType,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import YAML from 'yaml';
import {
  Globe,
  Database,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitMerge,
  Info,
  Maximize2,
  Terminal,
  Clock,
  Layers,
  Copy,
  Check,
  Code2,
  ChevronRight,
  X,
  FileCode2,
  SlidersHorizontal,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface DagNodeData {
  id: string;
  name: string;
  type: string;
  dependsOn: string[];
  configSummary?: string;
  config?: Record<string, any>;
  status?: 'passed' | 'failed' | 'running' | 'ready';
  durationMs?: number;
  output?: Record<string, any>;
  evidence?: Record<string, any>;
  stepNumber?: number;
  expected?: string;
  isSelected?: boolean;
  onSelectNode?: (nodeId: string) => void;
}

// 自定义 DAG 节点卡片
function DagNodeCard({ data }: NodeProps) {
  const nodeData = data as unknown as DagNodeData;
  const isHttp = nodeData.type === 'HTTP';
  const isSql = nodeData.type === 'SQL';
  const isGate = nodeData.type === 'QUALITY_GATE';

  return (
    <div
      onClick={() => nodeData.onSelectNode?.(nodeData.id)}
      className={`relative group w-80 rounded-xl bg-white border transition-all p-3.5 font-sans cursor-pointer ${
        nodeData.isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
          : 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-600 !border-2 !border-white !-left-1.5"
      />

      {/* 顶部标签行: 类型 Badge + 状态徽标 */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
            isHttp
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : isSql
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : isGate
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {isHttp && <Globe className="w-2.5 h-2.5" />}
          {isSql && <Database className="w-2.5 h-2.5" />}
          {isGate && <ShieldCheck className="w-2.5 h-2.5" />}
          {!isHttp && !isSql && !isGate && <Activity className="w-2.5 h-2.5" />}
          <span>{nodeData.type}</span>
        </span>

        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
            nodeData.status === 'passed'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              : nodeData.status === 'failed'
              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
              : nodeData.status === 'running'
              ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {nodeData.status === 'passed' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>PASS {nodeData.durationMs ? `${nodeData.durationMs}ms` : ''}</span>
            </>
          )}
          {nodeData.status === 'running' && (
            <>
              <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-600" />
              <span>RUNNING</span>
            </>
          )}
          {nodeData.status === 'failed' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>FAILED</span>
            </>
          )}
          {(!nodeData.status || nodeData.status === 'ready') && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>READY</span>
            </>
          )}
        </span>
      </div>

      {/* 节点名称与步骤序号 */}
      <div className="font-bold text-slate-900 text-xs truncate leading-snug mb-1">
        {nodeData.stepNumber ? `${nodeData.stepNumber}. ` : ''}
        {nodeData.name}
      </div>

      <div className="font-mono text-[10px] text-slate-400 truncate mb-2">
        id: {nodeData.id}
      </div>

      {/* 核心参数配置高亮卡片 */}
      {isHttp && nodeData.config?.url && (
        <div className="rounded-md bg-blue-50/60 border border-blue-100 px-2 py-1.5 font-mono text-[10px] text-blue-800 flex items-center justify-between gap-1 mb-2">
          <span className="font-bold uppercase text-[9px] px-1 py-0.2 rounded bg-blue-200/70 text-blue-900">
            {nodeData.config.method || 'POST'}
          </span>
          <span className="truncate flex-1 font-medium">{nodeData.config.url}</span>
        </div>
      )}

      {isSql && nodeData.config?.sql && (
        <div className="rounded-md bg-amber-50/60 border border-amber-100 px-2 py-1.5 font-mono text-[10px] text-amber-900 truncate mb-2">
          {nodeData.config.sql.trim().split('\n')[0]}
        </div>
      )}

      {isGate && nodeData.config?.rule && (
        <div className="rounded-md bg-purple-50/60 border border-purple-100 px-2 py-1.5 font-mono text-[10px] text-purple-900 truncate mb-2">
          准则: {nodeData.config.rule} (阈值: {nodeData.config.threshold ?? 100})
        </div>
      )}

      {/* 底部：依赖关系 + 查看详情按钮 */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
        {nodeData.dependsOn && nodeData.dependsOn.length > 0 ? (
          <div className="text-slate-400 font-mono flex items-center gap-1 truncate max-w-[170px]">
            <GitMerge className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            <span className="truncate">{nodeData.dependsOn.join(', ')}</span>
          </div>
        ) : (
          <span className="text-slate-300 font-mono">根节点 (入口)</span>
        )}

        <span className="inline-flex items-center gap-0.5 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
          <span>查看详情</span>
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-600 !border-2 !border-white !-right-1.5"
      />
    </div>
  );
}

const nodeTypes = {
  dagNode: DagNodeCard,
};

// 解析 YAML 文本中的 nodes 完整配置
function parseYamlNodes(yamlContent: string): DagNodeData[] {
  if (!yamlContent) return [];
  try {
    const doc = YAML.parse(yamlContent);
    if (!doc || !doc.nodes || !Array.isArray(doc.nodes)) return [];

    return doc.nodes.map((n: any, idx: number) => {
      const type = String(n.type || 'STEP').toUpperCase();
      const cfg = n.config || {};
      let configSummary = '';
      if (type === 'HTTP') {
        configSummary = `${cfg.method || 'POST'} ${cfg.url || ''}`.trim();
      } else if (type === 'SQL') {
        const sqlFirstLine = (cfg.sql || '').trim().split('\n')[0];
        configSummary = sqlFirstLine ? `SQL: ${sqlFirstLine}` : 'SQL 核算';
      } else if (type === 'QUALITY_GATE') {
        configSummary = `门禁: ${cfg.rule || 'RULE'} (阈值: ${cfg.threshold ?? 100})`;
      } else {
        configSummary = JSON.stringify(cfg).slice(0, 40);
      }

      return {
        id: n.id || `node-${idx + 1}`,
        name: n.name || `步骤 ${idx + 1}`,
        type,
        dependsOn: Array.isArray(n.dependsOn) ? n.dependsOn : [],
        config: cfg,
        configSummary,
        stepNumber: idx + 1,
        expected: n.expected || '节点执行通过并产出执行快照',
      };
    });
  } catch (e) {
    console.warn('YAML 解析失败，回退行解析', e);
    return [];
  }
}

interface WorkflowDagFlowViewProps {
  yamlContent?: string;
  steps?: {
    stepNumber: number;
    name: string;
    expected: string;
    status: 'ready' | 'running' | 'passed' | 'failed';
    durationMs?: number;
  }[];
  overallStatus?: string;
  executionData?: {
    workflowId?: string;
    executionId?: string;
    status?: string;
    totalNodes?: number;
    durationMs?: number;
    nodeResults?: Record<string, {
      nodeId: string;
      nodeName: string;
      status: string;
      durationMs?: number;
      output?: Record<string, any>;
      evidence?: Record<string, any>;
    }>;
    context?: Record<string, any>;
  };
}

export function WorkflowDagFlowView({
  yamlContent,
  steps = [],
  overallStatus,
  executionData,
}: WorkflowDagFlowViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'config' | 'output' | 'raw'>('config');

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
    toast.success('已复制到剪贴板');
  };

  // 解析并构建 DAG 节点与连线拓扑
  const { initialNodes, initialEdges, nodeCount, edgeCount, parsedNodeList } = useMemo(() => {
    let parsedNodes: DagNodeData[] = [];
    if (yamlContent) {
      parsedNodes = parseYamlNodes(yamlContent);
    }

    // 如果无法从 YAML 中解析，或者没有 YAML，按 steps 回退构建
    if (parsedNodes.length === 0 && steps.length > 0) {
      parsedNodes = steps.map((st, idx) => {
        let type = 'STEP';
        let cleanName = st.name;
        const typeMatch = st.name.match(/^\[([A-Z_]+)\]\s*(.*)/);
        if (typeMatch) {
          type = typeMatch[1];
          cleanName = typeMatch[2];
        }
        return {
          id: `step-${st.stepNumber}`,
          name: cleanName,
          type,
          dependsOn: idx > 0 ? [`step-${steps[idx - 1].stepNumber}`] : [],
          status: st.status,
          durationMs: st.durationMs,
          stepNumber: st.stepNumber,
          expected: st.expected,
          config: {},
        };
      });
    }

    // 填充状态信息与运行产物
    parsedNodes = parsedNodes.map((n, idx) => {
      const matchStep = steps.find((s) => s.stepNumber === idx + 1);
      const matchResult = executionData?.nodeResults?.[n.id];
      const status = matchResult?.status === 'SUCCESS'
        ? 'passed'
        : matchResult?.status === 'FAILED'
        ? 'failed'
        : matchStep?.status || (overallStatus === 'passed' ? 'passed' : 'ready');

      return {
        ...n,
        stepNumber: n.stepNumber || idx + 1,
        status: status as any,
        durationMs: matchResult?.durationMs || n.durationMs || matchStep?.durationMs || (status === 'passed' ? 15 : undefined),
        output: matchResult?.output || n.output,
        evidence: matchResult?.evidence || n.evidence,
        isSelected: n.id === selectedNodeId,
        onSelectNode: (id: string) => setSelectedNodeId(id),
      };
    });

    // 计算拓扑 Rank (深度分层)
    const nodeMap = new Map<string, DagNodeData>();
    parsedNodes.forEach((n) => nodeMap.set(n.id, n));

    const ranks = new Map<string, number>();
    const getRank = (id: string, visited: Set<string> = new Set()): number => {
      if (ranks.has(id)) return ranks.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);

      const node = nodeMap.get(id);
      if (!node || !node.dependsOn || node.dependsOn.length === 0) {
        ranks.set(id, 0);
        return 0;
      }

      let maxDepRank = 0;
      for (const depId of node.dependsOn) {
        if (nodeMap.has(depId)) {
          maxDepRank = Math.max(maxDepRank, getRank(depId, visited) + 1);
        }
      }
      ranks.set(id, maxDepRank);
      return maxDepRank;
    };

    parsedNodes.forEach((n) => getRank(n.id));

    // 按 rank 统计分组以计算 Y 坐标
    const rankGroups = new Map<number, DagNodeData[]>();
    parsedNodes.forEach((n) => {
      const r = ranks.get(n.id) || 0;
      if (!rankGroups.has(r)) rankGroups.set(r, []);
      rankGroups.get(r)!.push(n);
    });

    // 生成 ReactFlow Nodes
    const flowNodes: Node[] = [];
    rankGroups.forEach((nodesInRank, rank) => {
      nodesInRank.forEach((n, idx) => {
        flowNodes.push({
          id: n.id,
          type: 'dagNode',
          position: {
            x: rank * 380 + 40,
            y: idx * 210 + 40,
          },
          data: n as unknown as Record<string, unknown>,
        });
      });
    });

    // 生成 ReactFlow Edges
    const flowEdges: Edge[] = [];
    parsedNodes.forEach((n) => {
      (n.dependsOn || []).forEach((depId) => {
        if (nodeMap.has(depId)) {
          flowEdges.push({
            id: `edge-${depId}-${n.id}`,
            source: depId,
            target: n.id,
            type: 'smoothstep',
            animated: overallStatus === 'running',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: '#6366f1',
            },
            style: {
              stroke: '#6366f1',
              strokeWidth: 2,
            },
          });
        }
      });
    });

    return {
      initialNodes: flowNodes,
      initialEdges: flowEdges,
      nodeCount: flowNodes.length,
      edgeCount: flowEdges.length,
      parsedNodeList: parsedNodes,
    };
  }, [yamlContent, steps, overallStatus, executionData, selectedNodeId]);

  // 默认选中第一个节点，确保一打开抽屉就能看到详情
  useEffect(() => {
    if (!selectedNodeId && parsedNodeList.length > 0) {
      setSelectedNodeId(parsedNodeList[0].id);
    }
  }, [parsedNodeList, selectedNodeId]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const activeNode = useMemo(() => {
    return parsedNodeList.find((n) => n.id === selectedNodeId) || null;
  }, [parsedNodeList, selectedNodeId]);

  return (
    <div className="flex flex-col h-[560px] rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
      {/* 顶部工具条 */}
      <div className="h-10 px-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <GitMerge className="w-3.5 h-3.5 text-purple-600" />
            <span>DAG 拓扑流向图</span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] font-mono text-slate-500">
            {nodeCount} 个节点 · {edgeCount} 条拓扑连线
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium ml-2">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            点击节点可检视完整参数与运行证据
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>HTTP</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>SQL</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>门禁</span>
          </span>
        </div>
      </div>

      {/* 画布核心区 + 右侧抽屉检视面板 */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* ReactFlow 画布主体 */}
        <div className="flex-1 h-full relative bg-slate-50/40">
          <ReactFlow
            nodes={initialNodes}
            edges={initialEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
            <Controls position="top-left" showInteractive={false} />
            <MiniMap
              position="bottom-left"
              nodeColor="#6366f1"
              className="!w-24 !h-16 !rounded-lg !border !border-slate-200 !bg-white/80"
            />
          </ReactFlow>
        </div>

        {/* 节点详情侧边检视面板 (Node Inspector Panel) */}
        {activeNode && (
          <div className="w-[380px] lg:w-[420px] h-full bg-white border-l border-slate-200 flex flex-col shadow-lg z-20 shrink-0 animate-in slide-in-from-right-4 duration-150">
            {/* 面板头部 */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                    activeNode.type === 'HTTP'
                      ? 'bg-blue-100 text-blue-700'
                      : activeNode.type === 'SQL'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {activeNode.type === 'HTTP' && <Globe className="w-3.5 h-3.5" />}
                  {activeNode.type === 'SQL' && <Database className="w-3.5 h-3.5" />}
                  {activeNode.type === 'QUALITY_GATE' && <ShieldCheck className="w-3.5 h-3.5" />}
                  {activeNode.type !== 'HTTP' && activeNode.type !== 'SQL' && activeNode.type !== 'QUALITY_GATE' && <Activity className="w-3.5 h-3.5" />}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {activeNode.stepNumber ? `${activeNode.stepNumber}. ` : ''}
                    {activeNode.name}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 truncate">
                    {activeNode.id}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    activeNode.status === 'passed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : activeNode.status === 'failed'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {activeNode.status === 'passed'
                    ? `PASS ${activeNode.durationMs ? `${activeNode.durationMs}ms` : ''}`
                    : activeNode.status === 'failed'
                    ? 'FAILED'
                    : 'READY'}
                </span>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors"
                  title="关闭详情面板"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 面板 Tab 切换 */}
            <div className="px-4 border-b border-slate-100 flex gap-4 text-xs font-medium bg-white">
              <button
                onClick={() => setInspectorTab('config')}
                className={`py-2 border-b-2 transition-colors cursor-pointer ${
                  inspectorTab === 'config'
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                参数配置
              </button>
              <button
                onClick={() => setInspectorTab('output')}
                className={`py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                  inspectorTab === 'output'
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>执行产物与证据</span>
                {activeNode.output && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
              <button
                onClick={() => setInspectorTab('raw')}
                className={`py-2 border-b-2 transition-colors cursor-pointer ${
                  inspectorTab === 'raw'
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                YAML 片段
              </button>
            </div>

            {/* 面板主体内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {inspectorTab === 'config' && (
                <>
                  {/* 1. HTTP 节点详情 */}
                  {activeNode.type === 'HTTP' && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-1">请求接口 (URL)</div>
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shrink-0">
                            {activeNode.config?.method || 'POST'}
                          </span>
                          <span className="truncate flex-1">{activeNode.config?.url || '--'}</span>
                          <button
                            onClick={() => copyText(activeNode.config?.url || '', 'url')}
                            className="text-slate-400 hover:text-white p-1 rounded"
                            title="复制 URL"
                          >
                            {copiedKey === 'url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Headers */}
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-1">请求头 (Headers)</div>
                        {activeNode.config?.headers && Object.keys(activeNode.config.headers).length > 0 ? (
                          <div className="rounded-lg border border-slate-200 overflow-hidden text-[11px] font-mono">
                            {Object.entries(activeNode.config.headers).map(([k, v]) => (
                              <div key={k} className="flex border-b border-slate-100 last:border-none px-2.5 py-1.5 bg-slate-50/50">
                                <span className="w-32 text-slate-500 font-semibold truncate">{k}</span>
                                <span className="text-slate-800 truncate flex-1">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">默认请求头</div>
                        )}
                      </div>

                      {/* Request Body */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-slate-500">请求载荷 (Request Body)</span>
                          {activeNode.config?.body && (
                            <button
                              onClick={() => copyText(JSON.stringify(activeNode.config?.body, null, 2), 'body')}
                              className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              {copiedKey === 'body' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>复制代码</span>
                            </button>
                          )}
                        </div>
                        {activeNode.config?.body ? (
                          <pre className="p-3 rounded-lg bg-[#0F172A] text-[#38BDF8] font-mono text-[11px] overflow-x-auto leading-5 max-h-48 border border-slate-800">
                            {JSON.stringify(activeNode.config.body, null, 2)}
                          </pre>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">无 Body 参数</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. SQL 节点详情 */}
                  {activeNode.type === 'SQL' && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-slate-500">SQL 资产校验脚本</span>
                          {activeNode.config?.sql && (
                            <button
                              onClick={() => copyText(activeNode.config?.sql || '', 'sql')}
                              className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              {copiedKey === 'sql' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>复制 SQL</span>
                            </button>
                          )}
                        </div>
                        <pre className="p-3 rounded-lg bg-[#0F172A] text-[#FDE047] font-mono text-[11px] overflow-x-auto leading-5 border border-slate-800 max-h-56">
                          {activeNode.config?.sql || '-- 未配置 SQL 语句'}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* 3. QUALITY_GATE 节点详情 */}
                  {activeNode.type === 'QUALITY_GATE' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-lg bg-purple-50/80 border border-purple-100">
                          <div className="text-[10px] text-purple-600 font-semibold mb-0.5">准则策略 (Rule)</div>
                          <div className="font-bold font-mono text-purple-900 text-xs">{activeNode.config?.rule || 'ZERO_CAPITAL_LOSS'}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-purple-50/80 border border-purple-100">
                          <div className="text-[10px] text-purple-600 font-semibold mb-0.5">通过阈值 (Threshold)</div>
                          <div className="font-bold font-mono text-purple-900 text-xs">{activeNode.config?.threshold ?? 100}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 依赖前置节点清单 */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 mb-1.5">拓扑前置依赖</div>
                    {activeNode.dependsOn && activeNode.dependsOn.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {activeNode.dependsOn.map((dep) => (
                          <button
                            key={dep}
                            onClick={() => setSelectedNodeId(dep)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-mono text-[10px] text-slate-700 transition-colors cursor-pointer border border-slate-200"
                            title="点击跳转并检视该前置节点"
                          >
                            <GitMerge className="w-2.5 h-2.5 text-slate-400" />
                            <span>{dep}</span>
                            <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">根节点（无需等待其他前置完成）</div>
                    )}
                  </div>
                </>
              )}

              {/* Tab 2: 运行产物与证据 */}
              {inspectorTab === 'output' && (
                <div className="space-y-3">
                  {activeNode.output || activeNode.evidence ? (
                    <>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>调度通过 (SUCCESS)</span>
                        </div>
                        <span className="font-mono text-[11px] text-emerald-700">
                          耗时: {activeNode.durationMs || 15}ms
                        </span>
                      </div>

                      {activeNode.output && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-slate-600">节点输出载荷 (Output)</span>
                            <button
                              onClick={() => copyText(JSON.stringify(activeNode.output, null, 2), 'out')}
                              className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              {copiedKey === 'out' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>复制</span>
                            </button>
                          </div>
                          <pre className="p-3 rounded-lg bg-[#0F172A] text-[#34D399] font-mono text-[11px] overflow-x-auto leading-5 max-h-48 border border-slate-800">
                            {JSON.stringify(activeNode.output, null, 2)}
                          </pre>
                        </div>
                      )}

                      {activeNode.evidence && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-slate-600">留痕上下文证据 (Evidence)</span>
                            <button
                              onClick={() => copyText(JSON.stringify(activeNode.evidence, null, 2), 'evi')}
                              className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              {copiedKey === 'evi' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>复制</span>
                            </button>
                          </div>
                          <pre className="p-3 rounded-lg bg-[#0F172A] text-[#F472B6] font-mono text-[11px] overflow-x-auto leading-5 max-h-48 border border-slate-800">
                            {JSON.stringify(activeNode.evidence, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <Terminal className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="font-semibold text-slate-700">暂无真实运行产物</div>
                      <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto">
                        点击抽屉右上角「运行用例」按钮触发真实 DAG 调度后，将在此实时呈现输出快照与证据留痕。
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: 原始 YAML 片段 */}
              {inspectorTab === 'raw' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-500">Node YAML Spec</span>
                    <button
                      onClick={() => copyText(YAML.stringify(activeNode), 'yaml')}
                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'yaml' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>复制 YAML</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-[#0F172A] text-slate-200 font-mono text-[11px] overflow-x-auto leading-5 max-h-96 border border-slate-800">
                    {YAML.stringify({
                      id: activeNode.id,
                      name: activeNode.name,
                      type: activeNode.type,
                      dependsOn: activeNode.dependsOn,
                      config: activeNode.config,
                    })}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
