import { useState, useEffect } from 'react';
import { projectManagementService } from '@/services/project-management';
import {
  Plus,
  Search,
  Link2,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  Copy,
  Check,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Project {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  userRoles?: Array<{ id: string; name: string }>;
  createdAt?: number;
}

interface MembersManagementPageProps {
  project: Project;
}

/** 根据名字生成头像背景色 */
function getAvatarColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function MembersManagementPage({ project }: MembersManagementPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [filterGroup, setFilterGroup] = useState('all');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [userGroups, setUserGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await projectManagementService.getProjectMemberList({
        projectId: project.id,
        current: currentPage,
        pageSize,
      });
      if (response.list) {
        setMembers(response.list);
        setTotal(response.total || 0);
      }
    } catch (error) {
      console.error('加载成员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserGroups = async () => {
    try {
      const options = await projectManagementService.getProjectUserGroupOptions(project.id);
      setUserGroups(options || []);
    } catch (error) {
      console.error('加载用户组列表失败:', error);
    }
  };

  const loadAvailableUsers = async (keyword?: string) => {
    try {
      const users = await projectManagementService.getProjectMemberOptions(project.id, keyword);
      setAvailableUsers(users || []);
    } catch (error) {
      console.error('加载可用用户列表失败:', error);
    }
  };

  useEffect(() => {
    loadMembers();
    loadUserGroups();
  }, [project.id, currentPage]);

  useEffect(() => {
    if (showAddDialog) {
      loadAvailableUsers();
    }
  }, [showAddDialog]);

  const filteredMembers = members.filter(member => {
    const matchesSearch =
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGroup = filterGroup === 'all' ||
      member.userRoles?.some(role => role.name === filterGroup);

    return matchesSearch && matchesGroup;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(filteredMembers.map(m => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (memberId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers([...selectedMembers, memberId]);
    } else {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    }
  };

  const handleAddMember = async () => {
    if (selectedUserIds.length === 0 || selectedRoleIds.length === 0) return;
    try {
      await projectManagementService.addProjectMember({
        projectId: project.id,
        userIds: selectedUserIds,
        roleIds: selectedRoleIds,
      });
      setShowAddDialog(false);
      setSelectedUserIds([]);
      setSelectedRoleIds([]);
      loadMembers();
    } catch (error) {
      console.error('添加成员失败:', error);
    }
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setSelectedRoleIds(member.userRoles?.map(r => r.id) || []);
    setShowEditDialog(true);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    try {
      await projectManagementService.updateProjectMember({
        projectId: project.id,
        userId: editingMember.id,
        roleIds: selectedRoleIds,
      });
      setShowEditDialog(false);
      setEditingMember(null);
      setSelectedRoleIds([]);
      loadMembers();
    } catch (error) {
      console.error('更新成员失败:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await projectManagementService.removeProjectMember(project.id, memberId);
      loadMembers();
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } catch (error) {
      console.error('移除成员失败:', error);
    }
  };

  const handleBatchRemove = async () => {
    if (selectedMembers.length === 0) return;
    try {
      await projectManagementService.batchRemoveMember({
        projectId: project.id,
        userIds: selectedMembers,
      });
      setSelectedMembers([]);
      loadMembers();
    } catch (error) {
      console.error('批量移除成员失败:', error);
    }
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `https://aegisone.example.com/invite/${project.id}?token=abc123`;
    navigator.clipboard.writeText(inviteLink);
    setInviteLinkCopied(true);
    setTimeout(() => setInviteLinkCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
      {/* 顶部操作栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-800 mb-1">成员管理</h1>
            <p className="text-sm text-gray-500">
              管理项目成员和权限 · 共 <span className="font-semibold text-blue-600">{total}</span> 人
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowInviteDialog(true)}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs font-bold gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              邀请链接
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 h-8 rounded-lg text-xs font-bold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              添加成员
            </Button>
          </div>
        </div>
        {/* 搜索和筛选 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索成员姓名或邮箱..."
              className="pl-9 h-9 rounded-lg border-gray-200 text-sm bg-gray-50"
            />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-36 h-9 rounded-lg border-gray-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部用户组</SelectItem>
              {userGroups.map((group) => (
                <SelectItem key={group.id} value={group.name}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 表格区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-100">
              <TableRow className="hover:bg-transparent border-none h-11">
                <TableHead className="w-12 pl-4">
                  <Checkbox
                    checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600"
                  />
                </TableHead>
                <TableHead className="font-medium text-gray-500 text-xs">成员</TableHead>
                <TableHead className="font-medium text-gray-500 text-xs">用户组</TableHead>
                <TableHead className="text-right pr-4 font-medium text-gray-500 text-xs">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-sm">加载中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Users className="w-10 h-10 text-gray-200" />
                      <span className="text-sm">
                        {searchTerm ? '未找到匹配的成员' : '暂无成员'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className="group border-b border-gray-50 h-14 [&_td]:transition-colors [&_td]:group-hover:bg-[#f7f8ff]"
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={(checked) => handleSelectMember(member.id, checked as boolean)}
                        className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600"
                      />
                    </TableCell>
                    {/* 成员：彩色头像 + 姓名 + 邮箱双行 */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getAvatarColor(member.name ?? 'U')}`}>
                          {(member.name ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{member.name || '-'}</div>
                          <div className="text-xs text-gray-400 truncate">{member.email || '-'}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.userRoles && member.userRoles.length > 0 ? (
                          member.userRoles.map((role, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-0 font-medium"
                            >
                              {role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleEditMember(member)}
                          >
                            <Edit2 className="w-4 h-4" />
                            编辑用户组
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-red-600"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            移除成员
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {/* 底部统计和批量操作 */}
          {filteredMembers.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="text-sm text-gray-500">
                共 <span className="font-semibold text-gray-700">{filteredMembers.length}</span> 条
                {selectedMembers.length > 0 && (
                  <span className="ml-2">
                    已选择 <span className="text-blue-600 font-semibold">{selectedMembers.length}</span> 项
                  </span>
                )}
              </div>
              {selectedMembers.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold"
                  onClick={handleBatchRemove}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  批量移除
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 添加成员对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
            <DialogDescription>将现有用户添加到项目中</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">选择用户</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索用户..."
                  className="pl-9 h-9 rounded-lg border-gray-200 bg-gray-50"
                  onChange={(e) => loadAvailableUsers(e.target.value)}
                />
              </div>
              <div className="max-h-48 overflow-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                {availableUsers.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    输入关键词搜索用户
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUserIds(prev =>
                          prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                        );
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selectedUserIds.includes(user.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                    >
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => { }}
                        className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600 shrink-0"
                      />
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getAvatarColor(user.name ?? 'U')}`}>
                        {(user.name ?? 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{user.name}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">分配用户组 <span className="text-red-500">*</span></div>
              <div className="space-y-1.5">
                {userGroups.map((group) => (
                  <div key={group.id} className="flex items-center gap-2.5 px-1">
                    <Checkbox
                      checked={selectedRoleIds.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoleIds([...selectedRoleIds, group.id]);
                        } else {
                          setSelectedRoleIds(selectedRoleIds.filter(id => id !== group.id));
                        }
                      }}
                      className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600"
                    />
                    <span className="text-sm text-gray-700">{group.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowAddDialog(false);
              setSelectedUserIds([]);
              setSelectedRoleIds([]);
            }}>
              取消
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleAddMember}
              disabled={selectedUserIds.length === 0 || selectedRoleIds.length === 0}
            >
              添加（{selectedUserIds.length}）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑成员对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>编辑成员</DialogTitle>
            <DialogDescription>修改成员的用户组</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingMember && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${getAvatarColor(editingMember.name ?? 'U')}`}>
                  {(editingMember.name ?? 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{editingMember.name}</div>
                  <div className="text-xs text-gray-400">{editingMember.email}</div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">用户组 <span className="text-red-500">*</span></div>
              <div className="space-y-1.5">
                {userGroups.map((group) => (
                  <div key={group.id} className="flex items-center gap-2.5 px-1">
                    <Checkbox
                      checked={selectedRoleIds.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoleIds([...selectedRoleIds, group.id]);
                        } else {
                          setSelectedRoleIds(selectedRoleIds.filter(id => id !== group.id));
                        }
                      }}
                      className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600"
                    />
                    <span className="text-sm text-gray-700">{group.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowEditDialog(false);
              setEditingMember(null);
              setSelectedRoleIds([]);
            }}>
              取消
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleUpdateMember}
              disabled={selectedRoleIds.length === 0}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 邀请链接对话框 */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>邀请链接</DialogTitle>
            <DialogDescription>分享此链接邀请他人加入项目</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`https://aegisone.example.com/invite/${project.id}?token=abc123`}
                className="flex-1 text-sm bg-gray-50 rounded-lg"
              />
              <Button
                onClick={handleCopyInviteLink}
                variant="outline"
                size="sm"
                className="shrink-0 rounded-lg gap-2"
              >
                {inviteLinkCopied ? (
                  <><Check className="w-4 h-4" />已复制</>
                ) : (
                  <><Copy className="w-4 h-4" />复制</>
                )}
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-sm text-blue-700">
                💡 链接有效期为 7 天，过期后需要重新生成
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowInviteDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
