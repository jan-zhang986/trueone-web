/**
 * SnapTest 模块组件
 * 包含用户筛选、数据获取、指标展示和图表展示
 */

import { useState, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, XCircle, Clock, Zap, Activity, Target, Users, AlertCircle, Lightbulb, X, ChevronUp, ChevronDown, HelpCircle, Calendar as CalendarIcon, ListChecks, Layers, Factory, ArrowUp, ArrowDown, Minus, BarChart3, Table2 } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, Sector, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { MetricCard, UserFilterBar } from '@/components/features/snap-test/components';
import { useUserFilter, useSnapTestData, useSnapTestCharts } from '@/components/features/snap-test/hooks';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissionCheck, useSystemAdminCheck } from '@/hooks/usePermissionCheck';
import type { SnapTestTimeRangeType, ComplexityDetailItem } from '@/types/snap-test';

export type { SnapTestMetrics } from '@/types/snap-test';

interface SnapTestModuleProps {
  timeRange?: SnapTestTimeRangeType;
  customDateRange?: { start: Date | null; end: Date | null };
}

export function SnapTestModule({ timeRange: initialTimeRange = 'week', customDateRange: initialCustomDateRange = { start: null, end: null } }: SnapTestModuleProps) {
  const { hasPermission, isCheckingPermission } = usePermissionCheck();
  const { isSystemAdmin } = useSystemAdminCheck();
  const canViewTables = isSystemAdmin === true; // 仅系统管理员可查看三个列表
  const filter = useUserFilter({ timeRange: initialTimeRange, customDateRange: initialCustomDateRange });
  const data = useSnapTestData(
    filter.getDateRange,
    filter.dimension,
    filter.selectedProject,
    filter.snapTestSelectedUsers,
    filter.comparisonMode,
    filter.availableUsers
  );
  const charts = useSnapTestCharts();
  const [showComplexityPanel, setShowComplexityPanel] = useState(false);
  const [isTipCollapsed, setIsTipCollapsed] = useState(true);
  const [isScoreTipCollapsed, setIsScoreTipCollapsed] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [userRankingView, setUserRankingView] = useState<'chart' | 'table'>('chart');
  const [portActivityView, setPortActivityView] = useState<'chart' | 'table'>('chart');
  const [onlineUserBounceKey, setOnlineUserBounceKey] = useState(0);
  const prevOnlineCountRef = useRef<number | null>(null);

  // 在线用户数值变化时重新播放跳动动画
  useEffect(() => {
    const count = data.onlineUserCount ?? null;
    if (prevOnlineCountRef.current !== count) {
      prevOnlineCountRef.current = count;
      setOnlineUserBounceKey((k) => k + 1);
    }
  }, [data.onlineUserCount]);

  // 升降率说明文案：同比/环比由筛选条件决定，通用展示
  const comparisonLabel = filter.comparisonMode === 'YOY' ? '同比' : '环比';

  return (
    <PermissionGate
      isCheckingPermission={isCheckingPermission}
      hasPermission={hasPermission}
      noPermissionFeatureName="数据监控大盘"
    >
    <div className="space-y-4">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-emerald-400 rounded"></div>
          <div>
            <h1 className="text-2xl font-bold text-white">AegisOne 数据监控大盘</h1>
            <p className="text-sm text-gray-400 mt-0.5">实时监控系统测试数据指标</p>
          </div>
        </div>
        
        <UserFilterBar
          dimension={filter.dimension}
          setDimension={filter.setDimension}
          comparisonMode={filter.comparisonMode}
          setComparisonMode={filter.setComparisonMode}
          timeRange={filter.timeRange}
          setTimeRange={filter.setTimeRange}
          customDateRange={filter.customDateRange}
          setCustomDateRange={filter.setCustomDateRange}
          showCustomDatePicker={filter.showCustomDatePicker}
          setShowCustomDatePicker={filter.setShowCustomDatePicker}
          selectedProject={filter.selectedProject}
          setSelectedProject={filter.setSelectedProject}
          projects={filter.projects}
          projectsLoading={filter.projectsLoading}
          snapTestSelectedUsers={filter.snapTestSelectedUsers}
          setSnapTestSelectedUsers={filter.setSnapTestSelectedUsers}
          showSnapTestUserPicker={filter.showSnapTestUserPicker}
          setShowSnapTestUserPicker={filter.setShowSnapTestUserPicker}
          availableUsers={filter.availableUsers}
          usersLoading={filter.usersLoading}
          userSearchQuery={filter.userSearchQuery}
          setUserSearchQuery={filter.setUserSearchQuery}
        />
      </header>
      
      {data.snapTestLoading && (
        <div className="text-center text-gray-400 py-4">加载 数据监控大盘 数据中...</div>
      )}
      
      {/* 第一行：测试计划总数 / AI用例数 / 用例实现数 / MQ测试数据总数 / MOCK总数 / 造数工厂总数 */}
      <div className="grid grid-cols-6 gap-4">
        {/* 测试计划总数 */}
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all cursor-help">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-green-400">
                  <Target className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 truncate">测试计划总数</span>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-white">
                    {(data.testPlanStats?.total ?? 0).toLocaleString()}
                  </span>
                  {data.testPlanStats?.comparison?.total && (
                    <div className="flex items-center gap-0.5">
                      {data.testPlanStats.comparison.total.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                      {data.testPlanStats.comparison.total.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                      {data.testPlanStats.comparison.total.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                      <span className={`text-xs font-medium ${
                        data.testPlanStats.comparison.total.changeType === 'up' ? 'text-emerald-400' :
                        data.testPlanStats.comparison.total.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {data.testPlanStats.comparison.total.changeType === 'flat' ? '持平' : `${(data.testPlanStats.comparison.total.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">总计划数</span>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
            <div className="space-y-3">
              <h4 className="text-green-400 text-base font-semibold">测试计划总数 · 升降率说明</h4>
              <div className="text-gray-400 text-sm space-y-3">
                {data.testPlanStats?.comparison?.total ? (
                  <div>
                    <div className="text-gray-300 font-medium">总数：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期 {data.testPlanStats.comparison.total.current} vs 上期 {data.testPlanStats.comparison.total.previous}，
                      变化 {data.testPlanStats.comparison.total.delta >= 0 ? '+' : ''}{data.testPlanStats.comparison.total.delta}，
                      {comparisonLabel} {(data.testPlanStats.comparison.total.changeRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                ) : null}
                {!data.testPlanStats?.comparison?.total && (
                  <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                )}
              </div>
              <div className="w-full h-0.5 bg-gray-600" />
              <div className="text-gray-500 text-xs">
                升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
              </div>
            </div>
          </TooltipContent>
        </UITooltip>

        {/* AI用例数 */}
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all cursor-help">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-amber-400">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 truncate">AI用例数</span>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-white">
                    {(data.aiCaseStats?.aiCaseCount ?? 0).toLocaleString()}
                  </span>
                  {data.aiCaseStats?.comparison?.aiCaseCount && (
                    <div className="flex items-center gap-0.5">
                      {data.aiCaseStats.comparison.aiCaseCount.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                      {data.aiCaseStats.comparison.aiCaseCount.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                      {data.aiCaseStats.comparison.aiCaseCount.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                      <span className={`text-xs font-medium ${
                        data.aiCaseStats.comparison.aiCaseCount.changeType === 'up' ? 'text-emerald-400' :
                        data.aiCaseStats.comparison.aiCaseCount.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {data.aiCaseStats.comparison.aiCaseCount.changeType === 'flat' ? '持平' : data.aiCaseStats.comparison.aiCaseCount.changeRate != null ? `${data.aiCaseStats.comparison.aiCaseCount.changeRate.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">AI 生成用例数</span>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
            <div className="space-y-3">
              <h4 className="text-amber-400 text-base font-semibold">AI用例数 · 升降率说明</h4>
              <div className="text-gray-400 text-sm space-y-3">
                {data.aiCaseStats ? (
                  <>
                    <div>
                      <div className="text-gray-300 font-medium">AI用例数：</div>
                      <div className="mt-0.5 text-gray-400">
                        当期 {data.aiCaseStats.aiCaseCount}，手动用例 {data.aiCaseStats.manualCaseCount}，AI占比 {data.aiCaseStats.aiRatio}%
                        {data.aiCaseStats.comparison?.aiCaseCount && (
                          <>；{comparisonLabel} 当期 {data.aiCaseStats.comparison.aiCaseCount.current} vs 上期 {data.aiCaseStats.comparison.aiCaseCount.previous}，
                            变化 {data.aiCaseStats.comparison.aiCaseCount.delta >= 0 ? '+' : ''}{data.aiCaseStats.comparison.aiCaseCount.delta}
                            {data.aiCaseStats.comparison.aiCaseCount.changeRate != null ? `，${data.aiCaseStats.comparison.aiCaseCount.changeRate.toFixed(1)}%` : ''}
                          </>
                        )}
                      </div>
                    </div>
                    {data.aiCaseStats.comparison?.manualCaseCount && (
                      <div>
                        <div className="text-gray-300 font-medium">手动用例数对比：</div>
                        <div className="mt-0.5 text-gray-400">
                          当期 {data.aiCaseStats.comparison.manualCaseCount.current} vs 上期 {data.aiCaseStats.comparison.manualCaseCount.previous}
                          {data.aiCaseStats.comparison.manualCaseCount.changeRate != null ? `，${comparisonLabel} ${data.aiCaseStats.comparison.manualCaseCount.changeRate.toFixed(1)}%` : ''}
                        </div>
                      </div>
                    )}
                    {data.aiCaseStats.comparison?.aiRatio && (
                      <div>
                        <div className="text-gray-300 font-medium">AI占比对比：</div>
                        <div className="mt-0.5 text-gray-400">
                          当期 {data.aiCaseStats.comparison.aiRatio.current}% vs 上期 {data.aiCaseStats.comparison.aiRatio.previous}%
                          {data.aiCaseStats.comparison.aiRatio.changeRate != null ? `，${comparisonLabel} ${data.aiCaseStats.comparison.aiRatio.changeRate.toFixed(1)}%` : ''}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                )}
              </div>
              <div className="w-full h-0.5 bg-gray-600" />
              <div className="text-gray-500 text-xs">
                升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
              </div>
            </div>
          </TooltipContent>
        </UITooltip>

        {/* 用例实现数 */}
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all cursor-help">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-purple-400">
                  <ListChecks className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 truncate">用例实现数</span>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-white">
                    {(data.automationStats?.total ?? 0).toLocaleString()}
                  </span>
                  {data.automationStats?.comparison?.total && (
                    <div className="flex items-center gap-0.5">
                      {data.automationStats.comparison.total.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                      {data.automationStats.comparison.total.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                      {data.automationStats.comparison.total.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                      <span className={`text-xs font-medium ${
                        data.automationStats.comparison.total.changeType === 'up' ? 'text-emerald-400' :
                        data.automationStats.comparison.total.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {data.automationStats.comparison.total.changeType === 'flat' ? '持平' : `${(data.automationStats.comparison.total.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">用例实现</span>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
            <div className="space-y-3">
              <h4 className="text-purple-400 text-base font-semibold">用例实现数 · 升降率说明</h4>
              <div className="text-gray-400 text-sm space-y-3">
                {data.automationStats?.comparison?.total ? (
                  <div>
                    <div className="text-gray-300 font-medium">总数：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期 {data.automationStats.comparison.total.current} vs 上期 {data.automationStats.comparison.total.previous}，
                      变化 {data.automationStats.comparison.total.delta >= 0 ? '+' : ''}{data.automationStats.comparison.total.delta}，
                      {comparisonLabel} {(data.automationStats.comparison.total.changeRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                ) : null}
                {!data.automationStats?.comparison?.total && (
                  <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                )}
              </div>
              <div className="w-full h-0.5 bg-gray-600" />
              <div className="text-gray-500 text-xs">
                升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
              </div>
            </div>
          </TooltipContent>
        </UITooltip>

        {/* MQ测试数据总数 */}
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all cursor-help">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 truncate">MQ测试数据总数</span>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-white">
                    {(data.mqStats?.total ?? data.metrics.mqUsageCount ?? 0).toLocaleString()}
                  </span>
                  {data.mqStats?.comparison?.total && (
                    <div className="flex items-center gap-0.5">
                      {data.mqStats.comparison.total.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                      {data.mqStats.comparison.total.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                      {data.mqStats.comparison.total.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                      <span className={`text-xs font-medium ${
                        data.mqStats.comparison.total.changeType === 'up' ? 'text-emerald-400' :
                        data.mqStats.comparison.total.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {data.mqStats.comparison.total.changeType === 'flat' ? '持平' : `${(data.mqStats.comparison.total.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    执行次数: <span className="text-gray-400 font-medium">{(data.mqStats?.usageCount ?? data.metrics.mqUsageCount ?? 0).toLocaleString()}</span>
                  </span>
                  {data.mqStats?.comparison?.usageCount && (
                    <div className="flex items-center gap-0.5">
                      {data.mqStats.comparison.usageCount.changeType === 'up' && <ArrowUp className="w-2.5 h-2.5 text-blue-400" />}
                      {data.mqStats.comparison.usageCount.changeType === 'down' && <ArrowDown className="w-2.5 h-2.5 text-orange-400" />}
                      {data.mqStats.comparison.usageCount.changeType === 'flat' && <Minus className="w-2.5 h-2.5 text-gray-500" />}
                      <span className={`text-xs ${
                        data.mqStats.comparison.usageCount.changeType === 'up' ? 'text-blue-400' :
                        data.mqStats.comparison.usageCount.changeType === 'down' ? 'text-orange-400' : 'text-gray-500'
                      }`}>
                        {data.mqStats.comparison.usageCount.changeType === 'flat' ? '持平' : `${(data.mqStats.comparison.usageCount.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
            <div className="space-y-3">
              <h4 className="text-blue-400 text-base font-semibold">MQ测试数据总数 · 升降率说明</h4>
              <div className="text-gray-400 text-sm space-y-3">
                {data.mqStats?.comparison?.total ? (
                  <div>
                    <div className="text-gray-300 font-medium">总数：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期 {data.mqStats.comparison.total.current} vs 上期 {data.mqStats.comparison.total.previous}，
                      变化 {data.mqStats.comparison.total.delta >= 0 ? '+' : ''}{data.mqStats.comparison.total.delta}，
                      {comparisonLabel} {(data.mqStats.comparison.total.changeRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                ) : null}
                {data.mqStats?.comparison?.usageCount ? (
                  <div>
                    <div className="text-gray-300 font-medium">执行次数：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期 {data.mqStats.comparison.usageCount.current} vs 上期 {data.mqStats.comparison.usageCount.previous}，
                      变化 {data.mqStats.comparison.usageCount.delta >= 0 ? '+' : ''}{data.mqStats.comparison.usageCount.delta}，
                      {comparisonLabel} {(data.mqStats.comparison.usageCount.changeRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                ) : null}
                {!data.mqStats?.comparison?.total && !data.mqStats?.comparison?.usageCount && (
                  <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                )}
              </div>
              <div className="w-full h-0.5 bg-gray-600" />
              <div className="text-gray-500 text-xs">
                升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
              </div>
            </div>
          </TooltipContent>
        </UITooltip>

        {/* MOCK总数 */}
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all cursor-help">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-pink-400">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 truncate">MOCK总数</span>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-white">
                    {(data.mockFactoryStats?.total ?? 0).toLocaleString()}
                  </span>
                  {data.mockFactoryStats?.comparison?.total && (
                    <div className="flex items-center gap-0.5">
                      {data.mockFactoryStats.comparison.total.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                      {data.mockFactoryStats.comparison.total.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                      {data.mockFactoryStats.comparison.total.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                      <span className={`text-xs font-medium ${
                        data.mockFactoryStats.comparison.total.changeType === 'up' ? 'text-emerald-400' :
                        data.mockFactoryStats.comparison.total.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {data.mockFactoryStats.comparison.total.changeType === 'flat' ? '持平' : `${(data.mockFactoryStats.comparison.total.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    执行次数: <span className="text-gray-400 font-medium">{(data.mockFactoryStats?.executionCount ?? 0).toLocaleString()}</span>
                  </span>
                  {data.mockFactoryStats?.comparison?.executionCount && (
                    <div className="flex items-center gap-0.5">
                      {data.mockFactoryStats.comparison.executionCount.changeType === 'up' && <ArrowUp className="w-2.5 h-2.5 text-blue-400" />}
                      {data.mockFactoryStats.comparison.executionCount.changeType === 'down' && <ArrowDown className="w-2.5 h-2.5 text-orange-400" />}
                      {data.mockFactoryStats.comparison.executionCount.changeType === 'flat' && <Minus className="w-2.5 h-2.5 text-gray-500" />}
                      <span className={`text-xs ${
                        data.mockFactoryStats.comparison.executionCount.changeType === 'up' ? 'text-blue-400' :
                        data.mockFactoryStats.comparison.executionCount.changeType === 'down' ? 'text-orange-400' : 'text-gray-500'
                      }`}>
                        {data.mockFactoryStats.comparison.executionCount.changeType === 'flat' ? '持平' : `${(data.mockFactoryStats.comparison.executionCount.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
            <div className="space-y-3">
              <h4 className="text-pink-400 text-base font-semibold">MOCK总数 · 升降率说明</h4>
              <div className="text-gray-400 text-sm space-y-3">
                {data.mockFactoryStats?.comparison?.total ? (
                  <div>
                    <div className="text-gray-300 font-medium">总数：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期 {data.mockFactoryStats.comparison.total.current} vs 上期 {data.mockFactoryStats.comparison.total.previous}，
                      变化 {data.mockFactoryStats.comparison.total.delta >= 0 ? '+' : ''}{data.mockFactoryStats.comparison.total.delta}，
                      {comparisonLabel} {(data.mockFactoryStats.comparison.total.changeRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                ) : null}
                {data.mockFactoryStats?.comparison?.executionCount ? (
                  <div>
                    <div className="text-gray-300 font-medium">执行次数：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期 {data.mockFactoryStats.comparison.executionCount.current} vs 上期 {data.mockFactoryStats.comparison.executionCount.previous}，
                      变化 {data.mockFactoryStats.comparison.executionCount.delta >= 0 ? '+' : ''}{data.mockFactoryStats.comparison.executionCount.delta}，
                      {comparisonLabel} {(data.mockFactoryStats.comparison.executionCount.changeRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                ) : null}
                {!data.mockFactoryStats?.comparison?.total && !data.mockFactoryStats?.comparison?.executionCount && (
                  <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                )}
              </div>
              <div className="w-full h-0.5 bg-gray-600" />
              <div className="text-gray-500 text-xs">
                升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
              </div>
            </div>
          </TooltipContent>
        </UITooltip>

        {/* 造数工厂总数 */}
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all cursor-help">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-blue-400">
                  <Factory className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400 truncate">造数工厂总数</span>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-white">
                    {(data.dataFactoryStats?.total ?? data.metrics.dataFactoryExecutionCount ?? 0).toLocaleString()}
                  </span>
                  {data.dataFactoryStats?.comparison?.total && (
                    <div className="flex items-center gap-0.5">
                      {data.dataFactoryStats.comparison.total.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                      {data.dataFactoryStats.comparison.total.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                      {data.dataFactoryStats.comparison.total.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                      <span className={`text-xs font-medium ${
                        data.dataFactoryStats.comparison.total.changeType === 'up' ? 'text-emerald-400' :
                        data.dataFactoryStats.comparison.total.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {data.dataFactoryStats.comparison.total.changeType === 'flat' ? '持平' : `${(data.dataFactoryStats.comparison.total.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    执行次数: <span className="text-gray-400 font-medium">{(data.dataFactoryStats?.executionCount ?? data.metrics.dataFactoryExecutionCount ?? 0).toLocaleString()}</span>
                  </span>
                  {data.dataFactoryStats?.comparison?.executionCount && (
                    <div className="flex items-center gap-0.5">
                      {data.dataFactoryStats.comparison.executionCount.changeType === 'up' && <ArrowUp className="w-2.5 h-2.5 text-blue-400" />}
                      {data.dataFactoryStats.comparison.executionCount.changeType === 'down' && <ArrowDown className="w-2.5 h-2.5 text-orange-400" />}
                      {data.dataFactoryStats.comparison.executionCount.changeType === 'flat' && <Minus className="w-2.5 h-2.5 text-gray-500" />}
                      <span className={`text-xs ${
                        data.dataFactoryStats.comparison.executionCount.changeType === 'up' ? 'text-blue-400' :
                        data.dataFactoryStats.comparison.executionCount.changeType === 'down' ? 'text-orange-400' : 'text-gray-500'
                      }`}>
                        {data.dataFactoryStats.comparison.executionCount.changeType === 'flat' ? '持平' : `${(data.dataFactoryStats.comparison.executionCount.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
            <div className="space-y-3">
              <h4 className="text-blue-400 text-base font-semibold">造数工厂总数 · 升降率说明</h4>
              <div className="text-gray-400 text-sm space-y-3">
                {data.dataFactoryStats?.comparison?.total ? (
                  <div>
                    <div className="text-gray-300 font-medium">总数：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期 {data.dataFactoryStats.comparison.total.current} vs 上期 {data.dataFactoryStats.comparison.total.previous}，
                      变化 {data.dataFactoryStats.comparison.total.delta >= 0 ? '+' : ''}{data.dataFactoryStats.comparison.total.delta}，
                      {comparisonLabel} {(data.dataFactoryStats.comparison.total.changeRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                ) : null}
                {data.dataFactoryStats?.comparison?.executionCount ? (
                  <div>
                    <div className="text-gray-300 font-medium">执行次数：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期 {data.dataFactoryStats.comparison.executionCount.current} vs 上期 {data.dataFactoryStats.comparison.executionCount.previous}，
                      变化 {data.dataFactoryStats.comparison.executionCount.delta >= 0 ? '+' : ''}{data.dataFactoryStats.comparison.executionCount.delta}，
                      {comparisonLabel} {(data.dataFactoryStats.comparison.executionCount.changeRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                ) : null}
                {!data.dataFactoryStats?.comparison?.total && !data.dataFactoryStats?.comparison?.executionCount && (
                  <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                )}
              </div>
              <div className="w-full h-0.5 bg-gray-600" />
              <div className="text-gray-500 text-xs">
                升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
              </div>
            </div>
          </TooltipContent>
        </UITooltip>
      </div>

      {/* 第二行：一行展示 — 左 自动化运行总数，右 E2E成功率，中间竖线分隔；升降持平样式与第一行一致 */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all flex items-center flex-nowrap gap-0">
          {/* 左侧：自动化运行总数 */}
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="flex-1 min-w-0 flex items-center flex-nowrap gap-3 cursor-help">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-yellow-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex items-center flex-nowrap gap-2 min-w-0">
                  <span className="text-gray-400 text-sm whitespace-nowrap flex-shrink-0">自动化运行总数</span>
                  <span className="text-3xl font-bold text-white whitespace-nowrap">
                    {(data.automationRunStats?.total ?? data.metrics.automationEfficiency ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                  </span>
                  {data.automationRunStats?.comparison?.total ? (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {data.automationRunStats.comparison.total.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                      {data.automationRunStats.comparison.total.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                      {data.automationRunStats.comparison.total.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                      <span className={`text-xs font-medium ${
                        data.automationRunStats.comparison.total.changeType === 'up' ? 'text-emerald-400' :
                        data.automationRunStats.comparison.total.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {data.automationRunStats.comparison.total.changeType === 'flat' ? '持平' : `${(data.automationRunStats.comparison.total.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Minus className="w-3 h-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-400">0.0%</span>
                    </div>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
              <div className="space-y-3">
                <h4 className="text-yellow-400 text-base font-semibold">自动化运行总数 · 升降率说明</h4>
                <div className="text-gray-400 text-sm space-y-3">
                  {data.automationRunStats?.comparison?.total ? (
                    <div>
                      <div className="text-gray-300 font-medium">总数：</div>
                      <div className="mt-0.5 text-gray-400">
                        当期 {data.automationRunStats.comparison.total.current} vs 上期 {data.automationRunStats.comparison.total.previous}，
                        变化 {data.automationRunStats.comparison.total.delta >= 0 ? '+' : ''}{data.automationRunStats.comparison.total.delta}，
                        {comparisonLabel} {(data.automationRunStats.comparison.total.changeRate ?? 0).toFixed(1)}%
                      </div>
                    </div>
                  ) : null}
                  {!data.automationRunStats?.comparison?.total && (
                    <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                  )}
                </div>
                <div className="w-full h-0.5 bg-gray-600" />
                <div className="text-gray-500 text-xs">
                  升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
                </div>
              </div>
            </TooltipContent>
          </UITooltip>
          <div className="w-px h-10 bg-gray-600 flex-shrink-0 self-center" aria-hidden />
          {/* 右侧：E2E成功率 */}
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="flex-1 min-w-0 flex items-center flex-nowrap gap-3 pl-6 justify-end cursor-help">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-green-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-gray-400 text-sm whitespace-nowrap flex-shrink-0">E2E成功率</span>
                <span className="text-3xl font-bold text-white whitespace-nowrap">
                  {(data.automationRunStats?.successRate ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="text-gray-400 text-lg whitespace-nowrap">%</span>
                {data.automationRunStats?.comparison?.successCount ? (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {data.automationRunStats.comparison.successCount.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                    {data.automationRunStats.comparison.successCount.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                    {data.automationRunStats.comparison.successCount.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                    <span className={`text-xs font-medium ${
                      data.automationRunStats.comparison.successCount.changeType === 'up' ? 'text-emerald-400' :
                      data.automationRunStats.comparison.successCount.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {data.automationRunStats.comparison.successCount.changeType === 'flat' ? '持平' : `${(data.automationRunStats.comparison.successCount.changeRate ?? 0).toFixed(1)}%`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Minus className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-400">0.0%</span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
              <div className="space-y-3">
                <h4 className="text-green-400 text-base font-semibold">E2E成功率 · 升降率说明</h4>
                <div className="text-gray-400 text-sm space-y-3">
                  <div>
                    <div className="text-gray-300 font-medium">成功率：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期 E2E 成功率 {(data.automationRunStats?.successRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                  {data.automationRunStats?.comparison?.successCount ? (
                    <div>
                      <div className="text-gray-300 font-medium">成功次数：</div>
                      <div className="mt-0.5 text-gray-400">
                        当期 {data.automationRunStats.comparison.successCount.current} vs 上期 {data.automationRunStats.comparison.successCount.previous}，
                        变化 {data.automationRunStats.comparison.successCount.delta >= 0 ? '+' : ''}{data.automationRunStats.comparison.successCount.delta}，
                        {comparisonLabel} {(data.automationRunStats.comparison.successCount.changeRate ?? 0).toFixed(1)}%
                      </div>
                    </div>
                  ) : null}
                  {!data.automationRunStats?.comparison?.successCount && (
                    <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                  )}
                </div>
                <div className="w-full h-0.5 bg-gray-600" />
                <div className="text-gray-500 text-xs">
                  升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
                </div>
              </div>
            </TooltipContent>
          </UITooltip>
        </div>
      </div>

      {/* 功能用例执行总数 + 执行成功率（一行，左总数右成功率） */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 hover:bg-gray-800/70 transition-all flex items-center flex-nowrap gap-0">
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="flex-1 min-w-0 flex items-center flex-nowrap gap-3 cursor-help">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-cyan-400">
                  <ListChecks className="w-6 h-6" />
                </div>
                <div className="flex items-center flex-nowrap gap-2 min-w-0">
                  <span className="text-gray-400 text-sm whitespace-nowrap flex-shrink-0">功能用例执行总数</span>
                  <span className="text-3xl font-bold text-white whitespace-nowrap">
                    {(data.functionalCaseExecutionStats?.total ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                  </span>
                  {data.functionalCaseExecutionStats?.comparison?.total ? (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {data.functionalCaseExecutionStats.comparison.total.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                      {data.functionalCaseExecutionStats.comparison.total.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                      {data.functionalCaseExecutionStats.comparison.total.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                      <span className={`text-xs font-medium ${
                        data.functionalCaseExecutionStats.comparison.total.changeType === 'up' ? 'text-emerald-400' :
                        data.functionalCaseExecutionStats.comparison.total.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {data.functionalCaseExecutionStats.comparison.total.changeType === 'flat' ? '持平' : `${(data.functionalCaseExecutionStats.comparison.total.changeRate ?? 0).toFixed(1)}%`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Minus className="w-3 h-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-400">—</span>
                    </div>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
              <div className="space-y-3">
                <h4 className="text-cyan-400 text-base font-semibold">功能用例执行总数 · 升降率说明</h4>
                <div className="text-gray-400 text-sm space-y-3">
                  {data.functionalCaseExecutionStats?.comparison?.total ? (
                    <div>
                      <div className="text-gray-300 font-medium">总数：</div>
                      <div className="mt-0.5 text-gray-400">
                        当期 {data.functionalCaseExecutionStats.comparison.total.current} vs 上期 {data.functionalCaseExecutionStats.comparison.total.previous}，
                        变化 {data.functionalCaseExecutionStats.comparison.total.delta >= 0 ? '+' : ''}{data.functionalCaseExecutionStats.comparison.total.delta}，
                        {comparisonLabel} {(data.functionalCaseExecutionStats.comparison.total.changeRate ?? 0).toFixed(1)}%
                      </div>
                    </div>
                  ) : null}
                  {!data.functionalCaseExecutionStats?.comparison?.total && (
                    <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                  )}
                </div>
                <div className="w-full h-0.5 bg-gray-600" />
                <div className="text-gray-500 text-xs">
                  升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
                </div>
              </div>
            </TooltipContent>
          </UITooltip>
          <div className="w-px h-10 bg-gray-600 flex-shrink-0 self-center" aria-hidden />
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="flex-1 min-w-0 flex items-center flex-nowrap gap-3 pl-6 justify-end cursor-help">
                <div className="p-2 rounded-lg bg-gray-700/50 flex-shrink-0 text-teal-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-gray-400 text-sm whitespace-nowrap flex-shrink-0">执行成功率</span>
                <span className="text-3xl font-bold text-white whitespace-nowrap">
                  {(data.functionalCaseExecutionStats?.successRate ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="text-gray-400 text-lg whitespace-nowrap">%</span>
                {data.functionalCaseExecutionStats?.comparison?.successCount ? (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {data.functionalCaseExecutionStats.comparison.successCount.changeType === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                    {data.functionalCaseExecutionStats.comparison.successCount.changeType === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                    {data.functionalCaseExecutionStats.comparison.successCount.changeType === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
                    <span className={`text-xs font-medium ${
                      data.functionalCaseExecutionStats.comparison.successCount.changeType === 'up' ? 'text-emerald-400' :
                      data.functionalCaseExecutionStats.comparison.successCount.changeType === 'down' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {data.functionalCaseExecutionStats.comparison.successCount.changeType === 'flat' ? '持平' : `${(data.functionalCaseExecutionStats.comparison.successCount.changeRate ?? 0).toFixed(1)}%`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Minus className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-400">—</span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm bg-gray-800 border-gray-700 p-4 shadow-xl">
              <div className="space-y-3">
                <h4 className="text-teal-400 text-base font-semibold">执行成功率 · 升降率说明</h4>
                <div className="text-gray-400 text-sm space-y-3">
                  <div>
                    <div className="text-gray-300 font-medium">成功率：</div>
                    <div className="mt-0.5 text-gray-400">
                      当期执行成功率 {(data.functionalCaseExecutionStats?.successRate ?? 0).toFixed(1)}%
                    </div>
                  </div>
                  {data.functionalCaseExecutionStats?.comparison?.successCount ? (
                    <div>
                      <div className="text-gray-300 font-medium">成功次数：</div>
                      <div className="mt-0.5 text-gray-400">
                        当期 {data.functionalCaseExecutionStats.comparison.successCount.current} vs 上期 {data.functionalCaseExecutionStats.comparison.successCount.previous}，
                        变化 {data.functionalCaseExecutionStats.comparison.successCount.delta >= 0 ? '+' : ''}{data.functionalCaseExecutionStats.comparison.successCount.delta}，
                        {comparisonLabel} {(data.functionalCaseExecutionStats.comparison.successCount.changeRate ?? 0).toFixed(1)}%
                      </div>
                    </div>
                  ) : null}
                  {!data.functionalCaseExecutionStats?.comparison?.successCount && (
                    <p className="text-gray-500">暂无对比数据（当前为{comparisonLabel}）</p>
                  )}
                </div>
                <div className="w-full h-0.5 bg-gray-600" />
                <div className="text-gray-500 text-xs">
                  升降率 = (当期 − 上期) / 上期 × 100%，当前为{comparisonLabel}对比，持平表示当期与上期相同
                </div>
              </div>
            </TooltipContent>
          </UITooltip>
        </div>
      </div>

      {/* 第三行：自动化发现bug数 / 造数提效总时长 / 造数提效总占比率 / 工具类频度 / 用户活跃度 — 与设计稿一致 */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          title="自动化发现bug数"
          value={0}
          unit=""
          icon={AlertCircle}
          color="text-red-400"
          subtitle={
            <div className="text-right text-[10px] text-gray-400 leading-tight break-words max-w-full">
              严重(0) / 高(0) / 中(0)
            </div>
          }
          hoverContent={
            <div className="space-y-3">
              <div>
                <h4 className="text-red-400 text-lg font-semibold mb-2">自动化发现bug数</h4>
                <p className="text-gray-400 text-sm">统计周期内自动化发现的 bug 总数，按严重程度分布</p>
              </div>
            </div>
          }
        />
        <MetricCard
          title="造数提效总时长"
          value={data.metrics.dataGenerationEfficiencyTime ?? 0}
          unit="h"
          icon={Zap}
          color="text-green-400"
          subtitle={
            (data.dataGenerationEfficiencyStats?.total_estimated_time != null || data.dataGenerationEfficiencyStats?.total_save_execution_time != null) ? (
              <div className="text-right text-[10px] text-gray-400 leading-tight break-words max-w-full">
                {data.dataGenerationEfficiencyStats?.total_estimated_time != null && (
                  <span className="inline">
                    基准({data.dataGenerationEfficiencyStats.total_estimated_time.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}h)
                  </span>
                )}
                {data.dataGenerationEfficiencyStats?.total_estimated_time != null && data.dataGenerationEfficiencyStats?.total_save_execution_time != null && (
                  <span className="mx-1 inline">-</span>
                )}
                {data.dataGenerationEfficiencyStats?.total_save_execution_time != null && (
                  <span className="inline">
                    实际({data.dataGenerationEfficiencyStats.total_save_execution_time.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}h)
                  </span>
                )}
              </div>
            ) : (
              <div className="text-right text-[10px] text-gray-400">基准 实际</div>
            )
          }
          hoverContent={
            <div className="space-y-3">
              <div>
                <h4 className="text-green-400 text-lg font-semibold mb-2">造数提效总时长</h4>
                <div className="text-gray-400 text-sm space-y-1">
                  <p>
                    人工替代基准：按 "手动用例执行理论时长" 计算（即造数复杂度对应基础时间）{' '}
                    <span
                      className="text-green-400 underline cursor-pointer hover:text-green-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowComplexityPanel(true);
                      }}
                    >
                      点击查看详情
                    </span>
                  </p>
                  <p>造数工厂实际耗时：脚本启动、执行、结果生成时间，不含人工干预时间</p>
                </div>
              </div>
              <div className="w-full h-0.5 bg-gray-600" />
              <div>
                <div className="text-gray-400 text-sm mb-1">计算公式:</div>
                <div className="text-green-400 text-sm">
                  造数提效总时长 = 人工替代基准耗时 - 造数工厂实际耗时
                </div>
              </div>
            </div>
          }
        />
        <MetricCard
          title="造数提效总占比率"
          value={data.metrics.dataGenerationEfficiencyRatio ?? 0}
          unit="%"
          icon={TrendingUp}
          color="text-blue-400"
          hoverContent={
            <div className="space-y-3">
              <div>
                <h4 className="text-blue-400 text-lg font-semibold mb-2">造数提效总占比率</h4>
                <p className="text-gray-400 text-sm">
                  衡量 "通过造数工厂执行替代人工执行" 所节省的人工工作量占比率
                </p>
              </div>
              <div className="w-full h-0.5 bg-gray-600" />
              <div>
                <div className="text-gray-400 text-sm mb-1">计算公式:</div>
                <div className="text-blue-400 text-sm">
                  造数提效总占比率 = [（人工替代基准耗时 - 造数工厂实际耗时） ÷ 人工替代基准耗时] × 100%
                </div>
              </div>
            </div>
          }
        />
        <MetricCard
          title="用户采纳度"
          value={data.metrics.toolAdoptionRate ?? 0}
          unit="%"
          icon={Target}
          color="text-purple-400"
          subtitle={
            <div className="text-right text-[10px] text-gray-400 leading-tight break-words max-w-full">
              使用人数({data.toolAdoptionRateDetail?.activeUserCount ?? 0}) / 目标人群({data.toolAdoptionRateDetail?.targetUserCount ?? 0})
            </div>
          }
          hoverContent={
            <div className="space-y-3">
              <div>
                <h4 className="text-purple-400 text-lg font-semibold mb-2">用户采纳度</h4>
                <div className="text-gray-400 text-sm space-y-1">
                  <p>使用人数：统计周期内至少 1 次使用自动化核心功能的用户数（{data.toolAdoptionRateDetail?.activeUserCount ?? '--'}）</p>
                  <p>目标人群：需使用自动化工具的测试/研发人员总数（{data.toolAdoptionRateDetail?.targetUserCount ?? '--'}）</p>
                </div>
              </div>
              <div className="w-full h-0.5 bg-gray-600" />
              <div>
                <div className="text-gray-400 text-sm mb-1">当前数据:</div>
                <div className="text-purple-400 text-sm">
                  采纳率 = (使用人数:{data.toolAdoptionRateDetail?.activeUserCount ?? '--'} / 目标人群:{data.toolAdoptionRateDetail?.targetUserCount ?? 0}) × 100%
                </div>
              </div>
            </div>
          }
        />
        <MetricCard
          title="用户活跃度"
          value={data.metrics.userActivity ?? 0}
          unit=""
          icon={Users}
          color="text-orange-400"
          subtitle={
            <div className="text-right text-sm font-medium text-orange-300/90 leading-tight break-words max-w-full">
              在线用户(
              <span key={onlineUserBounceKey} className="animate-subtitle-value-bounce tabular-nums">
                {data.onlineUserCount ?? 0}
              </span>
              )
            </div>
          }
          hoverContent={
            <div className="space-y-3">
              <div>
                <h4 className="text-orange-400 text-lg font-semibold mb-2">用户活跃度</h4>
                <p className="text-gray-400 text-sm">
                  统计周期内，该用户对自动化核心功能（含查询、添加、执行等操作）的使用频次
                </p>
              </div>
            </div>
          }
        />
      </div>
      
      {(
        (data.metrics.leftShiftAutomationRate !== null && data.metrics.leftShiftAutomationRate !== undefined) ||
        (data.metrics.dataCostReductionRate !== null && data.metrics.dataCostReductionRate !== undefined) ||
        (data.metrics.automationBugDiscoveryRate !== null && data.metrics.automationBugDiscoveryRate !== undefined) ||
        (data.metrics.automationCriticalBugRate !== null && data.metrics.automationCriticalBugRate !== undefined) ||
        (data.metrics.automationCaseWritingDuration !== null && data.metrics.automationCaseWritingDuration !== undefined)
      ) && (
        <div className="grid grid-cols-5 gap-4">
          {data.metrics.leftShiftAutomationRate !== null && data.metrics.leftShiftAutomationRate !== undefined && (
            <MetricCard
              title="左移自动化率"
              value={data.metrics.leftShiftAutomationRate}
              unit="%"
              icon={Target}
              color="text-cyan-400"
            />
          )}
          {data.metrics.dataCostReductionRate !== null && data.metrics.dataCostReductionRate !== undefined && (
            <MetricCard
              title="数据成本降低率"
              value={data.metrics.dataCostReductionRate}
              unit="%"
              icon={TrendingUp}
              color="text-yellow-400"
            />
          )}
          {data.metrics.automationBugDiscoveryRate !== null && data.metrics.automationBugDiscoveryRate !== undefined && (
            <MetricCard
              title="自动化 Bug 发现率"
              value={data.metrics.automationBugDiscoveryRate}
              unit="%"
              icon={XCircle}
              color="text-red-400"
            />
          )}
          {data.metrics.automationCriticalBugRate !== null && data.metrics.automationCriticalBugRate !== undefined && (
            <MetricCard
              title="致命 Bug 发现占比"
              value={data.metrics.automationCriticalBugRate}
              unit="%"
              icon={AlertCircle}
              color="text-red-400"
            />
          )}
          {data.metrics.automationCaseWritingDuration !== null && data.metrics.automationCaseWritingDuration !== undefined && (
            <MetricCard
              title="用例实现编写时长"
              value={data.metrics.automationCaseWritingDuration}
              unit="h"
              icon={Clock}
              color="text-blue-400"
            />
          )}
        </div>
      )}

      {/* 图表区域 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 造数提效梯度统计 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">造数提效梯度统计</h3>
          {data.dataGenerationEfficiencyDetail.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.dataGenerationEfficiencyDetail}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const { name, percent, value, cx, cy, midAngle, outerRadius, fill } = props;
                    
                    // 如果值为0或percent为0，不显示标注和引导线
                    if ((value !== undefined && value !== null && value === 0) || 
                        (percent !== undefined && percent !== null && percent === 0)) {
                      return null;
                    }
                    
                    const RADIAN = Math.PI / 180;
                    
                    const lineStartX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                    const lineStartY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
                    
                    const lineMidRadius = outerRadius + 6;
                    const lineMidX = cx + lineMidRadius * Math.cos(-midAngle * RADIAN);
                    const lineMidY = cy + lineMidRadius * Math.sin(-midAngle * RADIAN);
                    
                    const isRight = lineMidX > cx;
                    
                    const labelOffsetX = isRight ? 50 : -50;
                    const labelX = lineMidX + labelOffsetX;
                    const labelY = lineMidY;
                    
                    const percentValue = percent !== undefined && percent !== null 
                      ? ((percent as number) * 100).toFixed(1) 
                      : '0.0';
                    
                    return (
                      <g>
                        <path
                          d={`M ${lineStartX} ${lineStartY} L ${lineMidX} ${lineMidY} L ${labelX} ${labelY}`}
                          stroke="#9CA3AF"
                          strokeWidth={1.5}
                          strokeOpacity={0.8}
                          fill="none"
                        />
                        <text
                          x={labelX}
                          y={labelY}
                          fill={fill || '#9CA3AF'}
                          textAnchor={isRight ? 'start' : 'end'}
                          dominantBaseline="central"
                          fontSize="13"
                          fontWeight="600"
                          style={{
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                          }}
                        >
                          {`${name} ${percentValue}%`}
                        </text>
                      </g>
                    );
                  }}
                  isAnimationActive={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  {...(charts.activePieIndex !== null && {
                    activeIndex: charts.activePieIndex,
                    activeShape: (props: any) => {
                      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                      return (
                        <Sector
                          cx={cx}
                          cy={cy}
                          innerRadius={innerRadius}
                          outerRadius={outerRadius + 15}
                          startAngle={startAngle}
                          endAngle={endAngle}
                          fill={fill}
                        />
                      );
                    }
                  })}
                  onMouseEnter={(data: any, index: number) => {
                    charts.setActivePieIndex(index);
                  }}
                  onMouseLeave={() => {
                    charts.setActivePieIndex(null);
                  }}
                >
                  {data.dataGenerationEfficiencyDetail.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={charts.PIE_COLORS[index % charts.PIE_COLORS.length]}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                          <div className="text-white font-medium mb-2">{data.name}</div>
                          <div className="space-y-1 text-sm">
                            <div className="text-gray-300">
                              提效比例: <span className="text-white font-semibold">{data.ratio?.toFixed(2) || '0.00'}%</span>
                            </div>
                            <div className="text-gray-300">
                              提效时长: <span className="text-white font-semibold">{data.value?.toFixed(2) || '0.00'}h</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: '#9CA3AF' }}
                  iconType="circle"
                  formatter={(value) => value}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 造数提效场景排行 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">造数场景热度排行</h3>
          {data.dataGenerationEfficiencyCallCount.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              暂无数据
            </div>
          ) : (
            <div className="h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
              <ResponsiveContainer width="100%" height={Math.max(300, data.dataGenerationEfficiencyCallCount.length * 35 + 50)}>
                <BarChart 
                  data={data.dataGenerationEfficiencyCallCount}
                  layout="vertical"
                  margin={{ top: 5, right: 60, left: 100, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="snapTestBarGradient" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
                      <stop offset="0%" stopColor="#1E40AF" />
                      <stop offset="100%" stopColor="#60A5FA" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis 
                    type="category" 
                    dataKey="biz_name" 
                    stroke="#9CA3AF"
                    width={100}
                    interval={0}
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      // 限制 biz_name 为15个字符，超过则省略
                      let displayText = payload.value || '';
                      if (displayText.length > 15) {
                        displayText = displayText.substring(0, 15) + '...';
                      }
                      return (
                        <text
                          x={x}
                          y={y}
                          textAnchor="end"
                          fill="#9CA3AF"
                          fontSize={12}
                        >
                          {displayText}
                        </text>
                      );
                    }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                            <div className="text-white font-medium mb-1">{data.biz_name}</div>
                            <div className="text-gray-400 text-xs mb-2">{data.related_id}</div>
                            <div className="text-gray-300 text-sm">
                              调用次数: <span className="text-white font-semibold">{data.call_count} 次</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ fill: '#4B5563', opacity: 0.3 }}
                  />
                  <Bar 
                    dataKey="call_count" 
                    fill="url(#snapTestBarGradient)" 
                    radius={[8, 8, 8, 8]}
                    label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      const labelX = x + width + 8;
                      const labelY = y + height / 2;
                      
                      return (
                          <text
                            x={labelX}
                            y={labelY}
                            fill="#60A5FA"
                            textAnchor="start"
                            dominantBaseline="central"
                            fontSize="13"
                            fontWeight="600"
                            fontFamily="system-ui, -apple-system, sans-serif"
                          >
                            {value}
                          </text>
                      );
                    }}
                  >
                    {data.dataGenerationEfficiencyCallCount.map((entry, index) => (
                      <Cell 
                        key={`cell-${entry.related_id}-${index}`}
                        fill="url(#snapTestBarGradient)"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 使用功能活跃 - 用户+模块类型维度，breakdown 对应 MOCK/SCRIPT/SQL/HTTP/DUBBO/TOOL/ROCKETMQ */}
      <div className="mb-6">
        <Card className="bg-gray-800/50 border-gray-700 p-6">
          {(() => {
            const functionActivityColumns: Array<{ key: keyof Omit<import('@/types/snap-test').UserFunctionActivityItem, 'name' | 'rank'>; label: string; color: string; textColor: string }> = [
              { key: 'mockFactory', label: 'Mock工厂', color: 'bg-white/80', textColor: 'text-gray-900' },
              { key: 'automation', label: '自动化', color: 'bg-blue-500', textColor: 'text-white' },
              { key: 'caseExecution', label: '功能用例执行', color: 'bg-indigo-500', textColor: 'text-white' },
              { key: 'dataFactory', label: '造数工厂', color: 'bg-purple-500', textColor: 'text-white' },
              { key: 'dbTool', label: '数据库工具', color: 'bg-yellow-500', textColor: 'text-white' },
              { key: 'httpTest', label: 'HTTP测试', color: 'bg-emerald-500', textColor: 'text-white' },
              { key: 'dubboTest', label: 'DUBBO测试', color: 'bg-orange-500', textColor: 'text-white' },
              { key: 'tool', label: '工具箱', color: 'bg-cyan-500', textColor: 'text-white' },
              { key: 'rocketmq', label: 'ROCKETMQ', color: 'bg-blue-400', textColor: 'text-white' },
            ];
            const getTotal = (u: import('@/types/snap-test').UserFunctionActivityItem) =>
              u.mockFactory + u.automation + u.caseExecution + u.dataFactory + u.dbTool + u.httpTest + u.dubboTest + u.tool + u.rocketmq;
            return (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">使用功能活跃</h3>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setUserRankingView('chart')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                        userRankingView === 'chart' ? 'bg-blue-500 text-white font-semibold' : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      图表
                    </button>
                    {canViewTables && (
                      <button
                        type="button"
                        onClick={() => setUserRankingView('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                          userRankingView === 'table' ? 'bg-blue-500 text-white font-semibold' : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <Table2 className="w-4 h-4" />
                        列表
                      </button>
                    )}
                  </div>
                </div>
                {data.userActivityLoading ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">加载中...</div>
                ) : !data.userFunctionActivityData?.length ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">暂无数据</div>
                ) : (userRankingView === 'table' && canViewTables) ? (
                  <div className="h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 w-12 min-w-12">排名</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 w-28 min-w-28">用户名</th>
                          {functionActivityColumns.map((col) => (
                            <th key={col.key} className="text-right py-3 px-3 text-xs font-semibold text-gray-400 w-20">{col.label}</th>
                          ))}
                          <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 w-16">总计</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.userFunctionActivityData.map((user, idx) => {
                          const total = getTotal(user);
                          return (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3 px-3 w-12 min-w-12">
                                {user.rank > 0 ? (
                                  <span className={`text-sm font-bold ${user.rank === 1 ? 'text-yellow-400' : user.rank === 2 ? 'text-gray-300' : 'text-orange-400'}`}>
                                    {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500">{idx + 1}</span>
                                )}
                              </td>
                              <td className="py-3 px-3 w-28 min-w-28"><span className="text-sm text-gray-300">{user.name}</span></td>
                              {functionActivityColumns.map((col) => {
                                const val = user[col.key] as number;
                                return (
                                  <td key={col.key} className="py-3 px-3 text-right">
                                    <span className={`text-sm font-medium ${val > 0 ? 'text-white' : 'text-gray-600'}`}>{val}</span>
                                  </td>
                                );
                              })}
                              <td className="py-3 px-3 text-right"><span className="text-sm font-bold text-white">{total}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : userRankingView === 'chart' || !canViewTables ? (
                  <div className="h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
                    <div className="space-y-3">
                    {data.userFunctionActivityData.map((user, idx) => {
                      const total = getTotal(user);
                      if (total === 0) return null;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-6 flex items-center justify-center">
                            {user.rank > 0 ? (
                              <span className={`text-sm font-bold ${user.rank === 1 ? 'text-yellow-400' : user.rank === 2 ? 'text-gray-300' : 'text-orange-400'}`}>
                                {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-sm text-gray-300 w-24 truncate">{user.name}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-7 overflow-hidden flex">
                            {functionActivityColumns.map((col) => {
                              const val = user[col.key] as number;
                              if (val <= 0) return null;
                              const pct = (val / total) * 100;
                              return (
                                <div
                                  key={col.key}
                                  className={`${col.color} h-full flex items-center justify-center`}
                                  style={{ width: `${pct}%` }}
                                  title={`${col.label}: ${val}`}
                                >
                                  {pct > 8 && <span className={`text-xs font-semibold ${col.textColor}`}>{val}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                ) : null}
                {(userRankingView === 'chart' || !canViewTables) && data.userFunctionActivityData?.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="text-xs">
                      <span className="text-gray-500">功能模块:</span>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {functionActivityColumns.map((col) => (
                          <div key={col.key} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-sm ${col.color}`} />
                            <span className="text-gray-400">{col.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </Card>
      </div>

      {/* 使用端口活跃 - 用户+业务类型维度 Web/Plugin/Electron */}
      <div className="mb-6">
        <Card className="bg-gray-800/50 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">使用端口活跃</h3>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setPortActivityView('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                  portActivityView === 'chart' ? 'bg-blue-500 text-white font-semibold' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                图表
              </button>
              {canViewTables && (
                <button
                  type="button"
                  onClick={() => setPortActivityView('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                    portActivityView === 'table' ? 'bg-blue-500 text-white font-semibold' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Table2 className="w-4 h-4" />
                  列表
                </button>
              )}
            </div>
          </div>
          {data.userActivityLoading ? (
            <div className="flex items-center justify-center h-[300px] text-gray-400">加载中...</div>
          ) : !data.portActivityData?.length ? (
            <div className="flex items-center justify-center h-[300px] text-gray-400">暂无数据</div>
          ) : (portActivityView === 'table' && canViewTables) ? (
            <div className="h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 w-12 min-w-12">排名</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 w-28 min-w-28">用户名</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-400">web</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-400">插件</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-400">客户端</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 w-16">总计</th>
                  </tr>
                </thead>
                <tbody>
                  {data.portActivityData.map((user, idx) => {
                    const total = user.ports.web.total + user.ports.plugin.total + user.ports.client.total;
                    return (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 w-12 min-w-12">
                          {user.rank > 0 ? (
                            <span className={`text-sm font-bold ${user.rank === 1 ? 'text-yellow-400' : user.rank === 2 ? 'text-gray-300' : 'text-orange-400'}`}>
                              {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 w-28 min-w-28"><span className="text-sm text-gray-300">{user.name}</span></td>
                        <td className="py-3 px-3 text-center"><span className={`text-sm font-bold ${user.ports.web.total > 0 ? 'text-white' : 'text-gray-600'}`}>{user.ports.web.total > 0 ? user.ports.web.total : '-'}</span></td>
                        <td className="py-3 px-3 text-center"><span className={`text-sm font-bold ${user.ports.plugin.total > 0 ? 'text-white' : 'text-gray-600'}`}>{user.ports.plugin.total > 0 ? user.ports.plugin.total : '-'}</span></td>
                        <td className="py-3 px-3 text-center"><span className={`text-sm font-bold ${user.ports.client.total > 0 ? 'text-white' : 'text-gray-600'}`}>{user.ports.client.total > 0 ? user.ports.client.total : '-'}</span></td>
                        <td className="py-3 px-3 text-right"><span className="text-sm font-bold text-white">{total}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
              <div className="space-y-3">
              {data.portActivityData.map((user, idx) => {
                const total = user.ports.web.total + user.ports.plugin.total + user.ports.client.total;
                if (total === 0) return null;
                const webPercent = (user.ports.web.total / total) * 100;
                const pluginPercent = (user.ports.plugin.total / total) * 100;
                const clientPercent = (user.ports.client.total / total) * 100;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 flex items-center justify-center">
                      {user.rank > 0 ? (
                        <span className={`text-sm font-bold ${user.rank === 1 ? 'text-yellow-400' : user.rank === 2 ? 'text-gray-300' : 'text-orange-400'}`}>
                          {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-sm text-gray-300 w-24 truncate">{user.name}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-7 overflow-hidden flex">
                      {user.ports.web.total > 0 && (
                        <div className="bg-gradient-to-r from-green-500 to-green-400 h-full flex items-center justify-center" style={{ width: `${webPercent}%` }} title={`web: ${user.ports.web.total}`}>
                          {webPercent > 10 && <span className="text-xs font-semibold text-white">{user.ports.web.total}</span>}
                        </div>
                      )}
                      {user.ports.plugin.total > 0 && (
                        <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-full flex items-center justify-center" style={{ width: `${pluginPercent}%` }} title={`插件: ${user.ports.plugin.total}`}>
                          {pluginPercent > 10 && <span className="text-xs font-semibold text-white">{user.ports.plugin.total}</span>}
                        </div>
                      )}
                      {user.ports.client.total > 0 && (
                        <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-full flex items-center justify-center" style={{ width: `${clientPercent}%` }} title={`客户端: ${user.ports.client.total}`}>
                          {clientPercent > 10 && <span className="text-xs font-semibold text-white">{user.ports.client.total}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
          {portActivityView === 'chart' && data.portActivityData?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="text-xs">
                <span className="text-gray-500">使用端口:</span>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500" /><span className="text-gray-400">web</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" /><span className="text-gray-400">插件</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-orange-500" /><span className="text-gray-400">客户端</span></div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 在线用户明细 - onlineUserStats.details 列表 */}
      <div className="mb-6">
        <Card className="bg-gray-800/50 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">在线用户明细</h3>
                <p className="text-xs text-gray-500 mt-0.5">当前在线用户及在线时长</p>
              </div>
            </div>
            {data.onlineUserDetails?.length != null && data.onlineUserDetails.length > 0 && (
              <span className="text-xs font-medium text-gray-400 bg-white/5 border border-white/10 rounded-md px-2.5 py-1">
                共 {data.onlineUserDetails.length} 人
              </span>
            )}
          </div>
          {data.userActivityLoading ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 gap-2">
              <div className="w-8 h-8 border-2 border-gray-600 border-t-emerald-500/80 rounded-full animate-spin" />
              <span className="text-sm">加载中...</span>
            </div>
          ) : !data.onlineUserDetails?.length ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 gap-2">
              <Users className="w-10 h-10 opacity-50" />
              <span className="text-sm">暂无在线用户</span>
            </div>
          ) : !canViewTables ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 gap-2 rounded-lg border border-white/10 bg-gray-900/40">
              <AlertCircle className="w-10 h-10 opacity-60" />
              <span className="text-sm">仅系统管理员可查看此列表</span>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-gray-900/40 h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-12 min-w-12" />
                  <col className="w-28 min-w-28" />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-gray-800/95 backdrop-blur-sm border-b border-white/10">
                  <tr>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400">序号</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400">用户名</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400">邮箱</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400">在线时长</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400">上线时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.onlineUserDetails.map((user, idx) => {
                    const totalSec = user.onlineDurationSeconds;
                    const days = Math.floor(totalSec / 86400);
                    const hours = Math.floor((totalSec % 86400) / 3600);
                    const minutes = Math.floor((totalSec % 3600) / 60);
                    const seconds = Math.floor(totalSec % 60);
                    const parts: string[] = [];
                    if (days > 0) parts.push(`${days}天`);
                    if (hours > 0 || days > 0) parts.push(`${hours}时`);
                    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}分`);
                    parts.push(`${seconds}秒`);
                    const durationText = totalSec >= 0 ? parts.join('') : '--';
                    const creationTimeText = user.creationTime
                      ? new Date(user.creationTime).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
                      : '--';
                    return (
                      <tr
                        key={user.userId ?? idx}
                        className={`border-b border-white/5 transition-colors hover:bg-white/5 ${idx % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
                      >
                        <td className="py-3 px-3 w-12 min-w-12">
                          <span className="text-sm text-gray-500 tabular-nums">{idx + 1}</span>
                        </td>
                        <td className="py-3 px-3 w-28 min-w-28">
                          <span className="text-sm font-medium text-gray-200">{user.name || '--'}</span>
                        </td>
                        <td className="py-3 px-3 min-w-0">
                          <span className="text-sm text-gray-400 truncate block" title={user.email}>{user.email || '--'}</span>
                        </td>
                        <td className="py-3 px-3 text-right min-w-0">
                          <span className="text-sm text-gray-300 tabular-nums font-mono" title={`${durationText}（${totalSec} 秒）`}>{durationText}</span>
                        </td>
                        <td className="py-3 px-3 text-right min-w-0">
                          <span className="text-sm text-gray-400 tabular-nums">{creationTimeText}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* 右侧滑出面板 - 造数复杂度等级明细 */}
      {showComplexityPanel && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setShowComplexityPanel(false)}
          />
          
          {/* 滑出面板 */}
          <div className={`fixed top-0 right-0 h-full w-[55%] bg-gray-900 border-l border-gray-700 z-50 shadow-2xl transform transition-transform duration-300 ease-out ${
            showComplexityPanel ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="h-full flex flex-col">
              {/* 头部 */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">造数复杂度等级明细</h2>
                <button
                  onClick={() => setShowComplexityPanel(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* 内容区域 */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {/* 提示区域 */}
                <div className="p-6 border-b border-gray-700">
                  <div 
                    className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 cursor-pointer hover:bg-blue-600/30 transition-colors"
                    onClick={() => setIsTipCollapsed(!isTipCollapsed)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lightbulb className="text-blue-400" size={20} />
                        <span className="text-blue-400 font-medium">复杂度等级说明</span>
                      </div>
                      {isTipCollapsed ? (
                        <ChevronDown className="text-blue-400" size={20} />
                      ) : (
                        <ChevronUp className="text-blue-400" size={20} />
                      )}
                    </div>
                    
                    {!isTipCollapsed && (
                      <div className="mt-4 space-y-3 text-sm text-gray-300">
                        <div>
                          <span className="font-semibold text-white">D0 简单</span>
                          <p className="mt-1 text-gray-400">无需造数，依赖固定数据；或仅需简单查询、或通过API 新增。</p>
                          <p className="text-gray-500 text-xs mt-1">人工估计5分钟</p>
                        </div>
                        <div>
                          <span className="font-semibold text-white">D1 较简单</span>
                          <p className="mt-1 text-gray-400">需通过 1-3 个独立 API 调用或简单 DB 插入构造数据。</p>
                          <p className="text-gray-500 text-xs mt-1">人工估计10分钟</p>
                        </div>
                        <div>
                          <span className="font-semibold text-white">D2 中等</span>
                          <p className="mt-1 text-gray-400">需通过链式 API 调用（超过 3 步，如注册-认证-充值）或至少经过2个微服务构造数据。</p>
                          <p className="text-gray-500 text-xs mt-1">人工估计30分钟</p>
                        </div>
                        <div>
                          <span className="font-semibold text-white">D3 较复杂</span>
                          <p className="mt-1 text-gray-400">需通过特定环境配置、消息队列或模拟复杂的外部系统状态才能构建数据、垮至少3个微服务进行数据构造。</p>
                          <p className="text-gray-500 text-xs mt-1">人工估计60分钟</p>
                        </div>
                        <div>
                          <span className="font-semibold text-white">D4 复杂</span>
                          <p className="mt-1 text-gray-400">需通过特定环境配置、消息队列或模拟复杂的外部系统状态才能构建数据、垮至少5个微服务进行数据构造。</p>
                          <p className="text-gray-500 text-xs mt-1">人工估计90分钟</p>
                        </div>
                        <div>
                          <span className="font-semibold text-white">D5 高</span>
                          <p className="mt-1 text-gray-400">需通过特定环境配置、消息队列或模拟复杂的外部系统状态才能构建数据、垮至少5个微服务且超过5个os文件操作或定时任务等高危操作进行数据构造。</p>
                          <p className="text-gray-500 text-xs mt-1">人工估计180分钟</p>
                        </div>
                        <div>
                          <span className="font-semibold text-white">D6 极高</span>
                          <p className="mt-1 text-gray-400">需通过特定环境配置、消息队列或模拟复杂的外部系统状态才能构建数据、垮至少5个微服务进行数据构造且超过10个大数量规则调用。</p>
                          <p className="text-gray-500 text-xs mt-1">人工估计450分钟</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 评分计算方式提示区域 */}
                <div className="p-6 border-b border-gray-700">
                  <div 
                    className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 cursor-pointer hover:bg-green-600/30 transition-colors"
                    onClick={() => setIsScoreTipCollapsed(!isScoreTipCollapsed)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <HelpCircle className="text-green-400" size={20} />
                        <span className="text-green-400 font-medium">评分计算方式</span>
                      </div>
                      {isScoreTipCollapsed ? (
                        <ChevronDown className="text-green-400" size={20} />
                      ) : (
                        <ChevronUp className="text-green-400" size={20} />
                      )}
                    </div>
                    
                    {!isScoreTipCollapsed && (
                      <div className="mt-4 space-y-3 text-sm text-gray-300">
                        <div>
                          <p><span className="font-medium text-white">基础分：</span>1分</p>
                        </div>
                        
                        <div>
                          <p className="font-medium text-white mb-2">各项权重：</p>
                          <div className="pl-4 space-y-1 text-gray-400">
                            <p>API调用：每个2分</p>
                            <p>DB操作：每个1分</p>
                            <p>SQL语句：每个0.7分</p>
                            <p>逻辑分支：每个0.7分</p>
                            <p>MQ操作：每个5分</p>
                            <p>高风险操作：每个4分</p>
                            <p>链式调用：每个2分</p>
                            <p>函数定义：每个1分（上限20分）</p>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <p className="text-gray-300">
                            总分为各项得分之和，最终根据总分和特定条件确定复杂度等级。
                          </p>
                        </div>

                        {/* 分割线 */}
                        <div className="w-full h-0.5 bg-green-500/30 my-3"></div>

                        {/* 确定复杂度等级规则 */}
                        <div>
                          <p className="font-medium text-white mb-2">确定复杂度等级：</p>
                          <div className="pl-4 space-y-1.5 text-gray-400">
                            <p><span className="font-semibold text-white">D6级别：</span>总分&gt;190 且 大数量规则调用&gt;10</p>
                            <p><span className="font-semibold text-white">D5级别：</span>总分&gt;165 且 高危操作&gt;5</p>
                            <p><span className="font-semibold text-white">D4级别：</span>总分&gt;115 且 API调用数≥5</p>
                            <p><span className="font-semibold text-white">D3级别：</span>总分&gt;90 且 高风险操作数&gt;1</p>
                            <p><span className="font-semibold text-white">D2级别：</span>总分&gt;60</p>
                            <p><span className="font-semibold text-white">D1级别：</span>总分&gt;35</p>
                            <p><span className="font-semibold text-white">D0级别：</span>总分≤35（默认最低级别）</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 列表区域 */}
                <div className="p-6">
                  {data.complexityDetail.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">暂无数据</div>
                  ) : (
                    (() => {
                      // 按 level 分组
                      const groupedByLevel = data.complexityDetail.reduce((acc, item) => {
                        const level = item.level || '未知';
                        if (!acc[level]) {
                          acc[level] = [];
                        }
                        acc[level].push(item);
                        return acc;
                      }, {} as Record<string, ComplexityDetailItem[]>);

                      // 按 level 排序（D0, D1, D2, ...）
                      const sortedLevels = Object.keys(groupedByLevel).sort((a, b) => {
                        // 提取 D 后面的数字
                        const aMatch = a.match(/^D(\d+)$/);
                        const bMatch = b.match(/^D(\d+)$/);
                        
                        // 如果都是标准格式（D0, D1, D2...），按数字排序
                        if (aMatch && bMatch) {
                          return parseInt(aMatch[1]) - parseInt(bMatch[1]);
                        }
                        
                        // 如果只有一个是标准格式，标准格式优先
                        if (aMatch && !bMatch) return -1;
                        if (!aMatch && bMatch) return 1;
                        
                        // 如果都不是标准格式，按字母顺序排序
                        return a.localeCompare(b);
                      });

                      return (
                        <div className="space-y-6">
                          {sortedLevels.map((level) => (
                            <div key={level}>
                              {/* 分组标题 */}
                              <div className="mb-3">
                                <h3 className="text-lg font-semibold text-white">
                                  {level}
                                  <span className="ml-2 text-sm text-gray-400 font-normal">
                                    ({groupedByLevel[level].length} 项)
                                  </span>
                                </h3>
                              </div>
                              
                              {/* 该分组下的列表项 */}
                              <div className="space-y-3">
                                {groupedByLevel[level].map((item, index) => {
                                  const isExpanded = expandedItems.has(item.related_id);
                                  const toggleExpand = () => {
                                    setExpandedItems((prev) => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(item.related_id)) {
                                        newSet.delete(item.related_id);
                                      } else {
                                        newSet.add(item.related_id);
                                      }
                                      return newSet;
                                    });
                                  };

                                  return (
                                    <div 
                                      key={`${item.related_id}-${index}`}
                                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition-colors cursor-pointer"
                                      onClick={toggleExpand}
                                    >
                                      {/* 默认显示：biz_name、related_id、level */}
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="text-white font-medium mb-1">{item.biz_name}</div>
                                          <div className="text-gray-400 text-sm">{item.related_id}</div>
                                        </div>
                                        <div className="ml-4 flex items-center gap-2">
                                          <span className={`px-3 py-1 rounded text-sm font-semibold ${
                                            item.level === 'D0' ? 'bg-gray-600 text-gray-200' :
                                            item.level === 'D1' ? 'bg-green-600/30 text-green-400' :
                                            item.level === 'D2' ? 'bg-blue-600/30 text-blue-400' :
                                            item.level === 'D3' ? 'bg-yellow-600/30 text-yellow-400' :
                                            item.level === 'D4' ? 'bg-orange-600/30 text-orange-400' :
                                            item.level === 'D5' ? 'bg-red-600/30 text-red-400' :
                                            'bg-purple-600/30 text-purple-400'
                                          }`}>
                                            {item.level}
                                          </span>
                                          {isExpanded ? (
                                            <ChevronUp className="text-gray-400" size={20} />
                                          ) : (
                                            <ChevronDown className="text-gray-400" size={20} />
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* 展开后显示的详细信息 */}
                                      {isExpanded && (
                                        <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-700">
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">总分</div>
                                            <div className="text-white font-semibold">{item.total_cs}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">基础分</div>
                                            <div className="text-white text-sm">{item.scores.base}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">API</div>
                                            <div className="text-white text-sm">{item.scores.api}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">DB</div>
                                            <div className="text-white text-sm">{item.scores.db}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">SQL</div>
                                            <div className="text-white text-sm">{item.scores.sql}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">逻辑</div>
                                            <div className="text-white text-sm">{item.scores.logic}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">MQ</div>
                                            <div className="text-white text-sm">{item.scores.mq}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">风险</div>
                                            <div className="text-white text-sm">{item.scores.risk}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">链式</div>
                                            <div className="text-white text-sm">{item.scores.chain}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-400 text-xs mb-1">函数</div>
                                            <div className="text-white text-sm">{item.scores.functions}</div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </PermissionGate>
  );
}

