import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
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
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Code2,
  Save,
  RotateCcw,
  History,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// 数据模型
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
  scriptLanguage: 'python' | 'typescript';
  scriptContent: string; // 平台大字段保存的独立测试代码
  scriptVersion: string; // 如 v1.0
  lastExecutionTime?: string;
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

#### 2.2.3 异常与防刷限流 (重要漏洞点)
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

// 模拟用例（每条用例包含独立的 scriptContent 脚本大字段）
const INITIAL_CASES: TestCaseItem[] = [
  {
    id: 'c-1',
    code: 'TC-AUTH-001',
    title: '鉴权成功后正确颁发双 Token (Access & Refresh)',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-1',
    reqSource: 'REQ-101: 采用双 Token 架构',
    scriptLanguage: 'python',
    scriptVersion: 'v1.2',
    scriptContent: `# [TC-AUTH-001] 双 Token 颁发测试脚本
def run_test(client, redis, ctx):
    """
    测试目标: 校验鉴权成功后返回 accessToken (2h) 与 refreshToken (7d)
    """
    payload = {"account": "test_user", "password": ctx.encrypt_pwd("Valid123!")}
    resp = client.post("/api/v1/auth/login", json=payload)
    
    assert resp.status_code == 200, f"登录接口异常: {resp.text}"
    data = resp.json().get("data", {})
    
    assert "accessToken" in data, "返回体必须包含 accessToken"
    assert "refreshToken" in data, "返回体必须包含 refreshToken"
    assert data.get("expiresIn") == 7200, "accessToken 有效期应为 2 小时 (7200s)"
    
    return {"passed": True, "token": data["accessToken"][:10] + "..."}`,
  },
  {
    id: 'c-3',
    code: 'TC-SMS-001',
    title: '正常输入 11 位手机号 ➔ 下发验证码并倒计时',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-2-2',
    reqSource: 'REQ-221: 发送验证码与 60s 倒计时',
    scriptLanguage: 'python',
    scriptVersion: 'v1.0',
    scriptContent: `# [TC-SMS-001] 获取短信验证码正常流
def run_test(client, redis, ctx):
    phone = "13800138000"
    
    # 步骤 1: 触发获取短信验证码接口
    resp = client.post("/api/v1/sms/send", json={"phone": phone, "scene": "login"})
    assert resp.status_code == 200, f"发送短信失败: {resp.text}"
    
    # 步骤 2: 校验 Redis 中生成的 6 位验证码
    code = redis.get(f"sms:code:{phone}")
    assert code is not None, "Redis 中应缓存有验证码"
    assert len(code) == 6 and code.isdigit(), f"验证码格式错误: {code}"
    
    return {"passed": True, "smsCode": code}`,
  },
  {
    id: 'c-4',
    code: 'TC-SMS-002',
    title: '验证码过期 (>5分钟) 提交 ➔ 明确提示已失效',
    priority: 'P1',
    status: 'passed',
    docId: 'doc-2-2',
    reqSource: 'REQ-222: 验证码 5 分钟有效',
    scriptLanguage: 'python',
    scriptVersion: 'v1.0',
    scriptContent: `# [TC-SMS-002] 验证码超时失效校验
import time

def run_test(client, redis, ctx):
    phone = "13800138001"
    # 模拟写入一个 5 分钟前已过期的验证码
    redis.setex(f"sms:code:{phone}", 1, "888888")
    time.sleep(1.2) # 等待键过期
    
    resp = client.post("/api/v1/sms/verify", json={"phone": phone, "code": "888888"})
    assert resp.status_code == 400, "过期验证码应返回 400 校验失败"
    assert "已失效" in resp.json().get("message", ""), "错误提示语应包含'已失效'"
    
    return {"passed": True, "msg": "过期拦截符合预期"}`,
  },
];

export function QaStudioIdeWorkspace({ onBack }: { onBack?: () => void }) {
  // 导航大纲
  const [navCategory, setNavCategory] = useState<'docs' | 'cases'>('docs');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 布局模式
  const [splitMode, setSplitMode] = useState<'split' | 'single'>('split');

  // 数据状态
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [cases, setCases] = useState<TestCaseItem[]>(INITIAL_CASES);
  const [selectedDocId, setSelectedDocId] = useState<string>('doc-2-2');

  // 当前展开正在编辑代码的用例 ID
  const [editingCaseId, setEditingCaseId] = useState<string>('c-3');
  const [caseCodeBuffer, setCaseCodeBuffer] = useState<{ [key: string]: string }>({});

  // 底部控制台
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState<'terminal' | 'ai'>('terminal');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', time: '14:20:00', type: 'info', tag: 'AegisQA', text: '质量工作台已就绪，已加载 Serverless 脚本动态沙箱' },
    { id: 'l2', time: '14:20:02', type: 'warn', tag: 'RiskRadar', text: '章节 [2.2 手机验证码登录] 存在 1 处未覆盖的防刷资损规则 (REQ-224)' },
  ]);

  // 划词浮动胶囊
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);

  // 当前选中文档
  const currentDoc = useMemo(() => {
    return docs.find((d) => d.id === selectedDocId) || docs[0];
  }, [docs, selectedDocId]);

  // 当前文档下的用例
  const currentCases = useMemo(() => {
    return cases.filter((c) => c.docId === selectedDocId);
  }, [cases, selectedDocId]);

  // 覆盖率统计
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

  // 划选 PRD 文字 ➔ 由 AI 直接生成独立 Python 脚本用例
  const handleGenerateScriptFromSelection = () => {
    if (!selectedText) return;
    setSelectionPos(null);
    setIsAiLoading(true);

    toast.info(`🤖 AI 正在为「${selectedText.slice(0, 15)}...」编写独立 Python 测试脚本...`);

    setTimeout(() => {
      const generatedCode = `# [TC-AUTO-001] 溯源: ${selectedText.slice(0, 25)}
def run_test(client, redis, ctx):
    """
    自动推导脚本: 针对「${selectedText.slice(0, 20)}」的限流断言
    """
    phone = "13800138999"
    # 模拟 1 秒内发起高频请求
    responses = [client.post("/api/v1/sms/send", json={"phone": phone}) for _ in range(10)]
    
    # 断言首个成功，后续被 429 拦截
    assert responses[0].status_code == 200, "首次发送应正常成功"
    for idx, resp in enumerate(responses[1:], start=2):
        assert resp.status_code == 429, f"第 {idx} 次请求应触发限流返回 429"
        
    return {"passed": True, "interceptedCount": 9}`;

      const newCase: TestCaseItem = {
        id: `TC-${Date.now()}`,
        code: `TC-AUTO-001`,
        title: '高频并发连击请求 ➔ IP 与设备指纹限流拦截 (HTTP 429)',
        priority: 'P0',
        status: 'ready',
        docId: currentDoc.id,
        reqSource: 'REQ-224: 单 IP 短信防刷限流',
        scriptLanguage: 'python',
        scriptVersion: 'v1.0',
        scriptContent: generatedCode,
      };

      setCases((prev) => [...prev, newCase]);
      setEditingCaseId(newCase.id);

      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'AICopilot',
          text: `✅ 已为 PRD 规则生成独立 Python 脚本 [${newCase.code}]，已就绪可随时单点调试`,
        },
      ]);

      setIsAiLoading(false);
      toast.success('AI 已成功生成独立 Python 测试脚本！');
    }, 900);
  };

  // 单点调试运行某个脚本
  const handleDebugRunCase = (c: TestCaseItem) => {
    setIsConsoleOpen(true);
    setConsoleTab('terminal');
    const codeToRun = caseCodeBuffer[c.id] || c.scriptContent;

    setLogs((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'RunnerSandbox',
        text: `⚡ 下发用例 [${c.code}] 脚本至 Runner Python 隔离沙箱动态执行...`,
      },
    ]);

    setTimeout(() => {
      setCases((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, status: 'passed', lastExecutionTime: new Date().toTimeString().slice(0, 8) } : item))
      );

      // 如果跑的是 REQ-224，把当前文档覆盖率刷满 100%
      if (c.reqSource.includes('REQ-224')) {
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
      }

      setLogs((prev) => [
        ...prev,
        {
          id: `res-1`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'RunnerOutput',
          text: `[${c.code}] 执行通过: 断言全部命中 (HTTP 200 / 429 拦截符合预期)，耗时 128ms`,
        },
        {
          id: `res-2`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'AegisQA',
          text: `🎯 关联 PRD 规则 [${c.reqSource}] 状态回写为 100% 覆盖 🟢`,
        },
      ]);
      toast.success(`用例 [${c.code}] 脚本沙箱执行通过！`);
    }, 600);
  };

  // 保存脚本到平台大字段
  const handleSaveScript = (caseId: string) => {
    const updatedCode = caseCodeBuffer[caseId];
    if (!updatedCode) {
      toast.info('代码未发生改动');
      return;
    }

    setCases((prev) =>
      prev.map((item) =>
        item.id === caseId
          ? {
              ...item,
              scriptContent: updatedCode,
              scriptVersion: `v${(parseFloat(item.scriptVersion.replace('v', '')) + 0.1).toFixed(1)}`,
            }
          : item
      )
    );

    toast.success('脚本已保存至平台大字段 (script_content) 并生成新版本快照！');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 text-slate-800 overflow-hidden font-sans select-none">
      {/* ================= 1. 顶部 Header ================= */}
      <header className="h-12 shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              Q
            </div>
            <span className="font-bold text-sm text-slate-900">质量工作台</span>
            <span className="text-slate-400 text-xs font-mono">/ 用户登录改造 (Script-Driven Mode)</span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* 全局覆盖率 */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">PRD 覆盖率:</span>
              <span className="font-bold font-mono text-emerald-600">{globalStats.rate}%</span>
              <span className="text-slate-400 text-[11px]">({globalStats.coveredReqs}/{globalStats.totalReqs})</span>
            </div>

            {globalStats.uncovered > 0 && (
              <Badge variant="outline" className="h-5 text-[10px] text-amber-700 bg-amber-50 border-amber-200 font-medium">
                {globalStats.uncovered} 处待覆盖脚本
              </Badge>
            )}
          </div>
        </div>

        {/* 顶部右侧控制 */}
        <div className="flex items-center gap-2">
          {/* 分屏切换 */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setSplitMode('split')}
              title="双屏并排 (左 PRD + 右脚本代码)"
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                splitMode === 'split' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>并排分屏</span>
            </button>
            <button
              onClick={() => setSplitMode('single')}
              title="单屏全屏"
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                splitMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>单屏聚焦</span>
            </button>
          </div>

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

      {/* ================= 2. 主体工作区 ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 左侧活动栏 */}
        <div className="w-11 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-2 justify-between z-10">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                setNavCategory('docs');
                setIsSidebarCollapsed(false);
              }}
              title="需求文档目录"
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
              title="用例脚本库"
              className={`p-2 rounded-lg transition-colors ${
                navCategory === 'cases' && !isSidebarCollapsed
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

        {/* 侧栏大纲树 */}
        {!isSidebarCollapsed && (
          <div className="w-60 xl:w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-0 z-10 text-xs">
            <div className="h-8 px-3 border-b border-slate-100 flex items-center justify-between font-semibold text-slate-600 text-[11px]">
              <span>{navCategory === 'docs' ? '需求目录 (PAGEINDEX)' : '用例与脚本大纲'}</span>
              <button onClick={() => setIsSidebarCollapsed(true)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {docs.map((doc) => {
                const isSelected = doc.id === currentDoc.id;
                const isFull = doc.coverage === 100;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
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
          </div>
        )}

        {/* 主体分屏 */}
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
              <span className="text-[10px] text-slate-400">划选任意规则文字由 AI 自动编写脚本</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-700 text-xs leading-relaxed">
              {/* PRD 正文 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 whitespace-pre-line leading-6 text-slate-800">
                {currentDoc.content}
              </div>

              {/* 需求条目与脚本覆盖状态 */}
              <div className="space-y-2 pt-2">
                <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
                  <span>本节需求规则条目 ({currentDoc.reqItems.length})</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    脚本覆盖率: {currentDoc.coverage}%
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
                          已覆脚本
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedText(r.text);
                            handleGenerateScriptFromSelection();
                          }}
                          className="h-5 text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-2 rounded shrink-0 gap-1"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI 写脚本</span>
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
                <span className="text-slate-300 max-w-[140px] truncate">"{selectedText}"</span>
                <div className="h-3 w-px bg-slate-700" />
                <button
                  onClick={handleGenerateScriptFromSelection}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>AI 生成独立脚本</span>
                </button>
              </div>
            )}
          </div>

          {/* 右屏：用例独立脚本编辑器 (Case & Script Studio) */}
          {splitMode === 'split' && (
            <div className="w-1/2 flex flex-col min-h-0 bg-slate-50">
              <div className="h-8 px-4 bg-white border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
                <span className="font-semibold text-slate-800">
                  落地脚本列表 ({currentCases.length} 条)
                </span>
                <span className="text-[11px] text-emerald-600 font-medium font-mono">Serverless Micro-Scripts</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentCases.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-300 rounded-xl space-y-2 bg-white">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                    <div className="text-xs font-semibold text-slate-700">当前章节暂无脚本</div>
                    <p className="text-[11px] text-slate-400">
                      请划选左侧 PRD 文字，让 AI 自动为您编写独立的 Python 测试脚本
                    </p>
                  </div>
                ) : (
                  currentCases.map((c) => {
                    const isEditing = editingCaseId === c.id;
                    const code = caseCodeBuffer[c.id] !== undefined ? caseCodeBuffer[c.id] : c.scriptContent;

                    return (
                      <Card
                        key={c.id}
                        className={`rounded-xl border transition-all ${
                          isEditing
                            ? 'border-blue-300 bg-white ring-1 ring-blue-100 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        } p-3.5 space-y-3`}
                      >
                        {/* 头部元数据 */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-blue-600 font-bold text-xs">{c.code}</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200 text-slate-600">
                                {c.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-600 font-mono">
                                {c.scriptLanguage} · {c.scriptVersion}
                              </Badge>
                              <span className="font-semibold text-slate-800 truncate text-xs">{c.title}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Link2 className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                              <span>{c.reqSource}</span>
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

                            {/* 调试执行按钮 */}
                            <Button
                              size="sm"
                              onClick={() => handleDebugRunCase(c)}
                              className="h-6 text-[11px] bg-slate-900 hover:bg-slate-800 text-white px-2.5 rounded gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>调试运行</span>
                            </Button>
                          </div>
                        </div>

                        {/* 脚本代码编辑器区域 (平台大字段直显) */}
                        <div className="space-y-1.5 rounded-lg bg-slate-900 p-2.5 text-slate-100 font-mono text-xs">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] text-slate-400">
                            <div className="flex items-center gap-2">
                              <Code2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>script_content (大字段独立脚本)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSaveScript(c.id)}
                                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[10px] font-semibold"
                              >
                                <Save className="w-3 h-3" />
                                <span>保存代码</span>
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={code}
                            onChange={(e) => {
                              setCaseCodeBuffer((prev) => ({ ...prev, [c.id]: e.target.value }));
                            }}
                            rows={8}
                            className="w-full bg-transparent text-slate-200 text-[11px] font-mono leading-5 outline-none resize-y"
                            placeholder="在这里编写或由 AI 生成 Python 测试脚本..."
                          />
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= 3. 底部 Runner 沙箱执行终端 (Console) ================= */}
      <div
        style={{ height: isConsoleOpen ? '160px' : '30px' }}
        className="shrink-0 bg-white border-t border-slate-200 flex flex-col z-20 transition-all duration-150 relative"
      >
        <div className="h-7 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setConsoleTab('terminal');
                setIsConsoleOpen(true);
              }}
              className={`flex items-center gap-1 text-xs font-semibold pb-0.5 border-b-2 transition-colors ${
                consoleTab === 'terminal' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>Runner 脚本执行终端 (Live Streaming)</span>
            </button>
          </div>

          <button
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            {isConsoleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isConsoleOpen && (
          <div className="flex-1 overflow-y-auto font-mono text-[11px] p-2 space-y-1 bg-slate-950 text-slate-300">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                <span
                  className={`shrink-0 font-bold ${
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  [{log.tag}]
                </span>
                <span className={log.type === 'success' ? 'text-emerald-300' : 'text-slate-200'}>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
