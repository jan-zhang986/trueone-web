/**
 * 系统设置-组织成员（迁移自 AegisOne）
 * 成员列表、添加/编辑/删除成员、邀请成员
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Mail, Users, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { orgMemberService } from '@/services/setting/member';
import type { MemberItem, LinkItem } from '@/types/setting/member';

const PAGE_SIZE = 10;

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

function formatTime(ts?: number) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN');
}

export function OrgMemberView() {
  const organizationId = typeof localStorage !== 'undefined' ? localStorage.getItem('currentOrgId') ?? '' : '';
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<MemberItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userGroupOptions, setUserGroupOptions] = useState<LinkItem[]>([]);
  const [projectOptions, setProjectOptions] = useState<LinkItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<LinkItem[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [formMemberIds, setFormMemberIds] = useState<string[]>([]);
  const [formUserRoleIds, setFormUserRoleIds] = useState<string[]>([]);
  const [formProjectIds, setFormProjectIds] = useState<string[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteUserRoleIds, setInviteUserRoleIds] = useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MemberItem | null>(null);
  const [userSearchKeyword, setUserSearchKeyword] = useState('');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchProjectOpen, setBatchProjectOpen] = useState(false);
  const [batchUserGroupOpen, setBatchUserGroupOpen] = useState(false);
  const [batchProjectIds, setBatchProjectIds] = useState<string[]>([]);
  const [batchRoleIds, setBatchRoleIds] = useState<string[]>([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const loadList = useCallback(async () => {
    if (!organizationId) {
      setList([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await orgMemberService.getMemberList({
        organizationId,
        current: page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setList(res.list ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载成员列表失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [organizationId, page, keyword]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadUserGroups = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await orgMemberService.getUserGroupList(organizationId);
      setUserGroupOptions(list);
    } catch {
      setUserGroupOptions([]);
    }
  }, [organizationId]);

  const loadProjects = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await orgMemberService.getProjectList(organizationId);
      setProjectOptions(list);
    } catch {
      setProjectOptions([]);
    }
  }, [organizationId]);

  const loadAvailableUsers = useCallback(async () => {
    if (!organizationId) return;
    try {
      const list = await orgMemberService.getAvailableUserList(organizationId, userSearchKeyword);
      setAvailableUsers(list);
    } catch {
      setAvailableUsers([]);
    }
  }, [organizationId, userSearchKeyword]);

  useEffect(() => {
    loadUserGroups();
    loadProjects();
  }, [loadUserGroups, loadProjects]);

  useEffect(() => {
    if (addModalOpen) {
      loadAvailableUsers();
    }
  }, [addModalOpen, userSearchKeyword, loadAvailableUsers]);

  const handleSearch = () => {
    setPage(1);
    loadList();
  };

  const openAdd = () => {
    setFormMemberIds([]);
    setFormUserRoleIds(['org_member']);
    setFormProjectIds([]);
    setUserSearchKeyword('');
    setAddModalOpen(true);
  };

  const openEdit = (item: MemberItem) => {
    setEditingMember(item);
    setFormMemberIds([item.id]);
    setFormUserRoleIds(item.userRoleIdNameMap?.map((r) => r.id) ?? []);
    setFormProjectIds(item.projectIdNameMap?.map((p) => p.id) ?? []);
    setEditModalOpen(true);
  };

  const handleAddSubmit = async () => {
    if (!organizationId) {
      toast.error('请先选择组织');
      return;
    }
    if (formMemberIds.length === 0) {
      toast.error('请选择成员');
      return;
    }
    if (formUserRoleIds.length === 0) {
      toast.error('请至少选择一个用户组');
      return;
    }
    setFormSubmitting(true);
    try {
      await orgMemberService.addMember({
        organizationId,
        memberIds: formMemberIds,
        userRoleIds: formUserRoleIds,
        projectIds: formProjectIds.length > 0 ? formProjectIds : undefined,
      });
      toast.success('添加成功');
      setAddModalOpen(false);
      loadList();
    } catch (e) {
      toast.error('添加失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!organizationId || !editingMember) return;
    if (formUserRoleIds.length === 0) {
      toast.error('请至少选择一个用户组');
      return;
    }
    setFormSubmitting(true);
    try {
      await orgMemberService.updateMember({
        organizationId,
        memberId: editingMember.id,
        userRoleIds: formUserRoleIds,
        projectIds: formProjectIds.length > 0 ? formProjectIds : undefined,
      });
      toast.success('更新成功');
      setEditModalOpen(false);
      setEditingMember(null);
      loadList();
    } catch (e) {
      toast.error('更新失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleInviteSubmit = async () => {
    if (!organizationId) {
      toast.error('请先选择组织');
      return;
    }
    const emails = inviteEmails
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes('@'));
    if (emails.length === 0) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    if (inviteUserRoleIds.length === 0) {
      toast.error('请至少选择一个用户组');
      return;
    }
    setInviteSubmitting(true);
    try {
      await orgMemberService.inviteMember({
        organizationId,
        inviteEmails: emails,
        userRoleIds: inviteUserRoleIds,
      });
      toast.success('邀请成功');
      setInviteModalOpen(false);
      setInviteEmails('');
      setInviteUserRoleIds(['org_member']);
      loadList();
    } catch (e) {
      toast.error('邀请失败');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !organizationId) return;
    const item = deleteConfirm;
    setDeleteConfirm(null);
    try {
      await orgMemberService.deleteMember(organizationId, item.id);
      toast.success('已删除');
      loadList();
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(list.map((r) => r.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds((prev) => [...prev, id]);
    else setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  const openBatchProject = () => {
    setBatchProjectIds([]);
    setBatchProjectOpen(true);
  };

  const openBatchUserGroup = () => {
    setBatchRoleIds([]);
    setBatchUserGroupOpen(true);
  };

  const handleBatchAddProject = async () => {
    if (!organizationId || selectedIds.length === 0 || batchProjectIds.length === 0) {
      toast.error('请选择成员和目标项目');
      return;
    }
    setBatchSubmitting(true);
    try {
      await orgMemberService.batchAddProject({
        organizationId,
        userIds: selectedIds,
        projectIds: batchProjectIds,
      });
      toast.success('批量加入项目成功');
      setBatchProjectOpen(false);
      setSelectedIds([]);
      loadList();
    } catch (e) {
      toast.error('批量加入项目失败');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBatchAddUserGroup = async () => {
    if (!organizationId || selectedIds.length === 0 || batchRoleIds.length === 0) {
      toast.error('请选择成员和目标用户组');
      return;
    }
    setBatchSubmitting(true);
    try {
      await orgMemberService.batchAddUserGroup({
        organizationId,
        userIds: selectedIds,
        roleIds: batchRoleIds,
      });
      toast.success('批量加入用户组成功');
      setBatchUserGroupOpen(false);
      setSelectedIds([]);
      loadList();
    } catch (e) {
      toast.error('批量加入用户组失败');
    } finally {
      setBatchSubmitting(false);
    }
  };

  if (!organizationId) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center text-muted-foreground">
        请先在顶部选择组织
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95">
            <Plus className="h-4 w-4 mr-2" /> 添加成员
          </Button>
          <Button variant="outline" onClick={() => { setInviteEmails(''); setInviteUserRoleIds(['org_member']); setInviteModalOpen(true); }} className="shadow-sm border-gray-200">
            <Mail className="h-4 w-4 mr-2" /> 邮箱邀请
          </Button>
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-gray-500 self-center">已选 {selectedIds.length} 人</span>
              <Button variant="outline" size="sm" onClick={openBatchProject} className="border-blue-200 text-blue-600 hover:bg-blue-50">
                <FolderKanban className="h-4 w-4 mr-1" /> 批量加入项目
              </Button>
              <Button variant="outline" size="sm" onClick={openBatchUserGroup} className="border-blue-200 text-blue-600 hover:bg-blue-50">
                <Users className="h-4 w-4 mr-1" /> 批量加入用户组
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="text-gray-500">取消选择</Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-lg border border-gray-200/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="通过姓名/邮箱搜索成员"
              className="w-[240px] pl-9 bg-white border-none shadow-none focus-visible:ring-1 focus-visible:ring-blue-100 h-9"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleSearch} className="h-8 px-3 text-gray-600 hover:bg-white hover:text-blue-600">
            搜索
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
            <TableRow className="hover:bg-transparent border-none h-11">
              <TableHead className="w-10 font-medium text-gray-500 pr-0">
                <Checkbox
                  checked={list.length > 0 && selectedIds.length === list.length}
                  onCheckedChange={(c) => handleSelectAll(!!c)}
                  className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600"
                />
              </TableHead>
              <TableHead className="font-medium text-gray-500">成员</TableHead>
              <TableHead className="font-medium text-gray-500">手机</TableHead>
              <TableHead className="font-medium text-gray-500">项目</TableHead>
              <TableHead className="font-medium text-gray-500">用户组</TableHead>
              <TableHead className="w-20 font-medium text-gray-500">状态</TableHead>
              <TableHead className="w-40 font-medium text-gray-500">创建时间</TableHead>
              <TableHead className="w-40 text-right font-medium text-gray-500">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody key={`member-tbody-${list.length}-${list[0]?.id ?? ''}`}>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无成员</TableCell>
              </TableRow>
            ) : (
              list.map((row) => (
                <TableRow key={row.id} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-200 h-11">
                  <TableCell className="w-10 pr-0">
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onCheckedChange={(c) => handleSelectOne(row.id, !!c)}
                      className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getAvatarColor(row.name ?? 'U')}`}>
                        {(row.name ?? 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{row.name}</div>
                        <div className="text-xs text-gray-400 truncate">{row.email ?? '-'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.phone ?? '-'}</TableCell>
                  <TableCell>
                    {row.projectIdNameMap && row.projectIdNameMap.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.projectIdNameMap.map((p) => (
                          <Badge key={p.id} variant="secondary">
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {row.userRoleIdNameMap && row.userRoleIdNameMap.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.userRoleIdNameMap.map((r) => (
                          <Badge key={r.id} variant="secondary">
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.enable}
                      disabled
                      title={row.enable ? '已启用' : '已禁用'}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatTime(row.createdAt)}</TableCell>
                  <TableCell className="text-right pr-4 space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)} className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 font-bold text-[11px]">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> 编辑
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(row)} className="h-8 rounded-lg text-red-600 hover:bg-red-50 font-bold text-[11px]">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> 删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="bg-gray-50/30">
            <UnifiedPagination
              currentPage={page}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* 添加成员 */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>选择成员 *</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-2 mt-1">
                <Input
                  placeholder="搜索用户"
                  value={userSearchKeyword}
                  onChange={(e) => setUserSearchKeyword(e.target.value)}
                  className="mb-2"
                />
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">暂无可选用户</p>
                ) : (
                  availableUsers.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formMemberIds.includes(u.id)}
                        onCheckedChange={(checked) =>
                          setFormMemberIds((prev) =>
                            checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                          )
                        }
                      />
                      <span className="text-sm">{u.name} ({u.id})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div>
              <Label>用户组 *</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-2 mt-1">
                {userGroupOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">加载中...</p>
                ) : (
                  userGroupOptions.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formUserRoleIds.includes(g.id)}
                        onCheckedChange={(checked) =>
                          setFormUserRoleIds((prev) =>
                            checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                          )
                        }
                      />
                      <span className="text-sm">{g.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div>
              <Label>项目（可选）</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-2 mt-1">
                {projectOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">暂无项目</p>
                ) : (
                  projectOptions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formProjectIds.includes(p.id)}
                        onCheckedChange={(checked) =>
                          setFormProjectIds((prev) =>
                            checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                          )
                        }
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>取消</Button>
            <Button onClick={handleAddSubmit} disabled={formSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">{formSubmitting ? '添加中...' : '添加'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑成员 */}
      <Dialog open={editModalOpen} onOpenChange={(open) => { if (!open) setEditingMember(null); setEditModalOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑成员 - {editingMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>用户组 *</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-2 mt-1">
                {userGroupOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">加载中...</p>
                ) : (
                  userGroupOptions.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formUserRoleIds.includes(g.id)}
                        onCheckedChange={(checked) =>
                          setFormUserRoleIds((prev) =>
                            checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                          )
                        }
                      />
                      <span className="text-sm">{g.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div>
              <Label>项目（可选）</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-2 mt-1">
                {projectOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">暂无项目</p>
                ) : (
                  projectOptions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formProjectIds.includes(p.id)}
                        onCheckedChange={(checked) =>
                          setFormProjectIds((prev) =>
                            checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                          )
                        }
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>取消</Button>
            <Button onClick={handleEditSubmit} disabled={formSubmitting}>{formSubmitting ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 邮箱邀请 */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>邮箱邀请</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>邮箱地址 *</Label>
              <Input
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="多个邮箱用逗号、分号或换行分隔"
                className="mt-1"
              />
            </div>
            <div>
              <Label>用户组 *</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-2 mt-1">
                {userGroupOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">加载中...</p>
                ) : (
                  userGroupOptions.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={inviteUserRoleIds.includes(g.id)}
                        onCheckedChange={(checked) =>
                          setInviteUserRoleIds((prev) =>
                            checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                          )
                        }
                      />
                      <span className="text-sm">{g.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>取消</Button>
            <Button onClick={handleInviteSubmit} disabled={inviteSubmitting}>{inviteSubmitting ? '邀请中...' : '邀请'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除成员「{deleteConfirm?.name}」吗？删除后该成员将失去组织权限。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量加入项目 */}
      <Dialog open={batchProjectOpen} onOpenChange={setBatchProjectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>批量加入项目</DialogTitle>
            <p className="text-sm text-gray-500">已选 {selectedIds.length} 人，请选择要加入的项目</p>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-2">
            {projectOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">组织下暂无项目</p>
            ) : (
              projectOptions.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={batchProjectIds.includes(p.id)}
                    onCheckedChange={(checked) =>
                      setBatchProjectIds((prev) =>
                        checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }
                  />
                  <span className="text-sm">{p.name}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchProjectOpen(false)}>取消</Button>
            <Button onClick={handleBatchAddProject} disabled={batchSubmitting || batchProjectIds.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
              {batchSubmitting ? '提交中...' : '确定加入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量加入用户组 */}
      <Dialog open={batchUserGroupOpen} onOpenChange={setBatchUserGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>批量加入用户组</DialogTitle>
            <p className="text-sm text-gray-500">已选 {selectedIds.length} 人，请选择要加入的用户组</p>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-2">
            {userGroupOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">加载中...</p>
            ) : (
              userGroupOptions.map((g) => (
                <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={batchRoleIds.includes(g.id)}
                    onCheckedChange={(checked) =>
                      setBatchRoleIds((prev) =>
                        checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                      )
                    }
                  />
                  <span className="text-sm">{g.name}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchUserGroupOpen(false)}>取消</Button>
            <Button onClick={handleBatchAddUserGroup} disabled={batchSubmitting || batchRoleIds.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
              {batchSubmitting ? '提交中...' : '确定加入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
