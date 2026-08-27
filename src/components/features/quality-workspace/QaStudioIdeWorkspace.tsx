import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BookOpen,
  FolderTree,
  FileText,
  FileCode,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Play,
  PlayCircle,
  Pause,
  RotateCcw,
  Sparkles,
  Terminal,
  Bot,
  Send,
  Wand2,
  SplitSquareVertical,
  Columns,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  X,
  Search,
  Plus,
  Zap,
  Flame,
  ShieldCheck,
  Code2,
  Link2,
  Check,
  Filter,
  Layers,
  Activity,
  GitBranch,
  Settings,
  SlidersHorizontal,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// 数据类型定义
export interface DocumentItem {
  id: string;
  number: string;
  name: string;
  type: 'prd' | 'design' | 'api';
  coverage: number; // 0 ~ 100
  uncoveredCount: number;
  content: string;
  reqItems: { reqId: string; text: string; isCovered: boolean }[];
}

export interface TestCaseItem {
  id: string;
  code: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'passed' | 'failed' | 'ready';
  docId: string;
  reqSource: string;
  steps: { step: string; expected: string }[];
  boundApi?: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string };
}

export interface ReportItem {
  id: string;
  title: string;
  date: string;
  status: 'pass' | 'conditional' | 'blocked';
  passRate: string;
  score: number;
}

export interface TerminalLog {
  id: string;
  time: string;
  level: 'info' | 'warn' | 'error' | 'success';
  source: string;
  message: string;
}

// 模拟文档树 (PRD 目录)
const INITIAL_DOCS: DocumentItem[] = [
  {
    id: 'doc-1-0',
    number: '1.0',
    name: '1.0 概述与架构演进.prd.md',
    type: 'prd',
    coverage: 100,
    uncoveredCount: 0,
    content: `### 1.0 项目概述与架构演进

#### 1.1 改造背景
随着业务体系扩张，旧版单体鉴权模块存在以下痛点：
- 各端无法统一共享 Session 状态；
- 缺少对高危设备指纹和异地风险登录的主动拦截；
- 短信验证码服务缺少分布式防刷保护。

#### 1.2 核心目标
1. 统一接入层鉴权协议，全面采用 **双 Token 架构 (Access Token 2小时 + Refresh Token 7天)**；
2. 支持 **7 天无感免密自动续期**；
3. 强化风控防御，接入分布式 IP 限流与密码阶梯锁定。`,
    reqItems: [
      { reqId: 'REQ-101', text: '统一各端鉴权接入协议，采用双 Token (Access + Refresh) 架构。', isCovered: true },
      { reqId: 'REQ-102', text: '支持旧版客户端向新协议无感平滑迁移。', isCovered: true },
    ],
  },
  {
    id: 'doc-2-1',
    number: '2.1',
    name: '2.1 账号密码登录.prd.md',
    type: 'prd',
    coverage: 100,
    uncoveredCount: 0,
    content: `### 2.1 账号密码登录业务规范

#### 2.1.1 输入规则
- 账号支持 **手机号、邮箱、用户名** 三种输入形式；
- 前端自动去首尾多余空格；
- 密码输入框传输前必须通过 **SHA-256 加密** 动态加盐。

#### 2.1.2 记住我策略
- 用户勾选【记住我（7天免登录）】；
- 服务端颁发 7 天有效期的 Session 凭证，无感自动换取新 Token。`,
    reqItems: [
      { reqId: 'REQ-211', text: '账号支持手机号、邮箱、用户名三种输入格式，自动去首尾空格。', isCovered: true },
      { reqId: 'REQ-212', text: '密码输入需在前端完成 SHA-256 加密后再传输。', isCovered: true },
      { reqId: 'REQ-213', text: '勾选【记住我】，7 天内免重新输入密码无感登录。', isCovered: true },
    ],
  },
  {
    id: 'doc-2-2',
    number: '2.2',
    name: '2.2 手机验证码登录.prd.md',
    type: 'prd',
    coverage: 75,
    uncoveredCount: 1,
    content: `### 2.2 手机验证码登录业务规范

#### 2.2.1 验证码下发机制
1. 用户输入 11 位大陆有效手机号；
2. 点击【获取验证码】，系统生成 6 位纯数字随机码并通过短信网关下发；
3. 点击后按钮进入 **60 秒倒计时锁定** 状态；
4. 验证码有效时长为 **5 分钟**，超时失效。

#### 2.2.2 自动注册与登录
- 若手机号在系统中已存在，直接完成登录；
- 若手机号为首次登录，系统自动在后台创建新用户记录。

#### 2.2.3 异常与防刷限流 (重要漏洞点)
- 为防止短信接口被恶意刷量导致资损，系统需限制 **单 IP 单日请求上限 20 次**，超出触发滑块验证或 429 拦截。`,
    reqItems: [
      { reqId: 'REQ-221', text: '输入合规手机号，点击发送验证码，启动 60 秒倒计时防重。', isCovered: true },
      { reqId: 'REQ-222', text: '验证码为 6 位纯数字，有效时间为 5 分钟。', isCovered: true },
      { reqId: 'REQ-223', text: '未注册手机号首次通过验证码登录，系统自动创建基础账号。', isCovered: true },
      { reqId: 'REQ-224', text: '【⚠️ 存在漏测风险】系统需限制单 IP 单日短信发送上限（防刷资损）。', isCovered: false },
    ],
  },
  {
    id: 'doc-3-1',
    number: '3.1',
    name: '3.1 密码输错阶梯锁定.prd.md',
    type: 'prd',
    coverage: 100,
    uncoveredCount: 0,
    content: `### 3.1 密码输错阶梯风控策略

#### 3.1.1 错误计数与锁定规则
- **输错 1~4 次**：页面友好提示“密码错误，还可尝试 N 次”；
- **输错第 5 次**：系统立即触发风控锁定，锁定账号登录权限 **15 分钟**；
- 锁定期内输入正确密码亦必须返回 HTTP 403 锁定中。`,
    reqItems: [
      { reqId: 'REQ-311', text: '密码输错 1~4 次，提示剩余重试次数。', isCovered: true },
      { reqId: 'REQ-312', text: '连续输错 5 次，锁定该账号登录权限 15 分钟。', isCovered: true },
    ],
  },
  {
    id: 'doc-3-2',
    number: '3.2',
    name: '3.2 单点登录与异地互踢.prd.md',
    type: 'prd',
    coverage: 0,
    uncoveredCount: 1,
    content: `### 3.2 单点登录与异地登录互踢

#### 3.2.1 在线设备互斥规则
- 同一账号同一时刻只允许在 1 台移动设备和 1 个网页端在线；
- 异地新设备成功登录时，服务端通过 WebSocket 向旧设备推送下线广播；
- 旧设备前端弹出下线提示并强制销毁 Token。`,
    reqItems: [
      { reqId: 'REQ-321', text: '【⚠️ 存在漏测风险】新设备登录成功后通过 WebSocket 下线旧设备并使 Token 失效。', isCovered: false },
    ],
  },
];

// 模拟测试用例
const INITIAL_CASES: TestCaseItem[] = [
  {
    id: 'c-1',
    code: 'TC-AUTH-001',
    title: '鉴权成功后正确颁发双 Token (Access & Refresh)',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-1-0',
    reqSource: 'REQ-101: 双 Token 架构',
    boundApi: { method: 'POST', path: '/api/v1/auth/login' },
    steps: [{ step: '发送登录鉴权请求', expected: '返回 accessToken (2h) 与 refreshToken (7d)' }],
  },
  {
    id: 'c-2',
    code: 'TC-PWD-001',
    title: '正确账号密码登录 ➔ 成功颁发凭证',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-2-1',
    reqSource: 'REQ-211: 支持手机号/邮箱/用户名',
    boundApi: { method: 'POST', path: '/api/v1/auth/login' },
    steps: [{ step: '输入正确的用户名和密码', expected: '返回 HTTP 200，成功获取用户信息' }],
  },
  {
    id: 'c-3',
    code: 'TC-SMS-001',
    title: '正常输入 11 位手机号 ➔ 下发验证码并倒计时',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-2-2',
    reqSource: 'REQ-221: 发送验证码与 60s 倒计时',
    boundApi: { method: 'POST', path: '/api/v1/sms/send' },
    steps: [{ step: '输入 13800000000 点击获取验证码', expected: '收到 6 位验证码，按钮置灰倒计时 60s' }],
  },
  {
    id: 'c-4',
    code: 'TC-SMS-002',
    title: '验证码过期 (>5分钟) 提交 ➔ 明确提示已失效',
    priority: 'P1',
    status: 'passed',
    docId: 'doc-2-2',
    reqSource: 'REQ-222: 验证码 5 分钟有效',
    boundApi: { method: 'POST', path: '/api/v1/sms/verify' },
    steps: [{ step: '获取验证码后等待 5 分钟再提交', expected: '提示“验证码已过期，请重新获取”' }],
  },
  {
    id: 'c-5',
    code: 'TC-SMS-003',
    title: '全新未注册手机号 ➔ 验证码校验后自动建号',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-2-2',
    reqSource: 'REQ-223: 未注册手机号自动建号',
    boundApi: { method: 'POST', path: '/api/v1/sms/verify' },
    steps: [{ step: '使用新手机号完成验证码登录', expected: '用户表新增记录，成功进入新人引导页' }],
  },
  {
    id: 'c-6',
    code: 'TC-SEC-001',
    title: '连续输错 5 次 ➔ 账号强制锁定 15 分钟',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-3-1',
    reqSource: 'REQ-312: 输错 5 次锁定 15 分钟',
    boundApi: { method: 'POST', path: '/api/v1/auth/lock-check' },
    steps: [{ step: '连续 5 次发送错误密码，第 6 次发送正确密码', expected: '第 6 次依旧返回 403 账号已被临时锁定' }],
  },
];

// 模拟报告
const INITIAL_REPORTS: ReportItem[] = [
  { id: 'rep-1', title: '用户登录改造 v2.0 阶段质量准出报告', date: '2026-08-26 18:30', status: 'conditional', passRate: '90.9%', score: 92 },
  { id: 'rep-2', title: '冒烟测试执行报告 - Release Build #104', date: '2026-08-25 14:10', status: 'pass', passRate: '100%', score: 98 },
];

export function QaStudioIdeWorkspace({ onBack }: { onBack?: () => void }) {
  // 左侧 ActivityBar 选中的面板：'docs' (文档目录) | 'cases' (用例目录) | 'reports' (报告目录) | 'apis' (API目录)
  const [activeActivity, setActiveActivity] = useState<'docs' | 'cases' | 'reports' | 'apis'>('docs');
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);

  // 打开的 Tab 页签列表 (类似 VS Code 编辑器页签)
  const [openTabs, setOpenTabs] = useState<Array<{ id: string; title: string; type: 'doc' | 'cases' | 'report' | 'api' }>>([
    { id: 'doc-2-2', title: '2.2 手机验证码登录.prd.md', type: 'doc' },
    { id: 'cases-2-2', title: '2.2-短信用例集.spec.ts', type: 'cases' },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('doc-2-2');

  // 多屏分屏模式：'split' (双屏并排：左文档+右用例) | 'single' (单屏聚焦)
  const [editorLayout, setEditorLayout] = useState<'split' | 'single'>('split');

  // 核心数据状态
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [cases, setCases] = useState<TestCaseItem[]>(INITIAL_CASES);
  const [selectedDocId, setSelectedDocId] = useState<string>('doc-2-2');

  // 底部控制台状态 (Terminal & AI Console)
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [consoleHeight, setConsoleHeight] = useState(200); // 底部控制台高度 (px)
  const [activeConsoleTab, setActiveConsoleTab] = useState<'copilot' | 'terminal' | 'problems' | 'gate'>('copilot');

  // AI 控制台指令与思维日志
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    { id: 'l-1', time: '14:20:01', level: 'info', source: 'AegisRunner', message: 'Runner Worker Pod #4402 初始化就绪 (Node: k8s-qa-sh-01)' },
    { id: 'l-2', time: '14:20:03', level: 'info', source: 'ContractEngine', message: '已加载 6 个 OpenAPI 契约定义与 Mock 桩服务' },
    { id: 'l-3', time: '14:20:05', level: 'success', source: 'AegisQA', message: 'Aegis QA Co-Pilot 智能中枢已就绪，已建立全量需求 1:1 溯源索引图谱' },
  ]);

  // 划词浮动 AI 胶囊
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);

  // 当前选中的文档
  const currentDoc = useMemo(() => {
    return docs.find((d) => d.id === selectedDocId) || docs[0];
  }, [docs, selectedDocId]);

  // 当前章节对应的测试用例列表
  const currentCases = useMemo(() => {
    return cases.filter((c) => c.docId === selectedDocId);
  }, [cases, selectedDocId]);

  // 全局覆盖率与漏测统计
  const globalMetrics = useMemo(() => {
    let totalReqs = 0;
    let coveredReqs = 0;
    docs.forEach((d) => {
      d.reqItems.forEach((r) => {
        totalReqs++;
        if (r.isCovered) coveredReqs++;
      });
    });
    const rate = totalReqs > 0 ? ((coveredReqs / totalReqs) * 100).toFixed(0) : '0';
    return { totalReqs, coveredReqs, rate, totalCases: cases.length };
  }, [docs, cases]);

  // 点击文档树，在编辑器打开 Tab
  const handleOpenDoc = (doc: DocumentItem) => {
    setSelectedDocId(doc.id);
    const tabDocId = doc.id;
    if (!openTabs.some((t) => t.id === tabDocId)) {
      setOpenTabs((prev) => [...prev, { id: tabDocId, title: doc.name, type: 'doc' }]);
    }
    setActiveTabId(tabDocId);
  };

  // 关闭 Tab
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(remaining);
    if (activeTabId === tabId && remaining.length > 0) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  // 处理 PRD 划词
  const handleMouseUpInPrd = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionPos(null);
      setSelectedText('');
      return;
    }
    const text = selection.toString().trim();
    if (text.length < 2) {
      setSelectionPos(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectedText(text);
    setSelectionPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  // 从划词直接生成用例
  const handleGenerateCaseFromSelection = () => {
    if (!selectedText) return;
    setSelectionPos(null);
    setIsAiThinking(true);

    toast.info(`🤖 AI 正在为划选段落「${selectedText.slice(0, 15)}...」推导测试用例...`);

    setTimeout(() => {
      const newCase: TestCaseItem = {
        id: `TC-IDE-${Date.now()}`,
        code: `TC-GEN-00${Math.floor(Math.random() * 90 + 10)}`,
        title: `【划词推导】针对「${selectedText.slice(0, 18)}」的测试场景`,
        priority: 'P0',
        status: 'passed',
        docId: currentDoc.id,
        reqSource: `PRD 划词锚定: ${selectedText.slice(0, 20)}...`,
        boundApi: { method: 'POST', path: '/api/v1/auth/verify-rule' },
        steps: [{ step: `验证与「${selectedText.slice(0, 15)}」相关的逻辑约束`, expected: '断言符合 PRD 规则，HTTP 200' }],
      };

      setCases((prev) => [...prev, newCase]);
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          level: 'success',
          source: 'AICopilot',
          message: `已自动生成 1:1 用例 [${newCase.code}] 并挂载至当前文档！`,
        },
      ]);
      setIsAiThinking(false);
      toast.success('已成功生成 1:1 落地测试用例并完成双向锚定！');
    }, 900);
  };

  // 通过 AI Terminal 控制台下达指令
  const handleExecuteAiCommand = (customCmd?: string) => {
    const cmd = customCmd || aiInput.trim();
    if (!cmd) return;

    setAiInput('');
    setIsAiThinking(true);

    setTerminalLogs((prev) => [
      ...prev,
      {
        id: `cmd-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        level: 'info',
        source: 'QAEngineer',
        message: `> ${cmd}`,
      },
      {
        id: `ai-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        level: 'info',
        source: 'AICopilot',
        message: `正在分析文档 [${currentDoc.name}] 语义并执行用例装配...`,
      },
    ]);

    setTimeout(() => {
      // 补齐漏测用例
      const autoCase: TestCaseItem = {
        id: `TC-AUTO-${Date.now()}`,
        code: `TC-AUTO-00${Math.floor(Math.random() * 90 + 10)}`,
        title: '高频并发连击请求 ➔ IP 与设备指纹限流拦截 (HTTP 429)',
        priority: 'P0',
        status: 'passed',
        docId: 'doc-2-2',
        reqSource: 'REQ-224: 单 IP 短信防刷限流',
        boundApi: { method: 'POST', path: '/api/v1/sms/send' },
        steps: [{ step: '1秒内并发发送 10 次获取验证码请求', expected: '第 2 次起被 Redis 限流拦截，返回 HTTP 429' }],
      };

      setDocs((prev) =>
        prev.map((d) => {
          if (d.id !== 'doc-2-2') return d;
          return {
            ...d,
            coverage: 100,
            uncoveredCount: 0,
            reqItems: d.reqItems.map((r) => ({ ...r, isCovered: true })),
          };
        })
      );

      setCases((prev) => (prev.some((c) => c.code === autoCase.code) ? prev : [...prev, autoCase]));

      setTerminalLogs((prev) => [
        ...prev,
        {
          id: `done-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          level: 'success',
          source: 'AICopilot',
          message: `✅ 已成功为当前 PRD 补齐 1 条 P0 自动化用例 [${autoCase.code}]，当前章节覆盖率已达 100%！`,
        },
      ]);

      setIsAiThinking(false);
      toast.success('AI 指挥执行完毕：已补齐用例并消除漏测风险！');
    }, 1200);
  };

  // 执行全量自动化
  const handleRunAllPipeline = () => {
    setActiveConsoleTab('terminal');
    setIsConsoleOpen(true);

    setTerminalLogs((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        level: 'info',
        source: 'AegisRunner',
        message: `🚀 开始并发调度执行【${currentDoc.name}】下的所有关联 API 用例...`,
      },
    ]);

    setTimeout(() => {
      setCases((prev) =>
        prev.map((c) => (c.docId === currentDoc.id ? { ...c, status: 'passed' } : c))
      );
      setTerminalLogs((prev) => [
        ...prev,
        { id: `pass-1`, time: new Date().toTimeString().slice(0, 8), level: 'success', source: 'Runner', message: 'POST /api/v1/sms/send ➔ HTTP 200 OK (142ms) [断言成功]' },
        { id: `pass-2`, time: new Date().toTimeString().slice(0, 8), level: 'success', source: 'Runner', message: 'POST /api/v1/sms/verify ➔ HTTP 200 OK (89ms) [断言成功]' },
        { id: `pass-3`, time: new Date().toTimeString().slice(0, 8), level: 'success', source: 'Runner', message: 'POST /api/v1/auth/login ➔ HTTP 200 OK (110ms) [断言成功]' },
        { id: `pass-end`, time: new Date().toTimeString().slice(0, 8), level: 'success', source: 'AegisRunner', message: '🎉 全量流水线执行完成：全部通过 (0 Failed / 0 Blocked)，建议准出放行！' },
      ]);
      toast.success('自动化流水线执行全部通过！');
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#181818] text-[#cccccc] overflow-hidden font-sans select-none selection:bg-[#264f78] selection:text-white">
      {/* ================= 顶部 IDE 菜单与工具栏 ================= */}
      <header className="h-10 shrink-0 bg-[#1f1f1f] border-b border-[#2b2b2b] px-4 flex items-center justify-between z-20 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-white">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-mono text-[10px]">
              QA
            </span>
            <span>Aegis QA Studio IDE</span>
            <span className="text-[#6e7681] font-normal text-[11px] font-mono">v3.0 (AI-Native)</span>
          </div>

          <div className="h-3 w-px bg-[#333333]" />

          <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
            <GitBranch className="w-3 h-3 text-blue-400" />
            <span className="font-mono text-white">feature/login-v2</span>
            <span className="text-[#555555]">|</span>
            <span>PRD 覆盖率:</span>
            <span className="font-bold text-emerald-400 font-mono">{globalMetrics.rate}%</span>
          </div>
        </div>

        {/* 顶部右侧窗口控制与分屏切换 */}
        <div className="flex items-center gap-2">
          {/* 分屏模式切换 */}
          <div className="flex items-center bg-[#282828] p-0.5 rounded border border-[#383838]">
            <button
              onClick={() => setEditorLayout('split')}
              title="双屏并排分屏 (PRD + 用例)"
              className={`p-1 rounded text-xs transition-colors ${
                editorLayout === 'split' ? 'bg-[#37373d] text-white shadow-sm' : 'text-[#888888] hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditorLayout('single')}
              title="单屏全屏聚焦"
              className={`p-1 rounded text-xs transition-colors ${
                editorLayout === 'single' ? 'bg-[#37373d] text-white shadow-sm' : 'text-[#888888] hover:text-white'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 运行自动化按钮 */}
          <Button
            size="sm"
            onClick={handleRunAllPipeline}
            className="h-6 text-[11px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded px-2.5 gap-1 shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>执行当前流水线</span>
          </Button>

          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-6 text-[11px] text-[#888888] hover:text-white px-2 rounded"
            >
              退出 IDE
            </Button>
          )}
        </div>
      </header>

      {/* ================= IDE 主工作区 (ActivityBar + SideBar + EditorArea) ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Activity Bar (最左侧活动栏，48px) */}
        <div className="w-12 shrink-0 bg-[#252526] border-r border-[#1e1e1e] flex flex-col items-center py-2.5 justify-between z-10">
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => {
                setActiveActivity('docs');
                setIsLeftSidebarOpen(true);
              }}
              title="需求与 PRD 目录 (PageIndex)"
              className={`p-2 rounded-lg transition-colors relative ${
                activeActivity === 'docs' && isLeftSidebarOpen
                  ? 'text-white bg-[#37373d]'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              <FolderTree className="w-5 h-5" />
              {globalMetrics.rate !== '100' && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveActivity('cases');
                setIsLeftSidebarOpen(true);
              }}
              title="测试用例资产库"
              className={`p-2 rounded-lg transition-colors ${
                activeActivity === 'cases' && isLeftSidebarOpen
                  ? 'text-white bg-[#37373d]'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              <FileCode className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setActiveActivity('reports');
                setIsLeftSidebarOpen(true);
              }}
              title="准出报告与执行记录"
              className={`p-2 rounded-lg transition-colors ${
                activeActivity === 'reports' && isLeftSidebarOpen
                  ? 'text-white bg-[#37373d]'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              <FileCheck className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setActiveActivity('apis');
                setIsLeftSidebarOpen(true);
              }}
              title="API 自动化契约库"
              className={`p-2 rounded-lg transition-colors ${
                activeActivity === 'apis' && isLeftSidebarOpen
                  ? 'text-white bg-[#37373d]'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              <Code2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              title="折叠/展开侧边栏"
              className="p-2 text-[#858585] hover:text-white rounded-lg transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SideBar 资源管理器树 (240px，可折叠) */}
        {isLeftSidebarOpen && (
          <div className="w-60 xl:w-64 shrink-0 bg-[#252526] border-r border-[#1e1e1e] flex flex-col min-h-0 z-10 text-xs">
            <div className="h-9 px-4 border-b border-[#1e1e1e] flex items-center justify-between font-bold uppercase tracking-wider text-[11px] text-[#bbbbbb]">
              <span>
                {activeActivity === 'docs'
                  ? 'PRD 需求目录 (PAGEINDEX)'
                  : activeActivity === 'cases'
                  ? '测试用例资产 (CASES)'
                  : activeActivity === 'reports'
                  ? '准出报告库 (REPORTS)'
                  : 'API 自动化流水线'}
              </span>
              <button
                onClick={() => setIsLeftSidebarOpen(false)}
                className="text-[#888888] hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 资源列表树 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {activeActivity === 'docs' && (
                <div className="space-y-1">
                  {docs.map((doc) => {
                    const isSelected = doc.id === currentDoc.id;
                    const isFull = doc.coverage === 100;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleOpenDoc(doc)}
                        className={`group cursor-pointer rounded px-2.5 py-1.5 flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? 'bg-[#37373d] text-white font-medium'
                            : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-[#858585]'}`} />
                          <span className="truncate">{doc.name}</span>
                        </div>

                        {isFull ? (
                          <span className="text-[10px] text-emerald-400 font-mono shrink-0">100%</span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono font-bold shrink-0 animate-pulse">
                            {doc.coverage}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeActivity === 'cases' && (
                <div className="space-y-1">
                  {cases.map((c) => (
                    <div
                      key={c.id}
                      className="cursor-pointer rounded px-2 py-1.5 flex items-center justify-between text-xs text-[#cccccc] hover:bg-[#2a2d2e] group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{c.code}</span>
                      </div>
                      <Badge className="bg-[#333333] text-[#888888] text-[9px] px-1 py-0 border-0">
                        {c.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {activeActivity === 'reports' && (
                <div className="space-y-2 p-1">
                  {INITIAL_REPORTS.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-2 rounded bg-[#1e1e1e] border border-[#333333] space-y-1 cursor-pointer hover:border-blue-500"
                    >
                      <div className="font-bold text-white truncate text-[11px]">{rep.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-[#888888]">
                        <span>得分: {rep.score}</span>
                        <span className="text-emerald-400">{rep.passRate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeActivity === 'apis' && (
                <div className="space-y-1">
                  {['POST /api/v1/auth/login', 'POST /api/v1/auth/verify', 'POST /api/v1/sms/send', 'POST /api/v1/sms/verify', 'POST /api/v1/session/kick'].map((api, idx) => (
                    <div key={idx} className="px-2 py-1 rounded text-xs font-mono text-cyan-400 hover:bg-[#2a2d2e] cursor-pointer flex items-center gap-2">
                      <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{api}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= Editor Area 编辑器工作区分屏区 ================= */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e] relative">
          {/* Tab 页签栏 (类似 VS Code Tabs) */}
          <div className="h-9 bg-[#252526] flex items-center overflow-x-auto no-scrollbar border-b border-[#1e1e1e] shrink-0">
            {openTabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    setActiveTabId(tab.id);
                    if (tab.id.startsWith('doc-')) setSelectedDocId(tab.id);
                  }}
                  className={`group h-full px-3.5 flex items-center gap-2 text-xs border-r border-[#1e1e1e] cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500 font-medium'
                      : 'text-[#969696] hover:bg-[#2a2d2e] hover:text-[#cccccc]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>{tab.title}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#333333] text-[#888888] hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 多屏分屏渲染主体 */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* 屏 1：沉浸式 PRD Markdown 正文编辑器 */}
            <div
              onMouseUp={handleMouseUpInPrd}
              className={`${
                editorLayout === 'split' ? 'w-1/2 border-r border-[#2b2b2b]' : 'w-full'
              } flex flex-col min-h-0 bg-[#1e1e1e] relative`}
            >
              {/* 编辑器内标题行 */}
              <div className="h-8 px-4 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between text-[11px] text-[#858585] shrink-0 font-mono">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span>{currentDoc.name}</span>
                </span>
                <span className="text-[10px] text-cyan-400">划选文字即可直接推导用例</span>
              </div>

              {/* PRD 正文滚动区 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-[#d4d4d4] font-sans text-xs leading-relaxed">
                <div className="p-4 rounded-xl bg-[#252526] border border-[#333333] whitespace-pre-line leading-6">
                  {currentDoc.content}
                </div>

                {/* 需求条目与覆盖率穿透 */}
                <div className="space-y-2 pt-2">
                  <div className="font-bold text-white text-xs flex items-center justify-between">
                    <span>本篇章需求规则条目 ({currentDoc.reqItems.length})</span>
                    <span className="text-[#888888] font-normal font-mono text-[11px]">
                      已覆盖 {currentDoc.reqItems.filter((r) => r.isCovered).length}/{currentDoc.reqItems.length}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {currentDoc.reqItems.map((r) => (
                      <div
                        key={r.reqId}
                        className={`p-2.5 rounded border transition-colors flex items-start justify-between gap-2 ${
                          r.isCovered
                            ? 'bg-[#252526] border-[#333333]'
                            : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-mono font-bold text-blue-400 text-[10px] shrink-0">
                            [{r.reqId}]
                          </span>
                          <span className="text-[11px]">{r.text}</span>
                        </div>

                        {r.isCovered ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[9px] shrink-0">
                            已覆盖
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleExecuteAiCommand(`为 [${r.reqId}] 补齐测试用例`)}
                            className="h-5 text-[10px] bg-rose-600 hover:bg-rose-500 text-white px-1.5 rounded shrink-0 gap-1"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>补齐</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 划词浮动 AI 胶囊 */}
              {selectionPos && selectedText && (
                <div
                  style={{
                    position: 'fixed',
                    left: `${selectionPos.x}px`,
                    top: `${selectionPos.y}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  className="z-50 bg-[#252526] border border-blue-500 text-white px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in zoom-in-95 duration-150 text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span className="text-[#cccccc] max-w-[120px] truncate">"{selectedText}"</span>
                  <div className="h-3 w-px bg-[#444444]" />
                  <button
                    onClick={handleGenerateCaseFromSelection}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>生成 1:1 用例</span>
                  </button>
                </div>
              )}
            </div>

            {/* 屏 2：1:1 落地测试用例列表与 API 调试 (仅在 split 模式展示或独立 Tab 展示) */}
            {editorLayout === 'split' && (
              <div className="w-1/2 flex flex-col min-h-0 bg-[#1e1e1e]">
                <div className="h-8 px-4 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between text-[11px] text-[#858585] shrink-0 font-mono">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-3 h-3 text-emerald-400" />
                    <span>{currentDoc.number}-短信用例集.spec.ts ({currentCases.length} 条)</span>
                  </span>
                  <span className="text-emerald-400 font-bold">1:1 对应落地</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {currentCases.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#333333] rounded-2xl space-y-2">
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                      <div className="text-xs font-bold text-white">当前章节暂无落地用例</div>
                      <p className="text-[11px] text-[#888888]">
                        请划选左侧 PRD 或在底部控制台下达 AI 指挥指令生成！
                      </p>
                    </div>
                  ) : (
                    currentCases.map((c) => (
                      <Card
                        key={c.id}
                        className="rounded-xl border border-[#2b2b2b] bg-[#252526] p-3.5 space-y-2.5 hover:border-[#383838] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-blue-400 font-bold text-xs">{c.code}</span>
                              <Badge className="bg-[#333333] text-[#888888] text-[9px] px-1 py-0">{c.priority}</Badge>
                              <span className="font-semibold text-white truncate text-xs">{c.title}</span>
                            </div>
                            <div className="text-[10px] text-[#888888] font-mono flex items-center gap-1">
                              <Link2 className="w-2.5 h-2.5 text-blue-400" />
                              <span>{c.reqSource}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {c.status === 'passed' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px] gap-1">
                                <Check className="w-2.5 h-2.5" /> PASS
                              </Badge>
                            ) : (
                              <Badge className="bg-[#333333] text-[#888888] border-0 text-[10px]">READY</Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                toast.info(`正在执行用例 [${c.code}]...`);
                                setTimeout(() => {
                                  setCases((prev) => prev.map((item) => (item.id === c.id ? { ...item, status: 'passed' } : item)));
                                  toast.success(`用例 [${c.code}] 执行通过！`);
                                }, 500);
                              }}
                              className="h-6 w-6 text-[#888888] hover:text-blue-400 rounded"
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {c.boundApi && (
                          <div className="flex items-center gap-2 p-1.5 rounded bg-[#181818] border border-[#2e2e2e] text-[10px] font-mono">
                            <Badge className="bg-cyan-500/20 text-cyan-300 border-0 text-[9px]">{c.boundApi.method}</Badge>
                            <span className="text-[#aaaaaa] truncate">{c.boundApi.path}</span>
                          </div>
                        )}

                        <div className="space-y-1 text-[11px] text-[#aaaaaa] pt-1 border-t border-[#333333]">
                          {c.steps.map((s, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <div><strong className="text-blue-400 font-mono">步骤:</strong> {s.step}</div>
                              <div className="text-emerald-400/90 pl-4">➔ 预期: {s.expected}</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ================= 底部：AI Console & Terminal 窗格 (可收起/展开，高阶指挥控制台) ================= */}
          <div
            style={{ height: isConsoleOpen ? `${consoleHeight}px` : '32px' }}
            className="shrink-0 bg-[#181818] border-t border-[#2b2b2b] flex flex-col z-20 transition-all duration-150 relative"
          >
            {/* 控制台顶部 Tab 栏 */}
            <div className="h-8 bg-[#1f1f1f] border-b border-[#2b2b2b] px-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setActiveConsoleTab('copilot');
                    setIsConsoleOpen(true);
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold pb-0.5 border-b-2 transition-colors ${
                    activeConsoleTab === 'copilot'
                      ? 'text-white border-blue-500'
                      : 'text-[#888888] border-transparent hover:text-[#cccccc]'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                  <span>AI COPILOT 指挥台</span>
                </button>

                <button
                  onClick={() => {
                    setActiveConsoleTab('terminal');
                    setIsConsoleOpen(true);
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold pb-0.5 border-b-2 transition-colors ${
                    activeConsoleTab === 'terminal'
                      ? 'text-white border-blue-500'
                      : 'text-[#888888] border-transparent hover:text-[#cccccc]'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>TERMINAL 运行终端</span>
                </button>

                <button
                  onClick={() => {
                    setActiveConsoleTab('problems');
                    setIsConsoleOpen(true);
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold pb-0.5 border-b-2 transition-colors ${
                    activeConsoleTab === 'problems'
                      ? 'text-white border-blue-500'
                      : 'text-[#888888] border-transparent hover:text-[#cccccc]'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>PROBLEMS 漏测诊断 ({docs.reduce((acc, d) => acc + d.uncoveredCount, 0)})</span>
                </button>
              </div>

              {/* 展开/收起按钮 */}
              <div className="flex items-center gap-2 text-[#888888]">
                <button
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                  className="hover:text-white p-1 rounded"
                >
                  {isConsoleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 控制台内容面板 */}
            {isConsoleOpen && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#181818] p-3 text-xs overflow-hidden">
                {/* Tab 1: AI Copilot 指挥台 */}
                {activeConsoleTab === 'copilot' && (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2">
                    {/* 快捷指令胶囊 */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleExecuteAiCommand('扫描当前 PRD 未定义的隐性资损暗坑')}
                        className="text-[11px] bg-[#252526] hover:bg-[#333333] text-[#cccccc] border border-[#383838] px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                      >
                        <ShieldCheck className="w-3 h-3 text-blue-400" />
                        <span>AI 扫描暗坑</span>
                      </button>
                      <button
                        onClick={() => handleExecuteAiCommand('为当前章节一键补齐所有缺失用例')}
                        className="text-[11px] bg-[#252526] hover:bg-[#333333] text-[#cccccc] border border-[#383838] px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>一键补齐漏测</span>
                      </button>
                      <button
                        onClick={handleRunAllPipeline}
                        className="text-[11px] bg-[#252526] hover:bg-[#333333] text-[#cccccc] border border-[#383838] px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                      >
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>全量调度执行</span>
                      </button>
                    </div>

                    {/* 对话与指令输入框 */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleExecuteAiCommand();
                      }}
                      className="flex items-center gap-2 shrink-0"
                    >
                      <Input
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder="对 AI 下达指令，如：补充并发防刷、生成异常流断言..."
                        className="h-8 text-xs bg-[#1f1f1f] border-[#333333] text-white rounded focus-visible:ring-blue-500/50 placeholder:text-[#555555]"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!aiInput.trim() || isAiThinking}
                        className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs gap-1 shrink-0"
                      >
                        <Send className="w-3 h-3" />
                        <span>发送</span>
                      </Button>
                    </form>

                    {/* 实时思维流输出 */}
                    <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 text-[#8b949e]">
                      {terminalLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2">
                          <span className="text-[#555555] shrink-0">[{log.time}]</span>
                          <span className={`shrink-0 font-bold ${log.level === 'success' ? 'text-emerald-400' : 'text-blue-400'}`}>
                            [{log.source}]
                          </span>
                          <span className={log.level === 'success' ? 'text-emerald-300' : 'text-[#cccccc]'}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 2: Terminal 运行终端 */}
                {activeConsoleTab === 'terminal' && (
                  <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 text-[#8b949e]">
                    {terminalLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-[#555555] shrink-0">[{log.time}]</span>
                        <span className={`shrink-0 font-bold ${log.level === 'success' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                          [{log.source}]
                        </span>
                        <span className={log.level === 'success' ? 'text-emerald-300' : 'text-[#d4d4d4]'}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 3: Problems 漏测诊断 */}
                {activeConsoleTab === 'problems' && (
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {docs.filter((d) => d.uncoveredCount > 0).map((d) => (
                      <div key={d.id} className="p-2 rounded bg-rose-950/20 border border-rose-500/30 flex items-center justify-between text-xs text-rose-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>[{d.name}] 存在 {d.uncoveredCount} 处需求规则未被测试用例覆盖</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleExecuteAiCommand(`为 [${d.name}] 补齐测试用例`)}
                          className="h-6 text-[10px] bg-rose-600 hover:bg-rose-500 text-white rounded px-2"
                        >
                          一键让 AI 修复
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 底部状态栏 Status Bar (类似 VS Code 状态栏，22px) ================= */}
      <footer className="h-6 bg-[#007acc] text-white px-3 flex items-center justify-between text-[11px] z-30 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 font-mono">
            <GitBranch className="w-3 h-3" />
            <span>feature/login-v2</span>
          </div>
          <div className="flex items-center gap-1">
            <span>PRD 章节:</span>
            <span className="font-bold font-mono">{currentDoc.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>落地用例:</span>
            <span className="font-bold font-mono">{currentCases.length} 条</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 font-mono">
            <Sparkles className="w-3 h-3 text-cyan-200" />
            <span>AI QA Co-Pilot: Active</span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <span>UTF-8</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
