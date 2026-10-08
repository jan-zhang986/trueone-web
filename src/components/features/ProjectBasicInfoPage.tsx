import { useState, useEffect } from 'react';
import { Edit2, Save, X, User, Building2, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { projectManagementService } from '@/services/project-management';
import { caseManagementService, testPlanManagementService } from '@/services';

interface Project {
  id: string;
  name: string;
  creator?: string;
  organization?: string;
  createdAt?: string;
  description?: string;
}

interface ProjectBasicInfoPageProps {
  project: Project;
}

export function ProjectBasicInfoPage({ project }: ProjectBasicInfoPageProps) {
  // 如果 project 为空，显示错误信息
  if (!project || !project.id) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">项目信息不存在，请先选择一个项目</p>
        </div>
      </div>
    );
  }

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name || '');
  const [editedDesc, setEditedDesc] = useState(project.description || '');
  const [loading, setLoading] = useState(false);
  const [projectDetail, setProjectDetail] = useState<Project | null>(project);
  // 项目数据概览（替换原先的效能指标接口，避免调用慢的 metrics 服务）
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [caseCount, setCaseCount] = useState<number>(0);
  const [completedPlanCount, setCompletedPlanCount] = useState<number>(0);
  const [underwayPlanCount, setUnderwayPlanCount] = useState<number>(0);
  // 默认从 0 开始，避免界面展示为 "-"
  const [memberCount, setMemberCount] = useState<number>(0);

  // 当 project 变化时，重新加载详情
  useEffect(() => {
    const loadProjectDetail = async () => {
      if (!project.id) return;

      try {
        setLoading(true);
        const detail = await projectManagementService.getProjectInfo(project.id);
        if (detail) {
          const formatDate = (timestamp?: number) => {
            if (!timestamp) return '未知';
            return new Date(timestamp).toLocaleDateString('zh-CN');
          };

          setProjectDetail({
            id: detail.id,
            name: detail.name || '',
            creator: detail.adminList && detail.adminList.length > 0
              ? detail.adminList[0].name || '未知'
              : '未知',
            organization: detail.organizationName || '未知',
            createdAt: formatDate(detail.createdAt as number),
            description: detail.description || '',
          });

          // 更新编辑状态的值
          setEditedName(detail.name || '');
          setEditedDesc(detail.description || '');
        }
      } catch (error) {
        console.error('加载项目详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjectDetail();
  }, [project.id]);

  // 加载项目数据概览与活跃成员数
  useEffect(() => {
    const loadMemberCount = async () => {
      if (!project.id) return;
      try {
        const res: any = await projectManagementService.getProjectMemberList({
          projectId: project.id,
          current: 1,
          pageSize: 10,
        });
        /**
         * 成员管理页的实现直接使用：
         *   response.list / response.total
         * 这里保持完全一致，优先读取 res.total，其次兼容 res.data.total
         */
        const total =
          (typeof res?.total === 'number' ? res.total : undefined) ??
          (typeof res?.data?.total === 'number' ? res.data.total : undefined) ??
          0;
        setMemberCount(total);
      } catch (error) {
        console.error('加载项目成员数量失败:', error);
        setMemberCount(0);
      }
    };

    const loadOverviewByProjectApis = async () => {
      if (!project.id) return;
      setOverviewLoading(true);

      // 解析模块数量返回结果为 { moduleId: count }
      const parseModuleCountResponse = (res: any): Record<string, number> => {
        const raw = res?.data ?? res;
        if (!raw || typeof raw !== 'object') return {};
        if (Array.isArray(raw)) {
          const map: Record<string, number> = {};
          raw.forEach((item: any) => {
            const id = item?.moduleId ?? item?.id ?? item?.key ?? '';
            const count = item?.count ?? item?.value ?? 0;
            if (id != null) {
              map[String(id)] = Number(count) || 0;
            }
          });
          return map;
        }
        const map: Record<string, number> = {};
        Object.keys(raw).forEach((k) => {
          const v = (raw as any)[k];
          map[k] = typeof v === 'number' ? v : Number(v) || 0;
        });
        return map;
      };

      const computeAllModuleCount = (modulesCount: Record<string, number>): number => {
        const v =
          modulesCount.total ??
          modulesCount.all ??
          modulesCount.ALL ??
          modulesCount[''];
        if (typeof v === 'number' && v >= 0) return v;
        const vals = Object.values(modulesCount).filter(
          (n): n is number => typeof n === 'number',
        );
        return vals.length ? vals.reduce((a, b) => a + b, 0) : 0;
      };

      // 将测试计划列表拍平（父计划 + 子计划），用于状态统计
      const flattenPlanList = (items: any[]): any[] => {
        const result: any[] = [];
        (items || []).forEach((p) => {
          if (!p || !p.id) return;
          const { children, ...rest } = p;
          result.push(rest);
          if (Array.isArray(children) && children.length) {
            result.push(...flattenPlanList(children));
          }
        });
        return result;
      };

      // 统一从计划对象中读取“业务状态”，并转为 PREPARED / UNDERWAY / COMPLETED / ARCHIVED
      const getPlanStatus = (plan: any): string => {
        const raw =
          plan?.status ??
          plan?.planStatus ??
          plan?.plan_status ??
          plan?.plan_status_enum;
        if (raw == null) return '';
        const upper = String(raw).toUpperCase();

        // 后端直接就是标准状态
        if (upper === 'PREPARED' || upper === 'UNDERWAY' || upper === 'COMPLETED' || upper === 'ARCHIVED') {
          return upper;
        }

        // 兼容后端返回 NOT_ARCHIVED 等特殊枚举，按执行信息推导业务状态
        if (upper === 'NOT_ARCHIVED') {
          const passVal = plan?.pass;
          const passUpper = passVal != null ? String(passVal).toUpperCase() : '';
          const actualStart = plan?.actualStartTime;
          const actualEnd = plan?.actualEndTime;

          // 已执行且标记通过 => 视为已完成
          if (passVal === true || passUpper === 'PASSED' || passUpper === 'SUCCESS') {
            return 'COMPLETED';
          }
          // 有实际开始时间但没有结束时间 => 视为进行中
          if (actualStart && !actualEnd) {
            return 'UNDERWAY';
          }
          // 其它情况：默认当作未开始
          return 'PREPARED';
        }

        // 兜底：无法识别时，不参与统计
        return '';
      };

      try {
        // 1）测试用例总数：使用用例模块数量接口，避免走 metrics dashboard 慢接口
        try {
          const caseParams: Record<string, unknown> = {
            projectId: project.id,
            moduleIds: [],
            current: 1,
            pageSize: 10,
          };
          const caseRes: any = await caseManagementService.getCaseModulesCounts(caseParams);
          const modulesCount = parseModuleCountResponse(caseRes);
          setCaseCount(computeAllModuleCount(modulesCount));
        } catch (err) {
          console.error('加载测试用例数量失败:', err);
          setCaseCount(0);
        }

        // 2）测试计划状态统计：用测试计划列表接口按状态统计（已完成 / 进行中）
        try {
          // 与测试计划列表页保持一致的参数结构，确保状态、层级等信息完整
          const planParams: Record<string, any> = {
            projectId: project.id,
            current: 1,
            pageSize: 100, // 项目级概览，取前 100 条用于状态统计即可
            type: 'ALL',
            moduleIds: [],
            selectIds: [],
            excludeIds: [],
            selectAll: false,
            filter: {},
          };
          const planRes: any = await testPlanManagementService.getTestPlanList(planParams);
          const rawList: any[] = Array.isArray(planRes?.list)
            ? planRes.list
            : Array.isArray(planRes?.data)
              ? planRes.data
              : Array.isArray(planRes)
                ? planRes
                : [];
          const flatPlans = flattenPlanList(rawList);
          const completed = flatPlans.filter((p) => {
            const status = getPlanStatus(p);
            // 「已完成」包含：已完成 + 已归档（原项目工作台“完成率”口径类似）
            return status === 'COMPLETED' || status === 'ARCHIVED';
          }).length;
          const underway = flatPlans.filter((p) => getPlanStatus(p) === 'UNDERWAY').length;
          setCompletedPlanCount(completed);
          setUnderwayPlanCount(underway);
        } catch (err) {
          console.error('加载测试计划状态统计失败:', err);
          setCompletedPlanCount(0);
          setUnderwayPlanCount(0);
        }
      } finally {
        setOverviewLoading(false);
      }
    };

    loadMemberCount();
    loadOverviewByProjectApis();
  }, [project.id]);

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await projectManagementService.updateProject({
        id: project.id,
        name: editedName,
        description: editedDesc,
      });
      setIsEditing(false);
      // 重新加载项目信息
      if (project.id) {
        const updatedProject = await projectManagementService.getProjectInfo(project.id);
        if (updatedProject) {
          const formatDate = (timestamp?: number) => {
            if (!timestamp) return '未知';
            return new Date(timestamp).toLocaleDateString('zh-CN');
          };

          setProjectDetail({
            id: updatedProject.id,
            name: updatedProject.name || '',
            creator: updatedProject.adminList && updatedProject.adminList.length > 0
              ? updatedProject.adminList[0].name || '未知'
              : '未知',
            organization: updatedProject.organizationName || '未知',
            createdAt: formatDate(updatedProject.createdAt as number),
            description: updatedProject.description || '',
          });
        }
      }
    } catch (error) {
      console.error('保存项目信息失败:', error);
      // 可以在这里显示错误提示
    }
  };

  const handleCancel = () => {
    setEditedName(project.name);
    setEditedDesc(project.description || '');
    setIsEditing(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-800 mb-1">基本信息</h1>
            <p className="text-sm text-gray-500">查看和编辑项目基本信息</p>
          </div>
          {!isEditing ? (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdit(e);
              }}
              variant="outline"
              className="gap-2 relative z-10"
              type="button"
            >
              <Edit2 className="w-4 h-4" />
              编辑
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="gap-2"
                type="button"
              >
                <X className="w-4 h-4" />
                取消
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
                type="button"
              >
                <Save className="w-4 h-4" />
                保存
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 左侧主要信息区 */}
          <div className="xl:col-span-2 space-y-6">
            {/* 项目名称卡片 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">项目名称</h2>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">活跃</Badge>
                  </div>
                  {isEditing ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="max-w-lg focus-visible:ring-blue-500"
                      placeholder="请输入项目名称"
                    />
                  ) : (
                    <p className="text-gray-600 text-base">{projectDetail?.name || project.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 详细信息 */}
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-2 shadow-sm">
              <div className="divide-y divide-gray-100">
                {/* 创建人 */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-full sm:w-32 flex items-center gap-2 text-gray-500">
                    <User className="w-4 h-4" />
                    <span className="text-sm">创建人</span>
                  </div>
                  <div className="flex-1 text-gray-900 text-sm font-medium">
                    {projectDetail?.creator || project.creator || '-'}
                  </div>
                </div>

                {/* 所属组织 */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-full sm:w-32 flex items-center gap-2 text-gray-500">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm">所属组织</span>
                  </div>
                  <div className="flex-1 text-gray-900 text-sm font-medium">
                    {projectDetail?.organization || project.organization || '-'}
                  </div>
                </div>

                {/* 创建时间 */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-full sm:w-32 flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">创建时间</span>
                  </div>
                  <div className="flex-1 text-gray-900 text-sm font-medium">
                    {projectDetail?.createdAt || project.createdAt || '-'}
                  </div>
                </div>

                {/* 项目描述 */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                  <div className="w-full sm:w-32 flex items-center gap-2 text-gray-500 sm:pt-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">备注</span>
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <textarea
                        value={editedDesc}
                        onChange={(e) => setEditedDesc(e.target.value)}
                        placeholder="请输入项目描述（可选）"
                        className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
                      />
                    ) : (
                      <p className="text-gray-700 text-sm leading-relaxed sm:pt-2 whitespace-pre-wrap">
                        {projectDetail?.description || project.description || '-'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧侧边栏 */}
          <div className="space-y-6">
            {/* 统计信息概览 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-5">项目数据概览</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50/80 to-blue-50 rounded-xl p-4 border border-blue-100/50 hover:shadow-sm transition-shadow">
                  <div className="text-sm text-blue-600/80 font-medium mb-1">测试用例</div>
                  <div className="text-3xl text-blue-700 font-bold tracking-tight">
                    {overviewLoading ? '…' : caseCount}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50/80 to-green-50 rounded-xl p-4 border border-green-100/50 hover:shadow-sm transition-shadow">
                  <div className="text-sm text-green-600/80 font-medium mb-1">已完成</div>
                  <div className="text-3xl text-green-700 font-bold tracking-tight">
                    {overviewLoading ? '…' : completedPlanCount}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50/80 to-orange-50 rounded-xl p-4 border border-orange-100/50 hover:shadow-sm transition-shadow">
                  <div className="text-sm text-orange-600/80 font-medium mb-1">进行中</div>
                  <div className="text-3xl text-orange-700 font-bold tracking-tight">
                    {overviewLoading ? '…' : underwayPlanCount}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200/50 hover:shadow-sm transition-shadow">
                  <div className="text-sm text-gray-500 font-medium mb-1">活跃成员</div>
                  <div className="text-3xl text-gray-700 font-bold tracking-tight">
                    {memberCount}
                  </div>
                </div>
              </div>
            </div>

            {/* 快捷操作 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4">快捷操作</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-gray-600 bg-gray-50/50 hover:bg-gray-100 hover:text-gray-900 border-gray-200"
                  onClick={() => {
                    const url = `/project-management?tab=environment-management&projectId=${project.id}`;
                    window.location.href = url;
                  }}
                >
                  管理环境配置
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

