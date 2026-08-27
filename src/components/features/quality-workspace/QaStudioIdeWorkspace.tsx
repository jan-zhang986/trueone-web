import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Play,
  Columns2,
  Maximize2,
  FolderTree,
  Send,
  Wand2,
  Sparkles,
  Link2,
  Check,
  X,
  Bot,
  Terminal,
  Activity,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plus,
  SlidersHorizontal,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// 数据模型定义
export interface DocumentItem {
  id: string;
  number: string;
  name: string;
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

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error';
  tag: string;
  text: string;
}

// 模拟文档树
const INITIAL_DOCS: DocumentItem[] = [
  {
    id: 'doc-1',
    number: '1.0',
    name: '1.0 概述与架构演进',
    coverage: 100,
    uncoveredCount: 0,
    content: `### 1.0 项目概述与架构演进

#### 1.1 改造背景
随着系统微服务演进，旧版登录模块存在以下问题：
- 各端无法统一共享 Session 鉴权凭证；
- 缺少针对高危设备指纹和异地风险登录的主动拦截；
- 短信验证码服务缺少分布式防刷与频次控制。

#### 1.2 改造目标
1. 统一接入层鉴权协议，全面采用 **双 Token 架构 (Access Token 2小时 + Refresh Token 7天)**；
2. 支持 **7 天无感免密自动续期**；
3. 强化风控防御，接入分布式 IP 频次限制与密码阶梯锁定。`,
    reqItems: [
      { reqId: 'REQ-101', text: '统一各端鉴权接入协议，采用双 Token (Access + Refresh) 架构。', isCovered: true },
      { reqId: 'REQ-102', text: '支持旧版客户端向新协议无感平滑迁移。', isCovered: true },
    ],
  },
  {
    id: 'doc-2-1',
    number: '2.1',
    name: '2.1 账号密码登录业务规范',
    coverage: 100,
    uncoveredCount: 0,
    content: `### 2.1 账号密码登录业务规范

#### 2.1.1 用户输入规则
- 账号支持 **手机号、邮箱、用户名** 三种输入形式；
- 前端自动去首尾多余空格；
- 密码输入框传输前必须通过 **SHA-256 加密** 动态加盐传输。

#### 2.1.2 免登策略
- 用户勾选【记住我（7天免登录）】；
- 服务端颁发 7 天有效期的 Session 凭证，7 天内用户再次打开系统可静默进入。`,
    reqItems: [
      { reqId: 'REQ-211', text: '账号支持手机号、邮箱、用户名三种输入格式，自动去首尾空格。', isCovered: true },
      { reqId: 'REQ-212', text: '密码输入需在前端完成 SHA-256 加密后再传输。', isCovered: true },
      { reqId: 'REQ-213', text: '勾选【记住我】，7 天内免重新输入密码无感登录。', isCovered: true },
    ],
  },
  {
    id: 'doc-2-2',
    number: '2.2',
    name: '2.2 手机验证码登录业务规范',
    coverage: 75,
    uncoveredCount: 1,
    content: `### 2.2 手机验证码登录业务规范

#### 2.2.1 验证码下发机制
1. 用户输入 11 位有效手机号码；
2. 点击【获取验证码】，系统生成 6 位纯数字随机码并通过短信网关下发；
3. 点击后按钮进入 **60 秒倒计时锁定** 状态；
4. 验证码有效时长为 **5 分钟**，超时后不可再作为校验凭证。

#### 2.2.2 自动注册与登录
- 若手机号在系统中已存在，直接完成登录并返回用户 Token；
- 若手机号为首次登录，系统自动在后台创建新用户记录并分配基础权限。

#### 2.2.3 异常与防刷限流 (重要)
- 为防止短信接口被恶意刷量导致企业资损，系统需限制 **单 IP 单日请求上限 20 次**，超出触发滑块验证码或 429 拦截。`,
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
    name: '3.1 密码输错阶梯锁定策略',
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
    name: '3.2 单点登录与异地互踢机制',
    coverage: 0,
    uncoveredCount: 1,
    content: `### 3.2 单点登录与异地登录互踢

#### 3.2.1 在线设备互斥规则
- 同一账号同一时刻只允许在 1 台移动设备和 1 个网页端同时在线；
- 当账号在异地新设备成功登录时，服务端通过 WebSocket 向旧设备推送下线广播；
- 旧设备前端弹出下线提示并强制销毁 Token。`,
    reqItems: [
      { reqId: 'REQ-321', text: '【⚠️ 存在漏测风险】新设备登录成功后通过 WebSocket 下线旧设备并使 Token 失效。', isCovered: false },
    ],
  },
];

// 模拟用例
const INITIAL_CASES: TestCaseItem[] = [
  {
    id: 'c-1',
    code: 'TC-AUTH-001',
    title: '鉴权成功后正确颁发双 Token (Access & Refresh)',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-1',
    reqSource: 'REQ-101: 采用双 Token 架构',
    boundApi: { method: 'POST', path: '/api/v1/auth/login' },
    steps: [{ step: '发送鉴权请求并校验返回体', expected: '包含 accessToken (2h有效) 与 refreshToken (7d有效)' }],
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
  { id: 'rep-1', title: '用户登录改造阶段质量准出报告', date: '2026-08-26 18:30', status: 'conditional', passRate: '91%', score: 92 },
  { id: 'rep-2', title: '冒烟测试执行报告 - Build #104', date: '2026-08-25 14:10', status: 'pass', passRate: '100%', score: 98 },
];

export function QaStudioIdeWorkspace({ onBack }: { onBack?: () => void }) {
  // 左侧主导航分类：'docs' (需求文档) | 'cases' (测试用例) | 'reports' (准出报告) | 'apis' (接口契约)
  const [navCategory, setNavCategory] = useState<'docs' | 'cases' | 'reports' | 'apis'>('docs');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 顶部打开的 Tab 页签
  const [openTabs, setOpenTabs] = useState<Array<{ id: string; title: string; type: 'doc' | 'cases' | 'report' }>>([
    { id: 'doc-2-2', title: '2.2 手机验证码登录', type: 'doc' },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('doc-2-2');

  // 多屏分屏布局：'split' (并排双屏：左文档 + 右用例) | 'single' (单屏聚焦)
  const [splitMode, setSplitMode] = useState<'split' | 'single'>('split');

  // 状态数据
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [cases, setCases] = useState<TestCaseItem[]>(INITIAL_CASES);
  const [selectedDocId, setSelectedDocId] = useState<string>('doc-2-2');

  // 底部控制台 (Console & AI Co-pilot)
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState<'ai' | 'terminal' | 'problems'>('ai');
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', time: '14:20:00', type: 'info', tag: 'AegisQA', text: '工作台索引初始化完成，已解析 5 个章节与 11 条需求规则' },
    { id: 'l2', time: '14:20:02', type: 'warn', tag: 'RiskRadar', text: '章节 [2.2 手机验证码登录] 存在 1 处未覆盖的防刷资损规则 (REQ-224)' },
  ]);

  // 划词浮动操作项
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);

  // 当前激活文档
  const currentDoc = useMemo(() => {
    return docs.find((d) => d.id === selectedDocId) || docs[0];
  }, [docs, selectedDocId]);

  // 当前激活文档下的用例
  const currentCases = useMemo(() => {
    return cases.filter((c) => c.docId === selectedDocId);
  }, [cases, selectedDocId]);

  // 全局覆盖率
  const globalStats = useMemo(() => {
    let totalReqs = 0;
    let coveredReqs = 0;
    docs.forEach((d) => {
      d.reqItems.forEach((r) => {
        totalReqs++;
        if (r.isCovered) coveredReqs++;
      });
    });
    const rate = totalReqs > 0 ? ((coveredReqs / totalReqs) * 100).toFixed(0) : '0';
    const uncovered = totalReqs - coveredReqs;
    return { totalReqs, coveredReqs, rate, uncovered, totalCases: cases.length };
  }, [docs, cases]);

  // 打开文档 Tab
  const handleSelectDoc = (doc: DocumentItem) => {
    setSelectedDocId(doc.id);
    if (!openTabs.some((t) => t.id === doc.id)) {
      setOpenTabs((prev) => [...prev, { id: doc.id, title: doc.name, type: 'doc' }]);
    }
    setActiveTabId(doc.id);
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

  // 划词检测
  const handleMouseUp = () => {
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
      y: rect.top - 8,
    });
  };

  // 从划选文字快速生成用例
  const handleCreateCaseFromSelection = () => {
    if (!selectedText) return;
    setSelectionPos(null);
    setIsAiLoading(true);

    toast.info(`正在为划选文本「${selectedText.slice(0, 15)}...」推导测试用例...`);

    setTimeout(() => {
      const newCase: TestCaseItem = {
        id: `TC-${Date.now()}`,
        code: `TC-NEW-00${Math.floor(Math.random() * 90 + 10)}`,
        title: `【划词推导】针对「${selectedText.slice(0, 16)}」的测试场景`,
        priority: 'P0',
        status: 'passed',
        docId: currentDoc.id,
        reqSource: `PRD 划词锚定: ${selectedText.slice(0, 20)}...`,
        boundApi: { method: 'POST', path: '/api/v1/auth/custom-verify' },
        steps: [{ step: `执行与「${selectedText.slice(0, 12)}」相关的校验动作`, expected: '断言符合 PRD 规则，HTTP 200' }],
      };

      setCases((prev) => [...prev, newCase]);
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'AICopilot',
          text: `已为当前章节生成 1:1 用例 [${newCase.code}]`,
        },
      ]);
      setIsAiLoading(false);
      toast.success('已成功生成 1:1 落地测试用例！');
    }, 800);
  };

  // AI 指令执行
  const handleSendAiCommand = (customCmd?: string) => {
    const cmd = customCmd || aiInput.trim();
    if (!cmd) return;

    setAiInput('');
    setIsAiLoading(true);

    setLogs((prev) => [
      ...prev,
      {
        id: `cmd-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'UserCommand',
        text: `> ${cmd}`,
      },
    ]);

    setTimeout(() => {
      const autoCase: TestCaseItem = {
        id: `TC-AUTO-${Date.now()}`,
        code: `TC-AUTO-001`,
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

      setLogs((prev) => [
        ...prev,
        {
          id: `done-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'AICopilot',
          text: `✅ 已为当前章节补齐 1 条 P0 用例 [${autoCase.code}]，覆盖率提升至 100%！`,
        },
      ]);

      setIsAiLoading(false);
      toast.success('AI 指挥执行完毕：已补齐用例并建立 1:1 双向锚定！');
    }, 1000);
  };

  // 调度全量自动化
  const handleRunPipeline = () => {
    setConsoleTab('terminal');
    setIsConsoleOpen(true);

    setLogs((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'Runner',
        text: `🚀 开始并发调度执行【${currentDoc.name}】下的所有关联 API 用例...`,
      },
    ]);

    setTimeout(() => {
      setCases((prev) => prev.map((c) => (c.docId === currentDoc.id ? { ...c, status: 'passed' } : c)));
      setLogs((prev) => [
        ...prev,
        { id: `p1`, time: new Date().toTimeString().slice(0, 8), type: 'success', tag: 'Runner', text: 'POST /api/v1/sms/send ➔ 200 OK (142ms)' },
        { id: `p2`, time: new Date().toTimeString().slice(0, 8), type: 'success', tag: 'Runner', text: 'POST /api/v1/sms/verify ➔ 200 OK (89ms)' },
        { id: `pend`, time: new Date().toTimeString().slice(0, 8), type: 'success', tag: 'Runner', text: '全量用例执行通过，准出指标满足要求！' },
      ]);
      toast.success('自动化流水线执行全部通过！');
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 text-slate-800 overflow-hidden font-sans select-none">
      {/* ================= 1. 顶部工作台标题与状态栏 ================= */}
      <header className="h-12 shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              Q
            </div>
            <span className="font-bold text-sm text-slate-900">质量工作台</span>
            <span className="text-slate-400 text-xs font-mono">/ 用户登录改造</span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* 全局覆盖率指示 */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">需求覆盖率:</span>
              <span className="font-bold font-mono text-emerald-600">{globalStats.rate}%</span>
              <span className="text-slate-400 text-[11px]">({globalStats.coveredReqs}/{globalStats.totalReqs})</span>
            </div>

            {globalStats.uncovered > 0 && (
              <Badge variant="outline" className="h-5 text-[10px] text-amber-700 bg-amber-50 border-amber-200 font-medium">
                {globalStats.uncovered} 处待覆盖
              </Badge>
            )}
          </div>
        </div>

        {/* 顶部右侧控制 */}
        <div className="flex items-center gap-2">
          {/* 分屏模式切换 */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setSplitMode('split')}
              title="双屏并排 (PRD + 测试用例)"
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                splitMode === 'split' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>并排分屏</span>
            </button>
            <button
              onClick={() => setSplitMode('single')}
              title="单屏聚焦"
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                splitMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>单屏聚焦</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleRunPipeline}
            className="h-7 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg px-3 gap-1.5"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>执行自动化</span>
          </Button>

          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="h-7 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 px-2.5 rounded-lg"
            >
              退出
            </Button>
          )}
        </div>
      </header>

      {/* ================= 2. 主体工作区 (左侧大纲树 + 中屏PRD + 右屏用例) ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 左侧活动图标栏 (44px) */}
        <div className="w-11 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-2 justify-between z-10">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                setNavCategory('docs');
                setIsSidebarCollapsed(false);
              }}
              title="需求文档目录 (PageIndex)"
              className={`p-2 rounded-lg transition-colors ${
                navCategory === 'docs' && !isSidebarCollapsed
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FolderTree className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setNavCategory('cases');
                setIsSidebarCollapsed(false);
              }}
              title="测试用例资产"
              className={`p-2 rounded-lg transition-colors ${
                navCategory === 'cases' && !isSidebarCollapsed
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setNavCategory('reports');
                setIsSidebarCollapsed(false);
              }}
              title="准出报告"
              className={`p-2 rounded-lg transition-colors ${
                navCategory === 'reports' && !isSidebarCollapsed
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setNavCategory('apis');
                setIsSidebarCollapsed(false);
              }}
              title="接口资产"
              className={`p-2 rounded-lg transition-colors ${
                navCategory === 'apis' && !isSidebarCollapsed
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Code2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="折叠/展开侧栏"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 左侧大纲资源树 (240px，可折叠) */}
        {!isSidebarCollapsed && (
          <div className="w-60 xl:w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-0 z-10 text-xs">
            <div className="h-8 px-3 border-b border-slate-100 flex items-center justify-between font-semibold text-slate-600 text-[11px]">
              <span>
                {navCategory === 'docs'
                  ? '需求文档大纲 (PAGEINDEX)'
                  : navCategory === 'cases'
                  ? '测试用例资产'
                  : navCategory === 'reports'
                  ? '准出报告库'
                  : '接口资产'}
              </span>
              <button onClick={() => setIsSidebarCollapsed(true)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {navCategory === 'docs' && (
                <div className="space-y-1">
                  {docs.map((doc) => {
                    const isSelected = doc.id === currentDoc.id;
                    const isFull = doc.coverage === 100;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc)}
                        className={`cursor-pointer rounded-lg px-2.5 py-2 flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-100'
                            : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="truncate">{doc.name}</span>
                        </div>

                        {isFull ? (
                          <span className="text-[10px] text-emerald-600 font-mono shrink-0">100%</span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-mono font-bold shrink-0">
                            {doc.coverage}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {navCategory === 'cases' && (
                <div className="space-y-1">
                  {cases.map((c) => (
                    <div
                      key={c.id}
                      className="cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{c.code} {c.title}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200 text-slate-500">
                        {c.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {navCategory === 'reports' && (
                <div className="space-y-2 p-1">
                  {INITIAL_REPORTS.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <div className="font-semibold text-slate-800 text-[11px] truncate">{rep.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>通过率: {rep.passRate}</span>
                        <span>{rep.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {navCategory === 'apis' && (
                <div className="space-y-1">
                  {['POST /api/v1/auth/login', 'POST /api/v1/auth/verify', 'POST /api/v1/sms/send', 'POST /api/v1/sms/verify'].map((api, idx) => (
                    <div key={idx} className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-2 truncate">
                      <span className="text-blue-600 font-bold shrink-0 text-[10px]">API</span>
                      <span className="truncate">{api}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 主编辑区 (Tab 栏 + 多屏并排) */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative">
          {/* 顶部 Tab 页签栏 */}
          <div className="h-8 bg-white flex items-center overflow-x-auto border-b border-slate-200 shrink-0 px-2 gap-1">
            {openTabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    setActiveTabId(tab.id);
                    if (tab.id.startsWith('doc-')) setSelectedDocId(tab.id);
                  }}
                  className={`group h-7 px-3 flex items-center gap-2 text-xs rounded-t-lg border-t border-x cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-slate-50 text-slate-900 border-slate-200 font-semibold'
                      : 'bg-white text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3 h-3 text-blue-600" />
                  <span>{tab.title}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 分屏内容展示区 */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* 左屏：沉浸式 PRD 正文 */}
            <div
              onMouseUp={handleMouseUp}
              className={`${
                splitMode === 'split' ? 'w-1/2 border-r border-slate-200' : 'w-full'
              } flex flex-col min-h-0 bg-white relative`}
            >
              <div className="h-8 px-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
                <span className="font-semibold text-slate-800">{currentDoc.name}</span>
                <span className="text-[10px] text-slate-400">划选任意段落可快速生成用例</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-700 text-xs leading-relaxed">
                {/* PRD 正文块 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 whitespace-pre-line leading-6 text-slate-800">
                  {currentDoc.content}
                </div>

                {/* 需求条目与 1:1 状态 */}
                <div className="space-y-2 pt-2">
                  <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
                    <span>本节需求规则条目 ({currentDoc.reqItems.length})</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      覆盖率: {currentDoc.coverage}%
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {currentDoc.reqItems.map((r) => (
                      <div
                        key={r.reqId}
                        className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 text-xs ${
                          r.isCovered
                            ? 'bg-slate-50/50 border-slate-200 text-slate-700'
                            : 'bg-amber-50/50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-mono font-bold text-blue-600 text-[11px] shrink-0">
                            [{r.reqId}]
                          </span>
                          <span className="text-[11px]">{r.text}</span>
                        </div>

                        {r.isCovered ? (
                          <Badge variant="outline" className="text-[9px] text-emerald-700 bg-emerald-50 border-emerald-200 shrink-0">
                            已覆盖
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSendAiCommand(`为 [${r.reqId}] 补齐测试用例`)}
                            className="h-5 text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-2 rounded shrink-0 gap-1"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>AI 补齐</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 划词浮动胶囊 */}
              {selectionPos && selectedText && (
                <div
                  style={{
                    position: 'fixed',
                    left: `${selectionPos.x}px`,
                    top: `${selectionPos.y}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  className="z-50 bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-xs"
                >
                  <span className="text-slate-300 max-w-[120px] truncate">"{selectedText}"</span>
                  <div className="h-3 w-px bg-slate-700" />
                  <button
                    onClick={handleCreateCaseFromSelection}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>生成 1:1 用例</span>
                  </button>
                </div>
              )}
            </div>

            {/* 右屏：1:1 落地测试用例集 */}
            {splitMode === 'split' && (
              <div className="w-1/2 flex flex-col min-h-0 bg-slate-50">
                <div className="h-8 px-4 bg-white border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
                  <span className="font-semibold text-slate-800">
                    落地测试用例集 ({currentCases.length} 条)
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium">1:1 双向锚定</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {currentCases.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-300 rounded-xl space-y-2 bg-white">
                      <AlertTriangle className="w-6 h-6 text-amber-500" />
                      <div className="text-xs font-semibold text-slate-700">当前章节暂无用例</div>
                      <p className="text-[11px] text-slate-400">
                        请划选左侧 PRD 或在底部控制台下达 AI 指令自动生成
                      </p>
                    </div>
                  ) : (
                    currentCases.map((c) => (
                      <Card
                        key={c.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-none hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-blue-600 font-bold text-xs">{c.code}</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200 text-slate-600">
                                {c.priority}
                              </Badge>
                              <span className="font-semibold text-slate-800 truncate text-xs">{c.title}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Link2 className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                              <span className="truncate">{c.reqSource}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {c.status === 'passed' ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                                PASS
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200">
                                READY
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                toast.info(`正在执行用例 [${c.code}]...`);
                                setTimeout(() => {
                                  setCases((prev) => prev.map((item) => (item.id === c.id ? { ...item, status: 'passed' } : item)));
                                  toast.success(`用例 [${c.code}] 执行通过！`);
                                }, 400);
                              }}
                              className="h-6 w-6 text-slate-500 hover:text-blue-600 rounded"
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {c.boundApi && (
                          <div className="flex items-center gap-2 p-1.5 rounded bg-slate-50 border border-slate-100 text-[10px] font-mono">
                            <Badge variant="outline" className="text-[9px] border-blue-200 bg-blue-50 text-blue-700">
                              {c.boundApi.method}
                            </Badge>
                            <span className="text-slate-600 truncate">{c.boundApi.path}</span>
                          </div>
                        )}

                        <div className="space-y-1 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                          {c.steps.map((s, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <div><strong className="text-slate-700">步骤:</strong> {s.step}</div>
                              <div className="text-emerald-700 pl-4">➔ <strong>预期:</strong> {s.expected}</div>
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

          {/* ================= 3. 底部控制台与 AI 指挥台 (可收起/展开) ================= */}
          <div
            style={{ height: isConsoleOpen ? '180px' : '32px' }}
            className="shrink-0 bg-white border-t border-slate-200 flex flex-col z-20 transition-all duration-150 relative"
          >
            {/* 控制台标题栏与 Tab 切换 */}
            <div className="h-8 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setConsoleTab('ai');
                    setIsConsoleOpen(true);
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold pb-1 border-b-2 transition-colors ${
                    consoleTab === 'ai' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI 指挥台</span>
                </button>

                <button
                  onClick={() => {
                    setConsoleTab('terminal');
                    setIsConsoleOpen(true);
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold pb-1 border-b-2 transition-colors ${
                    consoleTab === 'terminal' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>执行日志</span>
                </button>

                <button
                  onClick={() => {
                    setConsoleTab('problems');
                    setIsConsoleOpen(true);
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold pb-1 border-b-2 transition-colors ${
                    consoleTab === 'problems' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>漏测诊断 ({globalStats.uncovered})</span>
                </button>
              </div>

              <button
                onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                {isConsoleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* 控制台内容区 */}
            {isConsoleOpen && (
              <div className="flex-1 flex flex-col min-h-0 bg-white p-2.5 text-xs overflow-hidden">
                {consoleTab === 'ai' && (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2">
                    {/* 快捷动作 */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendAiCommand('扫描当前 PRD 未定义的隐性资损暗坑')}
                        className="h-6 text-[11px] text-slate-700 border-slate-200 hover:bg-slate-50 gap-1 rounded-md"
                      >
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        <span>扫描暗坑</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendAiCommand('为当前章节一键补齐所有缺失用例')}
                        className="h-6 text-[11px] text-slate-700 border-slate-200 hover:bg-slate-50 gap-1 rounded-md"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>补齐漏测用例</span>
                      </Button>
                    </div>

                    {/* 指令输入栏 */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendAiCommand();
                      }}
                      className="flex items-center gap-2 shrink-0"
                    >
                      <Input
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder="向 AI 发送指令，如：补充并发防刷用例、增加异常断言..."
                        className="h-7 text-xs bg-slate-50 border-slate-200 text-slate-800 rounded-md focus-visible:ring-1 focus-visible:ring-blue-500"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!aiInput.trim() || isAiLoading}
                        className="h-7 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>发送</span>
                      </Button>
                    </form>

                    {/* 日志流 */}
                    <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-600">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">[{log.time}]</span>
                          <span className={`shrink-0 font-bold ${log.type === 'success' ? 'text-emerald-600' : 'text-blue-600'}`}>
                            [{log.tag}]
                          </span>
                          <span className={log.type === 'success' ? 'text-emerald-700' : 'text-slate-700'}>
                            {log.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {consoleTab === 'terminal' && (
                  <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-600">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-slate-400 shrink-0">[{log.time}]</span>
                        <span className={`shrink-0 font-bold ${log.type === 'success' ? 'text-emerald-600' : 'text-slate-600'}`}>
                          [{log.tag}]
                        </span>
                        <span className={log.type === 'success' ? 'text-emerald-700' : 'text-slate-700'}>
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {consoleTab === 'problems' && (
                  <div className="flex-1 overflow-y-auto space-y-1.5">
                    {docs.filter((d) => d.uncoveredCount > 0).map((d) => (
                      <div key={d.id} className="p-2 rounded-lg bg-amber-50/60 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>[{d.name}] 存在 {d.uncoveredCount} 处需求规则未被测试用例覆盖</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSendAiCommand(`为 [${d.name}] 补齐测试用例`)}
                          className="h-5 text-[10px] bg-amber-600 hover:bg-amber-500 text-white rounded px-2"
                        >
                          一键补齐
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
    </div>
  );
}
