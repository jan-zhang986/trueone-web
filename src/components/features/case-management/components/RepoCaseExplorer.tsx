import React, { useState, useMemo } from 'react';
import {
  FolderGit2,
  GitBranch,
  GitCommit,
  FileCode2,
  FolderOpen,
  Folder,
  Play,
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
  TableProperties,
  FolderTree,
  SlidersHorizontal,
  CheckSquare,
  Square,
  FileText,
  X,
  Eye,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  folderId: string;
  reqSource: string;
  module: string;
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
    author: string;
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

// 模拟 Git 代码工程目录树
const REPO_TREE_DATA: RepoFileNode[] = [
  {
    id: 'dir-tests',
    name: 'tests',
    path: 'tests',
    type: 'folder',
    caseCount: 6,
    children: [
      {
        id: 'dir-auth',
        name: 'auth (用户中心认证)',
        path: 'tests/auth',
        type: 'folder',
        caseCount: 5,
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
            passRate: 50,
          },
        ],
      },
      {
        id: 'dir-risk',
        name: 'risk (智能风控规则)',
        path: 'tests/risk',
        type: 'folder',
        caseCount: 1,
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

// 模拟全仓用例数据集
const INITIAL_ALL_CASES: UnifiedTestCaseItem[] = [
  {
    id: 'c-sms-1',
    code: 'TC-SMS-001',
    title: '正常输入 11 位手机号 ➔ 下发 6 位验证码并进入 60 秒倒计时',
    priority: 'P0',
    status: 'passed',
    fileId: 'file-test-sms',
    folderId: 'dir-auth',
    module: 'auth (用户中心认证)',
    reqSource: 'REQ-221',
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
      author: '张建 (QA Lead)',
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
    folderId: 'dir-auth',
    module: 'auth (用户中心认证)',
    reqSource: 'REQ-222',
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
      author: '张建 (QA Lead)',
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
    folderId: 'dir-auth',
    module: 'auth (用户中心认证)',
    reqSource: 'REQ-224',
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
      author: '张建 (QA Lead)',
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
  {
    id: 'c-auth-1',
    code: 'TC-AUTH-001',
    title: '正确颁发双 Token 架构 (Access 2h & Refresh 7d)',
    priority: 'P0',
    status: 'passed',
    fileId: 'file-test-pwd',
    folderId: 'dir-auth',
    module: 'auth (用户中心认证)',
    reqSource: 'REQ-101',
    design: {
      precondition: '测试账号处于启用状态，密码未被风控锁定',
      steps: [
        {
          stepNumber: 1,
          name: '携带动态加盐密码发起登录请求',
          expected: '服务端成功鉴权返回 HTTP 200',
          status: 'passed',
          durationMs: 25,
        },
        {
          stepNumber: 2,
          name: '断言返回体必须同时包含 accessToken 与 refreshToken',
          expected: 'accessToken 有效期为 7200s，refreshToken 为 7 天',
          status: 'passed',
          durationMs: 10,
        },
      ],
    },
    implementation: {
      gitRepo: 'gitlab.company.com/qa/auth-tests.git',
      gitBranch: 'main',
      gitFilePath: 'tests/auth/test_password_login.py',
      functionName: 'test_token_issuance',
      scriptLanguage: 'python',
      lastCommitHash: '9c1f2b4',
      lastCommitTime: '昨天',
      author: '李工 (Senior SDET)',
      codeContent: `# tests/auth/test_password_login.py\nimport pytest\nfrom aegis import aegis\n\n@aegis.case(id="TC-AUTH-001", req="REQ-101", title="双 Token 颁发验证")\ndef test_token_issuance(api_client):\n    resp = api_client.post("/api/v1/auth/login", json={"account": "test", "password": "pwd"})\n    assert resp.status_code == 200`,
    },
    lastExecutionTime: '13:50:12',
    executionDuration: '35ms',
  },
  {
    id: 'c-auth-2',
    code: 'TC-AUTH-002',
    title: '密码连续错误 5 次触发账号 15 分钟阶梯锁定保护',
    priority: 'P1',
    status: 'ready',
    fileId: 'file-test-pwd',
    folderId: 'dir-auth',
    module: 'auth (用户中心认证)',
    reqSource: 'REQ-105',
    design: {
      precondition: '测试账号当前未被锁定',
      steps: [
        {
          stepNumber: 1,
          name: '连续发送 5 次错误密码登录请求',
          expected: '前 4 次返回密码错误，第 5 次触发风控锁定',
          status: 'ready',
        },
        {
          stepNumber: 2,
          name: '第 6 次使用正确密码发起登录',
          expected: '返回 HTTP 403 明确提示“账号已被锁定 15 分钟”',
          status: 'ready',
        },
      ],
    },
    implementation: {
      gitRepo: 'gitlab.company.com/qa/auth-tests.git',
      gitBranch: 'main',
      gitFilePath: 'tests/auth/test_password_login.py',
      functionName: 'test_password_lockout',
      scriptLanguage: 'python',
      lastCommitHash: '9c1f2b4',
      lastCommitTime: '昨天',
      author: '李工 (Senior SDET)',
      codeContent: `# tests/auth/test_password_login.py\nimport pytest\nfrom aegis import aegis\n\n@aegis.case(id="TC-AUTH-002", req="REQ-105", title="密码错误阶梯锁定")\ndef test_password_lockout(api_client):\n    pass`,
    },
    lastExecutionTime: '--',
    executionDuration: '--',
  },
  {
    id: 'c-risk-1',
    code: 'TC-RISK-001',
    title: '异地异构新设备登录 ➔ 触发设备指纹风险二次验证',
    priority: 'P0',
    status: 'passed',
    fileId: 'file-test-rate',
    folderId: 'dir-risk',
    module: 'risk (智能风控规则)',
    reqSource: 'REQ-301',
    design: {
      precondition: '用户开启了高危异地登录风控开关',
      steps: [
        {
          stepNumber: 1,
          name: '模拟异地 IP 和未绑定设备指纹发起登录请求',
          expected: '触发设备指纹碰撞检测',
          status: 'passed',
          durationMs: 40,
        },
        {
          stepNumber: 2,
          name: '断言接口返回需要短信二次验证拦截凭证',
          expected: '返回 HTTP 200，action="REQUIRE_2FA"',
          status: 'passed',
          durationMs: 15,
        },
      ],
    },
    implementation: {
      gitRepo: 'gitlab.company.com/qa/auth-tests.git',
      gitBranch: 'main',
      gitFilePath: 'tests/risk/test_ip_rate_limit.py',
      functionName: 'test_device_fingerprint',
      scriptLanguage: 'python',
      lastCommitHash: '2b4e8a1',
      lastCommitTime: '3 天前',
      author: '王测开',
      codeContent: `# tests/risk/test_ip_rate_limit.py\nimport pytest\nfrom aegis import aegis\n\n@aegis.case(id="TC-RISK-001", req="REQ-301", title="设备指纹风控")\ndef test_device_fingerprint(api_client):\n    pass`,
    },
    lastExecutionTime: '12:10:00',
    executionDuration: '55ms',
  },
];

export function RepoCaseExplorer() {
  // 当前选中的 Git 仓库
  const [selectedRepo, setSelectedRepo] = useState('auth-tests.git');
  // 当前选中的 Git 分支
  const [selectedBranch, setSelectedBranch] = useState('main');

  // 左侧目录树选中节点: 'all' (全部) | folderId ('dir-auth') | fileId ('file-test-sms')
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string>('all');
  const [isLeftTreeOpen, setIsLeftTreeOpen] = useState(true);

  // 搜索关键字
  const [searchKeyword, setSearchKeyword] = useState('');
  // 优先级筛选
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // 表格多选复选框 (选中用例 ID 集合)
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  // 当前打开详情抽屉的用例
  const [activeDrawerCase, setActiveDrawerCase] = useState<UnifiedTestCaseItem | null>(null);

  // 用例数据
  const [cases, setCases] = useState<UnifiedTestCaseItem[]>(INITIAL_ALL_CASES);
  const [codeEditBuffer, setCodeEditBuffer] = useState<{ [key: string]: string }>({});

  // 底部控制台
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', time: '14:20:00', type: 'info', tag: 'RepoEngine', text: 'Git 仓库已挂载: gitlab.company.com/qa/auth-tests.git (branch: main)' },
    { id: 'l2', time: '14:20:01', type: 'success', tag: 'ASTIndex', text: 'AST 解析完成，成功索引 6 条统一用例，左侧目录树与右侧表格已就绪' },
  ]);

  // 根据左侧目录树选择过滤用例
  const treeFilteredCases = useMemo(() => {
    if (selectedTreeNodeId === 'all') return cases;
    return cases.filter(
      (c) => c.folderId === selectedTreeNodeId || c.fileId === selectedTreeNodeId
    );
  }, [cases, selectedTreeNodeId]);

  // 根据搜索与优先级二次过滤
  const finalFilteredCases = useMemo(() => {
    return treeFilteredCases.filter((c) => {
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const matchCode = c.code.toLowerCase().includes(kw);
        const matchTitle = c.title.toLowerCase().includes(kw);
        const matchReq = c.reqSource.toLowerCase().includes(kw);
        const matchFunc = c.implementation.functionName.toLowerCase().includes(kw);
        const matchFile = c.implementation.gitFilePath.toLowerCase().includes(kw);
        if (!matchCode && !matchTitle && !matchReq && !matchFunc && !matchFile) return false;
      }
      if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
      return true;
    });
  }, [treeFilteredCases, searchKeyword, priorityFilter]);

  // 全选/反选
  const isAllSelected = finalFilteredCases.length > 0 && selectedCaseIds.length === finalFilteredCases.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(finalFilteredCases.map((c) => c.id));
    }
  };

  const toggleSelectCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 单点调试
  const handleExecuteSingleCase = (caseItem: UnifiedTestCaseItem) => {
    setIsConsoleOpen(true);
    toast.info(`正在调试执行 [${caseItem.code}]...`);

    setCases((prev) =>
      prev.map((item) =>
        item.id === caseItem.id ? { ...item, status: 'ready', executionDuration: '执行中...' } : item
      )
    );

    setLogs((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'PytestWorker',
        text: `⚡ pytest ${caseItem.implementation.gitFilePath}::${caseItem.implementation.functionName}`,
      },
    ]);

    setTimeout(() => {
      setCases((prev) =>
        prev.map((item) =>
          item.id === caseItem.id
            ? {
                ...item,
                status: 'passed',
                lastExecutionTime: new Date().toTimeString().slice(0, 8),
                executionDuration: '48ms',
              }
            : item
        )
      );

      setLogs((prev) => [
        ...prev,
        {
          id: `end-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'TestReport',
          text: `🎯 [${caseItem.code}] 测试断言 100% 通过 (48ms) 🟢`,
        },
      ]);
      toast.success(`用例 [${caseItem.code}] 执行通过！`);
    }, 450);
  };

  // 批量执行选中的用例
  const handleBatchExecute = () => {
    if (selectedCaseIds.length === 0) {
      toast.error('请先勾选需要批量执行的用例');
      return;
    }

    setIsConsoleOpen(true);
    toast.info(`开始批量执行选中的 ${selectedCaseIds.length} 条用例...`);

    setCases((prev) =>
      prev.map((item) =>
        selectedCaseIds.includes(item.id)
          ? { ...item, status: 'ready', executionDuration: '执行中...' }
          : item
      )
    );

    const targets = cases
      .filter((c) => selectedCaseIds.includes(c.id))
      .map((c) => `${c.implementation.gitFilePath}::${c.implementation.functionName}`);

    setLogs((prev) => [
      ...prev,
      {
        id: `batch-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'BatchPytest',
        text: `🚀 触发批量执行 (${selectedCaseIds.length} 项): pytest ${targets.slice(0, 2).join(' ')} ...`,
      },
    ]);

    setTimeout(() => {
      setCases((prev) =>
        prev.map((item) => {
          if (!selectedCaseIds.includes(item.id)) return item;
          const ms = Math.floor(Math.random() * 30 + 20);
          return {
            ...item,
            status: 'passed',
            lastExecutionTime: new Date().toTimeString().slice(0, 8),
            executionDuration: `${ms}ms`,
          };
        })
      );

      setLogs((prev) => [
        ...prev,
        {
          id: `batch-ok-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'BatchPytest',
          text: `🎉 批量执行全部完成！通过率 100% (${selectedCaseIds.length}/${selectedCaseIds.length}) 🟢`,
        },
      ]);
      toast.success(`选中的 ${selectedCaseIds.length} 条用例已全部执行完成并通过！`);
    }, 700);
  };

  // 提交修改到 Git
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

    if (activeDrawerCase && activeDrawerCase.id === caseItem.id) {
      setActiveDrawerCase((prev) =>
        prev
          ? {
              ...prev,
              implementation: {
                ...prev.implementation,
                codeContent: updatedCode,
                lastCommitHash: fakeCommitHash,
                lastCommitTime: '刚刚',
              },
            }
          : null
      );
    }

    setLogs((prev) => [
      ...prev,
      {
        id: `git-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'GitLabAPI',
        text: `🚀 [Git Commit] 成功推送代码改动至 ${caseItem.implementation.gitBranch} (${fakeCommitHash}): ${caseItem.implementation.gitFilePath}`,
      },
    ]);

    toast.success(`代码已成功提交至 Git 分支 (${fakeCommitHash})！`);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-800 overflow-hidden font-sans select-none antialiased">
      {/* ================= 1. 顶部 Header (大仓与分支中枢 + 批量操作) ================= */}
      <div className="h-13 shrink-0 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between z-20 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-900">代码仓库用例中心</span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* 仓库与分支选择器 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-medium text-slate-800 gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{selectedRepo}</span>
            </div>
            <div className="flex items-center bg-indigo-50/80 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold text-indigo-700 gap-1">
              <GitBranch className="w-3 h-3" />
              <span>{selectedBranch}</span>
            </div>
          </div>
        </div>

        {/* 顶部右侧: 左栏目录展开/收起 + 批量执行 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLeftTreeOpen(!isLeftTreeOpen)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors font-medium"
          >
            {isLeftTreeOpen ? (
              <>
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>收起目录树</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>展开目录树</span>
              </>
            )}
          </button>

          <Button
            size="sm"
            onClick={handleBatchExecute}
            disabled={selectedCaseIds.length === 0}
            className={`h-8 text-xs rounded-lg px-3.5 gap-1.5 font-medium shadow-sm transition-all ${
              selectedCaseIds.length > 0
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {selectedCaseIds.length > 0 ? `批量执行选中 (${selectedCaseIds.length})` : '批量执行'}
            </span>
          </Button>
        </div>
      </div>

      {/* ================= 2. 主体工作区 (左侧目录树 + 右侧用例表格) ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 左侧：📁 Git 仓库目录树 (Repo Tree) */}
        {isLeftTreeOpen && (
          <div className="w-64 xl:w-72 shrink-0 bg-white border-r border-slate-200/80 flex flex-col min-h-0 z-10 animate-in slide-in-from-left-2 duration-150">
            <div className="h-10 px-4 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50/50">
              <div className="flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-blue-600" />
                <span>工程测试目录 (tests/)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">AST Live</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
              {/* 全部用例根节点 */}
              <div
                onClick={() => setSelectedTreeNodeId('all')}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  selectedTreeNodeId === 'all'
                    ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderGit2 className={`w-3.5 h-3.5 ${selectedTreeNodeId === 'all' ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>全部测试用例</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-white">
                  {cases.length}
                </Badge>
              </div>

              {/* 树形子目录与文件 */}
              <div className="pt-2 space-y-1">
                {REPO_TREE_DATA[0]?.children?.map((folder) => {
                  const isFolderActive = selectedTreeNodeId === folder.id;
                  return (
                    <div key={folder.id} className="space-y-0.5">
                      {/* 模块文件夹 */}
                      <div
                        onClick={() => setSelectedTreeNodeId(folder.id)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                          isFolderActive
                            ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                            : 'text-slate-700 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate font-semibold">{folder.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {folder.caseCount}
                        </span>
                      </div>

                      {/* 文件子节点 */}
                      <div className="pl-4 space-y-0.5">
                        {folder.children?.map((file) => {
                          const isFileActive = selectedTreeNodeId === file.id;
                          return (
                            <div
                              key={file.id}
                              onClick={() => setSelectedTreeNodeId(file.id)}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                                isFileActive
                                  ? 'bg-blue-50/80 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${isFileActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                <span className="truncate">{file.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {file.caseCount}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 右侧：📋 统一用例列表大表格 (Table View) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* 筛选与状态条 */}
          <div className="h-11 shrink-0 bg-slate-50/70 border-b border-slate-200/70 px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="搜索用例编号、标题、关联需求、函数名..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="h-7.5 pl-8 text-xs bg-white border-slate-200 rounded-lg"
                />
              </div>

              {/* 优先级过滤 */}
              <div className="flex items-center gap-1 text-slate-500">
                <span className="text-[11px]">优先级:</span>
                <div className="flex items-center bg-white p-0.5 rounded-md border border-slate-200 text-[11px]">
                  {['ALL', 'P0', 'P1'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-2 py-0.5 rounded ${
                        priorityFilter === p
                          ? 'bg-slate-100 font-bold text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
              <span>当前目录下共 {finalFilteredCases.length} 条用例</span>
              <span>·</span>
              <span className="text-blue-600 font-semibold">已勾选 {selectedCaseIds.length} 项</span>
            </div>
          </div>

          {/* 表格主体 */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-200 z-10 font-semibold text-slate-600 shadow-2xs">
                <tr>
                  <th className="w-10 px-3 py-2.5 text-center">
                    <button onClick={toggleSelectAll} className="p-0.5 hover:text-blue-600">
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="w-28 px-3 py-2.5 font-mono">用例编号</th>
                  <th className="px-3 py-2.5 min-w-[260px]">用例名称 (Docstring)</th>
                  <th className="w-24 px-3 py-2.5">关联需求</th>
                  <th className="w-16 px-3 py-2.5 text-center">优先级</th>
                  <th className="px-3 py-2.5 min-w-[260px]">代码目标 (文件与函数)</th>
                  <th className="w-24 px-3 py-2.5">最近状态</th>
                  <th className="w-20 px-3 py-2.5">耗时</th>
                  <th className="w-28 px-3 py-2.5 text-center">快捷操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {finalFilteredCases.map((c) => {
                  const isChecked = selectedCaseIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`group transition-colors hover:bg-slate-50/80 ${
                        isChecked ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* 复选框 */}
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => toggleSelectCase(c.id)} className="p-0.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* 用例编号 */}
                      <td className="px-3 py-3 font-mono font-bold text-blue-600">
                        {c.code}
                      </td>

                      {/* 用例名称 */}
                      <td className="px-3 py-3 font-medium text-slate-900 max-w-md">
                        <div
                          onClick={() => setActiveDrawerCase(c)}
                          className="cursor-pointer hover:text-blue-600 truncate"
                        >
                          {c.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono pt-0.5 truncate">
                          前置: {c.design.precondition}
                        </div>
                      </td>

                      {/* 关联需求 */}
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border-indigo-200/60"
                        >
                          {c.reqSource}
                        </Badge>
                      </td>

                      {/* 优先级 */}
                      <td className="px-3 py-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 font-bold ${
                            c.priority === 'P0'
                              ? 'border-red-200 text-red-600 bg-red-50'
                              : 'border-amber-200 text-amber-600 bg-amber-50'
                          }`}
                        >
                          {c.priority}
                        </Badge>
                      </td>

                      {/* 代码目标锚点 */}
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5 truncate">
                          <FileCode2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-500 truncate">{c.implementation.gitFilePath}</span>
                          <span className="text-slate-300">::</span>
                          <span className="font-semibold text-slate-800 truncate">{c.implementation.functionName}</span>
                        </div>
                      </td>

                      {/* 状态 */}
                      <td className="px-3 py-3">
                        {c.executionDuration === '执行中...' ? (
                          <span className="text-[10px] font-mono text-blue-600 animate-pulse flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            运行中...
                          </span>
                        ) : c.status === 'passed' ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 gap-1 font-medium font-mono"
                          >
                            <Check className="w-2.5 h-2.5" /> PASS
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 font-mono">
                            READY
                          </Badge>
                        )}
                      </td>

                      {/* 耗时 */}
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-500">
                        {c.executionDuration}
                      </td>

                      {/* 操作 */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleExecuteSingleCase(c)}
                            className="h-6 px-2 text-[11px] text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>调试</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveDrawerCase(c)}
                            className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-900 rounded"
                          >
                            <Eye className="w-3 h-3" />
                            <span>详情</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= 3. 底部执行打屏终端 (Streaming Terminal) ================= */}
      <div
        style={{ height: isConsoleOpen ? '150px' : '30px' }}
        className="shrink-0 bg-[#0B0F17] border-t border-slate-800 flex flex-col z-20 transition-all duration-150 relative text-slate-300"
      >
        <div className="h-7.5 bg-[#0F172A] border-b border-slate-800/80 px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">测试工程运行终端 (Pytest Worker Stream)</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-medium">
              <Cpu className="w-3 h-3" /> 本地测试工程目录就绪 · 支持单点与批量调度打屏
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

      {/* ================= 4. 统一用例双面抽屉 (Drawer) ================= */}
      <Sheet open={!!activeDrawerCase} onOpenChange={(open) => !open && setActiveDrawerCase(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 z-50">
          {activeDrawerCase && (
            <div className="flex flex-col h-full bg-white text-xs">
              <SheetHeader className="p-5 border-b border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {activeDrawerCase.code}
                    </span>
                    <Badge variant="outline" className="font-bold">
                      {activeDrawerCase.priority}
                    </Badge>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {activeDrawerCase.reqSource}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleExecuteSingleCase(activeDrawerCase)}
                    className="h-7 text-xs bg-slate-900 text-white rounded-lg px-3"
                  >
                    <Play className="w-3 h-3 fill-current mr-1" /> 运行调试
                  </Button>
                </div>
                <SheetTitle className="text-sm font-bold text-slate-900 pt-2 text-left">
                  {activeDrawerCase.title}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                {/* 业务设计步骤 */}
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
                      <span>业务设计步骤 (Business Steps)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      前置: {activeDrawerCase.design.precondition}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {activeDrawerCase.design.steps.map((st) => (
                      <div
                        key={st.stepNumber}
                        className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-0.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-medium text-slate-800">
                          <span>步骤 {st.stepNumber}: {st.name}</span>
                          <span className="text-[10px] text-emerald-600 font-mono">
                            {st.durationMs ? `${st.durationMs}ms` : 'PASS'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">预期结果: {st.expected}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 原生 Python 代码 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Git 原生测试代码 (@aegis SDK)</span>
                    </span>
                    <button
                      onClick={() => handleCommitToGit(activeDrawerCase)}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <GitCommit className="w-3 h-3" />
                      <span>Commit 代码变更</span>
                    </button>
                  </div>

                  <div className="rounded-xl bg-[#0F172A] border border-slate-800 overflow-hidden shadow-inner font-mono text-xs">
                    <div className="h-7 px-3 bg-[#1E293B] border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{activeDrawerCase.implementation.gitFilePath}</span>
                      <span>Commit: {activeDrawerCase.implementation.lastCommitHash}</span>
                    </div>
                    <div className="p-3">
                      <textarea
                        value={
                          codeEditBuffer[activeDrawerCase.id] !== undefined
                            ? codeEditBuffer[activeDrawerCase.id]
                            : activeDrawerCase.implementation.codeContent
                        }
                        onChange={(e) => {
                          setCodeEditBuffer((prev) => ({
                            ...prev,
                            [activeDrawerCase.id]: e.target.value,
                          }));
                        }}
                        rows={12}
                        className="w-full bg-transparent text-[#E2E8F0] text-[11px] font-mono leading-5 outline-none resize-y selection:bg-blue-600 selection:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
