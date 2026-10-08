import { useState, useEffect } from 'react';
import { projectManagementService } from '@/services/project-management';
import { 
  Plus, 
  Search, 
  UsersRound,
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  Shield,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Project {
  id: string;
  name: string;
}

interface UserGroup {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  internal?: boolean; // 是否内置用户组
  type?: string; // PROJECT, ORGANIZATION, SYSTEM
  createdAt?: number;
  scopeId?: string;
}

interface UserGroupsPageProps {
  project: Project;
}

export function UserGroupsPage({ project }: UserGroupsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // 加载用户组列表
  const loadUserGroups = async () => {
    try {
      setLoading(true);
      const response = await projectManagementService.getUserRoleList({
        projectId: project.id,
        current: currentPage,
        pageSize,
      });
      if (response.list) {
        setUserGroups(response.list);
      }
    } catch (error) {
      console.error('加载用户组列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserGroups();
  }, [project.id, currentPage]);

  const filteredGroups = userGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await projectManagementService.addUserRole({
      name: newGroupName,
        scopeId: project.id,
      });
    setShowCreateDialog(false);
    setNewGroupName('');
    setNewGroupDesc('');
      loadUserGroups();
    } catch (error) {
      console.error('创建用户组失败:', error);
    }
  };

  const handleEditGroup = (group: UserGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name || '');
    setNewGroupDesc(group.description || '');
    setShowEditDialog(true);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName.trim()) return;
    try {
      await projectManagementService.updateUserRole({
        id: editingGroup.id,
        name: newGroupName,
        scopeId: editingGroup.scopeId || project.id,
      });
      setShowEditDialog(false);
      setEditingGroup(null);
      setNewGroupName('');
      setNewGroupDesc('');
      loadUserGroups();
    } catch (error) {
      console.error('更新用户组失败:', error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await projectManagementService.deleteUserRole(groupId);
      loadUserGroups();
    } catch (error) {
      console.error('删除用户组失败:', error);
    }
  };

  const getGroupIcon = (internal?: boolean) => {
    if (internal) {
      return <Shield className="w-5 h-5" />;
    }
    return <UsersRound className="w-5 h-5" />;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
      {/* 顶部操作栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-800 mb-1">用户组</h1>
            <p className="text-sm text-gray-500">管理项目的用户组和权限配置</p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            创建用户组
          </Button>
        </div>
        {/* 搜索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索用户组名称或描述..."
            className="pl-9"
          />
        </div>
      </div>

      {/* 用户组列表 */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <UsersRound className="w-20 h-20 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">
              {searchTerm ? '未找到匹配的用户组' : '暂无用户组'}
            </p>
            <p className="text-sm text-gray-400 mb-6">
              {searchTerm ? '尝试使用其他关键词搜索' : '创建用户组来管理成员权限'}
            </p>
            {!searchTerm && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                创建用户组
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                {/* 用户组头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      group.internal 
                        ? 'bg-purple-100 text-purple-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {getGroupIcon(group.internal)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-gray-800 truncate">
                          {group.name}
                        </h3>
                        {group.internal && (
                          <Badge variant="secondary" className="text-xs">
                            系统
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>{group.memberCount || 0} 名成员</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Eye className="w-4 h-4" />
                        查看成员
                      </DropdownMenuItem>
                      {!group.internal && (
                        <>
                          <DropdownMenuItem 
                            className="gap-2"
                            onClick={() => handleEditGroup(group)}
                          >
                            <Edit2 className="w-4 h-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 text-red-600"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* 用户组描述 */}
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {group.description}
                  </p>
                )}


                {/* 底部信息 */}
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  创建时间: {formatDate(group.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建用户组对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建用户组</DialogTitle>
            <DialogDescription>
              创建自定义用户组来管理成员权限
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">用户组名称 *</div>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="请输入用户组名称"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                setNewGroupName('');
                setNewGroupDesc('');
              }}
            >
              取消
            </Button>
            <Button 
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户组对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户组</DialogTitle>
            <DialogDescription>
              修改用户组信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">用户组名称 *</div>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="请输入用户组名称"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditDialog(false);
                setEditingGroup(null);
                setNewGroupName('');
                setNewGroupDesc('');
              }}
            >
              取消
            </Button>
            <Button 
              onClick={handleUpdateGroup}
              disabled={!newGroupName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

