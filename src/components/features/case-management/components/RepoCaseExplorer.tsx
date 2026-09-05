import React, { useState, useMemo } from 'react';
import {
  FolderGit2,
  GitBranch,
  GitCommit,
  FileCode2,
  Folder,
  FolderOpen,
  FileText,
  Play,
  SplitSquareVertical,
  ListOrdered,
  Code2,
  Link2,
  Check,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Plus,
  RotateCcw,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ================= 数据模型 =================

export interface RepoFileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  caseCount?: number;
  passRate?: number;
  children?: RepoFileNode[];
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
  fileId: string;
  reqSource: string;
  design: {
    precondition: string;
    steps: TestCaseStep[];
  };
  implementation: {
    gitRepo: string;
    gitBranch: string;
    gitFilePath: string;
    functionName: string;
    scriptLanguage: 'python' | 'typescript';
    codeContent: string;
    lastCommitHash: string;
    lastCommitTime: string;
  };
  lastExecutionTime?: string;
  executionDuration?: string;
}

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'step';
  tag: string;
  text: string;
}

// 模拟 Git 仓库树
const REPO_TREE_DATA: RepoFileNode[] = [
  {
    id: 'f-conftest',
    name: 'conftest.py',
    path: 'conftest.py',
    type: 'file',
  },
  {
    id: 'f-pytest-ini',
    name: 'pytest.ini',
    path: 'pytest.ini',
    type: 'file',
  },
  {
    id: 'f-reqs',
    name: 'requirements.txt',
    path: 'requirements.txt',
    type: 'file',
  },
  {
    id: 'dir-tests',
    name: 'tests',
    path: 'tests',
    type: 'folder',
    children: [
      {
        id: 'dir-common',
        name: 'common',
        path: 'tests/common',
        type: 'folder',
        children: [
          { id: 'f-crypto', name: 'crypto.py', path: 'tests/common/crypto.py', type: 'file' },
          { id: 'f-fixtures', name: 'fixtures.py', path: 'tests/common/fixtures.py', type: 'file' },
        ],
      },
      {
        id: 'dir-auth',
        name: 'auth (用户中心认证)',
        path: 'tests/auth',
        type: 'folder',
        children: [
          {
            id: 'file-test-sms',
            name: 'test_sms_login.py',
            path: 'tests/auth/test_sms_login.py',
            type: 'file',
            caseCount: 3,
            passRate: 100,
          },
          {
            id: 'file-test-pwd',
            name: 'test_password_login.py',
            path: 'tests/auth/test_password_login.py',
            type: 'file',
            caseCount: 2,
            passRate: 100,
          },
          {
            id: 'file-test-token',
            name: 'test_token_refresh.py',
            path: 'tests/auth/test_token_refresh.py',
            type: 'file',
            caseCount: 2,
            passRate: 100,
          },
        ],
      },
      {
        id: 'dir-risk',
        name: 'risk (智能风控规则)',
        path: 'tests/risk',
        type: 'folder',
        children: [
          {
            id: 'file-test-rate',
            name: 'test_ip_rate_limit.py',
            path: 'tests/risk/test_ip_rate_limit.py',
            type: 'file',
            caseCount: 1,
            passRate: 100,
          },
        ],
      },
    ],
  },
];

// 模拟仓库内的统一用例
const INITIAL_CASES_DATA: UnifiedTestCaseItem[] = [
  {
    id: 'c-sms-1',
    code: 'TC-SMS-001',
    title: '正常输入 11 位手机号 ➔ 下发 6 位验证码并进入 60 秒倒计时',
    priority: 'P0',
    status: 'passed',
    fileId: 'file-test-sms',
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
  {
    id: 'c-sms-2',
    code: 'TC-SMS-002',
    title: '验证码超时 (>5分钟) 提交 ➔ 明确提示“已失效”并拦截登录',
    priority: 'P1',
    status: 'passed',
    fileId: 'file-test-sms',
    reqSource: 'REQ-222: 验证码 5 分钟有效',
    design: {
      precondition: '在 Redis 中预埋一个已超时的过期短信验证码',
      steps: [
        {
          stepNumber: 1,
          name: '模拟客户端提交过期 5 分钟的验证码',
          expected: '服务端触发验证码有效性校验',
          status: 'passed',
          durationMs: 24,
        },
        {
          stepNumber: 2,
          name: '断言返回 HTTP 400 且错误文案包含“已失效”',
          expected: '登录被拦截，不颁发任何 Token 凭证',
          status: 'passed',
          durationMs: 18,
        },
      ],
    },
    implementation: {
      gitRepo: 'gitlab.company.com/qa/auth-tests.git',
      gitBranch: 'main',
      gitFilePath: 'tests/auth/test_sms_login.py',
      functionName: 'test_sms_expired_token',
      scriptLanguage: 'python',
      lastCommitHash: '4f9c2d1',
      lastCommitTime: '2 小时前',
      codeContent: `# tests/auth/test_sms_login.py
import pytest
from aegis import aegis

@aegis.feature("手机短信登录")
@aegis.case(
    id="TC-SMS-002",
    req="REQ-222",
    title="验证码超时失效校验",
    priority="P1"
)
def test_sms_expired_token(api_client, redis_client):
    phone = "13800138001"
    
    with aegis.step("步骤 1: 提交过期验证码"):
        resp = api_client.post("/api/v1/sms/verify", json={"phone": phone, "code": "888888"})
        
    with aegis.step("步骤 2: 断言 400 与失效文案"):
        assert resp.status_code == 400, "过期验证码应返回 400"
        assert "已失效" in resp.json().get("message", ""), "提示语必须包含已失效"`,
    },
    lastExecutionTime: '14:23:10',
    executionDuration: '42ms',
  },
  {
    id: 'c-sms-3',
    code: 'TC-SMS-003',
    title: '高频并发连击请求 ➔ 触发单 IP 429 防刷限流拦截',
    priority: 'P0',
    status: 'passed',
    fileId: 'file-test-sms',
    reqSource: 'REQ-224: 单 IP 短信防刷限流',
    design: {
      precondition: '当前 IP 无白名单豁免，Redis 防刷计数器就绪',
      steps: [
        {
          stepNumber: 1,
          name: '1秒内连续并发调用 10 次短信接口',
          expected: '网络请求并发到达服务端网关',
          status: 'passed',
          durationMs: 32,
        },
        {
          stepNumber: 2,
          name: '校验首个请求成功返回 200',
          expected: '第一笔请求正常下发，启动 60s 防重锁',
          status: 'passed',
          durationMs: 14,
        },
        {
          stepNumber: 3,
          name: '校验后续 9 次请求全部被 429 限流拦截',
          expected: '触发单日 IP 上限策略，返回 HTTP 429',
          status: 'passed',
          durationMs: 22,
        },
      ],
    },
    implementation: {
      gitRepo: 'gitlab.company.com/qa/auth-tests.git',
      gitBranch: 'main',
      gitFilePath: 'tests/auth/test_sms_login.py',
      functionName: 'test_sms_rate_limit',
      scriptLanguage: 'python',
      lastCommitHash: '8e2a1b9',
      lastCommitTime: '1 小时前',
      codeContent: `# tests/auth/test_sms_login.py
import pytest
from aegis import aegis

@aegis.feature("手机短信登录")
@aegis.case(
    id="TC-SMS-003",
    req="REQ-224",
    title="高频并发连击请求 ➔ 触发 429 防刷限流",
    priority="P0",
    tags=["security", "risk-control"]
)
def test_sms_rate_limit(api_client, redis_client):
    phone = "13800138999"
    
    with aegis.step("步骤 1: 1秒内并发调用 10 次短信接口"):
        responses = [api_client.post("/api/v1/sms/send", json={"phone": phone}) for _ in range(10)]
        
    with aegis.step("步骤 2: 校验首个请求成功返回 200"):
        assert responses[0].status_code == 200, "首个请求应返回 200"
        
    with aegis.step("步骤 3: 校验后续请求被 429 限流拦截"):
        assert all(r.status_code == 429 for r in responses[1:]), "高频请求应全部被拦截返回 429"`,
    },
    lastExecutionTime: '14:25:00',
    executionDuration: '68ms',
  },
];

export function RepoCaseExplorer() {
  // 当前选中的 Git 仓库
  const [selectedRepo, setSelectedRepo] = useState('auth-tests.git');
  // 当前选中的 Git 分支
  const [selectedBranch, setSelectedBranch] = useState('main');
  // 当前选中的测试文件
  const [selectedFileId, setSelectedFileId] = useState('file-test-sms');
  // 搜索关键字
  const [searchKeyword, setSearchKeyword] = useState('');

  // 展开折叠的代码抽屉
  const [expandedCodeCaseIds, setExpandedCodeCaseIds] = useState<{ [key: string]: boolean }>({
    'c-sms-1': false,
    'c-sms-3': true,
  });

  // 三重视图模式: unified (统一双面) | design (业务步骤) | code (纯代码)
  const [caseViewMode, setCaseViewMode] = useState<'unified' | 'design' | 'code'>('unified');

  // 用例数据
  const [cases, setCases] = useState<UnifiedTestCaseItem[]>(INITIAL_CASES_DATA);
  const [codeEditBuffer, setCodeEditBuffer] = useState<{ [key: string]: string }>({});

  // 底部控制台
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', time: '14:20:00', type: 'info', tag: 'RepoExplorer', text: '已挂载代码工程仓库: gitlab.company.com/qa/auth-tests.git (branch: main)' },
    { id: 'l2', time: '14:20:01', type: 'success', tag: 'ASTIndex', text: 'AST 语法解析完成，全仓共索引 3 个测试套件文件，7 条统一用例' },
  ]);

  // 当前选中文件的用例列表
  const currentFileCases = useMemo(() => {
    return cases.filter((c) => c.fileId === selectedFileId);
  }, [cases, selectedFileId]);

  // 单点调试运行用例
  const handleExecuteCase = (caseItem: UnifiedTestCaseItem) => {
    setIsConsoleOpen(true);
    toast.info(`正在执行测试工程用例 [${caseItem.code}]...`);

    // 重置状态为执行中
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
        tag: 'PytestWorker',
        text: `⚡ 执行用例: pytest ${caseItem.implementation.gitFilePath}::${caseItem.implementation.functionName}`,
      },
    ]);

    setTimeout(() => {
      // Step 1 完成
      setCases((prev) =>
        prev.map((item) => {
          if (item.id !== caseItem.id) return item;
          const updated = [...item.design.steps];
          if (updated[0]) updated[0] = { ...updated[0], status: 'passed', durationMs: 32 };
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
          text: `[${caseItem.code}] ✔ 步骤 1: ${caseItem.design.steps[0]?.name} (PASSED 32ms)`,
        },
      ]);
    }, 280);

    setTimeout(() => {
      // 全部步骤完成
      setCases((prev) =>
        prev.map((item) => {
          if (item.id !== caseItem.id) return item;
          return {
            ...item,
            status: 'passed',
            lastExecutionTime: new Date().toTimeString().slice(0, 8),
            executionDuration: '58ms',
            design: {
              ...item.design,
              steps: item.design.steps.map((s) => ({ ...s, status: 'passed', durationMs: s.durationMs || 18 })),
            },
          };
        })
      );

      setLogs((prev) => [
        ...prev,
        {
          id: `st-end`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'TestReport',
          text: `🎯 [${caseItem.code}] 全部步骤执行通过 (总耗时 58ms)，断言 100% 命中 🟢`,
        },
      ]);
      toast.success(`用例 [${caseItem.code}] 执行通过！`);
    }, 600);
  };

  // 提交修改到 Git 仓库
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
        text: `🚀 [Git Commit] 成功将改动推送至 ${caseItem.implementation.gitBranch} (${fakeCommitHash}): ${caseItem.implementation.gitFilePath}`,
      },
    ]);

    toast.success(`代码已成功提交至 Git 分支 (${fakeCommitHash})！`);
  };

  // 渲染文件树节点
  const renderTreeNode = (node: RepoFileNode, depth: number = 0) => {
    const isFolder = node.type === 'folder';
    const isSelected = node.id === selectedFileId;

    if (isFolder) {
      return (
        <div key={node.id} className="space-y-0.5">
          <div
            style={{ paddingLeft: `${depth * 12 + 10}px` }}
            className="flex items-center gap-1.5 py-1 text-xs font-semibold text-slate-700 select-none hover:bg-slate-100/60 rounded-md cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{node.name}</span>
          </div>
          {node.children && (
            <div className="space-y-0.5">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.id}
        onClick={() => {
          if (node.caseCount) setSelectedFileId(node.id);
        }}
        style={{ paddingLeft: `${depth * 12 + 10}px` }}
        className={`group flex items-center justify-between py-1.5 pr-2.5 rounded-lg text-xs cursor-pointer transition-all ${
          isSelected
            ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/60 shadow-2xs'
            : 'text-slate-600 hover:bg-slate-100/70 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className="truncate">{node.name}</span>
        </div>

        {node.caseCount !== undefined && (
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 font-mono ${
              isSelected ? 'bg-blue-100/80 text-blue-700 border-blue-300' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {node.caseCount} cases
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-800 overflow-hidden font-sans select-none antialiased">
      {/* ================= 1. 顶部 Header (大仓与分支选择器) ================= */}
      <div className="h-12 shrink-0 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-900">统一用例仓库 (Test Repo Hub)</span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* 业务代码仓库选择 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">业务仓库:</span>
            <div className="flex items-center bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 text-xs font-mono font-medium text-slate-800 gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{selectedRepo}</span>
            </div>
          </div>

          {/* Git 分支选择 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">分支:</span>
            <div className="flex items-center bg-indigo-50/70 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold text-indigo-700 gap-1">
              <GitBranch className="w-3 h-3" />
              <span>{selectedBranch}</span>
            </div>
          </div>
        </div>

        {/* 顶部右侧: 三重视图切换器 */}
        <div className="flex items-center gap-3">
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

          <Button
            size="sm"
            onClick={() => {
              setIsConsoleOpen(true);
              toast.info('正在批量执行当前测试套件所有用例...');
            }}
            className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 gap-1.5 font-medium shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>运行套件所有用例</span>
          </Button>
        </div>
      </div>

      {/* ================= 2. 主体双栏工作区 ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 左侧：📁 Git 仓库与测试套件目录树 (Repo Tree) */}
        <div className="w-72 shrink-0 bg-white border-r border-slate-200/70 flex flex-col min-h-0 z-10">
          <div className="h-10 px-4 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
              <span>工程文件树 (tests/)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">AST Live</span>
          </div>

          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="搜索测试文件或函数..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {REPO_TREE_DATA.map((node) => renderTreeNode(node))}
          </div>
        </div>

        {/* 右侧：🎯 统一测试套件与用例大盘 (Suite View) */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#FAFAFC]">
          {/* 测试套件文件头 */}
          <div className="h-11 px-5 bg-white border-b border-slate-200/70 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 text-xs">tests/auth/test_sms_login.py</span>
                <Badge variant="outline" className="text-[10px] font-mono bg-blue-50 text-blue-700 border-blue-200">
                  {currentFileCases.length} 条统一用例
                </Badge>
              </div>

              <div className="h-3 w-px bg-slate-200" />

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>Commit: 4f9c2d1</span>
                <span>·</span>
                <span>作者: 张建 (QA Lead)</span>
                <span>·</span>
                <span>2 小时前</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              原生 Pytest 测试套件 · 保持代码工程完整上下文
            </div>
          </div>

          {/* 用例列表区 (复用统一双面卡片) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {currentFileCases.map((c) => {
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
                        <span>单点调试</span>
                      </Button>
                    </div>
                  </div>

                  {/* 2. 业务设计面 (Design View: 步骤列表) */}
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
            })}
          </div>
        </div>
      </div>

      {/* ================= 3. 底部执行打屏终端 (Streaming Terminal) ================= */}
      <div
        style={{ height: isConsoleOpen ? '150px' : '32px' }}
        className="shrink-0 bg-[#0B0F17] border-t border-slate-800/80 flex flex-col z-20 transition-all duration-150 relative text-slate-300"
      >
        <div className="h-8 bg-[#0F172A] border-b border-slate-800/80 px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">测试工程执行日志 (Step Events Stream)</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-medium">
              <Cpu className="w-3 h-3" /> pytest 工作区原生执行 · 步骤逐级高亮
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
