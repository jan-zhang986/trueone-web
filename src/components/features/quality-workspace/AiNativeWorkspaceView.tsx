import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  BrainCircuit,
  GitBranch,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Send,
  Zap,
  Layers,
  FileText,
  ShieldCheck,
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  Terminal,
  ExternalLink,
  Code2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SlidersHorizontal,
  Flame,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// 数据模型定义
export interface MindmapNode {
  id: string;
  title: string;
  type: 'root' | 'module' | 'rule' | 'case' | 'risk';
  priority?: 'P0' | 'P1' | 'P2';
  status?: 'passed' | 'failed' | 'ready' | 'running';
  boundApi?: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string };
  aiInsight?: string;
  description?: string;
  steps?: { step: string; expected: string }[];
  children?: MindmapNode[];
}

export interface AgentLog {
  id: string;
  time: string;
  type: 'thinking' | 'insight' | 'action' | 'success';
  title: string;
  content: string;
}

// 初始全景测试脑图模拟数据（AI 自动生成）
const INITIAL_MINDMAP_DATA: MindmapNode = {
  id: 'root',
  title: '用户登录改造 PRD 全景测试矩阵',
  type: 'root',
  children: [
    {
      id: 'mod-1',
      title: '账号密码登录链路',
      type: 'module',
      children: [
        {
          id: 'rule-1-1',
          title: '正常身份鉴权与会话',
          type: 'rule',
          children: [
            {
              id: 'case-1-1-1',
              title: '账号密码正确 ➔ 颁发双Token (Access & Refresh)',
              type: 'case',
              priority: 'P0',
              status: 'passed',
              boundApi: { method: 'POST', path: '/api/v1/auth/login' },
              description: '验证正常输入账号密码后，服务端正确颁发 JWT Token 并记录登录日志。',
              steps: [
                { step: '向 /api/v1/auth/login 发送正确账号密码', expected: 'HTTP 200，返回 accessToken & refreshToken' },
                { step: '携带 accessToken 请求个人信息接口', expected: '正常返回用户资料' },
              ],
            },
            {
              id: 'case-1-1-2',
              title: '记住登录态 ➔ 7天内无感免登续期',
              type: 'case',
              priority: 'P1',
              status: 'passed',
              boundApi: { method: 'POST', path: '/api/v1/auth/verify' },
              steps: [
                { step: '勾选记住我并登录，Token 过期后触发静默刷新', expected: '自动续期成功，用户无感知' },
              ],
            },
          ],
        },
        {
          id: 'rule-1-2',
          title: '密码错误与阶梯锁定 (AI 挖掘边界)',
          type: 'rule',
          children: [
            {
              id: 'case-1-2-1',
              title: '密码错误 1~4 次 ➔ 返回错误码并提示剩余尝试次数',
              type: 'case',
              priority: 'P0',
              status: 'passed',
              boundApi: { method: 'POST', path: '/api/v1/auth/login' },
              steps: [
                { step: '输入错误密码', expected: '提示密码错误，剩余尝试次数减少' },
              ],
            },
            {
              id: 'risk-1-2-2',
              title: '连续输错 5 次 ➔ 触发风控，账号锁定 15 分钟',
              type: 'risk',
              priority: 'P0',
              status: 'passed',
              aiInsight: 'PRD 原文未定义重试上限，AI 根据安全规约自动补全此边界防护。',
              boundApi: { method: 'POST', path: '/api/v1/auth/lock-check' },
              steps: [
                { step: '连续发送 5 次错误密码', expected: '第 5 次返回 403 锁定状态，15 分钟内拒绝认证' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'mod-2',
      title: '手机验证码登录链路',
      type: 'module',
      children: [
        {
          id: 'rule-2-1',
          title: '短信发送策略与防刷限流',
          type: 'rule',
          children: [
            {
              id: 'case-2-1-1',
              title: '正常请求验证码 ➔ 60秒倒计时 & 成功下发短信',
              type: 'case',
              priority: 'P0',
              status: 'passed',
              boundApi: { method: 'POST', path: '/api/v1/sms/send' },
              steps: [
                { step: '输入国内 11 位手机号并请求发送', expected: '返回成功，前端倒计时 60s，收到验证码' },
              ],
            },
            {
              id: 'risk-2-1-2',
              title: '高频并发连击请求 ➔ IP+设备指纹限流拦截',
              type: 'risk',
              priority: 'P0',
              status: 'failed',
              aiInsight: 'AI 自动化探索发现：短时间内高频并发发短信缺少 Redis 分布式锁，存在刷短信资损风险！',
              boundApi: { method: 'POST', path: '/api/v1/sms/send' },
              steps: [
                { step: '1秒内并发发送 10 次验证码请求', expected: '期望拦截并返回 429 Too Many Requests，实际收到 3 条短信' },
              ],
            },
          ],
        },
        {
          id: 'rule-2-2',
          title: '验证码校验与自动注册',
          type: 'rule',
          children: [
            {
              id: 'case-2-2-1',
              title: '输入有效 6 位验证码 ➔ 新用户自动创建并登录',
              type: 'case',
              priority: 'P0',
              status: 'passed',
              boundApi: { method: 'POST', path: '/api/v1/sms/verify' },
              steps: [
                { step: '输入正确验证码登录', expected: '新用户自动注册基础信息，老用户直接登录' },
              ],
            },
            {
              id: 'case-2-2-2',
              title: '验证码超时 (>5分钟) ➔ 明确提示验证码已失效',
              type: 'case',
              priority: 'P1',
              status: 'passed',
              steps: [
                { step: '超过 5 分钟后提交旧验证码', expected: '提示验证码已过期，请重新获取' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'mod-3',
      title: '多端并发与会话安全 (AI 专项推演)',
      type: 'module',
      children: [
        {
          id: 'rule-3-1',
          title: '单点登录与异地挤下线机制',
          type: 'rule',
          children: [
            {
              id: 'case-3-1-1',
              title: '同一账号异地新设备登录 ➔ 旧设备收到 WebSocket 下线广播',
              type: 'case',
              priority: 'P1',
              status: 'ready',
              boundApi: { method: 'POST', path: '/api/v1/session/kick' },
              steps: [
                { step: '设备 A 在线，设备 B 登录同账号', expected: '设备 A 收到 WebSocket 下线通知并退回登录页' },
              ],
            },
          ],
        },
        {
          id: 'rule-3-2',
          title: 'Token 并发刷新幂等性',
          type: 'rule',
          children: [
            {
              id: 'case-3-2-1',
              title: '多请求并发触发 Token 刷新 ➔ 互斥锁确保单次刷新有效',
              type: 'case',
              priority: 'P0',
              status: 'passed',
              boundApi: { method: 'POST', path: '/api/v1/auth/refresh' },
              steps: [
                { step: '并发 5 个请求在 Token 过期瞬间到达', expected: '只有 1 次刷新调用，其余请求等待复用新 Token' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const INITIAL_AGENT_LOGS: AgentLog[] = [
  {
    id: 'log-1',
    time: '14:20:10',
    type: 'thinking',
    title: 'PRD 深度透视与业务规则提取',
    content: '已提取【账号密码登录】与【短信验证码】两大核心主干，共识别出 14 项显式业务约束规则。',
  },
  {
    id: 'log-2',
    time: '14:20:12',
    type: 'insight',
    title: 'AI 暗坑洞察：发现 2 处未定义隐性风险',
    content: '1. PRD 未定义连续输错密码的锁定策略（已自动补齐阶梯锁定）；\n2. 发现高频短信可能存在接口防刷漏洞（已标记 P0 风险节点）。',
  },
  {
    id: 'log-3',
    time: '14:20:15',
    type: 'action',
    title: '自动化资产自动装配（Auto-Realization）',
    content: '自动匹配已有 API 契约库：成功将 6 个核心测试场景挂载至真实的 Postman / API Workflow 执行引擎。',
  },
  {
    id: 'log-4',
    time: '14:20:18',
    type: 'success',
    title: '全景测试思维导图构建就绪',
    content: '生成 3 个模块、8 个规则分支、11 个测试点（覆盖率 100%）。已就绪，可随时下发调度执行！',
  },
];

export function AiNativeWorkspaceView({
  workspaceName = '用户登录改造 质量工作台',
  onBack,
}: {
  workspaceName?: string;
  onBack?: () => void;
}) {
  const [mindmapData, setMindmapData] = useState<MindmapNode>(INITIAL_MINDMAP_DATA);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>(INITIAL_AGENT_LOGS);
  const [selectedNode, setSelectedNode] = useState<MindmapNode | null>(null);
  const [activeCanvasView, setActiveCanvasView] = useState<'mindmap' | 'pipeline' | 'gate'>('mindmap');
  const [userInput, setUserInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [prdInputText, setPrdInputText] = useState(
    '# 用户登录改造 PRD\n\n1. 支持账号密码登录（带Token免登）与手机验证码登录。\n2. 短信验证码需考虑防刷与过期。\n3. 考虑多端登录与会话安全性。'
  );

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentLogs]);

  // 计算全局指标
  const metrics = useMemo(() => {
    let totalCases = 0;
    let passedCases = 0;
    let failedCases = 0;
    let readyCases = 0;
    let boundApis = 0;

    const traverse = (node: MindmapNode) => {
      if (node.type === 'case' || node.type === 'risk') {
        totalCases++;
        if (node.status === 'passed') passedCases++;
        if (node.status === 'failed') failedCases++;
        if (node.status === 'ready') readyCases++;
        if (node.boundApi) boundApis++;
      }
      node.children?.forEach(traverse);
    };

    traverse(mindmapData);

    const passRate = totalCases > 0 ? ((passedCases / totalCases) * 100).toFixed(1) : '0.0';
    const autoRate = totalCases > 0 ? ((boundApis / totalCases) * 100).toFixed(0) : '0';

    return { totalCases, passedCases, failedCases, readyCases, boundApis, passRate, autoRate };
  }, [mindmapData]);

  // 执行 AI 对话指令（例如补充场景、修改规则）
  const handleSendPrompt = (customPrompt?: string) => {
    const prompt = customPrompt || userInput.trim();
    if (!prompt) return;

    setUserInput('');
    setIsAgentThinking(true);

    const newLogId = `user-${Date.now()}`;
    const userLog: AgentLog = {
      id: newLogId,
      time: new Date().toTimeString().slice(0, 8),
      type: 'action',
      title: '工程师指令已接收',
      content: prompt,
    };
    setAgentLogs((prev) => [...prev, userLog]);

    setTimeout(() => {
      // 模拟 AI 处理与脑图动态演进
      if (prompt.includes('微信') || prompt.includes('第三方') || prompt.includes('OAuth')) {
        const newOAuthModule: MindmapNode = {
          id: `mod-oauth-${Date.now()}`,
          title: '第三方微信/OAuth 扫码登录 (AI 动态扩充)',
          type: 'module',
          children: [
            {
              id: `rule-oauth-1`,
              title: '微信二维码生成与长轮询',
              type: 'rule',
              children: [
                {
                  id: `case-oauth-1-1`,
                  title: '扫码成功并授权 ➔ 自动换取 OpenID 并登录',
                  type: 'case',
                  priority: 'P0',
                  status: 'passed',
                  boundApi: { method: 'POST', path: '/api/v1/oauth/wechat' },
                  steps: [{ step: '微信扫码完成授权回调', expected: '颁发 Token 并成功登录' }],
                },
                {
                  id: `case-oauth-1-2`,
                  title: '二维码过期 (>2分钟) ➔ 提示已失效并支持一键刷新',
                  type: 'case',
                  priority: 'P1',
                  status: 'ready',
                  steps: [{ step: '二维码停顿 2 分钟未扫', expected: '遮罩提示二维码过期，点击刷新重绘' }],
                },
              ],
            },
          ],
        };

        setMindmapData((prev) => ({
          ...prev,
          children: [...(prev.children || []), newOAuthModule],
        }));

        setAgentLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}`,
            time: new Date().toTimeString().slice(0, 8),
            type: 'success',
            title: 'AI 增量推演完成：已追加【第三方微信/OAuth 扫码登录】全景分支',
            content: '已智能装配 2 个测试场景与 1 个回调接口契约，全景思维导图已实时更新！',
          },
        ]);
        toast.success('AI 已在思维导图中自动生长出【微信扫码登录】分支！');
      } else if (prompt.includes('运行') || prompt.includes('执行') || prompt.includes('全部')) {
        handleRunAllApis();
      } else {
        setAgentLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}`,
            time: new Date().toTimeString().slice(0, 8),
            type: 'insight',
            title: 'AI 指令分析与对齐完成',
            content: `已根据您的高级诉求「${prompt}」调整测试分析权重，并实时校准关联参数。`,
          },
        ]);
        toast.success('AI 已完成场景校准！');
      }
      setIsAgentThinking(false);
    }, 1200);
  };

  // 一键运行全部自动化
  const handleRunAllApis = () => {
    setIsRunningAll(true);
    toast.info('🚀 AI 调度引擎已启动，正在并发执行全量自动化 Workflow...');

    setAgentLogs((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'action',
        title: '自动化调度引擎全速运行中...',
        content: '正在通过 Aegis Runner 调度容器执行 8 个挂载的 API Workflow 脚本并抓取断言...',
      },
    ]);

    setTimeout(() => {
      // 更新状态
      const updateNodeStatus = (node: MindmapNode): MindmapNode => {
        if (node.type === 'case' || node.type === 'risk') {
          return {
            ...node,
            status: node.id === 'risk-2-1-2' ? 'failed' : 'passed',
          };
        }
        return {
          ...node,
          children: node.children?.map(updateNodeStatus),
        };
      };

      setMindmapData((prev) => updateNodeStatus(prev));
      setIsRunningAll(false);

      setAgentLogs((prev) => [
        ...prev,
        {
          id: `run-done-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          title: '自动化执行完成 (10/11 通过，1 处拦截)',
          content: '【短信高频防刷并发】接口断言未通过（返回 200 而非 429 拦截），建议修复后放行！',
        },
      ]);

      toast.success('自动化测试执行完毕，思维导图状态已实时刷新！');
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* 顶部 AI Native 全景指挥栏 */}
      <header className="h-16 shrink-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/20 text-white font-bold">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide truncate">{workspaceName}</h1>
                <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  AI-Native v3.0
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <BrainCircuit className="w-3 h-3 text-cyan-400" />
                <span>Aegis QA Agent 驱动 · 实时思维导图与自动化闭环</span>
              </p>
            </div>
          </div>
        </div>

        {/* 顶部指标徽章群 */}
        <div className="hidden lg:flex items-center gap-5 text-xs bg-slate-950/60 border border-slate-800/80 px-4 py-1.5 rounded-2xl">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">脑图总测点:</span>
            <span className="font-bold text-white font-mono">{metrics.totalCases}</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">自动化装配率:</span>
            <span className="font-bold text-cyan-400 font-mono">{metrics.autoRate}%</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">通过率:</span>
            <span className="font-bold text-emerald-400 font-mono">{metrics.passRate}%</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">准出决策:</span>
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] font-bold">
              需关注 1 处漏洞
            </Badge>
          </div>
        </div>

        {/* 快捷动作按钮 */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleRunAllApis}
            disabled={isRunningAll}
            className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs gap-1.5 shadow-md shadow-blue-600/30 border border-blue-400/20"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunningAll ? 'animate-spin' : ''}`} />
            <span>{isRunningAll ? '执行自动化中...' : '全量调度运行'}</span>
          </Button>

          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 rounded-xl"
            >
              返回
            </Button>
          )}
        </div>
      </header>

      {/* 主工作区：双轨协作架构 */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* ================= 左轨：AI QA Agent 智能协同中枢 (38% 宽度) ================= */}
        <div className="w-[420px] xl:w-[460px] shrink-0 border-r border-slate-800/80 bg-slate-900/60 flex flex-col min-h-0 relative z-10">
          {/* PRD 输入与智能解析通道 */}
          <div className="p-4 border-b border-slate-800/70 bg-slate-900/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>PRD 需求投喂与解析通道</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSendPrompt('重新全量解析 PRD 并优化测试矩阵')}
                className="h-6 text-[11px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 px-2 rounded-lg gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>一键重新透视</span>
              </Button>
            </div>

            <Textarea
              value={prdInputText}
              onChange={(e) => setPrdInputText(e.target.value)}
              placeholder="在此粘贴 PRD 文档、飞书文档链接、或输入需求描述..."
              className="min-h-[70px] text-xs bg-slate-950/80 border-slate-800 text-slate-200 placeholder:text-slate-600 rounded-xl focus-visible:ring-blue-500/50"
            />
          </div>

          {/* Agent 实时推理与思维链路 (Thinking Stream) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider px-1">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Agent 实时思维与执行链路
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{agentLogs.length} 条记录</span>
            </div>

            <div className="space-y-3">
              {agentLogs.map((log) => {
                const isInsight = log.type === 'insight';
                const isSuccess = log.type === 'success';
                const isAction = log.type === 'action';

                return (
                  <div
                    key={log.id}
                    className={`rounded-2xl p-3.5 border transition-all text-xs ${
                      isInsight
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        : isSuccess
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : isAction
                        ? 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 font-bold">
                        {isInsight ? (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <BrainCircuit className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        <span className="truncate">{log.title}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">{log.time}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed whitespace-pre-line text-slate-300/90 pl-5">
                      {log.content}
                    </p>
                  </div>
                );
              })}

              {isAgentThinking && (
                <div className="rounded-2xl p-3.5 border border-blue-500/30 bg-blue-950/30 flex items-center gap-3 text-xs text-blue-300 animate-pulse">
                  <Bot className="w-4 h-4 text-blue-400 animate-bounce" />
                  <span>Aegis QA Agent 正在深度推演并动态演进全景思维导图...</span>
                </div>
              )}

              <div ref={logsEndRef} />
            </div>
          </div>

          {/* 底部 AI 指令输入与快捷 Action 胶囊 */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/90 space-y-2.5">
            {/* 快捷指令胶囊 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => handleSendPrompt('帮我补全第三方微信/OAuth扫码登录场景')}
                className="text-[10px] font-medium bg-slate-800/80 hover:bg-blue-600/30 hover:text-blue-300 border border-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>+ 补充微信扫码登录</span>
              </button>
              <button
                onClick={() => handleSendPrompt('为短信验证码接口增加并发防刷自动化')}
                className="text-[10px] font-medium bg-slate-800/80 hover:bg-amber-600/30 hover:text-amber-300 border border-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1"
              >
                <Flame className="w-2.5 h-2.5" />
                <span>+ 强化防刷并发</span>
              </button>
              <button
                onClick={() => handleRunAllApis()}
                className="text-[10px] font-medium bg-slate-800/80 hover:bg-emerald-600/30 hover:text-emerald-300 border border-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1"
              >
                <Zap className="w-2.5 h-2.5" />
                <span>⚡ 跑自动化</span>
              </button>
            </div>

            {/* 自然语言输入框 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="relative flex items-center"
            >
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="对 Agent 发出指令，如：补充异常流、生成冒烟矩阵..."
                className="h-10 text-xs bg-slate-950 border-slate-800 text-slate-100 pr-10 rounded-xl focus-visible:ring-blue-500/60 placeholder:text-slate-600"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!userInput.trim() || isAgentThinking}
                className="absolute right-1.5 h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>

        {/* ================= 右轨：AI 实时演进的交互式全景画布 (Canvas，62% 宽度) ================= */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#0B0F19] relative">
          {/* 画布顶部视图切换器与工具栏 */}
          <div className="h-12 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/40 backdrop-blur-sm z-10 shrink-0">
            {/* 视图切换 */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveCanvasView('mindmap')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeCanvasView === 'mindmap'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>全景思维导图 (Mindmap)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCanvasView('pipeline')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeCanvasView === 'pipeline'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>流水线矩阵 (Pipeline)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCanvasView('gate')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeCanvasView === 'gate'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AI 准出裁决书 (Gate Verdict)</span>
              </button>
            </div>

            {/* 画布缩放工具 */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-[11px] font-mono text-slate-500">缩放: 100%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white rounded-lg">
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white rounded-lg">
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* 画布主体区域 */}
          <div className="flex-1 min-h-0 overflow-auto p-8 relative flex flex-col justify-start">
            {/* 视图 1：🌳 交互式测试全景思维导图 */}
            {activeCanvasView === 'mindmap' && (
              <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
                {/* 根节点 */}
                <div className="flex items-center justify-center">
                  <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-blue-500/20 border border-blue-400/40 flex items-center gap-2.5 ring-4 ring-blue-500/10">
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    <span>{mindmapData.title}</span>
                  </div>
                </div>

                {/* 模块级分支渲染 */}
                <div className="space-y-6">
                  {mindmapData.children?.map((mod, modIdx) => (
                    <Card
                      key={mod.id}
                      className="rounded-3xl border border-slate-800/90 bg-slate-900/50 backdrop-blur-md p-5 shadow-xl hover:border-slate-700 transition-all space-y-4"
                    >
                      {/* 模块头部 */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
                        <div className="flex items-center gap-2.5 font-bold text-sm text-slate-100">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-mono text-xs border border-blue-500/30">
                            0{modIdx + 1}
                          </span>
                          <span>{mod.title}</span>
                        </div>
                        <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] font-mono">
                          {mod.children?.reduce((acc, curr) => acc + (curr.children?.length || 0), 0)} 个测点
                        </Badge>
                      </div>

                      {/* 规则分支 & 叶子测试点 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {mod.children?.map((rule) => (
                          <div
                            key={rule.id}
                            className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-3"
                          >
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                              <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                              <span>{rule.title}</span>
                            </div>

                            <div className="space-y-2 pl-2">
                              {rule.children?.map((item) => {
                                const isRisk = item.type === 'risk';
                                const isPassed = item.status === 'passed';
                                const isFailed = item.status === 'failed';
                                const isSelected = selectedNode?.id === item.id;

                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => setSelectedNode(item)}
                                    className={`group cursor-pointer rounded-xl p-3 border transition-all text-xs space-y-2 ${
                                      isSelected
                                        ? 'bg-blue-950/40 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                                        : isRisk
                                        ? 'bg-amber-950/10 border-amber-500/30 hover:border-amber-400'
                                        : isFailed
                                        ? 'bg-rose-950/10 border-rose-500/40 hover:border-rose-400'
                                        : 'bg-slate-900/60 border-slate-800/70 hover:border-slate-700 hover:bg-slate-900'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        {isPassed ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        ) : isFailed ? (
                                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
                                        ) : (
                                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        )}
                                        <span className="font-medium text-slate-200 truncate group-hover:text-white">
                                          {item.title}
                                        </span>
                                      </div>

                                      {item.priority && (
                                        <Badge
                                          className={`text-[9px] font-mono font-bold px-1.5 py-0 border-0 ${
                                            item.priority === 'P0'
                                              ? 'bg-rose-500/20 text-rose-300'
                                              : 'bg-blue-500/20 text-blue-300'
                                          }`}
                                        >
                                          {item.priority}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* 挂载的 API 自动化契约 */}
                                    {item.boundApi && (
                                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[10px]">
                                        <div className="flex items-center gap-1.5 font-mono">
                                          <span className="font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1 rounded">
                                            {item.boundApi.method}
                                          </span>
                                          <span className="text-slate-400 truncate max-w-[160px]">
                                            {item.boundApi.path}
                                          </span>
                                        </div>
                                        <span className="text-slate-500 group-hover:text-blue-400 flex items-center gap-0.5">
                                          详情 <ChevronRight className="w-2.5 h-2.5" />
                                        </span>
                                      </div>
                                    )}

                                    {/* AI 洞察提示条 */}
                                    {item.aiInsight && (
                                      <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-1 rounded-lg">
                                        💡 {item.aiInsight}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 视图 2：⚡ 流水线装配矩阵 */}
            {activeCanvasView === 'pipeline' && (
              <div className="w-full max-w-5xl mx-auto space-y-4 pb-20">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-white">自动化流水线装配矩阵 (Auto-Realization Matrix)</h2>
                    <p className="text-xs text-slate-400 mt-0.5">所有由 AI 从 PRD 生成并自动绑定至后端 API 自动化引擎的场景</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRunAllApis}
                    disabled={isRunningAll}
                    className="h-8 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>执行矩阵自动化</span>
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {[
                    { name: '账号密码鉴权并颁发 Token', method: 'POST', path: '/api/v1/auth/login', status: 'passed', time: '142ms' },
                    { name: 'Token 无感自动续期与验证', method: 'POST', path: '/api/v1/auth/verify', status: 'passed', time: '88ms' },
                    { name: '连续输错密码风控锁定检测', method: 'POST', path: '/api/v1/auth/lock-check', status: 'passed', time: '110ms' },
                    { name: '国内手机号短信验证码正常下发', method: 'POST', path: '/api/v1/sms/send', status: 'passed', time: '210ms' },
                    { name: '高频并发刷短信防刷限流拦截', method: 'POST', path: '/api/v1/sms/send', status: 'failed', time: '195ms' },
                    { name: '手机验证码提交并自动完成登录', method: 'POST', path: '/api/v1/sms/verify', status: 'passed', time: '165ms' },
                    { name: '多端登录会话下线与广播', method: 'POST', path: '/api/v1/session/kick', status: 'ready', time: '-' },
                    { name: 'Token 并发刷新互斥锁幂等性', method: 'POST', path: '/api/v1/auth/refresh', status: 'passed', time: '130ms' },
                  ].map((pipe, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-slate-500 text-[11px] w-5">#{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded text-[10px]">
                            {pipe.method}
                          </span>
                          <span className="font-medium text-slate-200">{pipe.name}</span>
                          <span className="font-mono text-slate-500 text-[11px] truncate">{pipe.path}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-mono text-[11px] text-slate-400">{pipe.time}</span>
                        {pipe.status === 'passed' ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] gap-1">
                            <Check className="w-3 h-3" /> PASS
                          </Badge>
                        ) : pipe.status === 'failed' ? (
                          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] gap-1">
                            <X className="w-3 h-3" /> FAIL (待修复)
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px]">
                            READY
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 视图 3：🛡️ AI 质量准出裁决书 */}
            {activeCanvasView === 'gate' && (
              <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
                <Card className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">AI 质量准出裁决报告 (Gate Decision)</h2>
                        <p className="text-xs text-slate-400 mt-0.5">基于自动化流水线实测、PRD 边界覆盖度与缺陷归因生成</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-3 py-1 font-bold">
                      建议：条件放行 (需修复1处安全漏洞)
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                      <span className="text-xs text-slate-400">AI 综合健康评分</span>
                      <div className="text-3xl font-black text-blue-400 font-mono">92<span className="text-sm font-normal text-slate-500">/100</span></div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                      <span className="text-xs text-slate-400">PRD 需求覆盖率</span>
                      <div className="text-3xl font-black text-emerald-400 font-mono">100<span className="text-sm font-normal text-slate-500">%</span></div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                      <span className="text-xs text-slate-400">自动化流水线通过率</span>
                      <div className="text-3xl font-black text-amber-400 font-mono">90.9<span className="text-sm font-normal text-slate-500">%</span></div>
                    </div>
                  </div>

                  {/* 风险清单 */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">AI 拦截的核心风险阻断项</h3>
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-rose-300">
                        <AlertCircle className="w-4 h-4" />
                        <span>[P0 资损安全漏洞] 短信验证码接口缺少分布式并发限流</span>
                      </div>
                      <p className="text-slate-300 pl-6 leading-relaxed">
                        在并发连击压测场景下，服务端未有效返回 HTTP 429 拦截，容易被恶意短信轰炸导致资损。已生成 JIRA 缺陷单并将修复建议同步给研发。
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">裁决时间: {new Date().toLocaleString()}</span>
                    <Button className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-lg shadow-emerald-600/20">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>签署准出并导出归档报告</span>
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* ================= 节点详情浮层 (Node Inspector Slide-over) ================= */}
          {selectedNode && (
            <div className="absolute right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col z-30 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-white truncate">
                  <Code2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">测点与自动化执行详情</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedNode(null)}
                  className="h-7 w-7 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">测点名称</label>
                  <h3 className="text-sm font-bold text-white mt-1">{selectedNode.title}</h3>
                </div>

                {selectedNode.boundApi && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">挂载的 API 自动化契约</label>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{selectedNode.boundApi.method}</Badge>
                      <span className="text-slate-200">{selectedNode.boundApi.path}</span>
                    </div>
                  </div>
                )}

                {selectedNode.steps && selectedNode.steps.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">测试执行步骤</label>
                    {selectedNode.steps.map((s, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <div className="text-slate-300 font-medium"><strong className="text-blue-400 font-mono">#{idx + 1}</strong> {s.step}</div>
                        <div className="text-emerald-400/90 text-[11px]">➔ 预期: {s.expected}</div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedNode.aiInsight && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>AI 挖掘逻辑暗坑</span>
                    </div>
                    <p className="leading-relaxed">{selectedNode.aiInsight}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                <Button
                  onClick={() => {
                    toast.success(`正在单点运行接口: ${selectedNode.boundApi?.path || selectedNode.title}`);
                  }}
                  className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>单点执行该接口</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
