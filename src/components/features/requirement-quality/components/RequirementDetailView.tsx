/**
 * 需求质量视图 - 需求详情整页（图表 + 指标 + Top10）
 */

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  ArrowLeft,
  Clock,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RequirementItem } from '../constants/requirement-list';
import { RequirementOverviewCards } from './RequirementOverviewCards';
import { RequirementMetrics } from './RequirementMetrics';
import type { RequirementQualityDetailDTO, RequirementQualityCaseExecutionRowDTO } from '@/services/requirement-quality';
import {
  CHANGE_HEAT_METRICS,
  EXECUTION_EFFICIENCY_METRICS,
  BENEFIT_METRICS,
  WORK_HOUR_DEVIATION_METRICS,
  REUSE_METRICS,
  WORK_HOUR_METRICS,
  CODE_QUALITY_METRICS,
  RELEASE_METRICS,
} from '../constants/detail-metrics';

const SORT_OPTIONS = [
  { value: 'execCount', label: '执行次数' },
  { value: 'failCount', label: '失败次数' },
  { value: 'avgTime', label: '平均耗时' },
  { value: 'failRate', label: '失败率' },
  { value: 'successRate', label: '成功率' },
] as const;

const TOOLTIP_STYLE = {
  backgroundColor: '#1E293B',
  border: '1px solid #475569',
  borderRadius: '10px',
  color: '#fff',
  padding: '10px 14px',
  fontSize: '13px',
  fontWeight: 500,
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};

/** 阻塞原因饼图颜色（红/橙系） */
const PIE_COLORS_BLOCK = ['#F87171', '#FB923C', '#FBBF24', '#FCD34D', '#DC2626', '#EF4444'];
/** 变更原因饼图颜色（蓝/绿系） */
const PIE_COLORS_CHANGE = ['#60A5FA', '#34D399', '#F59E0B', '#FBBF24', '#A78BFA', '#10B981'];
/** 优先级饼图颜色（红/橙/蓝/灰） */
const PIE_COLORS_PRIORITY = ['#EF4444', '#F59E0B', '#3B82F6', '#6B7280'];

export interface RequirementDetailViewProps {
  requirement: RequirementItem;
  /** 完整详情（含 caseExecutionList），用于执行用例明细真实数据 */
  detail?: RequirementQualityDetailDTO | null;
  onBack: () => void;
}

/** 格式化耗时（秒 -> "18.9s"） */
function formatDurationSeconds(seconds: number | undefined | null): string {
  if (seconds == null || Number.isNaN(seconds)) return '-';
  return `${Number(seconds).toFixed(1)}s`;
}

/** 格式化比率（0-100 -> "66.7%"） */
function formatRate(rate: number | undefined | null): string {
  if (rate == null || Number.isNaN(rate)) return '-';
  return `${Number(rate).toFixed(1)}%`;
}

function toNum(v: number | undefined | null): number {
  if (v == null || Number.isNaN(v)) return 0;
  return Number(v);
}

export function RequirementDetailView({ requirement, detail, onBack }: RequirementDetailViewProps) {
  const contributorList = useMemo(() => detail?.executorContributionList ?? [], [detail?.executorContributionList]);
  const maxContribution = useMemo(
    () => (contributorList.length ? Math.max(...contributorList.map((c) => c.caseCount ?? 0), 1) : 1),
    [contributorList]
  );
  const [sortBy, setSortBy] = useState<string>('execCount');

  const caseList = useMemo(() => detail?.caseExecutionList ?? [], [detail?.caseExecutionList]);

  const blockReasonList = useMemo(() => detail?.blockReasonDistribution ?? [], [detail?.blockReasonDistribution]);
  const blockReasonChartData = useMemo(() => {
    const total = blockReasonList.reduce((s, i) => s + (i.value ?? 0), 0);
    return blockReasonList.map((item, idx) => ({
      name: item.name,
      value: item.value ?? 0,
      percent: total > 0 ? ((item.value ?? 0) / total) * 100 : 0,
      color: PIE_COLORS_BLOCK[idx % PIE_COLORS_BLOCK.length],
    }));
  }, [blockReasonList]);

  const changeReasonList = useMemo(() => detail?.changeReasonDistribution ?? [], [detail?.changeReasonDistribution]);
  const changeReasonChartData = useMemo(() => {
    const total = changeReasonList.reduce((s, i) => s + (i.value ?? 0), 0);
    return changeReasonList.map((item, idx) => ({
      name: item.name,
      value: item.value ?? 0,
      percent: total > 0 ? ((item.value ?? 0) / total) * 100 : 0,
      color: PIE_COLORS_CHANGE[idx % PIE_COLORS_CHANGE.length],
    }));
  }, [changeReasonList]);

  const executionTrendList = useMemo(() => detail?.executionTrendList ?? [], [detail?.executionTrendList]);
  const executionTrendChartData = useMemo(
    () =>
      executionTrendList.map((d) => ({
        date: d.date,
        通过: d.passed ?? 0,
        失败: d.failed ?? 0,
        阻塞: d.blocked ?? 0,
        通过率: d.passRate ?? 0,
      })),
    [executionTrendList]
  );

  const priorityList = useMemo(() => detail?.priorityDistribution ?? [], [detail?.priorityDistribution]);
  const priorityChartData = useMemo(
    () =>
      priorityList.map((item, idx) => ({
        name: item.name,
        value: item.value ?? 0,
        color: PIE_COLORS_PRIORITY[idx % PIE_COLORS_PRIORITY.length],
      })),
    [priorityList]
  );

  const blockReasonTotal = useMemo(
    () => blockReasonChartData.reduce((s, i) => s + i.value, 0),
    [blockReasonChartData]
  );
  const changeReasonTotal = useMemo(
    () => changeReasonChartData.reduce((s, i) => s + i.value, 0),
    [changeReasonChartData]
  );
  const priorityTotal = useMemo(
    () => priorityChartData.reduce((s, i) => s + i.value, 0),
    [priorityChartData]
  );

  const sortedCaseList = useMemo(() => {
    const list = [...caseList];
    if (sortBy === 'execCount') return list.sort((a, b) => (b.execCount ?? 0) - (a.execCount ?? 0));
    if (sortBy === 'failCount') return list.sort((a, b) => (b.failCount ?? 0) - (a.failCount ?? 0));
    if (sortBy === 'avgTime') return list.sort((a, b) => (b.avgTimeSeconds ?? 0) - (a.avgTimeSeconds ?? 0));
    if (sortBy === 'failRate') return list.sort((a, b) => (b.failRate ?? 0) - (a.failRate ?? 0));
    if (sortBy === 'successRate') return list.sort((a, b) => (b.successRate ?? 0) - (a.successRate ?? 0));
    return list;
  }, [caseList, sortBy]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#0B1437] text-white">
      <div className="flex-shrink-0 bg-[#0D1740] border-b border-white/10 px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回列表</span>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{requirement.name}</h2>
              <p className="text-sm text-gray-400">
                负责人: <span className="text-gray-300">{requirement.owner}</span>
                <span className="mx-2">|</span>
                周期: <span className="text-gray-300">{requirement.period}</span>
                <span className="mx-2">|</span>
                状态:
                <span
                  className={`ml-2 px-2.5 py-1 text-xs rounded-full font-medium ${
                    requirement.status === '执行中' || requirement.status === '进行中'
                      ? 'bg-blue-500/20 text-blue-300'
                      : requirement.status === '已完成'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-gray-500/20 text-gray-300'
                  }`}
                >
                  {requirement.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 space-y-6 scrollbar-theme-dark-blue">
        <RequirementOverviewCards
          totalCases={requirement.totalCases}
          executedCases={requirement.executedCases}
          executionRate={requirement.executionRate}
          passRate={requirement.passRate}
          firstPassRate={
            detail?.benefitMetrics?.firstPassRate != null
              ? detail.benefitMetrics.firstPassRate
              : (requirement.firstPassRate ?? requirement.passRate)
          }
          avgDefectRatePer1k={requirement.totalDefectRatePer1k ?? null}
          avgExecutionTime={detail?.executionEfficiencyMetrics?.avgExecutionTime ?? null}
          savedHours={detail?.reuseMetrics?.absoluteTimeSavingsHours ?? null}
          showSubText={false}
        />

        <RequirementMetrics
          changeHeatMetrics={
            detail?.changeHeatMetrics
              ? {
                  caseIncreaseRate: toNum(detail.changeHeatMetrics.caseIncreaseRate),
                  newCases: toNum(detail.changeHeatMetrics.newCases),
                  existingCases: toNum(detail.changeHeatMetrics.existingCases),
                  caseChangeHeat: toNum(detail.changeHeatMetrics.caseChangeHeat),
                  modifiedCases: toNum(detail.changeHeatMetrics.modifiedCases),
                  totalCases: toNum(detail.changeHeatMetrics.totalCases),
                }
              : CHANGE_HEAT_METRICS
          }
          executionEfficiencyMetrics={
            detail?.executionEfficiencyMetrics
              ? {
                  avgExecutionTime: toNum(detail.executionEfficiencyMetrics.avgExecutionTime),
                  totalExecutionTime: toNum(detail.executionEfficiencyMetrics.totalExecutionTime),
                  executionCount: toNum(detail.executionEfficiencyMetrics.executionCount),
                  manualExecutionHeat: toNum(detail.executionEfficiencyMetrics.manualExecutionHeat),
                  highFreqRegressionScore: toNum(detail.executionEfficiencyMetrics.highFreqRegressionScore),
                  totalCaseScore: toNum(detail.executionEfficiencyMetrics.totalCaseScore),
                }
              : EXECUTION_EFFICIENCY_METRICS
          }
          benefitMetrics={
            detail?.benefitMetrics
              ? {
                  avgUQSScore: toNum(detail.benefitMetrics.avgUQSScore),
                  verificationDiscoveryRate: toNum(detail.benefitMetrics.verificationDiscoveryRate),
                  executabilityRate: toNum(detail.benefitMetrics.executabilityRate),
                  reuseRate: toNum(detail.benefitMetrics.reuseRate),
                  firstPassRate: toNum(detail.benefitMetrics.firstPassRate),
                  firstPassCount: toNum(detail.benefitMetrics.firstPassCount),
                  totalExecutionCount: toNum(detail.benefitMetrics.totalExecutionCount),
                }
              : BENEFIT_METRICS
          }
          workHourDeviationMetrics={
            detail?.workHourDeviation
              ? {
                  writingDeviationRate: toNum(detail.workHourDeviation.writingDeviationRate),
                  actualWritingHours: toNum(detail.workHourDeviation.actualWritingHours),
                  theoreticalWritingHours: toNum(detail.workHourDeviation.theoreticalWritingHours),
                  executionDeviationRate: toNum(detail.workHourDeviation.executionDeviationRate),
                  actualExecutionMinutes: toNum(detail.workHourDeviation.actualExecutionMinutes),
                  theoreticalExecutionMinutes: toNum(detail.workHourDeviation.theoreticalExecutionMinutes),
                }
              : WORK_HOUR_DEVIATION_METRICS
          }
          reuseMetrics={
            detail?.reuseMetrics
              ? {
                  caseReuseRate: toNum(detail.reuseMetrics.reuseRateByCount),
                  reusedCases: toNum(detail.reuseMetrics.reusedCaseCount),
                  totalCases: toNum(detail.reuseMetrics.totalCaseCount),
                  workloadReuseRate: toNum(detail.reuseMetrics.reuseRateByWorkload),
                  reusedCSScore: toNum(detail.reuseMetrics.reusedCsTotal),
                  totalCSScore: toNum(detail.reuseMetrics.totalCsTotal),
                  savedHours: toNum(detail.reuseMetrics.absoluteTimeSavingsHours),
                }
              : REUSE_METRICS
          }
          workHourMetrics={
            detail?.workHourByLevel
              ? (() => {
                  const w = detail.workHourByLevel;
                  const basic = toNum(w.expectedWriteMinutesL1);
                  const medium = toNum(w.expectedWriteMinutesL2);
                  const complex = toNum(w.expectedWriteMinutesL3);
                  const highDifficulty = toNum(w.expectedWriteMinutesL4);
                  const execBasic = toNum(w.expectedExecMinutesL1);
                  const execMedium = toNum(w.expectedExecMinutesL2);
                  const execComplex = toNum(w.expectedExecMinutesL3);
                  const execHigh = toNum(w.expectedExecMinutesL4);
                  return {
                    expectedWritingTime: basic + medium + complex + highDifficulty,
                    expectedWritingBreakdown: { basic, medium, complex, highDifficulty },
                    expectedExecutionTime: execBasic + execMedium + execComplex + execHigh,
                    expectedExecutionBreakdown: {
                      basic: execBasic,
                      medium: execMedium,
                      complex: execComplex,
                      highDifficulty: execHigh,
                    },
                    actualWritingTime: toNum(w.actualWriteMinutesTotal),
                    actualExecutionTime: toNum(w.actualExecMinutesTotal),
                  };
                })()
              : WORK_HOUR_METRICS
          }
          codeQualityMetrics={
            detail != null
              ? {
                  frontendDefectRate: toNum(detail.frontendDefectRate),
                  frontendDefects: detail.frontendDefectCount ?? 0,
                  frontendCodeLines: detail.frontendLocChanged ?? 0,
                  backendDefectRate: toNum(detail.backendDefectRate),
                  backendDefects: detail.backendDefectCount ?? 0,
                  backendCodeLines: detail.backendLocChanged ?? 0,
                  overallDefectRate: toNum(detail.totalDefectRatePer1k),
                  totalDefects: (detail.frontendDefectCount ?? 0) + (detail.backendDefectCount ?? 0),
                  totalCodeLines: (detail.frontendLocChanged ?? 0) + (detail.backendLocChanged ?? 0),
                  codeCoverage: toNum(detail.codeCoverage),
                  reopenRate: detail.reopenRate ?? null,
                }
              : CODE_QUALITY_METRICS
          }
          releaseMetrics={
            detail != null
              ? {
                  changeSuccessRate: toNum(detail.changeSuccessRate),
                  successfulReleases: Math.max(0, (detail.deployTotalCount ?? 0) - (detail.deployFailureCount ?? 0)),
                  totalReleases: toNum(detail.deployTotalCount),
                  changeFailureRate: toNum(detail.changeFailureRate),
                  rollbackCount: toNum(detail.deployFailureCount),
                  hotfixCount: 0,
                }
              : RELEASE_METRICS
          }
        />

        <div className="grid grid-cols-2 gap-6">
          <Card className="rounded-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              用例执行趋势
            </h3>
            {executionTrendChartData.length === 0 ? (
              <p className="text-sm text-gray-400 py-12">暂无执行趋势数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={executionTrendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="left" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" style={{ fontSize: '12px' }} domain={[0, 100]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="通过" stackId="a" fill="#10B981" />
                  <Bar yAxisId="left" dataKey="失败" stackId="a" fill="#EF4444" />
                  <Bar yAxisId="left" dataKey="阻塞" stackId="a" fill="#F59E0B" />
                  <Line yAxisId="right" type="monotone" dataKey="通过率" stroke="#60A5FA" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                用例优先级分布
              </h3>
              {priorityChartData.length > 0 && (
                <span className="text-sm text-gray-300 font-medium">总数：<span className="text-white font-semibold">{priorityTotal}</span></span>
              )}
            </div>
            <div className="flex items-center justify-between">
              {priorityChartData.length === 0 ? (
                <p className="text-sm text-gray-400 py-8">暂无优先级数据</p>
              ) : (
                <>
                  <ResponsiveContainer width="55%" height={240}>
                    <PieChart>
                      <Pie data={priorityChartData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                        {priorityChartData.map((entry, index) => (
                          <Cell key={`priority-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <div style={TOOLTIP_STYLE} className="px-3 py-2 rounded-lg">
                              <span className="font-medium">{payload[0].name}：{payload[0].value}</span>
                            </div>
                          ) : null
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {priorityChartData.map((item, idx) => (
                      <div key={`priority-legend-${idx}`} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-300">{item.name}</span>
                        </div>
                        <span className="text-white font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                测试用例执行阻塞原因分布
              </h3>
              {blockReasonChartData.length > 0 && (
                <span className="text-sm text-gray-300 font-medium">总数：<span className="text-white font-semibold">{blockReasonTotal}</span></span>
              )}
            </div>
            <div className="flex items-center justify-between">
              {blockReasonChartData.length === 0 ? (
                <p className="text-sm text-gray-400 py-8">暂无阻塞原因数据</p>
              ) : (
                <>
                  <ResponsiveContainer width="60%" height={260}>
                    <PieChart>
                      <Pie
                        data={blockReasonChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: unknown) =>
                          `${(((props as { percent?: number }).percent ?? 0) * 100).toFixed(1)}%`
                        }
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {blockReasonChartData.map((entry, index) => (
                          <Cell key={`block-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <div style={TOOLTIP_STYLE} className="px-3 py-2 rounded-lg">
                              <span className="font-medium">{payload[0].name}：{payload[0].value}（{(blockReasonChartData.find((d) => d.name === payload[0].name)?.percent ?? 0).toFixed(1)}%）</span>
                            </div>
                          ) : null
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {blockReasonChartData.map((item, idx) => (
                      <div key={`block-legend-${idx}`} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-300 text-xs leading-tight">{item.name}</span>
                        </div>
                        <span className="text-white font-semibold ml-2">{item.value}（{item.percent.toFixed(1)}%）</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                用例变更原因分布
              </h3>
              {changeReasonChartData.length > 0 && (
                <span className="text-sm text-gray-300 font-medium">总数：<span className="text-white font-semibold">{changeReasonTotal}</span></span>
              )}
            </div>
            <div className="flex items-center justify-between">
              {changeReasonChartData.length === 0 ? (
                <p className="text-sm text-gray-400 py-8">暂无变更原因数据</p>
              ) : (
                <>
                  <ResponsiveContainer width="60%" height={260}>
                    <PieChart>
                      <Pie
                        data={changeReasonChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: unknown) =>
                          `${(((props as { percent?: number }).percent ?? 0) * 100).toFixed(1)}%`
                        }
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {changeReasonChartData.map((entry, index) => (
                          <Cell key={`change-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <div style={TOOLTIP_STYLE} className="px-3 py-2 rounded-lg">
                              <span className="font-medium">{payload[0].name}：{payload[0].value}（{(changeReasonChartData.find((d) => d.name === payload[0].name)?.percent ?? 0).toFixed(1)}%）</span>
                            </div>
                          ) : null
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {changeReasonChartData.map((item, idx) => (
                      <div key={`change-legend-${idx}`} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-300 text-xs leading-tight">{item.name}</span>
                        </div>
                        <span className="text-white font-semibold ml-2">{item.value}（{item.percent.toFixed(1)}%）</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="rounded-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" />
              执行人贡献度
            </h3>
            <div className="space-y-4">
              {contributorList.length === 0 ? (
                <p className="text-sm text-gray-400">暂无执行人贡献数据</p>
              ) : (
                contributorList.map((contributor, idx) => (
                  <div key={contributor.executorId ?? idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">
                        {contributor.executorName ?? contributor.executorId ?? '-'}
                      </span>
                      <span className="text-sm text-white font-semibold">{contributor.caseCount ?? 0} 用例</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${((contributor.caseCount ?? 0) / maxContribution) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* 区域一：用例执行明细 */}
        <Card className="rounded-xl bg-white/5 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <TrendingUp className="w-4 h-4" />
              用例执行明细
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">排序</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger
                  className="w-[140px] h-9 bg-white/5 border-0 text-white hover:bg-white/10 focus-visible:ring-0 focus-visible:outline-none"
                  aria-label="排序方式"
                >
                  <SelectValue placeholder="执行次数" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2744] border-0 text-white">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-white focus:bg-white/10 focus:text-white focus:ring-0 focus:outline-none"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-500">（默认执行次数倒序）</span>
            </div>
          </div>
          <div className="overflow-auto max-h-96 relative scrollbar-theme-dark-blue">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-[#1a2744] shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
                <tr className="border-b border-white/10">
                  <th className="text-center py-2 px-2 text-gray-300 font-semibold">排名</th>
                  <th className="text-left py-2 px-3 text-gray-300 font-semibold">用例名称</th>
                  <th className="text-center py-2 px-2 text-gray-300 font-semibold">失败次数</th>
                  <th className="text-center py-2 px-2 text-gray-300 font-semibold">成功次数</th>
                  <th className="text-center py-2 px-2 text-gray-300 font-semibold">平均耗时</th>
                  <th className="text-center py-2 px-2 text-gray-300 font-semibold">最大耗时</th>
                  <th className="text-center py-2 px-2 text-gray-300 font-semibold">失败率</th>
                  <th className="text-center py-2 px-2 text-gray-300 font-semibold">成功率</th>
                  <th className="text-left py-2 px-3 text-gray-300 font-semibold">失败原因</th>
                </tr>
              </thead>
              <tbody>
                {sortedCaseList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      暂无用例执行明细
                    </td>
                  </tr>
                ) : (
                  sortedCaseList.map((item: RequirementQualityCaseExecutionRowDTO, idx: number) => (
                    <tr key={item.planId && item.caseId ? `${item.planId}-${item.caseId}` : `row-${idx}`} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            idx === 0
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : idx === 1
                                ? 'bg-gray-400/20 text-gray-300'
                                : idx === 2
                                  ? 'bg-orange-500/20 text-orange-300'
                                  : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-200">{item.name ?? '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs font-medium">
                          {item.failCount ?? 0}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-green-400">{item.successCount ?? 0}</td>
                      <td className="py-2 px-2 text-center text-orange-400 font-semibold">
                        {formatDurationSeconds(item.avgTimeSeconds)}
                      </td>
                      <td className="py-2 px-2 text-center text-red-400 font-semibold">
                        {formatDurationSeconds(item.maxTimeSeconds)}
                      </td>
                      <td className="py-2 px-2 text-center text-red-400 font-semibold">
                        {formatRate(item.failRate)}
                      </td>
                      <td className="py-2 px-2 text-center text-green-400 font-semibold">
                        {formatRate(item.successRate)}
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{item.failReason ?? ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
