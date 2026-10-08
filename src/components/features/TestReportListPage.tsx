import { useState } from 'react';
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
  Users
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

interface TestReport {
  id: string;
  name: string;
  createdAt: string;
  executor: string;
  totalTests: number;
  successTests: number;
  failedTests: number;
  successRate: number;
  duration: number;
  status: 'completed' | 'running' | 'failed';
  workflows: number;
  tags: string[];
}

interface TestReportListPageProps {
  onViewReport?: (reportId: string) => void;
}

export function TestReportListPage({ onViewReport }: TestReportListPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // 测试报告数据
  const reports: TestReport[] = [
    {
      id: 'RPT-2024-12-03-001',
      name: '电商平台完整功能测试',
      createdAt: '2024-12-03 15:30:25',
      executor: '张三',
      totalTests: 1247,
      successTests: 1151,
      failedTests: 96,
      successRate: 92.3,
      duration: 3845,
      status: 'completed',
      workflows: 15,
      tags: ['电商', '核心功能', '回归测试']
    },
    {
      id: 'RPT-2024-12-03-002',
      name: '用户认证模块测试',
      createdAt: '2024-12-03 14:15:10',
      executor: '李四',
      totalTests: 456,
      successTests: 448,
      failedTests: 8,
      successRate: 98.2,
      duration: 1234,
      status: 'completed',
      workflows: 8,
      tags: ['认证', '安全']
    },
    {
      id: 'RPT-2024-12-03-003',
      name: '订单支付流程测试',
      createdAt: '2024-12-03 13:45:00',
      executor: '王五',
      totalTests: 789,
      successTests: 701,
      failedTests: 88,
      successRate: 88.8,
      duration: 2567,
      status: 'completed',
      workflows: 12,
      tags: ['支付', '订单', '高优先级']
    },
    {
      id: 'RPT-2024-12-03-004',
      name: '商品管理系统测试',
      createdAt: '2024-12-03 16:00:00',
      executor: '赵六',
      totalTests: 534,
      successTests: 0,
      failedTests: 0,
      successRate: 0,
      duration: 890,
      status: 'running',
      workflows: 9,
      tags: ['商品', '库存']
    },
    {
      id: 'RPT-2024-12-02-001',
      name: '移动端适配测试',
      createdAt: '2024-12-02 18:20:30',
      executor: '孙七',
      totalTests: 623,
      successTests: 615,
      failedTests: 8,
      successRate: 98.7,
      duration: 1789,
      status: 'completed',
      workflows: 11,
      tags: ['移动端', 'H5']
    },
    {
      id: 'RPT-2024-12-02-002',
      name: '数据库性能压测',
      createdAt: '2024-12-02 16:10:15',
      executor: '周八',
      totalTests: 892,
      successTests: 734,
      failedTests: 158,
      successRate: 82.3,
      duration: 4521,
      status: 'completed',
      workflows: 6,
      tags: ['性能', '数据库', '压测']
    },
    {
      id: 'RPT-2024-12-02-003',
      name: 'API接口兼容性测试',
      createdAt: '2024-12-02 14:05:45',
      executor: '吴九',
      totalTests: 1023,
      successTests: 0,
      failedTests: 1023,
      successRate: 0,
      duration: 567,
      status: 'failed',
      workflows: 14,
      tags: ['API', '兼容性']
    },
    {
      id: 'RPT-2024-12-01-001',
      name: '用户体验流程测试',
      createdAt: '2024-12-01 17:30:00',
      executor: '郑十',
      totalTests: 345,
      successTests: 338,
      failedTests: 7,
      successRate: 98.0,
      duration: 1123,
      status: 'completed',
      workflows: 7,
      tags: ['UX', '用户体验']
    },
    {
      id: 'RPT-2024-12-01-002',
      name: '第三方集成测试',
      createdAt: '2024-12-01 15:20:30',
      executor: '张三',
      totalTests: 567,
      successTests: 512,
      failedTests: 55,
      successRate: 90.3,
      duration: 2134,
      status: 'completed',
      workflows: 10,
      tags: ['集成', '第三方']
    },
  ];

  // 筛选报告
  const filteredReports = reports.filter(report => {
    const matchSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       report.executor.includes(searchTerm);
    const matchStatus = statusFilter === 'all' || report.status === statusFilter;
    
    let matchDate = true;
    if (dateRange !== 'all') {
      const reportDate = new Date(report.createdAt);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dateRange === 'today') matchDate = diffDays === 0;
      else if (dateRange === '7days') matchDate = diffDays <= 7;
      else if (dateRange === '30days') matchDate = diffDays <= 30;
    }
    
    return matchSearch && matchStatus && matchDate;
  });

  // 统计数据
  const stats = {
    total: reports.length,
    completed: reports.filter(r => r.status === 'completed').length,
    running: reports.filter(r => r.status === 'running').length,
    failed: reports.filter(r => r.status === 'failed').length,
    avgSuccessRate: (reports.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.successRate, 0) / 
                     reports.filter(r => r.status === 'completed').length).toFixed(1)
  };

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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl text-gray-900 mb-2">测试报告</h1>
              <p className="text-gray-600">用例实现测试报告管理</p>
            </div>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4" />
              生成新报告
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <Card className="bg-white border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">总报告数</div>
                  <div className="text-2xl text-gray-900">{stats.total}</div>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">已完成</div>
                  <div className="text-2xl text-gray-900">{stats.completed}</div>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">运行中</div>
                  <div className="text-2xl text-gray-900">{stats.running}</div>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                </div>
              </div>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">失败</div>
                  <div className="text-2xl text-gray-900">{stats.failed}</div>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">平均成功率</div>
                  <div className="text-2xl text-gray-900">{stats.avgSuccessRate}%</div>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索报告名称、ID或执行人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="running">运行中</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36">
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
        </div>

        {/* Report Cards */}
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card 
              key={report.id} 
              className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg text-gray-900">{report.name}</h3>
                    {getStatusBadge(report.status)}
                    {report.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-6 gap-6 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">报告ID</div>
                      <div className="text-sm text-gray-900">{report.id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">创建时间</div>
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {report.createdAt}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">执行人</div>
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        {report.executor}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">工作流数</div>
                      <div className="text-sm text-gray-900">{report.workflows} 个</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">总测试数</div>
                      <div className="text-sm text-gray-900">{report.totalTests} 个</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">执行时长</div>
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {formatDuration(report.duration)}
                      </div>
                    </div>
                  </div>

                  {report.status !== 'running' && (
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600">成功:</span>
                        <span className="text-sm text-gray-900">{report.successTests}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-gray-600">失败:</span>
                        <span className="text-sm text-gray-900">{report.failedTests}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-600">成功率:</div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-900">{report.successRate}%</div>
                          {report.successRate >= 95 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : report.successRate >= 80 ? (
                            <BarChart3 className="w-4 h-4 text-orange-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              report.successRate >= 95 ? 'bg-green-500' :
                              report.successRate >= 80 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${report.successRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {report.status === 'running' && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">测试执行中...</span>
                      <div className="flex-1 bg-blue-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 bg-blue-600 rounded-full animate-pulse w-2/3" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-6">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => onViewReport?.(report.id)}
                  >
                    <Eye className="w-4 h-4" />
                    查看详情
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <Card className="bg-white border-gray-200 shadow-sm p-12">
            <div className="text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg text-gray-900 mb-2">没有找到匹配的报告</h3>
              <p className="text-gray-500">请尝试调整搜索条件或筛选器</p>
            </div>
          </Card>
        )}

        {filteredReports.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              显示 {filteredReports.length} 条结果，共 {reports.length} 个报告
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                上一页
              </Button>
              <Button variant="outline" size="sm">
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
