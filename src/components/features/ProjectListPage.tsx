import { useState, useEffect } from 'react';
import { Plus, Search, Building2, Calendar, User, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { projectService, ProjectSimple } from '@/services/project';

interface Project {
  id: string;
  name: string;
  creator?: string;
  organization?: string;
  createdAt?: string;
  description?: string;
}

interface ProjectListPageProps {
  onSelectProject: (project: Project) => void;
}

export function ProjectListPage({ onSelectProject }: ProjectListPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载项目列表
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectList = await projectService.getProjectList();
      // 将后端返回的简单项目信息转换为前端需要的格式
      const formattedProjects: Project[] = projectList.map(project => ({
        id: project.id,
        name: project.name,
        // 后端只返回 id 和 name，其他字段设为可选或默认值
        creator: undefined,
        organization: undefined,
        createdAt: undefined,
        description: undefined,
      }));
      setProjects(formattedProjects);
    } catch (err) {
      console.error('加载项目列表失败:', err);
      setError('加载项目列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 w-full">
      {/* 顶部操作栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
        <div className="flex items-center justify-between mb-4 w-full">
          <div className="flex-shrink-0">
            <h1 className="text-gray-800 mb-1">项目</h1>
            <p className="text-sm text-gray-500">管理您的项目</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2 flex-shrink-0">
            <Plus className="w-4 h-4" />
            新建项目
          </Button>
        </div>
        
        {/* 搜索框 */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索项目..."
            className="pl-9 w-full"
          />
        </div>
      </div>

      {/* 项目列表 */}
      <div className="flex-1 overflow-auto p-6 min-w-0 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-4" />
            <p className="text-gray-500">加载项目列表中...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Building2 className="w-20 h-20 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-6">{error}</p>
            <Button variant="outline" onClick={loadProjects} className="gap-2">
              <Search className="w-4 h-4" />
              重试
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Building2 className="w-20 h-20 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-6">
              {searchTerm ? '未找到匹配的项目' : '暂无项目'}
            </p>
            {!searchTerm && (
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                创建第一个项目
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-fr w-full">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="p-5 cursor-pointer hover:shadow-md transition-shadow min-w-0"
                onClick={() => onSelectProject(project)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
                
                <h3 className="text-gray-900 font-medium mb-2">{project.name}</h3>
                
                {project.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                {(project.creator || project.createdAt) && (
                <div className="space-y-2 pt-3 border-t border-gray-100">
                    {project.creator && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="w-3.5 h-3.5" />
                    <span>{project.creator}</span>
                  </div>
                    )}
                    {project.createdAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{project.createdAt}</span>
                  </div>
                    )}
                </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

