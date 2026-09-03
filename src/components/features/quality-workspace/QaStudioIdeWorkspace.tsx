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
  GitBranch,
  GitCommit,
  CheckCheck,
  ExternalLink,
  SplitSquareVertical,
  ListOrdered,
  FileCode2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

// ================= 数据模型 (Unified Test Case) =================

export interface DocumentItem {
  id: string;
  number: string;
  name: string;
  coverage: number;
  uncoveredCount: number;
  content: string;
  reqItems: { reqId: string; title: string; text: string; isCovered: boolean }[];
}

export interface TestCaseStep {
  stepNumber: number;
  name: string;
  expected: string;
  status: 'ready' | 'running' | 'passed' | 'failed';
  durationMs?: number;
}

export interface UnifiedTestCaseItem {
  id: string;
  code: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'passed' | 'failed' | 'ready';
  docId: string;
  reqSource: string;
  // 1. 业务设计层 (Design Spec: 面向业务/产品/评审)
  design: {
    precondition: string;
    steps: TestCaseStep[];
  };
  // 2. 代码实现层 (Implementation: 面向代码大仓/Git/原生测试工程)
  implementation: {
    gitRepo: string;
    gitBranch: string;
    gitFilePath: string;
    functionName: string;
    scriptLanguage: 'python' | 'typescript';
    codeContent: string;
    lastCommitHash?: string;
    lastCommitTime?: string;
  };
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
  type: 'info' | 'success' | 'warn' | 'error' | 'step';
  tag: string;
  text: string;
}

// 模拟文档大纲 (PageIndex)
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

// 模拟初始统一用例
const INITIAL_UNIFIED_CASES: UnifiedTestCaseItem[] = [
  {
    id: 'c-1',
    code: 'TC-AUTH-001',
    title: '正确颁发双 Token (Access 2h & Refresh 7d)',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-1',
    reqSource: 'REQ-101: 采用双 Token 架构',
    design: {
      precondition: '测试账号 admin_user 处于启用状态，密码未被风控锁定',
      steps: [
        {
          stepNumber: 1,
          name: '携带动态加盐密码发起用户密码登录请求',
          expected: '服务端校验成功，HTTP 状态码返回 200',
          status: 'passed',
          durationMs: 45,
        },
        {
          stepNumber: 2,
          name: '断言返回体必须同时包含 accessToken 与 refreshToken',
          expected: 'accessToken 有效期为 7200s (2小时)，refreshToken 为 7 天',
          status: 'passed',
          durationMs: 12,
        },
      ],
    },
    implementation: {
      gitRepo: 'gitlab.company.com/qa/auth-tests.git',
      gitBranch: 'main',
      gitFilePath: 'tests/auth/test_login.py',
      functionName: 'test_token_issuance',
      scriptLanguage: 'python',
      lastCommitHash: '8e2a1b9',
      lastCommitTime: '10 分钟前',
      codeContent: `# tests/auth/test_login.py
import pytest
from aegis import aegis
from common.crypto import encrypt_pwd

@aegis.feature("用户鉴权体系")
@aegis.case(
    id="TC-AUTH-001",
    req="REQ-101",
    title="正确颁发双 Token (Access 2h & Refresh 7d)",
    priority="P0"
)
def test_token_issuance(api_client):
    with aegis.step("步骤 1: 携带动态加盐密码发起登录"):
        payload = {"account": "admin_user", "password": encrypt_pwd("Pass123!")}
        resp = api_client.post("/api/v1/auth/login", json=payload)
        assert resp.status_code == 200, f"登录失败: {resp.text}"
    
    with aegis.step("步骤 2: 校验双 Token 及其有效期"):
        data = resp.json().get("data", {})
        assert "accessToken" in data, "必须包含 accessToken"
        assert "refreshToken" in data, "必须包含 refreshToken"
        assert data.get("expiresIn") == 7200, "accessToken 有效期必须为 7200 秒"`,
    },
    lastExecutionTime: '14:20:10',
    executionDuration: '57ms',
  },
  {
    id: 'c-3',
    code: 'TC-SMS-001',
    title: '正常输入 11 位手机号 ➔ 下发 6 位验证码并进入 60 秒倒计时',
    priority: 'P0',
    status: 'passed',
    docId: 'doc-2-2',
    reqSource: 'REQ-221: 发送验证码与 60s 倒计时',
    design: {
      precondition: '目标手机号处于正常通信状态，Redis 验证码键不存在残留',
      steps: [
        {
          stepNumber: 1,
          name: '调用短信网关获取验证码接口 (/api/v1/sms/send)',
          expected: '接口返回 HTTP 200，并进入 60s 倒计时防重锁定',
          status: 'passed',
          durationMs: 38,
        },
        {
          stepNumber: 2,
          name: '从 Redis 读取该手机号验证码缓存并校验格式',
          expected: 'Redis 键存在，且内容为 6 位纯数字',
          status: 'passed',
          durationMs: 16,
        },
      ],
    },
    implementation: {
      gitRepo: 'gitlab.company.com/qa/auth-tests.git',
      gitBranch: 'main',
      gitFilePath: 'tests/auth/test_sms_login.py',
      functionName: 'test_sms_normal_flow',
      scriptLanguage: 'python',
      lastCommitHash: '4f9c2d1',
      lastCommitTime: '2 小时前',
      codeContent: `# tests/auth/test_sms_login.py
import pytest
from aegis import aegis

@aegis.feature("手机短信登录")
@aegis.case(
    id="TC-SMS-001",
    req="REQ-221",
    title="正常下发验证码与倒计时校验",
    priority="P0"
)
def test_sms_normal_flow(api_client, redis_client):
    phone = "13800138000"
    
    with aegis.step("步骤 1: 调用短信发送接口"):
        resp = api_client.post("/api/v1/sms/send", json={"phone": phone, "scene": "login"})
        assert resp.status_code == 200, f"发送短信失败: {resp.text}"
        
    with aegis.step("步骤 2: 校验 Redis 6位数字验证码"):
        code = redis_client.get(f"sms:code:{phone}")
        assert code is not None, "Redis 必须缓存有验证码"
        assert len(code) == 6 and code.isdigit(), f"验证码格式错误: {code}"`,
    },
    lastExecutionTime: '14:22:05',
    executionDuration: '54ms',
  },
];

export function QaStudioIdeWorkspace({ onBack }: { onBack?: () => void }) {
  // 左侧导航分类
  const [navCategory, setNavCategory] = useState<'docs' | 'repo'>('docs');

  // 当前激活的 Git 分支
  const [activeBranch, setActiveBranch] = useState<string>('main');

  // 用例视图展现模式: unified (双面统一) | design (纯业务步骤) | code (纯代码)
  const [caseViewMode, setCaseViewMode] = useState<'unified' | 'design' | 'code'>('unified');

  // 展开代码抽屉的用例 ID 集合 (在 unified 模式下控制折叠展开)
  const [expandedCodeCaseIds, setExpandedCodeCaseIds] = useState<{ [key: string]: boolean }>({
    'c-1': false,
    'c-3': true,
  });

  // 页面分屏布局
  const [splitMode, setSplitMode] = useState<'split' | 'single'>('split');

  // 数据集
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [cases, setCases] = useState<UnifiedTestCaseItem[]>(INITIAL_UNIFIED_CASES);
  const [selectedDocId, setSelectedDocId] = useState<string>('doc-2-2');

  // 代码编辑缓冲区 (用于在网页上直接修改代码并准备 Commit)
  const [codeEditBuffer, setCodeEditBuffer] = useState<{ [key: string]: string }>({});

  // 底部控制台
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', time: '14:20:00', type: 'info', tag: 'AegisTestOps', text: 'Git 统一用例工作空间已挂载: gitlab.company.com/qa/auth-tests.git (branch: main)' },
    { id: 'l2', time: '14:20:02', type: 'warn', tag: 'RiskRadar', text: '检测到 PRD 第 2.2 节存在未覆盖的资损规则: [REQ-224] 单 IP 短信防刷限流' },
  ]);

  // 划词气泡
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);

  // 当前选中文档
  const currentDoc = useMemo(() => {
    return docs.find((d) => d.id === selectedDocId) || docs[0];
  }, [docs, selectedDocId]);

  // 当前文档对应的统一用例
  const currentCases = useMemo(() => {
    return cases.filter((c) => c.docId === selectedDocId);
  }, [cases, selectedDocId]);

  // 统计指标
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

  // 划词捕获
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

  // 划选 PRD ➔ AI 自动生成标准统一用例 (业务设计面 + 代码实现面 1:1 对齐)
  const handleGenerateUnifiedCase = (textToUse?: string) => {
    const targetText = textToUse || selectedText;
    if (!targetText) return;
    setSelectionPos(null);

    toast.info(`🤖 AI 正在为「${targetText.slice(0, 14)}...」推导统一用例与 Python 测试脚本...`);

    setTimeout(() => {
      const generatedCode = `# tests/auth/test_sms_rate_limit.py
import pytest
from aegis import aegis

@aegis.feature("手机短信登录")
@aegis.case(
    id="TC-AUTO-001",
    req="REQ-224",
    title="高频并发连击请求 ➔ 触发 429 防刷限流",
    priority="P0",
    tags=["security", "risk-control"]
)
def test_sms_rate_limit(api_client, redis_client):
    """
    [用例说明] 验证单 IP 单日超过 20 次上限触发 429 防刷限流
    """
    phone = "13800138999"
    
    with aegis.step("步骤 1: 1秒内连续并发调用 10 次短信接口"):
        responses = [api_client.post("/api/v1/sms/send", json={"phone": phone}) for _ in range(10)]
        
    with aegis.step("步骤 2: 校验首个请求成功返回 200"):
        assert responses[0].status_code == 200, "首个请求应返回 200"
        
    with aegis.step("步骤 3: 校验后续请求被 429 限流拦截"):
        assert all(r.status_code == 429 for r in responses[1:]), "高频请求应全部被拦截返回 429"`;

      const newCase: UnifiedTestCaseItem = {
        id: `TC-${Date.now()}`,
        code: 'TC-AUTO-001',
        title: '高频并发连击请求 ➔ 触发 429 防刷限流拦截',
        priority: 'P0',
        status: 'ready',
        docId: currentDoc.id,
        reqSource: 'REQ-224: 单 IP 短信防刷限流',
        design: {
          precondition: '当前 IP 未在黑名单中，白名单豁免未开启',
          steps: [
            {
              stepNumber: 1,
              name: '1秒内连续并发调用 10 次短信接口',
              expected: '网络请求并发到达服务端',
              status: 'ready',
            },
            {
              stepNumber: 2,
              name: '校验首个请求成功返回 200',
              expected: '第一笔请求正常下发，启动 60s 锁定期',
              status: 'ready',
            },
            {
              stepNumber: 3,
              name: '校验后续请求被 429 限流拦截',
              expected: '从第 2 次并发开始触发限流策略，HTTP 状态码全部返回 429',
              status: 'ready',
            },
          ],
        },
        implementation: {
          gitRepo: 'gitlab.company.com/qa/auth-tests.git',
          gitBranch: activeBranch,
          gitFilePath: 'tests/auth/test_sms_rate_limit.py',
          functionName: 'test_sms_rate_limit',
          scriptLanguage: 'python',
          lastCommitHash: '未提交 (本地草稿)',
          lastCommitTime: '刚刚',
          codeContent: generatedCode,
        },
      };

      setCases((prev) => [...prev, newCase]);
      setExpandedCodeCaseIds((prev) => ({ ...prev, [newCase.id]: true }));

      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'AICopilot',
          text: `✨ AI 已为 [REQ-224] 自动生成统一用例 [${newCase.code}]，业务步骤与 Python 代码已 1:1 对齐`,
        },
      ]);

      toast.success('AI 已成功生成统一用例 (业务设计与代码一体化)！');
    }, 750);
  };

  // 提交代码到 Git 仓库分支
  const handleCommitToGit = (caseItem: UnifiedTestCaseItem) => {
    const updatedCode = codeEditBuffer[caseItem.id] || caseItem.implementation.codeContent;
    const fakeCommitHash = Math.random().toString(16).substring(2, 9);

    setCases((prev) =>
      prev.map((item) =>
        item.id === caseItem.id
          ? {
              ...item,
              implementation: {
                ...item.implementation,
                codeContent: updatedCode,
                lastCommitHash: fakeCommitHash,
                lastCommitTime: '刚刚',
              },
            }
          : item
      )
    );

    setLogs((prev) => [
      ...prev,
      {
        id: `git-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'GitLabAPI',
        text: `🚀 [Git Commit] 成功推送代码变更到 ${caseItem.implementation.gitBranch} (${fakeCommitHash}): ${caseItem.implementation.gitFilePath}`,
      },
    ]);

    toast.success(`已提交至 Git 分支 (${fakeCommitHash})！`);
  };

  // 动态逐步调试执行 (模拟原生测试容器逐步捕获 aegis.step)
  const handleExecuteCase = (caseItem: UnifiedTestCaseItem) => {
    setIsConsoleOpen(true);
    toast.info(`正在执行用例 [${caseItem.code}]...`);

    // 设置初始执行中状态
    setCases((prev) =>
      prev.map((item) =>
        item.id === caseItem.id
          ? {
              ...item,
              status: 'ready',
              design: {
                ...item.design,
                steps: item.design.steps.map((s, idx) => (idx === 0 ? { ...s, status: 'running' } : s)),
              },
            }
          : item
      )
    );

    setLogs((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'TestWorker',
        text: `⚡ 执行测试工程用例: pytest ${caseItem.implementation.gitFilePath}::${caseItem.implementation.functionName}`,
      },
    ]);

    // 逐步推进步骤 1 -> 步骤 2 -> 步骤 3
    setTimeout(() => {
      // Step 1 完成
      setCases((prev) =>
        prev.map((item) => {
          if (item.id !== caseItem.id) return item;
          const updated = [...item.design.steps];
          if (updated[0]) updated[0] = { ...updated[0], status: 'passed', durationMs: 28 };
          if (updated[1]) updated[1] = { ...updated[1], status: 'running' };
          return { ...item, design: { ...item.design, steps: updated } };
        })
      );
      setLogs((prev) => [
        ...prev,
        {
          id: `st-1`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'step',
          tag: 'aegis.step',
          text: `[${caseItem.code}] ✔ 步骤 1: ${caseItem.design.steps[0]?.name} (PASSED 28ms)`,
        },
      ]);
    }, 280);

    setTimeout(() => {
      // Step 2 完成
      setCases((prev) =>
        prev.map((item) => {
          if (item.id !== caseItem.id) return item;
          const updated = [...item.design.steps];
          if (updated[1]) updated[1] = { ...updated[1], status: 'passed', durationMs: 14 };
          if (updated[2]) updated[2] = { ...updated[2], status: 'running' };
          return { ...item, design: { ...item.design, steps: updated } };
        })
      );
      setLogs((prev) => [
        ...prev,
        {
          id: `st-2`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'step',
          tag: 'aegis.step',
          text: `[${caseItem.code}] ✔ 步骤 2: ${caseItem.design.steps[1]?.name || '校验状态码'} (PASSED 14ms)`,
        },
      ]);
    }, 520);

    setTimeout(() => {
      // 全步骤完成并点亮覆盖率
      setCases((prev) =>
        prev.map((item) => {
          if (item.id !== caseItem.id) return item;
          return {
            ...item,
            status: 'passed',
            lastExecutionTime: new Date().toTimeString().slice(0, 8),
            executionDuration: '64ms',
            design: {
              ...item.design,
              steps: item.design.steps.map((s) => ({ ...s, status: 'passed', durationMs: s.durationMs || 22 })),
            },
          };
        })
      );

      if (caseItem.reqSource.includes('REQ-224')) {
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
          id: `st-3`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'TestReport',
          text: `🎯 [${caseItem.code}] 全部步骤执行通过 (总耗时 64ms)，关联需求 [${caseItem.reqSource}] 状态回写为 100% 覆盖 🟢`,
        },
      ]);
      toast.success(`用例 [${caseItem.code}] 执行通过！`);
    }, 800);
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
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.2 border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold gap-1">
                  <GitBranch className="w-2.5 h-2.5" />
                  <span>{activeBranch}</span>
                </Badge>
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* 全局需求覆盖率 */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">PRD 覆盖率:</span>
              <span className="font-bold font-mono text-emerald-600 text-sm">{globalStats.rate}%</span>
              <span className="text-slate-400 text-[11px]">({globalStats.coveredReqs}/{globalStats.totalReqs})</span>
            </div>

            {globalStats.uncovered > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                {globalStats.uncovered} 处待覆盖用例
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                全部 100% 覆盖
              </span>
            )}
          </div>
        </div>

        {/* 顶部右侧：视图模式切换 + 分屏布局 */}
        <div className="flex items-center gap-3">
          {/* 统一用例展现视图切换 */}
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 text-xs font-medium">
            <button
              onClick={() => setCaseViewMode('unified')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                caseViewMode === 'unified'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5 text-blue-600" />
              <span>统一双面视图</span>
            </button>
            <button
              onClick={() => setCaseViewMode('design')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                caseViewMode === 'design'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
              <span>业务步骤</span>
            </button>
            <button
              onClick={() => setCaseViewMode('code')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                caseViewMode === 'code'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>代码实现</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* 分屏布局 */}
          <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/70">
            <button
              onClick={() => setSplitMode('split')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                splitMode === 'split' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>并排分屏</span>
            </button>
            <button
              onClick={() => setSplitMode('single')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                splitMode === 'single' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>单屏</span>
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
        {/* 左栏：📑 PageIndex 需求大纲 */}
        <div className="w-64 xl:w-72 shrink-0 bg-white border-r border-slate-200/70 flex flex-col min-h-0 z-10">
          <div className="h-10 px-4 border-b border-slate-100 flex items-center justify-between font-semibold text-slate-600 text-xs bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-blue-600" />
              <span>PageIndex 需求大纲</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {docs.map((doc) => {
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
            })}
          </div>
        </div>

        {/* 中栏与右栏分屏工作区 */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* 中栏：📖 沉浸式 PRD 正文阅读 */}
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
              <span className="text-[11px] text-slate-400">划选规则段落 ➔ AI 自动生成统一用例</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-700 text-xs leading-relaxed">
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/60 whitespace-pre-line leading-7 text-slate-800 text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                {currentDoc.content}
              </div>

              {/* 需求规则列表 */}
              <div className="space-y-2.5 pt-2">
                <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>需求规则条目 ({currentDoc.reqItems.length})</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    覆盖率: {currentDoc.coverage}%
                  </span>
                </div>

                <div className="space-y-2">
                  {currentDoc.reqItems.map((r) => (
                    <div
                      key={r.reqId}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 text-xs ${
                        r.isCovered
                          ? 'bg-white border-slate-200/70 text-slate-700 shadow-2xs'
                          : 'bg-amber-50/40 border-amber-200/80 text-amber-950 shadow-2xs'
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
                          <Check className="w-2.5 h-2.5" /> 已有统一用例
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateUnifiedCase(r.text)}
                          className="h-6 text-[11px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-2.5 rounded-lg shrink-0 gap-1 font-medium shadow-sm"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>AI 生成统一用例</span>
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
                  onClick={() => handleGenerateUnifiedCase()}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2.5 py-0.5 rounded-md text-[11px] flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>生成统一用例 (代码+步骤)</span>
                </button>
              </div>
            )}
          </div>

          {/* 右栏：🎯 统一用例 Studio (业务设计面 + 代码实现面 统一卡片) */}
          {splitMode === 'split' && (
            <div className="w-1/2 flex flex-col min-h-0 bg-[#FAFAFC]">
              <div className="h-9 px-5 bg-white border-b border-slate-200/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>统一用例资产 ({currentCases.length} 条)</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Git-Backed · Single Source of Truth
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {currentCases.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-300 rounded-2xl space-y-2 bg-white">
                    <AlertTriangle className="w-7 h-7 text-amber-500" />
                    <div className="text-xs font-bold text-slate-800">当前篇章暂无用例</div>
                    <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                      请在左侧 PRD 中划选文字，让 AI 自动生成统一用例（业务设计步骤 + 原生 Python 代码）
                    </p>
                  </div>
                ) : (
                  currentCases.map((c) => {
                    const isCodeExpanded = expandedCodeCaseIds[c.id] ?? false;
                    const code = codeEditBuffer[c.id] !== undefined ? codeEditBuffer[c.id] : c.implementation.codeContent;

                    return (
                      <Card
                        key={c.id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow"
                      >
                        {/* 1. 卡片头部元数据 */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-blue-600 font-bold text-xs bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                                {c.code}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200 text-slate-600 font-bold">
                                {c.priority}
                              </Badge>
                              <h4 className="font-bold text-slate-900 text-xs truncate">{c.title}</h4>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                              <div className="flex items-center gap-1 truncate text-blue-600">
                                <Link2 className="w-2.5 h-2.5 shrink-0" />
                                <span>{c.reqSource}</span>
                              </div>

                              <span className="text-slate-300">|</span>

                              <div className="flex items-center gap-1 truncate text-slate-500">
                                <GitBranch className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                <span>{c.implementation.gitFilePath}</span>
                              </div>
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

                            {/* 调试运行 */}
                            <Button
                              size="sm"
                              onClick={() => handleExecuteCase(c)}
                              className="h-7 text-[11px] bg-slate-900 hover:bg-slate-800 text-white px-3 rounded-lg gap-1.5 font-medium shadow-sm"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>调试运行</span>
                            </Button>
                          </div>
                        </div>

                        {/* 2. 业务设计面 (Design View: 步骤列表) - 业务人员/评审默认看这里 */}
                        {(caseViewMode === 'unified' || caseViewMode === 'design') && (
                          <div className="space-y-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
                                <span>业务测试步骤 (Design Steps)</span>
                              </span>
                              <span className="text-[10px] font-normal text-slate-400">
                                前置: {c.design.precondition}
                              </span>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              {c.design.steps.map((step) => (
                                <div
                                  key={step.stepNumber}
                                  className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-start justify-between gap-2 shadow-2xs"
                                >
                                  <div className="flex items-start gap-2 min-w-0">
                                    <span className="h-4 w-4 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
                                      {step.stepNumber}
                                    </span>
                                    <div className="space-y-0.5 min-w-0">
                                      <p className="text-[11px] font-medium text-slate-800 truncate">{step.name}</p>
                                      <p className="text-[10px] text-slate-400 truncate">预期: {step.expected}</p>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex items-center gap-1">
                                    {step.status === 'running' ? (
                                      <span className="text-[10px] text-blue-600 font-mono animate-pulse">执行中...</span>
                                    ) : step.status === 'passed' ? (
                                      <span className="text-[10px] text-emerald-600 font-mono font-semibold flex items-center gap-0.5">
                                        <Check className="w-3 h-3" />
                                        <span>{step.durationMs ? `${step.durationMs}ms` : 'PASS'}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-300 font-mono">待执行</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. 代码实现面 (Implementation View: 折叠/展开 Monaco 代码块) */}
                        {(caseViewMode === 'unified' || caseViewMode === 'code') && (
                          <div>
                            {caseViewMode === 'unified' && (
                              <div className="flex items-center justify-between pt-1">
                                <button
                                  onClick={() =>
                                    setExpandedCodeCaseIds((prev) => ({ ...prev, [c.id]: !isCodeExpanded }))
                                  }
                                  className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-[11px] font-semibold"
                                >
                                  <Code2 className="w-3.5 h-3.5" />
                                  <span>{isCodeExpanded ? '折叠 Python 测试代码' : '展开 Python 测试代码 (@aegis SDK)'}</span>
                                  {isCodeExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>

                                <div className="text-[10px] text-slate-400 font-mono">
                                  Git Commit: {c.implementation.lastCommitHash} ({c.implementation.lastCommitTime})
                                </div>
                              </div>
                            )}

                            {(caseViewMode === 'code' || isCodeExpanded) && (
                              <div className="mt-2 rounded-xl bg-[#0F172A] border border-slate-800 overflow-hidden shadow-inner font-mono text-xs">
                                {/* 代码框顶部状态条 */}
                                <div className="h-7 px-3 bg-[#1E293B] border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                  <div className="flex items-center gap-2 text-slate-300">
                                    <FileCode2 className="w-3 h-3 text-cyan-400" />
                                    <span className="font-semibold text-[10px] text-slate-300 truncate max-w-[200px]">
                                      {c.implementation.gitFilePath}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-[10px]">
                                    {c.executionDuration && (
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5 text-emerald-400" />
                                        <span>{c.executionDuration}</span>
                                      </span>
                                    )}

                                    {/* 提交至 Git 按钮 */}
                                    <button
                                      onClick={() => handleCommitToGit(c)}
                                      className="text-indigo-300 hover:text-white flex items-center gap-1 font-semibold transition-colors bg-indigo-900/60 px-2.5 py-0.5 rounded border border-indigo-500/40"
                                    >
                                      <GitCommit className="w-3 h-3 text-cyan-400" />
                                      <span>Commit 到 Git</span>
                                    </button>
                                  </div>
                                </div>

                                {/* 代码内容区域 */}
                                <div className="p-3">
                                  <textarea
                                    value={code}
                                    onChange={(e) => {
                                      setCodeEditBuffer((prev) => ({ ...prev, [c.id]: e.target.value }));
                                    }}
                                    rows={9}
                                    className="w-full bg-transparent text-[#E2E8F0] text-[11px] font-mono leading-5 outline-none resize-y selection:bg-blue-600 selection:text-white"
                                    placeholder="在此编写带 @aegis.case 与 with aegis.step 的原生 Python 测试函数..."
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= 3. 底部执行打屏终端 (Streaming Terminal) ================= */}
      <div
        style={{ height: isConsoleOpen ? '160px' : '32px' }}
        className="shrink-0 bg-[#0B0F17] border-t border-slate-800/80 flex flex-col z-20 transition-all duration-150 relative text-slate-300"
      >
        <div className="h-8 bg-[#0F172A] border-b border-slate-800/80 px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">测试工程实时打屏 (Step Event Stream)</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-medium">
              <Cpu className="w-3 h-3" /> 原生 pytest 工程上下文已挂载 · 步骤级高亮中
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
                      : log.type === 'step'
                      ? 'text-cyan-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : 'text-indigo-400'
                  }`}
                >
                  [{log.tag}]
                </span>
                <span
                  className={
                    log.type === 'success'
                      ? 'text-emerald-300'
                      : log.type === 'step'
                      ? 'text-cyan-200'
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
    </div>
  );
}
