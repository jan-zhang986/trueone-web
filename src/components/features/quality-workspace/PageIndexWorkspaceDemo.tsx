import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Search,
  Plus,
  Play,
  ArrowRight,
  ShieldCheck,
  Code2,
  ChevronRight,
  Sparkles,
  Link2,
  Check,
  X,
  Layers,
  Clock,
  RotateCcw,
  Eye,
  FolderTree,
  Filter,
  Bot,
  Terminal,
  Send,
  Zap,
  Flame,
  MousePointerClick,
  Maximize2,
  Minimize2,
  CornerDownLeft,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// 数据模型定义
export interface TestCaseItem {
  id: string;
  code: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'passed' | 'failed' | 'ready';
  reqSource: string; // 对应的 PRD 需求条目
  steps: { step: string; expected: string }[];
  boundApi?: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string };
  lastExecutedTime?: string;
}

export interface AnalysisPoint {
  id: string;
  category: '正常主链路' | '边界与异常' | '安全与风控' | '非功能';
  title: string;
  description: string;
  coveredCaseIds: string[]; // 覆盖此测点的用例 ID 列表
}

export interface PageIndexSection {
  id: string;
  number: string; // 如 "2.2"
  title: string;
  parentTitle?: string;
  prdMarkdown: string; // 完整的富文本 PRD 正文
  reqItems: { reqId: string; text: string; isCovered: boolean }[];
  analysisPoints: AnalysisPoint[];
  cases: TestCaseItem[];
  aiInsight?: {
    type: 'risk' | 'suggestion';
    title: string;
    description: string;
    fixActionText: string;
  };
}

// 模拟的完整 PageIndex 数据
const INITIAL_SECTIONS: PageIndexSection[] = [
  {
    id: 'sec-1',
    number: '1.0',
    title: '概述与改造背景',
    parentTitle: '项目全局概览',
    prdMarkdown: `### 1.0 项目概述与架构演进

#### 1.1 改造背景
随着业务规模扩张，旧版登录模块存在以下核心痛点：
- 鉴权协议分散，多端无法共享统一 Session；
- 缺少对设备指纹和异地风险登录的主动拦截能力；
- 短信验证码服务缺少分布式防刷保护。

#### 1.2 核心目标
1. 统一接入层鉴权协议，全面采用 **双 Token 架构 (Access Token 2小时 + Refresh Token 7天)**。
2. 提升用户体验，支持 **7 天无感免密自动续期**。
3. 强化风控防御，接入分布式 IP 频次限制与密码阶梯锁定机制。`,
    reqItems: [
      { reqId: 'REQ-101', text: '统一各端鉴权接入协议，采用双 Token (Access + Refresh) 架构。', isCovered: true },
      { reqId: 'REQ-102', text: '支持旧版客户端向新协议无感平滑迁移。', isCovered: true },
    ],
    analysisPoints: [
      {
        id: 'ap-1-1',
        category: '正常主链路',
        title: '双 Token 颁发与验证协议一致性',
        description: '验证返回的 accessToken 与 refreshToken 遵循 JWT 规范且包含租户与用户标识。',
        coveredCaseIds: ['TC-GEN-001'],
      },
      {
        id: 'ap-1-2',
        category: '非功能',
        title: '旧版协议向下兼容性',
        description: '旧版客户端请求携带旧 Header 能够正常路由并提示升级。',
        coveredCaseIds: ['TC-GEN-002'],
      },
    ],
    cases: [
      {
        id: 'TC-GEN-001',
        code: 'TC-AUTH-001',
        title: '鉴权成功后正确颁发双 Token (Access & Refresh)',
        priority: 'P0',
        status: 'passed',
        reqSource: 'REQ-101: 采用双 Token 架构',
        boundApi: { method: 'POST', path: '/api/v1/auth/login' },
        steps: [
          { step: '发送鉴权请求并校验返回体', expected: '包含 accessToken (2h有效) 与 refreshToken (7d有效)' },
        ],
      },
      {
        id: 'TC-GEN-002',
        code: 'TC-AUTH-002',
        title: '旧版协议请求向下兼容处理',
        priority: 'P1',
        status: 'passed',
        reqSource: 'REQ-102: 支持旧版平滑迁移',
        steps: [
          { step: '使用旧版 User-Agent 和旧协议头请求', expected: '网关正常识别并下发兼容响应' },
        ],
      },
    ],
  },
  {
    id: 'sec-2-1',
    number: '2.1',
    title: '账号密码登录链路',
    parentTitle: '2.0 用户身份认证中心',
    prdMarkdown: `### 2.1 账号密码登录业务规范

#### 2.1.1 用户输入规则
- 账号输入框支持 **手机号、邮箱、用户名** 三种形式输入；
- 前端自动过滤首尾多余空格；
- 密码输入框支持明文/密文切换，密码传输前必须通过 **SHA-256 算法** 结合动态加盐完成哈希加密。

#### 2.1.2 免登策略
- 用户在登录界面勾选【记住我（7天免登录）】；
- 服务端在颁发 Token 时将 Session 凭证延长至 7 天有效，7 天内用户再次打开系统可静默进入。`,
    reqItems: [
      { reqId: 'REQ-211', text: '账号支持手机号、邮箱、用户名三种输入格式，自动去首尾空格。', isCovered: true },
      { reqId: 'REQ-212', text: '密码输入需在前端完成 SHA-256 加密后再传输。', isCovered: true },
      { reqId: 'REQ-213', text: '勾选【记住我】，7 天内免重新输入密码无感登录。', isCovered: true },
    ],
    analysisPoints: [
      {
        id: 'ap-2-1-1',
        category: '正常主链路',
        title: '多格式账号正常登录',
        description: '分别使用合法手机号、合法邮箱、合法用户名配合正确密码登录。',
        coveredCaseIds: ['TC-PWD-001'],
      },
      {
        id: 'ap-2-1-2',
        category: '安全与风控',
        title: '传输加密与 SQL/XSS 注入拦截',
        description: '输入包含单引号、脚本标签等特殊字符，校验前后端联合防御。',
        coveredCaseIds: ['TC-PWD-002'],
      },
      {
        id: 'ap-2-1-3',
        category: '正常主链路',
        title: '7 天免登 Token 自动续期',
        description: '勾选记住我后，Token 过期瞬间触发静默刷新。',
        coveredCaseIds: ['TC-PWD-003'],
      },
    ],
    cases: [
      {
        id: 'TC-PWD-001',
        code: 'TC-PWD-001',
        title: '正确账号密码登录 ➔ 成功颁发凭证',
        priority: 'P0',
        status: 'passed',
        reqSource: 'REQ-211: 支持手机号/邮箱/用户名登录',
        boundApi: { method: 'POST', path: '/api/v1/auth/login' },
        steps: [
          { step: '输入正确的用户名和密码', expected: '返回 HTTP 200，成功获取用户信息' },
        ],
      },
      {
        id: 'TC-PWD-002',
        code: 'TC-PWD-002',
        title: '特殊字符注入与密码密文传输校验',
        priority: 'P0',
        status: 'passed',
        reqSource: 'REQ-212: 密码前端加密传输',
        boundApi: { method: 'POST', path: '/api/v1/auth/login' },
        steps: [
          { step: '抓包拦截请求检查 password 字段', expected: '为 Hash 密文而非明文' },
        ],
      },
      {
        id: 'TC-PWD-003',
        code: 'TC-PWD-003',
        title: '勾选记住我 ➔ 7 天内静默免登',
        priority: 'P1',
        status: 'passed',
        reqSource: 'REQ-213: 7 天免登',
        boundApi: { method: 'POST', path: '/api/v1/auth/verify' },
        steps: [
          { step: '登录时勾选 remember-me，清空 accessToken', expected: '调用 verify 接口成功静默换取新 Token' },
        ],
      },
    ],
  },
  {
    id: 'sec-2-2',
    number: '2.2',
    title: '手机验证码登录链路',
    parentTitle: '2.0 用户身份认证中心',
    prdMarkdown: `### 2.2 手机验证码登录业务规范

#### 2.2.1 验证码下发机制
1. 用户在输入框中输入大陆 11 位有效手机号码；
2. 点击【获取验证码】按钮，系统生成 6 位纯数字随机码并通过短信网关下发；
3. 点击后按钮进入 **60 秒倒计时锁定** 状态，避免用户重复误触；
4. 验证码有效时长为 **5 分钟**，超时后不可再作为校验凭证。

#### 2.2.2 自动注册与登录
- 用户输入手机号与验证码后点击【立即登录】；
- 若手机号在系统中已存在，直接完成登录并返回用户 Token；
- 若手机号为首次登录，系统自动在后台创建新用户记录并分配基础权限角色。

#### 2.2.3 异常与防刷限流 (重要)
- 为防止短信接口被黑产恶意刷量导致企业资损，系统需接入 IP 与设备指纹限流，同 IP 单日请求超出 20 次触发滑块验证码或 429 拦截。`,
    reqItems: [
      { reqId: 'REQ-221', text: '输入合规手机号，点击发送验证码，启动 60 秒倒计时防重。', isCovered: true },
      { reqId: 'REQ-222', text: '验证码为 6 位纯数字，有效时间为 5 分钟。', isCovered: true },
      { reqId: 'REQ-223', text: '未注册手机号首次通过验证码登录，系统自动创建基础账号。', isCovered: true },
      { reqId: 'REQ-224', text: '【⚠️ 存在漏测风险】系统需限制单 IP 单日短信发送上限（防刷资损）。', isCovered: false },
    ],
    aiInsight: {
      type: 'risk',
      title: 'AI 风险雷达发现未覆盖资损漏洞',
      description: 'PRD 第 2.2.3 节强调了 IP 防刷限流，但当前测试用例集尚未包含高频连击拦截测试用例！',
      fixActionText: '一键由 AI 生成【并发防刷拦截】用例并绑定 API',
    },
    analysisPoints: [
      {
        id: 'ap-2-2-1',
        category: '正常主链路',
        title: '正常下发验证码与 60s 倒计时',
        description: '手机号格式校验通过后，成功触发短信下发，前端进入 60s 倒计时锁定。',
        coveredCaseIds: ['TC-SMS-001'],
      },
      {
        id: 'ap-2-2-2',
        category: '边界与异常',
        title: '验证码过期 (>5min) 与输错重试',
        description: '输入超过 5 分钟的旧验证码，或输入错误数字，系统明确提示。',
        coveredCaseIds: ['TC-SMS-002'],
      },
      {
        id: 'ap-2-2-3',
        category: '正常主链路',
        title: '新手机号自动注册入库',
        description: '数据库不存在该手机号时，验证通过后自动生成 User ID 并初始化配置。',
        coveredCaseIds: ['TC-SMS-003'],
      },
      {
        id: 'ap-2-2-4',
        category: '安全与风控',
        title: '单 IP / 单设备短信频次防刷限流',
        description: '高频连续发送验证码请求，校验服务端 Redis 限流拦截（返回 429）。',
        coveredCaseIds: [], // 🚨 尚未覆盖用例！
      },
    ],
    cases: [
      {
        id: 'TC-SMS-001',
        code: 'TC-SMS-001',
        title: '正常输入 11 位手机号 ➔ 下发验证码并倒计时',
        priority: 'P0',
        status: 'passed',
        reqSource: 'REQ-221: 发送验证码与 60s 倒计时',
        boundApi: { method: 'POST', path: '/api/v1/sms/send' },
        steps: [
          { step: '输入 13800000000 点击获取验证码', expected: '收到 6 位验证码，按钮置灰倒计时 60s' },
        ],
      },
      {
        id: 'TC-SMS-002',
        code: 'TC-SMS-002',
        title: '验证码过期 (>5分钟) 提交 ➔ 明确提示已失效',
        priority: 'P1',
        status: 'passed',
        reqSource: 'REQ-222: 验证码 5 分钟有效',
        boundApi: { method: 'POST', path: '/api/v1/sms/verify' },
        steps: [
          { step: '获取验证码后等待 5 分钟再提交', expected: '提示“验证码已过期，请重新获取”' },
        ],
      },
      {
        id: 'TC-SMS-003',
        code: 'TC-SMS-003',
        title: '全新未注册手机号 ➔ 验证码校验后自动建号',
        priority: 'P0',
        status: 'passed',
        reqSource: 'REQ-223: 未注册手机号自动建号',
        boundApi: { method: 'POST', path: '/api/v1/sms/verify' },
        steps: [
          { step: '使用新手机号完成验证码登录', expected: '用户表新增记录，成功进入新人引导页' },
        ],
      },
    ],
  },
  {
    id: 'sec-3-1',
    number: '3.1',
    title: '密码输错阶梯锁定策略',
    parentTitle: '3.0 安全风控与并发保障',
    prdMarkdown: `### 3.1 密码输错阶梯风控策略

#### 3.1.1 错误计数与锁定规则
为了防范暴力破解攻击，系统引入动态错误计数器：
- **输错 1~4 次**：页面友好提示“密码错误，您还可以尝试 N 次”；
- **输错第 5 次**：系统立即触发风控锁定机制，锁定该账号登录权限 **15 分钟**；
- 在 15 分钟锁定期内，即使用户输入了正确密码，服务端亦必须直接拒绝认证（返回 HTTP 403 锁定中）。`,
    reqItems: [
      { reqId: 'REQ-311', text: '密码输错 1~4 次，提示剩余重试次数。', isCovered: true },
      { reqId: 'REQ-312', text: '连续输错 5 次，锁定该账号登录权限 15 分钟。', isCovered: true },
    ],
    analysisPoints: [
      {
        id: 'ap-3-1-1',
        category: '边界与异常',
        title: '输错 1~4 次友好提示与计数衰减',
        description: '输错后明确告知“密码错误，还可尝试 N 次”。',
        coveredCaseIds: ['TC-SEC-001'],
      },
      {
        id: 'ap-3-1-2',
        category: '安全与风控',
        title: '第 5 次触发 15 分钟封锁',
        description: '连续输错 5 次后，即使第 6 次输入正确密码也必须返回 403 锁定中。',
        coveredCaseIds: ['TC-SEC-002'],
      },
    ],
    cases: [
      {
        id: 'TC-SEC-001',
        code: 'TC-SEC-001',
        title: '输错密码 1~4 次 ➔ 提示剩余可用尝试次数',
        priority: 'P0',
        status: 'passed',
        reqSource: 'REQ-311: 输错提示剩余次数',
        boundApi: { method: 'POST', path: '/api/v1/auth/login' },
        steps: [
          { step: '输入错误密码', expected: '提示密码错误，剩余尝试次数：4 次' },
        ],
      },
      {
        id: 'TC-SEC-002',
        code: 'TC-SEC-002',
        title: '连续输错 5 次 ➔ 账号强制锁定 15 分钟',
        priority: 'P0',
        status: 'passed',
        reqSource: 'REQ-312: 输错 5 次锁定 15 分钟',
        boundApi: { method: 'POST', path: '/api/v1/auth/lock-check' },
        steps: [
          { step: '连续 5 次发送错误密码，第 6 次发送正确密码', expected: '第 6 次依旧返回 403 账号已被临时锁定' },
        ],
      },
    ],
  },
  {
    id: 'sec-3-2',
    number: '3.2',
    title: '单点登录与多端互踢机制',
    parentTitle: '3.0 安全风控与并发保障',
    prdMarkdown: `### 3.2 单点登录与异地登录互踢

#### 3.2.1 在线设备互斥规则
- 同一账号同一时刻只允许在 **1 台移动设备 App** 和 **1 个网页浏览器端** 同时在线；
- 当账号在异地新设备成功登录时，服务端需通过 WebSocket 广播下线指令至旧设备；
- 旧设备前端弹出【您的账号已在其他设备登录】提示框，并强制销毁本地 Token 跳转至登录页。`,
    reqItems: [
      { reqId: 'REQ-321', text: '【⚠️ 存在漏测风险】新设备登录成功后，通过 WebSocket 向旧设备推送下线通知并使 Token 失效。', isCovered: false },
    ],
    analysisPoints: [
      {
        id: 'ap-3-2-1',
        category: '安全与风控',
        title: '异地新设备登录互踢与 Token 强制吊销',
        description: '设备 A 在线，设备 B 登录同账号，设备 A 立即收到弹窗退回登录页，设备 A 的 Token 被加入 Redis 黑名单。',
        coveredCaseIds: [], // 🚨 尚未覆盖用例！
      },
    ],
    cases: [], // 🚨 暂无用例！
  },
];

export function PageIndexWorkspaceDemo({ onBack }: { onBack?: () => void }) {
  const [sections, setSections] = useState<PageIndexSection[]>(INITIAL_SECTIONS);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('sec-2-2'); // 默认定位到 2.2 验证码登录
  const [filterUncoveredOnly, setFilterUncoveredOnly] = useState(false);
  const [highlightedReqId, setHighlightedReqId] = useState<string | null>(null);

  // AI 指挥中枢状态
  const [aiCommandInput, setAiCommandInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiThinkingLogs, setAiThinkingLogs] = useState<string[]>([
    'Aegis QA Agent 已就绪，已实时解析当前 PRD 章节语义',
    '已建立 PageIndex 章节 ➔ PRD 条目 ➔ 测试用例 1:1 溯源关系网',
  ]);

  // 划词浮动 AI 胶囊状态
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const prdContainerRef = useRef<HTMLDivElement>(null);

  // 当前选中的 PageIndex 章节
  const currentSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId) || sections[0];
  }, [sections, selectedSectionId]);

  // 全局覆盖率与漏测统计
  const globalStats = useMemo(() => {
    let totalReqItems = 0;
    let coveredReqItems = 0;
    let totalAnalysisPoints = 0;
    let coveredAnalysisPoints = 0;
    let totalCases = 0;
    let passedCases = 0;

    sections.forEach((sec) => {
      sec.reqItems.forEach((r) => {
        totalReqItems++;
        if (r.isCovered) coveredReqItems++;
      });
      sec.analysisPoints.forEach((ap) => {
        totalAnalysisPoints++;
        if (ap.coveredCaseIds.length > 0) coveredAnalysisPoints++;
      });
      sec.cases.forEach((c) => {
        totalCases++;
        if (c.status === 'passed') passedCases++;
      });
    });

    const reqCoverRate = totalReqItems > 0 ? ((coveredReqItems / totalReqItems) * 100).toFixed(0) : '0';
    const uncoveredCount = totalReqItems - coveredReqItems;

    return { totalReqItems, coveredReqItems, totalAnalysisPoints, coveredAnalysisPoints, totalCases, passedCases, reqCoverRate, uncoveredCount };
  }, [sections]);

  // 过滤后的章节列表
  const displayedSections = useMemo(() => {
    if (!filterUncoveredOnly) return sections;
    return sections.filter((s) => s.reqItems.some((r) => !r.isCovered) || s.cases.length === 0);
  }, [sections, filterUncoveredOnly]);

  // 处理在 PRD 正文中的划词事件
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

  // 点击划词浮动胶囊的动作
  const handleActionFromSelection = (actionType: 'case' | 'point' | 'risk') => {
    if (!selectedText) return;
    setSelectionPos(null);
    setIsAiProcessing(true);

    toast.info(`🤖 AI 正在对划选段落「${selectedText.slice(0, 15)}...」推导演进...`);

    setTimeout(() => {
      const newCase: TestCaseItem = {
        id: `TC-SEL-${Date.now()}`,
        code: `TC-SEL-00${Math.floor(Math.random() * 90 + 10)}`,
        title: `【划词推导】针对「${selectedText.slice(0, 18)}」的测试用例`,
        priority: 'P0',
        status: 'passed',
        reqSource: `PRD 划词锚定: ${selectedText.slice(0, 20)}...`,
        boundApi: { method: 'POST', path: '/api/v1/auth/custom-verify' },
        steps: [
          { step: `执行与「${selectedText.slice(0, 15)}」相关的测试动作`, expected: '业务逻辑符合 PRD 预期，断言成功通过' },
        ],
      };

      setSections((prev) =>
        prev.map((sec) => {
          if (sec.id !== currentSection.id) return sec;
          return {
            ...sec,
            cases: [...sec.cases, newCase],
          };
        })
      );

      setAiThinkingLogs((prev) => [
        ...prev,
        `已根据划选段落完成 1:1 用例装配：[${newCase.code}] ${newCase.title}`,
      ]);
      setIsAiProcessing(false);
      toast.success('已成功从划选文本生成 1:1 落地测试用例！');
    }, 1000);
  };

  // 通过 AI 指挥控制台下达指令
  const handleExecuteAiCommand = (customCmd?: string) => {
    const cmd = customCmd || aiCommandInput.trim();
    if (!cmd) return;

    setAiCommandInput('');
    setIsAiProcessing(true);

    setAiThinkingLogs((prev) => [
      ...prev,
      `指挥指令已下达: "${cmd}"`,
      `正在针对章节 [${currentSection.number} ${currentSection.title}] 进行深度推理与用例装配...`,
    ]);

    setTimeout(() => {
      // 自动补齐当前章节缺失的漏洞用例
      const newCase: TestCaseItem = {
        id: `TC-AI-${Date.now()}`,
        code: `TC-AI-00${Math.floor(Math.random() * 90 + 10)}`,
        title: '高频并发连击请求 ➔ IP 与设备指纹限流拦截 (429)',
        priority: 'P0',
        status: 'passed',
        reqSource: 'REQ-224: 单 IP 短信防刷限流',
        boundApi: { method: 'POST', path: '/api/v1/sms/send' },
        steps: [
          { step: '1秒内并发发送 10 次获取验证码请求', expected: '第 2 次起被 Redis 限流拦截，返回 HTTP 429 Too Many Requests' },
        ],
      };

      setSections((prev) =>
        prev.map((sec) => {
          if (sec.id !== currentSection.id) return sec;
          return {
            ...sec,
            reqItems: sec.reqItems.map((r) => ({ ...r, isCovered: true })),
            analysisPoints: sec.analysisPoints.map((ap) => ({ ...ap, coveredCaseIds: ap.coveredCaseIds.length ? ap.coveredCaseIds : [newCase.id] })),
            cases: sec.cases.some((c) => c.code === newCase.code) ? sec.cases : [...sec.cases, newCase],
            aiInsight: undefined, // 消灭风险提示
          };
        })
      );

      setAiThinkingLogs((prev) => [
        ...prev,
        `✅ AI 推理执行完毕：已为当前章节补齐 1 条 P0 自动化用例，本章节覆盖率已达 100%！`,
      ]);

      setIsAiProcessing(false);
      toast.success('AI 指挥执行完毕：已补齐用例并建立 1:1 双向锚定！');
    }, 1200);
  };

  // 单点执行某条用例
  const handleRunSingleCase = (caseItem: TestCaseItem) => {
    toast.info(`正在执行用例 [${caseItem.code}]...`);
    setTimeout(() => {
      setSections((prev) =>
        prev.map((sec) => ({
          ...sec,
          cases: sec.cases.map((c) => (c.id === caseItem.id ? { ...c, status: 'passed' } : c)),
        }))
      );
      toast.success(`用例 [${caseItem.code}] 执行通过 (HTTP 200，断言全部命中)！`);
    }, 500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* ================= 顶部全局信心与状态指示栏 ================= */}
      <header className="h-14 shrink-0 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">
                用户登录改造 PRD · <span className="text-blue-400 font-semibold">AI Native 需求溯源与闭环工作台</span>
              </h1>
              <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono px-2 py-0.5">
                AI Co-Pilot Enabled
              </Badge>
            </div>
          </div>
        </div>

        {/* 全局信心指标栏 */}
        <div className="flex items-center gap-4 text-xs bg-slate-950 border border-slate-800 px-4 py-1.5 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">PRD 条目覆盖率:</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{globalStats.reqCoverRate}%</span>
            <span className="text-slate-500 text-[11px]">({globalStats.coveredReqItems}/{globalStats.totalReqItems})</span>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">漏测风险点:</span>
            {globalStats.uncoveredCount > 0 ? (
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] font-bold gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {globalStats.uncoveredCount} 处未覆盖用例
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                全部 100% 覆盖
              </Badge>
            )}
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">落地用例数:</span>
            <span className="font-mono font-bold text-white">{globalStats.totalCases} 条</span>
          </div>
        </div>

        {/* 顶部右侧动作 */}
        <div className="flex items-center gap-2">
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

      {/* ================= 工作台主体三栏联动区域 ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* ================= 左栏：📑 PageIndex 需求目录大纲 (22% 宽度) ================= */}
        <div className="w-[260px] xl:w-[290px] shrink-0 border-r border-slate-800 bg-slate-900/80 flex flex-col min-h-0 z-10">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <FolderTree className="w-3.5 h-3.5 text-blue-400" />
              <span>PageIndex 需求目录</span>
            </div>
            <button
              onClick={() => setFilterUncoveredOnly(!filterUncoveredOnly)}
              className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors flex items-center gap-1 ${
                filterUncoveredOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <Filter className="w-2.5 h-2.5" />
              <span>仅看未覆盖 ({globalStats.uncoveredCount})</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {displayedSections.map((sec) => {
              const isSelected = sec.id === currentSection.id;
              const totalItems = sec.reqItems.length;
              const coveredItems = sec.reqItems.filter((r) => r.isCovered).length;
              const isFullyCovered = totalItems > 0 && coveredItems === totalItems && sec.cases.length > 0;
              const isZeroCovered = coveredItems === 0 || sec.cases.length === 0;

              return (
                <div
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`group cursor-pointer rounded-xl p-3 border transition-all text-xs space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-slate-400">
                      {sec.number}
                    </span>
                    {isFullyCovered ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> 100% 覆盖
                      </span>
                    ) : isZeroCovered ? (
                      <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> 0% 漏测
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                        <AlertCircle className="w-3 h-3" /> 部分覆盖 ({coveredItems}/{totalItems})
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-slate-100 group-hover:text-white truncate">
                    {sec.title}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/40">
                    <span>{totalItems} 个规则项</span>
                    <span>{sec.cases.length} 条用例落地</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= 中栏：📖 沉浸式 PRD 原文阅读与划词锚定 (44% 宽度) ================= */}
        <div
          ref={prdContainerRef}
          onMouseUp={handleMouseUp}
          className="flex-1 border-r border-slate-800 bg-[#0C101A] flex flex-col min-h-0 relative"
        >
          {/* 章节标题与位置提示 */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-500">{currentSection.parentTitle}</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="font-bold text-white font-mono">{currentSection.number} {currentSection.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <MousePointerClick className="w-3 h-3 text-cyan-400" />
                <span>支持在下方划选任意文字唤醒 AI</span>
              </span>
            </div>
          </div>

          {/* PRD 正文滚动查看区 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
            {/* AI 风险雷达提示卡片 */}
            {currentSection.aiInsight && (
              <div className="p-4 rounded-2xl bg-amber-950/25 border border-amber-500/40 text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>{currentSection.aiInsight.title}</span>
                  </div>
                  <Badge className="bg-rose-500/20 text-rose-300 border-0 text-[10px]">
                    漏测预警
                  </Badge>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {currentSection.aiInsight.description}
                </p>
                <div className="flex items-center justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleExecuteAiCommand('一键补齐当前章节的防刷限流用例')}
                    className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg gap-1.5 shadow-md shadow-amber-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{currentSection.aiInsight.fixActionText}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Markdown PRD 格式化正文 */}
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed space-y-4 font-sans">
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm space-y-4">
                <div className="whitespace-pre-line leading-7 text-[13px] text-slate-200">
                  {currentSection.prdMarkdown}
                </div>
              </div>
            </div>

            {/* 结构化需求规则与测试分析点联动 */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>本章节明确【测什么】(分析点 ➔ 1:1 用例覆盖)</span>
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {currentSection.analysisPoints.map((ap) => {
                  const hasCases = ap.coveredCaseIds.length > 0;
                  return (
                    <div
                      key={ap.id}
                      className={`p-3 rounded-2xl border transition-all text-xs space-y-1.5 ${
                        hasCases
                          ? 'bg-slate-900/60 border-slate-800'
                          : 'bg-rose-950/20 border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[9px] px-1.5 py-0 font-medium ${
                              ap.category === '正常主链路'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : ap.category === '安全与风控'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {ap.category}
                          </Badge>
                          <span className="font-bold text-slate-100">{ap.title}</span>
                        </div>

                        {hasCases ? (
                          <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 已覆盖 {ap.coveredCaseIds.length} 条用例
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleExecuteAiCommand(`为分析点「${ap.title}」生成用例`)}
                            className="h-6 text-[10px] bg-rose-600 hover:bg-rose-500 text-white px-2 rounded-lg gap-1 shadow-sm"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>AI 补齐用例</span>
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 pl-1">{ap.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================= 划词浮动 AI 灵动胶囊 (Selection AI Floating Pill) ================= */}
          {selectionPos && selectedText && (
            <div
              style={{
                position: 'fixed',
                left: `${selectionPos.x}px`,
                top: `${selectionPos.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              className="z-50 bg-slate-900/95 backdrop-blur-md border border-blue-500/40 text-white px-3 py-1.5 rounded-2xl shadow-2xl shadow-blue-500/30 flex items-center gap-2 animate-in zoom-in-95 duration-150"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[11px] text-slate-300 max-w-[120px] truncate font-medium">
                "{selectedText}"
              </span>
              <div className="h-3 w-px bg-slate-700" />
              <button
                onClick={() => handleActionFromSelection('case')}
                className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Wand2 className="w-3 h-3" />
                <span>生成 1:1 用例</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= 右栏：🎯 对应落地的测试用例集 (34% 宽度) ================= */}
        <div className="w-[380px] xl:w-[440px] shrink-0 flex flex-col min-h-0 bg-slate-950">
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white">
                【{currentSection.number}】落地测试用例 ({currentSection.cases.length} 条)
              </h2>
            </div>
            <Button
              size="sm"
              onClick={() => {
                toast.success(`正在批量执行【${currentSection.title}】下的所有接口用例...`);
                currentSection.cases.forEach((c) => handleRunSingleCase(c));
              }}
              className="h-7 text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg gap-1 px-2.5"
            >
              <Play className="w-3 h-3" />
              <span>跑本节自动化</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {currentSection.cases.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-3xl space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <div className="text-sm font-bold text-white">当前章节尚未编写测试用例</div>
                <p className="text-xs text-slate-400 max-w-sm">
                  请通过中间 PRD 划选文字生成，或在底部 AI 指挥台中输入指令自动装配！
                </p>
              </div>
            ) : (
              currentSection.cases.map((c) => (
                <Card
                  key={c.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-300 font-mono text-[10px] px-1.5 py-0">
                          {c.code}
                        </Badge>
                        <Badge
                          className={`text-[9px] font-mono px-1.5 py-0 ${
                            c.priority === 'P0' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {c.priority}
                        </Badge>
                        <h4 className="text-xs font-bold text-white truncate">{c.title}</h4>
                      </div>

                      {/* 溯源需求提示条 */}
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono truncate">
                        <Link2 className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="truncate">溯源需求: {c.reqSource}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {c.status === 'passed' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] gap-1">
                          <Check className="w-3 h-3" /> PASS
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px]">
                          READY
                        </Badge>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRunSingleCase(c)}
                        className="h-7 w-7 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* 挂载的 API 自动化 */}
                  {c.boundApi && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono">
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[9px]">
                        {c.boundApi.method}
                      </Badge>
                      <span className="text-slate-300">{c.boundApi.path}</span>
                    </div>
                  )}

                  {/* 步骤与预期 */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
                    {c.steps.map((s, sIdx) => (
                      <div key={sIdx} className="space-y-0.5 text-[11px]">
                        <div className="text-slate-300 font-medium">
                          <strong className="text-blue-400 font-mono">步骤:</strong> {s.step}
                        </div>
                        <div className="text-emerald-400/90 pl-6">
                          <strong className="text-emerald-500 font-mono">➔ 预期:</strong> {s.expected}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ================= 底部：🤖 AI QA Agent 全局指挥控制中枢 (AI Command Dock) ================= */}
      <footer className="h-20 shrink-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 flex items-center justify-between z-30">
        {/* 左侧：Agent 实时状态与思维脉冲 */}
        <div className="flex items-center gap-3.5 max-w-md min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-blue-500/20 text-white font-bold">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span>Aegis QA Co-Pilot 指挥中枢</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {isAiProcessing ? '推理中...' : '已就绪'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
              {aiThinkingLogs[aiThinkingLogs.length - 1]}
            </p>
          </div>
        </div>

        {/* 中间：快捷指挥胶囊群 */}
        <div className="hidden xl:flex items-center gap-2">
          <button
            onClick={() => handleExecuteAiCommand('扫描当前 PRD 章节未定义的隐性暗坑')}
            className="text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>AI 扫描暗坑</span>
          </button>
          <button
            onClick={() => handleExecuteAiCommand('为当前章节一键补齐所有缺失用例')}
            className="text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>一键补齐漏测</span>
          </button>
          <button
            onClick={() => {
              toast.success('🚀 AI 已调度全量 API 并行执行，正在汇总准出报告...');
              setTimeout(() => {
                toast.success('自动化执行完成：通过率 100%，准出结论：建议放行！');
              }, 1200);
            }}
            className="text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>调度全量执行</span>
          </button>
        </div>

        {/* 右侧：自然语言输入指挥框 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteAiCommand();
          }}
          className="relative w-80 lg:w-96 flex items-center"
        >
          <Input
            value={aiCommandInput}
            onChange={(e) => setAiCommandInput(e.target.value)}
            placeholder="对 AI 下达指令，如：补充海外手机号、强化并发防刷..."
            className="h-10 text-xs bg-slate-950 border-slate-800 text-slate-100 pr-10 rounded-xl focus-visible:ring-blue-500/60 placeholder:text-slate-600"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!aiCommandInput.trim() || isAiProcessing}
            className="absolute right-1.5 h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
