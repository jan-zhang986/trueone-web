/**
 * 全链路 E2E 工作流 DAG 可视化拓扑流向图
 * 基于 @xyflow/react 实现有向无环图渲染、拓扑连线、状态流转与单步断言检视
 */
import React, { useMemo, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
}

// 自定义 DAG 节点卡片
function DagNodeCard({ data }: NodeProps) {
  const nodeData = data as unknown as DagNodeData;
  const isHttp = nodeData.type === 'HTTP';
  const isSql = nodeData.type === 'SQL';
  const isGate = nodeData.type === 'QUALITY_GATE';

  return (
    <div className="relative group w-76 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all p-3.5 font-sans cursor-pointer">
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

      {/* 摘要配置/代码预览 */}
      {nodeData.configSummary && (
        <div className="rounded-md bg-slate-50 border border-slate-100 p-1.5 font-mono text-[10px] text-slate-600 truncate mb-1">
          {nodeData.configSummary}
        </div>
      )}

      {/* 依赖前置节点提示 */}
      {nodeData.dependsOn && nodeData.dependsOn.length > 0 && (
        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 pt-1 border-t border-slate-100">
          <GitMerge className="w-2.5 h-2.5 text-slate-400" />
          <span className="truncate">依赖: {nodeData.dependsOn.join(', ')}</span>
        </div>
      )}

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

// 解析 YAML 文本中的 nodes 节点
function parseYamlNodes(yaml: string): DagNodeData[] {
  if (!yaml) return [];
  const lines = yaml.split('\n');
  const nodes: DagNodeData[] = [];
  let currentNode: Partial<DagNodeData> | null = null;
  let inDependsOn = false;
  let inConfig = false;
  let configLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const idMatch = line.match(/^\s*-\s+id:\s*["']?([^"']+)["']?/);
    if (idMatch) {
      if (currentNode && currentNode.id) {
        if (configLines.length > 0) currentNode.configSummary = configLines.join(' ');
        nodes.push(currentNode as DagNodeData);
      }
      currentNode = {
        id: idMatch[1],
        name: '',
        type: 'STEP',
        dependsOn: [],
      };
      inDependsOn = false;
      inConfig = false;
      configLines = [];
      continue;
    }
    if (!currentNode) continue;

    if (trimmed.startsWith('name:')) {
      currentNode.name = trimmed.replace(/^name:\s*["']?/, '').replace(/["']?$/, '');
      inDependsOn = false;
      inConfig = false;
    } else if (trimmed.startsWith('type:')) {
      currentNode.type = trimmed.replace(/^type:\s*["']?/, '').replace(/["']?$/, '').toUpperCase();
      inDependsOn = false;
      inConfig = false;
    } else if (trimmed.startsWith('dependsOn:')) {
      const inlineArray = trimmed.match(/\[(.*)\]/);
      if (inlineArray) {
        currentNode.dependsOn = inlineArray[1]
          .split(',')
          .map((s) => s.trim().replace(/['"]/g, ''))
          .filter(Boolean);
      } else {
        inDependsOn = true;
      }
      inConfig = false;
    } else if (inDependsOn && trimmed.startsWith('-')) {
      const depId = trimmed.replace(/^-\s*["']?/, '').replace(/["']?$/, '');
      if (depId) currentNode.dependsOn?.push(depId);
    } else if (trimmed.startsWith('config:')) {
      inDependsOn = false;
      inConfig = true;
    } else if (inConfig) {
      if (
        trimmed.startsWith('url:') ||
        trimmed.startsWith('method:') ||
        trimmed.startsWith('sql:') ||
        trimmed.startsWith('rule:')
      ) {
        configLines.push(trimmed);
      }
    }
  }

  if (currentNode && currentNode.id) {
    if (configLines.length > 0) currentNode.configSummary = configLines.join(' ');
    nodes.push(currentNode as DagNodeData);
  }
  return nodes;
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
}

export function WorkflowDagFlowView({
  yamlContent,
  steps = [],
  overallStatus,
}: WorkflowDagFlowViewProps) {
  const [selectedNode, setSelectedNode] = useState<DagNodeData | null>(null);

  // 解析并构建 DAG 节点与连线拓扑
  const { initialNodes, initialEdges, nodeCount, edgeCount } = useMemo(() => {
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
        };
      });
    }

    // 填充状态信息
    parsedNodes = parsedNodes.map((n, idx) => {
      const matchStep = steps.find((s) => s.stepNumber === idx + 1);
      return {
        ...n,
        stepNumber: n.stepNumber || idx + 1,
        status: (matchStep?.status || (overallStatus === 'passed' ? 'passed' : 'ready')) as any,
        durationMs: n.durationMs || matchStep?.durationMs || (overallStatus === 'passed' ? 12 : undefined),
      };
    });

    // 计算拓扑 Rank (深度分层)
    const nodeMap = new Map<string, DagNodeData>();
    parsedNodes.forEach((n) => nodeMap.set(n.id, n));

    const ranks = new Map<string, number>();
    const getRank = (id: string, visited: Set<string> = new Set()): number => {
      if (ranks.has(id)) return ranks.get(id)!;
      if (visited.has(id)) return 0; // 避免循环
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
            x: rank * 350 + 50,
            y: idx * 170 + 40,
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
    };
  }, [yamlContent, steps, overallStatus]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as unknown as DagNodeData);
  }, []);

  return (
    <div className="flex flex-col h-[520px] rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
      {/* 顶部工具条 */}
      <div className="h-10 px-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <GitMerge className="w-3.5 h-3.5 text-purple-600" />
            <span>DAG 拓扑流向图</span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] font-mono text-slate-500">
            {nodeCount} 个节点 · {edgeCount} 条拓扑连线
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>绿: 通过</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>蓝: HTTP</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>黄: SQL</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>紫: 门禁</span>
          </span>
        </div>
      </div>

      {/* 画布核心区 */}
      <div className="flex-1 relative bg-slate-50/30">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.4}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
          <Controls position="top-right" showInteractive={false} />
          <MiniMap
            position="bottom-right"
            nodeColor="#6366f1"
            className="!w-28 !h-20 !rounded-lg !border !border-slate-200 !bg-white/80"
          />
        </ReactFlow>

        {/* 选中节点参数详情抽屉/悬浮浮窗 */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 w-80 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-3.5 shadow-lg text-xs z-20 space-y-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 truncate">{selectedNode.name}</span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="font-mono text-[10px] text-slate-400">
              类型: {selectedNode.type} | ID: {selectedNode.id}
            </div>
            {selectedNode.configSummary && (
              <div className="p-2 rounded bg-slate-50 border border-slate-100 font-mono text-[10px] text-slate-700 max-h-24 overflow-y-auto">
                {selectedNode.configSummary}
              </div>
            )}
            {selectedNode.expected && (
              <div className="text-[11px] text-slate-600">
                <span className="font-medium text-slate-800">断言预期：</span>
                <span>{selectedNode.expected}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
