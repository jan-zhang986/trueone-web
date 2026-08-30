import React, { useState, useMemo } from 'react';
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
  Copy,
  ChevronRight,
  Hash,
  Layers,
  ArrowRight,
  Clock,
  History,
  Boxes,
  Cpu,
  Lock,
  Eye,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

// 数据模型
export interface DocumentItem {
  id: string;
  number: string;
  name: string;
  coverage: number;
  uncoveredCount: number;
  content: string;
  reqItems: { reqId: string; title: string; text: string; isCovered: boolean }[];
}

export interface ScriptVersionSnapshot {
  version: string;
  timestamp: string;
  author: string;
  summary: string;
  code: string;
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
  scriptContent: string;
  scriptVersion: string;
  injectedGlobals: string[]; // 依赖注入的全局公共库列表
  historySnapshots: ScriptVersionSnapshot[]; // 历史快照版本
  lastExecutionTime?: string;
  executionDuration?: string;
}

export interface GlobalUtilityScript {
  id: string;
  name: string;
  description: string;
  language: string;
  code: string;
}

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'sandbox';
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
随着系统微服务演进，旧版登录模块存在以下痛点：
- 各端无法统一共享 Session 鉴权凭证；
- 缺少针对高危设备指纹和异地风险登录的主动拦截；
- 短信验证码服务缺少分布式防刷与频次控制。

#### 1.2 改造目标
1. 统一接入层鉴权协议，全面采用 **双 Token 架构 (Access Token 2小时 + Refresh Token 7天)**；
2. 支持 **7 天无感免密自动续期**；
3. 强化风控防御，接入分布式 IP 频次限制与密码阶梯锁定。`,
    reqItems: [
      { reqId: 'REQ-101', title: '双 Token 接入协议', text: '统一各端鉴权接入协议，采用双 Token (Access + Refresh) 架构。', isCovered: true },
      { reqId: 'REQ-102', title: '向下兼容平滑迁移', text: '支持旧版客户端向新协议无感平滑迁移。', isCovered: true },
    ],
  },
  {
    id: 'doc-2-1',
    number: '2.1',
    name: '2.1 账号密码登录规范',
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
      { reqId: 'REQ-211', title: '多格式账号支持', text: '账号支持手机号、邮箱、用户名三种输入格式，自动去首尾空格。', isCovered: true },
      { reqId: 'REQ-212', title: '密码加密传输', text: '密码输入需在前端完成 SHA-256 加密后再传输。', isCovered: true },
      { reqId: 'REQ-213', title: '7天无感免登', text: '勾选【记住我】，7 天内免重新输入密码无感登录。', isCovered: true },
    ],
  },
  {
    id: 'doc-2-2',
    number: '2.2',
    name: '2.2 手机验证码登录规范',
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
      { reqId: 'REQ-221', title: '发送验证码与倒计时', text: '输入合规手机号，点击发送验证码，启动 60 秒倒计时防重。', isCovered: true },
      { reqId: 'REQ-222', title: '验证码有效时长', text: '验证码为 6 位纯数字，有效时间为 5 分钟。', isCovered: true },
      { reqId: 'REQ-223', title: '未注册手机号自动建号', text: '未注册手机号首次通过验证码登录，系统自动创建基础账号。', isCovered: true },
      { reqId: 'REQ-224', title: '【⚠️ 未覆盖】单IP防刷限流', text: '系统需限制单 IP 单日短信发送上限 20 次，超出返回 429。', isCovered: false },
    ],
  },
];

// 1. 公共脚本工具库定义 (Global Fixtures & Utilities)
const INITIAL_GLOBAL_SCRIPTS: GlobalUtilityScript[] = [
  {
    id: 'util-crypto',
    name: 'crypto_util.py (动态加盐加密)',
    description: '提供标准的 SHA-256 + 动态 Salt 密码加密工具',
    language: 'python',
    code: `import hashlib\nimport time\n\ndef encrypt_pwd(raw_password: str, salt: str = "AEGIS_QA_2026") -> str:\n    """平台公共加解密工具，统一注入到用例 ctx 中"""\n    salted = f"{raw_password}_{salt}_{int(time.time() // 3600)}"\n    return hashlib.sha256(salted.encode()).hexdigest()`,
  },
  {
    id: 'util-auth',
    name: 'auth_fixtures.py (鉴权免登脚手架)',
    description: '提供自动生成和刷新 Admin/Test Token 的公共夹具',
    language: 'python',
    code: `def get_authenticated_headers(client, account="admin") -> dict:\n    """获取已鉴权 Header，避免每个脚本重复调用登录"""\n    token = client.cached_tokens.get(account, "Bearer mock_jwt_token_sample")\n    return {"Authorization": token, "X-Tenant-Id": "vanguard_main"}`,
  },
];

// 模拟用例（带历史版本快照与公共注入依赖）
const INITIAL_CASES: TestCaseItem[] = [
  {
    id: 'c-1',
    code: 'TC-AUTH-001',
    title: '正确颁发双 Token (Access 2h & Refresh 7d)',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-1',
    reqSource: 'REQ-101: 采用双 Token 架构',
    scriptLanguage: 'python',
    scriptVersion: 'v1.2',
    injectedGlobals: ['crypto_util', 'auth_fixtures'],
    executionDuration: '112ms',
    scriptContent: `# [TC-AUTH-001] 双 Token 颁发验证脚本
# 平台已安全注入公共依赖: ctx.encrypt_pwd(), auth_fixtures, client, redis

def run_test(client, redis, ctx):
    payload = {"account": "admin_user", "password": ctx.encrypt_pwd("Pass123!")}
    resp = client.post("/api/v1/auth/login", json=payload)
    
    assert resp.status_code == 200, f"接口异常: {resp.text}"
    data = resp.json().get("data", {})
    
    assert "accessToken" in data, "必须返回 accessToken"
    assert "refreshToken" in data, "必须返回 refreshToken"
    assert data.get("expiresIn") == 7200, "accessToken 有效期必须为 2 小时"
    
    return {"passed": True, "token": data["accessToken"][:12] + "..."}`,
    historySnapshots: [
      {
        version: 'v1.2',
        timestamp: '2026-08-27 14:15:30',
        author: '张建 (QA Lead)',
        summary: '优化 Token 过期时间为 7200s 精确断言',
        code: `# [TC-AUTH-001] 双 Token 颁发验证脚本\ndef run_test(client, redis, ctx):\n    payload = {"account": "admin_user", "password": ctx.encrypt_pwd("Pass123!")}\n    resp = client.post("/api/v1/auth/login", json=payload)\n    assert resp.status_code == 200\n    data = resp.json().get("data", {})\n    assert data.get("expiresIn") == 7200\n    return {"passed": True}`,
      },
      {
        version: 'v1.0',
        timestamp: '2026-08-27 10:00:12',
        author: 'AI Agent (Auto)',
        summary: '初始 AI 依据 PRD 自动生成',
        code: `# [TC-AUTH-001] 初始脚本\ndef run_test(client, redis, ctx):\n    resp = client.post("/api/v1/auth/login", json={"account": "admin"})\n    assert resp.status_code == 200`,
      },
    ],
  },
  {
    id: 'c-3',
    code: 'TC-SMS-001',
    title: '正常输入 11 位手机号 ➔ 下发 6 位验证码并进入倒计时',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-2-2',
    reqSource: 'REQ-221: 发送验证码与 60s 倒计时',
    scriptLanguage: 'python',
    scriptVersion: 'v1.0',
    injectedGlobals: ['crypto_util'],
    executionDuration: '142ms',
    scriptContent: `# [TC-SMS-001] 获取短信验证码正常流
# 平台已安全注入公共依赖: client, redis, ctx

def run_test(client, redis, ctx):
    phone = "13800138000"
    
    # 1. 发起短信下发请求
    resp = client.post("/api/v1/sms/send", json={"phone": phone, "scene": "login"})
    assert resp.status_code == 200, f"发送短信失败: {resp.text}"
    
    # 2. 从 Redis 检查 6 位纯数字验证码
    code = redis.get(f"sms:code:{phone}")
    assert code is not None, "Redis 中应缓存有验证码"
    assert len(code) == 6 and code.isdigit(), f"验证码格式不正确: {code}"
    
    return {"passed": True, "smsCode": code}`,
    historySnapshots: [
      {
        version: 'v1.0',
        timestamp: '2026-08-27 11:20:00',
        author: 'AI Agent (Auto)',
        summary: '初始 AI 根据 PRD 生成 Redis 校验流',
        code: `# [TC-SMS-001] 初始脚本`,
      },
    ],
  },
];

export function QaStudioIdeWorkspace({ onBack }: { onBack?: () => void }) {
  // 数据与状态
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [cases, setCases] = useState<TestCaseItem[]>(INITIAL_CASES);
  const [globalScripts, setGlobalScripts] = useState<GlobalUtilityScript[]>(INITIAL_GLOBAL_SCRIPTS);
  const [selectedDocId, setSelectedDocId] = useState<string>('doc-2-2');

  // 布局
  const [splitMode, setSplitMode] = useState<'split' | 'single'>('split');
  const [caseCodeBuffer, setCaseCodeBuffer] = useState<{ [key: string]: string }>({});

  // 模态弹窗控制
  const [globalScriptsDrawerOpen, setGlobalScriptsDrawerOpen] = useState(false);
  const [historyDrawerCaseId, setHistoryDrawerCaseId] = useState<string | null>(null);

  // 底部控制台
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', time: '14:20:00', type: 'info', tag: 'AegisQA', text: '质量工作台已就绪 · Runner 子进程沙箱保护已激活 (PID Isolation & 30s Timeout Guard)' },
    { id: 'l2', time: '14:20:02', type: 'warn', tag: 'RiskRadar', text: '章节 [2.2 手机验证码登录] 存在 1 处未覆盖的防刷资损规则 (REQ-224)' },
  ]);

  // 划词浮动气泡
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);

  // 当前选中的 PRD 文档
  const currentDoc = useMemo(() => {
    return docs.find((d) => d.id === selectedDocId) || docs[0];
  }, [docs, selectedDocId]);

  // 当前选中文档的用例
  const currentCases = useMemo(() => {
    return cases.filter((c) => c.docId === selectedDocId);
  }, [cases, selectedDocId]);

  // 查看历史快照的目标用例
  const historyTargetCase = useMemo(() => {
    return cases.find((c) => c.id === historyDrawerCaseId) || null;
  }, [cases, historyDrawerCaseId]);

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
      y: rect.top - 10,
    });
  };

  // 划词 ➔ AI 自动编写标准 Python 测试脚本
  const handleGenerateScript = (textToUse?: string) => {
    const targetText = textToUse || selectedText;
    if (!targetText) return;
    setSelectionPos(null);

    toast.info(`🤖 AI 正在为「${targetText.slice(0, 14)}...」编写独立测试脚本...`);

    setTimeout(() => {
      const generatedCode = `# [TC-AUTO-001] 溯源需求: REQ-224 单 IP 短信防刷限流
# 平台注入公共依赖: client, redis, ctx, crypto_util

def run_test(client, redis, ctx):
    """
    自动推导脚本: 校验 1 秒内高频连击触发 Redis 429 限流拦截
    """
    phone = "13800138999"
    # 1. 模拟连续并发请求 10 次
    responses = [client.post("/api/v1/sms/send", json={"phone": phone}) for _ in range(10)]
    
    # 2. 断言首个成功，后续 9 次被 429 限流拦截
    assert responses[0].status_code == 200, "首次发送应正常成功"
    for idx, resp in enumerate(responses[1:], start=2):
        assert resp.status_code == 429, f"第 {idx} 次请求应触发限流返回 429"
        
    return {"passed": True, "intercepted": 9}`;

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
        injectedGlobals: ['crypto_util'],
        scriptContent: generatedCode,
        historySnapshots: [
          {
            version: 'v1.0',
            timestamp: new Date().toLocaleDateString() + ' ' + new Date().toTimeString().slice(0, 8),
            author: 'AI Agent (Auto)',
            summary: '初始 AI 依据 PRD 规则自动生成',
            code: generatedCode,
          },
        ],
      };

      setCases((prev) => [...prev, newCase]);

      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'AICopilot',
          text: `✅ 已为 [REQ-224] 编写独立 Python 脚本 [${newCase.code}] (已生成 v1.0 初始快照)`,
        },
      ]);

      toast.success('AI 已成功生成独立测试脚本！');
    }, 800);
  };

  // 3. Runner 子进程沙箱隔离执行 (Subprocess Sandbox Execution)
  const handleDebugRun = (c: TestCaseItem) => {
    setIsConsoleOpen(true);
    const pid = Math.floor(Math.random() * 20000 + 40000);

    setLogs((prev) => [
      ...prev,
      {
        id: `sb-1`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'sandbox',
        tag: 'SandboxGuard',
        text: `🛡️ [1/4 启动沙箱子进程] Process Spawn PID=${pid}, 内存硬限制=256MB, 超时熔断=30s`,
      },
      {
        id: `sb-2`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'sandbox',
        tag: 'FixtureInject',
        text: `📦 [2/4 注入公共上下文] 成功注入公共库 [${c.injectedGlobals.join(', ')}] 与 client, redis 隔离沙箱环境`,
      },
    ]);

    setTimeout(() => {
      setCases((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, status: 'passed', lastExecutionTime: new Date().toTimeString().slice(0, 8), executionDuration: '118ms' } : item))
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
          id: `sb-3`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'SubprocessExec',
          text: `⚡ [3/4 执行输出] 用例 [${c.code}] 断言 100% 命中 (HTTP 200 / 429 拦截符合预期)，耗时 118ms`,
        },
        {
          id: `sb-4`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'sandbox',
          tag: 'SandboxClean',
          text: `🧹 [4/4 沙箱安全回收] 子进程 PID=${pid} 正常退出 (Exit Code 0)，0 内存残留泄漏`,
        },
      ]);
      toast.success(`用例 [${c.code}] 在子进程沙箱中执行通过！`);
    }, 600);
  };

  // 2. 保存代码并生成新的快照版本 (Script Snapshot)
  const handleSaveCode = (caseId: string) => {
    const updatedCode = caseCodeBuffer[caseId];
    const targetCase = cases.find((c) => c.id === caseId);
    if (!targetCase) return;

    const codeToSave = updatedCode !== undefined ? updatedCode : targetCase.scriptContent;
    const nextVerNum = (parseFloat(targetCase.scriptVersion.replace('v', '')) + 0.1).toFixed(1);
    const nextVer = `v${nextVerNum}`;

    const newSnapshot: ScriptVersionSnapshot = {
      version: nextVer,
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toTimeString().slice(0, 8),
      author: '张建 (QA Lead)',
      summary: `工程师手动更新代码，生成 ${nextVer} 快照`,
      code: codeToSave,
    };

    setCases((prev) =>
      prev.map((item) =>
        item.id === caseId
          ? {
              ...item,
              scriptContent: codeToSave,
              scriptVersion: nextVer,
              historySnapshots: [newSnapshot, ...item.historySnapshots],
            }
          : item
      )
    );

    toast.success(`脚本已保存入库，并自动生成快照版本 ${nextVer}！`);
  };

  // 2. 回滚到某个历史版本 (Rollback)
  const handleRollbackVersion = (caseId: string, snapshot: ScriptVersionSnapshot) => {
    setCases((prev) =>
      prev.map((item) =>
        item.id === caseId
          ? {
              ...item,
              scriptContent: snapshot.code,
              scriptVersion: `${snapshot.version}-rollback`,
            }
          : item
      )
    );
    setCaseCodeBuffer((prev) => ({ ...prev, [caseId]: snapshot.code }));
    setHistoryDrawerCaseId(null);
    toast.success(`已成功回滚到历史版本 ${snapshot.version}！`);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-800 overflow-hidden font-sans select-none antialiased">
      {/* ================= 1. 顶部 Header ================= */}
      <header className="h-13 shrink-0 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-blue-500/20">
              Q
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 tracking-tight">质量工作台</span>
                <span className="text-slate-300 text-xs">/</span>
                <span className="text-slate-600 text-xs font-medium">用户登录改造</span>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-700 font-medium">
                  Script Studio (Sandboxed)
                </Badge>
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* 全局需求覆盖率仪表 */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">需求覆盖率:</span>
              <span className="font-bold font-mono text-emerald-600 text-sm">{globalStats.rate}%</span>
              <span className="text-slate-400 text-[11px]">({globalStats.coveredReqs}/{globalStats.totalReqs})</span>
            </div>

            {globalStats.uncovered > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                {globalStats.uncovered} 处待补齐脚本
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                全部 100% 覆盖
              </span>
            )}
          </div>
        </div>

        {/* 顶部右侧：公共库管理 + 布局切换 */}
        <div className="flex items-center gap-2.5">
          {/* 1. 公共脚本库入口 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGlobalScriptsDrawerOpen(true)}
            className="h-8 text-xs text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg px-2.5 gap-1.5 font-medium"
          >
            <Boxes className="w-3.5 h-3.5 text-indigo-600" />
            <span>公共函数与依赖库 ({globalScripts.length})</span>
          </Button>

          {/* 分屏布局切换 */}
          <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/70">
            <button
              onClick={() => setSplitMode('split')}
              title="双屏并排 (左 PRD + 右脚本代码)"
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                splitMode === 'split'
                  ? 'bg-white text-slate-800 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>并排分屏</span>
            </button>
            <button
              onClick={() => setSplitMode('single')}
              title="单屏全屏聚焦"
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                splitMode === 'single'
                  ? 'bg-white text-slate-800 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
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
              className="h-8 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg px-3"
            >
              退出
            </Button>
          )}
        </div>
      </header>

      {/* ================= 2. 主工作区 ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 左栏：📑 资源大纲树 (支持 需求大纲 / 公共函数库 / 版本快照 自由切换) */}
        <div className="w-64 xl:w-72 shrink-0 bg-white border-r border-slate-200/70 flex flex-col min-h-0 z-10">
          {/* 左侧顶部分类 Tab */}
          <div className="h-10 px-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-1 w-full">
              <button
                onClick={() => setNavCategory('docs')}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  navCategory === 'docs'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>需求大纲</span>
              </button>

              <button
                onClick={() => setNavCategory('globals')}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  navCategory === 'globals'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                <span>公共函数库</span>
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1 rounded-full">{globalScripts.length}</span>
              </button>
            </div>
          </div>

          {/* 列表渲染区 */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {navCategory === 'docs' && (
              docs.map((doc) => {
                const isSelected = doc.id === currentDoc.id;
                const isFull = doc.coverage === 100;

                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`group cursor-pointer rounded-xl px-3 py-2.5 flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 text-blue-900 font-semibold border border-blue-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
                        : 'text-slate-600 hover:bg-slate-50/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="truncate">{doc.name}</span>
                    </div>

                    {isFull ? (
                      <span className="text-[10px] text-emerald-600 font-mono font-semibold shrink-0 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">
                        100%
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-mono font-bold shrink-0 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/50">
                        {doc.coverage}%
                      </span>
                    )}
                  </div>
                );
              })
            )}

            {navCategory === 'globals' && (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                  💡 <strong>公共函数与依赖</strong> 在沙箱运行时自动注入用例的 <code className="bg-indigo-100 px-1 py-0.5 rounded text-indigo-800 font-mono">ctx</code> 上下文中，所有用例共享，无需重复编写。
                </div>

                {globalScripts.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => setGlobalScriptsDrawerOpen(true)}
                    className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-all space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{g.name}</span>
                      </span>
                      <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200">
                        {g.language}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{g.description}</p>
                    <div className="pt-1 flex items-center justify-between text-[10px] text-indigo-600 font-medium">
                      <span>点击查看与在线编辑 ➔</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 中栏与右栏分屏工作区 */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* 中栏：📖 沉浸式 PRD 原文阅读 */}
          <div
            onMouseUp={handleMouseUp}
            className={`${
              splitMode === 'split' ? 'w-1/2 border-r border-slate-200/70' : 'w-full'
            } flex flex-col min-h-0 bg-white relative`}
          >
            <div className="h-9 px-5 bg-slate-50/60 border-b border-slate-200/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>{currentDoc.name}</span>
              </span>
              <span className="text-[11px] text-slate-400">划选任意段落可由 AI 直接编写脚本</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-700 text-xs leading-relaxed">
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/60 whitespace-pre-line leading-7 text-slate-800 text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                {currentDoc.content}
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>本篇章业务规则拆解 ({currentDoc.reqItems.length})</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    脚本覆盖率: {currentDoc.coverage}%
                  </span>
                </div>

                <div className="space-y-2">
                  {currentDoc.reqItems.map((r) => (
                    <div
                      key={r.reqId}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 text-xs ${
                        r.isCovered
                          ? 'bg-white border-slate-200/70 text-slate-700 shadow-sm'
                          : 'bg-amber-50/40 border-amber-200/80 text-amber-950 shadow-sm'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600 text-[11px] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/50">
                            {r.reqId}
                          </span>
                          <span className="font-semibold text-slate-900 text-xs">{r.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-1">{r.text}</p>
                      </div>

                      {r.isCovered ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 shrink-0 font-medium gap-1">
                          <Check className="w-2.5 h-2.5" /> 已覆脚本
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateScript(r.text)}
                          className="h-6 text-[11px] bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-2.5 rounded-lg shrink-0 gap-1 font-medium shadow-sm"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>AI 写脚本</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 划词浮动灵动岛 */}
            {selectionPos && selectedText && (
              <div
                style={{
                  position: 'fixed',
                  left: `${selectionPos.x}px`,
                  top: `${selectionPos.y}px`,
                  transform: 'translate(-50%, -100%)',
                }}
                className="z-50 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl shadow-xl shadow-slate-950/20 flex items-center gap-2 text-xs border border-slate-700/60 animate-in zoom-in-95 duration-150"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300 max-w-[140px] truncate text-[11px]">"{selectedText}"</span>
                <div className="h-3 w-px bg-slate-700" />
                <button
                  onClick={() => handleGenerateScript()}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2.5 py-0.5 rounded-md text-[11px] flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>生成独立脚本</span>
                </button>
              </div>
            )}
          </div>

          {/* 右栏：💻 用例与独立脚本 Studio */}
          {splitMode === 'split' && (
            <div className="w-1/2 flex flex-col min-h-0 bg-[#FAFAFC]">
              <div className="h-9 px-5 bg-white border-b border-slate-200/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>落地独立脚本 ({currentCases.length} 条)</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Serverless Micro-Scripts</span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {currentCases.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-300 rounded-2xl space-y-2 bg-white">
                    <AlertTriangle className="w-7 h-7 text-amber-500" />
                    <div className="text-xs font-bold text-slate-800">当前章节暂无落地脚本</div>
                    <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                      请在左侧 PRD 中划选文字，让 AI 自动编写独立、带断言的 Python 测试脚本
                    </p>
                  </div>
                ) : (
                  currentCases.map((c) => {
                    const code = caseCodeBuffer[c.id] !== undefined ? caseCodeBuffer[c.id] : c.scriptContent;

                    return (
                      <Card
                        key={c.id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow"
                      >
                        {/* 用例头部 */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-blue-600 font-bold text-xs bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                                {c.code}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200 text-slate-600">
                                {c.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-600 font-mono">
                                {c.scriptLanguage} · {c.scriptVersion}
                              </Badge>
                              <h4 className="font-bold text-slate-900 text-xs truncate">{c.title}</h4>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                              <div className="flex items-center gap-1 truncate">
                                <Link2 className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                <span>{c.reqSource}</span>
                              </div>

                              {/* 1. 注入的公共依赖标签 */}
                              {c.injectedGlobals.length > 0 && (
                                <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                  <Boxes className="w-2.5 h-2.5" />
                                  <span>注入: {c.injectedGlobals.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {c.status === 'passed' ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 gap-1 font-medium">
                                <Check className="w-2.5 h-2.5" /> PASS
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                                READY
                              </Badge>
                            )}

                            {/* 3. 调试运行 (触发沙箱) */}
                            <Button
                              size="sm"
                              onClick={() => handleDebugRun(c)}
                              className="h-7 text-[11px] bg-slate-900 hover:bg-slate-800 text-white px-3 rounded-lg gap-1 font-medium shadow-sm"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>沙箱调试</span>
                            </Button>
                          </div>
                        </div>

                        {/* 代码编辑器框 */}
                        <div className="rounded-xl bg-[#0F172A] border border-slate-800 overflow-hidden shadow-inner font-mono text-xs">
                          {/* 顶部工具栏 */}
                          <div className="h-7 px-3 bg-[#1E293B] border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Code2 className="w-3 h-3 text-cyan-400" />
                              <span className="font-semibold text-[10px] text-slate-300">script_content (平台大字段存储)</span>
                            </div>

                            <div className="flex items-center gap-3 text-[10px]">
                              {/* 2. 查看历史快照按钮 */}
                              <button
                                onClick={() => setHistoryDrawerCaseId(c.id)}
                                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
                              >
                                <History className="w-3 h-3 text-amber-400" />
                                <span>历史快照 ({c.historySnapshots.length})</span>
                              </button>

                              {c.executionDuration && (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>{c.executionDuration}</span>
                                </span>
                              )}

                              {/* 2. 保存新版本快照按钮 */}
                              <button
                                onClick={() => handleSaveCode(c.id)}
                                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30"
                              >
                                <Save className="w-3 h-3" />
                                <span>保存快照</span>
                              </button>
                            </div>
                          </div>

                          {/* 代码内容区域 */}
                          <div className="p-3">
                            <textarea
                              value={code}
                              onChange={(e) => {
                                setCaseCodeBuffer((prev) => ({ ...prev, [c.id]: e.target.value }));
                              }}
                              rows={8}
                              className="w-full bg-transparent text-[#E2E8F0] text-[11px] font-mono leading-5 outline-none resize-y selection:bg-blue-600 selection:text-white"
                              placeholder="在此编写或由 AI 自动生成 Python 测试脚本..."
                            />
                          </div>
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

      {/* ================= 3. 底部 Runner 子进程沙箱执行终端 ================= */}
      <div
        style={{ height: isConsoleOpen ? '160px' : '32px' }}
        className="shrink-0 bg-[#0B0F17] border-t border-slate-800/80 flex flex-col z-20 transition-all duration-150 relative text-slate-300"
      >
        <div className="h-8 bg-[#0F172A] border-b border-slate-800/80 px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">Runner Subprocess 隔离沙箱终端</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-medium">
              <Cpu className="w-3 h-3" /> 256MB Hard Limit · 30s Timeout Guard Active
            </span>
          </div>

          <button
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className="text-slate-400 hover:text-white p-0.5 rounded"
          >
            {isConsoleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isConsoleOpen && (
          <div className="flex-1 overflow-y-auto font-mono text-[11px] p-3 space-y-1 bg-[#0B0F17] text-slate-300">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-slate-600 shrink-0">[{log.time}]</span>
                <span
                  className={`shrink-0 font-bold ${
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'sandbox'
                      ? 'text-indigo-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  [{log.tag}]
                </span>
                <span
                  className={
                    log.type === 'success'
                      ? 'text-emerald-300'
                      : log.type === 'sandbox'
                      ? 'text-indigo-200'
                      : 'text-slate-200'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= 4. 模态抽屉 1: 🌐 公共脚本与依赖工具库 ================= */}
      {globalScriptsDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-[540px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">全局公共函数与夹具库 (Global Fixtures)</h3>
              </div>
              <button
                onClick={() => setGlobalScriptsDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              存放所有用例共享的加解密算法、Token 脚手架等公共逻辑，Runner 在沙箱执行时会自动将它们注入到用例的 `ctx` 上下文中，彻底消除代码重复（DRY 原则）。
            </p>

            <div className="flex-1 overflow-y-auto space-y-4">
              {globalScripts.map((g) => (
                <div key={g.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-indigo-950">{g.name}</span>
                    <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200">
                      {g.language}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">{g.description}</p>
                  <pre className="p-2.5 rounded-lg bg-[#0F172A] text-slate-200 text-[11px] font-mono overflow-x-auto leading-relaxed">
                    {g.code}
                  </pre>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGlobalScriptsDrawerOpen(false)}
                className="text-xs"
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. 模态抽屉 2: 🕒 脚本历史快照版本与一键回滚 ================= */}
      {historyDrawerCaseId && historyTargetCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-[600px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    [{historyTargetCase.code}] 脚本历史快照版本
                  </h3>
                  <span className="text-[11px] text-slate-400">支持对比与一键版本回滚 (Version Rollback)</span>
                </div>
              </div>
              <button
                onClick={() => setHistoryDrawerCaseId(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {historyTargetCase.historySnapshots.map((snap, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="font-mono text-xs bg-slate-900 text-white">{snap.version}</Badge>
                      <span className="text-xs font-semibold text-slate-800">{snap.summary}</span>
                    </div>

                    {/* 回滚按钮 */}
                    <Button
                      size="sm"
                      onClick={() => handleRollbackVersion(historyTargetCase.id, snap)}
                      className="h-6 text-[11px] bg-amber-600 hover:bg-amber-500 text-white rounded-md gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>回滚至此版本</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>提交人: {snap.author}</span>
                    <span>{snap.timestamp}</span>
                  </div>

                  <pre className="p-2.5 rounded-lg bg-[#0F172A] text-slate-200 text-[11px] font-mono overflow-x-auto leading-relaxed">
                    {snap.code}
                  </pre>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryDrawerCaseId(null)}
                className="text-xs"
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
