import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Filter,
  Search,
  Eye,
  Download,
  Trash2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Plus,
  X,
  Edit2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { workflowTestReportService } from '@/services/workflow-test-report';
import { TEST_REPORT_TAGS } from '@/constants';
import { cn } from '@/utils/cn';
import { useTestReportList, useTestReportTags, type UserInfo, type TestReport } from './test-report-list-page';
import { http } from '@/utils/request';

interface TestReportListPageProps {
  onViewReport?: (reportId: string) => void;
  isSubPage?: boolean;
}

export function TestReportListPage({ onViewReport: propOnViewReport, isSubPage = false }: TestReportListPageProps = {}) {
  const navigate = useNavigate();

  const onViewReport = propOnViewReport || ((reportId: string) => {
    navigate(`/test-factory/test-report/${reportId}`);
  });

  // 删除报告确认对话框状态
  const [deleteReportDialogOpen, setDeleteReportDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<{ reportId: string; reportName: string } | null>(null);

  // 使用 hooks 管理状态
  const reportList = useTestReportList();
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    viewMode,
    setViewMode,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    setTotalCount,
    isLoading,
    setIsLoading,
    jumpToPage,
    setJumpToPage,
    reports,
    setReports,
    listStats,
    setListStats,
  } = reportList;

  // 自动缩放：用 ResizeObserver 动态计算 scale，使内容始终单行不换行
  const scaleContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scaleContentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const containers = scaleContainerRefs.current;
    const contents = scaleContentRefs.current;
    if (containers.size === 0) return;

    const computeScale = () => {
      containers.forEach((container, key) => {
        const content = contents.get(key);
        if (!container || !content) return;
        // 先取消缩放，测量自然宽度
        content.style.transform = 'none';
        content.style.width = 'max-content';
        const naturalWidth = content.scrollWidth;
        const availableWidth = container.clientWidth;
        const scale = availableWidth >= naturalWidth ? 1 : availableWidth / naturalWidth;
        content.style.transform = `scale(${scale})`;
        content.style.width = `${100 / scale}%`;
      });
    };

    const ro = new ResizeObserver(() => {
      computeScale();
    });

    containers.forEach((el) => ro.observe(el));

    // 初次计算
    computeScale();

    return () => ro.disconnect();
  }, [reports]); // reports 变化时重新绑定

  // 需要先定义这些变量，因为它们会在 loadReports 中使用
  const [userMap, setUserMap] = useState<Map<string, UserInfo>>(new Map());

  /**
   * 加载用户列表
   */
  useEffect(() => {
    const loadUserList = async () => {
      try {
        const response = await http.get('/system/user/list/public');
        let userList: UserInfo[] = [];
        if (Array.isArray(response) && response.length > 0) {
          userList = response.map((u: any) => ({
            id: u.id,
            name: u.name || u.email || u.id,
            email: u.email || '',
          }));
        } else if (response && typeof response === 'object' && 'code' in response) {
          if (response.code === 100200 && Array.isArray(response.data)) {
            userList = response.data.map((u: any) => ({
              id: u.id,
              name: u.name || u.email || u.id,
              email: u.email || '',
            }));
          }
        }
        if (userList.length > 0) {
          const map = new Map<string, UserInfo>();
          userList.forEach(user => {
            map.set(user.id, user);
          });
          setUserMap(map);
        }
      } catch (error) {
        console.error('加载用户列表失败:', error);
      }
    };
    loadUserList();
  }, []);

  /**
   * 加载测试报告列表
   */
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const startTime = dateRange !== 'all' ? getStartTimeByRange(dateRange) : undefined;
      const endTime = dateRange !== 'all' ? getEndTimeByRange() : undefined;

      const listParams = {
        current: currentPage,
        pageSize: pageSize,
        keyword: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        startTime,
        endTime,
      };

      const response = await workflowTestReportService.getTestReportPage(listParams);

      setTotalCount(response.total || 0);

      // 计算统计数据 (基于当前页的数据进行统计，或如果后端有更合适的全量统计可替换)
      const rawList = response.list || [];
      const completedList = rawList.filter(r => r.status === 'COMPLETED');
      const avgSuccessRate = completedList.length > 0
        ? completedList.reduce((sum, r) => {
          const tw = r.totalWorkflows || 0;
          const sw = r.successWorkflows || 0;
          if (tw > 0 && sw != null) {
            return sum + (sw / tw * 100);
          }
          return sum + (typeof r.successRate === 'number' ? r.successRate : Number(r.successRate || 0));
        }, 0) / completedList.length
        : 0;

      setListStats({
        total: response.total ?? 0,
        completed: completedList.length,
        running: rawList.filter(r => r.status === 'RUNNING').length,
        failed: rawList.filter(r => r.status === 'FAILED').length,
        avgSuccessRate: avgSuccessRate,
      });

      // 转换后端数据为前端格式
      const convertedReports: TestReport[] = rawList.map(report => {
        // 映射后端状态到前端状态
        let mappedStatus: 'completed' | 'running' | 'failed' = 'completed';
        if (report.status === 'COMPLETED') {
          mappedStatus = 'completed';
        } else if (report.status === 'RUNNING') {
          mappedStatus = 'running';
        } else if (report.status === 'FAILED') {
          mappedStatus = 'failed';
        }

        // 计算执行时长（秒）：所有 workflow 执行耗时的总和（保留小数）
        let executionDurationSeconds = 0;
        if (report.executionDurationMs != null && report.executionDurationMs > 0) {
          // 保留小数，不要四舍五入到整数
          executionDurationSeconds = report.executionDurationMs / 1000;
        }

        // 计算报告生成耗时（秒）：从reportId生成到所有workflow完成的时间差（保留小数）
        let generationDurationSeconds = 0;
        if (report.durationMs != null && report.durationMs > 0) {
          // 保留小数，不要四舍五入到整数
          generationDurationSeconds = report.durationMs / 1000;
        } else if (report.startTime && report.endTime) {
          // 如果没有 durationMs，从 startTime 和 endTime 计算（保留小数）
          generationDurationSeconds = (report.endTime - report.startTime) / 1000;
        }

        // 将执行人ID映射为用户名
        const executorId = report.executor;
        const executorName = userMap.get(executorId)?.name || executorId || '未知';

        return {
          id: report.reportId,
          name: report.reportName,
          createdAt: formatTimestamp(report.createdAt),
          executor: executorName,
          totalTests: report.totalTests || 0,
          successTests: report.successTests || 0,
          successWorkflows: report.successWorkflows,
          failedTests: report.failedTests || 0,
          failedWorkflows: report.failedWorkflows,
          successRate: (() => {
            // 成功率 = 成功工作流个数 / 总工作流个数 * 100
            const sw = report.successWorkflows;
            const tw = report.totalWorkflows || 0;
            if (sw != null && tw > 0) {
              return Math.round(sw / tw * 10000) / 100; // 保留两位小数
            }
            // fallback: 后端返回的基于节点数的成功率
            return typeof report.successRate === 'number' ? report.successRate : Number(report.successRate || 0);
          })(),
          executionDuration: executionDurationSeconds,
          generationDuration: generationDurationSeconds,
          status: mappedStatus,
          workflows: report.totalWorkflows || 0,
          tags: report.tags || [],
          reportType: report.reportType,
          // 保留其他必要的字段
          projectId: report.projectId,
          triggerType: report.triggerType,
          startTime: report.startTime,
          endTime: report.endTime,
          skippedTests: report.skippedTests || 0,
          pendingTests: report.pendingTests || 0,
          avgDurationSeconds: report.avgDurationSeconds || 0,
          summary: report.summary,
          environmentId: report.environmentId,
          environmentName: report.environmentName,
          updatedAt: report.updatedAt,
        };
      });

      setReports(convertedReports);
    } catch (error: any) {
      console.error('加载测试报告失败:', error);
      const msg = error?.message || '';
      const isPermissionError = msg.includes('没有权限') || msg.includes('无权限') || msg.includes('403');
      toast.error(isPermissionError
        ? '您没有权限查看测试报告，请联系项目管理员开通「工作流测试报告」查看权限。'
        : `加载测试报告失败: ${msg || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, dateRange, userMap]);

  // 当 userMap 更新时，重新映射已加载的报告的执行人字段
  useEffect(() => {
    if (userMap.size > 0 && reports.length > 0) {
      const updatedReports = reports.map(report => {
        // 如果当前显示的是ID（数字字符串），尝试重新映射
        if (report.executor && /^\d+$/.test(report.executor)) {
          const userInfo = userMap.get(report.executor);
          if (userInfo) {
            return { ...report, executor: userInfo.name };
          }
        }
        return report;
      });
      setReports(updatedReports);
    }
  }, [userMap]);

  /**
   * 根据时间范围获取开始时间戳
   */
  const getStartTimeByRange = (range: string): number => {
    const now = new Date();
    switch (range) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      case '7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
      case '30days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
      default:
        return 0;
    }
  };

  /**
   * 获取结束时间戳（当前时间）
   */
  const getEndTimeByRange = (): number => {
    return Date.now();
  };

  /**
   * 格式化时间戳为字符串（优化显示格式）
   */
  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  /**
   * 加载测试报告列表（在组件挂载和依赖变化时）
   */
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // 在 loadReports 定义后使用 useTestReportTags
  const tags = useTestReportTags(loadReports);
  const {
    editingReportId,
    setEditingReportId,
    editingTags,
    setEditingTags,
    newTagInput,
    setNewTagInput,
    tagInputOpen,
    setTagInputOpen,
    deleteTagDialogOpen,
    setDeleteTagDialogOpen,
    tagToDelete,
    setTagToDelete,
    handleStartEditTags,
    handleAddTag,
    handleDeleteTag,
    handleSaveTags,
    handleCancelEditTags,
  } = tags;

  // 打开删除标签确认对话框（编辑模式）
  const handleRemoveTag = (tagToRemove: string) => {
    if (editingReportId) {
      setTagToDelete({ reportId: editingReportId, tag: tagToRemove, isEditing: true });
      setDeleteTagDialogOpen(true);
    }
  };

  // 打开删除标签确认对话框（显示模式）
  const handleRemoveTagFromReport = (reportId: string, tagToRemove: string) => {
    setTagToDelete({ reportId, tag: tagToRemove, isEditing: false });
    setDeleteTagDialogOpen(true);
  };

  // 确认删除标签
  const handleConfirmDeleteTag = async () => {
    if (!tagToDelete) return;

    try {
      if (tagToDelete.isEditing) {
        setEditingTags(prev => prev.filter(tag => tag !== tagToDelete.tag));
      } else {
        const report = reports.find(r => r.id === tagToDelete.reportId);
        if (!report) return;

        const updatedTags = report.tags.filter(tag => tag !== tagToDelete.tag);
        await workflowTestReportService.updateTestReportTags(tagToDelete.reportId, updatedTags);

        setReports(prev => prev.map(r =>
          r.id === tagToDelete.reportId ? { ...r, tags: updatedTags } : r
        ));

        toast.success('标签已删除');
      }

      setDeleteTagDialogOpen(false);
      setTagToDelete(null);
    } catch (error: any) {
      console.error('删除标签失败:', error);
      toast.error(`删除标签失败: ${error.message || '未知错误'}`);
      setDeleteTagDialogOpen(false);
      setTagToDelete(null);
    }
  };

  const handleAddTagLocal = () => {
    const trimmedTag = newTagInput.trim();
    if (trimmedTag && !editingTags.includes(trimmedTag)) {
      setEditingTags(prev => [...prev, trimmedTag]);
      setNewTagInput('');
      setTagInputOpen(false);
    } else if (editingTags.includes(trimmedTag)) {
      toast.error('标签已存在');
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTagLocal();
    }
  };

  // 根据标签名称生成颜色
  const getTagColor = (tag: string) => {
    // 预定义的颜色列表
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
      { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
      { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
      { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
      { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
      { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
      { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
      { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
      { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
    ];

    // 基于标签名称的简单哈希算法
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const handleDeleteReport = (reportId: string, reportName: string) => {
    setReportToDelete({ reportId, reportName });
    setDeleteReportDialogOpen(true);
  };

  const handleConfirmDeleteReport = async () => {
    if (!reportToDelete) return;

    try {
      await workflowTestReportService.deleteTestReport(reportToDelete.reportId);
      toast.success('删除成功');
      setDeleteReportDialogOpen(false);
      setReportToDelete(null);
      // 重新加载列表
      loadReports();
    } catch (error: any) {
      console.error('删除报告失败:', error);
      toast.error(`删除失败: ${error.message || '未知错误'}`);
    }
  };

  // 获取报告类型显示文本（只显示中文）
  const getReportTypeText = (type?: 'MANUAL' | 'AUTO' | 'SCHEDULE') => {
    switch (type) {
      case 'MANUAL':
        return '手动生成';
      case 'AUTO':
        return '自动生成';
      case 'SCHEDULE':
        return '定时生成';
      default:
        return '手动生成';
    }
  };

  // 统计数据
  // 顶部五指标使用后端 /stats 接口返回的全量统计，与列表同筛选条件
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">已完成</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">运行中</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">失败</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">未知</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';

    // 如果是小数且小于1秒，显示两位小数
    if (seconds < 1) {
      return `${seconds.toFixed(2)}s`;
    }

    // 如果小于10秒，显示一位小数（去掉尾部的.0）
    if (seconds < 10) {
      const formatted = seconds.toFixed(1);
      // 去掉尾部的.0
      return formatted.endsWith('.0') ? `${Math.floor(seconds)}s` : `${formatted}s`;
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    // 大于等于10秒，显示整数
    return `${secs}s`;
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const canGoToPrev = currentPage > 1;
  const canGoToNext = currentPage < totalPages;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 处理页码跳转
  const handleJumpToPage = () => {
    if (jumpToPage === '' || jumpToPage === 0) return;
    const pageNum = typeof jumpToPage === 'string' ? parseInt(jumpToPage, 10) : jumpToPage;
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpToPage(''); // 清空输入框
    } else {
      toast.error(`请输入有效的页码（1-${totalPages}）`);
      setJumpToPage(''); // 清空无效输入
    }
  };

  // 处理跳转输入框的键盘事件
  const handleJumpToPageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleJumpToPage();
    }
  };

  return (
    <div className={cn("flex-1 bg-gray-50", !isSubPage && "overflow-y-auto")}>
      <div className={cn(isSubPage ? "p-0" : "p-8")}>
        {/* Header - 仅在非子页模式下显示大标题 */}
        {!isSubPage && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl text-gray-900 mb-2">测试报告</h1>
                <p className="text-gray-600">用例实现测试报告管理</p>
              </div>
              <Button
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  toast.info('测试报告导出功能正在开发中，敬请期待');
                }}
              >
                <FileText className="w-4 h-4" />
                生成新报告
              </Button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card className="bg-white border-gray-100 hover:shadow-md transition-shadow shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm mb-1">总报告数</div>
                <div className="text-2xl text-gray-900">{listStats.total}</div>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="bg-white border-gray-100 hover:shadow-md transition-shadow shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm mb-1">已完成</div>
                <div className="text-2xl text-gray-900">{listStats.completed}</div>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="bg-white border-gray-100 hover:shadow-md transition-shadow shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm mb-1">成功</div>
                <div className="text-2xl text-gray-900">{listStats.running}</div>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="bg-white border-gray-100 hover:shadow-md transition-shadow shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm mb-1">失败</div>
                <div className="text-2xl text-gray-900">{listStats.failed}</div>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="bg-white border-gray-100 hover:shadow-md transition-shadow shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm mb-1">平均成功率</div>
                <div className="text-2xl text-gray-900">{typeof listStats.avgSuccessRate === 'number' ? listStats.avgSuccessRate.toFixed(1) : listStats.avgSuccessRate}%</div>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            <Input
              placeholder="搜索报告名称、ID或执行人..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // 搜索时重置到第一页
              }}
              className="pl-10 h-10 border border-gray-200 bg-white hover:border-blue-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-colors rounded-lg"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: 'all' | 'completed' | 'running' | 'failed') => {
            setStatusFilter(value);
            setCurrentPage(1); // 筛选时重置到第一页
          }}>
            <SelectTrigger className="w-36 h-10 border border-gray-200 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20 transition-colors rounded-lg">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="completed">
                <span className="text-green-700">已完成</span>
              </SelectItem>
              <SelectItem value="running">
                <span className="text-blue-700">运行中</span>
              </SelectItem>
              <SelectItem value="failed">
                <span className="text-red-700">失败</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={(value: 'all' | 'today' | '7days' | '30days') => {
            setDateRange(value);
            setCurrentPage(1); // 时间范围变化时重置到第一页
          }}>
            <SelectTrigger className="w-36 h-10 border border-gray-200 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20 transition-colors rounded-lg">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部时间</SelectItem>
              <SelectItem value="today">今天</SelectItem>
              <SelectItem value="7days">最近7天</SelectItem>
              <SelectItem value="30days">最近30天</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Report Cards */}
        {isLoading ? (
          <Card className="bg-white border-gray-100 shadow-sm p-12">
            <div className="text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-pulse" />
              <h3 className="text-lg text-gray-900 mb-2">加载中...</h3>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card
                key={report.id}
                className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-6 rounded-xl hover:-translate-y-0.5"
              >
                <div className="w-full">
                  {/* 1. 报告名称和标签 + 操作按钮 */}
                  <div className="w-full flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg text-gray-900">{report.name}</h3>
                      {getStatusBadge(report.status)}
                      {editingReportId === report.id ? (
                        // 编辑模式
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingTags.map((tag, idx) => {
                            const tagColor = getTagColor(tag);
                            return (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`text-xs flex items-center gap-1 group relative ${tagColor.bg} ${tagColor.text} ${tagColor.border}`}
                              >
                                {tag}
                                <button
                                  onClick={() => handleRemoveTag(tag)}
                                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                          <div className="flex items-center gap-1 relative">
                            <Input
                              value={newTagInput}
                              onChange={(e) => setNewTagInput(e.target.value)}
                              onFocus={() => setTagInputOpen(true)}
                              onBlur={() => {
                                // 延迟关闭，以便点击下拉项时不会立即关闭
                                setTimeout(() => setTagInputOpen(false), 200);
                              }}
                              onKeyDown={handleTagInputKeyDown}
                              className="h-6 w-28 text-xs border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            {tagInputOpen && (
                              <div
                                className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
                                onMouseDown={(e) => e.preventDefault()} // 防止点击下拉菜单时触发 onBlur
                              >
                                {TEST_REPORT_TAGS
                                  .filter(tag =>
                                    (newTagInput.trim() === '' || tag.toLowerCase().includes(newTagInput.toLowerCase()))
                                  )
                                  .length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-gray-500 text-center">没有找到匹配的标签</div>
                                ) : (
                                  <div className="py-1">
                                    {TEST_REPORT_TAGS
                                      .filter(tag =>
                                        (newTagInput.trim() === '' || tag.toLowerCase().includes(newTagInput.toLowerCase()))
                                      )
                                      .map((tag) => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => {
                                            setNewTagInput(tag);
                                            handleAddTag(report.id, tag);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        >
                                          {tag}
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleSaveTags(report.id)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                              onClick={handleCancelEditTags}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // 显示模式
                        <div className="flex items-center gap-2 flex-wrap">
                          {report.tags.map((tag, idx) => {
                            const tagColor = getTagColor(tag);
                            return (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`text-xs flex items-center gap-1 group relative ${tagColor.bg} ${tagColor.text} ${tagColor.border}`}
                              >
                                {tag}
                                <button
                                  onClick={() => handleRemoveTagFromReport(report.id, tag)}
                                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-gray-400 hover:text-blue-600 rounded-full"
                            onClick={() => handleStartEditTags(report)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5"
                        onClick={() => onViewReport(report.id)}
                      >
                        <Eye className="w-4 h-4" />
                        详情
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-gray-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
                        onClick={() => handleDeleteReport(report.id, report.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </Button>
                    </div>
                  </div>

                  {/* 2. 统计信息 - 优化对齐 */}
                  <div className="grid grid-cols-6 gap-6 mb-4 py-3 border-y border-gray-100/50">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">成功率</div>
                      <div className={cn(
                        "text-sm font-semibold",
                        report.successRate >= 90 ? "text-green-600" : report.successRate >= 60 ? "text-amber-600" : "text-red-600"
                      )}>
                        {report.successRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">测试通过 / 总数</div>
                      <div className="text-sm text-gray-900 font-medium">
                        <span className="text-green-600">{report.successTests}</span>
                        <span className="text-gray-300 mx-1">/</span>
                        <span>{report.totalTests}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">执行耗时</div>
                      <div className="text-sm text-gray-900 font-medium">{formatDuration(report.executionDuration)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">执行环境</div>
                      <div className="text-sm text-gray-900 font-medium truncate" title={report.environmentName || '-'}>
                        {report.environmentName || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">执行人</div>
                      <div className="text-sm text-gray-900 font-medium truncate">{report.executor}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">触发类型</div>
                      <div className="text-sm text-gray-700 font-medium">{getReportTypeText(report.triggerType)}</div>
                    </div>
                  </div>

                  {/* 3. 创建时间 */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        创建于 {report.createdAt}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-300 font-mono">
                      ID: {report.id}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* 分页 - 与测试计划一致 */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-[#f9fafb]/50 flex-shrink-0">
                <div className="flex items-center text-sm text-gray-500">
                  共 <span className="font-medium text-gray-900 mx-1">{totalCount}</span> 条报告
                  <div className="w-px h-4 bg-gray-200 mx-4" />
                  每页显示
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="inline-flex h-9 w-20 mx-2 border-gray-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 40, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  条
                </div>
                <div className="flex items-center gap-6">
                  <Pagination className="w-auto m-0">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={cn('h-9 px-3 cursor-pointer hover:bg-white border-gray-200 transition-all', !canGoToPrev && 'pointer-events-none opacity-40')}
                        />
                      </PaginationItem>
                      {(() => {
                        const items: React.ReactNode[] = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }
                        if (startPage > 1) {
                          items.push(
                            <PaginationItem key={1}>
                              <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
                            </PaginationItem>
                          );
                          if (startPage > 2) items.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis key="ellipsis-start-icon" /></PaginationItem>);
                        }
                        for (let i = startPage; i <= endPage; i++) {
                          items.push(
                            <PaginationItem key={i}>
                              <PaginationLink
                                onClick={() => handlePageChange(i)}
                                isActive={currentPage === i}
                                className={cn(
                                  'h-9 w-9 cursor-pointer transition-all',
                                  currentPage === i
                                    ? 'bg-[#165DFF] text-white hover:bg-[#165DFF]/90 border-[#165DFF]'
                                    : 'hover:bg-white border-gray-200'
                                )}
                              >
                                {i}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) items.push(<PaginationItem key="ellipsis-end"><PaginationEllipsis key="ellipsis-end-icon" /></PaginationItem>);
                          items.push(
                            <PaginationItem key={totalPages}>
                              <PaginationLink onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink>
                            </PaginationItem>
                          );
                        }
                        return items;
                      })()}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={cn('h-9 px-3 cursor-pointer hover:bg-white border-gray-200 transition-all', !canGoToNext && 'pointer-events-none opacity-40')}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <div className="flex items-center gap-2 pl-6 border-l border-gray-200">
                    <span className="text-sm text-gray-500 whitespace-nowrap">跳至</span>
                    <Input
                      className="w-14 h-9 px-1 text-center border-gray-200 bg-white"
                      value={jumpToPage}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setJumpToPage('');
                        } else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) setJumpToPage(num);
                        }
                      }}
                      onKeyDown={handleJumpToPageKeyDown}
                    />
                    <span className="text-sm text-gray-500 whitespace-nowrap">页</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 删除标签确认对话框 */}
      <AlertDialog open={deleteTagDialogOpen} onOpenChange={setDeleteTagDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除标签</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除标签 <span className="font-semibold text-gray-900">"{tagToDelete?.tag}"</span> 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTagToDelete(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTag}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除报告确认对话框 */}
      <AlertDialog
        open={deleteReportDialogOpen}
        onOpenChange={(open) => {
          setDeleteReportDialogOpen(open);
          if (!open) {
            setReportToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除报告</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除测试报告 <span className="font-semibold text-gray-900">"{reportToDelete?.reportName}"</span> 吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteReport}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
