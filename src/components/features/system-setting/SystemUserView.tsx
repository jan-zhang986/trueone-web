/**
 * 系统设置-用户 列表与操作（迁移自 AegisOne 系统设置-用户）
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, KeyRound, Ban, CheckCircle,
  X, MoreVertical, UserPlus, FileUp, Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { systemUserService } from '@/services/setting/user';
import type { UserListItem, SystemRole } from '@/types/setting/user';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export function SystemUserView() {
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userGroupOptions, setUserGroupOptions] = useState<SystemRole[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

  // 表单状态使用数组支持批量创建，编辑时仅用第一项
  const [formUsers, setFormUsers] = useState<Array<{ name: string, email: string, phone: string }>>([
    { name: '', email: '', phone: '' }
  ]);
  const [formUserRoleIds, setFormUserRoleIds] = useState<string[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
    variant?: 'default' | 'destructive';
  } | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<'userGroup' | 'organization' | 'project'>('userGroup');
  const [batchTargetIds, setBatchTargetIds] = useState<string[]>([]);
  const [batchOptions, setBatchOptions] = useState<{ id: string; name: string }[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState(0);
  const [importFailCount, setImportFailCount] = useState(0);
  const [importErrorMessages, setImportErrorMessages] = useState<Record<string, string>>({});

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteUserRoleIds, setInviteUserRoleIds] = useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemUserService.getUserList({
        current: page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setList(res.list ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载用户列表失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadUserGroups = useCallback(async () => {
    try {
      const roles = await systemUserService.getSystemRoles();
      setUserGroupOptions(roles ?? []);
    } catch {
      setUserGroupOptions([]);
    }
  }, []);

  useEffect(() => {
    loadUserGroups();
  }, [loadUserGroups]);

  const openCreate = () => {
    setDialogMode('create');
    setEditingUser(null);
    setFormUsers([{ name: '', email: '', phone: '' }]);
    const systemAdmin = userGroupOptions.find((r) => r.name === '系统管理员');
    const defaultIds = systemAdmin
      ? [systemAdmin.id]
      : userGroupOptions.filter((r) => r.selected).map((r) => r.id);
    setFormUserRoleIds(defaultIds.length ? defaultIds : (userGroupOptions[0] ? [userGroupOptions[0].id] : []));
    setDialogOpen(true);
  };

  const openEdit = (record: UserListItem) => {
    setDialogMode('edit');
    setEditingUser(record);
    setFormUsers([{
      name: record.name,
      email: record.email,
      phone: record.phone?.replace(/\s/g, '') ?? ''
    }]);
    setFormUserRoleIds(record.userRoleList?.map((r) => r.id) ?? []);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    const validUsers = formUsers.filter(u => u.name.trim() && u.email.trim());
    if (validUsers.length === 0) {
      toast.error('请至少填写一个有效的用户信息（姓名和邮箱）');
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await systemUserService.batchCreateUser({
        userInfoList: validUsers.map(u => ({
          name: u.name.trim(),
          email: u.email.trim(),
          phone: u.phone.trim() || undefined
        })),
        userRoleIdList: formUserRoleIds,
      });
      if (res.errorEmails && Object.keys(res.errorEmails).length > 0) {
        toast.error(`部分创建失败: ${Object.keys(res.errorEmails).join(', ')} 已存在`);
      } else {
        toast.success('创建成功');
      }
      setDialogOpen(false);
      loadList();
    } catch {
      toast.error('创建失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingUser || !formUsers[0].name.trim()) {
      toast.error('请输入姓名');
      return;
    }
    setFormSubmitting(true);
    try {
      await systemUserService.updateUserInfo({
        id: editingUser.id,
        name: formUsers[0].name.trim(),
        email: formUsers[0].email.trim(),
        phone: formUsers[0].phone.trim() || undefined,
        userRoleIdList: formUserRoleIds,
      });
      toast.success('更新成功');
      setDialogOpen(false);
      loadList();
    } catch {
      toast.error('更新失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleUserRole = (id: string) => {
    setFormUserRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const runConfirm = (config: typeof confirmConfig) => {
    setConfirmConfig(config);
    setConfirmOpen(true);
  };

  const deleteUser = (record: UserListItem) => {
    runConfirm({
      title: '确认删除',
      description: `仅删除用户信息，不处理该用户的系统数据。确认删除「${record.name}」吗？`,
      variant: 'destructive',
      action: async () => {
        await systemUserService.deleteUserInfo({
          selectIds: [record.id],
          selectAll: false,
          condition: { keyword },
        });
        toast.success('删除成功');
        loadList();
      },
    });
  };

  const disableUser = (record: UserListItem) => {
    runConfirm({
      title: '确认禁用',
      description: `禁用的用户无法登录系统。确认禁用「${record.name}」吗？`,
      action: async () => {
        await systemUserService.toggleUserStatus({
          selectIds: [record.id],
          selectAll: false,
          condition: { keyword },
          enable: false,
        });
        toast.success('禁用成功');
        loadList();
      },
    });
  };

  const enableUser = (record: UserListItem) => {
    runConfirm({
      title: '确认启用',
      description: `启用后用户可以登录系统。确认启用「${record.name}」吗？`,
      action: async () => {
        await systemUserService.toggleUserStatus({
          selectIds: [record.id],
          selectAll: false,
          condition: { keyword },
          enable: true,
        });
        toast.success('启用成功');
        loadList();
      },
    });
  };

  const resetPassword = (record: UserListItem | string[]) => {
    const isBatch = Array.isArray(record);
    const ids = isBatch ? record : [record.id];
    runConfirm({
      title: '重置密码',
      description: isBatch
        ? `确认重置选中的 ${ids.length} 个用户的密码吗？初始密码为用户邮箱。`
        : (record.id === 'admin'
          ? '初始密码为 aegis，下次登录时生效。'
          : '初始密码为用户邮箱，下次登录时生效。确认重置「' + record.name + '」的密码吗？'),
      action: async () => {
        await systemUserService.resetUserPassword({
          selectIds: ids,
          selectAll: false,
          condition: { keyword },
        });
        toast.success('重置成功');
        if (isBatch) setSelectedIds([]);
      },
    });
  };

  const batchDelete = () => {
    if (selectedIds.length === 0) return;
    runConfirm({
      title: '批量删除',
      description: `确认删除选中的 ${selectedIds.length} 个用户吗？此操作不可撤销。`,
      variant: 'destructive',
      action: async () => {
        await systemUserService.deleteUserInfo({
          selectIds: selectedIds,
          selectAll: false,
          condition: { keyword },
        });
        toast.success('批量删除成功');
        setSelectedIds([]);
        loadList();
      },
    });
  };

  const batchStatus = (enable: boolean) => {
    if (selectedIds.length === 0) return;
    runConfirm({
      title: enable ? '批量启用' : '批量禁用',
      description: `确认${enable ? '启用' : '禁用'}选中的 ${selectedIds.length} 个用户吗？`,
      action: async () => {
        await systemUserService.toggleUserStatus({
          selectIds: selectedIds,
          selectAll: false,
          condition: { keyword },
          enable,
        });
        toast.success(`${enable ? '启用' : '禁用'}成功`);
        setSelectedIds([]);
        loadList();
      },
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(list.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const openBatchModal = async (mode: 'userGroup' | 'organization' | 'project') => {
    setBatchMode(mode);
    setBatchTargetIds([]);
    setBatchModalOpen(true);
    try {
      if (mode === 'userGroup') {
        setBatchOptions(userGroupOptions.map((r) => ({ id: r.id, name: r.name })));
      } else if (mode === 'organization') {
        const arr = await systemUserService.getSystemOrgs();
        const flat = (items: { id: string; name: string; children?: { id: string; name: string }[] }[]): { id: string; name: string }[] => {
          const out: { id: string; name: string }[] = [];
          items.forEach((n) => {
            out.push({ id: n.id, name: n.name });
            if (n.children?.length) out.push(...flat(n.children));
          });
          return out;
        };
        setBatchOptions(Array.isArray(arr) ? flat(arr) : []);
      } else {
        const arr = await systemUserService.getSystemProjects();
        const flat = (items: { id: string; name: string; children?: { id: string; name: string }[] }[]): { id: string; name: string }[] => {
          const out: { id: string; name: string }[] = [];
          items.forEach((n) => {
            out.push({ id: n.id, name: n.name });
            if (n.children?.length) out.push(...flat(n.children));
          });
          return out;
        };
        setBatchOptions(Array.isArray(arr) ? flat(arr) : []);
      }
    } catch {
      setBatchOptions([]);
      toast.error('加载选项失败');
    }
  };

  const confirmBatchAdd = async () => {
    if (batchTargetIds.length === 0) {
      toast.error('请至少选择一个目标');
      return;
    }
    setBatchLoading(true);
    try {
      const params = {
        selectIds: selectedIds,
        selectAll: false,
        excludeIds: [] as string[],
        condition: { keyword } as Record<string, unknown>,
        roleIds: batchTargetIds,
      };
      if (batchMode === 'userGroup') {
        await systemUserService.batchAddUserGroup(params);
      } else if (batchMode === 'organization') {
        await systemUserService.batchAddOrg(params);
      } else {
        await systemUserService.batchAddProject(params);
      }
      toast.success('批量添加成功');
      setBatchModalOpen(false);
      setSelectedIds([]);
      loadList();
    } catch {
      toast.error('批量添加失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleCreateAndContinue = async () => {
    const validUsers = formUsers.filter(u => u.name.trim() && u.email.trim());
    if (validUsers.length === 0) {
      toast.error('请至少填写一个有效的用户信息（姓名和邮箱）');
      return;
    }
    if (formUserRoleIds.length === 0) {
      toast.error('请至少选择一个用户组');
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await systemUserService.batchCreateUser({
        userInfoList: validUsers.map(u => ({ name: u.name.trim(), email: u.email.trim(), phone: u.phone.trim() || undefined })),
        userRoleIdList: formUserRoleIds,
      });
      if (res.errorEmails && Object.keys(res.errorEmails).length > 0) {
        toast.error(`部分创建失败: ${Object.keys(res.errorEmails).join(', ')} 已存在`);
      } else {
        toast.success('创建成功');
        setFormUsers([{ name: '', email: '', phone: '' }]);
        const defaultIds = userGroupOptions.filter((r) => r.selected).map((r) => r.id);
        setFormUserRoleIds(defaultIds.length ? defaultIds : (userGroupOptions[0] ? [userGroupOptions[0].id] : []));
      }
      loadList();
    } catch {
      toast.error('创建失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const doImport = async () => {
    if (!importFile) {
      toast.error('请选择要导入的 Excel 文件');
      return;
    }
    setImportLoading(true);
    try {
      const res = await systemUserService.importUserInfo({ fileList: [importFile] });
      const data = res?.data ?? res;
      const success = data.successCount ?? 0;
      const total = data.importCount ?? 0;
      const fail = total - success;
      setImportSuccessCount(success);
      setImportFailCount(fail);
      setImportErrorMessages(data.errorMessages ?? {});
      setImportOpen(false);
      setImportFile(null);
      setImportResultOpen(true);
      if (fail < total) loadList();
    } catch {
      toast.error('导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  const openInviteModal = () => {
    setInviteEmails('');
    const systemAdmin = userGroupOptions.find((r) => r.name === '系统管理员');
    setInviteUserRoleIds(systemAdmin ? [systemAdmin.id] : (userGroupOptions[0] ? [userGroupOptions[0].id] : []));
    setInviteModalOpen(true);
  };

  const handleInviteSubmit = async () => {
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
      await systemUserService.sendInvite({
        inviteEmails: emails,
        userRoleIdList: inviteUserRoleIds,
      });
      toast.success('邀请已发送');
      setInviteModalOpen(false);
      setInviteEmails('');
      loadList();
    } catch (e) {
      toast.error('邀请失败');
    } finally {
      setInviteSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-end gap-3">
        <div className="flex bg-gray-100/80 p-1 rounded-lg border border-gray-200/50">
          <Button variant="ghost" size="sm" className="h-9 px-3 rounded-md text-gray-600 hover:bg-white text-xs font-medium" onClick={() => setImportOpen(true)}>
            <FileUp className="w-3.5 h-3.5 mr-1.5" /> 导入
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-3 rounded-md text-gray-600 hover:bg-white text-xs font-medium" onClick={openInviteModal}>
            <Mail className="w-3.5 h-3.5 mr-1.5" /> 邀请
          </Button>
        </div>
        <Button onClick={openCreate} size="sm" className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
          <UserPlus className="w-4 h-4 mr-2" />
          新建用户
        </Button>
      </div>

      {/* 搜索与批量操作 */}
      <div className={cn(
        "flex flex-wrap items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/30 transition-all",
        selectedIds.length > 0 ? "border-blue-200 bg-blue-50/20" : ""
      )}>
        <div className="relative flex-1 min-w-[200px] group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
          <Input
            placeholder="通过姓名、邮箱或手机号快速定位用户..."
            className="w-full pl-10 h-10 text-sm rounded-lg border-gray-200 bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadList()}
          />
        </div>

        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">已选 {selectedIds.length}</span>
            <Button size="sm" onClick={() => openBatchModal('userGroup')} className="h-8 px-3 text-xs font-medium rounded-lg">批量加入用户组</Button>
            <Button size="sm" onClick={() => openBatchModal('organization')} variant="outline" className="h-8 px-3 text-xs font-medium rounded-lg">批量加入组织</Button>
            <Button size="sm" onClick={() => openBatchModal('project')} variant="outline" className="h-8 px-3 text-xs font-medium rounded-lg">批量加入项目</Button>
            <Button size="sm" onClick={() => batchStatus(true)} variant="outline" className="h-8 px-3 text-xs font-medium rounded-lg">启用</Button>
            <Button size="sm" onClick={() => batchStatus(false)} variant="outline" className="h-8 px-3 text-xs font-medium rounded-lg text-amber-600">禁用</Button>
            <Button size="sm" onClick={() => resetPassword(selectedIds)} variant="outline" className="h-8 px-3 text-xs font-medium rounded-lg">重置密码</Button>
            <Button size="sm" onClick={batchDelete} variant="outline" className="h-8 px-3 text-xs font-medium rounded-lg text-red-600">删除</Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => loadList()} className="h-9 px-4 font-medium rounded-lg">
            检索
          </Button>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
            <TableRow className="hover:bg-transparent border-none h-11">
              <TableHead className="w-[60px] pl-4">
                <Checkbox
                  checked={list.length > 0 && selectedIds.length === list.length}
                  onCheckedChange={(c) => handleSelectAll(!!c)}
                  className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
              </TableHead>
              <TableHead className="w-[100px] font-medium text-gray-500 pl-2">ID</TableHead>
              <TableHead className="font-medium text-gray-500 pl-2">成员</TableHead>
              <TableHead className="font-medium text-gray-500 pl-2 max-w-[180px]">组织</TableHead>
              <TableHead className="font-medium text-gray-500 pl-2">用户组</TableHead>
              <TableHead className="w-[80px] font-medium text-gray-500 text-center">状态</TableHead>
              <TableHead className="w-40 font-medium text-gray-500">创建时间</TableHead>
              <TableHead className="w-40 text-right pr-4 font-medium text-gray-500">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  暂无用户数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((row) => (
                <TableRow key={row.id} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onCheckedChange={(c) => handleSelectOne(row.id, !!c)}
                      className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-gray-400 truncate max-w-[100px] pl-2" title={row.id}>#{row.id?.slice(-8) ?? '-'}</TableCell>
                  <TableCell className="pl-2">
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
                  <TableCell className="pl-2 max-w-[180px]">
                    {(row.organizationList ?? []).filter(Boolean).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(row.organizationList ?? []).filter(Boolean).map((org: { id?: string; name?: string }) => (
                          <Badge key={org.id || org.name} variant="outline" className="border-gray-200 text-gray-600 font-medium text-[10px] px-2 py-0.5 rounded-md">
                            {org.name ?? org.id ?? '-'}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="pl-2">
                    {(row.userRoleList ?? []).filter(Boolean).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(row.userRoleList ?? []).filter(Boolean).map((r) => (
                          <Badge key={r.id || r.name} variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold text-[10px] px-2 py-0.5 rounded-md">
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={row.enable}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          enableUser(row);
                        } else {
                          disableUser(row);
                        }
                      }}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </TableCell>
                  <TableCell className="text-gray-400 font-bold whitespace-nowrap text-[10px]">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)} className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 font-bold text-[11px]">
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        编辑
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100">
                            <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 p-1.5 rounded-2xl border-gray-100 shadow-2xl">
                          <DropdownMenuItem onClick={() => resetPassword(row)} className="gap-2.5 py-2.5 rounded-xl cursor-pointer font-bold focus:bg-blue-50 focus:text-blue-600">
                            <KeyRound className="h-4 w-4" /> <span className="text-sm">重置密码</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteUser(row)} className="text-red-500 gap-2.5 py-2.5 rounded-xl cursor-pointer font-bold focus:bg-red-50 focus:text-red-600">
                            <Trash2 className="h-4 w-4" /> <span className="text-sm">删除用户</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-5 bg-white border-b border-gray-50">
            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
              {dialogMode === 'create' ? '批量创建用户' : '编辑用户信息'}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {dialogMode === 'create' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">
                  <span>用户信息清单</span>
                  <span className="text-blue-600 hover:text-blue-700 cursor-pointer transition-colors" onClick={() => setFormUsers([...formUsers, { name: '', email: '', phone: '' }])}>
                    + 添加一行
                  </span>
                </div>
                <div className="space-y-3">
                  {formUsers.map((user, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-start animate-in slide-in-from-top-2 duration-300">
                      <div className="col-span-3">
                        <Input
                          placeholder="姓名"
                          value={user.name}
                          onChange={(e) => {
                            const newUsers = [...formUsers];
                            newUsers[idx].name = e.target.value;
                            setFormUsers(newUsers);
                          }}
                          className="h-10 bg-gray-50/50 border-gray-100 focus:bg-white rounded-xl transition-all"
                        />
                      </div>
                      <div className="col-span-5">
                        <Input
                          placeholder="邮箱"
                          value={user.email}
                          onChange={(e) => {
                            const newUsers = [...formUsers];
                            newUsers[idx].email = e.target.value;
                            setFormUsers(newUsers);
                          }}
                          className="h-10 bg-gray-50/50 border-gray-100 focus:bg-white rounded-xl transition-all"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="手机号 (可选)"
                          value={user.phone}
                          onChange={(e) => {
                            const newUsers = [...formUsers];
                            newUsers[idx].phone = e.target.value;
                            setFormUsers(newUsers);
                          }}
                          className="h-10 bg-gray-50/50 border-gray-100 focus:bg-white rounded-xl transition-all"
                        />
                      </div>
                      <div className="col-span-1 pt-2">
                        {formUsers.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => setFormUsers(formUsers.filter((_, i) => i !== idx))}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                    💡 默认密码将设置为用户的邮箱地址。通过“添加一行”可一次性创建多名成员。
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">姓名</Label>
                  <Input
                    value={formUsers[0].name}
                    onChange={(e) => {
                      const newUsers = [...formUsers];
                      newUsers[0].name = e.target.value;
                      setFormUsers(newUsers);
                    }}
                    className="h-11 bg-gray-50 border-gray-100 focus:bg-white rounded-xl transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">邮箱</Label>
                  <Input
                    value={formUsers[0].email}
                    disabled
                    className="h-11 bg-gray-100 border-transparent text-gray-400 rounded-xl"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">手机号</Label>
                  <Input
                    value={formUsers[0].phone}
                    onChange={(e) => {
                      const newUsers = [...formUsers];
                      newUsers[0].phone = e.target.value;
                      setFormUsers(newUsers);
                    }}
                    className="h-11 bg-gray-50 border-gray-100 focus:bg-white rounded-xl transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">分配初始角色组</Label>
              <div className="grid grid-cols-2 gap-3 border border-gray-100 rounded-2xl p-4 bg-gray-50/30">
                {userGroupOptions.map((role) => (
                  <label key={role.id} className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border",
                    formUserRoleIds.includes(role.id) ? "bg-white border-blue-200 shadow-sm" : "bg-transparent border-transparent hover:bg-white/50"
                  )}>
                    <Checkbox
                      checked={formUserRoleIds.includes(role.id)}
                      onCheckedChange={() => toggleUserRole(role.id)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <span className={cn("text-sm font-medium", formUserRoleIds.includes(role.id) ? "text-gray-900" : "text-gray-500")}>
                      {role.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-5 bg-gray-50/50 flex gap-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="h-11 flex-1 font-bold text-gray-500 rounded-xl">
              取消
            </Button>
            {dialogMode === 'create' && (
              <Button
                variant="outline"
                disabled={formSubmitting || formUserRoleIds.length === 0}
                onClick={handleCreateAndContinue}
                className="h-11 px-6 font-bold rounded-xl border-gray-200"
              >
                {formSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    <span>处理中...</span>
                  </div>
                ) : (
                  '保存并继续创建'
                )}
              </Button>
            )}
            <Button
              disabled={formSubmitting || formUserRoleIds.length === 0}
              onClick={dialogMode === 'create' ? handleCreate : handleUpdate}
              className="h-11 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:shadow-none"
            >
              {formSubmitting && !(dialogMode === 'create') ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>处理中...</span>
                </div>
              ) : (
                dialogMode === 'create' ? '立即创建' : '保存更改'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 邮箱邀请 */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>邮箱邀请</DialogTitle>
            <p className="text-sm text-gray-500">输入邮箱地址，系统将发送邀请邮件并为其分配用户组。</p>
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
            <Button onClick={handleInviteSubmit} disabled={inviteSubmitting}>
              {inviteSubmitting ? '邀请中...' : '发送邀请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入用户 */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>导入用户</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              请先下载模板，按模板填写后上传。支持 .xlsx、.xls 格式。
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <a
                href="/templates/user_import_cn.xlsx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                下载用户导入模板
              </a>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase">选择文件</Label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-600 file:font-bold"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              {importFile && <p className="mt-1 text-xs text-gray-500">{importFile.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setImportOpen(false); setImportFile(null); }}>取消</Button>
            <Button disabled={!importFile || importLoading} onClick={doImport} className="bg-blue-600 hover:bg-blue-700">
              {importLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  导入中...
                </div>
              ) : (
                '确认导入'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入结果 */}
      <Dialog open={importResultOpen} onOpenChange={setImportResultOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>导入结果</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {importFailCount === 0 ? (
              <div className="flex flex-col items-center py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                <p className="font-medium text-gray-900">导入成功</p>
                <p className="text-sm text-gray-500 mt-1">成功导入 {importSuccessCount} 条用户</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  成功 {importSuccessCount} 条，失败 {importFailCount} 条
                </p>
                {Object.keys(importErrorMessages).length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-3 text-xs text-gray-600 space-y-1">
                    {Object.entries(importErrorMessages).map(([row, msg]) => (
                      <div key={row}>第 {row} 行：{msg}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportResultOpen(false)}>返回</Button>
            <Button onClick={() => { setImportResultOpen(false); setImportOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
              继续导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量加入用户组/组织/项目 */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {batchMode === 'userGroup' && '批量加入用户组'}
              {batchMode === 'organization' && '批量加入组织'}
              {batchMode === 'project' && '批量加入项目'}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">已选 {selectedIds.length} 个用户，请选择要加入的目标</p>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {batchOptions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">加载中或暂无选项</p>
            ) : (
              batchOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border',
                    batchTargetIds.includes(opt.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50/50 border-transparent hover:bg-gray-100'
                  )}
                >
                  <Checkbox
                    checked={batchTargetIds.includes(opt.id)}
                    onCheckedChange={(c) =>
                      setBatchTargetIds((prev) =>
                        c ? [...prev, opt.id] : prev.filter((id) => id !== opt.id)
                      )
                    }
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-800">{opt.name}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBatchModalOpen(false)}>取消</Button>
            <Button
              disabled={batchTargetIds.length === 0 || batchLoading}
              onClick={confirmBatchAdd}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {batchLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  处理中...
                </div>
              ) : (
                '确认添加'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmConfig?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmConfig?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className={confirmConfig?.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' : ''}
              onClick={async (e) => {
                e.preventDefault();
                if (confirmConfig?.action) {
                  try {
                    await confirmConfig.action();
                    setConfirmOpen(false);
                  } catch {
                    toast.error('操作失败');
                  }
                }
              }}
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
