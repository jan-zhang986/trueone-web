import React, { useState, useMemo } from 'react';
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
  prdContent: {
    paragraph: string;
    reqItems: { reqId: string; text: string; isCovered: boolean }[];
  };
  analysisPoints: AnalysisPoint[];
  cases: TestCaseItem[];
}

// 模拟的完整 PageIndex 数据
const INITIAL_SECTIONS: PageIndexSection[] = [
  {
    id: 'sec-1',
    number: '1.0',
    title: '概述与改造背景',
    parentTitle: '项目全局概览',
    prdContent: {
      paragraph: '本次改造涉及统一登录体系升级，全面支持账号密码登录与短信快捷登录，补齐设备指纹识别与安全风控能力。',
      reqItems: [
        { reqId: 'REQ-101', text: '统一各端鉴权接入协议，采用双 Token (Access + Refresh) 架构。', isCovered: true },
        { reqId: 'REQ-102', text: '支持旧版客户端向新协议无感平滑迁移。', isCovered: true },
      ],
    },
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
        title: '鉴权成功后正确颁发双 Token',
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
    prdContent: {
      paragraph: '用户输入账号（支持手机号/邮箱/用户名）与密码进行身份校验，校验通过后进入系统主页。',
      reqItems: [
        { reqId: 'REQ-211', text: '账号支持手机号、邮箱、用户名三种输入格式，自动去首尾空格。', isCovered: true },
        { reqId: 'REQ-212', text: '密码输入需在前端完成 SHA-256 加密后再传输。', isCovered: true },
        { reqId: 'REQ-213', text: '勾选【记住我】，7 天内免重新输入密码无感登录。', isCovered: true },
      ],
    },
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
    prdContent: {
      paragraph: '用户输入大陆 11 位手机号获取短信验证码，输入正确验证码后一键登录。未注册手机号自动完成注册。',
      reqItems: [
        { reqId: 'REQ-221', text: '输入合规手机号，点击发送验证码，启动 60 秒倒计时防重。', isCovered: true },
        { reqId: 'REQ-222', text: '验证码为 6 位纯数字，有效时间为 5 分钟。', isCovered: true },
        { reqId: 'REQ-223', text: '未注册手机号首次通过验证码登录，系统自动创建基础账号。', isCovered: true },
        { reqId: 'REQ-224', text: '【⚠️ 存在漏测风险】系统需限制单 IP 单日短信发送上限（防刷资损）。', isCovered: false },
      ],
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
    prdContent: {
      paragraph: '为防止暴力破解，系统对连续输错密码行为进行阶梯式拦截与风控。',
      reqItems: [
        { reqId: 'REQ-311', text: '密码输错 1~4 次，提示剩余重试次数。', isCovered: true },
        { reqId: 'REQ-312', text: '连续输错 5 次，锁定该账号登录权限 15 分钟。', isCovered: true },
      ],
    },
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
    prdContent: {
      paragraph: '同一账号仅允许在一台移动设备及一个网页端同时在线。异地新设备登录时需踢出旧设备。',
      reqItems: [
        { reqId: 'REQ-321', text: '【⚠️ 存在漏测风险】新设备登录成功后，通过 WebSocket 向旧设备推送下线通知并使 Token 失效。', isCovered: false },
      ],
    },
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
      sec.prdContent.reqItems.forEach((r) => {
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
    return sections.filter((s) => s.prdContent.reqItems.some((r) => !r.isCovered) || s.cases.length === 0);
  }, [sections, filterUncoveredOnly]);

  // 自动补齐当前章节缺失的用例（AI 智能闭环）
  const handleAutoFillCase = (pointId: string, reqId: string) => {
    const newCase: TestCaseItem = {
      id: `TC-AUTO-${Date.now()}`,
      code: `TC-AUTO-00${Math.floor(Math.random() * 90 + 10)}`,
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
          prdContent: {
            ...sec.prdContent,
            reqItems: sec.prdContent.reqItems.map((r) => (r.reqId === reqId ? { ...r, isCovered: true } : r)),
          },
          analysisPoints: sec.analysisPoints.map((ap) => (ap.id === pointId ? { ...ap, coveredCaseIds: [newCase.id] } : ap)),
          cases: [...sec.cases, newCase],
        };
      })
    );

    toast.success('已自动生成测试用例并建立 1:1 双向锚定！该章节覆盖率已达 100%！');
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
    }, 600);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 顶部指挥栏 */}
      <header className="h-14 shrink-0 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">
                用户登录改造 PRD · <span className="text-blue-400">PageIndex 需求溯源与用例闭环工作台</span>
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono px-2 py-0.5">
                确定性闭环模式
              </Badge>
            </div>
          </div>
        </div>

        {/* 全局信心指标栏 */}
        <div className="flex items-center gap-4 text-xs bg-slate-950 border border-slate-800 px-4 py-1.5 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">需求条目覆盖率:</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{globalStats.reqCoverRate}%</span>
            <span className="text-slate-500 text-[11px]">({globalStats.coveredReqItems}/{globalStats.totalReqItems})</span>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">漏测风险点:</span>
            {globalStats.uncoveredCount > 0 ? (
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] font-bold gap-1">
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
            <span className="text-slate-400">已落地用例:</span>
            <span className="font-mono font-bold text-white">{globalStats.totalCases} 条</span>
          </div>
        </div>

        {/* 返回按钮 */}
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
      </header>

      {/* 三栏联动工作区 */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* ================= 左栏：📑 PageIndex 需求目录大纲 (24% 宽度) ================= */}
        <div className="w-[280px] xl:w-[320px] shrink-0 border-r border-slate-800 bg-slate-900/70 flex flex-col min-h-0">
          {/* 目录头部与过滤 */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>PageIndex 需求目录</span>
            </div>
            <button
              onClick={() => setFilterUncoveredOnly(!filterUncoveredOnly)}
              className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors flex items-center gap-1 ${
                filterUncoveredOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>仅看未覆盖 ({globalStats.uncoveredCount})</span>
            </button>
          </div>

          {/* PageIndex 树形列表 */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {displayedSections.map((sec) => {
              const isSelected = sec.id === currentSection.id;
              const totalItems = sec.prdContent.reqItems.length;
              const coveredItems = sec.prdContent.reqItems.filter((r) => r.isCovered).length;
              const isFullyCovered = totalItems > 0 && coveredItems === totalItems && sec.cases.length > 0;
              const isZeroCovered = coveredItems === 0 || sec.cases.length === 0;

              return (
                <div
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`group cursor-pointer rounded-xl p-3 border transition-all text-xs space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-950/60 border-blue-500 shadow-md ring-1 ring-blue-500/30'
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
                    <span>{totalItems} 个需求点</span>
                    <span>{sec.cases.length} 条用例落地</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= 中栏：📖 当前 PageIndex 章节正文 & “明确测什么” (38% 宽度) ================= */}
        <div className="w-[480px] xl:w-[540px] shrink-0 border-r border-slate-800 bg-[#0C101A] flex flex-col min-h-0">
          {/* 章节面包屑 */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="text-slate-500">{currentSection.parentTitle}</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="font-bold text-white font-mono">{currentSection.number} {currentSection.title}</span>
            </div>
            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
              {currentSection.prdContent.reqItems.length} 个规则项
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* 上半部：PRD 章节正文与结构化需求条目 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>【{currentSection.number}】PRD 需求原文与条目拆解</span>
                </h3>
                <span className="text-[10px] text-slate-500">点击条目可高亮溯源</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs leading-relaxed text-slate-300">
                <p className="text-slate-400 italic text-[11px] border-b border-slate-800/60 pb-2">
                  "{currentSection.prdContent.paragraph}"
                </p>

                {/* 需求条目列表 */}
                <div className="space-y-2">
                  {currentSection.prdContent.reqItems.map((item) => {
                    const isHighlighted = highlightedReqId === item.reqId;
                    return (
                      <div
                        key={item.reqId}
                        onClick={() => setHighlightedReqId(isHighlighted ? null : item.reqId)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isHighlighted
                            ? 'bg-blue-950/80 border-blue-400 ring-2 ring-blue-500/30'
                            : item.isCovered
                            ? 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700'
                            : 'bg-rose-950/30 border-rose-500/40 hover:border-rose-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] font-bold text-blue-400">
                            [{item.reqId}]
                          </span>
                          {item.isCovered ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[9px] px-1.5 py-0">
                              ✅ 已覆盖
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500/20 text-rose-300 border-0 text-[9px] px-1.5 py-0 font-bold animate-pulse">
                              ⚠️ 漏测风险
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-200">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 下半部：明确测什么 (测试分析点矩阵) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>💡 本章节明确【测什么】(测试分析点)</span>
                </h3>
                <span className="text-[10px] text-slate-500">{currentSection.analysisPoints.length} 个测试维度</span>
              </div>

              <div className="space-y-2.5">
                {currentSection.analysisPoints.map((ap) => {
                  const hasCases = ap.coveredCaseIds.length > 0;

                  return (
                    <div
                      key={ap.id}
                      className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
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
                          <span className="font-mono text-[10px] text-emerald-400">
                            ➔ 对应 {ap.coveredCaseIds.length} 条用例
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAutoFillCase(ap.id, 'REQ-224')}
                            className="h-6 text-[10px] bg-rose-600 hover:bg-rose-500 text-white px-2 rounded-lg gap-1 shadow-sm"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>一键补齐用例</span>
                          </Button>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed pl-1">
                        {ap.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ================= 右栏：🎯 对应落地的测试用例集 (信心来源，剩余宽度) ================= */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
          {/* 用例区头部 */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white">
                【{currentSection.number}】落地测试用例集 ({currentSection.cases.length} 条)
              </h2>
            </div>
            <div className="flex items-center gap-2">
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
          </div>

          {/* 测试用例卡片流 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {currentSection.cases.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-3xl space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <div className="text-sm font-bold text-white">当前章节尚未编写测试用例</div>
                <p className="text-xs text-slate-400 max-w-sm">
                  请针对中间的 PRD 需求点编写用例，或点击中间的【一键补齐用例】让 AI 自动生成！
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
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Link2 className="w-3 h-3 text-blue-400" />
                        <span>溯源需求: {c.reqSource}</span>
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
    </div>
  );
}
